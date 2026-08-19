import { describe, expect, it } from 'vitest';

import { BACKGROUNDS, CLASSES, SPECIES } from './data';
import {
  POINT_BUY_BUDGET,
  STANDARD_ARRAY,
  autofillBonus,
  buildCharacter,
  bonusMap,
  level1MaxHp,
  level1UnarmoredAc,
  pointsSpent,
  recommendArray,
  skillTakenBy,
} from './build';

const species = (cn: string) => SPECIES.find((s) => s.cn === cn)!;
const cls = (cn: string) => CLASSES.find((c) => c.cn === cn)!;
const bg = (cn: string) => BACKGROUNDS.find((b) => b.cn === cn)!;

describe('配點規則', () => {
  it('購點：標準陣列的分配剛好用不完 27 點', () => {
    // 15/14/13/12/10/8 = 9+7+5+4+2+0 = 27
    const base = { STR: 8, DEX: 15, CON: 14, INT: 13, WIS: 12, CHA: 10 };
    expect(pointsSpent(base)).toBe(27);
    expect(POINT_BUY_BUDGET - pointsSpent(base)).toBe(0);
  });

  it('購點成本非線性——14→15 要 2 點，8→9 只要 1 點', () => {
    expect(pointsSpent({ A: 15 }) - pointsSpent({ A: 14 })).toBe(2);
    expect(pointsSpent({ A: 9 }) - pointsSpent({ A: 8 })).toBe(1);
  });

  it('背景加值：2/1 指派與 1/1/1 全給', () => {
    const b = bg('罪犯');
    const two = bonusMap(b, '2/1', b.abilities[0], b.abilities[1]);
    expect(two[b.abilities[0]]).toBe(2);
    expect(two[b.abilities[1]]).toBe(1);

    const each = bonusMap(b, '1/1/1');
    expect(b.abilities.every((a) => each[a] === 1)).toBe(true);
  });
});

describe('建議配點', () => {
  it('+2 落在職業主屬性——法師配賢者是智力', () => {
    const r = autofillBonus(cls('法師'), bg('賢者'));
    expect(cls('法師').primaryAbilities).toContain(r.plus2);
    expect(r.plus2).toBe('INT');
    expect(r.mode).toBe('2/1');
  });

  it('+1 優先給體質', () => {
    const b = bg('賢者');
    if (b.abilities.includes('CON')) {
      expect(autofillBonus(cls('法師'), b).plus1).toBe('CON');
    }
    // 候選裡沒有體質時退而求其次，但一定不會與 +2 同一項。
    const r = autofillBonus(cls('法師'), b);
    expect(r.plus1).not.toBe(r.plus2);
  });

  it('主屬性不在背景候選裡時退回候選第一項，不會給出空值', () => {
    for (const c of CLASSES) {
      for (const b of BACKGROUNDS) {
        const r = autofillBonus(c, b);
        expect(b.abilities).toContain(r.plus2);
        expect(r.plus2).toBeTruthy();
        expect(r.plus1).toBeTruthy();
      }
    }
  });

  it('套用建議：六項剛好用掉標準陣列的六個值', () => {
    const r = recommendArray(cls('法師'));
    expect(Object.values(r).sort((a, b) => b - a)).toEqual(
      [...STANDARD_ARRAY].sort((a, b) => b - a),
    );
  });

  it('最高的 15 給主屬性，體質與敏捷排在其後', () => {
    const r = recommendArray(cls('法師'));
    expect(r.INT).toBe(15);
    expect(r.CON).toBe(14);
    expect(r.DEX).toBe(13);
  });

  it('每個職業都排得出完整六項', () => {
    for (const c of CLASSES) {
      const r = recommendArray(c);
      expect(Object.keys(r)).toHaveLength(6);
      expect(r[c.primaryAbilities[0]]).toBe(15);
    }
  });
});

describe('1 級推導', () => {
  it('矮人的每級額外 HP 計入（堅毅）', () => {
    expect(level1MaxHp(cls('牧師'), species('矮人'), 2)).toBe(8 + 2 + 1);
    expect(level1MaxHp(cls('牧師'), species('人類'), 2)).toBe(8 + 2);
  });

  it('無甲防禦取較高者：野蠻人用體質、武僧用感知', () => {
    const mods = { STR: 0, DEX: 2, CON: 3, INT: 0, WIS: 4, CHA: 0 };
    expect(level1UnarmoredAc(cls('戰士'), mods)).toBe(12);
    expect(level1UnarmoredAc(cls('野蠻人'), mods)).toBe(15);
    expect(level1UnarmoredAc(cls('武僧'), mods)).toBe(16);
  });

  it('無甲防禦不會比一般無甲低（負調整值時取較高）', () => {
    const mods = { STR: 0, DEX: 3, CON: -1, INT: 0, WIS: 0, CHA: 0 };
    expect(level1UnarmoredAc(cls('野蠻人'), mods)).toBe(13);
  });
});

describe('組裝角色', () => {
  const input = {
    name: '測試者',
    species: species('矮人'),
    cls: cls('牧師'),
    background: bg('侍僧'),
    base: { STR: 12, DEX: 10, CON: 14, INT: 12, WIS: 15, CHA: 8 },
    bonusMode: '2/1' as const,
    plus2: 'WIS',
    plus1: 'INT',
    // 宗教由侍僧背景固定給予，建角時禁選——這裡選另外兩個。
    classSkills: ['醫藥', '歷史'],
    speciesSkills: [],
  };

  it('推導值互相一致', () => {
    const c = buildCharacter(input, 'x');
    expect(c.abilityScores.wis.score).toBe(17); // 15 + 2
    expect(c.abilityScores.wis.modifier).toBe(3);
    expect(c.maxHp).toBe(11); // d8 + 體質 2 + 矮人 1
    expect(c.currentHp).toBe(c.maxHp);
    expect(c.spellDc).toBe(13); // 8 + 熟練 2 + 感知 3
    expect(c.spellAttack).toBe(5);
    expect(c.spellSlots).toEqual([{ level: 1, total: 2, used: 0 }]);
  });

  it('熟練技能＝職業選的 ∪ 種族選的 ∪ 背景固定的', () => {
    const c = buildCharacter(input, 'x');
    const prof = c.skills.filter((s) => s.proficient).map((s) => s.name).sort();
    expect(prof).toEqual([...input.classSkills, ...bg('侍僧').skills].sort());
  });

  it('重複來源仍只算一次（實作用 Set 去重）', () => {
    const c = buildCharacter(
      { ...input, classSkills: ['醫藥', '宗教'] },
      'x',
    );
    expect(c.skills.filter((s) => s.proficient)).toHaveLength(3);
  });

  it('豁免熟練來自職業', () => {
    const c = buildCharacter(input, 'x');
    expect(c.abilityScores.wis.proficientSave).toBe(true);
    expect(c.abilityScores.str.proficientSave).toBe(false);
  });

  it('背景給的工具熟練寫入角色', () => {
    const c = buildCharacter(input, 'x');
    expect(c.toolProficiencies).toEqual([bg('侍僧').toolProficiency]);
  });

  it('非施法職業不建法術位、DC 為 0', () => {
    const c = buildCharacter(
      { ...input, cls: cls('戰士'), classSkills: ['運動', '求生'] },
      'x',
    );
    expect(c.spellSlots).toEqual([]);
    expect(c.spellDc).toBe(0);
    expect(c.resources.some((r) => r.name === '第二風')).toBe(true);
  });

  it('分數上限 20——高基礎值加背景加值不會溢出', () => {
    const c = buildCharacter(
      { ...input, base: { ...input.base, WIS: 19 } },
      'x',
    );
    expect(c.abilityScores.wis.score).toBe(20);
  });
});

describe('技能重複來源的禁選', () => {
  const b = bg('侍僧'); // 固定給 洞察、宗教

  it('背景已給的技能不可再由職業選', () => {
    expect(skillTakenBy('宗教', b, [], [], 'class')).toBe('背景已有');
  });

  it('種族已選的不可再由職業選，反之亦然', () => {
    expect(skillTakenBy('隱匿', b, [], ['隱匿'], 'class')).toBe('種族已選');
    expect(skillTakenBy('隱匿', b, ['隱匿'], [], 'species')).toBe('職業已選');
  });

  it('未被占用時可選', () => {
    expect(skillTakenBy('醫藥', b, [], [], 'class')).toBeNull();
  });
});

describe('自創來源標示', () => {
  const input = {
    name: '測試者',
    species: species('矮人'),
    cls: cls('牧師'),
    background: bg('侍僧'),
    base: { STR: 12, DEX: 10, CON: 14, INT: 12, WIS: 15, CHA: 8 },
    bonusMode: '2/1' as const,
    plus2: 'WIS',
    plus1: 'INT',
    classSkills: ['醫藥', '歷史'],
    speciesSkills: [],
  };

  it('SRD 背景不標示為自訂', () => {
    const c = buildCharacter(input, 'x');
    expect(c.backgroundIsCustom).toBe(false);
    expect(c.features.every((f) => !f.isCustom)).toBe(true);
  });

  it('自訂背景標示於角色，其 SRD 起源專長不標示', () => {
    // 自訂背景可以選 SRD 的起源專長——那個專長仍是 SRD 的，只有背景是自創的。
    const custom = { ...bg('侍僧'), cn: '我的背景', isCustom: true };
    const c = buildCharacter({ ...input, background: custom }, 'x');
    expect(c.backgroundIsCustom).toBe(true);
    const feat = c.features.find((f) => f.source.startsWith('背景：'))!;
    expect(feat.isCustom).toBe(false);
  });

  it('自訂起源專長標示於特性', () => {
    const custom = {
      ...bg('侍僧'),
      cn: '我的背景',
      isCustom: true,
      originFeat: '我發明的專長',
      originFeatCustom: true,
    };
    const c = buildCharacter({ ...input, background: custom }, 'x');
    const feat = c.features.find((f) => f.name === '我發明的專長')!;
    expect(feat.isCustom).toBe(true);
  });

  it('來源字串不再承載自訂語意——不含「・自訂」後綴', () => {
    const custom = {
      ...bg('侍僧'),
      cn: '我的背景',
      isCustom: true,
      originFeatCustom: true,
    };
    const c = buildCharacter({ ...input, background: custom }, 'x');
    expect(c.features.every((f) => !f.source.includes('自訂'))).toBe(true);
  });
});
