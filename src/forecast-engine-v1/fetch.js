// MapleSAP Forecast Engine V1 — Open-Meteo Data Acquisition
// Fetches both daily and hourly fields and aggregates hourly to daily granularity.
// Does NOT replace or modify existing src/weather.js.

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'sunrise',
  'sunset',
  'daylight_duration',
  'sunshine_duration',
  'precipitation_sum',
  'snowfall_sum',
  'shortwave_radiation_sum'
].join(',');

const HOURLY_FIELDS = [
  'cloud_cover',
  'snow_depth',
  'soil_temperature_0cm',
  'soil_temperature_6cm',
  'soil_moisture_0_to_1cm',
  'soil_moisture_1_to_3cm',
].join(',');

/**
 * Fetch raw forecast payload from Open-Meteo (daily + hourly).
 * @param {{ latitude: number, longitude: number, forecastDays?: number }} opts
 * @returns {Promise<object>} Raw Open-Meteo JSON response
 */
export async function fetchRawForecast({ latitude, longitude, forecastDays = 7 }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', DAILY_FIELDS);
  url.searchParams.set('hourly', HOURLY_FIELDS);
  url.searchParams.set('forecast_days', String(Math.min(forecastDays, 16)));
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Open-Meteo fetch failed: ${response.status} — ${body.slice(0, 200)}`);
  }
  return response.json();
}

/**
 * Aggregate hourly arrays into per-day averages.
 * Returns a Map<dateString, { field: meanValue, ... }>.
 * @param {object} payload Raw Open-Meteo response with hourly arrays
 * @returns {Map<string, object>}
 */
export function aggregateHourlyToDaily(payload) {
  const times = payload?.hourly?.time ?? [];
  const fieldKeys = [
    'cloud_cover',
    'snow_depth',
    'soil_temperature_0cm',
    'soil_temperature_6cm',
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
  ];

  // Accumulate sums and counts per date per field
  const byDate = new Map();

  times.forEach((isoDatetime, i) => {
    const date = isoDatetime.slice(0, 10); // YYYY-MM-DD
    if (!byDate.has(date)) byDate.set(date, {});
    const bucket = byDate.get(date);

    for (const key of fieldKeys) {
      const arr = payload.hourly[key];
      const value = arr ? arr[i] : null;
      if (value !== null && value !== undefined && Number.isFinite(value)) {
        if (!bucket[key]) bucket[key] = { sum: 0, count: 0 };
        bucket[key].sum += value;
        bucket[key].count++;
      }
    }
  });

  // Convert to averages
  const result = new Map();
  for (const [date, bucket] of byDate.entries()) {
    const avg = {};
    for (const key of fieldKeys) {
      avg[key] = bucket[key] ? bucket[key].sum / bucket[key].count : null;
    }
    result.set(date, avg);
  }

  return result;
}

/**
 * Combine Open-Meteo daily and aggregated-hourly data into normalised day objects.
 * @param {object} payload Raw Open-Meteo response
 * @param {Map<string, object>} hourlyByDate Output of aggregateHourlyToDaily
 * @param {number} limit Max days to return
 * @returns {Array<object>} Array of day objects
 */
export function buildDayObjects(payload, hourlyByDate, limit = 7) {
  const dates = (payload?.daily?.time ?? []).slice(0, limit);
  return dates.map((date, i) => {
    const d = payload.daily;
    const h = hourlyByDate.get(date) ?? {};
    return {
      date,
      // Daily fields
      temp_max:                d.temperature_2m_max?.[i] ?? null,
      temp_min:                d.temperature_2m_min?.[i] ?? null,
      temp_mean:               d.temperature_2m_mean?.[i] ?? null,
      sunrise:                 d.sunrise?.[i] ?? null,
      sunset:                  d.sunset?.[i] ?? null,
      daylight_duration:       d.daylight_duration?.[i] ?? null,  // seconds
      sunshine_duration:       d.sunshine_duration?.[i] ?? null,  // seconds
      shortwave_radiation_sum: d.shortwave_radiation_sum?.[i] ?? null,  // MJ/m²
      precipitation_sum:       d.precipitation_sum?.[i] ?? null,   // mm
      snowfall_sum:            d.snowfall_sum?.[i] ?? null,         // cm
      weather_code:            d.weather_code?.[i] ?? null,
      // Hourly aggregates (daily means)
      cloud_cover:             h.cloud_cover ?? null,              // %
      snow_depth:              h.snow_depth ?? null,               // m
      soil_temperature_0cm:    h.soil_temperature_0cm ?? null,     // °C
      soil_temperature_6cm:    h.soil_temperature_6cm ?? null,     // °C
      soil_moisture_0_to_1cm:  h.soil_moisture_0_to_1cm ?? null,  // m³/m³
      soil_moisture_1_to_3cm:  h.soil_moisture_1_to_3cm ?? null,  // m³/m³
    };
  });
}
