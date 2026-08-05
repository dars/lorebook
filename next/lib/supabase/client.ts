import { createBrowserClient } from '@supabase/ssr';

import { supabaseBrowserEnv } from './env';

/** 瀏覽器端 Supabase client（Client Component 用）。 */
export function createClient() {
  const { url, anonKey } = supabaseBrowserEnv();
  return createBrowserClient(url, anonKey);
}
