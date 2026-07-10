# Proposal: srd-content-baseline

## Why

專案定位重新對齊:一切以 D&D 2024(5r)規則為基準,內容**僅支援 SRD 5.2(CC-BY-4.0)與使用者自訂資料**,不涵蓋怪物、官方劇本與劇情。但 `rules-core-2024-5r` 完成後,內容庫與本地權威表承載的是**整本 XPHB(2024 玩家手冊)**——其中大量內容(52 法術、36 子職、12 背景、60 專長等)超出 SRD 5.2 授權範圍;含專有名的內容(如 Bigby's、Tasha's 系列)屬 Product Identity,不在 CC-BY-4.0 之列。範圍政策亦未在任何文件明文化。

## What Changes

- **內容庫收斂(外部內容 Supabase 專案,破壞性)**:刪除所有非 SRD 5.2 的資料列——含 XPHB 中無 `srd52` 標記者,以及整個 PHB(2014)書源列(fork 原始資料仍在,可重建)。`entries` 長尾條目同步僅保留 SRD 5.2 涵蓋者。
- **匯入管線(外部 `../5etools` repo)**:`import_to_supabase.py` 改讀上游 `srd52` 鍵(現只讀 2014 的 `srd` 鍵,致 XPHB 列 `srd` 全 false):非 SRD 條目不匯入、SRD 條目正確標記 `srd=true`,確保日後重匯不會回灌非 SRD 內容。
- **SRD 官方改名**:含專有名的內容跟隨 SRD 5.2 改名(如 Bigby's Hand→Arcane Hand),中英文名與譯名一併重新定名,App 顯示與內文交叉引用(`{@spell …}` 等 tag)同步。
- **本地權威表收斂(本 repo)**:`character_creation_data.dart` 的種族(10→9,移除 Aasimar)、背景(16→4)等選項對齊 SRD 5.2;`character_math.dart` 權威表重新校驗(職業 12/12 全保留,預期不變)。
- **範圍政策明文化**:CLAUDE.md、README、`openspec/config.yaml`、`designs/SUPABASE.md` 加入範圍宣告——僅 SRD 5.2(CC-BY-4.0,附 attribution)+ 使用者自訂資料;不涵蓋怪物、官方劇本/劇情;玩家自產的 Campaign 共用筆記仍屬藍圖核心(排除的是官方出版內容,非使用者內容)。
- **homebrew(使用者自訂資料)**:本次僅宣告為合法內容來源,資料模型與編輯 UI 另開獨立 change。
- 前置:`rules-core-2024-5r` 已完成,先 archive 使其 delta specs(`catalog-source` 等)落地後,本 change 再以 delta 修訂。

**BREAKING**:內容庫刪列不可逆(原始資料可重建);已建立且選用非 SRD 內容(子職、背景、專長、法術)的角色卡,其快照資料不受影響,但升級/改選時對應目錄選項將不存在。

## Capabilities

### New Capabilities

- `content-scope`: 內容範圍政策——App 一切規則內容 SHALL 以 2024(5r)為基準,且 SHALL 僅來自 SRD 5.2(CC-BY-4.0)或使用者自訂資料;SHALL NOT 涵蓋怪物、官方劇本/劇情內容;Product Identity 名稱 SHALL 以 SRD 改名替代;SRD 內容 SHALL 附 CC-BY-4.0 attribution。

### Modified Capabilities

- `catalog-source`: 內容庫書源政策由「單一書源 XPHB(全書)」修訂為「XPHB 書源中屬 SRD 5.2 的內容」;內容庫 SHALL 不含非 SRD 資料列。(需待 `rules-core-2024-5r` archive 後以 delta 修訂)
- `spell-catalog`: 法術目錄範圍收斂為 SRD 5.2(339 法術);含專有名法術改用 SRD 名稱。(建角選項收斂由新的 `content-scope` 統一涵蓋,`character-management` 規格文字無書源敘述、不需 delta)

## Impact

- **資料層(外部內容 Supabase `nmzvywrgefodpqdsqvsf`)**:刪除非 SRD 列(spells 52、subclasses 36、backgrounds 12、feats 60、races 1、optionalfeatures 29、PHB 全書源列、entries 非 SRD 條目);改名列更新 `name`/`eng_name`/`data`。無 schema 變更、RLS 沿用。角色卡與使用者資料完全不動。
- **外部 repo(`../5etools`)**:`import_to_supabase.py` srd52 邏輯;`spell-name-map.json` 等定名檔跟隨 SRD 改名。
- **程式碼(本 repo)**:`character_creation_data.dart`(種族/背景清單)、相關測試 fixtures(如 `conditions_xphb.json` 若含改名引用);`catalog_repository.dart` 查詢邏輯預期不變(仍 `source='XPHB'`,由資料層保證 SRD-only)。
- **文件**:CLAUDE.md、README.md、`openspec/config.yaml`、`designs/SUPABASE.md`。
- **進行中 changes**:`level-up-flow`、`class-choice-features`(backlog)透過 `CatalogRepository` 查詢,收斂後自動生效;`class-choice-features` 規劃的戰技/超魔/禱文選項需以 SRD 覆蓋範圍(29/58)重新評估。
- **版型**:手機/平板皆無 UI 結構變更(選項變少、名稱變更)。
- **依賴**:無新第三方套件。
