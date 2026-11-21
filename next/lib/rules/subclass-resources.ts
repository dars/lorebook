import type { Character, ClassResource } from '@/lib/domain/character';

/** 只讀角色快照；重載不回滿，來源內容的刪改也不會改動已取得的能力。 */
export function syncSubclassResources(c: Character): Character {
  const subclass = c.customSubclass;
  if (!subclass) return c;

  const resources = [...c.resources];
  subclass.features.forEach((feature, index) => {
    if (feature.level > c.level || !feature.limitedUse || !feature.name.trim()) return;
    const key = `${subclass.id}/${index}`;
    const existing = resources.findIndex((r) => r.subclassFeatureKey === key);
    const old = existing < 0 ? undefined : resources[existing];
    const { uses, recovery } = feature.limitedUse;
    const max = uses === 'proficiency' ? c.proficiencyBonus : uses;
    const resource: ClassResource = {
      name: feature.name,
      nameEn: '',
      subclassFeatureKey: key,
      max,
      current: old ? Math.min(max, Math.max(0, old.current + max - old.max)) : max,
      recovery,
      display: 'pips',
      dieFaces: 0,
      unit: '',
      ...(uses === 'proficiency' ? { scaling: 'proficiency' } : {}),
    };
    if (existing < 0) resources.push(resource);
    else resources[existing] = resource;
  });
  return { ...c, resources };
}
