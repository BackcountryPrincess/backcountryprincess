// MapleSAP Forecast Engine V1 — Live Validation Runner
// Fetches real Open-Meteo data for Levack, Ontario and prints the 7-day forecast table.
// Run with: node --experimental-vm-modules src/forecast-engine-v1/validate.js
//        or: node src/forecast-engine-v1/validate.js  (Node 22+, native ESM)

import { runForecastEngine } from './index.js';

// Primary test location: Levack / Onaping area, Greater Sudbury, Ontario
// This is the sugar bush location used in all historical MapleSAP datasets.
const LATITUDE  = 46.57;
const LONGITUDE = -81.32;
const FORECAST_DAYS = 7;

const PAD = {
  date:  10,
  score:  5,
  ft:     5,
  swing:  6,
  solar:  6,
  sun:    5,
  snow:   8,
  soil:   6,
  moist:  7,
  streak: 4,
};

function p(str, width) {
  return String(str ?? '—').padStart(width);
}

function bool(v) { return v ? 'YES' : 'no '; }

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  MapleSAP Forecast Engine V1 — Live Validation');
  console.log(`  Location: ${LATITUDE}°N, ${LONGITUDE}°W  (Levack, Ontario — sugar bush)`);
  console.log(`  Forecast: ${FORECAST_DAYS} days from today`);
  console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  let forecast;
  try {
    forecast = await runForecastEngine({ latitude: LATITUDE, longitude: LONGITUDE, forecastDays: FORECAST_DAYS });
  } catch (err) {
    console.error('FETCH FAILED:', err.message);
    process.exit(1);
  }

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const header = [
    'Date      ',
    ' Cond',
    'FlStr',
    'FlSt',
    'MAPLE',
    '  F/T',
    ' Swing',
    'Solar%',
    'Sun% ',
    'Snow(cm)',
    'Soil°C',
    'Moist ',
    '+Stk',
    '-Stk',
  ].join(' | ');

  const divider = '─'.repeat(header.length);
  console.log(header);
  console.log(divider);

  // ── ROWS ────────────────────────────────────────────────────────────────────
  for (const d of forecast) {
    const row = [
      d.date,
      p(d.conditions_score,    5),
      p(d.flow_strength_score, 5),
      p(d.flow_status_score,   4),
      p(d.maple_score,         5),
      `  ${bool(d.freeze_thaw)}`,
      p(d.temperature_swing !== null ? `${d.temperature_swing}°` : '—', 6),
      p(d.solar_strength    !== null ? `${d.solar_strength}%`    : '—', 6),
      p(d.sun_exposure      !== null ? `${d.sun_exposure}%`      : '—', 5),
      p(d.snow_depth_cm     !== null ? `${d.snow_depth_cm} cm`   : '—', 8),
      p(d.soil_temperature_0cm !== null ? `${d.soil_temperature_0cm}°` : '—', 6),
      p(d.soil_moisture_state ?? '—', 6),
      p(d.positive_streak,  4),
      p(d.negative_streak,  4),
    ].join(' | ');
    console.log(row);
  }

  console.log(divider);
  console.log('');

  // ── DETAIL SECTION ──────────────────────────────────────────────────────────
  console.log('  Per-day detail:');
  console.log('');
  for (const d of forecast) {
    console.log(`  ${d.date}`);
    console.log(`    Maple Score:      ${d.maple_score}/100`);
    console.log(`    Ring 1 (Cond):    ${d.conditions_score}/100`);
    console.log(`    Ring 2 (FlStr):   ${d.flow_strength_score}/100`);
    console.log(`    Ring 3 (FlSt):    ${d.flow_status_score}/100`);
    console.log(`    Freeze/Thaw:      ${d.freeze_thaw ? 'YES (gate OPEN)' : 'no  (gate CLOSED)'}`);
    console.log(`    Temp max/min:     ${d.temp_max ?? '?'}°C / ${d.temp_min ?? '?'}°C  (swing: ${d.temperature_swing ?? '?'}°C)`);
    console.log(`    Solar Strength:   ${d.solar_strength ?? '?'}%  |  Sun Exposure: ${d.sun_exposure ?? '?'}%`);
    console.log(`    Snow depth:       ${d.snow_depth_cm ?? '?'} cm  (${d.snowpack_state})`);
    console.log(`    Soil temp (0cm):  ${d.soil_temperature_0cm ?? '?'}°C  (${d.soil_thaw_state})`);
    console.log(`    Soil moisture:    ${d.soil_moisture ?? '?'} m³/m³  (${d.soil_moisture_state})`);
    console.log(`    Season progress:  ${d.season_progression}/100`);
    console.log(`    Positive streak:  ${d.positive_streak} day(s)`);
    console.log(`    Negative streak:  ${d.negative_streak} day(s)`);
    console.log('');
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  const scores = forecast.map(d => d.maple_score);
  const avg  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const best = Math.max(...scores);
  const bestDate = forecast.find(d => d.maple_score === best)?.date ?? '?';
  const ftDays = forecast.filter(d => d.freeze_thaw).length;

  console.log('  7-Day Summary:');
  console.log(`    Average Maple Score:   ${avg}/100`);
  console.log(`    Best Day:              ${bestDate}  (${best}/100)`);
  console.log(`    Freeze/Thaw Days:      ${ftDays} of ${forecast.length}`);
  console.log('');
  console.log('  Engine V1 validation complete.');
  console.log('');
}

main();
