import { describe, expect, it } from 'vitest';

import { CatalogFeat } from '@/lib/catalog/types';
import { buildCharacter } from '@/lib/creation/build';
import { BACKGROUNDS, CLASSES, SPECIES } from '@/lib/creation/data';
import type { Character } from '@/lib/domain/character';
import srdFeats from './fixtures/srd-feats.json';
import {
  catalogFeatFeature,
  customFeatFeature,
  featAbilityOptions,
  featCandidates,
  featPrereqUnmet,
  isFeatSlotFeature,
} from './feats';
import { applyLevelUp, planFor } from './level-up';

/**
 * 升級的「屬性值提升或專長」（asi-or-feat）。
 *
 * fixture 是 `feats` 表的 SRD 17 筆實際資料。內容庫重匯後資料形狀若變了，
 * 應該在這裡看到，而不是在升級頁上看到某個專長安靜地消失。
 */
const FEATS = CatalogFeat.array().parse(srdFeats);
const byEn = (en: string) => FEATS.find((f) => f.eng_name === en)!;

const base = (scores: Record<string, number>, cls = '戰士') =>
  buildCharacter(
    {
      name: '測試者',
      species: SPECIES[0],
      cls: CLASSES.find((c) => c.cn === cls)!,
      background: BACKGROUNDS[0],
      base: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...scores },
      // '2/1' 不指派＝不加值，分數就是 base。
      bonusMode: '2/1' as const,
      classSkills: [],
      speciesSkills: [],
    },
    'x',
  );

const levelTo = (c: Character, target: number) => {
  while (c.level < target) c = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), {});
  return c;
};

/** 直接改分數（含修正值），避免為了造數值去走建角的加值規則。 */
const withScore = (c: Character, key: keyof Character['abilityScores'], score: number) => ({
  ...c,
  abilityScores: {
    ...c.abilityScores,
    [key]: { ...c.abilityScores[key], score, modifier: Math.floor((score - 10) / 2) },
  },
});

describe('fixture', () => {
  it('SRD 17 筆、全數通過 schema', () => expect(FEATS).toHaveLength(17));
});

describe('featCandidates', () => {
  it('Lv4 只有擒抱大師——排除屬性值提升本身、戰鬥風格、起源、史詩恩賜', () => {
    expect(featCandidates(FEATS, 4).map((f) => f.eng_name)).toEqual(['Grappler']);
  });

  it('Lv19 為擒抱大師＋7 個史詩恩賜', () => {
    const c = featCandidates(FEATS, 19);
    expect(c).toHaveLength(8);
    expect(c.filter((f) => f.data.category === 'EB')).toHaveLength(7);
  });
});

describe('featAbilityOptions', () => {
  it('擒抱大師：力量或敏捷，上限 20', () => {
    expect(featAbilityOptions(byEn('Grappler'))).toEqual({ from: ['STR', 'DEX'], cap: 20 });
  });

  it('戰技恩賜：六項皆可，上限 30', () => {
    expect(featAbilityOptions(byEn('Boon of Combat Prowess'))).toEqual({
      from: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
      cap: 30,
    });
  });
});

describe('featPrereqUnmet', () => {
  it('力量、敏捷皆 12：擒抱大師不可選，原因列出兩個選項', () => {
    const c = withScore(withScore(base({}), 'str', 12), 'dex', 12);
    const why = featPrereqUnmet(byEn('Grappler'), c, 4);
    expect(why).toContain('力量 13');
    expect(why).toContain('敏捷 13');
  });

  it('力量 10、敏捷 14：任一組滿足即可', () => {
    const c = withScore(withScore(base({}), 'str', 10), 'dex', 14);
    expect(featPrereqUnmet(byEn('Grappler'), c, 4)).toBeNull();
  });

  it('無施法能力：法術回想恩賜不可選', () => {
    const c = base({}, '戰士');
    expect(c.spellcastingAbility).toBe('');
    expect(featPrereqUnmet(byEn('Boon of Spell Recall'), c, 19)).toContain('施法能力');
  });

  it('施法者：法術回想恩賜可選', () => {
    expect(featPrereqUnmet(byEn('Boon of Spell Recall'), base({}, '法師'), 19)).toBeNull();
  });

  it('不認得的鍵視為滿足', () => {
    const odd = CatalogFeat.parse({
      id: 'x', name: '怪', eng_name: 'Odd',
      data: { category: 'G', prerequisite: [{ someNewKey: true }] },
    });
    expect(featPrereqUnmet(odd, base({}), 4)).toBeNull();
  });
});

describe('專長條目', () => {
  it('內容庫專長：中英名、來源帶等級、非自創、有說明', () => {
    const f = catalogFeatFeature(byEn('Grappler'), 4);
    expect(f).toMatchObject({ name: '擒抱大師', nameEn: 'Grappler', source: '專長：Lv4', isCustom: false });
    expect(f.description.length).toBeGreaterThan(0);
  });

  it('史詩恩賜的來源為「史詩恩賜」', () => {
    expect(catalogFeatFeature(byEn('Boon of Fate'), 19).source).toBe('史詩恩賜：Lv19');
  });

  it('自訂專長：trim、自創；勾史詩恩賜時換來源', () => {
    expect(customFeatFeature({ name: '  鐵壁 ', description: ' 說明 ', epic: false }, 8)).toEqual({
      name: '鐵壁', nameEn: '', source: '專長：Lv8', description: '說明', isCustom: true,
    });
    expect(customFeatFeature({ name: '鐵壁', description: '', epic: true }, 19).source).toBe(
      '史詩恩賜：Lv19',
    );
  });
});

describe('applyLevelUp 的專長選擇', () => {
  const at = (lvl: number, scores: Record<string, number> = {}) => levelTo(base(scores), lvl);

  it('上限預設 20：20 再 +1 仍為 20', () => {
    const c = withScore(at(3), 'dex', 20);
    const r = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), { asi: { DEX: 1 } });
    expect(r.abilityScores.dex.score).toBe(20);
  });

  it('上限 30（史詩恩賜）：20 → 21', () => {
    const c = withScore(at(18), 'str', 20);
    const r = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), { asi: { STR: 1 }, abilityCap: 30 });
    expect(r.abilityScores.str.score).toBe(21);
  });

  it('既有的 21 在下次升級不會被夾回 20', () => {
    const c = withScore(at(19), 'str', 21);
    const r = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), {});
    expect(r.abilityScores.str.score).toBe(21);
  });

  it('專長 +1 體質使修正提升時，回溯既有等級的 HP', () => {
    const c = withScore(at(3), 'con', 13);
    const plan = planFor(c, c.speciesHpPerLevel);
    const without = applyLevelUp(c, plan, {});
    const withCon = applyLevelUp(c, plan, { asi: { CON: 1 } });
    // 本級 +1 ＋ 既有 3 級各 +1
    expect(withCon.maxHp - without.maxHp).toBe(4);
  });

  it('專長條目附加在特性清單最後', () => {
    const c = at(3);
    const feat = customFeatFeature({ name: '鐵壁', description: '', epic: false }, 4);
    const r = applyLevelUp(c, planFor(c, c.speciesHpPerLevel), { feat });
    expect(r.features.at(-1)).toEqual(feat);
    expect(r.features).toHaveLength(c.features.length + 1);
  });
});

describe('isFeatSlotFeature', () => {
  it('屬性值提升與史詩恩賜這兩個職業特性是「專長格」本身', () => {
    expect(isFeatSlotFeature('Ability Score Improvement')).toBe(true);
    expect(isFeatSlotFeature('Epic Boon')).toBe(true);
    expect(isFeatSlotFeature('Extra Attack')).toBe(false);
    expect(isFeatSlotFeature(null)).toBe(false);
  });
});
