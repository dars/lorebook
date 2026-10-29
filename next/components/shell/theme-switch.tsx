'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * 外觀主題切換，對照 Flutter 端 `system_page.dart` 的主題選擇。
 *
 * 三態（系統／深色／淺色）存 localStorage；「系統」跟隨 prefers-color-scheme
 * 並在使用者改系統設定時即時反應。三種模式最後都寫成 `data-theme`，
 * 只有一條套用路徑。
 */
type Mode = 'system' | 'dark' | 'light';

const KEY = 'lorebook-theme';
const THEME_EVENT = 'lorebook-theme-change';

function readMode(): Mode {
  const stored = localStorage.getItem(KEY);
  return stored === 'dark' || stored === 'light' ? stored : 'system';
}

function subscribeMode(notify: () => void) {
  window.addEventListener('storage', notify);
  window.addEventListener(THEME_EVENT, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(THEME_EVENT, notify);
  };
}

const serverMode = (): Mode => 'system';

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

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  // hydration 先使用相同快照，再讀取偏好，避免已選主題與伺服器的按鈕狀態不符。
  const mode = useSyncExternalStore(subscribeMode, readMode, serverMode);

  // 「系統」時跟著系統設定變——使用者在 OS 切換深淺色時不必重整。
  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const pick = (m: Mode) => {
    localStorage.setItem(KEY, m);
    window.dispatchEvent(new Event(THEME_EVENT));
    applyTheme(m);
  };

  if (compact) {
    return (
      <label className="flex min-h-11 shrink-0 items-center gap-2 rounded-card border border-border px-3 text-small text-text-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold">
        <span>外觀</span>
        <select aria-label="外觀主題" name="theme" value={mode} onChange={(event) => pick(event.target.value as Mode)} className="theme-select min-h-11 min-w-[5rem] cursor-pointer bg-surface-0 text-small text-text-primary outline-none">
          <option value="system">跟隨系統</option>
          <option value="light">淺色</option>
          <option value="dark">深色</option>
        </select>
      </label>
    );
  }

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
          aria-pressed={mode === v}
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
