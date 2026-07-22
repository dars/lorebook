# catalog-source Delta

## MODIFIED Requirements

### Requirement: 內容庫 XPHB 資料涵蓋
內容庫(外部 Supabase 內容專案)SHALL 收錄繁體中文的 XPHB(2024 核心)資料中屬 SRD 5.2 範圍者,至少涵蓋:異常狀態(含力竭)、職業與子職業(含職業特性)、種族(Species)、背景、專長、法術、裝備(items);資料列以 `source = 'XPHB'` 標記且 `srd = true`。裝備資料 SHALL 含類別(武器/護甲/冒險裝備/工具)、子分類(`subcategory`,分組瀏覽用:武器分簡易/軍用×近戰/遠程、護甲分輕/中/重/盾、冒險裝備依用途)、價格(`price_cp` 整數,cp 計)、重量,以及機制欄位:武器條目含傷害骰、傷害類型、屬性標籤(finesse/two-handed 等);護甲條目含 AC 公式參數(基值、護甲類別、Dex 上限)。匯入管線比照既有資料域依上游 `srd52` 標記過濾。內容庫 SHALL NOT 保留任何非 SRD 資料列:PHB(2014)書源列與 XPHB 中無 srd52 標記的條目 SHALL 刪除(fork 原始資料保留,可重建)。

#### Scenario: 核心資料域筆數非空且為 SRD 範圍
- **WHEN** 以 `source = 'XPHB'` 查詢 conditions/classes/subclasses/races/backgrounds/feats/spells 各表
- **THEN** 各表皆回傳非空結果,文字內容為繁體中文,且筆數與 SRD 5.2 覆蓋一致(conditions 15/classes 12/subclasses 12/races 9/backgrounds 4/feats 17/spells 339)

#### Scenario: 裝備資料域非空且欄位完整
- **WHEN** 以 `source = 'XPHB'` 查詢 `items`(經 `v_items`)
- **THEN** 回傳非空結果,涵蓋武器/護甲/冒險裝備/工具四類,各列含中文名稱、類別、`price_cp` 整數與重量;武器列含傷害骰/傷害類型/屬性標籤,護甲列含 AC 公式參數;筆數以匯入時盤點的 SRD 5.2 覆蓋數為準

#### Scenario: 非 SRD 資料列已清除
- **WHEN** 以 `source = 'PHB'` 查詢任一內容表,或以 `srd = false` 查詢 `source = 'XPHB'` 的列
- **THEN** 均回傳空結果
