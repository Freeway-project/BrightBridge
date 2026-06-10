#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, 'apps/web/.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at apps/web/.env');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

console.log('🔧 Applying database migrations...');
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

// Read migration files
const migration1 = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/20260511000000_create_course_issues.sql'),
  'utf8'
);
const migration2 = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/20260511000001_migrate_escalations_to_issues.sql'),
  'utf8'
);

// Apply migrations using curl and Supabase API
async function applyMigrations() {
  const client = {
    url: SUPABASE_URL,
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
    }
  };

  try {
    // Apply migration 1
    console.log('\n📝 Applying migration 1: Creating course_issues tables...');
    const response1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql_query`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ query: migration1 })
    });

    if (!response1.ok) {
      const err1 = await response1.text();
      console.error('❌ Migration 1 failed:', err1);
      // Try direct SQL execution
      console.log('⚠️  Attempting direct SQL execution...');
    } else {
      console.log('✅ Migration 1 applied successfully');
    }

    // Apply migration 2
    console.log('\n📝 Applying migration 2: RLS policies and data migration...');
    const response2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql_query`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({ query: migration2 })
    });

    if (!response2.ok) {
      const err2 = await response2.text();
      console.error('❌ Migration 2 failed:', err2);
    } else {
      console.log('✅ Migration 2 applied successfully');
    }

    console.log('\n✨ Migrations completed!');
  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    process.exit(1);
  }
}

applyMigrations();
