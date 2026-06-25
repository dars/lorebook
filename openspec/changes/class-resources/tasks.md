## 1. 資料模型

- [ ] 1.1 建立 `ClassResource`（freezed）：`name`、`nameEn`、`current`、`max`、`recovery`(short/long/none enum)、`display`(pips/number/dice enum)、`dieFaces`、`unit`(number 型單位，如 HP/點)
- [ ] 1.2 `Character` 新增 `@Default(<ClassResource>[]) List<ClassResource> resources`；執行 `build_runner`
- [ ] 1.3 mock：法師 `resources` 為空（無遊玩消耗職業資源；奧術恢復屬休息能力不放此處）；apply 時可暫加 1~2 筆示意（pips/number/dice）以驗證 UI

## 2. 狀態方法

- [ ] 2.1 `CurrentCharacterNotifier` 新增：`spendResource(name)`（−1，≥0）、`restoreResource(name)`（+1，≤max）、`resetResource(name)`（=max）
- [ ] 2.2 新增 `shortRest()`：回滿 `recovery == short` 的資源；`longRest()`：回滿所有資源 + `clearTempHp()`

## 3. UI

- [ ] 3.1 `resources_section.dart`：法術位之後，依 `character.resources` 動態渲染；空清單不顯示職業資源段
- [ ] 3.2 建立共用金色 pip widget（取代法術位綠水晶 `crystal_slot`）；法術位與離散職業資源共用此 pip；點一格切換消耗/回復
- [ ] 3.3 number 樣式（當前值 + 單位，左右 +/- 圓鈕調整夾 0~max，小字標上限）
- [ ] 3.4 dice 樣式（`1dN` 骰面 + 次數，次數以 +/- 調整夾 0~max）
- [ ] 3.5 `rest_section.dart`：短休按鈕接 `shortRest()`、長休按鈕接 `longRest()`

## 4. 驗證

- [ ] 4.1 `flutter analyze` 無錯誤
- [ ] 4.2 實機驗證：法術位改金色 pip 呈現；職業資源依 display 正確呈現；無資源時不顯示段落
- [ ] 4.3 實機驗證：消耗/回復夾在 0~max
- [ ] 4.4 實機驗證：短休回復短休資源（長休資源不變）、長休回復全部
- [ ] 4.5 驗證手機與平板版型呈現正常
