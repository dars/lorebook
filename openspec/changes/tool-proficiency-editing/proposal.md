## Why

`Character.toolProficiencies`（`background-tool-proficiency` 新增）目前**只在建角時由背景寫入**，之後沒有任何增修入口。

但工具熟練正是冒險中會取得的東西：2024 規則的休息期訓練，花時間與金錢即可換一項工具熟練——「在打鐵鋪學會鐵匠工具」就是這個。角色學到了卻記不進熟練清單，只能寫在背景故事的自由文字裡。

## What Changes

- 傳記頁「PROFICIENCIES 熟練」區段的工具列加編輯入口，可增刪
- 選項沿用既有的 `toolProficiencyOptionsProvider`（內容庫 `items` 的工具類，38 項依工匠工具／工具／遊戲組／樂器分組）
- 內容庫取用失敗時的降級：沿用自訂背景編輯頁的處理（顯示離線提示、不阻擋其他操作）

## Capabilities

### Modified Capabilities
- `character-management`: 工具熟練由「僅建角時由背景決定」改為可於角色卡增刪

## Impact

**資料層分類**：角色卡資料。`Character.toolProficiencies` 欄位已存在，**無 migration、無新欄位**。

**程式碼影響**：

- `lib/features/character/presentation/tabs/biography_tab.dart`：工具列加編輯入口
- 新增編輯 sheet，選單沿用 `toolProficiencyOptionsProvider`
- `CurrentCharacterNotifier`：增刪工具熟練的方法

**與 `language-editing` 的關係**：兩者是同一類問題，且**共用傳記頁「熟練」區段的同一個編輯入口**。先落地者建立該入口，後者接進去——實作順序需協調，否則會做出兩個並列的編輯按鈕。

差異在資料來源：**工具有內容庫可查**（本 change 直接沿用既有 provider），語言沒有。

**Non-Goals**：
- 工具熟練的機制效果（仍不參與檢定推導）
- 職業／種族給予工具熟練的自動帶入——那是 `background-tool-proficiency` 已列的 Non-Goal，屬另一條來源
- 休息期訓練的完整流程（耗時、花費、DM 核可）——本 change 只提供記錄的地方
