'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CustomSpell } from './types';
import { fetchSpells } from '@/lib/catalog/fetch';
import { spellFromCatalog } from '@/lib/creation/spell-from-catalog';
import type { Spell } from '@/lib/domain/character';

export type CatalogSpellOption = { id: string; classes: string[]; spell: Spell };

export async function fetchCustomSpells(): Promise<{ spells: CustomSpell[]; error: string | null }> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { spells: [], error: '需要登入' };
  const { data, error } = await db.from('user_spells').select('data')
    .eq('user_id', user.id).is('deleted_at', null).order('created_at');
  if (error) return { spells: [], error: '無法載入自創法術，請稍後再試。' };
  return { spells: (data ?? []).flatMap(row => {
    const parsed = CustomSpell.safeParse(row.data);
    return parsed.success ? [parsed.data] : [];
  }), error: null };
}

export async function upsertCustomSpell(input: CustomSpell): Promise<{ error: string | null }> {
  const parsed = CustomSpell.safeParse(input);
  if (!parsed.success) return { error: '請填寫名稱、完整說明與有效環數，並確認欄位長度。' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: '需要登入' };
  const { error } = await db.from('user_spells').upsert({
    id: parsed.data.id, user_id: user.id, name: parsed.data.name, data: parsed.data,
  }, { onConflict: 'user_id,id' });
  if (error) return { error: '儲存失敗，請稍後再試。' };
  revalidatePath('/library');
  return { error: null };
}

export async function deleteCustomSpell(id: string): Promise<{ error: string | null }> {
  if (!CustomSpell.shape.id.safeParse(id).success) return { error: '法術識別碼有誤' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: '需要登入' };
  const { error } = await db.from('user_spells').update({ deleted_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id);
  if (error) return { error: '刪除失敗，請稍後再試。' };
  revalidatePath('/library');
  return { error: null };
}

/**
 * 角色頁「選用」用的內容庫法術。
 *
 * 只在打開選單時才抓，且只回傳該區段的環數：角色頁本身不該為了一個少用的
 * 選單在 HTML 裡多帶數百 KB 的法術全文。轉成角色卡格式在伺服器端做，
 * client 不必載入 5etools 的格式化程式。
 */
export async function fetchCatalogSpellOptions(kind: 'cantrips' | 'spells'): Promise<{ options: CatalogSpellOption[]; error: string | null }> {
  const { rows, error } = await fetchSpells();
  if (error) return { options: [], error: '無法載入系統法術，請稍後再試。' };
  return { options: rows
    .filter(s => kind === 'cantrips' ? s.level === 0 : s.level > 0)
    .map(s => ({ id: s.id, classes: s.classes, spell: spellFromCatalog(s) })), error: null };
}
