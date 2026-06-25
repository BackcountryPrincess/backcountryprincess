// MapleSAP Forecast Engine V1 — Feature Engineering
// Derives all biological/meteorological features from raw day objects.
// Input: array of day objects (sorted chronologically)
// Output: same array with feature fields appended

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * Derive all Engine V1 features for an array of days.
 * Processes sequentially so streak counters carry forward correctly.
 * @param {Array<object>} days Sorted chronologically, output of buildDayObjects()
 * @returns {Array<object>} Days with feature fields added
 */
export function deriveFeatures(days) {
  let positiveStreak = 0;
  let negativeStreak = 0;

  return days.map(day => {
    // ── FREEZE/THAW GATE ──────────────────────────────────────────────────────
    // Biological requirement: overnight refreeze + daytime thaw creates pressure
    // differential that drives sap flow in sugar maple vascular tissue.
    const freezeThaw = (day.temp_min !== null && day.temp_max !== null)
      ? (day.temp_min < 0 && day.temp_max > 0)
      : false;

    // ── TEMPERATURE SWING ─────────────────────────────────────────────────────
    // Larger swing = greater pressure differential = stronger potential flow.
    const temperatureSwing = (day.temp_max !== null && day.temp_min !== null)
      ? day.temp_max - day.temp_min
      : null;

    // ── SOLAR STRENGTH ────────────────────────────────────────────────────────
    // Normalized 0–1. 20 MJ/m² = clear spring day ceiling.
    // Open-Meteo shortwave_radiation_sum in MJ/m².
    const solarStrength = (day.shortwave_radiation_sum !== null)
      ? clamp(day.shortwave_radiation_sum / 20, 0, 1)
      : null;

    // ── SUN EXPOSURE ──────────────────────────────────────────────────────────
    // Fraction of daylight hours that were sunny.
    // sunshine_duration and daylight_duration both in seconds.
    const sunExposure = (day.sunshine_duration !== null && day.daylight_duration !== null && day.daylight_duration > 0)
      ? clamp(day.sunshine_duration / day.daylight_duration, 0, 1)
      : null;

    // ── STREAK TRACKING ───────────────────────────────────────────────────────
    // positive_streak: consecutive freeze-thaw days (momentum of active season).
    // negative_streak: consecutive too-warm days (season-end signal; temp_max >= 10°C).
    // A freeze-thaw day always resets the negative streak.
    // A too-warm day (even if also freeze-thaw, e.g. min=-0.5, max=12) resets positive.
    // A neutral day (cold, no freeze-thaw, not too warm) resets positive but not negative.
    const tooWarm = day.temp_max !== null && day.temp_max >= 10;

    if (freezeThaw && !tooWarm) {
      positiveStreak++;
      negativeStreak = 0;
    } else if (tooWarm) {
      negativeStreak++;
      positiveStreak = 0;
    } else {
      // Neutral or cold day without freeze-thaw
      positiveStreak = 0;
      // negativeStreak does not accumulate on cold days
    }

    // Snapshot current streak values for this day (before next iteration updates them)
    const posStreak = positiveStreak;
    const negStreak = negativeStreak;

    // ── SEASON PROGRESSION ────────────────────────────────────────────────────
    // 0–100 score representing position within the Northern Ontario sap season.
    // Peaks at 100 around March 15 (day 74). Off-season returns 5.
    const seasonProgression = computeSeasonProgression(day.date);

    // ── SOIL STATE CLASSIFICATIONS ────────────────────────────────────────────
    const soilThawState   = classifySoilThaw(day.soil_temperature_0cm);
    const soilMoistureState = classifySoilMoisture(day.soil_moisture_0_to_1cm);
    const snowpackState   = classifySnowpack(day.snow_depth);

    return {
      ...day,
      // Derived features
      freeze_thaw:           freezeThaw,
      temperature_swing:     temperatureSwing,
      solar_strength:        solarStrength,
      sun_exposure:          sunExposure,
      positive_streak:       posStreak,
      negative_streak:       negStreak,
      season_progression:    seasonProgression,
      soil_thaw_state:       soilThawState,
      soil_moisture_state:   soilMoistureState,
      snowpack_state:        snowpackState,
    };
  });
}

// ── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Season progression score (0–100).
 * Northern Ontario sugar maple season: mid-January through late April.
 * Peak: March 15 (day 74) = 100.
 * Off-season (May–January) = 5.
 */
function computeSeasonProgression(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z');
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000) + 1;

  // Key dates derived per-year so leap years are handled correctly.
  // Non-leap: Jan 15 = 15, Mar 15 = 74, May 1 = 121.
  // Leap year: Jan 15 = 15, Mar 15 = 75, May 1 = 122.
  const toDOY = (m, d) => Math.floor((Date.UTC(year, m, d) - startOfYear) / 86_400_000) + 1;
  const RAMP_START = toDOY(0, 15);  // January 15
  const PEAK_DAY   = toDOY(2, 15);  // March 15
  const RAMP_END   = toDOY(4,  1);  // May 1

  if (dayOfYear < RAMP_START) return 5;
  if (dayOfYear > RAMP_END)   return 5;

  if (dayOfYear <= PEAK_DAY) {
    // Ramp up: Jan 15 → Mar 15: 5 → 100
    return Math.round(5 + ((dayOfYear - RAMP_START) / (PEAK_DAY - RAMP_START)) * 95);
  }
  // Ramp down: Mar 15 → May 1: 100 → 5
  return Math.round(100 - ((dayOfYear - PEAK_DAY) / (RAMP_END - PEAK_DAY)) * 95);
}

/**
 * Soil thaw state from surface temperature (0 cm depth, daily mean °C).
 * frozen  < 0°C   — soil still locked
 * thawing 0–3°C   — optimal: active freeze-thaw in soil layer
 * thawed  3–8°C   — soil open; season advancing
 * warm    > 8°C   — season-end signal (bud pressure risk)
 */
function classifySoilThaw(temp0cm) {
  if (temp0cm === null || temp0cm === undefined) return 'unknown';
  if (temp0cm < 0)   return 'frozen';
  if (temp0cm < 3)   return 'thawing';
  if (temp0cm < 8)   return 'thawed';
  return 'warm';
}

/**
 * Soil moisture state from 0–1 cm volumetric content (m³/m³).
 * dry         < 0.20 — minimal free water
 * moist    0.20–0.35 — good; snowmelt saturating top layer
 * saturated   > 0.35 — very wet; ideal post-snowmelt condition
 */
function classifySoilMoisture(moisture) {
  if (moisture === null || moisture === undefined) return 'unknown';
  if (moisture < 0.20) return 'dry';
  if (moisture < 0.35) return 'moist';
  return 'saturated';
}

/**
 * Snowpack state from daily mean snow depth (metres from Open-Meteo).
 * Converts to cm for classification.
 * deep      > 50 cm — full winter snowpack; early/mid season
 * moderate 20–50 cm — healthy snowpack
 * light     5–20 cm — melting; late season indicator
 * bare      < 5 cm  — snowpack gone; late-season or off-season
 */
function classifySnowpack(depthMetres) {
  if (depthMetres === null || depthMetres === undefined) return 'unknown';
  const cm = depthMetres * 100;
  if (cm > 50) return 'deep';
  if (cm > 20) return 'moderate';
  if (cm > 5)  return 'light';
  return 'bare';
}
