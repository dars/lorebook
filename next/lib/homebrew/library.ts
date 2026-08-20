import { createClient } from '@/lib/supabase/server';
import { fetchSharedHomebrew } from './fetch';
import {
  HOMEBREW_KIND,
  type HomebrewContent,
  type HomebrewKind,
  parseHomebrew,
} from './types';

/*
 * 只在伺服器端使用（`createClient` 會讀 cookie）。沒有加 server-only 套件
 * 把關——這個 codebase 一貫選擇不為單一防呆拉相依；`createClient` 本身在
 * client 端就會炸，錯誤不會靜默。
 */

/**
 * 收藏紀錄頁需要的每一列。
 *
 * 與建角／升級用的 `fetchCustomBackgrounds` 系列刻意分開：那邊要的是「有哪些
 * 選項可以選」，只需要文件本身；這裡要的是「我手上這幾份東西的狀態」——來源
 * 標記、有沒有被我改過、分享出去了沒。同一張表的兩種問法。
 */
export type LibraryItem = {
  id: string;
  /** 已驗過的文件，交給既有的 manager 元件編輯。kind 由它自己帶。 */
  content: HomebrewContent;
  createdAt: string;
  updatedAt: string;
  /** 非 null 即「收藏而來」。 */
  sourceToken: string | null;
  sourceUpdatedAt: string | null;
  /** 收藏者自填的備註，即來源標記本身（D7）。 */
  sourceNote: string | null;
  /**
   * 我改過這份副本嗎。
   *
   * `updated_at > created_at` 就是改過——`updated_at` 由 trigger 維護，只在
   * 真的 UPDATE 時前進。這是「更新副本前要不要先警告」的依據。
   */
  edited: boolean;
};

type Row = {
  id: string;
  name: string;
  data: unknown;
  created_at: string;
  updated_at: string;
  source_token: string | null;
  source_updated_at: string | null;
  source_note: string | null;
};

const COLUMNS =
  'id, name, data, created_at, updated_at, source_token, source_updated_at, source_note';

/**
 * 我的所有自創內容，含來源資訊。
 *
 * 自建與收藏來的**混在一起**，不分兩區（D9）：對使用者來說那是同一件事——
 * 「我手上有哪些東西」。差別由備註那一行表達，不另做徽章。
 */
export async function fetchLibrary(): Promise<{
  items: LibraryItem[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: '需要登入' };

  const kinds = Object.entries(HOMEBREW_KIND) as [
    HomebrewKind,
    (typeof HOMEBREW_KIND)[HomebrewKind],
  ][];

  const results = await Promise.all(
    kinds.map(([kind, def]) =>
      supabase
        .from(def.table)
        .select(COLUMNS)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at')
        .then(({ data, error }) => ({ kind, data, error })),
    ),
  );

  const items: LibraryItem[] = [];
  for (const r of results) {
    if (r.error) return { items: [], error: r.error.message };
    for (const row of (r.data ?? []) as Row[]) {
      const content = parseHomebrew(r.kind, row.data);
      // 單筆失敗跳過而非整份失敗——一份壞掉的資料不該讓其他的消失
      // （與 fetchCustomBackgrounds 的既有行為一致）。
      if (!content) continue;
      items.push({
        id: row.id,
        content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sourceToken: row.source_token,
        sourceUpdatedAt: row.source_updated_at,
        sourceNote: row.source_note,
        edited: row.updated_at > row.created_at,
      });
    }
  }
  return { items, error: null };
}

/**
 * 哪些收藏來的副本，來源已經更新了。
 *
 * 只能透過分享 RPC 問——來源在別人的表裡，我們對它沒有讀取權，這是刻意的。
 * 因此每個有 `source_token` 的副本要打一次 RPC；一個人的收藏是個位數，並行
 * 打完的成本可以接受，而換到的是不必在資料庫裡留任何回連來源的線。
 *
 * 來源已撤銷或已刪除都**不算有更新**：那不是「有新版本」，而是「這條路斷了」，
 * 副本本身完全不受影響，不該為此在畫面上跳出提示。
 */
export async function findOutdated(items: LibraryItem[]): Promise<Set<string>> {
  const collected = items.filter((i) => i.sourceToken && i.sourceUpdatedAt);

  const checks = await Promise.all(
    collected.map(async (i) => {
      const r = await fetchSharedHomebrew(i.sourceToken!);
      if (r.status !== 'ok' || !r.sourceUpdatedAt) return null;
      return r.sourceUpdatedAt > i.sourceUpdatedAt! ? i.id : null;
    }),
  );

  return new Set(checks.filter((id): id is string => id !== null));
}
