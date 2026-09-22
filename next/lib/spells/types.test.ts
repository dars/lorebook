import { describe, expect, it } from 'vitest';
import { Character, Spell } from '@/lib/domain/character';
import { parseHomebrew } from '@/lib/homebrew/types';
import { collectRow } from '@/lib/homebrew/collect';
import { knowsMageArmor } from '@/lib/rules/ac';
import { CustomSpell, addCustomSpell, removeCustomSpell, spellFromCustom } from './types';

const spell = CustomSpell.parse({ id: 'spell-1', name: '星焰', level: 1, description: '<script>alert(1)</script> {@dice 1d6}', castKind: 'bonus', concentration: true, duration: '1 分鐘', components: 'V, S', upgrade: '每環 +1d6' });
const character = () => Character.parse({ id: 'hero', name: '冒險者', abilityScores: Object.fromEntries(['str','dex','con','int_','wis','cha'].map(key => [key,{score:10,modifier:0}])) });

describe('自創法術', () => {
  it('限制環數、空白必填欄位與過長說明', () => {
    for (const change of [{level:-1},{level:10},{level:1.5},{name:' '},{description:''},{description:'x'.repeat(20001)}]) {
      expect(CustomSpell.safeParse({...spell,...change}).success).toBe(false);
    }
  });
  it('快照保留施法分類、專注、升環與原始文字', () => {
    const snapshot = spellFromCustom(spell);
    expect(snapshot).toMatchObject({homebrewId:spell.id,castKind:'bonus',concentration:true,upgrade:spell.upgrade});
    expect(snapshot.description).toContain(spell.description);
    expect(snapshot.description).toContain('1 分鐘');
    expect(snapshot.description).toContain('V, S');
    expect(Spell.parse(snapshot)).toEqual(snapshot);
  });
  it('戲法、環級法術分流且不改變法術位', () => {
    const c = addCustomSpell(addCustomSpell(character(),spell), {...spell,id:'cantrip',level:0});
    expect(c.spells).toHaveLength(1); expect(c.cantrips).toHaveLength(1);
    expect(c.spellSlots).toEqual(character().spellSlots);
  });
  it('以 ID 去重，同名不同法術可以並存；再次選用不覆寫角色版本', () => {
    const c = addCustomSpell(character(),spell);
    expect(addCustomSpell(c,{...spell,description:'新版'})).toBe(c);
    expect(addCustomSpell(c,{...spell,id:'different'}).spells).toHaveLength(2);
    expect(c.spells[0].description).toContain(spell.description);
  });
  it('刪除角色法術清理專注、不改動收藏與其他法術', () => {
    const c = addCustomSpell(character(),spell);
    const result = removeCustomSpell({...c,concentrationSpell:spell.name},spell.id);
    expect(result.spells).toEqual([]); expect(result.concentrationSpell).toBeNull();
    expect(c.spells).toHaveLength(1);
  });
  it('分享收藏重新產生 ID 後仍可解析與編輯', () => {
    const content = parseHomebrew('spell',spell)!;
    const row = collectRow(content,{id:'Ab_cd-Ef123456789',userId:'owner',token:'token',sourceUpdatedAt:null});
    expect(parseHomebrew('spell',row.data)?.data.id).toBe('Ab_cd-Ef123456789');
    expect(row.source_token).toBe('token');
  });
  it('同名自創法術不會啟用官方法師護甲規則', () => {
    expect(knowsMageArmor(addCustomSpell(character(),{...spell,nameEn:'Mage Armor'}))).toBe(false);
  });
});
