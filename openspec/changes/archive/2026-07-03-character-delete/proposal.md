# Proposal: character-delete

## Why

角色選擇頁目前只能新增、不能刪除：spec 已載明「刪除角色」requirement，資料層也已就緒（雲端 `user_characters` 支援軟刪除 tombstone、本地清單有 `remove`），但 UI 完全沒有刪除入口——建錯的角色（如測試角色 DDD）會永遠留在清單裡。角色同步上線後清單來自雲端，刪不掉的角色會跨裝置持續出現，需求變得實際。

## What Changes

- 角色選擇頁的角色卡片支援**長按**觸發刪除，彈出確認對話框（顯示角色名，不可逆提示）
- 確認後：已登入時先呼叫雲端軟刪除（`deleted_at` tombstone），成功才移除本地清單；失敗顯示錯誤提示且不移除（避免雲端清單下次載入時「復活」）。未登入/離線模式僅移除本地
- 刪除的角色若為**當前選取角色**：清除選取狀態，停留在選擇頁
- 刪除後清單即時刷新；刪到清單為空時顯示既有空狀態

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `character-management`: 「刪除角色」requirement 由僅確認對話框，擴充為完整行為——長按觸發、雲端軟刪除與失敗處理、刪除當前角色的選取清除、離線行為。

## Impact

- **資料層**：角色卡資料（`user_characters`）——沿用既有軟刪除欄位與 RLS（own delete policy 已存在但本設計用 UPDATE `deleted_at`，走 own update policy），**無 schema 變更、無 migration**。不涉及靜態內容快取與 Campaign / Realtime
- **程式碼**：`character_select_page.dart`（長按 + 確認對話框 + 刪除流程）、`character_providers.dart`（`remove` 既有）、`CharacterSyncRepository.softDelete`（既有，首次接上 UI）
- **版型**：手機與平板皆為同一互動（長按卡片），無獨立平板版型需求
- **相依**：無新套件
- **已知取捨**：v1 不提供「還原已刪除角色」UI；tombstone 保留於雲端，未來可做還原或定期清理
