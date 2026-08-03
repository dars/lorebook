## ADDED Requirements

### Requirement: 分享檢視路由
Router SHALL 提供以 token 為參數的角色卡分享檢視路由，且該路徑前綴 SHALL NOT 與其他分享機制（如 homebrew 分享）共用。此路由 SHALL 可由 deep link（universal link / app link）與 web 直接開啟。

#### Scenario: 以 token 進入檢視
- **WHEN** 使用者導航至分享檢視路由並帶有 token
- **THEN** 顯示該 token 對應的唯讀角色卡（或其失效狀態）

#### Scenario: deep link 直接進入
- **WHEN** 已安裝 App 的裝置開啟分享連結
- **THEN** App 直接進入該 token 的檢視頁，不經登入或角色選擇

#### Scenario: 路徑不與 homebrew 分享衝突
- **WHEN** 開啟 homebrew 分享連結或角色卡分享連結
- **THEN** 兩者分別路由至各自的頁面，不互相攔截

## MODIFIED Requirements

### Requirement: Auth redirect guard
Router SHALL 在三個層級進行導向：未登入導向登入頁、已登入未選角色導向角色選擇、已登入已選角色導向主畫面。分享檢視路由 SHALL 豁免此 guard——未登入者停留於該路由，SHALL NOT 被導向登入頁。

#### Scenario: 未登入使用者存取受保護路由
- **WHEN** 使用者未登入
- **AND** 嘗試存取主畫面或角色選擇頁
- **THEN** 重導至 /auth/login

#### Scenario: 已登入使用者存取 auth 路由
- **WHEN** 使用者已登入
- **AND** 導航至登入或註冊頁
- **THEN** 重導至 /character-select 或 /main（依是否已選角色）

#### Scenario: 已登入但未選角色
- **WHEN** 使用者已登入
- **AND** 尚未選擇角色
- **AND** 嘗試存取主畫面
- **THEN** 重導至 /character-select

#### Scenario: Auth 狀態變更觸發重新評估
- **WHEN** 使用者的 auth 狀態變更（登入或登出）
- **THEN** router 重新評估 redirect 規則並導航

#### Scenario: 未登入者存取分享檢視路由
- **WHEN** 使用者未登入
- **AND** 開啟分享檢視路由
- **THEN** 停留於該路由，不重導至 /auth/login

#### Scenario: 已登入者存取分享檢視路由
- **WHEN** 使用者已登入
- **AND** 開啟分享檢視路由
- **THEN** 停留於該路由，不重導至角色選擇或主畫面
