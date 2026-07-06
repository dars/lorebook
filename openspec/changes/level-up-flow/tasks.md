# Tasks — 升級等級流程（level-up-flow）

## 1. 規則常數與共用計算

- [x] 1.1 新增 `lib/features/character/domain/character_math.dart`：`abilityMod`、`proficiencyBonusFor(level)`、豁免/技能加值、被動察覺、先攻、施法 DC/命中 等純函式（附單元測試）
- [x] 1.2 於 `character_math.dart` 加入 `spellSlotsFor(progression, level)`：full／half／pact 的 2024 標準進程表（附單元測試，含 Lv1–20 抽查）
- [x] 1.3 新增各職業「本級可新增戲法數/法術數」常數表（2024 PHB，僅新增差額，不做替換），與 `ClassOption` 同檔或相鄰（附單元測試）
- [x] 1.4 建角確認頁與 `character_creation_data.dart` 改用 `character_math.dart` 的共用函式（行為不變，現有測試通過）
- [x] 1.5 以 dev 資料確認內容庫 `classes.caster_progression` 值域，對不上的職業以非施法處理並記 log（回填 design Open Question）

## 2. 升級流程狀態與規則（domain）

- [x] 2.1 新增升級流程狀態模型（目標等級、步驟序列、HP 選擇、子職、ASI 指派、已選法術），依目標等級動態組成步驟（HP → 子職 Lv3 → ASI 4/8/12/16/19 → 新特性 → 新法術 → 確認）
- [x] 2.2 實作升級套用邏輯：組出新 `Character`（等級、HP〔增量最低 1、currentHp 同步加量〕、熟練加值、能力值、特性、法術、法術位上限更新且已用數 clamp、衍生數值全重算，CON 提升回溯 Δmod × level）（附單元測試）
- [x] 2.3 `character_providers` 新增套用升級結果的方法，走既有更新與 LWW 同步路徑（未登入僅本地）

## 3. 升級流程 UI（presentation）

- [x] 3.1 新增 `character_level_up_page.dart`：wizard 骨架（步驟指示器、上下步導航、responsive 置中限寬、中途離開不寫入），路由掛入 go_router
- [x] 3.2 HP 步驟：平均值預設/手動輸入切換、輸入夾 1..骰面、即時顯示本級增量
- [x] 3.3 子職步驟（Lv3）：自內容庫列子職、選取後顯示敘述與 Lv3 子職特性、未選不可續行
- [x] 3.4 ASI 步驟：+2 / +1/+1 模式切換、上限 20 停用邏輯、未指派完不可續行
- [x] 3.5 新特性步驟：唯讀列出本級職業/子職特性（原文 fallback），永遠可確認繼續；選項型特性（專精/超魔法/魔能祈喚/戰技等）加註「需做選擇，請自行記錄」提示
- [x] 3.6 新法術步驟：依本級差額顯示戲法/法術區（已學不重列、選滿鎖定、可展開描述），未選滿不可續行
- [x] 3.7 確認步驟：before → after 變更摘要，「完成升級」套用並返回角色頁

## 4. 入口與離線降級

- [x] 4.1 `character_header.dart` LEVEL 徽章加入點擊觸發（僅角色頁啟用）：確認對話框「調升至 Lv N？」確認進入流程、Lv20 顯示已達上限提示；完成後頁首與各分頁即時反映
- [x] 4.2 內容庫離線降級：子職/特性/法術步驟顯示離線提示與重試、允許跳過；本地步驟照常
- [x] 4.3 「補選子職」：確認對話框內選項與單步子職選擇（等級 ≥ 3 且子職為空且內容庫可用；完成帶入 Lv3 起累積子職特性）

## 5. 驗證

- [x] 5.1 widget 測試：最短流程（無事件等級）與 Lv3／Lv4 完整流程各一條 happy path
- [x] 5.2 `flutter analyze`、`dart format .`、`flutter test` 全數通過
- [ ] 5.3 實機/模擬器手動驗證：施法職業升 Lv2→3（選子職+法術）、非施法職業升 Lv3→4（ASI）、離線升級一次
