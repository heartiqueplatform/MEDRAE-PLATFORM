// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypgkpecnfziptpmwsdud.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZ2twZWNuZnppcHRwbXdzZHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzM4NzYsImV4cCI6MjA2OTQ0OTg3Nn0.o5TzU-4pvmz2Hw68fSlRd2QaES0fMuzkmjGV8Vyo1Gw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
