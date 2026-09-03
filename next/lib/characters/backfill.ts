import { SPECIES } from '@/lib/creation/data';

/**
 * 舊角色卡的欄位回填，套在 **parse 之前**。
 *
 * 為什麼在 parse 之前：zod 的 default 會把「這份文件沒有這個欄位」與「這個
 * 欄位就是 0」抹成同一件事，parse 之後就分不出來了。分不出來就只有兩個選
 * 擇——都不補（舊矮人升級少 1 HP），或一律以種族名覆寫（自訂種族名稱恰好
 * 與內建重複時會被改掉）。看原始文件則兩者都不會發生。
 *
 * 這是讀取路徑上的一次性遷移，不寫回資料庫：下次角色被儲存時才會帶著新
 * 欄位落地，在那之前每次讀入都補一次，成本是一次查表。
 */

const HP_PER_LEVEL = new Map(SPECIES.map((s) => [s.cn, s.hpPerLevel]));

/**
 * 補上 `speciesHpPerLevel`（custom-species D3）。
 *
 * 只在文件裡**沒有**這個欄位時動作。查無種族名則不補——那是自訂種族卻沒有
 * 快照值的舊資料（本欄位上線前不存在自訂種族，因此實際上不會發生），留給
 * schema 的預設 0，與現況行為相同。
 */
export function backfillSpeciesHpPerLevel(json: unknown): unknown {
  if (typeof json !== 'object' || json === null) return json;
  const doc = json as Record<string, unknown>;
  if ('speciesHpPerLevel' in doc) return json;

  const hp = HP_PER_LEVEL.get(String(doc.species ?? ''));
  if (hp === undefined) return json;
  return { ...doc, speciesHpPerLevel: hp };
}
