# Proposal: create-spell-selection

## Why

依 D&D 2024 規則，12 個職業中有 8 個在 1 級即會施法（吟遊詩人、牧師、德魯伊、術士、邪術師、法師，以及 2024 版改為 1 級施法的聖騎士、遊俠），建角時必須選擇戲法與一環法術。目前建角流程（基本 → 職業 → 背景 → 能力值 → 技能 → 確認）完全沒有法術步驟，施法職業建出來的角色法術欄位是空的，玩家得不到可用的角色卡。內容庫（Supabase `v_spells`）與 5etools 渲染器已就緒，正好作為法術選擇器的資料與顯示地基。

## What Changes

- 建角流程在「技能」與「確認」之間新增**「法術」步驟**；非施法職業自動跳過（步驟指示器同步隱藏該步）
- 法術步驟分兩區：**戲法**（選 N 個 0 環）與**一環法術**（選 M 個 1 環），N/M 依職業的 2024 規則數量；清單來自內容庫 `v_spells`（依職業英文名 + 環數過濾），點擊法術可展開完整中文描述（5etools 渲染器）
- `kClasses`（`character_creation_data.dart`）新增 2024 施法機制常數：戲法已知數、一環準備數、1 級法術位數（純規則數值，不涉版權文字）
- 確認步驟顯示所選法術清單；建立的 `Character` 帶入 `cantrips` / `spells` / `spellSlots` / `spellDc` / `spellAttack`（後兩者由施法屬性與熟練加值推導，現有流程已算）
- 內容庫離線（未登入 / 無網路）時法術步驟顯示降級提示，允許跳過並完成建角（之後可於法術頁補選——補選功能不在本次範圍）

## Capabilities

### New Capabilities

- `spell-catalog`: 內容庫法術查詢能力——依職業（英文名）與環數過濾 `v_spells`、法術完整描述之 5etools 標記渲染。程式碼（CatalogRepository / FtEntriesView）已存在但尚無 spec，本次以建角情境正式納入規格。

### Modified Capabilities

- `character-management`: 「新增角色（簡化版）」requirement 的流程步驟由 6 步改為含法術的 7 步（施法職業）/ 維持 6 步（非施法職業）；新增法術選擇的行為要求與建立結果要求（角色帶法術與法術位）。

## Impact

- **資料層**：僅讀取「靜態遊戲資料」（Supabase 內容庫 `v_spells` view，anon 唯讀）；不新增資料表、不動 RLS。角色卡資料層沿用既有 `user_characters` 同步（法術存於 `data jsonb` 內，無 schema 變更）。不涉及 Campaign / Realtime。
- **程式碼**：`character_create_page.dart`（新步驟 + 步驟索引邏輯）、`character_creation_data.dart`（施法常數）、複用 `features/catalog`（repository / provider / renderer，必要時加 family provider 參數）
- **版型**：手機與平板皆受影響；法術清單為單欄 list（既有建角版型慣例），平板寬度下維持置中 maxWidth 版型，無需獨立平板版
- **相依**：無新第三方套件
- **已知取捨**：內容庫為 2014 版資料（無 XPHB），職業法術表與 2024 有出入——沿用既定決策「先不管 2024 落差」；戲法/準備數量常數採 2024 數值
