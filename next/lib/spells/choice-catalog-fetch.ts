import { fetchSpells } from '@/lib/catalog/fetch';
import type { Character } from '@/lib/domain/character';
import { fetchCustomSpells } from './actions';
import { mergeChoiceSpells } from './choice-catalog';
import { spellFromCustom } from './types';

/** 建角、升級及補選共用，避免只有建角或角色頁其中一邊看得到收藏法術。 */
export async function fetchChoiceSpells(character?: Character) {
  const [catalog, custom] = await Promise.all([fetchSpells(), fetchCustomSpells()]);
  return {
    rows: mergeChoiceSpells(catalog.rows, custom.spells.map((s) => ({ spell: spellFromCustom(s), school: s.school, ritual: s.ritual })), character),
    error: catalog.error || custom.error
      ? '部分法術暫時無法載入，請稍後重新整理；自創收藏也需要連線才能載入。' : null,
  };
}
