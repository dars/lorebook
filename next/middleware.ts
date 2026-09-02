import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { supabaseEnv } from './lib/supabase/env';

/**
 * 每次請求刷新 Supabase session 並寫回 cookie。
 *
 * Server Component 內不允許寫 cookie，因此 token 的續期只能在 middleware 做。
 * 少了這一步，session 過期後使用者會在毫無徵兆的情況下被登出。
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // **必須呼叫**——它才會觸發 token 續期並經由上面的 setAll 寫回。
  //
  // 用 `getClaims()` 而非 `getUser()`：後者每次都向 Supabase Auth 端點發一趟
  // HTTP 請求驗證 token，而專案在 ap-southeast-2、Worker 跑在使用者附近的邊緣，
  // 那是一趟跨海往返**加在每一個請求上**（middleware 攔截所有非靜態路徑）。
  //
  // `getClaims()` 改為用專案發布的公鑰驗證 JWT 簽章。本專案的簽章金鑰是
  // 非對稱的（`/auth/v1/.well-known/jwks.json` 回 ES256 公鑰），所以驗證在本機
  // 完成，JWKS 本身會被 SDK 快取；只有在 token 真的需要續期時才會走網路。
  // 續期行為與 setAll 的寫回不變，這也是官方目前的建議做法。
  //
  // **不可改用 `getSession()`**：它只讀 cookie、不驗證簽章，等於把驗證權交給
  // 客戶端送來的內容。
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    // 排除靜態資產與圖片最佳化：它們不需要 session，跑 middleware 只是浪費。
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
