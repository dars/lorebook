import { Character, parseCharacter } from '@/lib/domain/character';
import raw from './characters.json';

/**
 * 試玩模式的角色。
 *
 * 靜態內建、不連資料庫——試玩的前提就是不需要帳號，若還要打 Supabase 就等於
 * 沒有真正脫離登入。這三張由 `tool/seed_demo_characters.dart` 產生後匯出，
 * 推導值與正式建角流程一致。
 *
 * 涵蓋不同畫面樣態：盜賊（技能與工具最密集、無法術）、戰士（最單純的 1 級
 * 新手，新使用者實際會看到的樣子）、牧師（戲法＋準備法術＋法術 DC）。
 */
export const DEMO_CHARACTERS: Character[] = (raw as unknown[]).map((c) =>
  parseCharacter(c),
);

export const findDemoCharacter = (id: string): Character | undefined =>
  DEMO_CHARACTERS.find((c) => c.id === id);
