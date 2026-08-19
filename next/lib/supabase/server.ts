import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { classifyAuth } from './auth-state';
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
 * 認證狀態。判定規則與理由見 `./auth-state.ts`。
 *
 * - `unauthenticated`：認證服務可達，且明確回報沒有有效 session
 * - `unknown`：認證服務不可達，無從判斷。**不得據此導向登入頁**
 */
export type AuthState =
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' }
  | { status: 'unknown' };

/**
 * 目前的認證狀態，**每個請求只問 Supabase 一次**。
 *
 * layout 與其下的每個 page 都要知道使用者是誰，各自呼叫
 * `supabase.auth.getUser()` 的話，一次導覽就是好幾趟往返。`cache()` 是 React
 * 的請求級記憶化：同一個請求內重複呼叫共用同一個結果，跨請求則不共用——
 * 正好是登入狀態需要的語意（不能跨使用者快取）。
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    const status = classifyAuth({ hasUser: Boolean(data.user), error });

    return status === 'authenticated'
      ? { status, user: data.user! }
      : { status };
  } catch {
    // 連 client 都建不起來（例如 fetch 直接拋出，或缺環境變數）——
    // 同樣是問不到，不是沒登入。
    return { status: 'unknown' };
  }
});

/** 只要使用者本身時的簡寫；無法確認與未登入都回 null。 */
export const getSessionUser = cache(async () => {
  const s = await getAuthState();
  return s.status === 'authenticated' ? s.user : null;
});

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
