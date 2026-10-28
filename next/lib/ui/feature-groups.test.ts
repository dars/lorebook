import { expect, it } from 'vitest';
import { CharacterFeature } from '@/lib/domain/character';
import { groupFeatures } from './feature-groups';
const f = (source: string, name = '能力', nameEn = '') => CharacterFeature.parse({ source, name, nameEn });
it('依來源分組與等級穩定排序，不修改原資料', () => {
  const input = [f('種族：矮人'), f('職業：牧師 Lv5'), f('職業：牧師 Lv2'), f('子職：光明領域'), f('背景：侍僧'), f('專長：Lv4')];
  const groups = groupFeatures(input);
  expect(groups.map(g => g.title)).toEqual(['職業能力', '子職能力', '種族特性', '專長']);
  expect(groups[0].features.map(x => x.level)).toEqual([2, 5]);
  expect(groups[3].features).toHaveLength(2);
  expect(input[1].source).toBe('職業：牧師 Lv5');
});
it('成長紀錄保留，真正的屬性提升專長不誤歸類', () => {
  const groups = groupFeatures([f('職業：牧師 Lv3', '牧師子職業', 'Cleric Subclass'), f('職業：牧師 Lv4', '屬性值提升', 'Ability Score Improvement'), f('專長：Lv4', '屬性提升', 'Ability Score Improvement')]);
  expect(groups.map(g => g.title)).toEqual(['專長', '成長紀錄']);
  expect(groups[1].features).toHaveLength(2);
});
it('未知來源、無來源、重複名稱全部保留', () => {
  const input = [f('DM 獎勵'), f(''), f('物種: 精靈'), f('職業：戰士 Lv2'), f('職業：牧師 Lv2')];
  const groups = groupFeatures(input);
  expect(groups.flatMap(g => g.features)).toHaveLength(input.length);
  expect(groups.filter(g => g.title === '職業能力')).toHaveLength(2);
  expect(groups.at(-1)?.features[0].feature.source).toBe('DM 獎勵');
});
it('空資料回傳空群組', () => expect(groupFeatures([])).toEqual([]));
