## 1. 屬性盾牌高亮金色

- [x] 1.1 `AbilityShield` 高亮（施法屬性）由 `primaryDark` 改 `accentGold`（描邊/填色/數值色）

## 2. 戰鬥數值卡片

- [x] 2.1 `_StatCards` 四格數值改金色強調、各格加小 icon、間距收斂、金色/暗黑一致

## 3. 基本資訊網格

- [x] 3.1 `_InfoGrid` / `InfoField` 精煉：標籤/值層級、分隔更輕、密度一致

## 4. 屬性頁豁免區段

- [x] 4.1 `abilities_tab` 於 ABILITIES 與 SKILLS 間新增 `CollapsibleSection`（SAVING THROWS 豁免）：六項豁免 2 欄精簡列、熟練金色
- [x] 4.2 豁免加值＝能力調整值 +（proficientSave ? proficiencyBonus : 0）

## 5. 技能 / 裝備 / 財富列

- [x] 5.1 技能列 `_SkillRow` 密度收斂、熟練金色維持
- [x] 5.2 裝備列、財富列對齊金色/暗黑語言與間距
- [x] 5.3 修正 `EntryCard` 外框被內層 ClipRRect 蓋掉（改 `DecorationPosition.foreground`），法術/武器卡恢復外框（全 app EntryCard 一致）

## 6. 驗證

- [x] 6.1 `flutter analyze` 無錯誤
- [x] 6.2 實機驗證：屬性盾牌金色高亮、豁免區段正確、戰鬥數值金色+icon、資訊格與各列一致且無溢出
- [x] 6.3 驗證手機與平板版型呈現正常
