## MODIFIED Requirements

### Requirement: Resources 資源區塊
Decision 頁面 SHALL 依職業動態顯示可用資源：法術位，以及通用的職業資源（次數型 / 數字池 / 骰子型）。

#### Scenario: 法術位
- **WHEN** 角色為施法者
- **THEN** 法術位以**金色 pip（點狀）**呈現，與離散型職業資源共用同一樣式
- **THEN** 依環數分列顯示（如 1環、2環）
- **THEN** 每列顯示剩餘/最大值

#### Scenario: 次數型職業資源
- **WHEN** 角色有次數型資源（pips，如狂暴、引導神力、契約位）
- **THEN** 以剩餘/最大的點狀顯示該資源名稱與數量

#### Scenario: 數字池職業資源
- **WHEN** 角色有數字池資源（number，如法術點數、聖療之觸）
- **THEN** 顯示「當前值 + 單位」（如 15 HP、5 點）
- **THEN** 左右各提供 +/- 圓鈕直接調整（夾 0~max）
- **THEN** 以小字標示最大值（上限）

#### Scenario: 骰子型職業資源
- **WHEN** 角色有骰子型資源（dice，如吟遊激勵）
- **THEN** 以 `1dN` 格式顯示骰面
- **THEN** 顯示剩餘次數，並以 +/- 調整（夾 0~max）

#### Scenario: 無職業資源
- **WHEN** 角色沒有任何非法術位職業資源
- **THEN** 不顯示職業資源段落

## ADDED Requirements

### Requirement: 職業資源消耗與回復
Resources 區塊 SHALL 允許消耗與回復職業資源，數值夾在 0 ~ 最大值之間。

#### Scenario: 消耗資源
- **WHEN** 使用者消耗某項資源
- **THEN** 該資源當前值 −1，且不低於 0

#### Scenario: 回復資源
- **WHEN** 使用者回復某項資源
- **THEN** 該資源當前值 +1，且不超過最大值

### Requirement: 休息回復職業資源
休息 SHALL 依資源的回復時機回滿對應職業資源。

#### Scenario: 短休回復短休資源
- **WHEN** 角色完成短休
- **THEN** 回復時機為「短休」的資源回滿至最大值
- **THEN** 回復時機為「長休」的資源不變

#### Scenario: 長休回復所有資源
- **WHEN** 角色完成長休
- **THEN** 所有職業資源回滿至最大值
