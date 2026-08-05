## MODIFIED Requirements

### Requirement: 分享檢視路由
系統 SHALL 提供以 token 為參數的角色卡分享檢視路由，且該路徑前綴 SHALL NOT 與其他分享機制（如 homebrew 分享）共用。此路由 SHALL 可由 web 直接開啟。

路徑本身 SHALL 維持不變（`/v/:token`），使既有已發出的分享連結持續有效。

#### Scenario: 以 token 進入檢視
- **WHEN** 使用者導航至分享檢視路由並帶有 token
- **THEN** 顯示該 token 對應的唯讀角色卡（或其失效狀態）

#### Scenario: 既有連結持續有效
- **WHEN** 開啟遷移前發出的分享連結
- **THEN** 正常顯示，路徑不需變更

#### Scenario: 路徑不與 homebrew 分享衝突
- **WHEN** 開啟 homebrew 分享連結或角色卡分享連結
- **THEN** 兩者分別路由至各自的頁面，不互相攔截
