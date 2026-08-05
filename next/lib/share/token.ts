/**
 * 分享用的隨機識別碼，對應 Flutter 端的 `random_token.dart`。
 *
 * 128-bit 是 capability URL 的常見下限——不可猜且無列舉路徑（design D3）。
 * 刻意**不**由角色 id、使用者 id 或時間戳推導：可枚舉的識別碼本身就不該作為
 * 分享載體。
 *
 * base64url 22 字元；同樣的熵用 UUID 字串要 36 字元，連結與 QR 都短一截。
 */

const TOKEN_BYTES = 16;

export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  // 走 base64 再轉 url-safe：Workers 與瀏覽器都有 btoa，不必額外相依。
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/** 分享連結的路徑前綴。與 homebrew 分享（規劃中的 `/s/`）刻意錯開。 */
export const SHARE_PATH_PREFIX = '/v';

export const shareLinkFor = (origin: string, token: string) =>
  `${origin}${SHARE_PATH_PREFIX}/${token}`;
