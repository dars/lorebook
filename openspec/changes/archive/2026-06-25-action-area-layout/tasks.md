## 1. 整併動作區

- [x] 1.1 新增 `actions_section.dart`，整併 `action_section` / `bonus_action_section` / `reaction_section` 為單一「動作」區（內部三個動作經濟分節：動作 / 附贈動作 / 反應）
- [x] 1.2 decision_page 改用 `actions_section`，移除三個舊 section 的個別引用

## 2. 動作經濟分節與分組

- [x] 2.1 三層標頭：L1 `_EconomyHeader`（icon+類別+提示）、L2 類別小標、L3 環數細標，權重遞減
- [x] 2.2 「動作」分節 L2 排序：攻擊 → 施法 → 其他
- [x] 2.3 「施法」L3 資料驅動：戲法（無則略過）→ 各環遞增；無施法職業不顯示「施法」類別
- [x] 2.4 附贈動作 / 反應分節：沿用現有取得邏輯；無項目時顯示「無可用…」

## 3. 統一卡片與視覺

- [x] 3.1 其他動作改用 `EntryCard`（badge「動」，可附簡短規則描述供展開）
- [x] 3.2 移除本區對舊式卡片（`AbilityCard` 等）的使用；統一卡片間距與分節間距
- [x] 3.3 清理：舊 `action_section` / `bonus_action_section` / `reaction_section` 移除；確認 `AbilityCard` / `SubSectionHeader` 是否他處仍用，未用則一併清理

## 4. 可收合階層

- [x] 4.1 新增共用 `CollapsibleSection`（decorations.dart）：SectionTitle 樣式 + chevron + 可選收合摘要
- [x] 4.2 所有頂層區段（狀態/資源/移動/動作/附贈/反應/檢定/休息）改用 `CollapsibleSection` 自包；預設全展開
- [x] 4.3 動作內類別（攻擊/施法/其他）可收合（chevron + 計數）；預設 攻擊/施法 展開、其他 收合
- [x] 4.3b 施法子層（戲法/各環）可收合（chevron + 計數），**預設收合**
- [x] 4.4 動作/附贈/反應 收合時顯示內容摘要；收合狀態為本地 UI 狀態（不持久化）

## 5. 驗證

- [x] 5.1 `flutter analyze` 無錯誤
- [x] 5.2 實機驗證：三層分層正確、動作分組排序正確、卡片可展開
- [x] 5.3 實機驗證：所有頂層區段 + 動作內類別 收合/展開正常、預設狀態正確、收合顯示摘要
- [x] 5.4 實機驗證：無附贈/反應時顯示「無可用…」
- [x] 5.5 驗證手機與平板版型呈現正常
