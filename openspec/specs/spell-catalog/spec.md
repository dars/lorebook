# spell-catalog Specification

## Purpose
內容庫（Supabase 5etools 資料）的法術查詢與 5etools 標記渲染能力，供建角法術選擇與其他法術參考情境使用。
## Requirements
### Requirement: 法術目錄查詢
App SHALL 透過 repository 自內容庫(Supabase `v_spells` view)查詢法術目錄,支援以環數與職業(英文名)過濾,查詢固定限定單一書源(XPHB,2024 修訂版),回傳 typed domain model(含名稱中英文、環數、學派、施法時間/射程/持續時間原始結構、專注與儀式旗標、完整描述 entries)。目錄內容為 SRD 5.2 範圍(339 法術);含專有名的法術以 SRD 5.2 官方改名呈現(英文名與繁中定名),不出現 Product Identity 原名。

#### Scenario: 依職業與環數過濾
- **WHEN** 以環數 0 與職業英文名(如 'Wizard')查詢
- **THEN** 回傳該職業可用的全部戲法(SRD 5.2 範圍之 2024 修訂版內容),依環數、名稱排序

#### Scenario: 查詢經 Riverpod provider 快取
- **WHEN** 同一組(環數, 職業)參數再次被 watch
- **THEN** 不重新發出網路請求,回傳快取結果

#### Scenario: 改名法術以 SRD 名回傳
- **WHEN** 查詢結果包含原含專有名的法術(如 Arcane Hand)
- **THEN** 中英文名稱均為 SRD 5.2 定名,無 Bigby's/Tasha's 等專有名

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

