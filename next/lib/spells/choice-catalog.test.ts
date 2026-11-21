import { describe, expect, it } from 'vitest';
import { CatalogSpell } from '@/lib/catalog/types';
import { Character, parseCharacter } from '@/lib/domain/character';
import { applyChoices, validateChoices } from '@/lib/rules/progression/engine';
import { choiceGroups } from '@/lib/rules/progression/groups';
import { normalizePreparedSelections } from '@/lib/rules/progression/granted-spells';
import { applyLevelUp, planFor } from '@/lib/rules/level-up';
import { CustomSpell, spellFromCustom } from './types';
import { customChoiceId, mergeChoiceSpells } from './choice-catalog';

const make = () => Character.parse({
  id: 'wizard', name: '法師', classNameEn: 'Wizard', spellcastingAbility: 'INT', level: 1,
  abilityScores: Object.fromEntries(['str', 'dex', 'con', 'int_', 'wis', 'cha'].map(k => [k, { score: 14, modifier: 2 }])),
});
const system = Array.from({ length: 6 }, (_, i) => CatalogSpell.parse({
  id: `s${i}`, name: `系統${i}`, eng_name: `Spell${i}`, level: 1, classes: ['Wizard'], casting_time: [{ unit: 'action' }],
}));
const custom = CustomSpell.parse({
  id: 'star', name: '星焰', level: 1, description: '自訂效果 {@dice 1d6}',
  castKind: 'bonus', castingTime: '1 個附贈動作', range: '30 呎',
  damage: '1d6', damageType: '火焰', concentration: true, upgrade: '每環 +1d6',
});
const source = (s = custom) => ({ spell: spellFromCustom(s), school: s.school, ritual: s.ritual });
const cid = customChoiceId(custom.id);
const selections = { 'book-1': [cid, 's0', 's1', 's2', 's3', 's4'], prepared: [cid, 's0', 's1', 's2'] };
const catalog = (c?: Character, s = [source()]) => ({ spells: mergeChoiceSpells(system, s, c), items: [] });

describe('法師成長流程的自創法術', () => {
  it('收藏的一環法術可選入起始六個法術書名額，選入後才可準備', () => {
    const c = make(), data = catalog();
    expect(choiceGroups(c, data).find(g => g.id === 'book-1')?.options.some(o => o.id === cid)).toBe(true);
    expect(choiceGroups(c, data).find(g => g.id === 'book-1')?.options.find(o => o.id === cid)?.description).toBe(spellFromCustom(custom).description);
    expect(choiceGroups(c, data).find(g => g.id === 'prepared')?.options.some(o => o.id === cid)).toBe(false);
    expect(validateChoices(c, selections, data, 'creation', false)).toEqual([]);
    const result = applyChoices(c, selections, data, 'creation', false);
    expect(result.spellbook).toHaveLength(6);
    expect(result.spells).toHaveLength(4);
    expect(result.spellbook?.find(s => s.homebrewId === custom.id)).toMatchObject({ prepared: false, progressionSource: 'book-1' });
    expect(result.spells.find(s => s.homebrewId === custom.id)).toMatchObject({ prepared: true, progressionSource: 'prepared' });
  });

  it('保存及重載不丟失自創來源、說明、施法分類、射程、傷害與升環', () => {
    const c = applyChoices(make(), selections, catalog(), 'creation', false);
    const saved = parseCharacter(JSON.parse(JSON.stringify(c)));
    expect(saved.spells.find(s => s.homebrewId === custom.id)).toMatchObject({
      description: spellFromCustom(custom).description, castKind: 'bonus', castingTime: custom.castingTime,
      range: '30 呎', damage: '1d6', damageType: '火焰', upgrade: '每環 +1d6', concentration: true,
    });
    expect(saved.spellbook).toEqual(c.spellbook);
    expect(saved.spells).toEqual(c.spells);
  });

  it('自創法術仍受環數限制，戲法及二環不會出現在一級法術書', () => {
    const data = catalog(undefined, [source(), source({ ...custom, id: 'zero', level: 0 }), source({ ...custom, id: 'two', level: 2 })]);
    const groups = choiceGroups(make(), data);
    const ids = groups.find(g => g.id === 'book-1')!.options.map(o => o.id);
    expect(ids).toContain(cid);
    expect(ids).not.toContain(customChoiceId('zero'));
    expect(ids).not.toContain(customChoiceId('two'));
    expect(groups.find(g => g.id === 'cantrips')?.options.some(o => o.id === customChoiceId('zero'))).toBe(true);
  });

  it('中文及英文名相同的系統、自創及另一筆自創法術分開計數', () => {
    const data = catalog(undefined, [source({ ...custom, name: '系統0', nameEn: 'Spell0' }), source({ ...custom, id: 'other', name: '系統0', nameEn: 'Spell0' })]);
    const picked = { 'book-1': [cid, customChoiceId('other'), 's0', 's1', 's2', 's3'], prepared: [cid, customChoiceId('other'), 's0', 's1'] };
    const c = applyChoices(make(), picked, data, 'creation', false);
    expect(c.spellbook).toHaveLength(6);
    expect(c.spells.filter(s => s.nameEn === 'Spell0')).toHaveLength(3);
    expect(new Set(c.spells.filter(s => s.nameEn === 'Spell0').map(s => s.homebrewId)).size).toBe(3);
  });

  it('來源改名、改環或刪除後，角色既有版本仍可補選與準備且不重複加入', () => {
    const c = applyChoices(make(), selections, catalog(), 'creation', false);
    for (const sources of [[], [source({ ...custom, name: '修改後', level: 9, description: '新版' })]]) {
      const data = catalog(c, sources);
      const choice = data.spells.find(s => s.id === cid)!;
      expect(choice.name).toBe('星焰');
      expect(choice.level).toBe(1);
      expect(validateChoices(c, selections, data, 'backfill', false)).toEqual([]);
      const again = applyChoices(c, selections, data, 'backfill', false);
      expect(again.spellbook).toEqual(c.spellbook);
      expect(again.spells).toEqual(c.spells);
    }
  });

  it('角色頁手動抄錄的自創法術，可在成長頁準備及補登來源', () => {
    const c = { ...make(), spellbook: [{ ...spellFromCustom(custom), prepared: false }] };
    const data = catalog(c, []);
    expect(choiceGroups(c, data).find(g => g.id === 'prepared')?.options.some(o => o.id === cid)).toBe(true);
    const result = applyChoices(c, selections, data, 'backfill', false);
    expect(result.spellbook?.filter(s => s.homebrewId === custom.id)).toHaveLength(1);
    expect(result.spellbook?.find(s => s.homebrewId === custom.id)?.progressionSource).toBe('book-1');
  });

  it('自創的學派與儀式資格也保存於快照，來源改動或刪除後仍能使用限定名額', () => {
    const original = { ...custom, school: '塑能', ritual: true };
    const c = parseCharacter(JSON.parse(JSON.stringify({ ...make(), spellbook: [spellFromCustom(original)] })));
    for (const sources of [[], [source({ ...original, school: '防護', ritual: false })]]) {
      const data = catalog(c, sources);
      const wizard = { ...c, level: 3, subclassEn: 'Evoker' };
      expect(choiceGroups(wizard, data).find(g => g.id === 'evocation-3')?.options.some(o => o.id === cid)).toBe(true);
      const warlock = { ...c, classNameEn: 'Warlock', spellcastingAbility: 'CHA', spellbook: [], spells: c.spellbook!.map(s => ({ ...s, progressionSource: 'tome-rituals' })) };
      expect(choiceGroups(warlock, data, { invocations: ['Pact of the Tome'] }).find(g => g.id === 'tome-rituals')?.options.some(o => o.id === cid)).toBe(true);
    }
  });

  it('舊的手動抄錄快照補登時保留原效果，並保存可取得的資格欄位', () => {
    const s = source({ ...custom, school: '塑能', ritual: true });
    const legacy = { ...s.spell, description: '角色的原版本' };
    delete legacy.homebrewSchool;
    delete legacy.homebrewRitual;
    const c = { ...make(), spellbook: [legacy] };
    const data = catalog(c, [s]);
    const result = applyChoices(c, selections, data, 'backfill', false);
    expect(result.spellbook?.find(s => s.homebrewId === custom.id)).toMatchObject({
      description: '角色的原版本', homebrewSchool: '塑能', homebrewRitual: true,
    });
  });

  it('升級不得再次用免費名額抄錄同一自創法術，同名系統法術仍可選', () => {
    const c = applyChoices(make(), selections, catalog(), 'creation', false);
    const two = applyLevelUp(c, planFor(c, 0), {});
    const data = catalog(two);
    const group = choiceGroups(two, data).find(g => g.id === 'book-2')!;
    expect(group.options.find(o => o.id === cid)?.disabledReason).toContain('法術書');
    expect(group.options.find(o => o.id === 's5')?.disabledReason).toBeUndefined();
  });

  it('與固定授予法術同名的自創法術不被誤當成系統法術或移出準備名額', () => {
    const c = { ...make(), classNameEn: 'Paladin', level: 5, spellcastingAbility: 'CHA' };
    const data = catalog(undefined, [source({ ...custom, nameEn: 'Find Steed' })]);
    const picked = { prepared: [cid] };
    expect(normalizePreparedSelections(c, picked, data.spells)).toEqual(picked);
    const result = applyChoices(c, picked, data, 'backfill', false);
    expect(result.spells.filter(s => s.homebrewId === custom.id)).toHaveLength(1);
    expect(result.spells.find(s => s.homebrewId === custom.id)?.progressionSource).toBe('prepared');
  });
});
