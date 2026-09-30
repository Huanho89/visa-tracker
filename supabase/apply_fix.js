// Script to apply RLS fix via Supabase REST API
const https = require('https');

const SUPABASE_URL = 'https://mpgfzdpxddmnhwkbskdq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2Z6ZHB4ZGRtbmh3a2Jza2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM5ODM0OSwiZXhwIjoyMDg5OTc0MzQ5fQ.Bxf9nYfUVDNs3ZeEePiEpnz9Awb9LxYOZFgfIMByrsQ';

const statements = [
  // Create safe SECURITY DEFINER function
  `CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE`,

  // Fix profiles policy (the one causing recursion)
  `DROP POLICY IF EXISTS "Allow admin full access to profiles" ON public.profiles`,
  `CREATE POLICY "Allow admin full access to profiles" ON public.profiles FOR ALL USING (public.is_admin())`,

  // Fix cases policy  
  `DROP POLICY IF EXISTS "Allow admin full access to cases" ON public.cases`,
  `CREATE POLICY "Allow admin full access to cases" ON public.cases FOR ALL USING (public.is_admin())`,

  // Fix bulletins policy
  `DROP POLICY IF EXISTS "Allow admin full access to bulletins" ON public.bulletins`,
  `CREATE POLICY "Allow admin full access to bulletins" ON public.bulletins FOR ALL USING (public.is_admin())`,

  // Fix articles policy
  `DROP POLICY IF EXISTS "Allow admin full access to articles" ON public.articles`,
  `CREATE POLICY "Allow admin full access to articles" ON public.articles FOR ALL USING (public.is_admin())`,

  // Fix drip_queues policy
  `DROP POLICY IF EXISTS "Allow admin full access to drip queues" ON public.drip_queues`,
  `CREATE POLICY "Allow admin full access to drip queues" ON public.drip_queues FOR ALL USING (public.is_admin())`,
];

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    // Use pg connection via supabase-js approach
    const options = {
      hostname: 'mpgfzdpxddmnhwkbskdq.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Applying RLS fix via Supabase pg_net or direct...');
  
  // Try using @supabase/supabase-js with service role to run raw SQL
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  for (const stmt of statements) {
    const shortStmt = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
    process.stdout.write(`Running: ${shortStmt} `);
    
    try {
      // supabase-js v2 doesn't expose raw SQL - we need to use the pg REST
      // Try via postgrest rpc
      const res = await runSQL(stmt);
      if (res.status >= 200 && res.status < 300) {
        console.log('✓');
      } else {
        console.log(`✗ (HTTP ${res.status}): ${res.body.substring(0, 100)}`);
      }
    } catch (e) {
      console.log('✗ Error:', e.message);
    }
  }
}

main();
