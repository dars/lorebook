## 1. UI

- [x] 1.1 `movement_section.dart`：移除 `_MovementCard` 方塊，改為單列 `Row` inline 呈現
- [x] 1.2 速度／衝刺各為一組 inline（小 icon + 中文 + 數值 ft + 「N格」小字），整列 space-between（速度靠左、衝刺靠右）；速度 icon 用步行、衝刺 icon 用閃電（對齊既有 flash_on）
- [x] 1.3 視覺權重：數值為主（Cinzel 中字）、ft 與格為小字；衝刺可略淡
- [x] 1.4 沿用 CollapsibleSection 收合、保留速度/衝刺/格數計算

## 2. 驗證

- [x] 2.1 `flutter analyze` 無錯誤
- [x] 2.2 實機驗證：單列正確顯示速度/衝刺/格數、無溢出、明顯較原本精簡
- [x] 2.3 驗證手機與平板版型呈現正常
