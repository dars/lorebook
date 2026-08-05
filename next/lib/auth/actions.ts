'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

/**
 * 發起 Google OAuth 登入。
 *
 * 只支援 Google：Apple 登入在 Supabase 端未設定（authorize 端點回 400），
 * 而補齊需要 Apple Developer 的 Service ID 與金鑰。放棄 iOS 之後，維持一個
 * 需要付費開發者帳號才能運作的登入管道並不划算。
 *
 * redirect 目標取自請求的 origin 而非寫死——本機開發、預覽部署與正式站
 * 才不必各自改設定。**該 origin 需列於 Supabase Auth 的 Redirect URLs**。
 */
export async function signIn(next = '/') {
  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
