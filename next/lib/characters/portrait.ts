import { createClient } from '@/lib/supabase/client';

/**
 * 角色圖的壓縮與上傳，對照 Flutter 端的 `PortraitService`。
 *
 * 儲存慣例照搬：`portraits/{user_id}/{character_id}.jpg`，**覆蓋制**；
 * 公開讀 bucket。固定路徑代表 CDN 會快取舊圖，因此回傳的 URL 帶版本參數。
 *
 * 抽成模組是因為有兩個使用者：建角流程（建立時上傳）與角色卡的立繪編輯器。
 * 壓縮參數若兩邊各寫一份，改了其中一邊就會產出兩種尺寸的圖。
 */
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.85;

/**
 * 上傳前在瀏覽器端壓到 1024px 寬的 JPEG：手機拍的原圖動輒數 MB，直接上傳
 * 會讓每次載入角色卡都拖著它。Flutter 端由 image_picker 的 maxWidth 處理，
 * web 沒有等價選項，改用 canvas。
 */
export async function compressPortrait(file: File): Promise<Blob> {
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

/** 上傳並回傳可直接存進角色卡的公開 URL。失敗時 throw。 */
export async function uploadPortrait(
  characterId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('未登入，無法上傳');

  const blob = await compressPortrait(file);
  const path = `${user.id}/${characterId}.jpg`;

  const { error } = await supabase.storage
    .from('portraits')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('portraits').getPublicUrl(path);
  // 固定路徑覆蓋制：版本參數讓 CDN 與瀏覽器快取失效。
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** 刪除雲端的圖。失敗時 throw——離線按「移除」不該假裝成功。 */
export async function removePortrait(characterId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('未登入，無法移除');

  const { error } = await supabase.storage
    .from('portraits')
    .remove([`${user.id}/${characterId}.jpg`]);
  if (error) throw new Error(error.message);
}
