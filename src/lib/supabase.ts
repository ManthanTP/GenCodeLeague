import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hgxckkflhvrscvjhbqxx.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGNra2ZsaHZyc2N2amhicXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODc1MjcsImV4cCI6MjEwNTY2MzUyN30.OHse8KVwKrV6LKxQzxBMtYOo2MTlOz-uLc9mQaICXY4';

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
