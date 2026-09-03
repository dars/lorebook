import { z } from 'zod';

import {
  SKILLS,
  SpeciesAbility,
  SpeciesTrait,
  type SpeciesOption,
} from '@/lib/creation/data';

/**
 * 自訂種族。
 *
 * **欄位即軌道**：每個機制欄位都對應 `SpeciesOption` 的既有欄位，且只能自
 * 選單或級距選取（openspec custom-species D1）。開放任意輸入的那一刻，App
 * 就得回答「速度 500 呎合不合法」這種問題；給軌道則驗證只需管結構，且產出
 * 的資料保證能被既有的建角與升級邏輯消化。
 *
 * 建角時與內建種族並列，選取後即快照進角色卡——之後刪改自訂種族不影響已
 * 建立的角色（與整個 App 的快照哲學一致）。
 */

/**
 * 有限次數能力（D9）的形狀定義在 `lib/creation/data.ts`——它是 `SpeciesOption`
 * 的一部分，內建與自訂種族共用一份。
 *
 * SRD 9 個種族的 33 條特性裡有 6 條是同一個形狀「次數 ＋ 回復時機」（不屈
 * 毅力、腎上腺素爆發、石工直覺、巨人血統、巨大形體、血系法術），而角色卡
 * 的 `resources` 已經是這個形狀——自訂種族的這類特性產生一筆資源即可，
 * 不需要新機制。其餘特性維持純文字（見 `traits`）。
 */
export { SpeciesAbility } from '@/lib/creation/data';

export const CustomSpecies = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().default(''),
  /** 速度（呎）。級距見 SPEED_CHOICES。 */
  speedFt: z.number().int().default(30),
  sizeMode: z.enum(['medium', 'small', 'choice']).default('medium'),
  /** 0 = 無。特性條目由此推導，不必也不該另外手寫一條。 */
  darkvisionFt: z.number().int().default(0),
  hpPerLevel: z.number().int().default(0),
  skillPickCount: z.number().int().default(0),
  skillPickFrom: z.array(z.string()).default([]),
  traits: z.array(SpeciesTrait).default([]),
  abilities: z.array(SpeciesAbility).default([]),
  description: z.string().default(''),
});

export type CustomSpecies = z.infer<typeof CustomSpecies>;

// ── 軌道 ──────────────────────────────────────
//
// 級距涵蓋 SRD 的實際取值（小型種族 25ft、歌利亞 35ft），上下各留一格給
// 自創種族。全部是 5 的倍數。

export const SPEED_CHOICES = [20, 25, 30, 35, 40] as const;
export const DARKVISION_CHOICES = [0, 60, 120] as const;
/** 上限 2：SRD 只有矮人的 1，留一格給「更堅韌」的自創種族，但不開到會明顯壓垮 HP 曲線。 */
export const HP_PER_LEVEL_CHOICES = [0, 1, 2] as const;
export const SKILL_PICK_CHOICES = [0, 1, 2] as const;
export const USES_CHOICES = [1, 2, 3, 'proficiency'] as const;

export const SIZE_MODES = [
  { key: 'medium', label: '固定中型' },
  { key: 'small', label: '固定小型' },
  { key: 'choice', label: '可選中型或小型' },
] as const;

export const NAME_MAX = 20;
export const NAME_EN_MAX = 30;
export const DESC_MAX = 500;
/** 內建種族最多 5 條，上限 8 留餘裕。 */
export const TRAIT_MAX = 8;
export const TRAIT_NAME_MAX = 30;
export const TRAIT_DESC_MAX = 500;
export const ABILITY_MAX = 4;
export const ABILITY_NAME_MAX = 30;
export const ABILITY_DESC_MAX = 500;

/**
 * 結構驗證。**只管合法性，不管平衡**——強度是 DM 的職責，App 不替桌上的人
 * 做裁決（與自訂背景、自訂子職一致）。
 *
 * 回傳第一個問題的說明而非布林：表單要能指出「少了什麼」，而不是只讓儲存
 * 鍵變灰。
 */
export function validate(s: Partial<CustomSpecies>): string | null {
  if (!s.name?.trim()) return '請填寫名稱';
  if (!SPEED_CHOICES.includes(s.speedFt as (typeof SPEED_CHOICES)[number])) {
    return '速度需自級距選取';
  }
  if (!['medium', 'small', 'choice'].includes(s.sizeMode ?? '')) {
    return '請選擇體型';
  }
  if (
    !DARKVISION_CHOICES.includes(
      s.darkvisionFt as (typeof DARKVISION_CHOICES)[number],
    )
  ) {
    return '黑暗視覺需自級距選取';
  }
  const hp = s.hpPerLevel ?? 0;
  if (hp < 0 || hp > 2) return '每級額外 HP 需為 0–2';
  const pick = s.skillPickCount ?? 0;
  if (pick < 0 || pick > 2) return '種族技能可選數需為 0–2';

  const from = s.skillPickFrom ?? [];
  const names = new Set(SKILLS.map((k) => k.name));
  if (from.some((n) => !names.has(n))) return '可選技能含未知的技能名';
  // 「可選 1 個但只給 1 個候選」等於沒得選——那不是選擇，是固定熟練，
  // 而固定熟練這個 App 目前沒有種族層級的表達方式。
  if (pick > 0 && from.length < pick + 1) {
    return `可選技能至少需勾選 ${pick + 1} 項`;
  }

  const traits = s.traits ?? [];
  if (traits.length > TRAIT_MAX) return `特性最多 ${TRAIT_MAX} 條`;

  const abilities = s.abilities ?? [];
  if (abilities.length > ABILITY_MAX) return `有限次數能力最多 ${ABILITY_MAX} 則`;
  for (const a of abilities) {
    if (!a.name.trim()) return '有限次數能力需填寫名稱';
    if (!USES_CHOICES.includes(a.uses)) return '次數需自選單選取';
    if (a.recovery !== 'short' && a.recovery !== 'long') {
      return '回復時機需為短休或長休';
    }
  }
  return null;
}

export const isValid = (s: Partial<CustomSpecies>) => validate(s) === null;

/** 去掉名稱空白的條目——UI 上允許暫時留空，儲存時不寫入。 */
export const cleanTraits = (traits: CustomSpecies['traits']) =>
  traits.filter((t) => t.name.trim()).map((t) => ({ ...t, name: t.name.trim() }));

export const cleanAbilities = (abilities: CustomSpecies['abilities']) =>
  abilities
    .filter((a) => a.name.trim())
    .map((a) => ({ ...a, name: a.name.trim() }));

/**
 * 轉成建角流程認得的 `SpeciesOption`。
 *
 * 建角只認得這個型別，不知道選項從哪來——自訂種族因此不會在流程裡長出
 * 第二條分支，行為一致是型別保證的而不是靠測試盯著（D4）。
 */
export function toSpeciesOption(s: CustomSpecies): SpeciesOption {
  return {
    cn: s.name,
    // 留空即空字串，角色快照的 speciesEn 跟著是空的（與自訂背景一致）。
    en: s.nameEn,
    speed: `${s.speedFt}ft`,
    size: s.sizeMode === 'small' ? 'Small' : 'Medium',
    // 內建資料的 sizeChoices 一律非空（固定體型者放它自己那一個），
    // 建角步驟以「長度 > 1」判斷要不要顯示選擇列，這裡沿用同一形狀。
    sizeChoices:
      s.sizeMode === 'choice'
        ? ['Medium', 'Small']
        : [s.sizeMode === 'small' ? 'Small' : 'Medium'],
    darkvisionFt: s.darkvisionFt,
    hpPerLevel: s.hpPerLevel,
    skillPickCount: s.skillPickCount,
    skillPickFrom: s.skillPickFrom,
    traits: [
      ...cleanTraits(s.traits),
      // 黑暗視覺以距離為單一來源，條目由它推導——內建種族的資料也是這個
      // 形狀（「黑暗視覺 60」）。要使用者自己再寫一條只會出現兩份事實。
      ...(s.darkvisionFt > 0
        ? [
            {
              name: `黑暗視覺 ${s.darkvisionFt}`,
              nameEn: 'Darkvision',
              description: `${s.darkvisionFt} 呎內，昏暗光線視為明亮、黑暗視為昏暗（僅能辨色為灰階）。`,
            },
          ]
        : []),
    ],
    abilities: cleanAbilities(s.abilities),
    description: s.description,
    isCustom: true,
  };
}
