/**
 * 角色 id。
 *
 * 用隨機值而非時間戳：Flutter 端用 `microsecondsSinceEpoch`，那是可枚舉的。
 * 角色 id 雖不作為授權載體（RLS 才是），但可枚舉的識別碼沒有好處，
 * 而隨機值的成本是零。
 */
export function newCharacterId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
