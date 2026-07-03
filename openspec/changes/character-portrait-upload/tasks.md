# Tasks: character-portrait-upload

## 1. 儲存基礎

- [x] 1.1 Storage migration：建 `portraits` bucket（public read）+ 寫入 policies（僅本人目錄 `{uid}/…`），以 `supabase db query --linked` 執行並驗證（anon 不可寫、authenticated 只能寫自己目錄）
- [x] 1.2 `Character` 模型加 `portraitUrl`（`@Default('')`），build_runner 重新產生

## 2. 服務與相依

- [x] 2.1 加 `image_picker` 相依；iOS `Info.plist` 加 `NSPhotoLibraryUsageDescription`
- [x] 2.2 `PortraitService`（pick 長邊 1024/quality 85、upload upsert + 公開 URL + 版本 query、remove）；未登入擲 DataException

## 3. UI

- [x] 3.1 建角基本步驟：角色圖區塊可點選圖、`Image.memory` 即時預覽；`_create()` 建立後上傳並更新 portraitUrl（失敗提示不阻擋）；確認頁預覽帶入暫存圖
- [x] 3.2 總覽 tab 立繪區塊（hero）：角色圖為背景、右上編輯鈕（無圖直接上傳、有圖彈更換/移除）；經 currentCharacterProvider 更新（沿用 debounce 同步）
- [x] 3.3 共用 `CharacterAvatar` widget（圖 → NetworkImage、失敗/無圖 → 字首），`CharacterHeader` 與角色選擇卡改用

- [x] 3.4 立繪取景數學層（cover 基準/邊界夾住/正反解，含單元測試）與 Character 取景欄位（portraitScale/CenterX/Y，隨 jsonb 同步）
- [x] 3.5 取景互動：編輯選單「調整圖片位置」→ InteractiveViewer（1×–4×、邊界夾住）、完成/取消；scrim 與文字層放行手勢；換圖重置取景

## 4. 驗證

- [x] 4.1 `flutter analyze` 零警告、`flutter test` 全過
- [x] 4.2 實機：建角選圖 → 預覽 → 建立 → 頁首/選擇卡顯示圖 → 另一裝置（或重啟）同步可見
- [x] 4.3 實機：總覽頁更換（舊圖快取失效）與移除（回佔位/字首）；Storage 檔案確認覆蓋/刪除
- [x] 4.4 未登入/離線：選圖可預覽、上傳提示失敗、建角不受阻
