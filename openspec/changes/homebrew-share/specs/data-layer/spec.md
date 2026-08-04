## ADDED Requirements

### Requirement: token 存取模型的資料表
使用者資料表 SHALL 預設採 own-row RLS 存取模型（`auth.uid() = user_id`）並 `revoke all from anon`。`shared_homebrew` SHALL 為此慣例的**明確例外**：其 `select` 以持有不可猜 token 為條件而非以擁有者為條件，並開放 `anon`。

採用 token 存取模型的資料表 SHALL 滿足全部以下條件：

- 主鍵為密碼學安全隨機值（至少 128-bit），SHALL NOT 由業務資料推導
- 僅存放使用者主動發布的快照，SHALL NOT 存放使用者的私有工作資料
- `select` policy 除 token 相等外，SHALL 檢查未撤銷狀態
- `insert` 與撤銷用的 `update` SHALL 限於 `owner_id = auth.uid()`
- SHALL NOT 開放任何無 token 的查詢路徑（依 `owner_id`、`created_at`、`kind` 等欄位的列舉查詢）

新增此類資料表 SHALL 於 migration 註解與規格中明文其存取模型與偏離 own-row 慣例的理由。

#### Scenario: 以 token 取單筆
- **WHEN** 任一角色（anon 或 authenticated）以有效且未撤銷的 token 查詢 `shared_homebrew`
- **THEN** 回傳該筆資料

#### Scenario: 無 token 無法取得任何列
- **WHEN** 未指定 token 而查詢 `shared_homebrew`（或以 `owner_id`、`kind` 等條件查詢）
- **THEN** 回傳空結果

#### Scenario: 撤銷後不可讀
- **WHEN** 以 `revoked_at` 非 null 的 token 查詢
- **THEN** 回傳空結果

#### Scenario: 僅擁有者可發布與撤銷
- **WHEN** 非擁有者嘗試新增或修改某筆 `shared_homebrew`
- **THEN** 遭 RLS 拒絕
