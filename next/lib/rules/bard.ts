import type { Character, ClassResource } from '../domain/character';
import { deriveClassResources } from './class-resources';

export const isLoreBard = (c: Character) => c.classNameEn === 'Bard' && !c.customSubclass && (c.subclassEn === 'College of Lore' || ['學識學院', '逸聞學院'].includes(c.subclass));
export const hasFate = (c: Character) => c.features.some(f => !f.isCustom && f.nameEn === 'Boon of Fate');
export const inspirationDie = (c: Character) => c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6;
export const inspirationResource = (c: Character) => c.resources.find(r => r.nameEn === 'Bardic Inspiration' || ['吟遊激勵', '詩人激勵'].includes(r.name));

/** 補上既有角色的操作資源，保留已花用次數。命運恩惠按實際專長判定，不依職業或等級猜測。 */
export function backfillBard(c: Character): Character {
  let result = c;
  if (c.classNameEn === 'Bard') {
    const resource = deriveClassResources('Bard', c.level, c.abilityScores)[0];
    const old = inspirationResource(c);
    const resources = old ? c.resources.map(r => r === old ? { ...r, nameEn: resource.nameEn, dieFaces: resource.dieFaces, recovery: resource.recovery } : r) : [...c.resources, resource];
    result = { ...c, resources, ...(isLoreBard(c) ? { subclass: '學識學院', subclassEn: 'College of Lore', features: c.features.map(f => !f.isCustom ? { ...f, source: f.source.replaceAll('逸聞學院', '學識學院') } : f) } : {}) };
  }
  if (hasFate(result) && !result.resources.some(r => r.nameEn === 'Boon of Fate')) {
    const resource: ClassResource = { name: '命運恩惠', nameEn: 'Boon of Fate', max: 1, current: 1, recovery: 'short', display: 'pips', dieFaces: 0, unit: '次' };
    result = { ...result, resources: [...result.resources, resource] };
  }
  return result;
}

export type BardPower = { id: string; name: string; kind: 'bonus' | 'reaction' | 'free' | 'passive'; description: string; resource?: string };
export function bardPowers(c: Character): BardPower[] {
  const powers: BardPower[] = [];
  if (c.classNameEn === 'Bard') {
    const die = `1d${inspirationDie(c)}`;
    powers.push({ id: 'inspire', name: '詩人激勵', kind: 'bonus', resource: 'Bardic Inspiration', description: `給 60 呎內另一名能看見或聽見你的生物 ${die} 激勵骰。1 小時內一次 D20 檢定失敗後可加上擲骰結果；每個生物只能持有一顆。給予時消耗 1 次激勵。` });
    if (isLoreBard(c) && c.level >= 3) powers.push({ id: 'cutting', name: '削弱言語', kind: 'reaction', resource: 'Bardic Inspiration', description: `60 呎內可見生物作傷害擲骰，或屬性檢定／攻擊擲骰成功時，消耗 1 次激勵，擲 ${die} 並從其結果扣除。` });
    if (c.level >= 7) powers.push({ id: 'countercharm', name: '反迷惑', kind: 'reaction', description: '你或 30 呎內生物對造成魅惑或恐懼的效果豁免失敗時，使用反應使該豁免重擲，且新擲骰具有優勢。不消耗詩人激勵。' });
    if (c.level >= 5) powers.push({ id: 'font', name: '激勵泉源', kind: 'free', resource: 'Bardic Inspiration', description: '不耗動作，消耗任一環法術位，恢復 1 次已花用的詩人激勵。5 級起短休及長休皆恢復全部激勵。' });
    if (isLoreBard(c) && c.level >= 14) powers.push({ id: 'peerless', name: '無與倫比技能', kind: 'free', resource: 'Bardic Inspiration', description: `自己的屬性檢定或攻擊擲骰失敗時，可擲 ${die} 加入結果；若仍失敗，不消耗激勵。確認結果後再登記消耗。` });
    if (c.level >= 18) powers.push({ id: 'superior', name: '高等激勵', kind: 'free', resource: 'Bardic Inspiration', description: '擲先攻時，若激勵少於 2 次則恢復至 2 次；不會在原有次數上額外加 2。' });
    if (c.level >= 2) powers.push({ id: 'jack', name: '萬事通', kind: 'passive', description: `未熟練且未另加熟練加值的技能檢定，加 ${Math.floor(c.proficiencyBonus / 2)}（半數熟練加值，無條件捨去）。已計入技能欄；2024 規則不適用於先攻。先攻加值 ${c.initiative >= 0 ? '+' : ''}${c.initiative}。` });
  }
  if (hasFate(c)) powers.push({ id: 'fate', name: '命運恩惠', kind: 'free', resource: 'Boon of Fate', description: '自己或 60 呎內生物的 D20 檢定成功或失敗時，擲 2d4 加上或扣除其結果，不耗反應。擲先攻、短休或長休後恢復。' });
  return powers;
}

/** 擲先攻事件同時恢復所有對應資源，避免兩個入口的結果不同。 */
export function bardInitiative(c: Character): Character {
  return { ...c, resources: c.resources.map(r => {
    if (hasFate(c) && r.nameEn === 'Boon of Fate') return { ...r, current: r.max };
    if (c.classNameEn === 'Bard' && c.level >= 18 && r === inspirationResource(c)) return { ...r, current: Math.min(r.max, Math.max(r.current, 2)) };
    return r;
  }) };
}

export function spendBardPower(c: Character, id: string, slotLevel?: number): Character {
  const power = bardPowers(c).find(p => p.id === id);
  if (!power || !power.resource) throw Error('目前沒有此能力或此能力不消耗資源。');
  if (id === 'superior') return bardInitiative(c);
  const r = power.resource === 'Bardic Inspiration' ? inspirationResource(c) : c.resources.find(r => r.nameEn === power.resource);
  if (!r) throw Error('找不到能力資源，請重新載入角色。');
  if (id === 'font') {
    const slot = c.spellSlots.find(s => s.level === slotLevel && s.level >= 1 && s.used < s.total);
    if (r.current >= r.max || !slot) throw Error('需要已花用的激勵次數及可用法術位。');
    return { ...c, resources: c.resources.map(x => x === r ? { ...x, current: x.current + 1 } : x), spellSlots: c.spellSlots.map(s => s === slot ? { ...s, used: s.used + 1 } : s) };
  }
  if (r.current < 1) throw Error('剩餘次數不足。');
  return { ...c, resources: c.resources.map(x => x === r ? { ...x, current: x.current - 1 } : x) };
}
