## ADDED Requirements

### Requirement: GoRouter 路由設定
App SHALL 使用 go_router 建立宣告式路由，包含 auth routes、角色選擇、四 Tab 主畫面。

#### Scenario: 路由表
- **WHEN** App 啟動
- **THEN** 路由表包含：/auth/login、/auth/register、/character-select、/main（含 decision/character/journal/system 子路由）

### Requirement: Auth redirect guard
Router SHALL 在三個層級進行導向：未登入導向登入頁、已登入未選角色導向角色選擇、已登入已選角色導向主畫面。

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

### Requirement: App 啟動流程
Router SHALL 實作完整啟動流程：Launch Screen → 登入 → 角色選擇 → Decision 主畫面。

#### Scenario: 首次使用
- **WHEN** 使用者首次開啟 App
- **THEN** 顯示 Launch Screen
- **THEN** 導向登入頁
- **WHEN** 登入成功
- **THEN** 導向角色選擇頁

#### Scenario: 已有 session 且有角色
- **WHEN** App 啟動時存在有效 session
- **AND** 有上次使用的角色
- **THEN** 自動進入 Decision 主畫面，無需再次登入或選角色
