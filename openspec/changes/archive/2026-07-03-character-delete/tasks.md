# Tasks: character-delete

## 1. 刪除流程

- [x] 1.1 `_CharacterCard` 加 `onLongPress`，長按彈確認對話框（角色名 + 不可逆提示 + 取消/紅色刪除鈕）
- [x] 1.2 刪除執行：`await softDelete(id)` 成功 → `remove(id)`；擲例外 → SnackBar「刪除失敗」且本地不動；進行中按鈕忙碌狀態防重複觸發
- [x] 1.3 刪除當前選取角色時 `selectedCharacterIdProvider` 清為 null

## 2. 驗證

- [x] 2.1 `flutter analyze` 零警告、`flutter test` 全過
- [x] 2.2 模擬器 e2e：刪除測試角色（如 DDD/格魯克）→ 清單即時消失 → 查 DB `deleted_at` 已設 → hot restart 後清單不復活
- [x] 2.3 模擬器：刪除當前選取角色 → 選取清除、停留選擇頁
- [x] 2.4 刪到清單為空 → 空狀態顯示正常
