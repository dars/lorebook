# auth Specification

## Purpose
TBD - created by archiving change lorebook-initial-app-architecture. Update Purpose after archive.
## Requirements
### Requirement: Email/Password 註冊
App SHALL 允許使用者以 Email 和密碼建立帳號。

#### Scenario: 註冊成功
- **WHEN** 使用者輸入有效 email 和密碼並送出
- **THEN** 在 Supabase Auth 建立新帳號
- **THEN** 導航至角色選擇頁

#### Scenario: Email 已被使用
- **WHEN** 使用者輸入已註冊的 email
- **THEN** 顯示錯誤訊息

#### Scenario: 輸入驗證
- **WHEN** 使用者送出空白 email 或密碼少於 6 字元
- **THEN** 顯示行內驗證錯誤

### Requirement: Email/Password 登入
App SHALL 允許使用者以 Email 和密碼登入。

#### Scenario: 登入成功
- **WHEN** 使用者輸入正確的帳號密碼
- **THEN** 建立 session
- **THEN** 導航至角色選擇頁或主畫面

#### Scenario: 登入失敗
- **WHEN** 使用者輸入錯誤的帳號密碼
- **THEN** 顯示錯誤訊息

### Requirement: OAuth 登入（Google 和 Apple）
App SHALL 支援 Google OAuth（雙平台）和 Apple Sign In（僅 iOS）。

#### Scenario: Google OAuth
- **WHEN** 使用者點擊「以 Google 登入」
- **THEN** 啟動 Google OAuth 流程
- **THEN** 成功後導航至角色選擇頁或主畫面

#### Scenario: Apple Sign In（iOS）
- **WHEN** 使用者在 iOS 裝置點擊「以 Apple 登入」
- **THEN** 啟動 Apple Sign In 流程

#### Scenario: Android 隱藏 Apple 按鈕
- **WHEN** 登入頁在 Android 裝置顯示
- **THEN** 不顯示「以 Apple 登入」按鈕

### Requirement: Session 持久化
App SHALL 持久化 auth session，使用者重啟 App 後保持登入狀態。

#### Scenario: Session 恢復
- **WHEN** App 啟動時存在有效 session
- **THEN** 自動認證使用者，不顯示登入頁

### Requirement: 登出
App SHALL 允許使用者登出，清除 session。

#### Scenario: 登出成功
- **WHEN** 使用者點擊登出
- **THEN** 清除 Supabase session
- **THEN** 重導至登入頁

