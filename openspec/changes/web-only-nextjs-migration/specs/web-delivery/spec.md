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

### Requirement: 兩個應用共存於單一網域與單一部署
遷移期間 Next.js 與 Flutter SHALL 部署為同一網域下的單一部署單位。Next.js SHALL 為部署主體；其未匹配的路徑 SHALL fallback 至 Flutter 應用。

方向不可顛倒：以 Next.js 為主體時，每遷移一條路由即少一條 fallback，最終 fallback 歸零、Flutter 自然退場；反之則每遷移一條路由都要新增一條分流規則，且退場時須再拆一次。

#### Scenario: 已遷移的路由
- **WHEN** 使用者開啟已遷移至 Next.js 的路徑
- **THEN** 由 Next.js 回應

#### Scenario: 未遷移的路由
- **WHEN** 使用者開啟尚未遷移的路徑
- **THEN** fallback 至 Flutter 應用，行為與遷移前一致

#### Scenario: 單一部署
- **WHEN** 執行部署
- **THEN** 兩個建置產物以單一部署動作上線，不需分別部署至不同目標

### Requirement: 登入狀態跨兩個應用共用
使用者的 Supabase session SHALL 為兩個應用共同可見；使用者 SHALL NOT 因所在路由屬於哪一邊而被要求重複登入。

session 的儲存鍵與格式 SHALL 以留存的一方（JS client）為準，由即將退場的一方（Dart client）適應——遷移的痕跡不得烙進最終要保留的程式碼。

#### Scenario: 跨應用維持登入
- **WHEN** 使用者於其中一個應用登入後，導航至由另一個應用服務的路由
- **THEN** 仍為登入狀態，不被導向登入頁

#### Scenario: 登出同步
- **WHEN** 使用者於任一應用登出
- **THEN** 另一應用亦視為已登出

### Requirement: 遷移期間停用 Flutter 的 service worker
遷移期間 Flutter web SHALL 以不註冊 service worker 的方式建置，且 SHALL 主動註銷既有使用者瀏覽器中已註冊的舊 service worker。

Flutter 的 service worker 註冊於 scope `/`，會攔截同網域下已遷移至 Next.js 的路由並以快取的舊資產回應；此類故障對使用者呈現為「新頁面偶爾變回舊的」，極難診斷。

停用的代價（離線與重複造訪加速）在此時點最低：本機尚無任何離線資料可失去。

#### Scenario: 新建置不註冊
- **WHEN** 使用者首次造訪遷移期間的網站
- **THEN** 不註冊任何 Flutter service worker

#### Scenario: 舊 service worker 註銷
- **WHEN** 既有使用者（瀏覽器中已註冊舊 service worker）造訪網站
- **THEN** 舊 service worker 被註銷
- **THEN** 後續請求不再被攔截，已遷移的路由回應 Next.js 的內容

#### Scenario: 註銷程式碼的退場
- **WHEN** 遷移完成
- **THEN** 註銷程式碼隨之移除，不長期留存

### Requirement: 遷移期間的新功能歸屬
遷移期間，新功能 SHALL 實作於 Flutter 端，除非該功能所屬的路由正在被遷移。

Next.js 端在遷移初期缺乏元件庫、狀態管理與規則邏輯，於該處開新功能等同同時支付遷移與開發兩份成本；而 Flutter 端的實作日後隨其路由一起遷移時，是「照著已驗證的實作重寫」，風險低於「憑規格重新設計」。

#### Scenario: 一般新功能
- **WHEN** 新增與遷移無關的功能
- **THEN** 實作於 Flutter 端

#### Scenario: 遷移中路由的功能
- **WHEN** 新功能所屬的路由正在被遷移
- **THEN** 實作於 Next.js 端，不在 Flutter 端重複實作

### Requirement: 規則邏輯的移植須有對拍依據
規則相關的推導邏輯（護甲等級推導、貨幣分層扣款、升級、職業資源推導）遷移時 SHALL 以自現行實作匯出的輸入／輸出對照為驗收依據，SHALL NOT 僅憑規格重新實作。

這類邏輯的失敗模式不是「寫不出來」，而是「看起來對、但在特定情境算錯」——玩家不會回報，只會默默失去信任。

#### Scenario: 遷移前匯出對照
- **WHEN** 準備遷移某項規則邏輯
- **THEN** 先自現行實作匯出涵蓋邊界情境的輸入／輸出對照

#### Scenario: 新實作須逐項對上
- **WHEN** 新實作完成
- **THEN** 對照中的每一項輸入皆產生相同輸出，否則不得視為完成
