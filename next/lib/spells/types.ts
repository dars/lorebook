import { z } from 'zod';
import { Spell, type Character } from '@/lib/domain/character';

export const CustomSpell = Spell.extend({
  id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().max(120).default(''),
  level: z.number().int().min(0).max(9),
  description: z.string().trim().min(1).max(20000),
  upgrade: z.string().max(5000).default(''),
  school: z.string().max(80).default(''),
  duration: z.string().max(200).default('瞬間'),
  components: z.string().max(500).default(''),
  ritual: z.boolean().default(false),
  range: z.string().max(200).default(''),
  castingTime: z.string().trim().min(1).max(200).default('1 個動作'),
  damage: z.string().max(120).default(''),
  damageType: z.string().max(120).default(''),
});
export type CustomSpell = z.infer<typeof CustomSpell>;

/** 選用時快照；收藏後續編輯、刪除不會改寫角色。 */
export function spellFromCustom(s: CustomSpell): Spell {
  return Spell.parse({ ...s, homebrewId: s.id, description: [
    [s.school, s.ritual ? '儀式' : '', s.duration && `持續：${s.duration}`, s.components && `成分：${s.components}`].filter(Boolean).join(' · '),
    s.description,
  ].filter(Boolean).join('\n\n') });
}

export function addCustomSpell(c: Character, s: CustomSpell): Character {
  if ([...c.cantrips, ...c.spells].some(x => x.homebrewId === s.id)) return c;
  const key = s.level === 0 ? 'cantrips' : 'spells';
  return { ...c, [key]: [...c[key], spellFromCustom(s)] };
}

export function removeCustomSpell(c: Character, id: string): Character {
  const removed = [...c.cantrips, ...c.spells].find(s => s.homebrewId === id);
  if (!removed) return c;
  return { ...c,
    cantrips: c.cantrips.filter(s => s.homebrewId !== id),
    spells: c.spells.filter(s => s.homebrewId !== id),
    concentrationSpell: c.concentrationSpell === removed.name ? null : c.concentrationSpell,
  };
}
