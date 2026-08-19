## MODIFIED Requirements

### Requirement: 自訂子職的儲存與同步
自訂子職 SHALL 儲存於 `user_subclasses` 表（文件模式：客戶端產生 id、`(user_id, id)` 複合主鍵、提升欄位 `name` 與 `class_en`、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone），RLS 僅本人可存取，跨裝置同步。

資料列 SHALL 記錄其來源：`source_token` 為自他人分享收藏而來時的分享 token，自行建立者為 null；`source_updated_at` 為收藏當下來源內容的 `updated_at`；`source_note` 為收藏者自填的備註（選填）。

#### Scenario: 主鍵形狀與角色一致
- **WHEN** 檢視 `user_subclasses` 的主鍵定義
- **THEN** 為 `(user_id, id)`

#### Scenario: 撞號不致寫入失敗
- **WHEN** 兩位使用者的自訂子職恰有相同的 id 值
- **THEN** 兩筆皆可存在，寫入皆成功

## ADDED Requirements

### Requirement: 自訂子職的分享與收藏入口
自訂子職 SHALL 提供分享入口，行為依 `homebrew-share` 規格。分享入口 SHALL 僅出現於使用者自己擁有的自訂子職（含自他人分享收藏後成為自己的那一份）。

自訂子職清單 SHALL 以其備註行標示哪些項目為自他人分享收藏而來（備註留空時以空狀態文字呈現），SHALL NOT 另設泛用的來源徽章。該標示 SHALL NOT 限制編輯、刪除或再分享。

#### Scenario: 自建子職可分享
- **WHEN** 使用者檢視自己建立的自訂子職
- **THEN** 提供分享入口

#### Scenario: 收藏後亦可再分享
- **WHEN** 使用者檢視自他人分享收藏而來的自訂子職
- **THEN** 同樣提供分享入口

### Requirement: 收藏的子職併入升級選單
升級流程的子職選單 SHALL 將收藏而來的自訂子職與自建的自訂子職一視同仁：兩者皆依母職業（`class_en`）篩選後與 SRD 子職並列，並標示為自訂。

母職業不符的收藏項 SHALL NOT 出現於選單，且 SHALL NOT 因此顯示任何錯誤或說明。

#### Scenario: 母職業相符的收藏項可選
- **WHEN** 使用者收藏一份戰士子職後，為戰士角色升級至 3 級
- **THEN** 該子職出現於選單並標示為自訂
- **THEN** 其呈現與自建的自訂子職無異

#### Scenario: 母職業不符的收藏項不出現
- **WHEN** 使用者收藏一份法師子職後，為戰士角色升級至 3 級
- **THEN** 該子職不出現於選單
- **THEN** 畫面不顯示任何關於該子職的錯誤或說明

#### Scenario: 選用後快照
- **WHEN** 使用者選用一份收藏而來的自訂子職
- **THEN** 整份子職定義快照進角色卡
- **THEN** 其後刪除該收藏項，角色的後續等級升級不受影響
