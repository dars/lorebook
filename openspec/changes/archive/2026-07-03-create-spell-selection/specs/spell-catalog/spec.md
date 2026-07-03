# spell-catalog Delta

## ADDED Requirements

### Requirement: 法術目錄查詢
App SHALL 透過 repository 自內容庫（Supabase `v_spells` view）查詢法術目錄，支援以環數與職業（英文名）過濾，查詢固定限定單一書源（現為 PHB），回傳 typed domain model（含名稱中英文、環數、學派、施法時間/射程/持續時間原始結構、專注與儀式旗標、完整描述 entries）。

#### Scenario: 依職業與環數過濾
- **WHEN** 以環數 0 與職業英文名（如 'Wizard'）查詢
- **THEN** 回傳該職業可用的全部戲法，依環數、名稱排序

#### Scenario: 查詢經 Riverpod provider 快取
- **WHEN** 同一組（環數, 職業）參數再次被 watch
- **THEN** 不重新發出網路請求，回傳快取結果

### Requirement: 5etools 標記渲染
App SHALL 將內容庫文字中的 5etools 行內標記（`{@dice}`、`{@condition}`、`{@spell}` 等）解析為顯示名並施以強調樣式，並支援 string / list / table / 具名巢狀區塊的排版渲染；未知標記與不成對括號 SHALL 降級為純文字顯示，不得使畫面錯誤。

#### Scenario: 行內標記解析
- **WHEN** 描述文字含 `{@dice 1d8}` 與 `{@condition 無力}`
- **THEN** 畫面顯示「1d8」「無力」為強調樣式，不出現原始標記字元

#### Scenario: 未知標記降級
- **WHEN** 文字含未支援的標記型別
- **THEN** 以標記內容的純文字呈現，渲染不拋例外

### Requirement: 內容庫離線的錯誤傳遞
內容庫查詢於未登入或網路不可用時 SHALL 以可辨識的錯誤狀態呈現於 provider（AsyncError），供 UI 端降級顯示；不得造成畫面崩潰。

#### Scenario: 離線時 provider 為錯誤狀態
- **WHEN** 內容庫連線不可用時 watch 法術目錄 provider
- **THEN** provider 為 error 狀態，UI 可據以顯示降級內容
