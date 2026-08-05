import type { AbilityScores, Character, ClassResource } from '@/lib/domain/character';
import {
  abilityModifier,
  levelHpGain,
  passivePerceptionFor,
  proficiencyBonusFor,
  proficientBonus,
  spellAttackFor,
  spellSaveDcFor,
  averageHitDieValue,
} from './ability';
import { deriveClassResources } from './class-resources';
import {
  CLASS_PROGRESSION,
  asiLevelsFor,
  maxSpellRingFor,
  newCantripPicksFor,
  newSpellPicksFor,
  spellSlotTotalsFor,
} from './level-tables';

/**
 * 升級，移植自 Flutter 端的 `level_up.dart`。
 * 驗收依據為 golden/apply_level_up.json。
 *
 * 幾條漏掉不會報錯、只會讓數字悄悄不對的規則：
 * - **CON 修正提升時回溯既有等級的 HP**（Δmod × 舊等級）
 * - **法術位的已用數保留並夾至新上限**——升級不視為休息
 * - **職業資源差額入帳**而非回滿——同上
 */

export type LevelUpPlan = {
  targetLevel: number;
  hitDieFaces: number;
  averageHp: number;
  speciesHpPerLevel: number;
  /** 2024 固定 Lv3 選子職。 */
  pickSubclass: boolean;
  hasAsi: boolean;
  isCaster: boolean;
  newSlotTotals: Record<number, number>;
  cantripPicks: number;
  spellPicks: number;
  maxRing: number;
};

export type LevelUpChoices = {
  /** null／undefined = 取平均值。 */
  hpRoll?: number | null;
  subclass?: string;
  subclassEn?: string;
  /** 能力代碼 → 加值（{INT:2} 或 {INT:1, WIS:1}）。 */
  asi?: Record<string, number>;
  features?: Character['features'];
  cantrips?: Character['spells'];
  spells?: Character['spells'];
};

export function planFor(
  c: Character,
  speciesHpPerLevel: number,
): LevelUpPlan {
  const target = c.level + 1;
  const progression = CLASS_PROGRESSION[c.classNameEn] ?? 'none';
  return {
    targetLevel: target,
    hitDieFaces: c.hitDieFaces,
    averageHp: averageHitDieValue(c.hitDieFaces),
    speciesHpPerLevel,
    pickSubclass: target === 3,
    hasAsi: asiLevelsFor(c.classNameEn).has(target),
    isCaster: progression !== 'none',
    newSlotTotals: spellSlotTotalsFor(progression, target),
    cantripPicks: newCantripPicksFor(c.classNameEn, target),
    spellPicks: newSpellPicksFor(c.classNameEn, target),
    maxRing: maxSpellRingFor(progression, target),
  };
}

const KEYS: [string, keyof AbilityScores][] = [
  ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
  ['INT', 'int_'], ['WIS', 'wis'], ['CHA', 'cha'],
];

export function applyLevelUp(
  c: Character,
  plan: LevelUpPlan,
  choices: LevelUpChoices,
): Character {
  const target = plan.targetLevel;
  const pb = proficiencyBonusFor(target);
  const asi = choices.asi ?? {};

  const oldScores = Object.fromEntries(
    KEYS.map(([code, key]) => [code, c.abilityScores[key]]),
  );
  const scores = Object.fromEntries(
    KEYS.map(([code]) => {
      const old = oldScores[code];
      const score = Math.min(Math.max(old.score + (asi[code] ?? 0), 1), 20);
      return [code, { ...old, score, modifier: abilityModifier(score) }];
    }),
  );

  const conModOld = oldScores.CON.modifier;
  const conModNew = scores.CON.modifier;

  // 本級增量用新的體質修正；修正提升時回溯既有等級。
  const roll = choices.hpRoll ?? plan.averageHp;
  const hpDelta =
    levelHpGain(roll, conModNew, plan.speciesHpPerLevel) +
    (conModNew - conModOld) * c.level;

  const skills = c.skills.map((s) => ({
    ...s,
    modifier: proficientBonus(scores[s.abilityType].modifier, s.proficient, pb),
  }));
  const perceptionProficient =
    skills.find((s) => s.name === '感知')?.proficient ?? false;

  // 已用數保留並夾至新上限——升級不是休息，消耗掉的不會回來。
  const oldUsed = Object.fromEntries(c.spellSlots.map((s) => [s.level, s.used]));
  const spellSlots = Object.entries(plan.newSlotTotals).map(([lvl, total]) => ({
    level: Number(lvl),
    total,
    used: Math.min(Math.max(oldUsed[Number(lvl)] ?? 0, 0), total),
  }));

  const caster = c.spellcastingAbility !== '';
  const spellMod = caster ? scores[c.spellcastingAbility].modifier : 0;

  const newScores = Object.fromEntries(
    KEYS.map(([code, key]) => [key, scores[code]]),
  ) as unknown as AbilityScores;

  return {
    ...c,
    level: target,
    proficiencyBonus: pb,
    maxHp: c.maxHp + hpDelta,
    currentHp: c.currentHp + hpDelta,
    abilityScores: newScores,
    skills,
    initiative: scores.DEX.modifier,
    passivePerception: passivePerceptionFor(
      scores.WIS.modifier,
      perceptionProficient,
      pb,
    ),
    spellDc: caster ? spellSaveDcFor(pb, spellMod) : 0,
    spellAttack: caster ? spellAttackFor(pb, spellMod) : 0,
    spellSlots: caster ? spellSlots : c.spellSlots,
    subclass: choices.subclass ?? c.subclass,
    subclassEn: choices.subclassEn ?? c.subclassEn,
    features: [...c.features, ...(choices.features ?? [])],
    cantrips: [...c.cantrips, ...(choices.cantrips ?? [])],
    spells: [...c.spells, ...(choices.spells ?? [])],
    resources: syncClassResources(c.resources, c.classNameEn, target, newScores),
  };
}

/**
 * 升級後同步職業資源：上限與骰面重算，**已消耗的差額入帳**而非回滿
 * （升級不視為休息）；規則表新出現的資源以滿額加入；非規則表管理的既有
 * 資源（自訂）原樣保留。
 */
export function syncClassResources(
  existing: ClassResource[],
  classEn: string,
  level: number,
  scores: AbilityScores,
): ClassResource[] {
  const derived = deriveClassResources(classEn, level, scores);
  const result: ClassResource[] = [];
  const matched = new Set<string>();

  for (const e of existing) {
    const d = derived.find((x) => x.nameEn === e.nameEn);
    if (!d) {
      result.push(e); // 自訂資源原樣保留
      continue;
    }
    matched.add(d.nameEn);
    result.push({
      ...e,
      max: d.max,
      current: Math.min(Math.max(e.current + (d.max - e.max), 0), d.max),
      dieFaces: d.dieFaces,
      recovery: d.recovery,
    });
  }
  for (const d of derived) {
    if (!matched.has(d.nameEn)) result.push(d);
  }
  return result;
}
