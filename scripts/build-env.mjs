import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

const env = {
  supabaseUrl: process.env.MAPLESAP_SUPABASE_URL || process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.MAPLESAP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
};

writeFileSync(
  'public/env.js',
  `window.MAPLESAP_ENV = ${JSON.stringify(env, null, 2)};\n`,
  'utf8'
);

mkdirSync('public/vendor', { recursive: true });
copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'public/vendor/supabase.js');

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn('MapleSap env warning: MAPLESAP_SUPABASE_URL and MAPLESAP_SUPABASE_ANON_KEY are required for live auth.');
}
