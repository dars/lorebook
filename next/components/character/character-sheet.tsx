'use client';

import { useState, type ReactNode } from 'react';

import type { Character } from '@/lib/domain/character';
import { CharacterTabBar } from './tab-bar';
import { AbilitiesTab } from './tabs/abilities-tab';
import { OverviewTab } from './tabs/overview-tab';
import { BiographyTab, InventoryTab, SpellsTab } from './tabs/rest-tabs';

/**
 * 角色卡，對照 Flutter 端的 `CharacterPage`。
 *
 * 分頁組成與顯示條件完全照搬：總覽／屬性／法術／物品／傳記，其中**法術分頁
 * 僅施法者顯示**（非施法角色沒有法術位也沒有戲法，留一個空分頁只是雜訊）。
 *
 * 版型三段式與 Flutter 一致：
 * - compact：單欄 ＋ 分頁列
 * - medium：同上，內容置中限寬 700px
 * - expanded：左欄常駐總覽（跑團高頻查閱）、右欄其餘分頁
 *
 * 唯讀與可編輯共用同一個元件——分享檢視與自己的角色卡看到的是同一份排版，
 * 差別只在寫入入口是否渲染（Flutter 端以 ReadOnlyScope 表達同一件事）。
 */
export function CharacterSheet({
  c,
  share,
}: {
  c: Character;
  /** 分享區塊。唯讀檢視不傳，該區塊即不渲染。 */
  share?: ReactNode;
}) {
  const showSpells = c.spellSlots.length > 0 || c.cantrips.length > 0;

  const tabs = ['總覽', '屬性', ...(showSpells ? ['法術'] : []), '物品', '傳記'];
  const [index, setIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState(0);
  const detailTabs = tabs.slice(1);

  const render = (name: string) => {
    switch (name) {
      case '總覽':
        return <OverviewTab c={c} share={share} />;
      case '屬性':
        return <AbilitiesTab c={c} />;
      case '法術':
        return <SpellsTab c={c} />;
      case '物品':
        return <InventoryTab c={c} />;
      default:
        return <BiographyTab c={c} />;
    }
  };

  return (
    <>
      {/* compact / medium：單欄分頁 */}
      <div className="expanded:hidden mx-auto w-full max-w-[700px]">
        <CharacterTabBar tabs={tabs} current={index} onChange={setIndex} />
        {render(tabs[index])}
      </div>

      {/* expanded：左欄總覽常駐、右欄分頁 */}
      <div className="expanded:flex hidden w-full items-start gap-4">
        <div className="min-w-0 flex-2">
          <OverviewTab c={c} share={share} />
        </div>
        <div className="min-w-0 flex-3">
          <CharacterTabBar
            tabs={detailTabs}
            current={detailIndex}
            onChange={setDetailIndex}
          />
          {render(detailTabs[detailIndex])}
        </div>
      </div>
    </>
  );
}
