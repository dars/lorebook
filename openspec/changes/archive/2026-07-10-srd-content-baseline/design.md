# Design: srd-content-baseline

## Context

`rules-core-2024-5r` 已把內容庫與本地權威表切到 XPHB(2024 全書):spells 391、subclasses 48、backgrounds 16、feats 77、races 10、optionalfeatures 58 全數翻譯入庫;PHB(2014)列依當時決策保留。專案重新定位為「僅 SRD 5.2(CC-BY-4.0)+ 使用者自訂資料」後:

- SRD 5.2 實際覆蓋(以上游 `srd52` 鍵統計):spells 339/391、classes 12/12、subclasses 12/48(每職業 1)、backgrounds 4/16(侍僧/罪犯/學者/士兵)、feats 17/77、races 9/10(缺 Aasimar)、conditions 15/15、optionalfeatures 29/58。
- 內容庫 `srd` 欄位對 XPHB 列**全為 false**(已實測):`import_to_supabase.py` 只讀 2014 的 `srd` 鍵,未讀 `srd52`。
- 17 個含專有名法術在 SRD 5.2 有官方改名(如 Bigby's Hand→Arcane Hand、Tasha's Hideous Laughter→Hideous Laughter),原專有名屬 Product Identity。
- 使用者已決策:非 SRD 列**直接刪除**(而非保留+查詢過濾)、顯示名跟隨 SRD 改名、homebrew 先宣告政策後續獨立 change、Campaign 玩家自產筆記保留於藍圖。

## Goals / Non-Goals

**Goals:**
- 內容庫(外部 Supabase)僅含 SRD 5.2 資料列;匯入管線防止非 SRD 內容回灌
- 17 個改名法術以 SRD 名稱重新定名(英文名 + 繁中譯名)
- 本地權威表(`character_creation_data.dart`)對齊 SRD 5.2 選項
- 範圍政策(SRD 5.2 + 使用者自訂;無怪物/官方劇本/劇情)明文化於 CLAUDE.md、README、config.yaml、SUPABASE.md,並補 CC-BY-4.0 attribution
- App 端行為不變式:查詢仍 `source='XPHB'` 單書源,SRD-only 由資料層保證

**Non-Goals:**
- homebrew 資料模型與編輯 UI(獨立 change)
- items 批次匯入(維持 rules-core 的延後決策;屆時匯入即以 srd52 過濾)
- Campaign 多人共用筆記的實作(藍圖保留,非本次)
- 全書模式/多書源切換(刪除路線下不提供)

## Decisions

### D1:收斂機制 = 資料層刪除 + 匯入層過濾(雙保險)

- **刪除**:內容庫刪除 (a) `source='XPHB'` 且非 SRD 5.2 的列、(b) 整個 `source='PHB'`(2014)書源列——2024 基準下 2014 內容既非基準版本也非 SRD 5.2。
- **防回灌**:`import_to_supabase.py` 的 `truthy_srd()` 改讀 `srd52` 鍵(bool 或 str 均視為 in-SRD);新增「非 SRD 條目直接跳過不匯入」的全域規則,並將 `srd` 欄位回填正確值(供驗證查詢用)。
- **為何不改 App 查詢**:資料層已保證 SRD-only,`kCatalogSource='XPHB'` 與所有查詢維持不動,App 端零風險;`catalog-source` 的「單一書源、常數集中、可注入」政策全部沿用。
- 替代方案(保留列+`srd=true` 查詢過濾)已由使用者否決:庫面乾淨優先,fork 原始資料仍可重建。

### D2:刪除以「全清重匯」執行,而非逐列 DELETE

XPHB 各表以「清空 `source='XPHB'` 列 → 以 srd52-aware script 重匯」達成,PHB 列以 `DELETE WHERE source='PHB'` 清除。理由:與防回灌邏輯共用同一份過濾實作,避免手寫刪除名單與 script 邏輯不一致;`class_features` 本就是清空重插模式。既知注意事項:重匯後須重跑 `scripts/backfill_class_ids.sql`(class_features FK),並重跑 rules-core 2.8 的法術 `classes` 欄回填驗證(fork 檔已含回填資料)。

### D3:SRD 改名在 fork 資料層完成,一次重匯帶入

17 個改名法術於 fork 資料檔更新:`ENG_name` 改 SRD 名、繁中名重新定名(去專有名,如「毕格比之掌/畢格比之掌」→依 Arcane Hand 定名)、`spell-name-map.json` 同步。改名後全庫掃描交叉引用 tag(`{@spell 舊名|XPHB}` 等)同步更新,避免 SRD 內文引用失效名稱。App 端測試 fixtures(如 `conditions_xphb.json`)若含舊名引用一併更新。

### D4:entries 長尾與 optionalfeatures 同機制過濾

`entries` 表(deity/hazard/trap/reward 等 kind)與 optionalfeatures(戰技/超魔/禱文)同樣依上游 `srd52` 標記過濾重匯;非 SRD 條目(29/58 optionalfeatures 之外者與非 SRD entries)刪除。`sources` 書目對照表保留不動(無害、供 attribution 對照)。

### D5:本地權威表收斂

- `kSpecies`:10→9,移除阿斯莫(Aasimar);其餘 9 種族(龍裔/矮人/精靈/侏儒/歌利亞/半身人/人類/獸人/魔人)為 SRD 5.2 全集。
- `kBackgrounds`:16→4(侍僧/罪犯/學者/士兵)。其起源專長(魔法學徒×2/警覺/蠻力攻擊手)均在 SRD 17 專長內,無斷鏈。
- `kClasses`:12 職業全保留;`character_math.dart` 進程表不受影響(職業層資料 SRD 全涵蓋),重跑既有機械化比對測試確認。
- 建角/升級流程邏輯不動,選項自然縮減。

### D6:角色卡快照不受影響(BREAKING 的界定)

既有角色卡為建卡時的反正規化快照,刪列不影響已存資料;影響面僅在「之後的升級/改選」查不到非 SRD 選項。現階段為 dev 環境、無正式使用者,不做遷移工具;政策宣告後,homebrew change 是補足自訂內容的正式途徑。

### D7:attribution 落點

- README 與 SUPABASE.md:聲明內容來源為 SRD 5.2、CC-BY-4.0 授權條款連結與必要署名文字。
- App 內:於現有「關於/設定」區塊加入授權聲明文字(純文字/連結,不新增依賴)。若 App 尚無合適落點,最小實作為設定頁一列「授權聲明」開啟對話框。

## Risks / Trade-offs

- [刪列不可逆] → fork 原始資料(`data-upstream-2024/`)完整保留,srd52-aware script 可隨時全量重建;執行前依慣例向使用者確認破壞性操作。
- [class_features 清空重插致 FK 斷鏈] → 重匯後必跑 `backfill_class_ids.sql` + 全域驗證(筆數、FK null 檢查)列為必要 task。
- [SRD 內文殘留對非 SRD 內容的交叉引用](如 SRD 法術描述引用被刪法術)→ 重匯後全庫掃描 `{@spell/@feat/@…|XPHB}` tag,引用目標不存在者列清單處理(改純文字或改引 SRD 對應者);渲染端本就對未知引用降級純文字,不會崩潰。
- [子職 12/48、背景 4/16 大幅縮水的體驗落差] → 屬定位決策的預期結果;由 homebrew change 補足,`class-choice-features`(backlog)屆時以 SRD 覆蓋(戰技/超魔/禱文 29/58)重新評估範圍。
- [17 法術繁中重定名的品質] → 定名集中於 `spell-name-map.json` 一處,依專案既有定名慣例翻譯,重匯前交使用者過目。

## Migration Plan

1. 先 archive `rules-core-2024-5r`(已完成),使 `catalog-source`/`spell-catalog` delta 落地至 `openspec/specs/`,本 change 的 delta 才有修訂基底。
2. fork 資料層:script srd52 邏輯 → 17 法術改名 → 產出「將刪除清單」交使用者確認。
3. 內容庫(破壞性,執行前確認):DELETE PHB 列 → XPHB 各表清空重匯 → backfill → 全域驗證(各域筆數對照 SRD 覆蓋數、FK 完整、交叉引用掃描)。
4. 本 repo:權威表收斂 → 測試 fixtures 更新 → `flutter test`/`analyze` 全綠 → 實機驗證建角選項。
5. 文件與 attribution 收尾。
6. 回滾策略:fork 資料與 script 可全量重建任一狀態(含回到全 XPHB),App 端無 schema 變更、單 commit revert 即可。

## Open Questions

- App 內 attribution 的確切落點(現有設定/關於頁結構)於實作時確認,最小方案見 D7。
- `sources` 表是否順手清到僅剩 XPHB 一列:預設保留全表(無程式路徑讀取、供書目對照),如使用者偏好乾淨可於 3. 一併清。
