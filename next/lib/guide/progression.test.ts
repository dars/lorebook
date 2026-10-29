import { describe, expect, it } from 'vitest';
import { GUIDE_CLASSES } from './classes';
import { COVERAGE } from './coverage';
import { filterGuideLevels, getGuideClass, guideLevels } from './progression';

const rows = (name: string, subclass = false) => guideLevels(getGuideClass(name), subclass);
const choice = (name: string, level: number, id: string, subclass = false) => rows(name, subclass)[level - 1].choices.find((item) => item.id === id);

describe('SRD 5.2.1 職業成長指南', () => {
  it('12 職業各有完整 20 級，所有選擇都有唯一識別、來源與可追溯狀態', () => {
    expect(GUIDE_CLASSES).toHaveLength(12);
    for (const cls of GUIDE_CLASSES) {
      const levels = guideLevels(cls, true);
      expect(levels.map((row) => row.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      const ids = levels.flatMap((row) => row.choices.map((item) => item.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const row of levels) for (const item of row.choices) {
        expect(item.detail.length).toBeGreaterThan(10);
        expect(item.page).toBeGreaterThanOrEqual(28);
        expect(item.page).toBeLessThanOrEqual(82);
        expect(COVERAGE[item.coverage].evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('戰鬥風格是戰士 1 級、聖騎士與遊俠 2 級；替代方案不是額外獎勵', () => {
    expect(choice('Fighter', 1, 'fighting-style')).toBeDefined();
    for (const name of ['Paladin', 'Ranger']) {
      expect(choice(name, 1, 'fighting-style')).toBeUndefined();
      expect(choice(name, 2, 'fighting-style')?.title).toContain('二選一');
      expect(choice(name, 2, 'fighting-style')?.detail).toContain('放棄戰鬥風格');
    }
    expect(choice('Fighter', 7, 'champion-style')).toBeUndefined();
    expect(choice('Fighter', 7, 'champion-style', true)?.conditional).toContain('Champion');
  });

  it('自動獲得的戰鬥選項不誤算永久升級選擇', () => {
    expect(rows('Monk')[1].choices).toHaveLength(0);
    expect(rows('Barbarian')[1].choices).toHaveLength(0);
    expect(rows('Rogue')[1].choices).toHaveLength(0);
    expect(rows('Cleric')[1].choices.map((c) => c.id)).toEqual(['spells-2']);
  });

  it('專精與額外語言出現在正確等級，法師有技能限制', () => {
    expect(choice('Bard', 2, 'expertise-2')).toBeDefined();
    expect(choice('Bard', 9, 'expertise-9')).toBeDefined();
    expect(choice('Rogue', 6, 'expertise-6')).toBeDefined();
    expect(choice('Ranger', 2, 'deft-languages')?.title).toContain('2 種');
    expect(choice('Wizard', 2, 'scholar')?.detail).toContain('已熟練的奧秘、歷史、調查、醫藥、自然、宗教');
  });

  it('祈喚按已知總數增加，奧秘另列 6–9 環而不改契約法術位', () => {
    expect(rows('Warlock').filter((row) => row.choices.some((c) => c.id.startsWith('invocations-'))).map((row) => row.level)).toEqual([1, 2, 5, 7, 9, 12, 15, 18]);
    expect(choice('Warlock', 2, 'invocations-2')?.title).toContain('新增 2 項，共 3 項');
    expect(choice('Warlock', 18, 'invocations-18')?.title).toContain('共 10 項');
    expect(choice('Warlock', 17, 'arcanum-17')?.title).toContain('9 環');
    expect(rows('Warlock')[16].growth).toContain('契約法術位：5 環 × 4');
  });

  it('術士超魔 2／10／17 級，以及德魯伊形態 2／4／8 級', () => {
    expect(rows('Sorcerer').filter((row) => row.choices.some((c) => c.id.startsWith('metamagic-'))).map((row) => row.level)).toEqual([2, 10, 17]);
    expect(choice('Sorcerer', 17, 'metamagic-17')?.title).toContain('共 6 項');
    expect(choice('Druid', 2, 'forms-2')?.detail).toContain('1/4');
    expect(choice('Druid', 4, 'forms-4')?.detail).toContain('不可有飛行');
    expect(choice('Druid', 8, 'forms-8')?.detail).toContain('允許飛行');
  });

  it('法師法術書與準備數分開，塑能學者另計且不重複在 3 級增加 1 個', () => {
    expect(choice('Wizard', 1, 'spellbook-1')?.title).toContain('6 個');
    expect(choice('Wizard', 2, 'spellbook-2')?.title).toContain('2 個');
    expect(rows('Wizard')[1].growth[0]).toContain('基本已備 5 個');
    expect(rows('Wizard', true)[2].choices.filter((c) => c.id.startsWith('evocation'))).toHaveLength(1);
    expect(choice('Wizard', 5, 'evocation-5', true)).toBeDefined();
    expect(choice('Wizard', 6, 'evocation-6', true)).toBeUndefined();
  });

  it('戰士與盜賊額外專長、各職業 19 級史詩恩賜均保留', () => {
    expect(rows('Fighter').filter((row) => row.choices.some((c) => c.id.startsWith('feat-'))).map((row) => row.level)).toEqual([4, 6, 8, 12, 14, 16, 19]);
    expect(choice('Rogue', 10, 'feat-10')).toBeDefined();
    for (const cls of GUIDE_CLASSES) expect(choice(cls.en, 19, 'feat-19')?.title).toContain('史詩恩賜');
  });

  it('搜尋和只看選擇共同作用，不把空結果冒充完整指南', () => {
    expect(filterGuideLevels(rows('Monk'), '', true).some((row) => row.level === 2)).toBe(false);
    expect(filterGuideLevels(rows('Monk'), '  FOCUS ', false).some((row) => row.level === 2)).toBe(true);
    expect(filterGuideLevels(rows('Paladin'), '祝福戰士', true).map((row) => row.level)).toEqual([2]);
    expect(filterGuideLevels(rows('Paladin'), '2', false).map((row) => row.level)).toEqual([2]);
    expect(filterGuideLevels(rows('Wizard'), '不存在的規則zz', false)).toHaveLength(0);
    expect(getGuideClass('not-a-class').en).toBe('Barbarian');
    expect(getGuideClass('PALADIN').en).toBe('Paladin');
  });
});


describe('SRD 武器精通限制與章節來源', () => {
  it('戰士長休只換一種，不能整組重選', () => {
    expect(getGuideClass('Fighter').reminders[0]).toContain('每次長休後可替換 1 種');
    expect(choice('Fighter', 1, 'mastery-1')?.page).toBe(48);
  });
  it('野蠻人在所有取得精通的等級都限定近戰武器', () => {
    const mastery = rows('Barbarian').flatMap(row => row.choices).filter(item => item.id.startsWith('mastery-'));
    expect(mastery.length).toBeGreaterThan(0);
    for (const item of mastery) {
      expect(item.detail).toContain('簡易近戰武器或軍用近戰武器');
      expect(item.detail).toContain('不能選長弓等遠程武器');
      expect(item.page).toBe(29);
    }
  });
  it('法師章節與建角來源從 77 頁開始，邪魔宗主仍是 76 頁', () => {
    expect(getGuideClass('Wizard').page).toBe(77);
    expect(choice('Wizard', 1, 'equipment')?.page).toBe(77);
    expect(getGuideClass('Warlock').subclass.page).toBe(76);
  });
});
