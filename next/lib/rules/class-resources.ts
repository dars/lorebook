import type { AbilityScores, ClassResource } from '@/lib/domain/character';

/**
 * 職業資源規則表（SRD 5.2 / D&D 2024），移植自 Flutter 端的
 * `class_resources.dart`。驗收依據為 golden/derive_class_resources.json
 * （8 職業 × 1–20 級共 160 案例）。
 *
 * 內建固定清單，不做通用規則引擎。只收「遊玩當下即時消耗」的本職資源；
 * 休息才觸發的機制（奧術回復、生命骰）、子職資源、魔法物品充能不在此處。
 * 契術師魔能位沿用 spellSlots 呈現，不入資源表。
 *
 * 恢復時機採簡化：規則書「短休回 1／長休全回」一律標短休；吟遊激勵 5 級
 * （激勵泉湧）起改標短休，細則由玩家自行裁量。
 */

type Formula =
  | 'fixed'
  | 'levelTable'
  | 'abilityMod'
  | 'equalsLevel'
  | 'levelTimes';

type Rule = {
  classEn: string;
  name: string;
  nameEn: string;
  /** 獲得等級（未達時不產出）。 */
  fromLevel?: number;
  formula: Formula;
  param?: number;
  levelTable?: number[];
  abilityCode?: string;
  /** dice 顯示的骰面隨等級表。 */
  dieFacesTable?: number[];
  recovery?: ClassResource['recovery'];
  /** 自此等級起恢復時機改為短休。 */
  shortRestFromLevel?: number;
  display?: ClassResource['display'];
  unit?: string;
};

export const CLASS_RESOURCE_RULES: Rule[] = [
  {
    classEn: 'Barbarian',
    name: '狂暴',
    nameEn: 'Rage',
    formula: 'levelTable',
    levelTable: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6],
  },
  {
    classEn: 'Bard',
    name: '吟遊激勵',
    nameEn: 'Bardic Inspiration',
    formula: 'abilityMod',
    abilityCode: 'CHA',
    dieFacesTable: [
      6, 6, 6, 6, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12, 12,
    ],
    shortRestFromLevel: 5,
    display: 'dice',
  },
  {
    classEn: 'Cleric',
    name: '引導神力',
    nameEn: 'Channel Divinity',
    fromLevel: 2,
    formula: 'levelTable',
    levelTable: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4],
    recovery: 'short',
  },
  {
    classEn: 'Druid',
    name: '荒野變身',
    nameEn: 'Wild Shape',
    fromLevel: 2,
    formula: 'levelTable',
    levelTable: [0, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
    recovery: 'short',
  },
  {
    classEn: 'Fighter',
    name: '第二風',
    nameEn: 'Second Wind',
    formula: 'levelTable',
    levelTable: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    recovery: 'short',
  },
  {
    classEn: 'Fighter',
    name: '動作如潮',
    nameEn: 'Action Surge',
    fromLevel: 2,
    formula: 'levelTable',
    levelTable: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
    recovery: 'short',
  },
  {
    classEn: 'Monk',
    name: '專注點',
    nameEn: 'Focus Points',
    fromLevel: 2,
    formula: 'equalsLevel',
    recovery: 'short',
  },
  {
    classEn: 'Paladin',
    // 內容庫 `class_features` 的官方譯名是「聖療」。這裡原本叫「聖療之觸」，
    // 於是同一個特性在角色卡上有兩個名字：特性區寫「聖療」、資源區寫
    // 「聖療之觸」。以內容庫為準。
    name: '聖療',
    nameEn: 'Lay on Hands',
    formula: 'levelTimes',
    param: 5,
    display: 'number',
    unit: 'HP',
  },
  {
    classEn: 'Paladin',
    name: '引導神力',
    nameEn: 'Channel Divinity',
    fromLevel: 3,
    formula: 'levelTable',
    levelTable: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    recovery: 'short',
  },
  {
    classEn: 'Sorcerer',
    name: '術法點數',
    nameEn: 'Sorcery Points',
    fromLevel: 2,
    formula: 'equalsLevel',
    display: 'number',
    unit: '點',
  },
  // 遊俠、盜賊、法師、契術師：無合格的即時消耗型本職資源。
];

const abilityMod = (scores: AbilityScores, code: string): number => {
  switch (code) {
    case 'STR':
      return scores.str.modifier;
    case 'DEX':
      return scores.dex.modifier;
    case 'CON':
      return scores.con.modifier;
    case 'INT':
      return scores.int_.modifier;
    case 'WIS':
      return scores.wis.modifier;
    case 'CHA':
      return scores.cha.modifier;
    default:
      return 0;
  }
};

const clampLevel = (level: number) => Math.min(Math.max(level, 1), 20);

function maxFor(r: Rule, level: number, scores: AbilityScores): number {
  const lv = clampLevel(level);
  switch (r.formula) {
    case 'fixed':
      return r.param ?? 0;
    case 'levelTable':
      return r.levelTable![lv - 1];
    case 'abilityMod':
      // 下限 1：魅力調整值為負的吟遊詩人仍有 1 次激勵。
      return Math.min(Math.max(abilityMod(scores, r.abilityCode ?? ''), 1), 99);
    case 'equalsLevel':
      return lv;
    case 'levelTimes':
      return (r.param ?? 0) * lv;
  }
}

function build(r: Rule, level: number, scores: AbilityScores): ClassResource {
  const lv = clampLevel(level);
  const max = maxFor(r, lv, scores);
  const short =
    r.recovery === 'short' ||
    (r.shortRestFromLevel !== undefined && lv >= r.shortRestFromLevel);
  return {
    name: r.name,
    nameEn: r.nameEn,
    current: max,
    max,
    recovery: short ? 'short' : (r.recovery ?? 'long'),
    display: r.display ?? 'pips',
    dieFaces: r.dieFacesTable ? r.dieFacesTable[lv - 1] : 0,
    unit: r.unit ?? '',
  };
}

/** 該職業於該等級應具備的職業資源（current = max）。 */
export function deriveClassResources(
  classEn: string,
  level: number,
  scores: AbilityScores,
): ClassResource[] {
  return CLASS_RESOURCE_RULES.filter(
    (r) => r.classEn === classEn && level >= (r.fromLevel ?? 1),
  ).map((r) => build(r, level, scores));
}
