# custom-backgrounds Specification

## Purpose
TBD - created by archiving change custom-backgrounds. Update Purpose after archive.
## Requirements
### Requirement: 自訂背景的建立與編輯
App SHALL 允許已登入使用者建立與編輯自訂背景,欄位為:名稱、三個互異的能力值加值候選、兩個互異的固定技能(自 18 技能)、一個起源專長(自 SRD 起源專長候選:技藝精湛/野蠻打擊/警覺/法術新手〔法師/牧師/德魯伊〕)、敘述文字(選填)。表單 SHALL 即時驗證並於未通過時禁止儲存。

#### Scenario: 建立合法自訂背景
- **WHEN** 使用者於編輯器填妥名稱「獵人」、能力值 DEX/CON/WIS、技能隱匿/求生、起源專長警覺並儲存
- **THEN** 自訂背景建立成功,出現於建角背景選項清單

#### Scenario: 驗證未通過不可儲存
- **WHEN** 能力值重複、技能不足兩個或名稱為空
- **THEN** 儲存按鈕不可用且顯示對應欄位錯誤提示

### Requirement: 自訂背景的儲存與同步
自訂背景 SHALL 為使用者自有資料:儲存於 `user_backgrounds` 表(文件模式,比照 `user_characters`:客戶端產生 id、提升欄位 name、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone),RLS 僅本人可存取,跨裝置同步。刪除 SHALL 經確認後執行雲端軟刪除,成功方移除本地清單。

#### Scenario: 跨裝置可見
- **WHEN** 使用者於裝置 A 建立自訂背景後,於裝置 B 登入同帳號進入建角背景步驟
- **THEN** 裝置 B 的背景選項含該自訂背景

#### Scenario: 僅本人可存取
- **WHEN** 其他使用者查詢 `user_backgrounds`
- **THEN** 查無此使用者的自訂背景(RLS 過濾)

#### Scenario: 刪除為軟刪除
- **WHEN** 使用者於背景選項刪除某自訂背景並確認
- **THEN** 雲端標記 `deleted_at` 成功後自本地清單移除;既有使用該背景建立的角色不受影響

### Requirement: 建角選項合併供給
建角背景步驟的選項 SHALL 為「內建 SRD 背景 + 該使用者的自訂背景」合併清單;自訂背景以「自訂」標識區分,選取後的敘述顯示、能力值加值卡與技能自動帶入行為 SHALL 與內建背景一致;角色建立時儲存的背景為快照,不回查自訂背景來源。

#### Scenario: 自訂背景參與建角
- **WHEN** 使用者於背景步驟選取自訂背景「獵人」並完成建角
- **THEN** 能力值步驟的背景加值卡以 DEX/CON/WIS 為候選、技能步驟自動帶入隱匿/求生,角色快照的背景名為「獵人」

#### Scenario: 離線降級
- **WHEN** 未登入或網路不可用時進入背景步驟
- **THEN** 顯示內建 4 個背景與「自訂背景離線不可用」提示,建角流程不被阻擋

