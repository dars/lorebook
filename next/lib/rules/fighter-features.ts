import type { Character, CharacterFeature } from '@/lib/domain/character';

/** SRD 5.2.1 p48；能力說明與行動頁共用，避免只有資源計數而找不到用途。 */
export const SECOND_WIND = {
  name: '第二風', nameEn: 'Second Wind', source: '職業：戰士 Lv1', isCustom: false,
  description: '以附贈動作恢復 1d10＋戰士等級的生命值。短休恢復 1 次使用次數，長休恢復全部。5 級起，使用時還可移動至多半速，且不引發機會攻擊。',
} satisfies CharacterFeature;

export function backfillFighterFeatures(c: Character): Character {
  if (c.classNameEn !== 'Fighter' || c.features.some(f => f.nameEn === SECOND_WIND.nameEn || f.name === SECOND_WIND.name)) return c;
  return { ...c, features: [...c.features, { ...SECOND_WIND }] };
}

export function fighterActions(c: Character) {
  if (c.classNameEn !== 'Fighter') return [];
  const remaining = (en: string) => {
    const r = c.resources.find(r => r.nameEn === en);
    return r ? `剩餘 ${r.current}/${r.max} 次` : '次數見資源欄';
  };
  return [
    { ...SECOND_WIND, kind: 'bonus', value: `恢復 1d10＋${c.level} HP`, meta: remaining('Second Wind') },
    ...(c.level >= 2 ? [{ name: '動作如潮', nameEn: 'Action Surge', kind: 'free', value: '額外 1 個動作', meta: remaining('Action Surge'), description: '在自己的回合使用，不耗動作或附贈動作。獲得一個額外動作，但不能用於魔法動作。每回合限一次，短休或長休恢復全部次數。使用後請於資源欄扣除次數。' }] : []),
  ];
}
