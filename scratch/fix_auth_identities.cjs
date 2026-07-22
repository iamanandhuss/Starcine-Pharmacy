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

async function checkUsers() {
  console.log('Checking user authentication states in Supabase...');

  // Test sign in for created users
  const testAccounts = [
    'manager@starcinerx.com',
    'pharmacist@starcinerx.com',
    'cashier@starcinerx.com',
    'delivery@starcinerx.com'
  ];

  for (const email of testAccounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123'
    });

    if (error) {
      console.error(`❌ Login failed for ${email}:`, error.message);
    } else {
      console.log(`✅ Login SUCCESS for ${email}! User ID:`, data.user.id);
    }
  }
}

checkUsers();
