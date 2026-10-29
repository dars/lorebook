import type { Character } from '@/lib/domain/character';

/** 舊版 filter 解析已把查詢條件存成文字；只修已知 SRD 專長的確切壞字串。 */
export function repairFeatDescriptions(c: Character): Character {
  return { ...c, features: c.features.map(f => {
    if (f.isCustom) return f;
    let description = f.description;
    if (f.nameEn === 'Skilled' || ['技藝精湛', '熟練'].includes(f.name))
      description = description.replaceAll("type=tool;artisan's tools;instrument;gaming set", '工具');
    if (f.nameEn === 'Magic Initiate' || f.name === '法術新手')
      description = description.replaceAll('level=0;1、level=0;1或level=0;1', '牧師、德魯伊或法師');
    return description === f.description ? f : { ...f, description };
  }) };
}
