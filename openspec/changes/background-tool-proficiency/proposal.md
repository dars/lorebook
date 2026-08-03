## Why

2024 版的每個背景都給**一項工具熟練**（士兵給遊戲組、賢者給書法用具之類），但這個欄位在 App 裡**完全不存在**——不只是自訂背景沒有，`BackgroundOption` 從一開始就只建模了「能力值加值候選、固定技能、起源專長」三件事，內建 4 個背景也都沒有工具資料。角色卡上同樣沒有任何工具熟練的欄位。

結果是玩家用 App 建完角，得另外找地方記自己有哪項工具熟練。這不影響任何既有計算（工具熟練不參與 AC、攻擊或技能檢定的推導），純粹是背景這個資料模型不完整，而且**自訂背景的編輯頁因此少了一個規則明文要求的欄位**——使用者照 PHB 建的背景，在 App 裡填不完整。

## What Changes

- `BackgroundOption` 與 `CustomBackground` 各新增工具熟練欄位；內建 4 個背景補上 SRD 的工具資料
- 自訂背景編輯頁新增工具選擇（自內容庫 `items` 表的工具類項目選取，非自由填空）
- `Character` 新增工具熟練欄位，建角時自背景帶入
- 角色卡呈現工具熟練（位置待 design 決定；語言目前在傳記頁，工具性質相近）
- 既有角色一次性回填：依背景名自內建清單補齊，查無者留空

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `character-management`: 背景的資料模型新增工具熟練；建角帶入；角色卡呈現
- `custom-backgrounds`: 自訂背景新增工具熟練欄位與其選擇介面

## Impact

**資料層分類**：影響「角色卡資料」與 homebrew（自訂背景）。`user_backgrounds` 與 `user_characters` 皆為文件模式（`data jsonb`），新增欄位**不需要 migration**。

**程式碼影響**：

- `lib/features/character/domain/character_creation_data.dart`：`BackgroundOption` 加欄位、內建 4 個背景補資料
- `lib/features/character/domain/custom_background.dart`：`CustomBackground` 加欄位、`toBackgroundOption()` 轉接
- `lib/features/character/domain/character.dart`：新增工具熟練欄位 ＋ 回填函式
- `lib/features/character/presentation/custom_background_edit_page.dart`：工具選擇介面
- `lib/features/character/presentation/character_create_page.dart`：建角時帶入
- 角色卡顯示點（傳記頁或屬性頁，見 design）

**內容庫**：工具清單取自 `items` 表——已確認該表含工具類項目（修理工具、骰子套組、易容工具、草藥工具、文書偽造工具等）。需確定以哪個欄位篩選工具類，並處理離線降級。

**Non-Goals（本 change 不做）**：
- **背景的起始裝備**：2024 背景另給一組起始裝備選項，牽涉 `Equipment` 與購買流程，範圍大得多，另案處理
- **工具熟練的機制效果**：僅記錄與顯示，不參與任何檢定推導（與現行技能熟練不同，工具熟練在規則上多為情境判定）
- **職業／種族給的工具熟練**：本 change 只處理背景這條來源
