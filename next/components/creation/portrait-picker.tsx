'use client';

import { useEffect, useMemo, useRef } from 'react';

/**
 * 建角步驟一的角色圖選擇，對照 Flutter 的立繪佔位。
 *
 * **選圖時不上傳，建立角色時才上傳**（同 Flutter）。理由是角色這時還不存在：
 * 先傳會在使用者放棄建角時於 Storage 留下一個沒人指向的孤兒檔。
 * 這裡只留住 File 並用 objectURL 預覽。
 *
 * 4:5 直式，與角色卡的立繪比例一致——這裡看到的構圖就是卡片上的構圖。
 */
export function PortraitPicker({
  file,
  onPick,
}: {
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // objectURL 要在換圖與卸載時釋放，否則整段建角流程會累積好幾份 blob。
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative aspect-4/5 w-full max-w-[200px] overflow-hidden rounded-card border border-border-2 bg-surface-1 hover:border-gold"
      >
        {/* 無圖時用與角色卡同一張「未知人像」佔位圖（黑霧金瞳），不是另畫一個
            圖示——這裡看到的就是之後卡片上會長的樣子。 */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 本機 blob 與靜態佔位圖都不需要 next/image */}
        <img
          src={preview ?? '/images/unknown.jpg'}
          alt={preview ? '角色圖預覽' : ''}
          className="size-full object-cover"
        />
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-tiny text-text-light">
          {preview ? '換一張' : '尚未上傳角色圖'}
        </span>
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="選擇角色圖"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          // 清掉 value，選同一個檔案兩次也會觸發 change。
          e.target.value = '';
        }}
      />

      {file ? (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="mt-1.5 min-h-9 text-small text-text-secondary hover:text-danger"
        >
          移除
        </button>
      ) : (
        <p className="mt-1.5 text-small text-text-secondary">
          選填，建立後也能再補。
        </p>
      )}
    </div>
  );
}
