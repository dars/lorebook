import { ABILITY_LABELS } from '@/lib/backgrounds/types';
import type { CatalogFeat } from '@/lib/catalog/types';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import type { Character, CharacterFeature } from '@/lib/domain/character';

/**
 * 升級時的專長（SRD 5.2 Feats；asi-or-feat）。
 *
 * 先決條件與能力加值是**固定清單**解析而非條件引擎：SRD 範圍內只有
 * `level`／`ability`／`spellcasting2020` 三種鍵（與 `ac.ts` 同一原則）。
 */

/** 就是 ASI 模式本身，不列入「內容庫專長」。 */
const ASI_FEAT = 'Ability Score Improvement';

/** 史詩恩賜的先決條件等級，也是它唯一可取得的 ASI 等級。 */
export const EPIC_BOON_LEVEL = 19;

export function featCandidates(feats: CatalogFeat[], targetLevel: number): CatalogFeat[] {
  return feats.filter(
    (f) =>
      (['G','O','FS'].includes(f.data.category) && f.eng_name !== ASI_FEAT) ||
      (f.data.category === 'EB' && targetLevel >= EPIC_BOON_LEVEL),
  );
}

export const isEpicBoon = (f: CatalogFeat) => f.data.category === 'EB';

/**
 * 「本級可選一個專長」的職業特性本身。
 *
 * 選了專長時不再另列它：專長條目已經代表這一格，兩筆並列看起來像重複取得。
 * 選屬性值提升時照舊保留——那一格沒有自己的條目，這筆是唯一的紀錄。
 */
const FEAT_SLOT_FEATURES = new Set(['Ability Score Improvement', 'Epic Boon']);
export const isFeatSlotFeature = (engName: string | null) =>
  FEAT_SLOT_FEATURES.has(engName ?? '');

const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

/**
 * 專長可 +1 的能力與上限；不附帶能力加值者回 null。
 *
 * 只讀第一組 `choose.from`：SRD 的 G／EB 專長都是單一「選一項 +1」。
 */
export function featAbilityOptions(
  feat: CatalogFeat,
): { from: string[]; cap: number } | null {
  const first = obj(feat.data.ability[0]);
  const from = obj(first.choose).from;
  if (!Array.isArray(from) || from.length === 0) return null;
  return {
    from: from.map((a) => String(a).toUpperCase()),
    cap: typeof first.max === 'number' ? first.max : 20,
  };
}

const SCORE_KEY: Record<string, keyof Character['abilityScores']> = {
  STR: 'str', DEX: 'dex', CON: 'con', INT: 'int_', WIS: 'wis', CHA: 'cha',
};

/**
 * 一組先決條件中**未滿足**的項目（人讀文字）。空陣列＝這組滿足。
 *
 * 能力值以升級**前**的分數判斷——先決條件在取得專長當下檢查，本級的 +1
 * 還沒發生。不認得的鍵視為滿足：重匯多出新鍵時，最壞是玩家可選一個不合格
 * 的專長，而不是整個專長從清單消失。
 */
function unmetInGroup(group: unknown, c: Character, targetLevel: number): string[] {
  const g = obj(group);
  const unmet: string[] = [];
  if (typeof g.level === 'number' && targetLevel < g.level) {
    unmet.push(`等級 ${g.level}`);
  }
  // 5etools 的 ability 陣列內各物件為「任一」，物件內各鍵為「全部」。
  if (Array.isArray(g.ability) && g.ability.length > 0) {
    const options = g.ability.map((a) => Object.entries(obj(a)));
    const ok = options.some((pairs) =>
      pairs.every(([k, min]) => {
        const key = SCORE_KEY[k.toUpperCase()];
        return !key || typeof min !== 'number' || c.abilityScores[key].score >= min;
      }),
    );
    if (!ok) {
      unmet.push(
        options
          .map((pairs) =>
            pairs.map(([k, min]) => `${ABILITY_LABELS[k.toUpperCase()] ?? k} ${min}`).join('、'),
          )
          .join(' 或 '),
      );
    }
  }
  if (g.spellcasting2020 === true && c.spellcastingAbility === '') {
    unmet.push('施法能力');
  }
  return unmet;
}

/** 先決條件未滿足的原因；滿足（或沒有先決條件）時回 null。多組為「任一組滿足即可」。 */
export function featPrereqUnmet(
  feat: CatalogFeat,
  c: Character,
  targetLevel: number,
): string | null {
  if (feat.data.category === 'FS' && !(c.classNameEn === 'Fighter' || (['Paladin','Ranger'].includes(c.classNameEn) && targetLevel >= 2))) return '需要戰鬥風格特性';
  if (!['Skilled','Magic Initiate','Ability Score Improvement'].includes(feat.eng_name ?? '') && c.features.some(f=>!f.isCustom&&f.nameEn===feat.eng_name)) return '已取得此專長';
  const groups = feat.data.prerequisite;
  if (groups.length === 0) return null;
  const unmet = groups.map((g) => unmetInGroup(g, c, targetLevel));
  if (unmet.some((u) => u.length === 0)) return null;
  return `需要${unmet.map((u) => u.join('、')).join(' 或 ')}`;
}

const featSource = (epic: boolean, targetLevel: number) =>
  `${epic ? '史詩恩賜' : '專長'}：Lv${targetLevel}`;

export function catalogFeatFeature(feat: CatalogFeat, targetLevel: number): CharacterFeature {
  return {
    name: feat.name,
    nameEn: feat.eng_name ?? '',
    source: featSource(isEpicBoon(feat), targetLevel),
    description: ftFlattenEntries(feat.data.entries),
    isCustom: false,
  };
}

export function customFeatFeature(
  input: { name: string; description: string; epic: boolean },
  targetLevel: number,
): CharacterFeature {
  return {
    name: input.name.trim(),
    nameEn: '',
    source: featSource(input.epic, targetLevel),
    description: input.description.trim(),
    isCustom: true,
  };
}
