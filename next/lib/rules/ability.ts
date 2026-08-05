/**
 * 角色衍生數值的純函式，移植自 Flutter 端的
 * `lib/features/character/domain/character_math.dart`。
 */

/** 能力調整值（向下取整，負值亦正確）。 */
export const abilityModifier = (score: number) =>
  Math.floor((score - 10) / 2);

/** 熟練加值（Lv1–4 = +2，之後每 4 級 +1：Lv5/9/13/17 提升）。 */
export const proficiencyBonusFor = (level: number) =>
  2 + Math.floor((level - 1) / 4);

/** 豁免／技能加值。 */
export const proficientBonus = (mod: number, proficient: boolean, pb: number) =>
  mod + (proficient ? pb : 0);

/** 被動察覺。 */
export const passivePerceptionFor = (
  wisMod: number,
  perceptionProficient: boolean,
  pb: number,
) => 10 + proficientBonus(wisMod, perceptionProficient, pb);

/** 施法豁免 DC。 */
export const spellSaveDcFor = (pb: number, spellMod: number) =>
  8 + pb + spellMod;

/** 施法命中加值。 */
export const spellAttackFor = (pb: number, spellMod: number) => pb + spellMod;

/** 升級取平均值時的生命骰固定值（d6→4、d8→5、d10→6、d12→7）。 */
export const averageHitDieValue = (faces: number) =>
  Math.floor(faces / 2) + 1;

/** 升 1 級的最大 HP 增量：骰值 + 體質調整值（最低 1）+ 種族每級加成。 */
export const levelHpGain = (
  roll: number,
  conMod: number,
  speciesHpPerLevel = 0,
) => Math.max(roll + conMod, 1) + speciesHpPerLevel;
