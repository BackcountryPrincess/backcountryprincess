const JANUARY = 0;
const APRIL = 3;

export function parseCoordinate(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function seasonalWindow(year = new Date().getUTCFullYear()) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-04-30`
  };
}

export function isJanToApr(dateValue) {
  const month = new Date(`${dateValue}T00:00:00Z`).getUTCMonth();
  return month >= JANUARY && month <= APRIL;
}

export function calculateFreezeThaw(tempMin, tempMax) {
  return Number(tempMin) < 0 && Number(tempMax) > 0;
}

export function calculateGdd(tempMin, tempMax, base = 5) {
  const average = (Number(tempMin) + Number(tempMax)) / 2;
  return Math.max(0, average - base);
}

export function normalizeWeatherDays(payload, station = 'default', options = {}) {
  const daily = payload && payload.daily ? payload.daily : {};
  const dates = Array.isArray(daily.time) ? daily.time : [];
  const filterJanToApr = options.filterJanToApr !== false;
  return dates
    .map((date, index) => {
      const tempMin = daily.temperature_2m_min ? daily.temperature_2m_min[index] : null;
      const tempMax = daily.temperature_2m_max ? daily.temperature_2m_max[index] : null;
      const precipitation = daily.precipitation_sum ? daily.precipitation_sum[index] : null;
      const snowDepth = daily.snow_depth_mean ? daily.snow_depth_mean[index] : null;
      const solarRadiation = daily.shortwave_radiation_sum ? daily.shortwave_radiation_sum[index] : null;
      const freezeThaw = tempMin !== null && tempMax !== null ? calculateFreezeThaw(tempMin, tempMax) : false;
      const gdd = tempMin !== null && tempMax !== null ? calculateGdd(tempMin, tempMax) : null;
      return {
        station,
        observation_date: date,
        temp_min: tempMin,
        temp_max: tempMax,
        precipitation,
        snow_depth: snowDepth,
        solar_radiation: solarRadiation,
        freeze_thaw: freezeThaw,
        gdd,
        sap_score: scoreSapDay({ tempMin, tempMax, precipitation, freezeThaw }),
        notes: ''
      };
    })
    .filter((day) => !filterJanToApr || isJanToApr(day.observation_date));
}

export function scoreSapDay({ tempMin, tempMax, precipitation = 0, freezeThaw }) {
  if (tempMin === null || tempMax === null) return null;
  let score = 0;
  if (freezeThaw) score += 55;
  if (Number(tempMax) >= 1 && Number(tempMax) <= 7) score += 20;
  if (Number(tempMin) <= -2 && Number(tempMin) >= -12) score += 15;
  if (Number(precipitation) > 10) score -= 10;
  if (Number(tempMax) >= 12) score -= 35;
  if (Number(tempMin) > 0) score -= 25;
  return Math.max(0, Math.min(100, score));
}

export async function fetchHistoricalWeather({ latitude, longitude, startDate, endDate, station }) {
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('daily', [
    'temperature_2m_min',
    'temperature_2m_max',
    'precipitation_sum',
    'snow_depth_mean',
    'shortwave_radiation_sum'
  ].join(','));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Historical weather fetch failed: ${response.status}`);
  return normalizeWeatherDays(await response.json(), station || `${latitude},${longitude}`, { filterJanToApr: true });
}

export async function fetchForecastWeather({ latitude, longitude, station }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('forecast_days', '16');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('daily', [
    'temperature_2m_min',
    'temperature_2m_max',
    'precipitation_sum',
    'snow_depth_mean',
    'shortwave_radiation_sum'
  ].join(','));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Forecast weather fetch failed: ${response.status}`);
  return normalizeWeatherDays(await response.json(), station || `${latitude},${longitude}`, { filterJanToApr: false });
}

export function detectWarmStreaks(days, threshold = 8, minimumLength = 3) {
  const streaks = [];
  let current = [];
  days.forEach((day) => {
    if (Number(day.temp_max) >= threshold) {
      current.push(day);
      return;
    }
    if (current.length >= minimumLength) streaks.push(current);
    current = [];
  });
  if (current.length >= minimumLength) streaks.push(current);
  return streaks.map((items) => ({
    startDate: items[0].observation_date,
    endDate: items[items.length - 1].observation_date,
    days: items.length,
    maxTemp: Math.max(...items.map((item) => Number(item.temp_max)))
  }));
}
