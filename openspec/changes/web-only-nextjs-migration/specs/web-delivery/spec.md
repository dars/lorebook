## ADDED Requirements

### Requirement: 平台範圍限定為 web
本專案 SHALL 僅交付 web；SHALL NOT 維護 iOS/Android 建置目標與其設定資產。

原生專屬設定（Associated Domains、apple-app-site-association、assetlinks.json、原生專案檔）SHALL 自版控移除而非保留為停止建置的中間態——無人建置、無人測試的設定會隨相依升級腐爛，並持續產生無意義的變更雜訊。

移除前 SHALL 標記一個版控標籤，使日後取回有明確起點。

#### Scenario: 建置目標
- **WHEN** 執行專案的建置
- **THEN** 僅產出 web 產物
- **THEN** 不存在 iOS/Android 的建置設定

#### Scenario: 原生設定資產
- **WHEN** 檢視版控內容
- **THEN** 不含 Associated Domains、apple-app-site-association、assetlinks.json 等原生專屬設定

#### Scenario: 可取回
- **WHEN** 需要恢復原生支援
- **THEN** 可自移除前標記的版控標籤取回完整內容

### Requirement: 以單一應用交付，舊實作保留為對照而不部署
網站 SHALL 由單一應用交付，SHALL NOT 建立兩個應用共存於同一網域的分流機制。

被取代的實作 SHALL 保留於版控但停止部署與功能開發，作為重寫期間的行為對照；待新實作全面追平後 SHALL 以獨立變更刪除。

共存機制（路由分流、雙產物部署、跨實作的 session 相容）的唯一作用是避免服務中斷；本專案規模明確接受一次性切換，不支付該成本。

#### Scenario: 部署目標唯一
- **WHEN** 執行部署
- **THEN** 僅部署新實作，不含被取代實作的產物

#### Scenario: 舊實作可供對照
- **WHEN** 重寫期間需要確認某項行為的既有表現
- **THEN** 可於本機執行被取代的實作進行比對

#### Scenario: 追平後移除
- **WHEN** 新實作已全面追平且觀察期無異常
- **THEN** 以獨立變更刪除被取代的實作

### Requirement: 切換時主動註銷舊 service worker
切換部署後，新應用 SHALL 主動註銷使用者瀏覽器中既有的 service worker。

被取代的 Flutter 實作將 service worker 註冊於 scope `/`，會攔截同網域的新站並以快取的舊資產回應；使用者將看到「網站沒有變化」而回報假故障。

該註銷程式碼 SHALL 標注為切換期暫時性程式碼，並於觀察期結束後移除。

#### Scenario: 既有使用者造訪新站
- **WHEN** 瀏覽器中已註冊舊 service worker 的使用者造訪網站
- **THEN** 舊 service worker 被註銷
- **THEN** 後續請求取得新應用的內容

#### Scenario: 註銷程式碼的退場
- **WHEN** 觀察期結束且無舊畫面回報
- **THEN** 註銷程式碼隨之移除，不長期留存

### Requirement: 切換接受一次性登出
切換時 SHALL NOT 為維持登入狀態而實作跨實作的 session 格式相容；使用者重新登入即可。

相容轉換的成本不與受影響人數相稱，且該相容程式碼在切換完成後仍須清除。

#### Scenario: 切換後的登入狀態
- **WHEN** 既有使用者於切換後造訪網站
- **THEN** 為未登入狀態
- **THEN** 登入頁說明本次變更，使其不誤判為帳號異常

#### Scenario: 重新登入後資料完整
- **WHEN** 使用者重新登入
- **THEN** 可正常使用其帳號下的資料

### Requirement: 重寫期間功能凍結
重寫期間 SHALL NOT 於被取代的實作上開發新功能；既有的待實作變更 SHALL 一律凍結。

在即將退場的程式碼上開發是純粹的浪費。這些變更的提案與設計 SHALL 保留——那是產品判斷，與實作語言無關，重寫完成後可直接接續。

#### Scenario: 新功能請求
- **WHEN** 重寫期間出現新功能需求
- **THEN** 不於被取代的實作上實作
- **THEN** 記錄為待重寫完成後處理

#### Scenario: 既有待實作變更
- **WHEN** 檢視凍結期間的待實作變更
- **THEN** 其提案與設計保留，並標注凍結狀態與解凍條件

### Requirement: 規則邏輯的移植須有對拍依據
規則相關的推導邏輯（護甲等級推導、貨幣分層扣款、升級、職業資源推導）遷移時 SHALL 以自現行實作匯出的輸入／輸出對照為驗收依據，SHALL NOT 僅憑規格重新實作。

此類邏輯的失敗模式不是「寫不出來」，而是「看起來對、但在特定情境算錯」——玩家不會回報，只會默默失去信任。一次性切換沒有並行雙軌可作為安全網，對拍因此是主要防線。

規則邏輯 SHALL 先於依賴它的頁面完成。

#### Scenario: 遷移前匯出對照
- **WHEN** 準備遷移某項規則邏輯
- **THEN** 先自現行實作匯出涵蓋邊界情境的輸入／輸出對照

#### Scenario: 新實作須逐項對上
- **WHEN** 新實作完成
- **THEN** 對照中的每一項輸入皆產生相同輸出，否則不得視為完成

#### Scenario: 未覆蓋範圍須明示
- **WHEN** 對照未能涵蓋某些情境
- **THEN** 明確記錄未覆蓋的部分，不以「已全數對拍」表述
