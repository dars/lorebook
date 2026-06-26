## Why

`character-visual` 已統一英雄卡、分頁與區段標頭，但**各分頁的內容元件（卡片/列）本身**仍有不一致與可精煉處：屬性盾牌的高亮用偏紫的 `primaryDark`（與金色主題不搭）、戰鬥數值與基本資訊的金色強調不一、技能/裝備列密度可再收。本變更聚焦內容元件的一致性與密度。

## What Changes

- **基本資訊網格**：精煉欄位排版（標籤/值層級更清楚、分隔更輕、密度一致）。
- **戰鬥數值卡片**：Speed/Prof/Perc/DC 四格統一樣式——數值金色強調、加小 icon、卡片風格與全 app 一致。
- **各分頁卡片/列**：
  - **屬性盾牌**：高亮（施法屬性）由 `primaryDark`（紫）改 **金色**，與主題一致。
  - 技能列、裝備列、財富列：密度與視覺對齊全 app 的金色/暗黑語言。
- **屬性頁新增「豁免」區段**：在 ABILITIES 與 SKILLS 之間，加一個 SAVING THROWS 豁免 區段（`CollapsibleSection`），列出六項豁免加值（能力調整值 +（熟練則 +熟練加值）），熟練者金色標示。屬參考總覽，與行動頁 Checks 的豁免分頁（跑團擲骰用）互補。

## Impact

- **程式碼**：`tabs/overview_tab.dart`（`_InfoGrid`、`_StatCards`）、`widgets/ability_shield.dart`（高亮金色）、`widgets/info_field.dart`、`tabs/abilities_tab.dart`（技能列 + **新增豁免區段**）、`tabs/inventory_tab.dart`（裝備/財富列）。
- **能力**：character-management「總覽頁」「屬性頁」（含新增豁免）「物品頁」內容元件視覺一致與密度。
- **資料**：豁免加值由既有 `abilityScores`（含 `proficientSave`）與 `proficiencyBonus` 計算，不改模型。
- **範圍界線**：不改資料、不改互動、不動英雄卡/分頁/區段（已於 character-visual 完成）。
- **相依套件**：不新增。
