'use client';

import { useCallback, useState } from 'react';

/**
 * 量測**容器自己**的寬度，對照 Flutter 的 `LayoutBuilder`。
 *
 * 為什麼不是 media query：主從式的門檻問的是「這個面板有沒有 700px」，
 * 不是「視窗有沒有 700px」。面板限寬 1100 但視窗 1800 時，用視窗判斷會在
 * 面板只有 550px 時就切成兩欄，兩欄各剩 270px——正是實測踩到的狀況。
 *
 * 回傳 ref callback 與寬度；未掛載前寬度為 0（視為窄版）。
 */
export function useContainerWidth(): [(el: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(0);

  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
