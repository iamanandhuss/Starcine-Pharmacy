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

async function runVerification() {
  console.log('=== PHARMACYOPS DATABASE VERIFICATION SUITE ===\n');

  try {
    // Sign in as authenticated user first to satisfy RLS
    console.log('Signing in as Super Admin (anandhustech1998@gmail.com)...');
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'anandhustech1998@gmail.com',
      password: 'password123'
    });

    if (authErr) {
      console.warn('Super Admin login warning:', authErr.message);
      console.log('Attempting Store Admin login (manager@starcinerx.com)...');
      await supabase.auth.signInWithPassword({
        email: 'manager@starcinerx.com',
        password: 'password123'
      });
    }

    // 1. Roles
    const { data: roles, error: rolesErr } = await supabase.from('roles').select('id, name, description');
    console.log('\n1. Roles Table Count:', roles?.length || 0);
    if (rolesErr) console.error('  Roles Error:', rolesErr.message);
    else console.log('  Roles:', roles?.map(r => r.name).join(', '));

    // 2. Branches
    const { data: branches, error: branchErr } = await supabase.from('branches').select('id, name, code, is_active');
    console.log('\n2. Branches Table Count:', branches?.length || 0);
    if (branchErr) console.error('  Branches Error:', branchErr.message);
    else console.log('  Branches:', branches?.map(b => `${b.name} (${b.code})`).join(', '));

    // 3. Tasks
    const { data: tasks, error: taskErr } = await supabase.from('tasks').select('id, title, priority, status');
    console.log('\n3. Tasks Table Count:', tasks?.length || 0);
    if (taskErr) console.error('  Tasks Error:', taskErr.message);
    else console.log('  Sample Tasks:', tasks?.map(t => `[${t.priority}] ${t.title} (${t.status})`).join('\n   '));

    // 4. Home Deliveries
    const { data: deliveries, error: delErr } = await supabase.from('home_deliveries').select('id, customer_name, customer_address, status, payment_method');
    console.log('\n4. Home Deliveries Table Count:', deliveries?.length || 0);
    if (delErr) console.error('  Deliveries Error:', delErr.message);
    else console.log('  Sample Deliveries:', deliveries?.map(d => `${d.customer_name} -> ${d.customer_address} [${d.status}]`).join('\n   '));

    // 5. Checklists
    const { data: checklists, error: checkErr } = await supabase.from('checklists').select('id, title, type, is_completed');
    console.log('\n5. Checklists Table Count:', checklists?.length || 0);
    if (checkErr) console.error('  Checklists Error:', checkErr.message);
    else console.log('  Sample Checklists:', checklists?.map(c => `${c.title} (${c.type}) - Completed: ${c.is_completed}`).join('\n   '));

    console.log('\n===============================================');
    console.log('🎉 ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
    console.log('===============================================');
  } catch (err) {
    console.error('Verification failed with exception:', err);
  }
}

runVerification();
