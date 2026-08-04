## MODIFIED Requirements

### Requirement: 自訂背景的儲存與同步
自訂背景 SHALL 為使用者自有資料:儲存於 `user_backgrounds` 表(文件模式,比照 `user_characters`:客戶端產生 id、提升欄位 name、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone),RLS 僅本人可存取,跨裝置同步。刪除 SHALL 經確認後執行雲端軟刪除,成功方移除本地清單。

客戶端產生的 id SHALL 為密碼學安全的隨機值,SHALL NOT 使用時間戳、序號或其他可枚舉的來源。既有以時間戳產生的資料列 SHALL 原樣保留,不需遷移。

#### Scenario: 跨裝置可見
- **WHEN** 使用者於裝置 A 建立自訂背景後,於裝置 B 登入同帳號進入建角背景步驟
- **THEN** 裝置 B 的背景選項含該自訂背景

#### Scenario: 僅本人可存取
- **WHEN** 其他使用者查詢 `user_backgrounds`
- **THEN** 查無此使用者的自訂背景(RLS 過濾)

#### Scenario: id 不可枚舉
- **WHEN** 新建自訂背景
- **THEN** 其 id 為隨機值,無法自建立時間或其他既知資訊推導

#### Scenario: 刪除為軟刪除
- **WHEN** 使用者於背景選項刪除某自訂背景並確認
- **THEN** 雲端標記 `deleted_at` 成功後自本地清單移除;既有使用該背景建立的角色不受影響

## ADDED Requirements

### Requirement: 自訂背景的分享入口
自訂背景 SHALL 提供分享入口,行為依 `homebrew-share` 規格。分享入口 SHALL 僅出現於使用者自己擁有的自訂背景(含自他人分享匯入後成為自己的那一份)。

#### Scenario: 自建背景可分享
- **WHEN** 使用者檢視自己建立的自訂背景
- **THEN** 提供分享入口

#### Scenario: 匯入後亦可再分享
- **WHEN** 使用者檢視自他人分享匯入而來的自訂背景
- **THEN** 同樣提供分享入口(該份已是使用者自己的資料)
