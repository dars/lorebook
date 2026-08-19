import { isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * 認證狀態。
 *
 * **「取不到使用者」與「問不到認證服務」是兩回事**，必須分開表達：前者代表
 * 未登入、該導向登入頁；後者代表離線或 Supabase 不可達，此時導向登入頁只會
 * 讓使用者以為自己被登出——而登入頁在離線時同樣登不了，那是一條死路。
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'unknown';

/**
 * 由 `supabase.auth.getUser()` 的回傳判定狀態。
 *
 * 抽成純函式以便測試：這段的錯誤分類無法用瀏覽器手動驗證到每個分支，
 * 而分類錯誤的後果（離線被踢去登入頁）正是本變更要修的東西。
 *
 * supabase-js **把網路錯誤也包成 error 回傳而非拋出**，所以不能只看有沒有
 * user。`AuthRetryableFetchError` 是它對「請求根本沒送達」的表示，
 * 其餘 AuthError（session 不存在、token 無效……）都代表伺服器有回應。
 */
export function classifyAuth(result: {
  hasUser: boolean;
  error: unknown;
}): AuthStatus {
  if (result.hasUser) return 'authenticated';
  if (isAuthRetryableFetchError(result.error)) return 'unknown';
  return 'unauthenticated';
}
