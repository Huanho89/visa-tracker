import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read env
const envContent = readFileSync('/home/ubuntu/visa-tracker-app/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('global_settings').select('config').eq('id', 'site_settings').maybeSingle();
if (error) { console.error('DB Error:', error); process.exit(1); }
const config = data?.config || {};
console.log('=== scraperUrlTemplate ===');
console.log(JSON.stringify(config.scraperUrlTemplate));
console.log('=== scraperApiKey (masked) ===');
console.log(config.scraperApiKey ? config.scraperApiKey.substring(0, 8) + '...' : '(empty)');
console.log('=== scraperUsePremium ===');
console.log(config.scraperUsePremium);
console.log('=== scraperUseRender ===');
console.log(config.scraperUseRender);
console.log('=== All config keys ===');
console.log(Object.keys(config).join(', '));
