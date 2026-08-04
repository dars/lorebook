## ADDED Requirements

### Requirement: 分享快照與 token
發布分享時 App SHALL 將該自訂內容的**當下快照**寫入 `shared_homebrew` 表，以 128-bit 密碼學安全隨機值（base64url 編碼）作為 token 識別。token SHALL NOT 重用內容本身的 id 或任何可推導的值（時間戳、序號、使用者 id）。

快照 SHALL 記錄內容型別（`kind`）與規則版本（`rules_version`）。發布 SHALL NOT 修改原始自訂內容的資料列。

#### Scenario: 發布產生快照
- **WHEN** 使用者對自己的自訂背景執行「分享」
- **THEN** 建立一筆 `shared_homebrew` 列，含隨機 token、`kind = 'background'`、該內容的規則版本與當下內容快照
- **THEN** 原始 `user_backgrounds` 資料列的任何欄位皆未改變

#### Scenario: token 不可推導
- **WHEN** 檢視任兩次發布產生的 token
- **THEN** token 為隨機值，與內容 id、發布時間、使用者 id 皆無可推導關係

#### Scenario: 發布後修改原內容不影響已發布快照
- **WHEN** 使用者發布分享後，再編輯該自訂背景的名稱或技能
- **THEN** 以原 token 取回的內容仍為發布當下的快照

### Requirement: 分享載體為連結與 QR
App SHALL 以連結（`https://<web-domain>/s/<token>`）作為分享載體，並提供該連結的 QR code 呈現。QR code SHALL 僅含該連結，SHALL NOT 內嵌內容本體，使載體長度與內容大小無關。

QR code SHALL 於本機繪製產生，SHALL NOT 呼叫任何外部服務。分享 UI SHALL 明示「持有連結者皆可檢視」。

#### Scenario: 取得分享連結與 QR
- **WHEN** 使用者發布分享完成
- **THEN** 畫面顯示分享連結、可複製，並顯示對應的 QR code
- **THEN** 畫面明示持有連結者皆可檢視此內容

#### Scenario: QR 長度與內容大小無關
- **WHEN** 分享一個敘述極長的自訂內容
- **THEN** QR code 內容仍僅為含 token 的連結，長度不隨內容增長

### Requirement: 未登入可預覽，匯入需登入
以 token 取回分享內容 SHALL 允許未登入者（anon）讀取，條件為該分享未被撤銷。匯入（存為自己的一份）SHALL 要求登入。

未登入者按下匯入時 App SHALL 導向登入，登入後 SHALL 回到原分享內容的匯入預覽（token 於流程中保留）。

#### Scenario: 未登入預覽
- **WHEN** 未登入者開啟分享連結
- **THEN** 顯示內容預覽（名稱、規則版本、技能與其他機制欄位）
- **THEN** 提供匯入入口

#### Scenario: 未登入匯入導向登入
- **WHEN** 未登入者於預覽頁按下匯入
- **THEN** 導向登入流程
- **THEN** 登入成功後回到同一份分享內容的匯入預覽，不需重新掃碼

### Requirement: 匯入為複製語意
匯入 SHALL 以**新的隨機 id** 與**匯入者自己的 `user_id`** 於 `user_backgrounds` 建立新資料列，內容取自快照。匯入完成後該份內容與來源 SHALL 完全脫鉤：原發布者撤銷分享或修改內容，皆 SHALL NOT 影響已匯入的資料。

匯入 SHALL 先顯示預覽並由使用者確認後才寫入。當匯入者已有同名且同規則版本的自訂內容時，App SHALL 提示可能重複，但 SHALL NOT 阻止使用者繼續。

#### Scenario: 匯入建立自己的一份
- **WHEN** 已登入使用者於預覽頁確認匯入
- **THEN** 於自己的自訂背景清單新增一筆，id 為新產生的隨機值、擁有者為自己
- **THEN** 該筆可如同自建內容一般編輯與刪除

#### Scenario: 匯入後與來源脫鉤
- **WHEN** 原發布者於匯入完成後撤銷該分享
- **THEN** 匯入者已取得的那一份不受影響，仍可正常使用

#### Scenario: 同名提示
- **WHEN** 匯入者已有同名同版本的自訂背景
- **THEN** 顯示可能重複的提示，並允許使用者選擇繼續或取消

### Requirement: 匯入內容的驗證
快照內容 SHALL 視為不可信輸入。匯入前 App SHALL 以**與使用者手動建立完全相同的規則**驗證（欄位白名單、長度上限、列舉型欄位須落在合法集合內）；驗證失敗 SHALL 拒絕匯入並說明原因。

驗證 SHALL NOT 比手動建立更嚴格。凡手動建立時允許自由填寫的欄位（如自訂的起源專長名稱與說明），匯入時 SHALL 同樣允許，僅檢查長度與型別；否則使用者能建立卻分享不出去。

匯入內容的文字 SHALL 以純文字呈現，SHALL NOT 進入 5etools 標記渲染路徑（外來字串不得觸發內容庫交叉引用）。

#### Scenario: 非法內容拒絕匯入
- **WHEN** 分享快照含不存在的技能名稱或超出長度上限的欄位
- **THEN** 拒絕匯入並顯示具體原因，不寫入任何資料

#### Scenario: 外來文字不觸發標記渲染
- **WHEN** 分享內容的敘述含 `{@spell ...}` 形式的字串
- **THEN** 該字串以純文字原樣顯示，不解析為內容庫連結

### Requirement: 規則版本檢查
分享快照 SHALL 攜帶規則版本。匯入時若快照版本與匯入情境不符，App SHALL 阻擋並說明，SHALL NOT 進行任何自動轉換。

#### Scenario: 跨版本匯入被阻擋
- **WHEN** 使用者嘗試將 5e 的自訂背景匯入為 5r 使用
- **THEN** 顯示版本不符的說明，不建立任何資料

#### Scenario: 版本標示於預覽
- **WHEN** 檢視分享內容預覽
- **THEN** 明確顯示該內容的規則版本（5e / 5r）

### Requirement: 撤銷
發布者 SHALL 可撤銷自己發布的分享。撤銷後以該 token 取回 SHALL 回傳不可用狀態；撤銷 SHALL NOT 影響原始自訂內容，亦 SHALL NOT 影響他人已完成的匯入。

發布者 SHALL 能於該自訂內容上看到其分享狀態與撤銷入口。

#### Scenario: 撤銷後連結失效
- **WHEN** 發布者撤銷某分享後，他人開啟該連結
- **THEN** 顯示此分享已撤銷的說明，不顯示任何內容

#### Scenario: 撤銷不影響原始內容
- **WHEN** 發布者撤銷分享
- **THEN** 自己的自訂背景完全不受影響，仍在清單中可正常使用

#### Scenario: 分享狀態可見
- **WHEN** 發布者檢視已分享過的自訂背景
- **THEN** 顯示其分享狀態（含發布時間）與撤銷入口

### Requirement: 無公開列舉介面
App SHALL NOT 提供任何列舉、瀏覽或搜尋他人已分享內容的介面。分享內容的存取 SHALL 一律以 token 精確查詢單筆；資料庫層 SHALL NOT 開放支援列舉的公開查詢路徑（如依 `owner_id`、`created_at`、`kind` 的無 token 查詢）。

此限制為規格層約束：未來若要提供公開內容索引，SHALL 經明確的規格變更，SHALL NOT 以實作方便為由繞過。

#### Scenario: 無法列舉分享內容
- **WHEN** 以任何 App 內路徑或公開 API 嘗試取得分享內容清單而未指定 token
- **THEN** 無此查詢路徑，回傳空結果或拒絕

#### Scenario: 僅能以 token 取單筆
- **WHEN** 以有效 token 查詢
- **THEN** 回傳該筆分享內容，且不包含任何可用於發現其他分享的資訊（如發布者的其他 token）
