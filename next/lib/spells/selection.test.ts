import { describe, expect, it } from 'vitest';
import { Character, Spell } from '@/lib/domain/character';
import { applySpellSelection, selectionDelta, spellKey } from './selection';
const a = Spell.parse({ name: '光亮術', nameEn: 'Light', level: 0, description: '角色版本' });
const b = Spell.parse({ name: '修復術', nameEn: 'Mending', level: 0 });
const custom = Spell.parse({ ...a, homebrewId: 'custom-1' });
const character = () => Character.parse({ id: 'hero', name: '冒險者', abilityScores: Object.fromEntries(['str','dex','con','int_','wis','cha'].map(key => [key,{score:10,modifier:0}])) });
describe('法術選擇草稿', () => {
  it('草稿增刪不改原陣列，反覆取消勾選可還原', () => {
    const initial = [a];
    expect(selectionDelta(initial, [b])).toEqual({ added: [b], removed: [a] });
    expect(initial).toEqual([a]);
    expect(selectionDelta(initial, [a])).toEqual({ added: [], removed: [] });
  });
  it('同名自創與系統法術身分不同，翻譯更新不影響身分', () => {
    expect(spellKey(a)).not.toBe(spellKey(custom));
    expect(spellKey(a)).toBe(spellKey({ ...a, name: '新譯名' }));
  });
  it('儲存只套用差異並保留最新角色及快照', () => {
    const current = { ...character(), name: '已變更', cantrips: [a, custom] };
    const result = applySpellSelection(current, 'cantrips', [a], [a, b]);
    expect(result.cantrips).toEqual([a, custom, b]);
    expect(result.name).toBe('已變更');
    expect(result.spellSlots).toEqual(current.spellSlots);
    expect(result.cantrips[0]).toBe(a);
  });
  it('移除專注法術清除專注，不移除其他法術', () => {
    const current = { ...character(), cantrips: [a, custom], concentrationSpell: a.name };
    const result = applySpellSelection(current, 'cantrips', [a], []);
    expect(result.cantrips).toEqual([custom]);
    expect(result.concentrationSpell).toBeNull();
  });
  it('並行加入不重複，沒有變更不復原別處的刪除', () => {
    const current = { ...character(), cantrips: [b] };
    expect(applySpellSelection(current, 'cantrips', [], [b]).cantrips).toEqual([b]);
    expect(applySpellSelection(current, 'cantrips', [a], [a]).cantrips).toEqual([b]);
  });
});

it('成長授予法術不可從一般面板移除',()=>{
 const managed={...a,progressionSource:'cantrips'};const c={...character(),cantrips:[managed]};
 expect(applySpellSelection(c,'cantrips',[managed],[]).cantrips).toEqual([managed]);
});
it('法術書與已備法術分開，刪除抄錄不清除正在專注的同名法術',()=>{
 const c={...character(),spellbook:[a],spells:[a],concentrationSpell:a.name};
 const result=applySpellSelection(c,'spellbook',[a],[]);
 expect(result.spellbook).toEqual([]);expect(result.spells).toEqual([a]);expect(result.concentrationSpell).toBe(a.name);
 expect(applySpellSelection(c,'spellbook',[a],[a,b]).spellbook?.[1].prepared).toBe(false);
});
