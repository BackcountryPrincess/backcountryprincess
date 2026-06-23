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

    const host = url.hostname;

    if (host === 'www.maplesap.app') {
      url.hostname = 'maplesap.app';
      return Response.redirect(url.toString(), 301);
    }

    // ── app.maplesap.app — production application (open, indexed)
    if (host === 'app.maplesap.app') {
      return handleAppRoute(request, url, env);
    }

    // ── lab.maplesap.app — development application (password-gated, noindex)
    if (host === 'lab.maplesap.app') {
      return handleLabSubdomainRoute(request, url, env);
    }

    // ── /app/ path alias — works on workers-preview URLs and local dev
    if (url.pathname === '/app' || url.pathname.startsWith('/app/')) {
      return handleAppPathRoute(request, url, env);
    }

    // ── /lab/ path — existing password-gated prototype (unchanged)
    if (url.pathname === '/lab' || url.pathname.startsWith('/lab/')) {
      return handleLabRoute(request, url, env);
    }

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

// ─── App Route Handlers ──────────────────────────────────────────────────────

// Production app: app.maplesap.app or /app/ path — no gate, serves public/app/index.html
async function handleAppRoute(request, url, env) {
  const assetUrl = new URL(request.url);
  assetUrl.hostname = 'maplesap.app';
  // All paths on app subdomain serve the SPA root (single-page app)
  assetUrl.pathname = '/app/';
  try {
    const res = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    const headers = new Headers(res.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(res.body, { status: res.status, headers });
  } catch (_) {
    return new Response('MapleSap app not found.', { status: 404 });
  }
}

// /app/ path alias — rewrite to /app/index.html for local dev and preview URLs
async function handleAppPathRoute(request, url, env) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = '/app/';
  try {
    const res = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    const headers = new Headers(res.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(res.body, { status: res.status, headers });
  } catch (_) {
    return new Response('MapleSap app not found.', { status: 404 });
  }
}

// lab.maplesap.app subdomain — same password gate as /lab/ path
async function handleLabSubdomainRoute(request, url, env) {
  // Rewrite the URL to /lab/* so handleLabRoute asset fetches work correctly
  const rewritten = new URL(request.url);
  rewritten.hostname = 'maplesap.app';
  if (rewritten.pathname === '/' || rewritten.pathname === '') {
    rewritten.pathname = '/lab/';
  } else if (!rewritten.pathname.startsWith('/lab')) {
    rewritten.pathname = '/lab' + rewritten.pathname;
  }
  const rewrittenUrl = new URL(rewritten.toString());
  return handleLabRoute(new Request(rewritten.toString(), request), rewrittenUrl, env);
}

// ─── Lab Route Handler ────────────────────────────────────────────────────────

async function handleLabRoute(request, url, env) {
  const labPassword = env.LAB_PASSWORD || 'maple2026lab';
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasAccess = cookieHeader.split(';').some((c) => c.trim() === 'ms_lab=open');

  // Auth form submission
  if (url.pathname === '/lab/auth' && request.method === 'POST') {
    let submitted = '';
    try {
      const body = await request.formData();
      submitted = String(body.get('password') || '').trim();
    } catch (_) {}
    if (submitted === labPassword) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/lab/',
          'Set-Cookie': 'ms_lab=open; Path=/lab; SameSite=Strict; HttpOnly; Max-Age=28800',
          'X-Robots-Tag': 'noindex, nofollow'
        }
      });
    }
    return new Response(labGateHtml('Incorrect password — try again.'), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }
    });
  }

  // Not authenticated — serve password gate
  if (!hasAccess) {
    return new Response(labGateHtml(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }
    });
  }

  // Authenticated — pass through to static assets, inject noindex header
  try {
    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('Cache-Control', 'no-store');
    return new Response(assetResponse.body, { status: assetResponse.status, headers });
  } catch (_) {
    return new Response('Lab asset not found.', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }
}

function labGateHtml(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>MapleSap Lab</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0e1209;color:#fff7e8;font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%}
.gate{min-height:100vh;min-height:-webkit-fill-available;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.gate-card{width:min(380px,100%);background:rgba(255,255,255,0.045);border:1px solid rgba(244,184,111,0.2);border-radius:22px;padding:32px 28px;box-shadow:0 24px 64px rgba(0,0,0,0.4)}
.gate-logo{font-family:Montserrat,system-ui,sans-serif;font-size:13px;font-weight:900;letter-spacing:0.22em;color:#c8731a;text-transform:uppercase;margin-bottom:16px}
.gate-badge{display:inline-block;background:rgba(200,115,26,0.18);color:#f4b86f;font-size:10px;font-weight:900;letter-spacing:0.14em;padding:3px 9px;border-radius:6px;text-transform:uppercase;margin-bottom:14px}
h1{font-family:Montserrat,system-ui,sans-serif;font-size:28px;font-weight:900;color:#fff7e8;line-height:1.1;margin-bottom:8px}
.gate-sub{font-size:14px;color:rgba(244,234,208,0.58);line-height:1.5;margin-bottom:24px}
label{display:block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(244,234,208,0.58);margin-bottom:8px}
input[type=password]{display:block;width:100%;height:52px;background:rgba(255,255,255,0.06);border:1px solid rgba(244,184,111,0.22);border-radius:12px;color:#fff7e8;font-size:16px;padding:0 16px;outline:none;-webkit-appearance:none;appearance:none;margin-bottom:16px}
input[type=password]:focus{border-color:rgba(244,184,111,0.5)}
button[type=submit]{display:block;width:100%;height:52px;background:#c8731a;border:none;border-radius:999px;color:#17120a;font-family:Montserrat,system-ui,sans-serif;font-size:14px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;-webkit-tap-highlight-color:transparent}
.gate-error{color:#e07070;font-size:13px;font-weight:700;margin-bottom:16px;min-height:20px}
</style>
</head>
<body>
<div class="gate">
<div class="gate-card">
  <div class="gate-logo">🍁 MapleSap</div>
  <div class="gate-badge">Lab Environment</div>
  <h1>Private Access</h1>
  <p class="gate-sub">This is a private mobile prototype — not for public distribution. Search engines are blocked.</p>
  ${error ? `<div class="gate-error">${error}</div>` : ''}
  <form method="POST" action="/lab/auth">
    <label for="pw">Lab Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" autofocus placeholder="Enter password">
    <button type="submit">Enter Lab →</button>
  </form>
</div>
</div>
</body>
</html>`;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

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
