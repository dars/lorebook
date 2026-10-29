import type { Character } from '@/lib/domain/character';

/** 角色切換與伺服器升級回應到達時，不能短暫顯示上一張卡或較舊的等級。 */
export function displayedCharacter(initial: Character, stored: Character | null): Character {
  return stored?.id === initial.id && stored.level >= initial.level ? stored : initial;
}
