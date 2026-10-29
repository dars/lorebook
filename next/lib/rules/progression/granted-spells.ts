import type { Character } from '@/lib/domain/character';
/** 固定授予與名額分開。SRD 5.2.1 pp. 35, 40, 46, 54–56, 58, 70, 72, 76。 */
const SUBCLASS: Record<string, Record<number, string[]>> = {
    Cleric: { 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] },
    Paladin: { 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] },
    Sorcerer: { 3: ['Alter Self', 'Chromatic Orb', 'Command', 'Dragon’s Breath'], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] },
    Warlock: { 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] },
};
const LAND: Record<string, Record<number, string[]>> = {
    Arid: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] },
    Polar: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] },
    Temperate: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] },
    Tropical: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] },
};
const normalize = (v: string) => v.replaceAll('’', "'").toLowerCase();
export const sameSpellName = (a: string, b: string) => normalize(a) === normalize(b);
export function automaticSpellNames(c: Character, s: Record<string, string[]>): string[] {
    const out: string[] = [];
    const take = (table: Record<number, string[]> | undefined) => { for (const [l, names] of Object.entries(table ?? {}))
        if (c.level >= Number(l))
            out.push(...names); };
    const aliases: Record<string, string[]> = { Cleric: ['Life Domain'], Paladin: ['Oath of Devotion'], Sorcerer: ['Draconic Sorcery', 'Draconic Bloodline'], Warlock: ['Fiend Patron', 'The Fiend'], Druid: ['Circle of the Land'] };
    if (!c.customSubclass && (aliases[c.classNameEn] ?? []).includes(c.subclassEn))
        take(c.classNameEn === 'Druid' ? LAND[s.land?.[0]] : SUBCLASS[c.classNameEn]);
    if (c.classNameEn === 'Paladin')
        take({ 2: ['Divine Smite'], 5: ['Find Steed'] });
    if (c.classNameEn === 'Ranger')
        out.push('Hunter’s Mark');
    if (c.classNameEn === 'Bard')
        take({ 20: ['Power Word Heal', 'Power Word Kill'] });
    if (c.classNameEn === 'Warlock')
        take({ 9: ['Contact Other Plane'] });
    const inv = s.invocations ?? [];
    const spells: Record<string, string> = { 'Armor of Shadows': 'Mage Armor', 'Ascendant Step': 'Levitate', 'Fiendish Vigor': 'False Life', 'Gift of the Depths': 'Water Breathing', 'Mask of Many Faces': 'Disguise Self', 'Master of Myriad Forms': 'Alter Self', 'Misty Visions': 'Silent Image', 'One with Shadows': 'Invisibility', 'Otherworldly Leap': 'Jump', 'Pact of the Chain': 'Find Familiar', 'Visions of Distant Realms': 'Arcane Eye', 'Whispers of the Grave': 'Speak with Dead' };
    for (const id of inv)
        if (spells[id])
            out.push(spells[id]);
    return [...new Set(out)];
}

/** 誓言等自動授予的法術不佔準備名額；移出一般清單，保留於自動授予清單。 */
export function normalizePreparedSelections(c:Character, s:Record<string,string[]>, spells:{id:string;eng_name:string|null}[]):Record<string,string[]> {
    if(!s.prepared)return s;
    const names=automaticSpellNames(c,s);
    const prepared=s.prepared.filter(id=>!names.some(n=>sameSpellName(n,spells.find(x=>x.id===id)?.eng_name??'')));
    return prepared.length===s.prepared.length?s:{...s,prepared};
}
