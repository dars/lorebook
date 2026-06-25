## 1. 資料模型

- [x] 1.1 `Character` 新增 `@Default(8) int hitDieFaces`、`@Default(0) int hitDiceUsed`；加衍生 getter `hitDiceTotal`(=level)、`hitDiceRemaining`
- [x] 1.2 mock 設值：法師 `hitDieFaces: 6`、野蠻人 `hitDieFaces: 12`（初始 `hitDiceUsed` 視需要）
- [x] 1.3 執行 `build_runner` 重生 freezed

## 2. 狀態方法

- [x] 2.1 `useHitDie()`：剩餘>0 時 `hitDiceUsed +1`（純標記，不擲骰、不改 HP）
- [x] 2.2 `longRest()` 加回半生命骰：`hitDiceUsed -= max(1, level ~/ 2)`（夾 0~level）

## 3. UI

- [x] 3.1 短休 bottom sheet 生命骰列：顯示 `d{faces}` + 剩餘/總數（改讀 `character.hitDieFaces`）
- [x] 3.2 「花 1 顆」按鈕 → `useHitDie()`（剩餘 −1）；剩餘 0 時顯示「已用盡」停用

## 4. 驗證

- [x] 4.1 `flutter analyze` 無錯誤
- [x] 4.2 實機驗證：花生命骰使剩餘遞減、App 不改 HP、用盡停用
- [x] 4.3 實機驗證：長休後生命骰回復一半
- [x] 4.4 驗證手機與平板版型呈現正常
