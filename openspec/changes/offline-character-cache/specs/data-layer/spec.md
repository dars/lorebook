## ADDED Requirements

### Requirement: 寫入失敗須可重試而非終態
Repository 的寫入（推送）失敗 SHALL NOT 被視為終態。呼叫端 SHALL 能區分「失敗且應重試」與「失敗且不可重試」，並據以保留待推送狀態。

現行的 debounce 推送在失敗後即結束，離線期間的變更會靜靜消失；離線可寫的前提是失敗必須是可恢復的。

#### Scenario: 網路失敗可重試
- **WHEN** 推送因網路不可達而失敗
- **THEN** repository 回傳可重試的 typed error
- **THEN** 呼叫端保留待推送狀態

#### Scenario: 授權失敗不重試
- **WHEN** 推送因未登入或無權限而失敗
- **THEN** repository 回傳不可重試的 typed error
- **THEN** 呼叫端不進入無止境的重試

### Requirement: 雲端版本資訊須可為客戶端取得
角色的雲端 `updated_at` SHALL 可為客戶端取得，供衝突偵測使用。

該欄位由資料庫 trigger 維護，客戶端唯讀——模型或存取方式 MUST 讓「客戶端不得寫入此值」一目了然。

#### Scenario: 讀取時帶回版本
- **WHEN** 自雲端讀取角色清單
- **THEN** 每個角色的雲端 `updated_at` 可為呼叫端取得

#### Scenario: 客戶端不送出版本
- **WHEN** 客戶端推送角色
- **THEN** 不送出自行決定的 `updated_at`，該值仍由資料庫維護
