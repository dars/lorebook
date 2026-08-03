## Why

角色卡的「特性」清單目前有兩種格格不入的呈現，因為兩個來源的資料形狀不同：

- **職業特性**來自內容庫，`CharacterFeature` 的 `name` / `nameEn` / `description` 三欄俱全，傳記頁顯示成「名稱／英文名／說明」三層
- **種族特性**來自寫死的 `kSpecies`，`traits` 是 `List<String>`，把標題與摘要黏成一串（`'矮人堅毅 +1HP/級'`）整個塞進 `name`，`description` 永遠是空的

結果是同一份清單裡，職業特性看得到說明，種族特性只有一行「半截標題半截摘要」——而且 `biography_tab.dart` 早就寫好了 `if (features[i].description.isNotEmpty)` 的顯示分支，只是種族特性永遠觸發不到。**資訊是在建角時被黏成字串丟掉的，不是本來就沒有。**

玩家看到「石工直覺 震顫感知」不會知道那是什麼；新手尤其如此。

## What Changes

- 種族特性由單一字串改為結構化的 `SpeciesTrait`（名稱／英文名／說明）；`SpeciesOption.traits` 型別隨之改變
- 補齊內建 8 個種族約 28 條特性的中文說明
- 建角送出時，種族特性以三個欄位分別映射到 `CharacterFeature`，不再整串塞進 `name`
- **特性說明改為點擊展開**：建角種族步驟與角色頁的特性清單皆只顯示名稱，點擊才出說明；角色頁的**職業特性一併採同一互動**，不在同一份清單裡混用兩種行為
- 無說明的特性不呈現可點擊提示——這同時就是既有角色（說明為空）的降級路徑，不需要相容分支

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `character-management`: 種族特性的資料形狀由字串改為結構化條目；特性清單的說明呈現由常駐改為點擊展開，並統一套用於所有特性來源

## Impact

**資料層分類**：不涉及任何資料表。種族特性來自 App 內的常數；角色的特性快照存於 `user_characters.data` 的 jsonb 內，欄位形狀不變（`CharacterFeature` 的四個欄位本來就存在）。無 migration、無 RLS 異動、無 Realtime 異動。

**程式碼影響**：

- `lib/features/character/domain/character_creation_data.dart`：新增 `SpeciesTrait`；`SpeciesOption.traits` 由 `List<String>` 改為 `List<SpeciesTrait>`；改寫內建 8 個種族的 traits 定義並補說明（其餘機制欄位不動）
- `lib/features/character/presentation/character_create_page.dart`：種族敘述卡的特性改為點擊展開；送出時三欄映射到 `CharacterFeature`
- `lib/features/character/presentation/tabs/biography_tab.dart`：特性清單移除常駐的說明區塊，改為點擊展開（職業特性一併適用）

**既有角色**：不做回填。舊角色的特性快照為「整串在 `name`、`description` 為空」，在「無說明不給點擊」的規則下退化成與現況相同的單行呈現，畫面不會壞。使用者已確認既有角色皆為測試資料。

**版型影響**：手機與平板皆有；沿用既有 `ResponsiveLayout` 級距與 App 既有的說明彈窗慣例（決策頁的狀態異常 chip 已是點擊出說明），無新版型分支。

**相依**：無新第三方套件。

**與 `custom-species` 的關係**：該 change（自訂種族）**依賴本 change 先落地**——自訂種族的編輯頁要讓使用者填「名稱＋說明」兩欄，前提是 `SpeciesTrait` 已經存在。本 change 只處理內建種族與呈現，不涉及任何自訂內容。
