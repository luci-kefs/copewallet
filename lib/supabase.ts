import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ASSETS_BUCKET = 'assets';

export async function getAssetUrl(filename: string): Promise<string | null> {
  const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(filename);
  return data?.publicUrl ?? null;
}

export async function fetchAssetUrls(): Promise<{
  logo: string | null;
  favicon: string | null;
  banner: string | null;
}> {
  const [logo, favicon, banner] = await Promise.all([
    getAssetUrl('logo.png'),
    getAssetUrl('favicon.ico'),
    getAssetUrl('banner.png'),
  ]);
  return { logo, favicon, banner };
}
