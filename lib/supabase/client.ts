import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseOrigin = supabaseUrl
export const getSupabaseDiagnostics = () => ({ url: supabaseUrl, anonKeyPrefix: supabaseAnonKey.slice(0, 6), anonKeyLength: supabaseAnonKey.length })
