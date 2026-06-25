// MapleSAP Forecast Engine V1 — Main Entry Point
// Isolated module: does not replace or modify any existing production code.
// Usage:
//   import { runForecastEngine } from './src/forecast-engine-v1/index.js';
//   const forecast = await runForecastEngine({ latitude: 46.57, longitude: -81.32 });

import { fetchRawForecast, aggregateHourlyToDaily, buildDayObjects } from './fetch.js';
import { deriveFeatures } from './features.js';
import { scoreDay } from './rings.js';

/**
 * Run the complete MapleSAP Forecast Engine V1 pipeline.
 *
 * @param {{ latitude: number, longitude: number, forecastDays?: number }} opts
 *   latitude/longitude in decimal degrees (WGS84)
 *   forecastDays: 1–16, default 7
 * @returns {Promise<Array<ForecastDay>>}
 */
export async function runForecastEngine({ latitude, longitude, forecastDays = 7 }) {
  // Step 1: Fetch raw Open-Meteo data (daily + hourly fields)
  const raw = await fetchRawForecast({ latitude, longitude, forecastDays });

  // Step 2: Aggregate hourly fields to daily means
  const hourlyByDate = aggregateHourlyToDaily(raw);

  // Step 3: Build normalised day objects from combined daily + hourly data
  const days = buildDayObjects(raw, hourlyByDate, forecastDays);

  // Step 4: Derive all biological and meteorological features
  const enrichedDays = deriveFeatures(days);

  // Step 5: Score each day using the three-ring model
  return enrichedDays.map(day => {
    const { ring1, ring2, ring3, maple } = scoreDay(day);
    return {
      date:              day.date,
      // Scores
      conditions_score:   ring1,
      flow_strength_score: ring2,
      flow_status_score:  ring3,
      maple_score:        maple,
      // Key features
      freeze_thaw:        day.freeze_thaw,
      temperature_swing:  day.temperature_swing !== null ? Math.round(day.temperature_swing * 10) / 10 : null,
      temp_max:           day.temp_max,
      temp_min:           day.temp_min,
      solar_strength:     day.solar_strength !== null ? Math.round(day.solar_strength * 100) : null,  // as %
      sun_exposure:       day.sun_exposure   !== null ? Math.round(day.sun_exposure   * 100) : null,  // as %
      snow_depth_cm:      day.snow_depth     !== null ? Math.round(day.snow_depth * 100)      : null,
      soil_temperature_0cm: day.soil_temperature_0cm !== null ? Math.round(day.soil_temperature_0cm * 10) / 10 : null,
      soil_moisture:      day.soil_moisture_0_to_1cm !== null ? Math.round(day.soil_moisture_0_to_1cm * 1000) / 1000 : null,
      positive_streak:    day.positive_streak,
      negative_streak:    day.negative_streak,
      season_progression: day.season_progression,
      // State classifications
      snowpack_state:     day.snowpack_state,
      soil_thaw_state:    day.soil_thaw_state,
      soil_moisture_state: day.soil_moisture_state,
    };
  });
}
