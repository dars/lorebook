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

  // 必須呼叫——getUser() 才會觸發 token 續期並經由上面的 setAll 寫回。
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // 排除靜態資產與圖片最佳化：它們不需要 session，跑 middleware 只是浪費。
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
