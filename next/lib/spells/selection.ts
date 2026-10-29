import type { Character, Spell } from '@/lib/domain/character';
export const spellKey = (s: Spell) => s.homebrewId ? `custom:${s.homebrewId}` : `catalog:${s.nameEn || s.name}`;
export function selectionDelta(initial: Spell[], selected: Spell[]) {
  const before = new Set(initial.map(spellKey)), after = new Set(selected.map(spellKey));
  return { added: selected.filter(s => !before.has(spellKey(s))), removed: initial.filter(s => !after.has(spellKey(s))) };
}
/** 只合併本次增刪，保留面板開啟期間的其他更新與既有快照。 */
export function applySpellSelection(c: Character, kind: 'cantrips' | 'spells' | 'spellbook', initial: Spell[], selected: Spell[]): Character {
  const { added, removed } = selectionDelta(initial, selected);
  const keys = new Set(removed.filter(s=>!s.progressionSource).map(spellKey));
  const existing = new Set([...c.cantrips, ...c.spells].map(spellKey));
  return { ...c, [kind]: [...(c[kind]??[]).filter(s => !keys.has(spellKey(s))), ...added.filter(s => kind==='spellbook'?!c.spellbook?.some(b=>spellKey(b)===spellKey(s)):!existing.has(spellKey(s))).map(s=>kind==='spellbook'?{...s,prepared:false}:s)],
    concentrationSpell: kind!=='spellbook'&&(c[kind]??[]).some(s => keys.has(spellKey(s)) && s.name === c.concentrationSpell) ? null : c.concentrationSpell };
}
