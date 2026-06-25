## ADDED Requirements

### Requirement: 當前角色資料來源
當前角色 SHALL 由「已選角色 id」從角色清單載入；全 App 角色情境分頁以此當前角色呈現資料。

#### Scenario: 依選取載入當前角色
- **WHEN** 已選角色 id 對應到清單中的角色
- **THEN** 當前角色為該角色，所有角色情境分頁顯示其資料

#### Scenario: 未選取時的回退
- **WHEN** 尚未選取任何角色（如開發直接進入主畫面）
- **THEN** 當前角色回退為清單第一位，畫面仍正常顯示

#### Scenario: 切換時保留編輯（session 內）
- **WHEN** 使用者切換到另一角色
- **THEN** 切換前的當前角色暫存編輯（HP、資源等）寫回角色清單
- **THEN** session 內切回該角色時，先前編輯仍在
