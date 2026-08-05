import type { Character, Spell } from '@/lib/domain/character';
import { Character as CharacterSchema } from '@/lib/domain/character';
import { abilityModifier, spellAttackFor, spellSaveDcFor } from '@/lib/rules/ability';
import { deriveClassResources } from '@/lib/rules/class-resources';
import {
  ABILITY_ORDER,
  SKILLS,
  type BackgroundOption,
  type ClassOption,
  type SpeciesOption,
} from './data';

/**
 * 建角的組裝邏輯，對照 Flutter 端 `character_create_page` 的 `_create()`。
 *
 * 抽成純函式而非埋在 UI 裡：推導規則（AC、HP、被動察覺、法術 DC、職業資源）
 * 該能單獨測試。Flutter 端把它寫在 widget 的方法裡，那是那邊的歷史包袱，
 * 沒有理由一起搬過來。
 */

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_BUY_BUDGET = 27;
/** 各分數的**累計**花費（非增量）。 */
export const POINT_BUY_COST: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export type BonusMode = '2/1' | '1/1/1';

export type CreationInput = {
  name: string;
  species: SpeciesOption;
  cls: ClassOption;
  background: BackgroundOption;
  /** 未加背景加值的基礎值。 */
  base: Record<string, number>;
  bonusMode: BonusMode;
  /** bonusMode 為 '2/1' 時的指派。 */
  plus2?: string;
  plus1?: string;
  sizeChoice?: string;
  classSkills: string[];
  speciesSkills: string[];
  cantrips?: Spell[];
  spells?: Spell[];
  alignment?: string;
  alignmentEn?: string;
};

/** 背景加值：2/1 指派，或三個候選各 +1。 */
export function bonusMap(
  background: BackgroundOption,
  mode: BonusMode,
  plus2?: string,
  plus1?: string,
): Record<string, number> {
  const m = Object.fromEntries(ABILITY_ORDER.map((a) => [a, 0]));
  if (mode === '1/1/1') {
    for (const a of background.abilities) m[a] = 1;
  } else {
    if (plus2) m[plus2] = 2;
    if (plus1) m[plus1] = 1;
  }
  return m;
}

/** 最終分數 = 基礎 + 背景加值，上限 20。 */
export const finalScore = (base: number, bonus: number) =>
  Math.min(Math.max(base + bonus, 0), 20);

/** 購點已花費（累計成本相加）。 */
export const pointsSpent = (base: Record<string, number>) =>
  Object.values(base).reduce((sum, v) => sum + (POINT_BUY_COST[v] ?? 0), 0);

/**
 * 1 級的最大 HP：生命骰滿值 + 體質調整值 + 種族每級加成（矮人堅毅）。
 * 對照 Flutter 的 `level1MaxHp`。
 */
export const level1MaxHp = (
  cls: ClassOption,
  species: SpeciesOption,
  conMod: number,
) => cls.hitDie + conMod + species.hpPerLevel;

/**
 * 1 級無甲 AC：一般 10+敏；有無甲防禦的職業（野蠻人 CON／武僧 WIS）取較高者。
 * 建角當下尚無裝備，因此不走 computeAc。
 */
export function level1UnarmoredAc(
  cls: ClassOption,
  mods: Record<string, number>,
) {
  const base = 10 + mods.DEX;
  if (!cls.unarmoredDefense) return base;
  return Math.max(base, 10 + mods.DEX + (mods[cls.unarmoredDefense] ?? 0));
}

/**
 * 某項技能是否已由其他來源取得（背景固定、或另一個選單已選）。
 *
 * 2024 規則：重複熟練須改選其他，因此建角時這些選項要禁選而非讓玩家浪費
 * 一個名額。Flutter 端同樣禁選並標示「（背景已有）」。
 */
export function skillTakenBy(
  name: string,
  background: BackgroundOption,
  classSkills: string[],
  speciesSkills: string[],
  from: 'class' | 'species',
): '背景已有' | '種族已選' | '職業已選' | null {
  if (background.skills.includes(name)) return '背景已有';
  if (from === 'class' && speciesSkills.includes(name)) return '種族已選';
  if (from === 'species' && classSkills.includes(name)) return '職業已選';
  return null;
}

export function buildCharacter(input: CreationInput, id: string): Character {
  const {
    name, species, cls, background, base, bonusMode, plus2, plus1,
    sizeChoice, classSkills, speciesSkills, cantrips = [], spells = [],
  } = input;

  const bonus = bonusMap(background, bonusMode, plus2, plus1);
  const scores = Object.fromEntries(
    ABILITY_ORDER.map((a) => [a, finalScore(base[a] ?? 0, bonus[a])]),
  );
  const mods = Object.fromEntries(
    ABILITY_ORDER.map((a) => [a, abilityModifier(scores[a])]),
  );

  const PB = 2; // 1 級固定
  const ab = (code: string) => ({
    score: scores[code],
    modifier: mods[code],
    proficientSave: cls.saves.includes(code),
  });

  const profSkills = new Set([
    ...classSkills,
    ...speciesSkills,
    ...background.skills,
  ]);

  const skills = SKILLS.map((s) => ({
    name: s.name,
    nameEn: s.nameEn,
    abilityType: s.ability,
    modifier: mods[s.ability] + (profSkills.has(s.name) ? PB : 0),
    proficient: profSkills.has(s.name),
  }));

  const caster = cls.spellAbility !== '';
  const spellMod = caster ? mods[cls.spellAbility] : 0;
  const perceptionMod = mods.WIS + (profSkills.has('感知') ? PB : 0);

  const abilityScores = {
    str: ab('STR'), dex: ab('DEX'), con: ab('CON'),
    int_: ab('INT'), wis: ab('WIS'), cha: ab('CHA'),
  };

  const features = [
    // 種族特性（含由 darkvisionFt 推導的黑暗視覺，匯出時已併入）。
    ...species.traits.map((t) => ({
      name: t.name,
      nameEn: t.nameEn,
      description: t.description,
      source: `種族：${species.cn}`,
    })),
    {
      name: background.originFeat,
      nameEn: '',
      description: background.originFeatDescription,
      source: background.originFeatCustom
        ? `背景：${background.cn}・自訂`
        : `背景：${background.cn}`,
    },
  ];

  return CharacterSchema.parse({
    id,
    name: name.trim(),
    species: species.cn,
    speciesEn: species.en,
    className: cls.cn,
    classNameEn: cls.en,
    level: 1,
    background: background.cn,
    backgroundEn: background.en,
    alignment: input.alignment ?? '',
    alignmentEn: input.alignmentEn ?? '',
    creatureType: 'Humanoid',
    size: sizeChoice ?? species.size,
    ac: level1UnarmoredAc(cls, mods),
    maxHp: level1MaxHp(cls, species, mods.CON),
    currentHp: level1MaxHp(cls, species, mods.CON),
    speed: species.speed,
    initiative: mods.DEX,
    proficiencyBonus: PB,
    passivePerception: 10 + perceptionMod,
    spellDc: caster ? spellSaveDcFor(PB, spellMod) : 0,
    spellAttack: caster ? spellAttackFor(PB, spellMod) : 0,
    spellcastingAbility: cls.spellAbility,
    abilityScores,
    skills,
    cantrips,
    spells,
    spellSlots: caster ? [{ level: 1, total: cls.level1Slots, used: 0 }] : [],
    features,
    // 2024 角色至少會通用語（規則上來自種族與背景，兩者目前皆未建模語言來源）。
    languages: ['通用語'],
    toolProficiencies: background.toolProficiency ? [background.toolProficiency] : [],
    resources: deriveClassResources(cls.en, 1, abilityScores),
    hitDieFaces: cls.hitDie,
  });
}
