import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * OAuth 回跳端點：把 provider 給的 code 換成 session 並寫入 cookie。
 *
 * 必須在伺服器端交換——SSR 要在渲染前就知道使用者是誰，而 cookie 是唯一
 * 伺服器讀得到的載體。Flutter 版把 session 放 localStorage，那是純 client
 * 的做法，也是兩邊 session 無法共用的原因（design D4）。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 登入前所在的頁面，登入後送回去；預設回首頁。
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    const error = searchParams.get('error_description') ?? searchParams.get('error');
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error ?? '未收到授權碼')}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // PKCE 的 code verifier 遺失（跨 origin 回跳、cookie 被清）屬可恢復狀況，
    // 重新登入即可——不該呈現為系統錯誤。
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
