import { createClient } from '@supabase/supabase-js'
import config from './supabase-config.json'
export const blogDb = createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
