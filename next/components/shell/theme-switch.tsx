'use client';

import { useEffect, useState } from 'react';

/**
 * 外觀主題切換，對照 Flutter 端 `system_page.dart` 的主題選擇。
 *
 * 三態（系統／深色／淺色）存 localStorage；「系統」跟隨 prefers-color-scheme
 * 並在使用者改系統設定時即時反應。三種模式最後都寫成 `data-theme`，
 * 只有一條套用路徑。
 */
type Mode = 'system' | 'dark' | 'light';

const KEY = 'lorebook-theme';

export function applyTheme(mode: Mode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  // 瀏覽器列／狀態列跟著換，否則深色 App 配淺色狀態列（或反過來）。
  // 與 layout.tsx 的預繪腳本是同一件事，換主題時再做一次。
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#1c1610' : '#faf7f2');
}

export function ThemeSwitch() {
  // 初值自 localStorage 讀（lazy initializer，不在 effect 裡 setState）——
  // layout 的行內 script 已在繪製前套好主題，這裡只是把選擇同步進 UI。
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(KEY) as Mode | null) ?? 'system';
  });

  // 「系統」時跟著系統設定變——使用者在 OS 切換深淺色時不必重整。
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const pick = (m: Mode) => {
    setMode(m);
    localStorage.setItem(KEY, m);
    applyTheme(m);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {(
        [
          ['system', '系統', 'M12 2a10 10 0 1 0 0 20zm0 2v16a8 8 0 0 0 0-16'],
          ['light', '淺色', 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10M11 2h2v3h-2zm0 17h2v3h-2zM2 11h3v2H2zm17 0h3v2h-3z'],
          ['dark', '深色', 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9'],
        ] as const
      ).map(([v, label, icon]) => (
        <button
          key={v}
          type="button"
          onClick={() => pick(v)}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-chip border text-small ${
            mode === v
              ? 'border-gold bg-gold/10 text-gold'
              : 'border-border-2 text-text-secondary'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`size-4 ${mode === v ? 'fill-gold' : 'fill-text-secondary'}`}
            aria-hidden
          >
            <path d={icon} />
          </svg>
          {label}
        </button>
      ))}
    </div>
  );
}
