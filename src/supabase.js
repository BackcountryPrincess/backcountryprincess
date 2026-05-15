export function supabaseConfig(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.MAPLESAP_SUPABASE_URL || env.SUPABASE_URL || '';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.MAPLESAP_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, anonKey, serviceRoleKey, configured: Boolean(url && anonKey), serviceConfigured: Boolean(url && serviceRoleKey) };
}

export async function supabaseRest(env, table, options = {}) {
  const config = supabaseConfig(env);
  if (!config.url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  const key = options.service ? config.serviceRoleKey : config.anonKey;
  if (!key) throw new Error(options.service ? 'SUPABASE_SERVICE_ROLE_KEY is not configured' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
  const url = new URL(`/rest/v1/${table}`, config.url);
  Object.entries(options.query || {}).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
  });
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data && (data.message || data.error) ? data.message || data.error : `Supabase ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export function weatherDaysQuery({ station, startDate, endDate, limit = 500 } = {}) {
  const query = {
    select: '*',
    order: 'observation_date.asc',
    limit
  };
  if (station) query.station = `eq.${station}`;
  if (startDate && endDate) query.and = `(observation_date.gte.${startDate},observation_date.lte.${endDate})`;
  else if (startDate) query.observation_date = `gte.${startDate}`;
  else if (endDate) query.observation_date = `lte.${endDate}`;
  return query;
}
