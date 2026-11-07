import { createClient } from '@supabase/supabase-js'

// Chỉ dùng anon key ở frontend. KHÔNG bao giờ dùng service_role key ở đây.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
