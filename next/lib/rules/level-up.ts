import { backfillCleric } from './cleric';
import { backfillBard } from './bard';
import { backfillBarbarian } from './barbarian';
import { backfillWizard } from './wizard';
import { recalculateChoiceSkills } from './progression/engine';
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
  /**
   * 能力代碼 → 加值（{INT:2} 或 {INT:1, WIS:1}）。
   * 專長的 +1 也走這裡——它在規則上就是能力值提升，另開一條路就得再實作一次
   * CON 回溯 HP 與各項重算。
   */
  asi?: Record<string, number>;
  /** 能力值夾值上限。預設 20；史詩恩賜為 30。由呼叫端決定，這裡不需要知道專長種類。 */
  abilityCap?: number;
  /** 本級取得的專長（選屬性值提升時為 undefined）。 */
  feat?: Character['features'][number];
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

/**
 * 需要補選子職：3 級以上卻沒有子職。
 *
 * 只會在升級當下內容庫離線、子職那一步被跳過時發生。沒有補選入口的話這個
 * 角色就**永遠**沒有子職——下次升級的 `pickSubclass` 已經是 false，
 * 那一步不會再出現。
 */
export const needsSubclassPick = (c: Character) =>
  c.level >= 3 && c.subclass.trim() === '' && c.customSubclass == null;

/**
 * 補選子職：只寫入子職與其特性，**不動等級與任何數值**。
 *
 * 與 `applyLevelUp` 分開是因為它們做的是不同的事——補選不是升級，
 * 走升級那條路會把等級也加上去。
 */
export function applySubclassPick(
  c: Character,
  choices: {
    subclass: string;
    subclassEn?: string;
    features?: Character['features'];
    customSubclass?: Character['customSubclass'];
  },
): Character {
  return {
    ...c,
    subclass: choices.subclass,
    subclassEn: choices.subclassEn ?? '',
    features: [...c.features, ...(choices.features ?? [])],
    customSubclass: choices.customSubclass ?? c.customSubclass,
  };
}

/**
 * 2014 SRD 子職英文名 → 2024 SRD 5.2。只收**改了名**的；其餘兩版同名。
 *
 * Flutter 時期的示範角色存的是舊名（`School of Evocation`），以新名比對會
 * 找不到子職——症狀是 6／10／14 級的子職特性安靜地不見。在比對時對照而非
 * 改寫角色資料：角色卡上的名稱是使用者看得到的東西，不該被悄悄換掉。
 */
const LEGACY_SUBCLASS_EN: Record<string, string> = {
  'School of Evocation': 'Evoker',
  'Way of the Open Hand': 'Warrior of the Open Hand',
  'Draconic Bloodline': 'Draconic Sorcery',
  'The Fiend': 'Fiend Patron',
};

/**
 * 角色卡上的 SRD 子職對回內容庫的哪一個。對不到（自訂子職、尚未選）回 null。
 *
 * 依序比英文名、舊名對照、中文名。中文名排最後：內容庫的譯名會被修正
 * （supabase/data-fixes/），比英文名容易漂移。
 */
export function findSrdSubclass<T extends { name: string; eng_name: string | null }>(
  subclasses: T[],
  c: Pick<Character, 'subclass' | 'subclassEn'>,
): T | null {
  const en = c.subclassEn.trim();
  const cn = c.subclass.trim();
  const target = LEGACY_SUBCLASS_EN[en] ?? en;
  return (
    (target && subclasses.find((s) => s.eng_name === target)) ||
    (cn && subclasses.find((s) => s.name === cn)) ||
    null
  );
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
  const cap = choices.abilityCap ?? 20;

  const oldScores = Object.fromEntries(
    KEYS.map(([code, key]) => [code, c.abilityScores[key]]),
  );
  const scores = Object.fromEntries(
    KEYS.map(([code]) => {
      const old = oldScores[code];
      const add = asi[code] ?? 0;
      // 只夾有加值的能力，且上限不低於現有分數：19 級以史詩恩賜到 21 之後，
      // 升 20 時若對全部能力夾 20，那一點會在沒有任何提示下被吃掉。
      const score =
        add === 0
          ? old.score
          : Math.min(Math.max(old.score + add, 1), Math.max(cap, old.score));
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

  const result: Character = {
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
    features: [
      ...c.features,
      ...(choices.features ?? []),
      ...(choices.feat ? [choices.feat] : []),
    ],
    cantrips: [...c.cantrips, ...(choices.cantrips ?? [])],
    spells: [...c.spells, ...(choices.spells ?? [])],
    resources: syncClassResources(c.resources, c.classNameEn, target, newScores),
  };
  return backfillCleric(backfillBard(backfillBarbarian(backfillWizard(c.progression ? recalculateChoiceSkills(result) : result))));
}

/**
 * 升級後同步職業資源：上限與骰面重算，**已消耗的差額入帳**而非回滿
 * （升級不視為休息）；規則表新出現的資源以滿額加入。
 *
 * 規則表管不到的資源（自訂種族的有限次數能力）原樣保留，除非它標了
 * `scaling: 'proficiency'`——那是「次數等於熟練加值」的意圖，數字本來就
 * 該隨等級走（custom-species D9）。
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

  const pb = proficiencyBonusFor(level);

  for (const e of existing) {
    const d = derived.find((x) => x.nameEn === e.nameEn);
    if (!d) {
      if (e.scaling === 'proficiency' && e.max !== pb) {
        // 與職業資源同樣的差額入帳：升級不是休息，已經用掉的不會回來。
        result.push({
          ...e,
          max: pb,
          current: Math.min(Math.max(e.current + (pb - e.max), 0), pb),
        });
        continue;
      }
      result.push(e); // 其餘自訂資源原樣保留
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

/** 保存前檢查實際分配，避免僅依賴按鈕 disabled 或前一次表單狀態。 */
export function levelUpFeatIssue(c: Character, choices: LevelUpChoices): string | null {
  if (!planFor(c, c.speciesHpPerLevel).hasAsi) return null;
  if (choices.feat?.name.trim()) return null;
  const entries = Object.entries(choices.asi ?? {});
  const keys: Record<string, keyof AbilityScores> = { STR:'str', DEX:'dex', CON:'con', INT:'int_', WIS:'wis', CHA:'cha' };
  if (!entries.length || entries.some(([k,v]) => !keys[k] || !Number.isInteger(v) || v < 1 || v > 2) || entries.reduce((sum,[,n])=>sum+n,0)!==2) return '請完成本級的能力值提升或專長選擇。';
  if(entries.some(([k,v])=>c.abilityScores[keys[k]].score+v>20)) return '能力值提升不能超過 20，請重新分配或選擇專長。';
  return null;
}
