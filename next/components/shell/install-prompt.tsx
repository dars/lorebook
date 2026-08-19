'use client';

import { useEffect, useState } from 'react';

/**
 * 「加到主畫面」引導，對照 Flutter 端的 `a2hs_gate.dart`。
 *
 * 兩條路徑：支援 `beforeinstallprompt` 的瀏覽器（Chrome 系）直接叫原生安裝；
 * iOS Safari 沒有這個事件，只能給圖文步驟。**不做通用的假安裝鈕**——按了沒
 * 反應比沒有按鈕更糟。
 *
 * 已在 standalone 開啟時不顯示；使用者選「不要再顯示」後永久收起。
 */
const KEY = 'lorebook-a2hs-dismissed';

type Choice = 'later' | 'never';

type InstallEvent = Event & { prompt: () => Promise<void> };

/**
 * 只在手機／平板勸安裝。
 *
 * Chrome 桌機同樣會觸發 `beforeinstallprompt`，但「加到主畫面」對桌機使用者
 * 沒有意義——他本來就有分頁與書籤，橫幅只是擋住畫面。
 *
 * 判斷用 `pointer: coarse`（主要輸入裝置是手指）而非 UA 字串或視窗寬度：
 * 桌機縮小視窗不會變成平板，而 UA 嗅探每隔幾年就會壞一次。
 */
function isHandheld() {
  return window.matchMedia('(pointer: coarse)').matches;
}

/** 共用的前置條件：已安裝、已永久關閉、或不是手持裝置都不顯示。 */
function suppressed() {
  if (localStorage.getItem(KEY) === 'never') return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return !isHandheld();
}

/** 環境判斷不依賴 render——放在 state 初值裡，避免 effect 內同步 setState。 */
function shouldOfferIosHint() {
  if (typeof window === 'undefined') return false;
  if (suppressed()) return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // iOS Safari 不觸發 beforeinstallprompt，只能給步驟說明。
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(shouldOfferIosHint);

  useEffect(() => {
    if (suppressed()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const close = (choice: Choice) => {
    if (choice === 'never') localStorage.setItem(KEY, 'never');
    setDeferred(null);
    setIosHint(false);
  };

  if (!deferred && !iosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[520px] rounded-card border border-border bg-surface-1 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <p className="text-[14px] font-semibold text-text-primary">
          把 Lorebook 加到主畫面
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          {deferred
            ? '之後就能像 App 一樣全螢幕開啟。'
            : '點 Safari 下方的分享按鈕，選「加入主畫面」，之後就能像 App 一樣開啟。'}
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => close('never')}
            className="min-h-11 flex-1 rounded-chip border border-border text-[13px] text-text-secondary"
          >
            不要再顯示
          </button>
          {deferred ? (
            <button
              type="button"
              onClick={async () => {
                await deferred.prompt();
                close('later');
              }}
              className="min-h-11 flex-1 rounded-chip bg-gold-solid text-[13px] font-bold text-[#1A1206]"
            >
              安裝應用程式
            </button>
          ) : (
            <button
              type="button"
              onClick={() => close('later')}
              className="min-h-11 flex-1 rounded-chip border border-gold text-[13px] text-gold"
            >
              知道了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
