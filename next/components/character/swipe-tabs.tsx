'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 可左右滑動的分頁容器，對照 Flutter 的 `TabBarView`（PageView）。
 *
 * 用 **CSS scroll-snap** 而非 JS 動畫：滑動是瀏覽器原生的捲動，有慣性、有
 * 橡皮筋、跟手，觸控板與鍵盤也能操作。自己用 transform ＋ pointer 事件模擬
 * 只會做出一個手感比較差的版本。
 *
 * ## 為什麼每一頁自己垂直捲動
 *
 * 橫向捲動容器沒辦法讓內容垂直溢出——`overflow-x: auto` 會把 `overflow-y`
 * 從 `visible` 強制計算成 `auto`。所以只有兩種可能：容器高度取最高的那一頁
 * （短分頁下面拖一大片空白），或每頁各自捲動。Flutter 的 TabBarView 是後者，
 * 這裡照做。
 *
 * 副作用是頁首與分頁列會固定在上方不隨內容捲走——在角色卡上這其實是好事，
 * HP 與等級一直看得到。
 *
 * ## 為什麼不用 IntersectionObserver 回報目前頁
 *
 * 捲動途中會有兩頁同時可見，IO 的門檻要調得剛剛好才不會抖。改用 `scrollend`
 * （不支援時退回 debounce），只在停下來時回報一次。
 */
export function SwipeTabs({
  current,
  onSettle,
  children,
  className = '',
  autoHeight = false,
}: {
  /** 目前分頁索引；外部改變時捲過去。 */
  current: number;
  /** 使用者滑動停下來、且落在不同頁時回報。 */
  onSettle: (index: number) => void;
  /** 每個分頁一個節點，順序需與索引一致。 */
  children: ReactNode[];
  className?: string;
  /**
   * 高度跟著當前頁走（給嵌在頁面裡的小面板用）。
   *
   * 整頁型的分頁用固定高度＋各自捲動；但像「檢定」這種嵌在卡片流裡的面板，
   * 固定高度會變成頁面中的一個小捲動框，而取最高頁（技能 18 列）會讓
   * 能力頁下面空掉三分之二。改成量測當前頁的高度並過場過去。
   */
  autoHeight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number>();
  // 由程式觸發的捲動不該再回報一次，否則會與外部狀態打架。
  const programmatic = useRef(false);
  const releaseGuard = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部索引變了 → 捲過去。
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = current * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return;

    programmatic.current = true;
    // 保險：若這次捲動沒有產生 scrollend（例如目標被夾住、或捲動被打斷），
    // 旗標會一直留著把下一次使用者滑動吃掉。逾時自動放掉。
    if (releaseGuard.current) clearTimeout(releaseGuard.current);
    releaseGuard.current = setTimeout(() => {
      programmatic.current = false;
    }, 600);

    el.scrollTo({
      left: target,
      // 減少動態效果時直接跳過去，不做平滑捲動。
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [current]);

  // 視窗寬度改變時，scrollLeft 與「第幾頁」的對應會失效（每頁寬度變了）。
  // 重新對齊，否則轉向之後會停在兩頁中間。
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onResize = () => {
      programmatic.current = true;
      el.scrollTo({ left: current * el.clientWidth, behavior: 'auto' });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [current]);

  // autoHeight：量當前頁的高度。內容本身也可能變（收合區段、展開條目），
  // 所以用 ResizeObserver 持續跟著，不是只量一次。
  useEffect(() => {
    if (!autoHeight) return;
    const el = panels.current[current];
    if (!el) return;
    const sync = () => setHeight(el.scrollHeight);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoHeight, current, children]);

  // 使用者滑動停下來 → 回報落在哪一頁。
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const settle = () => {
      if (programmatic.current) {
        programmatic.current = false;
        if (releaseGuard.current) clearTimeout(releaseGuard.current);
        return;
      }
      const i = Math.round(el.scrollLeft / el.clientWidth);
      if (i !== current) onSettle(i);
    };

    // 對 window 做特性偵測而非 `'onscrollend' in el`：後者是型別守衛，
    // 會把 else 分支的 el 收斂成 never（別名成變數也一樣）。
    const hasScrollEnd = 'onscrollend' in window;
    if (hasScrollEnd) {
      el.addEventListener('scrollend', settle);
      return () => el.removeEventListener('scrollend', settle);
    }
    // Safari 尚無 scrollend：捲動停了 120ms 視為結束。
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
    };
  }, [current, onSettle]);

  return (
    <div
      ref={ref}
      // overscroll-x-contain：滑到第一／最後一頁時不要把整個瀏覽器往回帶
      // （iOS 的返回手勢會誤觸）。
      style={autoHeight ? { height } : undefined}
      // autoHeight 要 items-start：flex 預設 stretch 會把每一頁撐成容器高度，
      // 於是量到的「內容高」永遠等於當前高度，高度就再也縮不回去。
      // 固定高度模式反過來需要 stretch，讓每頁填滿並各自捲動。
      className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${
        autoHeight ? 'items-start transition-[height] duration-200' : ''
      } ${className}`}
    >
      {children.map((panel, i) => (
        <div
          key={i}
          ref={(el) => {
            panels.current[i] = el;
          }}
          className={`w-full shrink-0 snap-start ${
            // autoHeight 時容器已經貼著當前頁，內層再開捲動只會多一條捲軸。
            autoHeight ? '' : 'overflow-y-auto overscroll-y-contain'
          }`}
          // 非當前頁對輔助技術隱藏，也擋掉 Tab 焦點跑進看不見的分頁。
          inert={i !== current}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
