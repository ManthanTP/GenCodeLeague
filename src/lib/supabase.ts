import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://usdrmfbcupoezigvlssb.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZHJtZmJjdXBvZXppZ3Zsc3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjgwMTUsImV4cCI6MjEwNjQ0NDAxNX0.7Xhdm9wfFDjr0dmEfoN4kMdti0oyhku7Ql6heCA8H-E';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
