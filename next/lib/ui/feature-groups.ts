import type { CharacterFeature } from '@/lib/domain/character';

const titles = ['職業能力', '子職能力', '種族特性', '專長', '成長紀錄', '其他特性'];
export type FeatureGroup = { key: string; title: string; source: string; features: { feature: CharacterFeature; index: number; level: number | null }[] };

/** 舊角色只有來源敘述，無法辨識時保留原文；不猜測或丟棄玩家自填內容。 */
export function groupFeatures(features: CharacterFeature[]): FeatureGroup[] {
  const groups = new Map<string, FeatureGroup & { order: number }>();
  features.forEach((feature, index) => {
    const match = feature.source.match(/^(職業|子職業|子職|種族|物種|背景|專長)[：:]\s*(.*)$/);
    const kind = match?.[1];
    const levelMatch = feature.source.match(/\bLv\s*(\d+)\b/i);
    const level = levelMatch ? Number(levelMatch[1]) : null;
    const source = match ? match[2].replace(/\s*\bLv\s*\d+\b/ig, '').trim() : feature.source;
    const milestone = kind === '職業' && (/\bSubclass$/.test(feature.nameEn) || ['Ability Score Improvement', 'Epic Boon'].includes(feature.nameEn));
    const order = milestone ? 4 : kind === '職業' ? 0 : kind === '子職' || kind === '子職業' ? 1 : kind === '種族' || kind === '物種' ? 2 : kind === '背景' || kind === '專長' ? 3 : 5;
    // 專長集中呈現，但保留每項的背景／升級來源，避免誤以為全部來自同一背景。
    const groupSource = order === 3 || order === 5 ? '' : source;
    const key = `${order}:${groupSource}`;
    if (!groups.has(key)) groups.set(key, { key, title: titles[order], source: groupSource, order, features: [] });
    groups.get(key)!.features.push({ feature, index, level });
  });
  return [...groups.values()].sort((a, b) => a.order - b.order).map(group => ({ ...group,
    features: [...group.features].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.index - b.index),
  }));
}
