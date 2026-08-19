'use client';

import { create } from 'zustand';

/**
 * Service worker 推給頁面的狀態。
 *
 * 為什麼需要一個 store 而不是各自 useState：離線標示要出現在角色頁首、
 * 各分頁與空狀態等好幾個地方，而訊息來源只有一個（SW 的 postMessage）。
 * 讓每個元件各自訂閱 SW 訊息會裝上一堆重複的 listener。
 */
type State = {
  /** 目前顯示的內容是否來自離線回退。 */
  offline: boolean;
  /** 該份快取寫入的時間（ISO 字串）；null＝不知道或不適用。 */
  cachedAt: string | null;
  /** 有新版已下載完成、等待使用者確認套用。 */
  updateReady: boolean;
};

type Actions = {
  setOnline: () => void;
  setOffline: (cachedAt: string | null) => void;
  setUpdateReady: (ready: boolean) => void;
};

export const usePwaStore = create<State & Actions>((set) => ({
  offline: false,
  cachedAt: null,
  updateReady: false,

  setOnline: () => set({ offline: false, cachedAt: null }),
  setOffline: (cachedAt) => set({ offline: true, cachedAt }),
  setUpdateReady: (updateReady) => set({ updateReady }),
}));

/** SW 送來的訊息形狀。 */
export type SwMessage =
  | { source: 'lorebook-sw'; type: 'online' }
  | { source: 'lorebook-sw'; type: 'offline'; cachedAt: string | null };

export function isSwMessage(data: unknown): data is SwMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === 'lorebook-sw'
  );
}
