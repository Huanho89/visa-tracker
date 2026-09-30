// Fix RLS infinite recursion on Supabase
// Run: node --experimental-fetch supabase/fix_rls.js

const PROJECT_REF = 'mpgfzdpxddmnhwkbskdq';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2Z6ZHB4ZGRtbmh3a2Jza2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM5ODM0OSwiZXhwIjoyMDg5OTc0MzQ5fQ.Bxf9nYfUVDNs3ZeEePiEpnz9Awb9LxYOZFgfIMByrsQ';

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );
  const body = await res.text();
  return { status: res.status, body };
}

const statements = [
  // 1. Create SECURITY DEFINER function (runs without RLS, safe from recursion)
  `CREATE OR REPLACE FUNCTION public.is_admin()
   RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role = 'admin'
     );
   $$ LANGUAGE sql SECURITY DEFINER STABLE`,

  // 2. Fix profiles policy
  `DROP POLICY IF EXISTS "Allow admin full access to profiles" ON public.profiles`,
  `CREATE POLICY "Allow admin full access to profiles" ON public.profiles
   FOR ALL USING (public.is_admin())`,

  // 3. Fix cases policy
  `DROP POLICY IF EXISTS "Allow admin full access to cases" ON public.cases`,
  `CREATE POLICY "Allow admin full access to cases" ON public.cases
   FOR ALL USING (public.is_admin())`,

  // 4. Fix bulletins policy
  `DROP POLICY IF EXISTS "Allow admin full access to bulletins" ON public.bulletins`,
  `CREATE POLICY "Allow admin full access to bulletins" ON public.bulletins
   FOR ALL USING (public.is_admin())`,

  // 5. Fix articles policy
  `DROP POLICY IF EXISTS "Allow admin full access to articles" ON public.articles`,
  `CREATE POLICY "Allow admin full access to articles" ON public.articles
   FOR ALL USING (public.is_admin())`,

  // 6. Fix drip_queues policy
  `DROP POLICY IF EXISTS "Allow admin full access to drip queues" ON public.drip_queues`,
  `CREATE POLICY "Allow admin full access to drip queues" ON public.drip_queues
   FOR ALL USING (public.is_admin())`,
];

async function main() {
  console.log('Applying RLS fix to Supabase...\n');

  for (const stmt of statements) {
    const label = stmt.trim().split('\n')[0].substring(0, 70);
    const r = await runSQL(stmt);
    if (r.status < 300) {
      console.log(`✅ ${label}`);
    } else {
      console.log(`❌ ${label}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Response: ${r.body.substring(0, 300)}`);
    }
  }

  console.log('\nDone! Now verifying...');

  // Verify: test query profiles with anon key
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    'https://mpgfzdpxddmnhwkbskdq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2Z6ZHB4ZGRtbmh3a2Jza2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTgzNDksImV4cCI6MjA4OTk3NDM0OX0.Zo3RuUFdH8PUJUBCFIAdt6LRst6_Waoe0WOYmsFbAOA'
  );
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('email', 'hqhuan@gmail.com')
    .single();

  if (error && error.message.includes('infinite recursion')) {
    console.log('\n❌ STILL broken - infinite recursion persists');
  } else if (error && error.message.includes('JWT')) {
    console.log('\n✅ No more recursion! (Error is JWT/auth related, which is expected without a real user session)');
  } else if (error) {
    console.log('\n⚠️  Different error (not recursion):', error.message);
  } else {
    console.log('\n✅ Query succeeded! RLS fix verified.');
    console.log('   Result:', JSON.stringify(data));
  }
}

main().catch(console.error);
