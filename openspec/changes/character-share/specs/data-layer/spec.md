## ADDED Requirements

### Requirement: 授權表 ＋ definer 函式的活資料存取模型
使用者資料表 SHALL 預設採 own-row RLS 存取模型（`auth.uid() = user_id`）並 `revoke all from anon`。當需要讓非擁有者讀取**使用者的活資料**（而非已發布的快照）時，SHALL 採「授權表 ＋ `SECURITY DEFINER` 函式」模型，SHALL NOT 放寬來源資料表的 policy 或 grant。

此模型 SHALL 滿足全部以下條件：

- **授權表**本身維持 own-row RLS 並 `revoke all from anon`——授權表對外完全不可讀，非擁有者不查此表
- 授權識別碼為密碼學安全隨機值（至少 128-bit），SHALL NOT 由業務資料推導
- **讀取函式**為 `SECURITY DEFINER`，且 `set search_path = ''`、所有物件全名限定
- 函式的唯一參數為授權識別碼；SHALL NOT 接受任何可影響查詢範圍的參數（欄位選擇、篩選條件、排序）
- 函式內 SHALL NOT 使用動態 SQL，回傳形狀固定
- 函式 SHALL 於回傳前自行驗證全部失效條件（撤銷、來源列已軟刪除、不存在，以及該授權模型另行定義的其他失效條件）——RLS 不再構成第二道防線，函式即為唯一的授權判斷點
- 函式 SHALL NOT 回傳擁有者身分或授權紀錄的任何欄位
- SHALL NOT 存在任何無授權識別碼即可取得資料的路徑

新增採用此模型的資料表與函式 SHALL 於 migration 註解與規格中明文其存取模型、definer 的理由，以及偏離 own-row 慣例之處。

#### Scenario: 憑有效識別碼取回活資料
- **WHEN** 任一角色（anon 或 authenticated）以有效且未撤銷的識別碼呼叫讀取函式
- **THEN** 回傳來源列的當下內容

#### Scenario: 來源表的存取面不變
- **WHEN** anon 直接查詢來源資料表
- **THEN** 遭拒（來源表未對 anon 授予任何權限）

#### Scenario: 授權表不可被非擁有者讀取
- **WHEN** 非擁有者（含 anon）查詢授權表
- **THEN** 回傳空結果或遭拒

#### Scenario: 失效條件由函式攔截
- **WHEN** 以已撤銷，或來源列已軟刪除的識別碼呼叫函式
- **THEN** 不回傳任何來源資料

#### Scenario: 無列舉路徑
- **WHEN** 未提供識別碼，或嘗試以擁有者、時間等條件查詢
- **THEN** 無任何可回傳資料的路徑

#### Scenario: 僅擁有者可建立與撤銷授權
- **WHEN** 非擁有者嘗試新增或修改授權紀錄
- **THEN** 遭 RLS 拒絕
