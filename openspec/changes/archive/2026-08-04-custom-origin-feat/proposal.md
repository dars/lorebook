## Why

自訂背景的起源專長目前只能自 SRD 的四個（六個變體）中選：技藝精湛、野蠻打擊、警覺、法術新手（法師／牧師／德魯伊）。我們確認過內容庫的 17 個專長裡 `category=O` 的就只有這四個——**清單已經窮盡 SRD 可用範圍**，不是漏收。

但這對「DM 為戰役設計一個背景，它的起源專長 SRD 沒有」的情況沒有出口。使用者只能硬挑一個機制不符的，然後自己記著「其實是別的」——這正是自訂背景一開始要解決的問題，只是換了個欄位重演。

完整做法是先補專長系統（ASI 等級可改選專長、專長清單消費內容庫、先決條件檢查），再讓專長成為獨立的 homebrew 型別。那個範圍大得多，且與本需求不成比例。

## What Changes

- 自訂背景的起源專長可改為**自行填寫**：名稱（必填）＋ 說明（選填），與自 SRD 候選選取二擇一
- 自訂的起源專長為**純顯示文字**，不產生任何機制效果，也不成為可被其他地方引用的專長物件
- 建角時起源專長的說明取用順序：內容庫 `feats` 表優先，查無時採自訂背景自帶的說明
- 編輯頁明示兩種模式的差別：SRD 候選有完整規則效果；自訂者僅為顯示

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `custom-backgrounds`: 起源專長由「必自 SRD 候選選取」放寬為「SRD 候選或自行填寫」，並新增說明欄位

## Impact

**資料層分類**：homebrew（自訂背景）。`user_backgrounds` 為文件模式（`data jsonb`），新增欄位**不需要 migration**。

**程式碼影響**：

- `lib/features/character/domain/custom_background.dart`：新增 `originFeatDescription`；`toBackgroundOption()` 一併帶出
- `lib/features/character/domain/character_creation_data.dart`：`BackgroundOption` 新增對應欄位（內建背景留空，其說明來自內容庫）
- `lib/features/character/presentation/custom_background_edit_page.dart`：起源專長改為「自 SRD 選取／自行填寫」二擇一，自訂時顯示名稱與說明兩欄
- `lib/features/character/presentation/character_create_page.dart`：`originFeatDetail` 查無時，改採背景自帶的說明

**既有資料**：既有自訂背景的 `originFeat` 皆為 SRD 候選之一，新欄位預設空字串，行為不變——說明仍自內容庫取得。

**內容範圍政策**：本 change **不牴觸** content-scope。該政策明文「玩家自產內容不受此限制——政策排除的是官方出版內容，非使用者內容」。使用者自行填寫的起源專長屬自產內容；App 不提供任何列舉或瀏覽他人自訂專長的介面，也不成為內容散布平台。

**與 `homebrew-share` 的關係**：自訂起源專長的定義存於背景文件內，該 change 的快照存的是整份 `CustomBackground.toJson()`，因此**分享時自動一併帶走**，不需額外處理。但其匯入驗證原訂「專長值須落在合法集合內」會擋下自訂值——已一併修正為「驗證嚴格度與手動建立對齊，不可更嚴」，否則會出現自己建得出來卻分享不出去的矛盾。

**Non-Goals**：
- **專長系統**：ASI 等級改選專長、專長清單消費內容庫、先決條件檢查——皆不在本 change
- **自訂專長成為獨立型別**：本 change 的自訂起源專長依附於該背景，不是可被其他背景或角色引用的物件。日後若做專長系統，這些文字不會自動升級為專長物件
- **機制效果**：自訂起源專長不產生任何規則效果
