import { CatalogSpell } from '@/lib/catalog/types';
import type { Character, Spell } from '@/lib/domain/character';
import { sameSpellName } from '@/lib/rules/progression/granted-spells';
import { spellFromCatalog } from '@/lib/creation/spell-from-catalog';

/** 成長選單沿用內容庫欄位篩環數；自創法術保留完整角色快照，避免轉格式丟欄位。 */
export type ChoiceSpell = CatalogSpell & { homebrew?: Spell };

export const customChoiceId = (id: string) => `custom:${id}`;

type CustomSource = { spell: Spell; school?: string; ritual?: boolean };

function customChoice(snapshot: Spell, source?: CustomSource): ChoiceSpell {
  const school = snapshot.homebrewSchool ?? source?.school ?? '';
  const ritual = snapshot.homebrewRitual ?? source?.ritual ?? false;
  return {
    ...CatalogSpell.parse({
      id: customChoiceId(snapshot.homebrewId!), name: snapshot.name,
      eng_name: snapshot.nameEn, level: snapshot.level,
      school, school_name: school, ritual,
      concentration: snapshot.concentration, entries: [snapshot.description],
      casting_time: [{ unit: snapshot.castKind, number: 1 }],
    }),
    homebrew: { ...snapshot, homebrewSchool: school, homebrewRitual: ritual },
  };
}

export function mergeChoiceSpells(
  catalog: CatalogSpell[], custom: CustomSource[], character?: Character,
): ChoiceSpell[] {
  const sources = new Map(custom.map((s) => [s.spell.homebrewId!, s]));
  const choices = new Map(custom.map((s) => [s.spell.homebrewId!, customChoice(s.spell, s)]));
  // 已選版本優先；來源刪除或修改後，既有角色仍能準備、補登與保存原本的法術。
  for (const snapshot of [...(character?.cantrips ?? []), ...(character?.spells ?? []), ...(character?.spellbook ?? [])]) {
    if (snapshot.homebrewId) choices.set(snapshot.homebrewId, customChoice(snapshot, sources.get(snapshot.homebrewId)));
  }
  return [...catalog, ...choices.values()];
}

export const spellFromChoice = (s: ChoiceSpell): Spell =>
  s.homebrew ? { ...s.homebrew } : spellFromCatalog(s);

/** 自創以 id 比對；與同名系統法術分開，英文名留空或改名也不會混淆身分。 */
export function matchesChoiceSpell(spell: Spell, option?: ChoiceSpell): boolean {
  if (!option) return false;
  if (spell.homebrewId || option.homebrew) {
    return !!spell.homebrewId && spell.homebrewId === option.homebrew?.homebrewId;
  }
  return sameSpellName(spell.nameEn || spell.name, option.eng_name || option.name);
}
