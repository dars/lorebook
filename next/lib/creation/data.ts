import { z } from 'zod';

import raw from './creation-data.json';

/**
 * 建角選項資料，由 `tool/export_creation_data.dart` 自 Flutter 端匯出。
 *
 * **匯出而非手抄**：28 個選項物件、687 行資料，手動轉寫必然出錯，而且錯在
 * 資料裡不會有編譯錯誤——只會讓某個種族少一個特性、某個職業少一個可選技能，
 * 難以察覺。與 golden 對照是同一套紀律。
 *
 * 資料更新時重跑匯出器，不要手改這份 JSON。
 */

const SpeciesTrait = z.object({
  name: z.string(),
  nameEn: z.string(),
  description: z.string(),
});

export const SpeciesOption = z.object({
  cn: z.string(),
  en: z.string(),
  speed: z.string(),
  size: z.string(),
  /** 黑暗視覺距離（0 = 無）。特性列表中已含由此推導的條目。 */
  darkvisionFt: z.number().int(),
  /** 每級額外 HP（矮人堅毅 = 1）。 */
  hpPerLevel: z.number().int(),
  skillPickCount: z.number().int(),
  skillPickFrom: z.array(z.string()),
  sizeChoices: z.array(z.string()),
  traits: z.array(SpeciesTrait),
  description: z.string(),
});

export const ClassOption = z.object({
  cn: z.string(),
  en: z.string(),
  hitDie: z.number().int(),
  /** 施法屬性代碼；'' = 非施法職業。 */
  spellAbility: z.string(),
  saves: z.array(z.string()),
  primaryAbilities: z.array(z.string()),
  skillCount: z.number().int(),
  skillChoices: z.array(z.string()),
  cantripsKnown: z.number().int(),
  preparedSpells: z.number().int(),
  level1Slots: z.number().int(),
  /** 無甲防禦的附加屬性；'' = 無。 */
  unarmoredDefense: z.string(),
  description: z.string(),
});

export const BackgroundOption = z.object({
  cn: z.string(),
  en: z.string(),
  /** 能力加值候選（3 個代碼）。 */
  abilities: z.array(z.string()),
  skills: z.array(z.string()),
  originFeat: z.string(),
  toolProficiency: z.string(),
  originFeatCustom: z.boolean(),
  originFeatDescription: z.string(),
  description: z.string(),
});

const SkillDef = z.object({
  name: z.string(),
  nameEn: z.string(),
  ability: z.string(),
});

const CreationData = z.object({
  species: z.array(SpeciesOption),
  classes: z.array(ClassOption),
  backgrounds: z.array(BackgroundOption),
  skills: z.array(SkillDef),
  languages: z.array(z.string()),
  abilityOrder: z.array(z.string()),
  proficiencyEntryMax: z.number().int(),
});

const parsed = CreationData.parse(raw);

export const SPECIES = parsed.species;
export const CLASSES = parsed.classes;
export const BACKGROUNDS = parsed.backgrounds;
export const SKILLS = parsed.skills;
export const LANGUAGES = parsed.languages;
export const ABILITY_ORDER = parsed.abilityOrder;
export const PROFICIENCY_ENTRY_MAX = parsed.proficiencyEntryMax;

export type SpeciesOption = z.infer<typeof SpeciesOption>;
export type ClassOption = z.infer<typeof ClassOption>;
export type BackgroundOption = z.infer<typeof BackgroundOption>;
export type SkillDef = z.infer<typeof SkillDef>;

export const isCaster = (c: ClassOption) => c.spellAbility !== '';
