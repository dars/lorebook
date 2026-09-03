import type { z } from 'zod';

import { CustomBackground } from '@/lib/backgrounds/types';
import { CustomSpecies } from '@/lib/species/types';
import { CustomSubclass } from '@/lib/subclasses/types';

/**
 * 自創內容（homebrew）的型別註冊表。
 *
 * 分享、檢視、收藏這三條路徑對每種型別做的事其實一樣——查哪張表、用哪個
 * schema 驗、標題怎麼寫。把差異集中在這裡，新增型別就是加一筆，而不是在
 * 三個地方各加一個 if（見 openspec homebrew-share design D8）。
 *
 * 首版只有背景與子職（D10）；自訂種族於 custom-species 加入——如上所述，
 * 那次改動就是這裡一筆、0009 的 kind check 一個值、一個內容區塊元件。
 */

export const HOMEBREW_KINDS = ['background', 'subclass', 'species'] as const;
export type HomebrewKind = (typeof HOMEBREW_KINDS)[number];

/**
 * 內容本體。以 kind 作判別欄位——取到內容的地方幾乎都要依型別分支，
 * 判別聯集讓 TypeScript 替我們確認每個分支都處理到了。
 */
export type HomebrewContent =
  | { kind: 'background'; data: CustomBackground }
  | { kind: 'subclass'; data: CustomSubclass }
  | { kind: 'species'; data: CustomSpecies };

type KindDef = {
  /** 型別標示，檢視頁與收藏紀錄共用。 */
  label: string;
  /** 來源表。收藏是寫進收藏者自己的這張表。 */
  table: 'user_backgrounds' | 'user_subclasses' | 'user_species';
  /**
   * 驗證用的 schema，與**手動建立時完全相同**。
   *
   * SHALL NOT 對外來內容更嚴格（D11）：同一份資料自己建得起來、別人分享過
   * 來卻收不了，那是說不通的；而更寬鬆則會讓收藏成為繞過驗證的後門。
   */
  schema: z.ZodType;
  /**
   * 寫入來源表時要一併帶上的提升欄位（清單查詢用，不必下載整份文件）。
   *
   * 各型別不同——背景只有 name，子職還有 class_en——所以放在註冊表裡由
   * 型別自己說，而不是在收藏流程裡 if 一次。
   */
  columns: (data: unknown) => Record<string, string>;
};

export const HOMEBREW_KIND: Record<HomebrewKind, KindDef> = {
  background: {
    label: '背景',
    table: 'user_backgrounds',
    schema: CustomBackground,
    columns: (d) => ({ name: (d as CustomBackground).name }),
  },
  subclass: {
    label: '子職業',
    table: 'user_subclasses',
    schema: CustomSubclass,
    columns: (d) => ({
      name: (d as CustomSubclass).name,
      class_en: (d as CustomSubclass).classEn,
    }),
  },
  species: {
    label: '種族',
    table: 'user_species',
    schema: CustomSpecies,
    columns: (d) => ({ name: (d as CustomSpecies).name }),
  },
};

export const isHomebrewKind = (v: unknown): v is HomebrewKind =>
  typeof v === 'string' && (HOMEBREW_KINDS as readonly string[]).includes(v);

/**
 * 把 RPC 回來的 (kind, data) 轉成內容本體，形狀不對就回 null。
 *
 * 認不得的 kind 也回 null——舊版 App 開到新型別的連結時，那與「內容壞掉」
 * 對使用者是同一件事：這個連結現在給不出東西。
 */
export function parseHomebrew(
  kind: unknown,
  data: unknown,
): HomebrewContent | null {
  if (!isHomebrewKind(kind)) return null;

  const parsed = HOMEBREW_KIND[kind].schema.safeParse(data);
  if (!parsed.success) return null;

  switch (kind) {
    case 'background':
      return { kind, data: parsed.data as CustomBackground };
    case 'subclass':
      return { kind, data: parsed.data as CustomSubclass };
    case 'species':
      return { kind, data: parsed.data as CustomSpecies };
  }
}

/**
 * 分享連結的路徑前綴。與角色卡分享的 `/v` 錯開——兩者的檢視頁完全不同，
 * 共用前綴只會讓路由多一層判斷。
 */
export const HOMEBREW_SHARE_PATH_PREFIX = '/h';

export const homebrewLinkFor = (origin: string, token: string) =>
  `${origin}${HOMEBREW_SHARE_PATH_PREFIX}/${token}`;
