## Why

`Character.languages` 在建角時寫入後，**全 App 沒有任何地方能改**。冒險中學會一門新語言——休息期訓練、劇情獎勵、專長——都記不了。

現況只能寫進傳記頁的「背景故事」自由文字，但那樣它不會出現在傳記頁的語言列，跑團時要自己記得。

## What Changes

- 傳記頁「FEATURES & TRAITS 特長」區段的語言列加編輯入口，可增刪
- 語言選項以 App 內建的 SRD 語言清單為主，並允許自訂輸入（戰役專屬語言、自創族群的語言）
- 語言清單為純字串，不產生任何機制效果

## Capabilities

### Modified Capabilities
- `character-management`: 語言由「僅建角時決定」改為可於角色卡增刪

## Impact

**資料層分類**：角色卡資料。`Character.languages` 欄位已存在，**無 migration、無新欄位**。

**程式碼影響**：

- 新增內建語言清單常數（SRD 5.2 的標準與稀有語言）
- `lib/features/character/presentation/tabs/biography_tab.dart`：語言列加編輯入口
- 新增編輯 sheet（沿用既有的 `editor_sheet.dart` 慣例）
- `CurrentCharacterNotifier`：增刪語言的方法

**與 `tool-proficiency-editing` 的關係**：兩者是同一類問題（冒險中取得、但只能在建角決定），且**共用傳記頁的同一個編輯入口**。先落地者建立該入口，後者接進去——實作順序需協調，否則會做出兩個並列的編輯按鈕。

兩者刻意分成獨立 change 的差異在資料來源：**工具有內容庫可查**（`items` 表，38 項依類別分組），**語言沒有**（內容庫無語言表，需在 App 內建清單）。

**Non-Goals**：
- 語言的機制效果（能否讀寫、方言差異等）
- 語言目錄進內容庫——那是內容匯入管線的事
- 專長／職業給予語言的自動帶入
