# spell-catalog Delta Specification

## MODIFIED Requirements

### Requirement: 法術目錄查詢
App SHALL 透過 repository 自內容庫（Supabase `v_spells` view）查詢法術目錄，支援以環數與職業（英文名）過濾，查詢固定限定單一書源（XPHB，2024 修訂版），回傳 typed domain model（含名稱中英文、環數、學派、施法時間/射程/持續時間原始結構、專注與儀式旗標、完整描述 entries）。

#### Scenario: 依職業與環數過濾
- **WHEN** 以環數 0 與職業英文名（如 'Wizard'）查詢
- **THEN** 回傳該職業可用的全部戲法（2024 修訂版內容），依環數、名稱排序

#### Scenario: 查詢經 Riverpod provider 快取
- **WHEN** 同一組（環數, 職業）參數再次被 watch
- **THEN** 不重新發出網路請求，回傳快取結果
