## 1. 狀態方法

- [x] 1.1 `CurrentCharacterNotifier.longRest()` 擴充為完整恢復：`currentHp = maxHp`、法術位 `used = 0`、職業資源 `current = max`、`tempHp = 0`、`exhaustionLevel` −1（不低於 0）

## 2. 生命骰資訊

- [x] 2.1 建立職業 → 生命骰骰面對應（本機 map，如 法師 d6；無模型變更）；數量 = 角色等級

## 3. UI

- [x] 3.1 長休：點擊 → 確認對話框 → 確認後呼叫 `longRest()`
- [x] 3.2 短休：點擊 → bottom sheet，顯示生命骰細節（`{level}d{faces}`，僅資訊）
- [x] 3.3 短休 bottom sheet：若角色具奧術恢復（features 偵測），以 `EntryCard` 呈現（可展開看敘述）
- [x] 3.4 短休 bottom sheet：「完成短休」按鈕 → `shortRest()` 後關閉

## 4. 驗證

- [x] 4.1 `flutter analyze` 無錯誤
- [x] 4.2 實機驗證：長休確認框 → 取消不動、確認後 HP/法術位/資源回滿、臨時 HP 清空、力竭 −1
- [x] 4.3 實機驗證：短休對話框顯示生命骰細節、奧術恢復可展開看敘述、完成短休回復短休資源
- [x] 4.4 驗證手機與平板版型呈現正常
