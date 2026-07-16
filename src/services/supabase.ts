import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-anon-key')) {
  console.warn(
    'Supabase credentials are not configured or are using placeholders. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl || 'https://placeholder-project.supabase.co', supabaseAnonKey || 'placeholder-anon-key');
