# Design: rules-core-2024-5r

## Context

- App 端規則邏輯（`character_math.dart`、`level_up.dart`、`character_creation_data.dart`）已按 D&D 2024 實作，本地權威表齊備。
- 內容庫為外部 Supabase 專案（`nmzvywrgefodpqdsqvsf`，唯讀、全繁中），資料來源是 `../5etools` 繁中化 fork（v1.129.0），經 `scripts/import_to_supabase.py` 匯入。
- fork 與內容庫皆**無任何 XPHB（2024）資料**；App 的 `CatalogRepository` 所有查詢固定過濾 `kCatalogSource = 'PHB'`。
- 已確認決策：**翻譯完成後才匯入**（維持內容庫全繁中）；change 範圍涵蓋 `../5etools` 資料工作與本 repo App 切換。
- 本 change 無 UI 結構變更，手機/平板版型不受影響（Material 3 / 觸控目標等 UI 規範不適用於此 change）。

## Goals / Non-Goals

**Goals:**
- 內容庫新增完整繁中 XPHB（2024 核心）資料：conditions（含力竭）、classes / subclasses / class features、species（races 表）、backgrounds、feats、spells、items。
- App 內容庫書源一次性切換為 XPHB，規則邏輯與顯示內容統一為 2024 修訂版。
- 移除為 2014 內容庫做的補償碼（力竭本地自撰全文）。

**Non-Goals:**
- 不刪除、不改動保留表中的既有 PHB（2014）資料——保留作為回滾路徑（無程式路徑的死表另依 D7 移除）。
- 不做「使用者可切換書源」的 App 內設定（書源仍為單一常數，僅保留建構注入點）。
- 不升級 `../5etools` fork 的網站功能與整體版本。
- 不回填/轉換使用者既有角色卡（快照資料維持建卡當下內容）。
- 不擴充 2024 核心三書以外的內容（XDMG、XMM 另案）。

## Decisions

### D1：XPHB 原始資料取得——選擇性引入資料檔，不整包升級 fork
從上游 5etools（含 2024 內容的新版 data，如 `spells/spells-xphb.json`、各 `class/class-*.json` 的 XPHB 條目、`conditionsdiseases.json` 等）只複製 XPHB 相關資料進 fork 的 `data/`。
- 替代方案：把 fork 整包 merge 到上游 2.x —— 否決：fork 客製（繁中化）與上游差異巨大，merge 成本與風險遠高於只搬資料檔；本 change 只需要資料，不需要網站新功能。

### D2：翻譯流程——以 2014 繁中為基底的差異翻譯，按資料域分批
2024 大量條目是 2014 的修訂版（同名法術、同名狀態），以既有 PHB 繁中翻譯為基底、比對英文原文差異後修訂，全新條目才從頭翻。批次順序按「條目數少→多、App 依賴深→淺」：**conditions → classes/subclasses/features → species → backgrounds → feats → spells → items**。
- 替代方案：全部從頭翻——否決：浪費既有翻譯資產、用語一致性更難維持。

### D3：匯入策略——分批匯入 DB、App 一次切換
每個資料域翻譯完成即可先匯入內容庫（新增 `source = 'XPHB'` 列，upsert、不動 PHB 列）；App 在**所有核心資料域到齊並驗證後**才把 `kCatalogSource` 改為 `'XPHB'` 一次切換。DB 先行有 XPHB 資料不影響線上 App（查詢固定過濾 PHB）。
- 替代方案：翻完一域切一域（App 端混書源查詢）——否決：`CatalogRepository` 單一 source 設計簡單且已被 spec 固定，混書源引入跨表關聯（subclass ↔ class source）不一致風險。

### D4：`import_to_supabase.py` 相容性——先以 conditions 小域試匯
2024 資料結構與 2014 有差異（class features 結構、background 給屬性加值與起源專長、species 無屬性加值等）。先用條目數最少的 conditions 驗證 script 與 schema 相容性，需要的欄位擴充在此階段一次確認。
- 若 schema 需加欄位：只加 nullable 欄位，不改既有欄位型別（PHB 資料不受影響）。

### D5：App 切換點——只改 `kCatalogSource` 常數
`CatalogRepository` 已支援建構注入 `source`，所有查詢走同一常數，切換即全域生效（法術、職業、子職業、種族、背景、專長、物品、長尾條目）。不新增設定面板或 feature flag。

### D6：力竭全文回歸內容庫
XPHB 的 Exhaustion 條目即 2024 規則（−2 d20 檢定、速度 −5 呎/級），`status_section.dart` 移除本地自撰全文，改走與其他狀態相同的內容庫全文路徑；離線降級為本地摘要的既有行為不變。本地**摘要**常數（`conditions_catalog.dart`）保留。

### D7：內容庫瘦身——刪除無程式路徑的表與 view
盤點結果：`monsters`（2,267 列）無任何查詢；`spell_classes`（1,533 列）連 `v_spells` 都不使用（法術過濾走 `spells.classes` 陣列欄位）；`v_search`、`v_optionalfeatures` 無人引用。四者整張刪除，XPHB 轉檔範圍排除 monsters 與 spell 關聯表，`import_to_supabase.py` 同步移除對應匯入邏輯（避免下次匯入重建）。
- `items`/`v_items` **保留**：目前無程式路徑，但裝備目錄是角色卡 roadmap 功能；XPHB items 翻譯批次維持可延後。
- `sources`（59 列書目對照）、`races`/`backgrounds`/`feats`（現由本地清單供建角，未來改吃內容庫）**保留**，照原計畫翻譯匯入。
- 回復成本：5etools 原始資料與 schema migration 都在 fork repo，需要時可重建。

### D8：權威表一致性驗證
切換前以 XPHB 匯入資料對照本 repo 本地權威表（施法進程、戲法/備法數、ASI 等級、子職等級）做一次人工/腳本校驗，發現不一致以 XPHB 原文為準修正本地表。

## Risks / Trade-offs

- [刪表不可逆、未來又要用到] → 僅刪確認無程式路徑者（monsters、spell_classes、v_search、v_optionalfeatures）；原始資料與建表 SQL 皆在 `../5etools` repo，可重建。有 roadmap 用途的 items 與建角三表（races/backgrounds/feats）一律保留。

- [翻譯工作量大、時程長] → D2 差異翻譯 + 分批推進；conditions/classes 先行可提早解鎖 App 端驗證；翻譯進度不阻塞其他 change。
- [2024 資料結構與 import script 不相容] → D4 小域試匯先驗證；schema 只加不改。
- [XPHB 未收錄部分 2014 內容（部分子職、法術）] → 預期行為：2024 核心以 XPHB 為準；既有角色為快照不受影響。翻譯盤點時輸出「PHB 有、XPHB 無」清單供確認。
- [in-flight changes（class-choice-features、level-up-flow）與本 change 撞書源] → 該兩項基於 `CatalogRepository`，先完成後自動生效；實作本 change 時再跑其測試確認 fixture 未寫死 PHB。
- [切換後發現內容缺漏] → 回滾成本極低：`kCatalogSource` 改回 `'PHB'` 即恢復，DB 無破壞性變更。

## Migration Plan

1. 上游 XPHB 資料檔引入 fork → 翻譯（分批）→ 分批匯入內容庫（`source = 'XPHB'`）。
2. 全域驗證（各表 XPHB 筆數、跨表關聯、權威表對照）。
3. 本 repo：改 `kCatalogSource`、力竭全文改內容庫、更新測試 → release。
4. 回滾：App 端常數改回 `'PHB'`；DB XPHB 列可留存不影響。

## Open Questions

- items（物品/裝備）量大且 App 目前依賴淺，是否列入首發或延後批次？（預設：延後至最後批次，不阻塞切換——若切換時 items 未齊，需確認 App 物品查詢的空結果 UX 可接受）
- 翻譯是否引入機器輔助流程（另行決定，不影響本 change 結構）。
