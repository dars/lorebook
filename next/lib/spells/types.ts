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

/**
 * 內容庫法術的身分：英文名。
 *
 * 內容庫快照不帶 id（見 `spellFromCatalog`），而中文譯名會被 data-fixes 修正
 * ——以中文名比對，修譯名之後同一道法術就能被選第二次。
 */
function sameCatalogSpell(a: Spell, b: Spell): boolean {
  if (a.homebrewId || b.homebrewId) return false;
  return a.nameEn && b.nameEn ? a.nameEn === b.nameEn : a.name === b.name;
}

export function hasCatalogSpell(c: Character, s: Spell): boolean {
  return [...c.cantrips, ...c.spells].some(x => sameCatalogSpell(x, s));
}

export function addCatalogSpell(c: Character, s: Spell): Character {
  if (hasCatalogSpell(c, s)) return c;
  const key = s.level === 0 ? 'cantrips' : 'spells';
  return { ...c, [key]: [...c[key], s] };
}

/**
 * 依位置移除角色上的任一法術（內容庫、自創、建角時帶入的都算）。
 *
 * 帶上名稱做核對：選單渲染時的 `c` 與 store 當下的狀態之間可能隔了一次更新，
 * 位置對不上時寧可不動，也不要刪到隔壁那一道。
 */
export function removeSpellAt(c: Character, kind: 'cantrips' | 'spells', index: number, name: string): Character {
  const removed = c[kind][index];
  if (!removed || removed.name !== name) return c;
  return { ...c,
    [kind]: c[kind].filter((_, i) => i !== index),
    concentrationSpell: c.concentrationSpell === removed.name ? null : c.concentrationSpell,
  };
}
