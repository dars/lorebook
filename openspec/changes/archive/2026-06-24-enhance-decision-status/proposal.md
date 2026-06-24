## Why

行動頁面的 Status 區塊是跑團當下最常互動的地方（扣血、補血、上狀態、結束專注），但目前只能用 +/- 單點調整 HP，沒有臨時 HP、無法管理異常狀態、專注也只是顯示。這讓「3 秒內完成當下操作」的核心體驗打折。本次強化 Status 區塊的互動與呈現。

## What Changes

- **HP 互動**
  - − / + 兩顆圓鈕，單擊：− 造成 1 點傷害（先扣臨時 HP）、+ 治療 1 點當前 HP；夾在 0 ~ 最大值之間
  - 臨時 HP（Temp HP）：HP 欄常駐盾牌符號（>0 藍色顯示數值、=0 淡色），點擊手動輸入；受傷先扣、治療不回、不疊加、長休清空
  - 當前 HP 為 0 時以視覺強調（瀕死）
- **專注 Concentration**
  - 專注欄預設空狀態且可點擊
  - 點擊 → 彈出 bottom sheet 列出角色需專注的法術/技能；選取後顯示於專注欄
  - 專注中再點 → 確認後取消專注
- **異常狀態 Conditions**
  - 從 D&D 5.5e 標準 15 種狀態清單新增/移除（中毒、目盲、震懾等），以 chip 呈現；同一狀態不疊加、不同狀態可並存
  - **力竭 Exhaustion 為特例**：以 1–6 級累進呈現，可加/減級（降至 0 移除）
  - 點選 chip 可查看該狀態效果說明
  - 無狀態時顯示「目前無異常狀態」
- **版面/視覺**
  - Status 區塊重新排版，HP / AC / 專注的層級與卡片配置更清晰
  - HP 血條依比例變色（健康/受傷/瀕死）

本階段以本機狀態（mock 角色）運作，HP/臨時 HP/狀態的變更先保存在本機可變狀態，雲端持久化（Supabase）留待後續變更。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `decision`: 強化 Status 區塊為單一區塊（divider 分隔 HP/AC/專注 + 下方狀態列）；HP（+/- 直接增減、臨時 HP 緩衝與盾牌入口、瀕死強調）、專注（bottom sheet 選擇 + 再點取消）、異常狀態（15 種新增/移除、力竭等級、效果說明）與版面/視覺需求

## Impact

- **資料層（角色卡資料）**：HP、當前/臨時 HP、異常狀態、專注為角色卡欄位（`Character` 已有 `currentHp`/`maxHp`/`tempHp`/`conditions`/`concentrationSpell`）。本次需讓當前角色可在本機被編輯：以可變的角色狀態 provider（Riverpod `StateNotifier`/`Notifier`）取代目前唯讀的 `currentCharacterProvider`。**Supabase 持久化與跨裝置同步留待後續變更**，本次不涉及 Realtime、不新增資料表。
- **模型調整**（freezed，需 `build_runner` 重新產生）：`Spell` 新增 `concentration: bool`（判定可進入專注選單；mock 補上需專注法術如 朦朧術 Blur）；`Character` 新增 `exhaustionLevel: int`（0–6，力竭等級）。
- **靜態資料**：異常狀態清單與效果說明本階段以本機常數提供（不新增第三方套件、不連雲端）。
- **程式碼**：`features/decision/presentation/sections/status_section.dart` 為主；新增可變角色狀態 provider 與共用 widget（臨時 HP 輸入、專注 bottom sheet、condition chip / 選擇器、力竭等級 chip）。`DndColors` 新增臨時 HP/護盾冷色。
- **版型**：手機與平板皆受影響，沿用同一份 widget，版型差異在 layout 層處理。
- **相依套件**：不新增第三方套件。
