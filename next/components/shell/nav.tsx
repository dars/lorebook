'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 主導覽的單一來源，對照 Flutter 端的 `appDestinations`。
 * 底部書籤列（compact）與側邊 Rail（≥600dp）共用，避免兩處不同步。
 */
export const DESTINATIONS = [
  { path: '/main/decision', label: '行動', icon: 'wand' },
  { path: '/main/character', label: '角色', icon: 'person' },
  { path: '/main/journal', label: '旅程', icon: 'book' },
  { path: '/main/system', label: '設定', icon: 'gear' },
] as const;

export type NavItem = { path: string; label: string; icon: string };

/**
 * 導覽可由路由驅動（主畫面）或由本地狀態驅動（試玩頁）。
 *
 * 試玩的角色狀態只活在 client store 且不推雲端，切分頁若走路由會重新
 * 掛載並 `load(initial)`，把玩家剛才扣的血還原——所以那裡走 onSelect。
 */
type NavProps = {
  items?: readonly NavItem[];
  active?: string;
  onSelect?: (path: string) => void;
};

const ICONS: Record<string, string> = {
  wand: 'M7.5 5.6 10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.6 10.2-2.6-2.6a1 1 0 0 0-1.4 0L2 17.4a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l8.4-8.4a1 1 0 0 0 0-1.4zm-3.3 1.5-1.4-1.4 2-2 1.4 1.4z',
  person: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10m0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5m0 1.9c3.7 0 7.6 1.8 8 3.1H4c.5-1.3 4.4-3.1 8-3.1',
  book: 'M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1m0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z',
  gear: 'M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96a7.06 7.06 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.41h-3.84a.5.5 0 0 0-.5.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.7 8.87a.5.5 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0 0 1.88L2.82 14.5a.5.5 0 0 0-.12.61l1.92 3.32c.13.22.39.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.25.41.5.41h3.84c.25 0 .46-.17.5-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2',
};

function NavIcon({ name, className }: { name: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

/**
 * 底部浮動書籤列（compact）。
 *
 * 規格照搬：外層由透明漸層至底色（讓內容自然淡出）、膠囊 60px 高／30px 圓角／
 * 80% surface-1 底／border 框／黑色陰影；選中項為金色底 22px 圓角＋金色光暈。
 */
export function BookmarkTabBar({ items, active, onSelect }: NavProps = {}) {
  const pathname = usePathname();
  const list = items ?? DESTINATIONS;
  // 底部留白取 20px 與 home indicator 高度的較大者：iPhone standalone 下
  // 少了它，膠囊會被指示條壓住。
  return (
    <nav className="medium:hidden pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-linear-to-b from-transparent via-surface-0 via-40% to-surface-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
      <div className="pointer-events-auto ml-[max(1rem,env(safe-area-inset-left))] mr-[max(1rem,env(safe-area-inset-right))] flex h-[60px] items-center gap-0 rounded-[30px] border border-border bg-surface-1/80 px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur">
        {list.map((d) => {
          const selected = active ? active === d.path : pathname.startsWith(d.path);
          const cls = `flex h-12 flex-1 flex-col items-center justify-center rounded-[22px] ${
            selected
              ? 'bg-[#876E2A]/40 shadow-[0_2px_8px_rgba(201,168,76,0.25)]'
              : 'hover:bg-[#876E2A]/15'
          }`;
          const body = (
            <>
              <NavIcon
                name={d.icon}
                className={`size-5 ${selected ? 'fill-gold' : 'fill-text-secondary'}`}
              />
              <span
                className={`mt-0.5 text-[12px] ${
                  selected ? 'font-semibold text-gold' : 'text-text-secondary'
                }`}
              >
                {d.label}
              </span>
            </>
          );
          return onSelect ? (
            <button key={d.path} type="button" onClick={() => onSelect(d.path)} className={cls}>
              {body}
            </button>
          ) : (
            <Link key={d.path} href={d.path} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** 側邊導覽（≥600dp），對照 Flutter 的 NavigationRail。 */
export function NavRail({ items, active, onSelect }: NavProps = {}) {
  const pathname = usePathname();
  const list = items ?? DESTINATIONS;
  return (
    <nav className="medium:flex hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-border-2 py-4">
      {list.map((d) => {
        const selected = active ? active === d.path : pathname.startsWith(d.path);
        // 對照 Flutter 的 Material NavigationRail：選中指示是**圖示後方的膠囊**
        // （56×32、全圓角），不是整項的背景色塊。原本整項套 30% 的暗金、
        // 4px 圓角，在深色底上幾乎看不出哪一項被選中。
        const cls = 'flex w-16 flex-col items-center gap-1 py-2';
        const body = (
          <>
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full ${
                selected ? 'bg-gold/25' : 'group-hover:bg-gold/10'
              }`}
            >
              <NavIcon
                name={d.icon}
                className={`size-5 ${selected ? 'fill-gold' : 'fill-text-secondary'}`}
              />
            </span>
            <span
              className={`text-[12px] ${
                selected ? 'font-semibold text-gold' : 'text-text-secondary'
              }`}
            >
              {d.label}
            </span>
          </>
        );
        return onSelect ? (
          <button
            key={d.path}
            type="button"
            onClick={() => onSelect(d.path)}
            className={`group ${cls}`}
          >
            {body}
          </button>
        ) : (
          <Link key={d.path} href={d.path} className={`group ${cls}`}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
