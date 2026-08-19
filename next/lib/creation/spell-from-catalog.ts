import type { CatalogSpell } from '@/lib/catalog/types';
import type { Spell } from '@/lib/domain/character';
import {
  ftFlattenEntries,
  ftFormatCastingTime,
  ftFormatRange,
} from '@/lib/catalog/fivetools';

/**
 * 內容庫法術 → 角色卡法術的反正規化映射，移植自 Flutter 端
 * `spell_from_catalog.dart`。
 *
 * 建角／學習法術當下就把內容庫的資料**複製**進角色卡，而不是存個 id 之後再查：
 * 跑團當下不該依賴內容庫在線。描述壓成純文字全文，排版損失（表格、升環區塊
 * 細節）是已知取捨，法術頁改用渲染器時再存結構化 entries。
 *
 * `castKind` 必須由原始的 `casting_time` 推導而不能給預設值——行動頁的
 * 動作／附贈／反應分組看的就是它，全填 `action` 會讓護盾術（反應）與
 * 迷蹤步（附贈）都被歸到動作區。
 */
export function spellFromCatalog(s: CatalogSpell): Spell {
  return {
    name: s.name,
    nameEn: s.eng_name ?? '',
    level: s.level,
    description: ftFlattenEntries(s.entries),
    upgrade: '',
    damage: '',
    damageType: '',
    range: ftFormatRange(s.range),
    castingTime: ftFormatCastingTime(s.casting_time),
    castKind: castKindOf(s.casting_time),
    prepared: true,
    concentration: s.concentration,
  };
}

/** 由 5etools 的 `casting_time` 原始結構（`[{unit, number}]`）判斷動作類型。 */
export function castKindOf(castingTime: unknown[]): Spell['castKind'] {
  const first = castingTime[0];
  if (!first || typeof first !== 'object') return 'other';
  const unit = (first as { unit?: unknown }).unit;
  switch (unit) {
    case 'action':
      return 'action';
    case 'bonus':
      return 'bonus';
    case 'reaction':
      return 'reaction';
    default:
      return 'other';
  }
}
