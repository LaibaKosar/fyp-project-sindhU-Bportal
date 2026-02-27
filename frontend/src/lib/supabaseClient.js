import { createClient } from '@supabase/supabase-js'

// Default Supabase credentials (can be overridden by .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bxdiafrfpvhltprwcqnz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZGlhZnJmcHZobHRwcndjcW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5Mjk0NjMsImV4cCI6MjA4NDUwNTQ2M30.jWmRvJeZf2DJQCopE7E9P9Ce36LvDr4hUFCzp9cZSU4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
