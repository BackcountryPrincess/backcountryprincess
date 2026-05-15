import { chartDataForWeather } from './charts.js';
import { predictionForWeather } from './prediction.js';
import { supabaseConfig, supabaseRest, weatherDaysQuery } from './supabase.js';
import { fetchForecastWeather, fetchHistoricalWeather, parseCoordinate, seasonalWindow } from './weather.js';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders });
    try {
      if (url.pathname === '/api/health') return json({ ok: true, supabase: supabaseConfig(env) });
      if (url.pathname === '/api/feedback' && request.method === 'POST') return json(await createFeedback(request, env), 201);
      if (url.pathname === '/api/weather/historical') return json(await historicalWeather(url));
      if (url.pathname === '/api/weather/forecast') return json(await forecastWeather(url));
      if (url.pathname === '/api/weather/ingest' && request.method === 'POST') return json(await ingestWeather(request, env));
      if (url.pathname === '/api/weather-days') return json(await readWeatherDays(url, env));
      if (url.pathname === '/api/charts') return json(await chartData(url, env));
      if (url.pathname === '/api/prediction') return json(await predictionData(url, env));
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ ok: false, message: error.message || 'MapleSap API error' }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: jsonHeaders });
}

function weatherParams(url) {
  const now = new Date();
  const year = Number(url.searchParams.get('year')) || now.getUTCFullYear();
  const window = seasonalWindow(year);
  const latitude = parseCoordinate(url.searchParams.get('latitude'), 45.5019);
  const longitude = parseCoordinate(url.searchParams.get('longitude'), -73.5674);
  return {
    latitude,
    longitude,
    station: url.searchParams.get('station') || `${latitude},${longitude}`,
    startDate: url.searchParams.get('start_date') || window.startDate,
    endDate: url.searchParams.get('end_date') || window.endDate
  };
}

async function historicalWeather(url) {
  const params = weatherParams(url);
  const days = await fetchHistoricalWeather(params);
  return { ok: true, source: 'open-meteo-archive', ...params, days };
}

async function forecastWeather(url) {
  const params = weatherParams(url);
  const days = await fetchForecastWeather(params);
  return { ok: true, source: 'open-meteo-forecast', ...params, days };
}

async function ingestWeather(request, env) {
  const body = await request.json();
  const params = {
    latitude: parseCoordinate(body.latitude, 45.5019),
    longitude: parseCoordinate(body.longitude, -73.5674),
    station: body.station || '',
    startDate: body.start_date || body.startDate,
    endDate: body.end_date || body.endDate
  };
  if (!params.startDate || !params.endDate) {
    const window = seasonalWindow(Number(body.year) || new Date().getUTCFullYear());
    params.startDate = params.startDate || window.startDate;
    params.endDate = params.endDate || window.endDate;
  }
  const days = body.days || await fetchHistoricalWeather(params);
  const saved = await supabaseRest(env, 'weather_days', {
    method: 'POST',
    service: true,
    prefer: 'resolution=merge-duplicates,return=representation',
    query: { on_conflict: 'station,observation_date' },
    body: days
  });
  return { ok: true, savedCount: saved.length, days: saved };
}

async function readWeatherDays(url, env) {
  const params = weatherParams(url);
  const days = await supabaseRest(env, 'weather_days', {
    query: weatherDaysQuery(params)
  });
  return { ok: true, station: params.station, days };
}

async function chartData(url, env) {
  const params = weatherParams(url);
  const days = await supabaseRest(env, 'weather_days', {
    query: weatherDaysQuery(params)
  });
  return { ok: true, station: params.station, charts: chartDataForWeather(days) };
}

async function predictionData(url, env) {
  const params = weatherParams(url);
  const days = await supabaseRest(env, 'weather_days', {
    query: weatherDaysQuery(params)
  });
  return { ok: true, station: params.station, prediction: predictionForWeather(days) };
}

async function createFeedback(request, env) {
  const body = await request.json();
  const email = String(body.email || '').trim();
  const region = String(body.region || '').trim();
  const message = String(body.message || '').trim();
  if (!message) throw new Error('Feedback message is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required');
  const rows = await supabaseRest(env, 'user_feedback', {
    method: 'POST',
    service: true,
    body: { email, region, message }
  });
  return { ok: true, feedback: rows[0] || null };
}
