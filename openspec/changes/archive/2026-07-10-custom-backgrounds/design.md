# Design: custom-backgrounds

## Context

SRD 收斂後內建背景僅 4 個(`kBackgrounds`,`character_creation_data.dart`)。建角背景步驟目前直接讀該常數清單;角色卡儲存的是建卡時快照(`background`/`backgroundEn` 字串 + 已計算的衍生數值),與選項來源解耦。使用者資料已有成熟模式:`user_characters`(jsonb 文件 + 提升欄位、LWW `updated_at` trigger、`deleted_at` tombstone、own-row RLS、客戶端產生 id)。2024 背景結構:三屬性加值候選、兩固定技能、一起源專長;SRD 起源專長共 4 個(技藝精湛/野蠻打擊/警覺/法術新手,法術新手依施法職業有變體)。

## Goals / Non-Goals

**Goals:**
- 使用者可建立/編輯/刪除自訂背景,跨裝置同步,僅本人可見
- 建角背景步驟並列內建 + 自訂選項,行為(敘述、能力值加值卡、技能帶入)與內建一致
- 表單驗證確保自訂背景是合法的 2024 背景結構
- 手機/平板版型皆可用

**Non-Goals:**
- homebrew 子職業/專長/法術(之後獨立 change)
- 自訂起源專長(僅可從 SRD 起源專長選)
- 背景的工具熟練與起始裝備(現有 `BackgroundOption` 未建模,不在本次擴充)
- 自訂背景的分享/匯入匯出

## Decisions

### D1:儲存沿用 user_characters 文件模式

新表 `user_backgrounds`(migration `0004_user_backgrounds.sql`):`id text pk`(客戶端產生,比照 0002 後的 user_characters)、`user_id`、提升欄位 `name`、`data jsonb`、`created_at`/`updated_at`/`deleted_at`;LWW trigger 與 RLS 政策整段複用。理由:repository/同步/軟刪除語意與 `user_characters` 完全一致,新程式碼最少;背景欄位少,不需要多個提升欄位。替代方案(結構化欄位表)查詢性較好但引入第二套 CRUD 慣例,無此需求。

### D2:domain model 與建角整合走 adapter

新 `CustomBackground` domain model(freezed,`toJson`/`fromJson` 進 `data`),提供 `toBackgroundOption()` 轉接為既有 `BackgroundOption`——建角背景步驟只需把 `kBackgrounds + 自訂清單.map(toBackgroundOption)` 合併,選取後的敘述顯示、能力值加值卡、技能自動帶入零改動。自訂背景的 `en` 留空,快照 `backgroundEn` 存空字串;UI 以「自訂」badge 區分,允許與內建同名(id 不同)。

### D3:起源專長為固定候選清單

表單的起源專長自 6 個字串選:技藝精湛、野蠻打擊、警覺、法術新手(法師)、法術新手(牧師)、法術新手(德魯伊)——與 `kBackgrounds.originFeat` 既有字串格式一致,不引入新的專長解析邏輯。清單集中為常數(如 `kOriginFeatChoices`),日後 homebrew 專長 change 再擴充。

### D4:編輯器與入口

- 入口:建角背景步驟選項清單尾端「+ 自訂背景」卡;既有自訂背景項提供編輯/刪除(選項卡上的次要動作,如尾端 icon 或長按)。
- 編輯器:獨立頁(go_router route),compact 全頁單欄;medium/expanded 內容置中限寬(沿用 `ResponsiveLayout` 慣例),不做多欄。
- 刪除:確認對話框 → 雲端軟刪除成功才移除本地清單(比照角色刪除語意)。

### D5:狀態與離線

`AsyncNotifierProvider` 管自訂背景清單(登入後載入,CRUD 後就地更新)。離線/未登入:清單 provider 為 AsyncError → 背景步驟降級為僅內建 4 個 + 一列「自訂背景離線不可用」提示;不阻擋建角(與法術步驟離線降級同一精神)。

### D6:驗證規則(表單層)

名稱非空(trim 後)且 ≤ 20 字;能力值恰 3 個且互異(六屬性代碼);技能恰 2 個且互異(18 技能);起源專長屬 D3 清單。驗證在表單層即時回饋,repository 不重複驗證(單一寫入路徑)。

## Risks / Trade-offs

- [自訂背景刪除後,舊角色顯示的背景名稱查無來源] → 快照設計本就如此(角色存字串與已計算數值,不回查),無實際影響;傳記頁顯示的是快照字串。
- [與內建背景同名造成混淆] → UI 以「自訂」badge 區分;不強制唯一(避免與內建清單耦合)。
- [離線時自訂背景不可用] → 降級提示 + 內建 4 個仍可建角;與現有離線行為一致,可接受。
- [法術新手變體以字串表達] → 與 `kBackgrounds` 現況一致;homebrew 專長 change 時再結構化。

## Migration Plan

1. migration `0004_user_backgrounds.sql`(建表 + trigger + RLS)——`supabase db push` 至 App 專案(非破壞性、純新增)。
2. App 端依 tasks 實作;`flutter test`/`analyze` 全綠後實機驗證。
3. 回滾:drop table + revert commits(無既有資料依賴)。

## Open Questions

- 自訂背景編輯入口是否也要在系統頁提供集中管理清單(本次僅建角流程入口,若日後 homebrew 內容變多再開「我的 homebrew」頁)。
