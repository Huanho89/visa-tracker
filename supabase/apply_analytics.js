// Script to apply Web Analytics SQL schema via Supabase Management API
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'mpgfzdpxddmnhwkbskdq';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ2Z6ZHB4ZGRtbmh3a2Jza2RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM5ODM0OSwiZXhwIjoyMDg5OTc0MzQ5fQ.Bxf9nYfUVDNs3ZeEePiEpnz9Awb9LxYOZFgfIMByrsQ';

// Read the analytics.sql file content
const sqlPath = path.join(__dirname, 'analytics.sql');
let sqlContent = '';
try {
  sqlContent = fs.readFileSync(sqlPath, 'utf8');
} catch (err) {
  console.error(`Cannot read file at ${sqlPath}:`, err.message);
  process.exit(1);
}

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
  console.log('Applying Web Analytics schema to Supabase Database via API...');
  try {
    const res = await runSQL(sqlContent);
    if (res.status >= 200 && res.status < 300) {
      console.log('✓ Successfully created analytics_logs table, index, and RLS policies!');
    } else {
      console.error(`✗ Failed (HTTP ${res.status}): ${res.body}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('✗ Execution error:', e.message);
    process.exit(1);
  }
}

main();
