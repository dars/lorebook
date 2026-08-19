## ADDED Requirements

### Requirement: 使用者資料表的主鍵形狀
所有以客戶端產生 id 的使用者資料表 SHALL 以 `(user_id, id)` 為主鍵，SHALL NOT 以 `id` 單獨為主鍵。

理由為跨使用者的 id 撞號防護：客戶端產生的 id 不保證全域唯一（既有資料含以時間戳產生者），全域主鍵下的撞號會使第二個使用者的寫入直接失敗，且該失敗僅在特定使用者身上出現，難以在開發階段發現。

既有 id 值 SHALL 原樣保留，不因主鍵形狀調整而變更。

#### Scenario: homebrew 表主鍵對齊
- **WHEN** 檢視 `user_backgrounds` 與 `user_subclasses` 的主鍵定義
- **THEN** 兩者皆為 `(user_id, id)`，與 `user_characters` 一致

#### Scenario: 不同使用者可持有相同 id
- **WHEN** 兩位使用者的自訂內容恰有相同的 id 值
- **THEN** 兩筆資料列皆可存在，寫入皆成功

#### Scenario: 既有 id 不變
- **WHEN** 主鍵形狀調整後檢視既有資料列
- **THEN** 其 id 值與調整前完全相同

### Requirement: token 存取模型的資料表
使用者資料表 SHALL 預設採 own-row RLS 存取模型（`auth.uid() = user_id`）並 `revoke all from anon`。分享用的指標表 SHALL 為此慣例的**明確例外**，但其例外形式 SHALL 為「表本身完全不可讀，存取一律經 `SECURITY DEFINER` 函式」，SHALL NOT 為「放寬 select policy 讓表本身可讀」。

採用 token 存取模型的資料表 SHALL 滿足全部以下條件：

- token 為密碼學安全隨機值（至少 128-bit），SHALL NOT 由業務資料推導
- 表本身對 `anon` 與 `authenticated` 皆 `revoke all`
- 存取函式以 token 為唯一參數，SHALL NOT 接受任何可影響查詢範圍的參數
- 存取函式 SHALL NOT 回傳 `owner_id` 或任何可用於發現其他分享的資訊
- 存取函式 SHALL 區分並回傳「不存在／已撤銷／來源已刪除／正常」四種狀態
- 建立與撤銷 SHALL 限於 `owner_id = auth.uid()`
- SHALL NOT 存在任何無 token 的查詢路徑（依 `owner_id`、`created_at`、`kind` 等欄位的列舉查詢）

新增此類資料表 SHALL 於 migration 註解與規格中明文其存取模型與偏離 own-row 慣例的理由。

#### Scenario: 表本身不可讀
- **WHEN** 以 anon 或 authenticated 身分直接查詢 `homebrew_shares`
- **THEN** 遭拒絕，無法取得任何列

#### Scenario: 以函式取單筆
- **WHEN** 任一角色（anon 或 authenticated）以有效且未撤銷的 token 呼叫 `get_shared_homebrew`
- **THEN** 回傳 `ok` 狀態與該內容當下的資料

#### Scenario: 撤銷與刪除可區分
- **WHEN** 以已撤銷的 token 呼叫存取函式
- **THEN** 回傳 `revoked` 狀態
- **WHEN** 以來源已刪除的 token 呼叫存取函式
- **THEN** 回傳 `deleted` 狀態

#### Scenario: 僅擁有者可發布與撤銷
- **WHEN** 非擁有者嘗試新增或修改某筆 `homebrew_shares`
- **THEN** 遭 RLS 拒絕

### Requirement: 分享指標表存放指標而非內容
分享用的資料表 SHALL 僅存放指向來源內容的識別資訊（`owner_id`、`kind`、來源 id），SHALL NOT 存放內容本體的副本。

內容 SHALL 於存取時自來源表即時取得，使作者對來源的修改立即反映於已發出的分享。

#### Scenario: 指標表不含內容
- **WHEN** 檢視 `homebrew_shares` 的欄位定義
- **THEN** 不含存放內容本體的欄位

#### Scenario: 來源修改立即反映
- **WHEN** 作者修改來源內容後，他人以既有 token 取回
- **THEN** 取回的是修改後的內容
