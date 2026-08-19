## MODIFIED Requirements

### Requirement: 自訂背景的儲存與同步
自訂背景 SHALL 為使用者自有資料：儲存於 `user_backgrounds` 表（文件模式，比照 `user_characters`：客戶端產生 id、`(user_id, id)` 複合主鍵、提升欄位 name、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone），RLS 僅本人可存取，跨裝置同步。刪除 SHALL 經確認後執行雲端軟刪除，成功方移除本地清單。

客戶端產生的 id SHALL 為密碼學安全的隨機值，SHALL NOT 使用時間戳、序號或其他可枚舉的來源。既有以時間戳產生的資料列 SHALL 原樣保留，不需遷移——其跨使用者撞號風險由複合主鍵承擔。

資料列 SHALL 記錄其來源：`source_token` 為自他人分享收藏而來時的分享 token，自行建立者為 null；`source_updated_at` 為收藏當下來源內容的 `updated_at`；`source_note` 為收藏者自填的備註（選填）。

#### Scenario: 跨裝置可見
- **WHEN** 使用者於裝置 A 建立自訂背景後，於裝置 B 登入同帳號進入建角背景步驟
- **THEN** 裝置 B 的背景選項含該自訂背景

#### Scenario: 僅本人可存取
- **WHEN** 其他使用者查詢 `user_backgrounds`
- **THEN** 查無此使用者的自訂背景（RLS 過濾）

#### Scenario: id 不可枚舉
- **WHEN** 新建自訂背景
- **THEN** 其 id 為隨機值，無法自建立時間或其他既知資訊推導

#### Scenario: 撞號不致寫入失敗
- **WHEN** 兩位使用者的自訂背景恰有相同的 id 值
- **THEN** 兩筆皆可存在，寫入皆成功

#### Scenario: 刪除為軟刪除
- **WHEN** 使用者於背景選項刪除某自訂背景並確認
- **THEN** 雲端標記 `deleted_at` 成功後自本地清單移除；既有使用該背景建立的角色不受影響

## ADDED Requirements

### Requirement: 自訂背景的分享與收藏入口
自訂背景 SHALL 提供分享入口，行為依 `homebrew-share` 規格。分享入口 SHALL 僅出現於使用者自己擁有的自訂背景（含自他人分享收藏後成為自己的那一份）。

自訂背景清單 SHALL 以其備註行標示哪些項目為自他人分享收藏而來（備註留空時以空狀態文字呈現），SHALL NOT 另設泛用的來源徽章。該標示 SHALL NOT 限制編輯、刪除或再分享。

#### Scenario: 自建背景可分享
- **WHEN** 使用者檢視自己建立的自訂背景
- **THEN** 提供分享入口

#### Scenario: 收藏後亦可再分享
- **WHEN** 使用者檢視自他人分享收藏而來的自訂背景
- **THEN** 同樣提供分享入口（該份已是使用者自己的資料）

#### Scenario: 來源標示不限制操作
- **WHEN** 使用者對一筆收藏而來的自訂背景執行編輯或刪除
- **THEN** 操作與自建背景完全相同，不受來源標示影響
