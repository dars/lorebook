import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { supabaseEnv } from './env';

/**
 * 伺服器端 Supabase client（Server Component / Route Handler 用）。
 *
 * session 存在 cookie 而非 localStorage——SSR 必須在伺服器端就知道使用者是誰，
 * localStorage 對伺服器不可見。這也是 Flutter 版的 session 無法沿用的根本原因
 * （design D4：接受一次性登出）。
 */
export async function createClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component 內不允許寫 cookie。session 的更新交給 middleware
          // 處理，此處靜默略過是預期行為，不是錯誤。
        }
      },
    },
  });
}

/**
 * 不帶使用者 session 的匿名 client。
 *
 * 分享頁專用：檢視者多為未登入者，且該頁的授權完全由
 * `get_shared_character` 的 token 決定，不該受檢視者自身的登入狀態影響——
 * 否則「登入者看到的分享頁」與「未登入者看到的」可能不一致。
 */
export function createAnonClient() {
  const { url, anonKey } = supabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
