import { config } from 'dotenv'
import { resolve } from 'path'

// Load root .env when running locally; no-op in Vercel (env vars set via dashboard)
config({ path: resolve(__dirname, '../../../.env') })

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false }
})
