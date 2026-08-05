'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * 「當前角色」的持久化，對應 Flutter 端的 `selectedCharacterIdProvider`。
 *
 * 存 cookie 而非 localStorage：Server Component 要在渲染前就知道是哪個角色，
 * 而 localStorage 對伺服器不可見。這與 session 走 cookie 是同一個理由。
 */

const KEY = 'lorebook-character';

export async function getCurrentCharacterId(): Promise<string | null> {
  return (await cookies()).get(KEY)?.value ?? null;
}

export async function selectCharacter(id: string) {
  (await cookies()).set(KEY, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/main/character');
}
