const env = window.MAPLESAP_ENV || {};
const supabaseUrl = env.supabaseUrl || '';
const supabaseAnonKey = env.supabaseAnonKey || '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;
