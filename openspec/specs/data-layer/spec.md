# data-layer Specification

## Purpose
TBD - created by archiving change lorebook-initial-app-architecture. Update Purpose after archive.
## Requirements
### Requirement: Supabase client provider
App SHALL 透過 Riverpod provider 暴露 Supabase client，不直接使用 singleton。

#### Scenario: Provider 注入
- **WHEN** repository 需要 Supabase client
- **THEN** 透過 Riverpod ref 取得（非直接呼叫 Supabase.instance.client）

### Requirement: Repository pattern
每個 feature 的資料存取 SHALL 封裝在 repository class，回傳 typed domain model。

#### Scenario: Repository 回傳 domain model
- **WHEN** repository method 被呼叫
- **THEN** 回傳 typed domain object（如 Character），不回傳 Map<String, dynamic>

#### Scenario: Repository 可透過 provider 注入
- **WHEN** provider 或 notifier 需要資料存取
- **THEN** 透過 Riverpod provider 取得 repository

### Requirement: Domain model 使用 freezed
Domain model SHALL 為 freezed 產生的 immutable data class，含 JSON serialization。

#### Scenario: 不可變性
- **WHEN** Character model 被建立
- **THEN** 所有欄位為 final
- **THEN** copyWith 可用於建立修改後的副本

#### Scenario: JSON 來回轉換
- **WHEN** model 序列化為 JSON 再反序列化
- **THEN** 所有欄位正確保留

### Requirement: 統一錯誤處理
Repository SHALL 將 Supabase 例外封裝為 typed error，不直接拋出原始例外。

#### Scenario: 網路錯誤
- **WHEN** Supabase 查詢因網路問題失敗
- **THEN** repository 回傳 typed error
- **THEN** UI 可顯示友善錯誤訊息

### Requirement: 假資料 provider
本階段 SHALL 提供假資料 provider，回傳戴夫林角色的完整資料物件，使用與真實資料相同的 domain model。

#### Scenario: 假資料替代
- **WHEN** UI 需要角色資料
- **THEN** 從假資料 provider 取得戴夫林的完整角色資料
- **THEN** 資料結構與未來真實 Supabase 資料一致

#### Scenario: 未來切換
- **WHEN** 後續接上真實 Supabase 資料層
- **THEN** 只需替換 provider 實作，UI 層不需變動

