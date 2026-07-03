# Design: character-portrait-upload

## Context

角色資料以 `Character.toJson()` 整份存 `user_characters.data`（LWW 同步）；Supabase Storage 尚未使用。角色圖顯示點：建角基本步驟 `_PortraitPlaceholder`、確認頁 `_portraitSmall`、`CharacterHeader` 頭像、選擇卡 `CircleAvatar`（皆為姓氏字首 fallback）。專案已有 dev 帳號與 CLI link，storage migration 可直接執行。

## Goals / Non-Goals

**Goals:**
- 選圖 → 壓縮 → 上傳 → 各顯示點生效，跨裝置同步（URL 隨 jsonb 走）
- 既有角色可更換/移除
- 未登入/離線不阻擋任何流程

**Non-Goals:**
- 裁切、相機拍攝、多圖
- 已刪角色的 storage 清理（tombstone 生命週期另案）
- 圖片快取策略調校（先用 `Image.network` 內建快取）

## Decisions

### D1. Storage：公開讀 bucket + 目錄級寫入權限
`portraits` bucket `public = true`（讀取免簽名，`portraitUrl` 存公開 URL，模型與顯示零複雜度）；寫入（insert/update/delete）限 `(storage.foldername(name))[1] = auth.uid()::text`——只能動自己目錄。路徑 `{user_id}/{character_id}.jpg` 固定檔名，更換即覆蓋（upsert），不累積孤兒檔。
**捨棄方案**：私有 bucket + signed URL——URL 會過期，存進 jsonb 的連結需要刷新機制，複雜度不成比例。角色圖非敏感資料，公開讀可接受（URL 含 uuid 不可猜列舉）。
**快取注意**：固定檔名 + 公開 URL 會被 `Image.network`/CDN 快取，更換圖後 URL 不變導致舊圖殘留——上傳後在 URL 加 `?v={timestamp}` query 存入 `portraitUrl`，強制失效。

### D2. `PortraitService`（character/data/）
封裝：`pick()`（image_picker，gallery、maxWidth 1024、quality 85）、`upload(characterId, bytes) → url`（uploadBinary upsert + publicUrl + 版本 query）、`remove(characterId)`。未登入時 upload/remove 擲 `DataException` 由 UI 降級提示。

### D3. 建角流程：先選存於記憶體、建立後上傳
基本步驟點角色圖 → `pick()` → `XFile` bytes 暫存 state、區塊即時預覽（`Image.memory`）。`_create()` 建立角色（id 產生）→ 若有暫存圖：`upload()` 成功後以 `portraitUrl` 更新角色並經既有 `upsert` 路徑推送；上傳失敗不阻擋建角（SnackBar 提示，之後可從傳記 tab 補傳）。
**理由**：路徑需要 character id，id 於建立時才產生；記憶體暫存避免無主檔案。

### D4. 總覽 tab 立繪區塊（hero）即角色圖
總覽 tab 的 hero 區塊（名字/職業/陣營壓字的 320 高大圖區）本就是立繪位：有圖以角色圖為背景（底部漸層 scrim 保留、文字可讀），無圖維持佔位浮水印。右上角編輯鈕：無圖點擊直接選圖上傳；有圖點擊彈 bottom sheet（更換/移除）。操作經 `currentCharacterProvider.setPortraitUrl` 更新 → 既有 debounce 同步自動推送（不經清單 upsert，避免蓋掉未推送的編輯狀態）。

### D6. 立繪取景（實作期間應使用者要求追加）
`Character` 增 `portraitScale`（1–4）與 `portraitCenterX/Y`（0–1 正規化中心），隨 jsonb 同步、跨框尺寸通用。純數學層 `portrait_transform.dart`（cover 基準 + 邊界夾住，任何合法狀態圖必填滿框）供靜態顯示與互動共用。互動：編輯選單「調整圖片位置」進入 `InteractiveViewer`（minScale 1 / maxScale 4、constrained false 邊界夾住），完成才儲存、取消丟棄；平常為靜態 Transform 顯示（避免 hero 攔截頁面捲動手勢）。scrim 與文字層 `IgnorePointer` 放行手勢；換圖時取景重置。

### D5. 顯示點統一 fallback
共用小 widget `CharacterAvatar(character, radius)`：`portraitUrl` 非空 → `CircleAvatar(backgroundImage: NetworkImage)`（載入失敗 fallback 字首），空 → 現行字首樣式。`CharacterHeader` 與選擇卡改用之；確認頁 `_portraitSmall` 以暫存 bytes 預覽。

## Risks / Trade-offs

- [公開 bucket 任何人可讀圖 URL] → 角色圖非敏感、URL 不可枚舉；接受（見 D1）
- [上傳中斷 → 角色已建立但無圖] → 建角不因圖失敗而失敗；傳記 tab 可補傳
- [image_picker 首次觸發相簿權限拒絕] → picker 回 null，UI 無動作＋提示到設定開啟
- [Image.network 無磁碟快取策略] → v1 接受；清單頭像小、流量可控

## Open Questions

- 無
