/**
 * 角色 id。
 *
 * 用隨機值而非時間戳：Flutter 端用 `microsecondsSinceEpoch`，那是可枚舉的。
 * 角色 id 雖不作為授權載體（RLS 才是），但可枚舉的識別碼沒有好處，
 * 而隨機值的成本是零。
 */
export function newCharacterId(): string {
  return randomId();
}

/**
 * 使用者自有資料的 id（角色、自訂背景、自訂子職…）。
 *
 * 收藏他人分享的內容時**必須**產生新的 id，不能沿用來源那份：兩人的副本
 * 在各自的表裡是各自的東西，沿用會讓「同一個 id」在不同帳號下指涉不同
 * 內容——而那正是 0007 把主鍵改成 (user_id, id) 之前的老問題。
 */
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
