
import { createClient } from '@supabase/supabase-js'

// =================================================================================
// IMPORTANT: REPLACE WITH YOUR SUPABASE CREDENTIALS
// =================================================================================
// You can find your project URL and anon key in your Supabase project settings.
// Go to Settings > API in your Supabase dashboard.
//
// VITE_SUPABASE_URL should look like: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co'
// VITE_SUPABASE_ANON_KEY should look like: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...'
//
// For production, it's recommended to use environment variables.
// For this project, you can hardcode them here for simplicity.
// =================================================================================

const supabaseUrl = 'https://ivwxzoqhzogchqrniapd.supabase.co' // <-- Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2d3h6b3Foem9nY2hxcm5pYXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNzcwMTYsImV4cCI6MjA3Mzk1MzAxNn0.VFnH911Muw2rX_1XhIyZL0_8IGce7dwW7VPS6mu2IGo' // <-- Replace with your Supabase Anon Key

// FIX: Removed the obsolete check for placeholder credentials. This was causing a TypeScript
// error because the actual credentials have been filled in, making the comparison always false.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
