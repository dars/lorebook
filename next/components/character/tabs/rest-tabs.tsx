'use client';
import { showCantrips } from '@/lib/rules/cantrips-visible';
import type { ReactNode } from 'react';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import { EditIcon } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { SpellCard } from '../spell-card';
import { Treasury } from '../coins';
import { FeatureGroups } from '../feature-groups';

/** 法術／物品／傳記三個分頁。版面語彙與其他分頁一致（區段標題＋卡片）。 */

export function SpellsTab({ c, tools }: { c: Character; tools?: { cantrips: ReactNode; spells: ReactNode; book?: ReactNode } }) {
  const prepared = RING_LEVELS.map((lv) => ({
    lv,
    spells: c.spells.filter((s) => s.level === lv),
  })).filter((g) => g.spells.length > 0);

  return (
    <div className="px-4 pb-10">
      <CollapsibleSection en="SPELLCASTING" cn="施法" first>
        <SpellcastingCard c={c} />
      </CollapsibleSection>

      {(showCantrips(c) && (c.cantrips.length > 0 || tools?.cantrips)) && (
        <CollapsibleSection en="CANTRIPS" cn="戲法" trailing={tools?.cantrips}>
          {c.cantrips.length === 0 && <p className="py-3 text-ui leading-relaxed text-text-secondary">尚未選用戲法，點標題右側「管理戲法」勾選加入。</p>}
          <div className="flex flex-col gap-2">
            {c.cantrips.map((s, i) => (
              <SpellCard character={tools?c:undefined} characterLevel={c.level} key={`${s.name}-${i}`} spell={s} badge="戲" />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {(!!c.spellbook?.length || tools?.book) && <CollapsibleSection en="SPELLBOOK" cn={`法術書 · ${c.spellbook?.length??0} 個`} trailing={tools?.book}>
        <p className="mb-2 text-small text-text-secondary">抄錄的法術與已備名額分開；休息後可調整準備清單。</p>
        <div className="divide-y divide-border-2">{(c.spellbook??[]).map((s,i)=><SpellCard character={tools?c:undefined} characterLevel={c.level} key={`${s.name}-${i}`} spell={s} badge={`${s.level}`}/>)}</div>
      </CollapsibleSection>}
      {/* 已備法術：2024 的施法者是「準備」而非「習得即可用」。
          環數在區段**內部**用小膠囊分組，不是每一環各開一個可收合區段——
          後者在高階施法者身上會變成九個標題疊在一起。 */}
      {(prepared.length > 0 || tools?.spells) && (
        <CollapsibleSection en="SPELLBOOK" cn="已備法術" trailing={tools?.spells}>
          {prepared.length === 0 && <p className="py-3 text-ui leading-relaxed text-text-secondary">尚未選用法術，點標題右側「管理法術」勾選加入。</p>}
          {prepared.map(({ lv, spells }) => (
            <div key={lv} className="mb-3">
              <span className="mb-1.5 inline-flex items-baseline gap-1.5 rounded-chip border border-border-2 px-2 py-0.5">
                <span className="text-small text-text-primary">{lv} 環</span>
                <span className="font-label text-eyebrow text-text-secondary">
                  {RING_EN[lv]}
                </span>
              </span>
              <div className="flex flex-col gap-2">
                {spells.map((s, i) => (
                  <SpellCard character={tools?c:undefined} characterLevel={c.level} key={`${s.name}-${i}`} spell={s} badge={`${lv}`} emphasize />
                ))}
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

/** 施法屬性的英文碼 → 中文名。卡片上大字顯示中文，英文碼退到副標。 */
const ABILITY_CN: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

const RING_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const RING_EN: Record<number, string> = {
  1: 'First Level', 2: 'Second Level', 3: 'Third Level',
  4: 'Fourth Level', 5: 'Fifth Level', 6: 'Sixth Level',
  7: 'Seventh Level', 8: 'Eighth Level', 9: 'Ninth Level',
};

/**
 * 施法能力卡，對照 Flutter 端 spells_tab 的頂部卡。
 *
 * **一張整合卡而非三張並排的小卡**：施法屬性、豁免 DC、法術命中是同一組
 * 互相關聯的數值（DC 與命中都由屬性推導），拆成三張獨立卡片會讓它們看起來
 * 像三件不相干的事。下緣以細線隔出每日法術位上限。
 */
function SpellcastingCard({ c }: { c: Character }) {
  const abilityCn = ABILITY_CN[c.spellcastingAbility] ?? c.spellcastingAbility;
  const cols = [
    {
      en: 'ABILITY',
      v: abilityCn || '—',
      sub: c.spellcastingAbility ? `施法屬性 ${c.spellcastingAbility}` : '施法屬性',
    },
    { en: 'SAVE DC', v: `${c.spellDc}`, sub: '法術豁免' },
    {
      en: 'ATTACK',
      v: c.spellAttack >= 0 ? `+${c.spellAttack}` : `${c.spellAttack}`,
      sub: '法術命中',
    },
  ];

  return (
    <ParchmentCard className="px-4 py-3">
      <div className="flex items-stretch">
        {cols.map((x, i) => (
          <div key={x.en} className="flex flex-1 items-center">
            {i > 0 && <span className="mr-3 h-10 w-px bg-border/40" />}
            <span className="flex flex-1 flex-col items-center">
              <span className="font-label text-eyebrow tracking-[1.5px] text-section-label">
                {x.en}
              </span>
              <span className="font-display mt-0.5 text-[24px] font-bold leading-none text-gold">
                {x.v}
              </span>
              <span className="mt-1 text-small text-text-primary/70">{x.sub}</span>
            </span>
          </div>
        ))}
      </div>

      {c.spellSlots.length > 0 && (
        <>
          <div className="my-3 h-px bg-border/40" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-ui text-text-secondary">每日法術位上限</span>
            <span className="flex flex-wrap items-baseline gap-3">
              {c.spellSlots.map((s) => (
                <span key={s.level} className="text-ui tabular-nums text-text-primary">
                  {s.level} 環
                  <span className="font-display ml-1 font-bold text-gold">×{s.total}</span>
                </span>
              ))}
            </span>
          </div>
          {/* 上限與當下剩餘是兩回事，說清楚剩餘在哪裡看，免得以為這裡的數字
              不會變。 */}
          <p className="mt-1 text-small text-text-secondary">
            即時消耗於「行動」頁追蹤
          </p>
        </>
      )}
    </ParchmentCard>
  );
}

export function InventoryTab({
  c,
  onEditCurrency,
  onAddItem,
  onToggleEquipped,
  onUseConsumable,
  onAddCustomItem,
  onEditItem,
}: {
  c: Character;
  onEditCurrency?: () => void;
  onAddItem?: () => void;
  onToggleEquipped?: (i: number) => void;
  onUseConsumable?: (i: number) => void;
  onAddCustomItem?: () => void;
  onEditItem?: (i: number) => void;
}) {
  return (
    <div className="px-4 pb-10">
      {/* TREASURY：五種幣別一律全列（含 0），點卡片開資產計算機。
          唯讀（分享檢視）時不傳 onTap——金額仍顯示，但不能編輯。 */}
      <CollapsibleSection en="TREASURY" cn="財富" first>
        <ParchmentCard className="px-0 py-0">
          <Treasury currency={c.currency} onTap={onEditCurrency} />
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection
        en="EQUIPMENT"
        cn="裝備"
        trailing={
          onAddItem && (
            <span className="flex items-center gap-2">
              {onAddCustomItem && (
                <button
                  type="button"
                  onClick={onAddCustomItem}
                  className="min-h-9 text-small text-gold"
                >
                  ＋ 自訂
                </button>
              )}
              <EditIcon onClick={onAddItem} label="取得物品" />
            </span>
          )
        }
      >
        {c.equipment.length === 0 ? (
          // 空狀態要指出下一步在哪。唯讀（分享檢視）沒有入口可指，就只陳述事實。
          <p className="py-3 text-ui leading-relaxed text-text-secondary">
            {onAddItem
              ? '還沒有任何物品。點右上角的取得物品自目錄挑選，或用「＋ 自訂」新增自製品項。'
              : '沒有物品。'}
          </p>
        ) : (
          <EquipmentGroups
            equipment={c.equipment}
            onToggleEquipped={onToggleEquipped}
            onUseConsumable={onUseConsumable}
            onEditItem={onEditItem}
          />
        )}
      </CollapsibleSection>
    </div>
  );
}

export function BiographyTab({
  c,
  onEditProficiency,
  onEditAbout,
  onEditPersonality,
}: {
  c: Character;
  onEditProficiency?: () => void;
  /** 其人其事（背景故事＋性格標籤）。與性格分開，兩個區塊各開各的面板。 */
  onEditAbout?: () => void;
  onEditPersonality?: () => void;
}) {
  return (
    <div className="px-4 pb-10">
      <CollapsibleSection
        en="ABOUT"
        cn="其人其事"
        first
        trailing={
          onEditAbout && <EditIcon onClick={onEditAbout} label="編輯其人其事" />
        }
      >
        <ParchmentCard className="px-4 py-3">
          {c.backstory ? (
            <p className="whitespace-pre-wrap text-body leading-relaxed text-text-light">
              「{c.backstory}」
            </p>
          ) : (
            <p className="text-ui text-text-secondary">
              尚未撰寫背景故事{onEditAbout ? '，點右上角編輯' : ''}。
            </p>
          )}
          {c.personalityTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {c.personalityTags.map((t) => (
                <span
                  key={t}
                  className="rounded-chip border border-border-2 px-2 py-1 text-small text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection
        en="PERSONALITY"
        cn="性格"
        trailing={
          onEditPersonality && (
            <EditIcon onClick={onEditPersonality} label="編輯性格" />
          )
        }
      >
        <ParchmentCard className="px-4 py-1">
          {![
            c.personality.traits,
            c.personality.ideals,
            c.personality.bonds,
            c.personality.flaws,
          ].some(Boolean) && (
            <p className="py-2 text-ui text-text-secondary">
              尚未描述性格{onEditPersonality ? '，點右上角編輯' : ''}。
            </p>
          )}
          {(
            [
              ['特質', c.personality.traits],
              ['理念', c.personality.ideals],
              ['羈絆', c.personality.bonds],
              ['缺陷', c.personality.flaws],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([label, v], i) => (
              <div
                key={label}
                className={`flex gap-3 py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <span className="w-10 shrink-0 text-small text-section-label">
                  {label}
                </span>
                {/* 編輯器是 textarea，換行是使用者寫進去的——不 pre-wrap 會被併成空白。
                    min-w-0：flex 子項預設不收縮，長英文或網址會撐破卡片。 */}
                <span className="min-w-0 whitespace-pre-wrap break-words text-body text-text-primary">{v}</span>
              </div>
            ))}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="FEATURES & TRAITS" cn="特長">
        <FeatureGroups c={c} />
      </CollapsibleSection>

      <CollapsibleSection
        en="PROFICIENCIES"
        cn="熟練"
        trailing={
          onEditProficiency && (
            <EditIcon onClick={onEditProficiency} label="編輯熟練" />
          )
        }
      >
        <ParchmentCard className="px-4 py-1">
          {c.languages.length === 0 && c.toolProficiencies.length === 0 ? (
            <p className="py-2 text-ui leading-relaxed text-text-secondary">
              尚未有語言或工具熟練{onEditProficiency ? '，點右上角編輯新增' : ''}。
            </p>
          ) : (
            <>
              {c.languages.length > 0 && (
                <ProfRow label="語言" items={c.languages} />
              )}
              {c.toolProficiencies.length > 0 && (
                <ProfRow label="工具" items={c.toolProficiencies} />
              )}
            </>
          )}
        </ParchmentCard>
      </CollapsibleSection>
    </div>
  );
}

function ProfRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="w-10 shrink-0 text-small text-section-label">
        {label}
      </span>
      <span className="text-ui text-text-light">{items.join(' · ')}</span>
    </div>
  );
}

/**
 * 裝備清單，依「已裝備／攜帶中」分組，對照 Flutter 的 `inventory_tab`。
 *
 * **一列只出現一個控制項。** 前一版把裝備／使用／編輯／刪除四顆都塞進列裡，
 * 擠到手機上「刪除」貼著「編輯」；我改成「點列展開才出現四顆按鈕」，
 * 結果把原版一眼可辨的東西（類型圖示、副標、分組）也一起藏掉了——那是把
 * 症狀當病因。原版不擠的真正原因是它**只顯示當下相關的那一個**：
 *
 * - 武器／護甲 → 裝備切換
 * - 消耗品 → 使用
 * - 其餘 → 沒有控制項
 *
 * 編輯走「點整列」，刪除放在編輯面板裡（最不可逆的動作不該在列上待命）。
 */
function EquipmentGroups({
  equipment,
  onToggleEquipped,
  onUseConsumable,
  onEditItem,
}: {
  equipment: Character['equipment'];
  onToggleEquipped?: (i: number) => void;
  onUseConsumable?: (i: number) => void;
  onEditItem?: (i: number) => void;
}) {
  // 保留原索引：所有回呼都以物品欄的索引為準。
  const indexed = equipment.map((item, i) => ({ item, i }));
  const groups = [
    { cn: '已裝備', en: 'EQUIPPED', icon: 'shield' as const, rows: indexed.filter((x) => x.item.equipped) },
    { cn: '攜帶中', en: 'CARRIED', icon: 'pack' as const, rows: indexed.filter((x) => !x.item.equipped) },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.en}>
          {/* 只有一組時仍出標題——「這些都還沒穿上」本身就是資訊。 */}
          <div className="mb-1.5 flex items-center gap-1.5">
            <GroupIcon name={g.icon} />
            <span className="text-small text-text-primary">{g.cn}</span>
            <span className="font-label text-eyebrow tracking-[1px] text-text-secondary">
              {g.en}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {g.rows.map(({ item, i }) => (
              <EquipmentRow
                key={`${item.name}-${i}`}
                item={item}
                onEdit={onEditItem && (() => onEditItem(i))}
                onToggleEquipped={
                  onToggleEquipped &&
                  (item.itemType === 'weapon' || item.itemType === 'armor')
                    ? () => onToggleEquipped(i)
                    : undefined
                }
                onUse={
                  onUseConsumable && item.itemType === 'consumable'
                    ? () => onUseConsumable(i)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentRow({
  item,
  onToggleEquipped,
  onUse,
  onEdit,
}: {
  item: Character['equipment'][number];
  onToggleEquipped?: () => void;
  onUse?: () => void;
  onEdit?: () => void;
}) {
  // 副標：優先用物品自帶的顯示字串，沒有就由機制欄位湊一句。
  // 「一把劍」與「一把 1d8 劈砍的劍」在跑團中不是同一個資訊量。
  const subtitle =
    item.type ||
    [
      ITEM_TYPE_CN[item.itemType],
      item.damage && `${item.damage}${item.damageType ? ` ${item.damageType}` : ''}`,
      item.acBase > 0 && `AC ${item.acBase}`,
    ]
      .filter(Boolean)
      .join('・');

  const body = (
    <>
      <ItemIcon type={item.itemType} />
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate text-body text-text-primary">{item.name}</span>
          {item.quantity > 1 && (
            <span className="shrink-0 text-small tabular-nums text-text-secondary">
              ×{item.quantity}
            </span>
          )}
          {item.quest && (
            <span className="shrink-0 rounded-chip border border-border-2 px-1.5 text-eyebrow text-text-secondary">
              任務
            </span>
          )}
        </span>
        {item.nameEn && (
          <span className="font-label block truncate text-tiny text-text-primary/70">
            {item.nameEn}
          </span>
        )}
        {subtitle && (
          <span className="block truncate text-small text-text-secondary">
            {subtitle}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-1 px-3 py-2.5">
      {/* 點整列＝編輯。控制項是**同層的兄弟節點**而非巢狀——
          button 裡不能再放 button，那是無效的 HTML 也會吃掉點擊。 */}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`編輯 ${item.name}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}

      {onToggleEquipped && (
        // 對照 Flutter：**20px 的 radio 圖示**，不是帶外框的按鈕。
        // 外框會讓它在列上比名稱還搶眼——它只是狀態指示，不是主要動作。
        // 視覺 20px、可點區以偽元素補到 44px。
        <button
          type="button"
          onClick={onToggleEquipped}
          aria-pressed={item.equipped}
          aria-label={item.equipped ? `卸下 ${item.name}` : `裝備 ${item.name}`}
          className="relative shrink-0 before:absolute before:-inset-3 before:content-['']"
        >
          <svg
            viewBox="0 0 24 24"
            className={`size-5 ${item.equipped ? 'fill-gold' : 'fill-text-secondary'}`}
            aria-hidden
          >
            {item.equipped ? (
              <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10m0-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16" />
            ) : (
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16" />
            )}
          </svg>
        </button>
      )}

      {onUse && (
        <button
          type="button"
          onClick={onUse}
          className="min-h-9 shrink-0 rounded-chip border border-border-2 px-3 text-small text-text-primary hover:border-gold/60"
        >
          使用
        </button>
      )}
    </div>
  );
}

const ITEM_TYPE_CN: Record<string, string> = {
  weapon: '武器',
  armor: '護甲',
  gear: '裝備',
  consumable: '消耗品',
};

/** 物品類型圖示——一眼分辨劍／甲／雜物／藥水，比讀文字快。 */
function ItemIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    weapon: 'M6.9 20.6 3.4 17l9.9-9.9 3.5 3.5zM14.7 5.6 18.4 2 22 5.6l-3.6 3.7zM2 22l2-4.4L6.4 20z',
    armor: 'M12 2 4 5v6c0 4.5 3.4 8.7 8 11 4.6-2.3 8-6.5 8-11V5zm0 2.2 6 2.2v4.6c0 3.4-2.5 6.8-6 8.8-3.5-2-6-5.4-6-8.8V6.4z',
    consumable:
      'M9 2v2h1v3.6L5.5 16A3 3 0 0 0 8.2 20.4h7.6A3 3 0 0 0 18.5 16L14 7.6V4h1V2zm3 2h0v4.1l1.2 2.4h-2.4L12 8.1zm-3.3 9h6.6l1.9 3.6a1 1 0 0 1-.9 1.5H8.2a1 1 0 0 1-.9-1.5z',
    gear: 'M4 6h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1m1 2v10h14V8zm3-5h8v2H8z',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0 fill-text-secondary"
      aria-hidden
    >
      <path d={paths[type] ?? paths.gear} />
    </svg>
  );
}

function GroupIcon({ name }: { name: 'shield' | 'pack' }) {
  const d =
    name === 'shield'
      ? 'M12 2 4 5v6c0 4.5 3.4 8.7 8 11 4.6-2.3 8-6.5 8-11V5z'
      : 'M9 2h6a2 2 0 0 1 2 2v2h3a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3V4a2 2 0 0 1 2-2m0 4h6V4H9z';
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 fill-section-label" aria-hidden>
      <path d={d} />
    </svg>
  );
}
