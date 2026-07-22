const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase.rpc('get_my_branch_id'); // Just test if RPC functions exist
    console.log('Testing RPC get_my_branch_id:', { data, error });

    // Try a standard query to see what error or result we get
    const { data: roles, error: rolesError } = await supabase.from('roles').select('id, name');
    console.log('Testing Roles select:', { roles, rolesError });

    const { data: branches, error: branchesError } = await supabase.from('branches').select('id, name');
    console.log('Testing Branches select:', { branches, branchesError });
  } catch (err) {
    console.error('Exception:', err);
  }
}

run();
