## ADDED Requirements

### Requirement: homebrew 內容表沿用單一文件模式
使用者自產內容（homebrew）的資料表 SHALL 一律沿用 `user_characters` 建立的文件模式，SHALL NOT 每種型別自創結構：

- 客戶端產生的 `id text primary key`
- `user_id uuid not null default auth.uid()`，`references auth.users (id) on delete cascade`
- 清單用提升欄位（至少 `name`），完整內容存於 `data jsonb`
- `created_at` / `updated_at`（`updated_at` 由共用的 `set_updated_at()` trigger 維護，不信客戶端時鐘）
- 刪除採 `deleted_at` 軟刪除 tombstone，避免多裝置下被復活
- 四條 own-row RLS policy（`(select auth.uid()) = user_id`），`grant` 限 `authenticated`、`revoke all from anon`

`user_species` SHALL 依此模式建立，與既有的 `user_backgrounds` 一致。

#### Scenario: 新 homebrew 型別沿用模式
- **WHEN** 新增 `user_species` 表
- **THEN** 其欄位、trigger、RLS 政策與 `user_backgrounds` 一致

#### Scenario: 僅本人可存取
- **WHEN** 非擁有者（含 anon）查詢 homebrew 內容表
- **THEN** 回傳空結果或遭拒

#### Scenario: 軟刪除不影響既有角色
- **WHEN** 某筆 homebrew 內容被標記 `deleted_at`
- **THEN** 以其建立的角色卡不受影響（角色為建卡時快照）
