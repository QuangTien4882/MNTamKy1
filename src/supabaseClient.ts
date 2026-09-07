import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey: string = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu biến môi trường Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
    'Cục bộ: copy .env.example thành .env và điền giá trị. Trên Vercel: Settings → ' +
    'Environment Variables, đặt 2 biến cho cả Production + Preview, sau đó vào ' +
    'Deployments → Redeploy để build lại.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);