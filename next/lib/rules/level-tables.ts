/**
 * 升級相關的規則常數表（D&D 2024），移植自 Flutter 端的
 * `character_math.dart` 與 `level_up.dart`。
 * 驗收依據為 golden/level_tables.json（12 職業 × 1–20 級共 240 案例）。
 *
 * 這裡只放**表格與純推導**——升級流程本身（applyLevelUp）依賴玩家選擇，
 * 屬於流程編排，隨其頁面移植。表格才是抄漏一格會靜默出錯的部分。
 */

export type CasterProgression = 'none' | 'full' | 'half' | 'pact';

/** 各職業的施法進程（本地權威表，不依賴內容庫）。 */
export const CLASS_PROGRESSION: Record<string, CasterProgression> = {
  Bard: 'full',
  Cleric: 'full',
  Druid: 'full',
  Sorcerer: 'full',
  Wizard: 'full',
  Paladin: 'half',
  Ranger: 'half',
  Warlock: 'pact',
};

/** 全施法者法術位表（index = 等級-1，內層 index = 環數-1）。 */
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** 半施法者法術位表（2024：聖騎士／遊俠自 Lv1 起有法術位）。 */
const HALF_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0],
  [2, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

/** 契約法術（邪術師）：index = 等級-1 → [法術位數, 位階]。 */
const PACT_SLOTS: [number, number][] = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3],
  [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5],
  [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
];

/** 指定進程與等級的各環法術位上限（環數 → 數量；非施法回傳空）。 */
export function spellSlotTotalsFor(
  progression: CasterProgression,
  level: number,
): Record<number, number> {
  if (level < 1 || level > 20) return {};
  if (progression === 'none') return {};

  if (progression === 'pact') {
    const [count, slotLevel] = PACT_SLOTS[level - 1];
    return { [slotLevel]: count };
  }

  const row =
    progression === 'full'
      ? FULL_CASTER_SLOTS[level - 1]
      : HALF_CASTER_SLOTS[level - 1];
  const out: Record<number, number> = {};
  for (let ring = 1; ring <= row.length; ring++) {
    if (row[ring - 1] > 0) out[ring] = row[ring - 1];
  }
  return out;
}

/** 可施放的最高環數（0 = 無法術位）。 */
export function maxSpellRingFor(
  progression: CasterProgression,
  level: number,
): number {
  const rings = Object.keys(spellSlotTotalsFor(progression, level)).map(Number);
  return rings.length === 0 ? 0 : Math.max(...rings);
}

/** 各職業已知戲法數（index = 等級-1）。非施法／無戲法職業不在表中。 */
export const CANTRIPS_KNOWN: Record<string, number[]> = {
  Bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
};

const FULL_PREPARED = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
];
const HALF_PREPARED = [
  2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
];

/** 各職業可備法術數（index = 等級-1）。 */
export const PREPARED_SPELLS: Record<string, number[]> = {
  Bard: FULL_PREPARED,
  Cleric: FULL_PREPARED,
  Druid: FULL_PREPARED,
  // 法師自 Lv14 起進程高於其他全施法者（XPHB 法師特性表）。
  Wizard: [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25,
  ],
  Sorcerer: [
    2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
  ],
  Warlock: [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15,
  ],
  Paladin: HALF_PREPARED,
  Ranger: HALF_PREPARED,
};

/**
 * 各職業的 ASI 等級（2024：戰士另有 6／14、盜賊另有 10）。
 * 19 級為史詩恩賜，可改選 ASI 專長，本 App 一律視為 ASI 事件。
 */
export function asiLevelsFor(classEn: string): Set<number> {
  switch (classEn) {
    case 'Fighter':
      return new Set([4, 6, 8, 12, 14, 16, 19]);
    case 'Rogue':
      return new Set([4, 8, 10, 12, 16, 19]);
    default:
      return new Set([4, 8, 12, 16, 19]);
  }
}

/** 升至該級可新選的戲法數（已知數差額）。 */
export function newCantripPicksFor(classEn: string, newLevel: number): number {
  const table = CANTRIPS_KNOWN[classEn];
  if (!table || newLevel < 2 || newLevel > 20) return 0;
  return table[newLevel - 1] - table[newLevel - 2];
}

/**
 * 升至該級可新選的法術數。
 *
 * 法師固定 2（每級免費抄 2 個法術進法書）；其餘職業取可備數差額——差額 0
 * 的等級只能替換，本 App 不做替換。
 */
export function newSpellPicksFor(classEn: string, newLevel: number): number {
  if (newLevel < 2 || newLevel > 20) return 0;
  if (classEn === 'Wizard') return 2;
  const table = PREPARED_SPELLS[classEn];
  if (!table) return 0;
  return Math.max(0, table[newLevel - 1] - table[newLevel - 2]);
}
