# Tasks: srd-content-baseline

## 1. 前置

- [x] 1.1 Archive `rules-core-2024-5r`(已完成、僅 2.7 items 批次為既定延後),使 `catalog-source`/`spell-catalog` delta 落地至 `openspec/specs/`,本 change 的 MODIFIED delta 才有修訂基底(執行前向使用者確認)
- [ ] 1.2 於 fork(`../5etools`)以 `srd52` 標記產出「將刪除清單」(各表:XPHB 非 SRD 條目 + PHB 全書源筆數)與「17 個改名法術對照表」,交使用者確認

## 2. fork 資料層(外部 `../5etools` repo)

- [x] 2.1 `scripts/import_to_supabase.py`:`truthy_srd()` 改讀 `srd52`(bool/str 均為 in-SRD);新增全域「非 SRD 條目跳過不匯入」規則;`srd` 欄位回填 true(對應 content-scope「匯入管線的 SRD 過濾」)
- [x] 2.2 17 個改名法術重新定名:fork 資料檔 `ENG_name` 改 SRD 名、繁中名依專案定名慣例重定(集中於 `spell-name-map.json`),定名清單交使用者過目後定案
- [x] 2.3 fork 資料檔全域掃描交叉引用 tag(`{@spell/@feat/@item …|XPHB}`):引用 17 個舊名者改 SRD 新名;引用將刪除條目者列清單處理(改純文字或改引 SRD 對應者)

## 3. 內容庫收斂(外部 Supabase 專案;破壞性操作,每步執行前向使用者確認)

- [x] 3.1 `DELETE WHERE source='PHB'` 清除 2014 書源列(所有內容表)
- [x] 3.2 XPHB 各表清空重匯:conditions/classes/subclasses/class_features/races/backgrounds/feats/spells/optionalfeatures(entries)以 srd52-aware script 重匯;重匯後重跑 `scripts/backfill_class_ids.sql`
- [x] 3.3 `entries` 長尾條目非 SRD 清除(deity/hazard/trap/reward 等 kind 依 srd52 過濾)
- [x] 3.4 全域驗證(對應 content-scope/catalog-source scenarios):各表筆數=SRD 覆蓋數(spells 339/classes 12/subclasses 12/races 9/backgrounds 4/feats 17/conditions 15/optionalfeatures 29)、`srd=false` 與 `source='PHB'` 查詢均空、subclass↔class 與 class_features FK 零 null、法術 `classes` 欄非空、`v_spells` 正常
- [x] 3.5 交叉引用終檢:全庫掃描 tag 引用目標均存在且為 SRD 名(渲染端未知引用降級純文字為既有保底)

## 4. 本地權威表與 App(本 repo;需先完成 3.4)

- [x] 4.1 `character_creation_data.dart`:`kSpecies` 移除阿斯莫(10→9)、`kBackgrounds` 收斂為侍僧/罪犯/學者/士兵(16→4);確認 4 背景的起源專長(魔法學徒×2/警覺/蠻力攻擊手)均在 SRD 17 專長內
- [x] 4.2 `character_math.dart` 既有機械化比對測試重跑(職業 12/12 SRD 全涵蓋,進程表預期零差異)
- [x] 4.3 測試 fixtures 更新:含改名法術或已刪內容引用者(如 `conditions_xphb.json` 快照)重新擷取;`flutter test` 全綠、`flutter analyze` 無告警
- [x] 4.4 實機驗證:建角流程種族 9/背景 4、法術步驟含 SRD 改名法術顯示正常;升級流程子職選項為每職業 1

## 5. 政策明文化與 attribution

- [x] 5.1 CLAUDE.md 與 `openspec/config.yaml` context:加入範圍政策(2024 5r 基準;僅 SRD 5.2 + 使用者自訂;不涵蓋怪物/官方劇本/劇情;玩家自產 Campaign 筆記不受限)
- [x] 5.2 README.md 改寫為真實專案說明(現為 Flutter 模板),含 SRD 5.2 / CC-BY-4.0 attribution
- [x] 5.3 `designs/SUPABASE.md`:移除多書源鏡像/怪物描述,改為 SRD-only 資料政策與 srd52 匯入規則說明
- [x] 5.4 App 內授權聲明:於設定/關於區加入 CC-BY-4.0 attribution 文字(最小方案:設定頁一列「授權聲明」開對話框)
