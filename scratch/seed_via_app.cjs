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

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // 1. Seed Roles into public.roles first (using upsert/insert)
    console.log('1. Ensuring default Roles exist in public.roles...');
    const rolesToSeed = [
      { name: 'Super Admin', description: 'Full control' },
      { name: 'Store Admin', description: 'Branch management' },
      { name: 'Pharmacist', description: 'Clinical dispensing' },
      { name: 'Cashier', description: 'Counter POS settlement' },
      { name: 'Delivery Staff', description: 'Courier orders' }
    ];
    for (const r of rolesToSeed) {
      await supabase.from('roles').upsert(r, { onConflict: 'name' });
    }

    const { data: roles } = await supabase.from('roles').select('id, name');
    const roleMap = {};
    (roles || []).forEach(r => { roleMap[r.name] = r.id; });
    console.log('Available Roles:', roleMap);

    // 2. Ensure Default Branch exists
    console.log('\n2. Ensuring Default Branch exists...');
    let { data: branch } = await supabase.from('branches').select('id').limit(1).maybeSingle();
    if (!branch) {
      const { data: newBranch, error: createBranchErr } = await supabase.from('branches').insert({
        name: 'Starcine Main Pharmacy',
        code: 'ST-MAIN-01',
        store_code: 'ST-MAIN-01',
        manager_name: 'Admin Manager',
        address: '123 Health Ave, Starcine City',
        phone: '555-0100',
        email: 'main@starcinerx.com',
        is_active: true
      }).select('id').single();
      if (createBranchErr) console.error('Error creating branch:', createBranchErr.message);
      branch = newBranch;
    }
    const branchId = branch?.id;
    console.log('Active Branch ID:', branchId);

    // 3. Register test accounts
    console.log('\n3. Registering Test Accounts...');
    const testUsers = [
      { email: 'anandhustech1998@gmail.com', password: 'password123', first_name: 'Super', last_name: 'Admin', role_name: 'Super Admin', role: 'super_admin' },
      { email: 'manager@starcinerx.com', password: 'password123', first_name: 'Jane', last_name: 'Manager', role_name: 'Store Admin', role: 'store_admin' },
      { email: 'pharmacist@starcinerx.com', password: 'password123', first_name: 'John', last_name: 'Dispenser', role_name: 'Pharmacist', role: 'employee' },
      { email: 'cashier@starcinerx.com', password: 'password123', first_name: 'Alice', last_name: 'Till', role_name: 'Cashier', role: 'employee' },
      { email: 'delivery@starcinerx.com', password: 'password123', first_name: 'Bob', last_name: 'Courier', role_name: 'Delivery Staff', role: 'employee' },
    ];

    for (const u of testUsers) {
      await supabase.auth.signUp({
        email: u.email,
        password: u.password,
        options: {
          data: {
            first_name: u.first_name,
            last_name: u.last_name,
            full_name: `${u.first_name} ${u.last_name}`,
            role: u.role,
            role_name: u.role_name
          }
        }
      });

      const targetRoleId = roleMap[u.role_name] || null;
      await supabase
        .from('users')
        .update({
          role_id: targetRoleId,
          branch_id: branchId,
          approval_status: 'approved',
          is_active: true
        })
        .eq('email', u.email);

      console.log(`Registered & Mapped ${u.email} as ${u.role_name}`);
    }

    // 4. Log in as Super Admin (anandhustech1998@gmail.com)
    console.log('\n4. Logging in as Super Admin (anandhustech1998@gmail.com)...');
    const { data: adminSession, error: loginErr } = await supabase.auth.signInWithPassword({
      email: 'anandhustech1998@gmail.com',
      password: 'password123'
    });

    if (loginErr) {
      console.error('Login error:', loginErr.message);
      return;
    }
    console.log('✅ Logged in successfully as Super Admin!');

    // 5. Seed Tasks as Super Admin
    console.log('\n5. Seeding mock tasks...');
    const { error: taskErr } = await supabase.from('tasks').insert([
      { branch_id: branchId, title: 'Daily Cold Chain Inventory Audit', description: 'Check temperature of vaccine refrigerators and log current levels.', priority: 'High', status: 'Pending', due_date: new Date().toISOString().split('T')[0] },
      { branch_id: branchId, title: 'Counter POS Register Settlement', description: 'Tally cashier cash drawer against POS sales totals.', priority: 'Medium', status: 'Pending', due_date: new Date().toISOString().split('T')[0] },
      { branch_id: branchId, title: 'Organize Aisle B Racks', description: 'Arrange cold medicine packages by expiry dates.', priority: 'Low', status: 'Pending', due_date: new Date().toISOString().split('T')[0] }
    ]);
    if (taskErr) console.error('Task insert error:', taskErr.message);
    else console.log('✅ Mock tasks inserted successfully!');

    // 6. Seed Home Deliveries as Super Admin
    console.log('\n6. Seeding mock home deliveries...');
    const { data: driverUser } = await supabase.from('users').select('id').eq('email', 'delivery@starcinerx.com').maybeSingle();
    const { error: delErr } = await supabase.from('home_deliveries').insert([
      { branch_id: branchId, store_id: branchId, customer_name: 'Rohan Sharma', customer_phone: '9876543210', customer_address: 'Flat 302, Green Meadows, Starcine Rd', payment_method: 'Cash', payment_status: 'Unpaid', status: 'Pending', assigned_to: driverUser?.id || null },
      { branch_id: branchId, store_id: branchId, customer_name: 'Pooja Patel', customer_phone: '9123456789', customer_address: 'Sector 4, Pocket B, Building 12', payment_method: 'Card', payment_status: 'Paid', status: 'Out for Delivery', assigned_to: driverUser?.id || null },
      { branch_id: branchId, store_id: branchId, customer_name: 'Amit Verma', customer_phone: '9811223344', customer_address: 'Villa 22, Orchid Greens Society', payment_method: 'Online', payment_status: 'Paid', status: 'Delivered', assigned_to: driverUser?.id || null }
    ]);
    if (delErr) console.error('Delivery insert error:', delErr.message);
    else console.log('✅ Mock home deliveries inserted successfully!');

    console.log('\n🎉 ALL MOCK TEST DATA SUCCESSFULLY SEEDED INTO SUPABASE!');
  } catch (err) {
    console.error('Fatal error during seeding:', err);
  }
}

main();
