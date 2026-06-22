import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jjhbjamtkbcbvoyztrms.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaGJqYW10a2JjYnZveXp0cm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjY4ODYsImV4cCI6MjA5NzY0Mjg4Nn0.PS_MSLLuCdEinHPiNt13vfyWZfUu0LCWLGX4QjSQE_I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
