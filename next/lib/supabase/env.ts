/**
 * Supabase 連線參數的單一取用點。
 *
 * anon key 依設計即為公開值——RLS 才是授權邊界，不是金鑰的保密性。現行的
 * Flutter bundle 內也帶著同一把。
 *
 * **service role key 不得出現在本專案的任何位置**：它繞過 RLS，一旦進入
 * 前端可達路徑（含 SSR 的錯誤訊息、source map、環境變數傾印）就等同資料庫
 * 全開。分享頁的授權一律走 `get_shared_character` 這個 SECURITY DEFINER
 * 函式，那是唯一的授權入口。
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    // 缺值時明確失敗，而不是讓 Supabase client 在後續丟出難以追溯的錯誤。
    throw new Error(
      `缺少環境變數 ${name}。本機請設定 next/.dev.vars，正式環境用 wrangler secret put。`,
    );
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: required('SUPABASE_URL', process.env.SUPABASE_URL),
    anonKey: required('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY),
  };
}

/** 瀏覽器端可見的參數。需在 next.config 以 env 注入為 NEXT_PUBLIC_*。 */
export function supabaseBrowserEnv() {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
