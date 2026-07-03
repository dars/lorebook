# Proposal: character-portrait-upload

## Why

角色圖目前只有佔位：建角基本步驟的「尚未上傳角色圖」區塊不能點、App 各處頭像（頁首、角色選擇卡、確認頁）都只顯示姓氏字首。角色圖是跑團角色認同感的核心元素，也是佔位文案早就承諾的功能（「尚未上傳角色圖」暗示可上傳）。雲端同步與 Supabase 基礎已就緒，補上傳能力的時機成熟。

## What Changes

- **上傳入口 ×2**（同一套選圖/上傳服務）：
  - 建角基本步驟的角色圖區塊——點擊選圖（相簿），選後即時預覽；建立角色時上傳
  - 角色頁總覽 tab 的立繪區塊（名字/職業/陣營所在的 hero 大圖區）——角色圖即為其背景，右上編輯鈕提供上傳/更換/移除（既有角色的管理入口）
- **顯示點串接**：頁首 `CharacterHeader`、角色選擇卡、建角確認頁的頭像——有圖顯示圖、無圖維持字首
- **雲端儲存**：Supabase Storage 新增 `portraits` bucket（公開讀、僅本人可寫入自己目錄），路徑 `{user_id}/{character_id}.jpg`；`Character` 模型新增 `portraitUrl` 欄位（隨既有 `data jsonb` 同步，**user_characters 無 schema 變更**）
- **影像處理**：選圖時客戶端縮至長邊 1024、JPEG 壓縮後上傳（控制流量與儲存）
- **離線/未登入**：上傳不可用時顯示提示，不阻擋建角流程
- 新相依：`image_picker`；iOS 需相簿權限描述（`NSPhotoLibraryUsageDescription`）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `character-management`: 新增「角色圖」requirement——上傳/更換/移除行為、顯示點規則、離線降級；「新增角色（簡化版）」的基本步驟 scenario 增列選圖

## Impact

- **資料層**：角色卡資料——`Character.portraitUrl`（jsonb 內，無 migration）；**Supabase Storage** 新 bucket `portraits` 與 storage RLS policies（需 migration SQL）。不涉及靜態內容快取與 Campaign
- **程式碼**：`character.dart`（欄位 + codegen）、新 `portrait_service`（選圖/壓縮/上傳/刪除）、`character_create_page.dart`（基本步驟 + 建立後上傳）、`overview_tab.dart`（立繪區塊）、`character_header.dart` 與選擇卡（顯示）
- **版型**：手機/平板同一互動
- **相依**：`image_picker`（官方套件）
- **已知取捨**：v1 不做裁切/相機拍攝；軟刪除角色的圖檔保留於 storage（隨還原機制另案清理）
