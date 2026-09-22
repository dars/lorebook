## ADDED Requirements

### Requirement: `user_spells` 沿用 homebrew 文件模式
`user_spells` SHALL 依 homebrew 內容表的單一文件模式建立（見 `custom-species` 對該模式的定義），與既有的 `user_backgrounds`／`user_subclasses`／`user_species` 一致。

新表 SHALL 一開始就採既有表**事後補正後**的形狀，SHALL NOT 重走一次「先做錯再修」：

- 主鍵為複合主鍵 `(user_id, id)`（既有兩表於 0007 補正）
- 自建表即含 `source_token`／`source_updated_at`／`source_note` 三欄，記錄收藏他人分享時的副本來歷（既有兩表於 0007 補正）
- `source_token` SHALL NOT 為外鍵——來源刪除不影響副本

SHALL 另建 `(user_id, source_token)` 的部分索引（`where source_token is not null`），供「這個 token 我是不是已經收過了」的查詢。

#### Scenario: 新表形狀與既有 homebrew 表一致
- **WHEN** 建立 `user_spells`
- **THEN** 欄位、`set_updated_at()` trigger、四條 own-row RLS policy、`grant` 與 `revoke` 皆與 `user_species` 一致

#### Scenario: 匿名角色無權存取
- **WHEN** 以匿名 key 讀取或寫入 `user_spells`
- **THEN** 遭拒（`revoke all from anon` 比 RLS 過濾更早擋下，連空陣列都不會回）

### Requirement: 分享 RPC 新增型別只加分支不改形狀
homebrew 分享的 definer 函式 SHALL 以新增一支型別分支的方式支援新型別，SHALL NOT 改變回傳形狀、SHALL NOT 引入動態 SQL、SHALL 維持 `search_path = ''`。

新型別 SHALL 同步加入 `homebrew_shares.kind` 的 check 約束。函式因 `create or replace` 不接受部分更新，SHALL 全文重貼。

來源查無（軟刪除）與型別不認得 SHALL 回傳同一種狀態——對檢視者是同一件事：這個連結現在給不出內容。

#### Scenario: 法術型別可分享
- **WHEN** 以自創法術的 token 呼叫分享 RPC
- **THEN** 回傳 `ok` 與該法術的 `data` 及來源 `updated_at`

#### Scenario: 來源已軟刪除
- **WHEN** 擁有者刪除該自創法術後，檢視者開啟連結
- **THEN** 回傳 `deleted`，不洩漏擁有者資訊
