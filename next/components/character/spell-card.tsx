'use client';

import { EntryCard, damageClass } from '@/components/character/entry-card';
import type { Spell } from '@/lib/domain/character';
import { withGridSquares } from '@/lib/rules/range';

/**
 * 法術條目卡。**行動頁與角色卡的法術分頁共用同一個。**
 *
 * 原本只有行動頁用 `EntryCard`（徽章、中英雙名、射程、依傷害類型上色的骰子），
 * 法術分頁卻是裸的 `<details>` 清單——同一份資料在兩頁長得完全不一樣，而且
 * 好看的那個版本早就寫好了、只是沒被用到。
 *
 * 抽成共用元件而不是複製一份：這個 codebase 已經因為「同一個東西兩份實作」
 * 出過事（點格的方向在兩份 Pips 裡都反了）。
 */
export function SpellCard({
  spell,
  badge,
  emphasize = false,
  borderless = false,
}: {
  spell: Spell;
  /** 徽章文字；省略時戲法為「戲」、其餘為環數。 */
  badge?: string;
  /** 金色強調徽章（已備法術、附贈／反應法術）。 */
  emphasize?: boolean;
  borderless?: boolean;
}) {
  const hasDamage = spell.damage.length > 0;
  return (
    <EntryCard
      borderless={borderless}
      badge={badge ?? (spell.level === 0 ? '戲' : `${spell.level}`)}
      title={spell.name}
      subtitle={[spell.nameEn, spell.homebrewId ? '自創法術' : ''].filter(Boolean).join(' · ')}
      // 射程附上格數——跑團在方格圖上跑，省掉「60 除以 5」這步心算。
      meta={spell.range ? withGridSquares(spell.range) : null}
      metaArrow={spell.range.length > 0}
      value={hasDamage ? spell.damage : null}
      valueClass={hasDamage ? damageClass(spell.damageType) : 'text-gold-dim'}
      description={[spell.homebrewId ? `施法：${spell.castingTime}${spell.concentration ? ' · 需要專注' : ''}` : '', spell.description].filter(Boolean).join('\n\n') || null}
      footnote={spell.upgrade || null}
      emphasizeBadge={emphasize}
    />
  );
}
