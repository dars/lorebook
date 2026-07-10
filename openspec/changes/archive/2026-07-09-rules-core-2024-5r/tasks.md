# Tasks: rules-core-2024-5r

## 1. XPHB 原始資料引入（`../5etools` repo）

- [x] 1.1 自上游 5etools（含 2024 內容的版本）盤點 XPHB 相關資料檔（`conditionsdiseases.json`、`class/class-*.json` XPHB 條目、`races.json`、`backgrounds.json`、`feats.json`、`spells/spells-xphb.json`、`items.json`），選擇性複製進 fork 的 `data/`（依 design D1，不整包升級 fork）→ 實作註：上游 v2.32.0 原始檔置於 `data-upstream-2024/` 暫存區（避免未翻譯英文被 import glob 誤匯），翻譯完成批次才進 `data/`
- [x] 1.2 產出「PHB 有、XPHB 無」內容差異清單（子職、法術等），交使用者確認預期落差 → `data-upstream-2024/diff-phb-xphb.md`
- [x] 1.3 內容庫瘦身（外部 Supabase 專案，破壞性操作、執行前向使用者確認）：drop `monsters`、`spell_classes` 表與 `v_search`、`v_optionalfeatures` view；`import_to_supabase.py` 移除對應匯入邏輯，確認下次匯入不會重建（design D7；items/v_items、sources、races/backgrounds/feats 保留）→ 已執行並確認；SUPABASE.md 文件同步更新

## 2. 翻譯與匯入（分批，依 design D2/D3；每批翻譯完成→匯入。內容庫為外部 Supabase 專案，新增 `source='XPHB'` 列、不動 PHB 列，無 RLS 異動；schema 若需擴充只加 nullable 欄位）

- [x] 2.1 批次一：conditions（含力竭 2024 全文）繁中翻譯；以此小域試匯驗證 `import_to_supabase.py` 對 2024 資料結構的相容性，必要的 script／schema 調整在此完成（design D4）→ 15 條已入庫；中文名採 App 端用語（被擒抱/失能/倒地），tag 用 `{@tag Name|XPHB|中文}` 格式；script 無需調整
- [x] 2.2 批次二：classes / subclasses / class features 翻譯與匯入（2024 子職固定 Lv3、各職業 4 子職）→ 12 職業／48 子職／592 特性全數入庫、class_id FK 完整（注意：import script 對 class_features 清空重插，之後每次匯入須重跑 `scripts/backfill_class_ids.sql`）。附帶：職業引用的 optionalfeatures（戰技/超魔/禱文 58 條）另行翻譯匯入 entries 表
- [x] 2.3 批次三：species（races 表；2024 種族不含屬性加值）翻譯與匯入 → 10 種族入庫（阿斯莫/歌利亞/獸人沿用 fork 譯名；App 端「半獸人」名稱待 3.1 校正）
- [x] 2.4 批次四：backgrounds（2024 背景含屬性加值候選、固定技能、起源專長）翻譯與匯入 → 16 個入庫，術語對齊 App（技能/專長/能力值中文名）
- [x] 2.5 批次五：feats（含起源專長分類）翻譯與匯入 → 77 個入庫（起源 10、戰鬥風格 12、一般 43、史詩恩賜 12）
- [x] 2.6 批次六：spells 翻譯與匯入（量最大；以 PHB 繁中為基底做差異翻譯）→ **391/391 全數翻譯並入庫**（戲法 34／一環 64／二環 63／三環 52／四環 41／五環 48／六環 34／七環 21／八環 18／九環 16，DB 逐環驗證相符）。13 個 2024 新法術定名於 `spell-name-map.json`（神聖斬、術法爆發、星光縷、惑亂術、月光之泉、奧術活力、閃耀斬、律令強體、元素戲法、巨龍召喚術、塔莎沸騰大釜、賈拉爾茲光耀風暴、尤蘭妲的王者威儀）
- [ ] 2.7 批次七：items 翻譯與匯入（可延後於 App 切換之後，見 design Open Questions；延後時需先確認 4.4 的空結果 UX）
- [x] 2.8 全域驗證：各表 `source='XPHB'` 筆數非空、subclass↔class 跨表關聯（uuid）完整、`v_spells` view 對 XPHB 正常（對應 catalog-source spec「內容庫 XPHB 資料涵蓋」）→ 全數通過：conditions 15／optionalfeatures 58／classes 12／subclasses 48（FK 0 null）／class_features 592（FK 0 null）／races 10／backgrounds 16／feats 77／spells 391。**過程中發現並修復**：2024 上游法術資料不再內嵌 `classes.fromClassList`，導致 XPHB 法術 `classes` 欄全空、App 職業過濾會查無資料——已自上游 `gendata-spell-source-lookup.json` 回填 391 筆並重匯（staging 與 fork 檔均已含回填資料，日後重匯無虞）。驗證：法師法術 242、牧師戲法 9、無職業歸屬 0

## 3. 權威表一致性校驗（本 repo，依 design D8；需先完成 2.2、2.6）

- [x] 3.1 以 XPHB 匯入資料對照 `character_math.dart`（施法進程、法術位表、戲法/備法數、ASI 等級）與 `character_creation_data.dart`（職業/種族/背景清單），不一致處以 XPHB 原文為準修正並更新對應測試 → **全部完成**。種族：kSpecies 改為 XPHB 十種族（補阿斯莫/歌利亞、半獸人改名獸人、特性名對齊內容庫譯名）。職業：12 職業的生命骰/豁免/技能清單/1 級施法數值以上游資料機械化比對全數相符。權威表機械化比對（全 20 級）發現並修正兩處：①法師可備法術數 Lv14 起有專屬進程（…18,19,21,22,23,24,25），原誤用全施法者共用表；②ASI 等級改為按職業 `asiLevelsFor()`——戰士另有 6/14、盜賊另有 10，原全域表缺漏。背景：kBackgrounds 由 8 個補齊為 XPHB 全 16 個（新增工匠/江湖騙子/藝人/農夫/隱士/商人/抄書吏/流浪者），16 個的能力值/技能/起源專長以上游資料機械化比對全數相符。法術位表（全/半/契約）、戲法數、術士/邪術師備法數比對零差異。測試補 3 項，`flutter test` 91 項全綠

## 4. App 書源切換（本 repo；需先完成 2.8）

- [x] 4.1 `lib/features/catalog/data/catalog_repository.dart`：`kCatalogSource` 由 `'PHB'` 改 `'XPHB'`，更新註解；確認無其他書源字面值散落（catalog-source spec）→ 完成，lib 全域僅剩此常數一處字面值
- [x] 4.2 `lib/features/decision/presentation/sections/status_section.dart`：移除力竭本地自撰全文，改走一般狀態的內容庫全文路徑；離線降級本地摘要行為保留（decision delta spec）→ 完成，`_exhaustion2024` 常數與特例分支移除；本地 2024 摘要（`conditions_catalog.dart`）保留供離線降級
- [x] 4.3 更新測試 fixtures：`source` 標記全改 XPHB；conditions 渲染煙霧測試 fixture 換為 DB 的 XPHB 15 狀態真實快照（`conditions_xphb.json`，全數渲染無殘留標記）；新增 `catalog_repository_test.dart` 驗證預設書源 XPHB 與建構注入替換 → `flutter test` 93 項全綠
- [x] 4.4 實機驗證 → 已完成三層驗證：①資料路徑實測探針（真實 Supabase × App 實際 `CatalogRepository`）6 項全過——種族 10（含獸人/阿斯莫）、職業 12、野蠻人 4 子職 48 特性、背景 16、專長 77、法師戲法含火焰箭、力竭為 2024 全文且無 2014 效果表；②XPHB 15 狀態真實快照的渲染煙霧測試全過（無殘留標記）；③iPhone 16 Pro 模擬器實跑，Supabase 初始化成功、登入頁正常。**登入後的建角/升級/Decision 互動畫面需登入 dev 帳號，App 已留在模擬器上待使用者手動目視確認**（自動化需臨時帳號，涉及 service role 已停手）。items 延後：App 目前無任何物品目錄查詢路徑，無空結果 UX 疑慮
- [x] 4.5 `flutter test` 93 項全綠、`flutter analyze` 無告警；in-flight changes（class-choice-features、level-up-flow）的測試皆在同一 suite 內一併通過（level_up 測試已隨 3.1 的 ASI 修正同步更新）

## 5. 收尾

- [x] 5.1 檢查 `openspec/specs/` 其他 spec 是否殘留「PHB／2014」描述需隨 archive 更新；CLAUDE.md 如有書源描述一併校對 → 僅兩處殘留（spell-catalog「現為 PHB」、decision 力竭本地全文），皆為本 change delta specs 已涵蓋的 MODIFIED requirement，archive 時自動更新；CLAUDE.md 無書源殘留
