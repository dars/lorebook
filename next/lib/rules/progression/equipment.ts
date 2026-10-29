import { Equipment, type Character } from '@/lib/domain/character';
import type { CatalogItem } from '@/lib/catalog/types';
import { toEquipment } from '@/lib/items/from-catalog';
import { sameSpellName } from './granted-spells';
import { INSTRUMENTS, TOOLS } from './options';
type Kit = {
    gold: number;
    items: [
        string,
        number
    ][];
};
const kit = (gold: number, ...items: (string | [
    string,
    number
])[]): Kit => ({ gold, items: items.map(v => typeof v === 'string' ? [v, 1] : v) });
/** SRD 各職業 Core Traits；金幣與整套裝備二選一，戰士有兩套裝備。 */
export const STARTING: Record<string, Kit[]> = {
    Barbarian: [kit(15, 'Greataxe', ['Handaxe', 4], "Explorer's Pack"), kit(75)],
    Bard: [kit(19, 'Leather Armor', ['Dagger', 2], "Entertainer's Pack"), kit(90)],
    Cleric: [kit(7, 'Chain Shirt', 'Shield', 'Mace', "Priest's Pack"), kit(110)],
    Druid: [kit(9, 'Leather Armor', 'Shield', 'Sickle', 'Quarterstaff', "Explorer's Pack", 'Herbalism Kit'), kit(50)],
    Fighter: [kit(4, 'Chain Mail', 'Greatsword', 'Flail', ['Javelin', 8], "Dungeoneer's Pack"), kit(11, 'Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', ['Arrow', 20], 'Quiver', "Dungeoneer's Pack"), kit(155)],
    Monk: [kit(11, 'Spear', ['Dagger', 5], "Explorer's Pack"), kit(50)],
    Paladin: [kit(9, 'Chain Mail', 'Shield', 'Longsword', ['Javelin', 6], "Priest's Pack"), kit(150)],
    Ranger: [kit(7, 'Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', ['Arrow', 20], 'Quiver', 'Sprig of Mistletoe', "Explorer's Pack"), kit(150)],
    Rogue: [kit(8, 'Leather Armor', ['Dagger', 2], 'Shortsword', 'Shortbow', ['Arrow', 20], 'Quiver', "Thieves' Tools", "Burglar's Pack"), kit(100)],
    Sorcerer: [kit(28, 'Spear', ['Dagger', 2], 'Crystal', "Dungeoneer's Pack"), kit(50)],
    Warlock: [kit(15, 'Leather Armor', 'Sickle', ['Dagger', 2], 'Orb', 'Book', "Scholar's Pack"), kit(100)],
    Wizard: [kit(5, ['Dagger', 2], 'Quarterstaff', 'Robe', 'Spellbook', "Scholar's Pack"), kit(55)],
};
export function startingOptions(cls: string, items: CatalogItem[]) {
    return (STARTING[cls] ?? []).map((k, i) => ({ id: String(i), name: k.items.length ? `裝備組合 ${String.fromCharCode(65 + i)}` : '領取購裝金幣', detail: [...k.items.map(([name, n]) => `${items.find(x => sameSpellName(x.eng_name ?? '', name))?.name ?? name}${n > 1 ? ` ×${n}` : ''}`),].join('、'), priceCp: k.gold * 100 }));
}
export function applyStartingEquipment(c: Character, s: Record<string, string[]>, items: CatalogItem[]): Character {
    if (c.progression?.selections.equipment?.length || !s.equipment?.length || s.equipment[0] === 'already')
        return c;
    const k = STARTING[c.classNameEn]?.[Number(s.equipment[0])];
    if (!k)
        return c;
    const list = [...k.items];
    if (k.items.length) {
        const instrument = s['equipment-instrument']?.[0];
        if (instrument)
            list.push([INSTRUMENTS.find(o => o.id === instrument)?.id ?? instrument, 1]);
        const symbol = s['holy-symbol']?.[0];
        if (symbol)
            list.push([symbol, 1]);
        if (c.classNameEn === 'Monk' && s['monk-tool']?.[0])
            list.push([TOOLS.find(o => o.id === s['monk-tool'][0])?.id ?? s['monk-tool'][0], 1]);
    }
    const equipment = [...c.equipment];
    for (const [name, quantity] of list) {
        const item = items.find(x => sameSpellName(x.eng_name ?? '', name));
        if (!item && name === 'Spellbook') {
            equipment.push(Equipment.parse({ name: '法術書', nameEn: 'Spellbook', source: 'catalog', description: '記錄法師已學會法術的書。法術內容於法術書區塊管理。' }));
            continue;
        }
        if (!item)
            throw Error(`起始裝備「${name}」目前無法從內容庫取得，請稍後重試。`);
        equipment.push({ ...toEquipment(item), quantity, priceCp: 0 });
    }
    return { ...c, equipment, currency: { ...c.currency, gp: c.currency.gp + k.gold } };
}
export function startingEquipmentIssue(c: Character, s: Record<string, string[]>, items: CatalogItem[]): string | null {
    try {
        applyStartingEquipment(c, s, items);
        return null;
    }
    catch (e) {
        return e instanceof Error ? e.message : '起始裝備內容庫暫時無法使用。';
    }
}
