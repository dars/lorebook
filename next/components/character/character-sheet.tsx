'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';

import type { Character } from '@/lib/domain/character';
import { CharacterPdfExport } from './character-pdf-export';
import { CharacterTabBar } from './tab-bar';
import { SwipeTabs } from './swipe-tabs';
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
 *
 * 目前分頁記在 `?tab=`，不是 useState：重整、加書籤、把「物品」那一頁的連結
 * 丟給 DM，都該回到同一個地方。
 */

/**
 * 網址用的分頁代號。
 *
 * 用 ASCII slug 而非直接放中文分頁名：中文得經過 percent-encoding，貼出去的
 * 連結會變成一串 %E7%89%A9%E5%93%81，看不出指向哪裡。
 */
const TAB_SLUG: Record<string, string> = {
  總覽: 'overview',
  屬性: 'abilities',
  法術: 'spells',
  物品: 'inventory',
  傳記: 'bio',
};
type SheetProps = {
  spellTools?: { cantrips: ReactNode; spells: ReactNode };
  c: Character;
  /** 分享區塊。唯讀檢視不傳，該區塊即不渲染。 */
  share?: ReactNode;
  /** 編輯入口。唯讀檢視不傳——寫入入口不予渲染，而非渲染後停用。 */
  onEditBasic?: () => void;
  onEditProficiency?: () => void;
  onEditAbout?: () => void;
  onEditPersonality?: () => void;
  onEditPortrait?: () => void;
  inventory?: React.ComponentProps<typeof InventoryTab>;
};

/**
 * `useSearchParams` 會讓靜態預渲染的路由（試玩頁）整棵子樹退回 client 渲染，
 * 除非套一層 Suspense。fallback 不是空白或轉圈，而是**同一張卡的預設分頁**：
 * 靜態頁的 HTML 因此仍含完整內容（與加這個參數之前一模一樣），
 * hydration 後再換成讀得到網址的版本。
 *
 * 動態路由（自己的角色卡、分享檢視）不走 fallback，伺服器端就直接渲染出
 * 網址指定的那一頁，深連結不會閃一下總覽。
 */
export function CharacterSheet(props: SheetProps) {
  return (
    <Suspense fallback={<Sheet {...props} slug={null} />}>
      <SheetFromUrl {...props} />
    </Suspense>
  );
}

function SheetFromUrl(props: SheetProps) {
  return <Sheet {...props} slug={useSearchParams().get('tab')} />;
}

function Sheet({
  spellTools,
  c,
  share,
  onEditBasic,
  onEditProficiency,
  onEditAbout,
  onEditPersonality,
  onEditPortrait,
  inventory,
  slug,
}: SheetProps & { slug: string | null }) {
  const showSpells = c.spellSlots.length > 0 || c.cantrips.length > 0 || c.spells.length > 0 || !!spellTools;

  const tabs = ['總覽', '屬性', ...(showSpells ? ['法術'] : []), '物品', '傳記'];
  const detailTabs = tabs.slice(1);

  const at = (list: string[]) => {
    const i = list.findIndex((t) => TAB_SLUG[t] === slug);
    // 找不到（沒帶參數、或帶了非施法者沒有的 spells）就回到第一頁，
    // 而不是渲染一個空白分頁。
    return i < 0 ? 0 : i;
  };
  const index = at(tabs);
  // expanded 版型左欄常駐總覽，右欄只放其餘分頁——?tab=overview 在這裡沒有
  // 對應項，於是自然落回屬性，兩欄不會同時是總覽。
  const detailIndex = at(detailTabs);

  // 進場方向跟著切換方向：往右切就從右邊進來。少了這個，動畫會像單純的閃爍
  // 而不是「換了一頁」。在點擊當下就決定，不必在 render 期間比對前後值。
  const [enterClass, setEnterClass] = useState<string>();

  /**
   * 只換網址、不重新導覽。
   *
   * `router.replace` 會對這個 force-dynamic 路由發一次 RSC 請求，等於每點一次
   * 分頁就重跑一輪伺服器查詢；原生 History API 是 Next 官方支援的淺層更新，
   * 且會同步回 useSearchParams。
   *
   * 用 replaceState 而非 pushState：分頁切換不該塞滿上一頁的歷史，
   * 返回鍵要回到的是「上一個頁面」而不是「上一個分頁」。
   */
  const select = (list: string[]) => (i: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', TAB_SLUG[list[i]]);
    window.history.replaceState(null, '', `?${params}`);
  };

  const render = (name: string) => {
    switch (name) {
      case '總覽':
        return (
          <OverviewTab
            c={c}
            share={share}
            onEditBasic={onEditBasic}
            onEditPortrait={onEditPortrait}
          />
        );
      case '屬性':
        return <AbilitiesTab c={c} />;
      case '法術':
        return <SpellsTab c={c} tools={spellTools} />;
      case '物品':
        return <InventoryTab c={c} {...inventory} />;
      default:
        return (
          <BiographyTab
              c={c}
              onEditProficiency={onEditProficiency}
              onEditAbout={onEditAbout}
              onEditPersonality={onEditPersonality}
            />
        );
    }
  };

  return (
    <>
      <CharacterPdfExport c={c} />
      {/* compact / medium：單欄分頁，可左右滑動切換。
          高度扣掉頁首（約 3.5rem）、PDF 工具列（3.75rem）、分頁列（約 3rem）與底部書籤列——
          medium 已改用側邊導覽，不再扣手機的 6rem，避免底部出現整條空白。
          每一頁在這個區域內各自垂直捲動，見 SwipeTabs 的說明。 */}
      <div className="expanded:hidden mx-auto flex w-full max-w-[700px] flex-col">
        <CharacterTabBar tabs={tabs} current={index} onChange={select(tabs)} />
        <SwipeTabs
          current={index}
          onSettle={select(tabs)}
          className="h-[calc(100dvh-6.5rem-3.75rem-6rem-env(safe-area-inset-bottom))] medium:h-[calc(100dvh-6.5rem-3.75rem-env(safe-area-inset-bottom))]"
        >
          {tabs.map((t) => (
            <div key={t}>{render(t)}</div>
          ))}
        </SwipeTabs>
      </div>

      {/* expanded：左欄總覽常駐、右欄分頁。
          比例 2:3、間距 16、**不限寬**——與 Flutter 的
          `Row(Expanded(flex:2), SizedBox(width: lg), Expanded(flex:3))` 相同，
          也與行動頁的三欄（同樣不限寬）一致。左右欄各自帶 px-4，所以兩欄之間
          的視覺間距是 16+16+16＝48，跟線上版量到的一樣。

          先前這裡是「左欄固定 360 ＋ 整體限寬 1180 置中」。限寬是為了擋屬性
          盾牌——它由 aspect-ratio 撐開、字級卻是固定的，欄一寬就會拉出一塊
          空盾牌。但那個代價是左欄比線上版窄了 160px（人像跟著縮），而且在
          1600px 螢幕上右側空掉一大塊。盾牌的正解是內容跟著縮放（Flutter 用
          FittedBox），不是把整頁綁死。 */}
      <div className="expanded:flex hidden w-full items-start gap-4">
        <div className="min-w-0 flex-[2]">
          <OverviewTab
            c={c}
            share={share}
            onEditBasic={onEditBasic}
            onEditPortrait={onEditPortrait}
          />
        </div>
        <div className="min-w-0 flex-[3]">
          <CharacterTabBar
            tabs={detailTabs}
            current={detailIndex}
            onChange={(i) => {
              setEnterClass(i > detailIndex ? 'tab-enter-right' : 'tab-enter-left');
              select(detailTabs)(i);
            }}
          />
          {/* 換分頁的過場。
              這裡**刻意不用 SwipeTabs**：它是橫向捲動容器＋scroll-snap，在
              compact 是對的（每頁固定高度各自捲、還能用手指滑）。但寬版右欄是
              頁面流的一部分、由整頁捲動，只能開 autoHeight，而 autoHeight 會用
              ResizeObserver 持續改容器高度——那個高度變動會把平滑捲動吃掉，
              實測分頁列切了、內容卻停在原地並被截斷。
              寬版是滑鼠操作、不需要滑動手勢，用進場動畫就夠，也不必為了過場
              把一整個分頁本體關進捲動容器。 */}
          <div key={detailTabs[detailIndex]} className={enterClass}>
            {render(detailTabs[detailIndex])}
          </div>
        </div>
      </div>
    </>
  );
}
