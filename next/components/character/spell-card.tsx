'use client';
import {warlockDamage} from '@/lib/rules/warlock';

import {affinityMatches,affinity,innateActive} from '@/lib/rules/sorcerer';
import {RangerPowers} from '@/components/decision/ranger-powers';
import {isHuntersMark,markDie} from '@/lib/rules/ranger';
import {discipleHealingBonus} from '@/lib/rules/cleric';
import {wearingArmor} from '@/lib/rules/ac';
import {characterActions} from '@/lib/state/character-store';
import type {Character} from '@/lib/domain/character';
import {cantripDamage} from '@/lib/rules/cantrip-damage';
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
  characterLevel = 1,
  character,
  interactive = true,
  badge,
  emphasize = false,
  borderless = false,
}: {
  spell: Spell;
  characterLevel?: number;
  character?: Character;
  interactive?: boolean;
  /** 徽章文字；省略時戲法為「戲」、其餘為環數。 */
  badge?: string;
  /** 金色強調徽章（已備法術、附贈／反應法術）。 */
  emphasize?: boolean;
  borderless?: boolean;
}) {
  const rangerMark=!!character&&character.classNameEn==='Ranger'&&isHuntersMark(spell);
  const damage = rangerMark?markDie(character!):character?.classNameEn==='Warlock'?warlockDamage(character,spell):cantripDamage(spell,characterLevel);
  const lifeBonus=character&&!spell.homebrewId&&/Cure Wounds|Healing Word|Prayer of Healing|Mass Heal|^Heal$/.test(spell.nameEn)?discipleHealingBonus(character,spell.level):0;
  const hasDamage = damage.length > 0;
  return (
    <> <EntryCard
      borderless={borderless}
      badge={badge ?? (spell.level === 0 ? '戲' : `${spell.level}`)}
      title={spell.name}
      subtitle={[spell.nameEn, spell.homebrewId ? '自創法術' : '', spell.castingSources?.some(s=>s.free==='atWill')?'最低環隨意施放':''].filter(Boolean).join(' · ')}
      // 射程附上格數——跑團在方格圖上跑，省掉「60 除以 5」這步心算。
      meta={spell.range ? withGridSquares(spell.range) : null}
      metaArrow={spell.range.length > 0}
      value={hasDamage ? damage : null}
      valueClass={hasDamage ? damageClass(spell.damageType) : 'text-gold-dim'}
      description={[spell.homebrewId ? `施法：${spell.castingTime}${spell.concentration ? ' · 需要專注' : ''}` : '', rangerMark&&character!.level>=20?spell.description.replaceAll('1d6','1d10'):spell.description, lifeBonus?`生命門徒：使用 ${spell.level} 環法術位時，每個目標在施放回合額外恢復 ${lifeBonus} HP（加在基本治療量之外）。升環時為 2＋實際法術位環數；免費施放不適用。`:''].filter(Boolean).join('\n\n') || null}
      footnote={[spell.alwaysPrepared ? '始終準備 · 不占職業已備名額' : '', spell.castingSources?.length ? spell.castingSources.map(s=>`${s.title}${s.ability?` · ${s.ability}`:''}${s.free==='atWill'?' · 最低環無限施放':s.free?` · ${s.free==='short'?'短休或長休':'長休'}恢復一次免費施放`:''}`).join('；') : spell.spellAbility ? `施法屬性：${spell.spellAbility}` : '', spell.upgrade].filter(Boolean).join(' · ') || null}
      emphasizeBadge={emphasize}
    />
    {interactive&&rangerMark&&<div className="px-3 pb-2"><RangerPowers c={character!} kind="mark"/></div>}
    {character&&affinityMatches(character,spell)&&<p className="px-3 pb-2 text-small text-gold">元素親和：此法術一次{affinity(character)!.name}傷害擲骰＋{character.abilityScores.cha.modifier}（不重複加到每顆骰或每次命中）。</p>}
    {character&&innateActive(character)&&<p className="px-3 pb-2 text-small text-gold">天生術法：若作為術士法術施放，DC＋1、法術攻擊有優勢。</p>}
    {(spell.alwaysPrepared||lifeBonus>0)&&<div className="flex flex-wrap gap-2 px-3 pb-2 text-small text-gold">{spell.alwaysPrepared&&<span>始終準備 · 不占名額</span>}{lifeBonus>0&&<span>生命門徒：使用 {spell.level} 環法術位額外 +{lifeBonus} HP</span>}</div>}
    {interactive&&character&&!spell.homebrewId&&(spell.nameEn==='Mage Armor'||spell.name==='法師護甲')&&<div className="px-3 pb-2"><button type="button" aria-pressed={character.mageArmorActive} disabled={wearingArmor(character)} onClick={()=>characterActions.setMageArmor(!character.mageArmorActive)} className="min-h-11 text-small text-gold disabled:opacity-40">{character.mageArmorActive?'結束法師護甲':wearingArmor(character)?'著甲中無法啟用':'啟用法師護甲 · AC 13＋敏捷'}</button><p className="text-small text-text-secondary">記錄施放在自己身上的效果，持續 8 小時；{spell.castingSources?.some(s=>s.free==='atWill')?'最低環施放不消耗法術位。':'若使用法術位施放，請另行扣除。'}</p></div>}
    </>
  );
}
