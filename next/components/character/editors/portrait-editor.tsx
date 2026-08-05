'use client';

import { useRef, useState } from 'react';

import { EditorSheet } from '@/components/ui/editor-sheet';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';
import { createClient } from '@/lib/supabase/client';

/**
 * 立繪上傳，對照 Flutter 端的 `PortraitService`。
 *
 * 儲存慣例照搬：`portraits/{user_id}/{character_id}.jpg`，**覆蓋制**；
 * 公開讀 bucket。固定路徑代表 CDN 會快取舊圖，因此回傳的 URL 帶版本參數。
 *
 * 上傳前在瀏覽器端壓到 1024px 寬的 JPEG：手機拍的原圖動輒數 MB，直接上傳
 * 會讓每次載入角色卡都拖著它。Flutter 端由 image_picker 的 maxWidth 處理，
 * web 沒有等價選項，改用 canvas。
 */
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.85;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('影像處理失敗'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('未登入，無法上傳');

      const blob = await compress(file);
      const path = `${user.id}/${c.id}.jpg`;

      const { error: upErr } = await supabase.storage
        .from('portraits')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data } = supabase.storage.from('portraits').getPublicUrl(path);
      // 固定路徑覆蓋制：版本參數讓 CDN 與瀏覽器快取失效。
      characterActions.setPortrait(`${data.publicUrl}?v=${Date.now()}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.storage.from('portraits').remove([`${user.id}/${c.id}.jpg`]);
      }
      characterActions.setPortrait('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorSheet open={open} title="角色圖" onClose={onClose}>
      <p className="text-[12px] leading-relaxed text-text-secondary">
        建議使用直式圖片（4:5）。上傳前會自動縮到 1024px 寬並轉為 JPEG——
        原圖動輒數 MB，那會讓每次開角色卡都拖著它。
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="min-h-11 rounded-card border border-gold bg-gold/10 text-[13px] font-bold text-gold disabled:opacity-40"
        >
          {busy ? '處理中…' : c.portraitUrl ? '更換圖片' : '選擇圖片'}
        </button>
        {c.portraitUrl && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="min-h-11 rounded-card border border-border text-[13px] text-text-secondary disabled:opacity-40"
          >
            移除圖片
          </button>
        )}
      </div>

      <div className="mt-5">
        <div className="font-label mb-1.5 text-[10px] tracking-[1.5px] text-section-label">
          取景
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[12px] text-text-secondary">縮放</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={c.portraitScale}
            onChange={(e) =>
              characterActions.setPortraitFraming({ scale: Number(e.target.value) })
            }
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="w-12 shrink-0 text-[12px] text-text-secondary">水平</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={c.portraitCenterX}
            onChange={(e) =>
              characterActions.setPortraitFraming({ x: Number(e.target.value) })
            }
            className="flex-1"
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="w-12 shrink-0 text-[12px] text-text-secondary">垂直</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
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
