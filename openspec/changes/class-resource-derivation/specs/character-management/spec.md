# character-management Spec Delta

## ADDED Requirements

### Requirement: 建角初始職業資源
建角完成時，角色快照 SHALL 包含依所選職業以 Lv1 推導的職業資源（`deriveClassResources`）；能力調整值型公式以建角定案的能力值計算。推導不依賴內容庫連線，離線建角 SHALL 同樣產出資源。

#### Scenario: 建立野蠻人
- **WHEN** 完成野蠻人建角
- **THEN** 角色 resources 含狂暴（Lv1 次數、current = max）

#### Scenario: 建立無資源職業
- **WHEN** 完成法師建角
- **THEN** 角色 resources 為空，資源區僅顯示法術位
