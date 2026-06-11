import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iueuqqivmtkjtueuivla.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZXVxcWl2bXRranR1ZXVpdmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDIzMDgsImV4cCI6MjA5MDMxODMwOH0.3Hh0Tu9qbo4bIueh8QPVuY6WfovaHQG8qxlkB1ctvQ8'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
