## ADDED Requirements

### Requirement: Service worker 只註銷屬於前一代實作的註冊
清理前一代（Flutter）service worker 的程式碼 SHALL 僅針對該實作的 registration
與 cache key，MUST NOT 無差別註銷所有 registration 或清空整個 Cache Storage。

無差別清理會在每次載入時把本應用自己的 service worker 一併殺掉，使離線能力
永遠無法生效。

#### Scenario: 遺留的註冊存在
- **WHEN** 瀏覽器中存在前一代實作註冊的 service worker
- **THEN** 該註冊被註銷，其建立的 cache 被清除

#### Scenario: 只有本應用的註冊
- **WHEN** 瀏覽器中只有本應用的 service worker 註冊
- **THEN** 該註冊被保留，不觸發註銷，也不觸發重新載入

### Requirement: 離線時提供最後一次成功的頁面回應
已造訪過的角色頁與內容庫頁，SHALL 在離線時以最後一次成功取得的回應供應，使
頁面可開啟並顯示當時的內容。

導覽與 RSC 請求 SHALL 採網路優先：有網路時一律以網路結果為準並更新快取，
僅在網路不可用時回退至快取。

#### Scenario: 離線開啟造訪過的角色頁
- **WHEN** 使用者曾在連線狀態下開啟角色頁，之後於離線狀態再次開啟
- **THEN** 頁面正常呈現，內容為最後一次同步的角色卡

#### Scenario: 離線切換分頁
- **WHEN** 離線狀態下於主畫面切換至曾造訪過的分頁
- **THEN** 該分頁以最後一次同步的內容呈現

#### Scenario: 離線開啟從未造訪過的頁面
- **WHEN** 離線狀態下開啟從未在連線時造訪過的頁面
- **THEN** 呈現明確的離線說明，而非瀏覽器的網路錯誤畫面

#### Scenario: 連線恢復後取得最新內容
- **WHEN** 網路恢復後重新開啟頁面
- **THEN** 內容來自網路而非快取，且快取被更新

### Requirement: 認證與即時性資料不得快取
對 Supabase 的請求、`/api/*` 端點，以及分享檢視頁（`/v/:token`）SHALL NOT 被
service worker 快取。

分享檢視必須是即時活資料（見 `character-share`）；認證回應快取後會造成登入
狀態的假象。

#### Scenario: 分享頁不使用快取
- **WHEN** 離線狀態下開啟分享檢視連結
- **THEN** 不呈現任何快取內容，而是說明目前無法取得

### Requirement: 離線狀態與資料時點可見
當頁面內容來自快取時，系統 SHALL 明確標示目前為離線狀態，並 SHALL 標示該內容
最後一次同步的時間。

僅標示「離線」而不說明資料多舊，使用者無從判斷眼前的數值是否可信。

#### Scenario: 離線瀏覽時的標示
- **WHEN** 頁面內容來自快取
- **THEN** 畫面上持續可見離線標示與最後同步時間

#### Scenario: 連線正常時不打擾
- **WHEN** 頁面內容來自網路
- **THEN** 不顯示離線標示

### Requirement: 離線期間的編輯須警示為未保存
離線且存在未推送變更時，系統 SHALL 以持續且明顯的方式警示該變更尚未同步，
並說明重新載入將會遺失。

本能力不含離線寫入的持久化；離線期間的變更僅存在於記憶體。使用者看得見角色卡
就會去編輯，不明說等同誤導。

#### Scenario: 離線扣血
- **WHEN** 離線狀態下調整當前 HP
- **THEN** 畫面持續顯示變更尚未同步且重新載入會遺失的警示

#### Scenario: 恢復連線並推送成功
- **WHEN** 網路恢復且變更成功推送
- **THEN** 警示消失

### Requirement: 登出清除個人快取
登出時，系統 SHALL 清除快取中含個人資料的項目（角色相關的導覽與 RSC 回應）。

內容庫與靜態資產的快取 SHALL NOT 被清除——SRD 為公開內容，保留可加速下次登入
且不構成洩漏。

#### Scenario: 登出後不留角色資料
- **WHEN** 使用者登出
- **THEN** 快取中不再留有角色頁的回應
- **THEN** 同一裝置上以另一帳號登入時看不到前一帳號的角色

#### Scenario: 登出不清內容庫
- **WHEN** 使用者登出
- **THEN** 內容庫與靜態資產的快取保留

### Requirement: Service worker 必須可停用
Service worker SHALL 具備自我註銷的能力，使其在發生故障時能被遠端停用，
而不需要使用者手動清除瀏覽器資料。

已安裝於使用者瀏覽器的 service worker 不會因伺服器上移除該檔案而消失；
沒有停用路徑的 SW 是不可回退的部署。

#### Scenario: 遠端停用
- **WHEN** 停用旗標被開啟
- **THEN** service worker 註銷自身並清除其建立的快取
- **THEN** 後續請求全部直達網路

### Requirement: 更新提示維持單一入口
Service worker 偵測到新版時 SHALL NOT 自行接管，而是通知既有的更新提示元件，
由使用者確認後才套用並重新載入。

同時存在兩套更新機制會造成「提示了卻沒更新」或「沒提示就換了版本」。

#### Scenario: 有新版時
- **WHEN** service worker 偵測到新版本
- **THEN** 顯示既有的更新提示，不自行重新載入

#### Scenario: 使用者確認更新
- **WHEN** 使用者於更新提示按下更新
- **THEN** 新版 service worker 接管並重新載入頁面
