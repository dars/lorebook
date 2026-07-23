# Design: 職業資源推導

## Context

`ClassResource` 模型與 Decision 頁三型態顯示（pips/number/dice）皆已存在，且 `_updateResource` 已支援消耗/回復操作；缺的是生成端。範例角色手寫 resources，建角/升級管線不產生。App 既有哲學是「內建固定清單，不做通用規則引擎」（見 `kClasses`、`featureArmorViolation`），本設計沿用。資源數值規則（次數、骰面、恢復）在 SRD 目錄僅存在於特性內文，無結構化欄位，故規則表以 App 內建 Dart 常數維護。

## Goals / Non-Goals

**Goals:**
- 一張宣告式規則表涵蓋 SRD 5.2 十二職業的即時消耗型本職資源
- 建角（Lv1）生成、升級同步（max/骰面/新資源）、載入回填三個接入點共用同一推導函式
- 範例角色與管線產出一致

**Non-Goals:**
- 子職資源、魔法物品充能、使用者自訂資源（未來另案）
- 通用規則引擎／由內容庫文本解析數值
- 休息才觸發的機制（奧術回復、生命骰）——維持 `ClassResource` 模型註解的排除範圍
- 資源消耗 UI 變更（已實作）

## Decisions

### D1. 規則表形態：const 資料 + 公式列舉

```dart
enum ResourceUsesFormula { fixed, levelTable, abilityMod, equalsLevel, levelTimes }

class ClassResourceRule {
  final String classEn;          // 'Bard'
  final String name, nameEn;     // '吟遊激勵', 'Bardic Inspiration'
  final int fromLevel;           // 獲得等級（狂暴 1、術法點數 2）
  final ResourceUsesFormula formula;
  final int param;               // fixed: 次數；levelTimes: 倍率（聖療之觸 5×等級）
  final List<int>? levelTable;   // index=等級-1（狂暴 2,2,3,3,…）
  final String abilityCode;      // abilityMod: 'CHA'（下限 1）
  final List<int>? dieFacesTable;// dice 骰面隨等級（吟遊激勵 d6→d8→d10→d12）
  final ResourceRecovery recovery;
  final ResourceDisplay display;
  final String unit;
}
```

推導函式 `List<ClassResource> deriveClassResources(String classEn, int level, AbilityScores scores)`：純函式、可單測。不用閉包公式，維持 const 表可讀可審。

**替代方案**：目錄 data 欄位擴充（需動匯入管線與上游資料，違反 content-scope 的最小侵入）；每職業硬編碼 if-else（不可測、難審閱）——皆捨棄。

### D2. 涵蓋清單（SRD 5.2 十二職業）

| 職業 | 資源 | 公式 | 顯示 | 恢復 |
|---|---|---|---|---|
| 野蠻人 | 狂暴 | levelTable 2→6 | pips | 長休 |
| 吟遊詩人 | 吟遊激勵 | abilityMod CHA（≥1）；d6/d8@5/d10@10/d12@15 | dice | 長休（5 級起短休，見 D5） |
| 牧師 | 引導神力 | levelTable 2@2→3@6→4@18 | pips | 短休回 1／長休全回（簡化為短休，見 D5） |
| 德魯伊 | 荒野變身 | levelTable 2@2→… | pips | 短休 |
| 戰士 | 第二風 | levelTable 2→3@4→4@10 | pips | 短休 |
| 戰士 | 動作如潮 | fixed 1@2（2@17） | pips | 短休 |
| 武僧 | 專注點 | equalsLevel（自 2 級） | pips | 短休 |
| 聖騎士 | 聖療之觸 | levelTimes 5×等級 | number(HP) | 長休 |
| 聖騎士 | 引導神力 | levelTable 2@3→… | pips | 短休回 1（簡化，見 D5） |
| 術士 | 術法點數 | equalsLevel（自 2 級） | number(點) | 長休 |
| 遊俠/賊/法師/契術師 | —（無合格資源） | | | |

（確切級距數值以 SRD 5.2 全文為準，實作時逐條核對；契術師魔能位沿用現行 spellSlots 呈現，不入資源表。）

### D3. 升級同步：差額入帳

升級確認時重算 `newMax`；`current = (current + (newMax - oldMax)).clamp(0, newMax)`——升級當下獲得的新額度視為可用，已消耗的不因升級回復（升級不等於休息）。骰面直接更新。規則表新出現的資源（如 2 級術法點數）以 `current = max` 加入。abilityMod 型資源在能力值變動（升級加值、專長）後同步重算。

### D4. 載入回填：與 weapons→equipment 同模式

角色載入時 `backfillClassResources`：以 `nameEn` 比對，僅**新增缺漏**、不覆寫既有（保護使用者當前的消耗狀態與手動情境）；新增者 `current = max`。範例角色資料改為建構時呼叫同一推導函式，消除雙軌。

### D5. 恢復規則簡化（2024 細則的折衷）

2024 有多筆「短休回 1 點／長休全回」與「5 級起短休全回」細則。`ResourceRecovery` 目前僅 short/long 二值；本案**不擴充模型**，取「玩家有利且營運簡單」一側（如吟遊激勵 5 級後標短休）。細則差異寫入資源說明文字由玩家自行裁量——與 App「工具不裁判」的定位一致。

## Risks / Trade-offs

- [規則表數值抄錯] → 每職業單測對照 SRD 5.2 原文；tasks 內列逐職業核對步驟
- [回填覆寫使用者狀態] → 僅補缺不覆寫；nameEn 為比對鍵，改名資源視為新資源加入（舊條目保留，屬可接受雜訊）
- [恢復時機簡化與規則書不符] → D5 明示折衷並寫入資源描述；未來若擴充 recovery 列舉再細化
- [升級流程未走（直接編輯等級）的角色] → 載入回填以「當前等級」推導，天然覆蓋

## Migration Plan

單一 release 內完成：規則表＋建角→升級→回填→範例校正。無資料表變更、無伺服端配合；回滾即回退 App 版本（回填只增不改，舊版本讀新資料無害）。

## Open Questions

- 狂暴 2024「短休回 1 次」是否值得為它擴充 recovery 模型？（暫依 D5 簡化為長休）
- 聖療之觸池上限隨等級成長時，回填/升級的 current 是否按比例放大？（暫依 D3 差額入帳）
