import { beforeEach, describe, expect, it } from 'vitest';

import { Character, parseCharacter } from '@/lib/domain/character';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';
import { CustomSubclass, featureLevelsFor } from '@/lib/subclasses/types';
import { CLASSES } from '@/lib/creation/data';
import { applyLevelUp, applySubclassPick, planFor } from './level-up';
import { applyChoices } from './progression/engine';

const subclass = CustomSubclass.parse({
  id: 'flame', name: '烈焰學派', classEn: 'Wizard', levels: [3, 6, 10, 14],
  features: [
    { level: 3, name: '烈焰護盾', limitedUse: { uses: 'proficiency', recovery: 'long' } },
    { level: 3, name: '烈焰爆發', limitedUse: { uses: 2, recovery: 'short' } },
    { level: 6, name: '火焰之翼', limitedUse: { uses: 1, recovery: 'long' } },
    { level: 10, name: '純文字特性' },
  ],
});

const make = (level = 3) => Character.parse({
  id: 'c1', name: '測試', className: '法師', classNameEn: 'Wizard', level,
  proficiencyBonus: level >= 5 ? 3 : 2,
  abilityScores: Object.fromEntries(
    ['str', 'dex', 'con', 'int_', 'wis', 'cha'].map((k) => [k, { score: 10, modifier: 0 }]),
  ),
});
const pick = (level = 3) => applySubclassPick(make(level), {
  subclass: subclass.name, customSubclass: structuredClone(subclass),
});
const customResources = (c: Character) => c.resources.filter((r) => r.subclassFeatureKey);
const spent = (c: Character): Character => ({
  ...c, resources: c.resources.map((r) => ({ ...r, current: 0 })),
});

describe('自訂子職有限次數能力', () => {
  beforeEach(() => useCharacterStore.getState().clear());

  it('3 級選取時只取得已達等級的資源，並保存完整未來設定', () => {
    const two = make(2);
    const three = applyLevelUp(two, planFor(two, 0), {
      subclass: subclass.name, customSubclass: subclass,
    });
    expect(customResources(three).map((r) => [r.name, r.max, r.recovery])).toEqual([
      ['烈焰護盾', 2, 'long'], ['烈焰爆發', 2, 'short'],
    ]);
    expect(three.customSubclass?.features[2].limitedUse).toEqual({ uses: 1, recovery: 'long' });
  });

  it('高等級補選一次補齊資源，不變更等級或 HP', () => {
    const c = pick(10);
    expect(customResources(c)).toHaveLength(3);
    expect(c.level).toBe(10);
    expect(c.maxHp).toBe(make(10).maxHp);
    expect(customResources(c).find((r) => r.name === '烈焰護盾')?.max).toBe(3);
  });

  it('序列化與重載保留設定、已消耗次數，不重複產生資源', () => {
    const c = spent(pick());
    const reloaded = parseCharacter(JSON.parse(JSON.stringify(c)));
    expect(reloaded.customSubclass).toEqual(c.customSubclass);
    expect(customResources(reloaded)).toEqual(customResources(c));
    expect(customResources(parseCharacter(reloaded))).toEqual(customResources(c));
  });

  it('熟練加值成長只入帳差額，固定次數不變；未來能力於達級取得', () => {
    const four = spent(pick(4));
    const five = applyLevelUp(four, planFor(four, 0), {});
    expect(customResources(five).map((r) => [r.max, r.current])).toEqual([[3, 1], [2, 0]]);
    const six = applyLevelUp(five, planFor(five, 0), {});
    expect(customResources(six).map((r) => [r.name, r.current])).toEqual([
      ['烈焰護盾', 1], ['烈焰爆發', 0], ['火焰之翼', 1],
    ]);
    expect(customResources(parseCharacter(six))).toEqual(customResources(six));
  });

  it('短休只回復短休能力，長休回復兩者', () => {
    useCharacterStore.getState().load(spent(pick()));
    characterActions.shortRest();
    expect(customResources(useCharacterStore.getState().character!).map((r) => r.current)).toEqual([0, 2]);
    characterActions.longRest();
    expect(customResources(useCharacterStore.getState().character!).map((r) => r.current)).toEqual([2, 2]);
  });

  it.each([
    ['Barbarian', '狂暴'],
    ['Druid', '荒野變身'],
    ['Cleric', '引導神力'],
    ['Paladin', '引導神力'],
  ])('%s 的同名子職能力「%s」不套用職業的特殊短休回復', (classNameEn, name) => {
    const c = applySubclassPick({ ...make(), classNameEn }, {
      subclass: subclass.name,
      customSubclass: {
        ...subclass, classEn: classNameEn,
        features: [{ level: 3, name, description: '', limitedUse: { uses: 2, recovery: 'long' } }],
      },
    });
    useCharacterStore.getState().load(spent(c));
    characterActions.shortRest();
    expect(customResources(useCharacterStore.getState().character!)[0].current).toBe(0);
    characterActions.longRest();
    expect(customResources(useCharacterStore.getState().character!)[0].current).toBe(2);
  });

  it('同名的種族／職業與子職特性分別扣次數', () => {
    const c = pick();
    const resource = customResources(c)[0];
    c.resources.push({ ...resource, subclassFeatureKey: undefined });
    c.resources.push({ ...resource, subclassFeatureKey: 'flame/other' });
    useCharacterStore.getState().load(c);
    characterActions.adjustResource(resource.name, -1, resource.subclassFeatureKey);
    const counts = () => useCharacterStore.getState().character!.resources
      .filter((r) => r.name === resource.name).map((r) => r.current);
    expect(counts()).toEqual([1, 2, 2]);
    characterActions.adjustResource(resource.name, -1);
    expect(counts()).toEqual([1, 1, 2]);
  });

  it('舊子職沒有設定次數時不產生額外資源', () => {
    const c = parseCharacter({ ...make(), customSubclass: {
      ...subclass, features: [{ level: 3, name: '舊特性' }],
    } });
    expect(customResources(c)).toEqual([]);
  });
});

describe('12 職業帶自訂子職逐級 1→20：有限次數資源', () => {
  beforeEach(() => useCharacterStore.getState().clear());

  it.each(CLASSES)('$cn 的取得等級、次數成長、消耗、休息與 JSON 往返', (cls) => {
    // 每個取得等級都放完整次數／回復組合，包含聖騎士的 20 級能力。
    const limitedUses = ([1, 2, 3, 'proficiency'] as const).flatMap((uses) =>
      (['short', 'long'] as const).map((recovery) => ({ uses, recovery })),
    );
    const definition = CustomSubclass.parse({
      id: `custom-${cls.en}`, name: '自訂測試子職', classEn: cls.en,
      levels: featureLevelsFor(cls.en),
      features: featureLevelsFor(cls.en).flatMap((level) => [
        ...limitedUses.map((limitedUse) => ({
          level, name: `${level} 級 ${limitedUse.uses} 次 ${limitedUse.recovery}`,
          limitedUse,
        })),
        { level, name: `${level} 級純文字特性` },
      ]),
    });
    let c = parseCharacter({
      ...make(1), className: cls.cn, classNameEn: cls.en,
      hitDieFaces: cls.hitDie, spellcastingAbility: cls.spellAbility,
    });
    expect(customResources(c)).toEqual([]);

    for (let level = 2; level <= 20; level++) {
      const before = new Map(customResources(c).map((r) => [r.subclassFeatureKey, r]));
      c = applyLevelUp(c, planFor(c, 0), level === 3 ? {
        subclass: definition.name, customSubclass: structuredClone(definition),
      } : {});

      // 實際升級流程還會套用成長選擇；此案例容許其餘選項稍後補齊，聚焦資源隔離。
      c = applyChoices(c, {}, { spells: [], items: [], feats: [] }, 'level', false);
      const expected = definition.features.flatMap((f, index) => {
        if (!f.limitedUse || f.level > level) return [];
        const key = `${definition.id}/${index}`;
        const max = f.limitedUse.uses === 'proficiency'
          ? 2 + Math.floor((level - 1) / 4) : f.limitedUse.uses;
        const old = before.get(key);
        return [{
          key, name: f.name, max,
          current: old ? old.current + max - old.max : max,
          recovery: f.limitedUse.recovery,
        }];
      });
      expect(customResources(c).map((r) => ({
        key: r.subclassFeatureKey, name: r.name, max: r.max,
        current: r.current, recovery: r.recovery,
      })), `${cls.en} Lv${level}`).toEqual(expected);

      const saved = customResources(c);
      c = parseCharacter(JSON.parse(JSON.stringify(c)));
      expect(customResources(c)).toEqual(saved);
      if (level >= 3) expect(c.customSubclass).toEqual(definition);

      useCharacterStore.getState().clear();
      useCharacterStore.getState().load(c);
      for (const r of customResources(c)) {
        characterActions.adjustResource(r.name, -r.max, r.subclassFeatureKey);
      }
      characterActions.shortRest();
      const afterShort = useCharacterStore.getState().character!;
      expect(customResources(afterShort).map((r) => r.current)).toEqual(
        expected.map((r) => r.recovery === 'short' ? r.max : 0),
      );
      characterActions.longRest();
      const afterLong = useCharacterStore.getState().character!;
      expect(customResources(afterLong).map((r) => r.current)).toEqual(expected.map((r) => r.max));

      // 下次升級前耗盡，才能抓到錯誤回滿或熟練加值差額重複入帳。
      c = spent(parseCharacter(JSON.parse(JSON.stringify(afterLong))));
      expect(customResources(parseCharacter(c))).toEqual(customResources(c));
    }
    expect(c.level).toBe(20);
  });
});
