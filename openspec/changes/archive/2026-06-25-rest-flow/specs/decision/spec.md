## MODIFIED Requirements

### Requirement: 休息功能
Decision 頁面 SHALL 提供長休與短休功能：長休需確認後完整恢復；短休以資訊型對話框告知可執行的事。

#### Scenario: 長休確認
- **WHEN** 使用者點擊長休
- **THEN** 顯示確認對話框
- **WHEN** 使用者取消
- **THEN** 不做任何恢復

#### Scenario: 長休完整恢復
- **WHEN** 使用者於確認對話框確認長休
- **THEN** HP 回滿、法術位回滿、職業資源回滿
- **THEN** 臨時 HP 清空
- **THEN** 力竭等級 −1（不低於 0）

#### Scenario: 短休對話框
- **WHEN** 使用者點擊短休
- **THEN** 跳出 bottom sheet
- **THEN** 顯示生命骰細節（依角色職業骰面與等級，如「3d6」）
- **WHEN** 角色具有奧術恢復特性
- **THEN** 以與法術相同的可展開卡呈現奧術恢復，點開顯示其敘述

#### Scenario: 完成短休
- **WHEN** 使用者於短休對話框點「完成短休」
- **THEN** 回滿「短休回復」的職業資源
- **THEN** 關閉對話框
