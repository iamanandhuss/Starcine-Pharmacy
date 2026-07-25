import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('C:/Users/anand/.gemini/antigravity/brain/40cc519f-f846-4e87-b0b0-15ac885c2ddb/driver_tracking_migration.sql', 'utf8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error('Migration failed. You might need to run this manually in the Supabase SQL Editor:');
    console.error(error);
  } else {
    console.log('Migration completed successfully!');
  }
}
run();
