## ADDED Requirements

### Requirement: 設定頁版面
System（設定）頁面 SHALL 為全域系統頁，不綁定當前角色。

#### Scenario: 純標題頁首
- **WHEN** 使用者進入設定頁
- **THEN** 頂部顯示純標題頁首（不顯示角色資訊）

#### Scenario: 設定卡片
- **WHEN** 設定頁顯示
- **THEN** 以滿版寬度一致的卡片呈現各設定區塊（外觀主題、帳號、關於）

### Requirement: 登出功能
System 頁面 SHALL 提供登出按鈕，清除 session 並導回登入頁。

#### Scenario: 登出
- **WHEN** 使用者點擊登出
- **THEN** 顯示確認對話框
- **WHEN** 使用者確認
- **THEN** 清除 Supabase session
- **THEN** 重導至登入頁

### Requirement: 主題切換
System 頁面 SHALL 提供亮色/暗色主題切換。

#### Scenario: 切換主題
- **WHEN** 使用者切換主題設定
- **THEN** App 立即套用選定的主題（亮色/暗色/跟隨系統）

#### Scenario: 主題偏好持久化
- **WHEN** 使用者選定主題後關閉 App
- **THEN** 下次開啟 App 維持上次選定的主題

#### Scenario: 預設值
- **WHEN** 使用者從未設定主題
- **THEN** 預設為深色主題（D&D 暗色奇幻風格為主視覺）
