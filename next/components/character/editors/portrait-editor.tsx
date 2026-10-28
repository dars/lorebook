'use client';

import { useRef, useState } from 'react';

import { EditorSheet } from '@/components/ui/editor-sheet';
import { removePortrait, uploadPortrait } from '@/lib/characters/portrait';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 立繪上傳的面板。壓縮與儲存慣例在 `lib/characters/portrait.ts`，
 * 與建角流程共用同一份。
 */

export function PortraitEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!c) return null;

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      characterActions.setPortrait(await uploadPortrait(c.id, file));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await removePortrait(c.id);
      characterActions.setPortrait('');
      onClose();
    } catch (e) {
      // 原本沒有 catch：離線按「移除」會靜靜什麼都不發生，圖還在，
      // 使用者不知道發生什麼事，主控台則多一個 unhandled rejection。
      setError(e instanceof Error ? e.message : '移除失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorSheet open={open} title="角色圖" onClose={onClose}>
      <p className="text-small leading-relaxed text-text-secondary">
        建議使用直式圖片（4:5）。上傳前會自動縮到 1024px 寬並轉為 JPEG——
        原圖動輒數 MB，那會讓每次開角色卡都拖著它。
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        aria-label="選擇角色圖檔"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />

      {error && (
        <p role="alert" className="mt-3 text-ui text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="min-h-11 rounded-card border border-gold bg-gold/10 text-ui font-bold text-gold disabled:opacity-40"
        >
          {busy ? '處理中…' : c.portraitUrl ? '更換圖片' : '選擇圖片'}
        </button>
        {c.portraitUrl && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="min-h-11 rounded-card border border-border text-ui text-text-secondary disabled:opacity-40"
          >
            移除圖片
          </button>
        )}
      </div>

      <div className="mt-5">
        <div className="font-label mb-1.5 text-eyebrow tracking-[1.5px] text-section-label">
          取景
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-small text-text-secondary">縮放</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            aria-label="取景縮放"
            value={c.portraitScale}
            onChange={(e) =>
              characterActions.setPortraitFraming({ scale: Number(e.target.value) })
            }
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="w-12 shrink-0 text-small text-text-secondary">水平</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            aria-label="取景水平"
            value={c.portraitCenterX}
            onChange={(e) =>
              characterActions.setPortraitFraming({ x: Number(e.target.value) })
            }
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="w-12 shrink-0 text-small text-text-secondary">垂直</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            aria-label="取景垂直"
            value={c.portraitCenterY}
            onChange={(e) =>
              characterActions.setPortraitFraming({ y: Number(e.target.value) })
            }
            className="flex-1"
          />
        </div>
      </div>
    </EditorSheet>
  );
}
