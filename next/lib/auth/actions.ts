'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

type Provider = 'google' | 'apple';

/**
 * 發起 OAuth 登入。
 *
 * redirect 目標取自請求的 origin 而非寫死——本機開發、預覽部署與正式站
 * 才不必各自改設定。**該 origin 需列於 Supabase Auth 的 Redirect URLs**。
 */
export async function signIn(provider: Provider, next = '/') {
  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
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
