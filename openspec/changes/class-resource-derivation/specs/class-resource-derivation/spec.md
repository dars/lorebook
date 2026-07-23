# class-resource-derivation Spec Delta

## ADDED Requirements

### Requirement: 職業資源規則表
App SHALL 內建 SRD 5.2 十二職業的即時消耗型本職資源規則表（Dart 常數），每筆規則 SHALL 定義：資源名稱（中英）、獲得等級、次數/池量公式（固定值、等級對照表、能力調整值下限 1、等於等級、等級倍數之一）、骰面成長表（骰子型限定）、恢復時機（短休/長休）、顯示型態（pips/number/dice）與單位。休息才觸發的機制（奧術回復、生命骰）與子職資源 SHALL NOT 納入。

#### Scenario: 吟遊詩人規則
- **WHEN** 以吟遊詩人 Lv5、魅力調整值 +3 推導
- **THEN** 產出吟遊激勵：次數 3（=魅力調整值）、d8（5 級升骰）、dice 顯示

#### Scenario: 無合格資源的職業
- **WHEN** 以法師或賊推導任意等級
- **THEN** 產出空清單（契術師魔能位沿用法術位呈現，不入資源表）

### Requirement: 推導函式
App SHALL 提供純函式 `deriveClassResources(classEn, level, abilityScores)`，回傳該職業於該等級應具備的職業資源清單；未達獲得等級的資源 SHALL NOT 出現。

#### Scenario: 未達獲得等級
- **WHEN** 以術士 Lv1 推導
- **THEN** 不含術法點數（2 級才獲得）

### Requirement: 升級同步
升級確認時 App SHALL 依規則表重算資源：max 與骰面更新；current 依差額入帳（`current + (newMax − oldMax)`，夾在 0..newMax），升級 SHALL NOT 視為休息回滿；規則表於新等級新出現的資源以 current = max 加入。

#### Scenario: 狂暴次數成長
- **WHEN** 野蠻人 2→3 級（狂暴 2→3 次），升級前已用 1 次（current 1/2）
- **THEN** 升級後 current 2/3

#### Scenario: 新資源獲得
- **WHEN** 術士 1→2 級
- **THEN** 資源清單加入術法點數 2/2

### Requirement: 載入回填
角色載入時 App SHALL 以 nameEn 比對規則表推導結果，僅補寫缺漏資源（current = max），SHALL NOT 覆寫既有同名資源的任何欄位。

#### Scenario: 舊角色補資源
- **WHEN** 載入一個 resources 為空的吟遊詩人 Lv5
- **THEN** 資源清單補入吟遊激勵（3/3、d8），其餘欄位不變

#### Scenario: 不覆寫既有狀態
- **WHEN** 載入的野蠻人已有狂暴 1/3
- **THEN** 狂暴維持 1/3 不被重算

### Requirement: 範例角色一致性
內建範例角色的職業資源 SHALL 與規則表推導結果一致（由推導函式生成或經回填校正），SHALL NOT 存在手寫數值與管線產出不一致的落差。

#### Scenario: 範例野蠻人
- **WHEN** 檢視範例野蠻人（Lv3）的資源
- **THEN** 狂暴次數與規則表 Lv3 推導一致
