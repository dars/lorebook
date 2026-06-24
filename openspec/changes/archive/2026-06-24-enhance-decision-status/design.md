## Context

行動頁 `status_section.dart` 目前以唯讀的 `currentCharacterProvider`（回傳 `Character.mock()`）顯示 HP/AC/專注/Conditions，HP 只能用 +/- 單點調整，且無法寫回（provider 唯讀）。本次要讓 Status 區塊可實際編輯 HP、臨時 HP 與異常狀態，並強化專注互動與版面。`Character` 模型已具備 `currentHp` / `maxHp` / `tempHp` / `concentrationSpell` / `conditions` 欄位（freezed，含 `copyWith`）。本階段仍以 mock 角色運作，雲端持久化留待後續。

## Goals / Non-Goals

**Goals:**
- 當前角色在本機可被編輯（HP / tempHp / conditions / 力竭 / 專注），UI 即時反映
- HP 互動：+/- 單擊增減（− 傷害先扣臨時 HP、+ 治療）、夾在 0~max、瀕死強調
- 臨時 HP：常駐盾牌入口手動設定（不疊加）、長休清空
- 專注：空狀態點擊 → bottom sheet 選需專注項目 → 顯示；再點確認取消
- Conditions：15 種新增/移除（不疊加）、力竭 1–6 級、效果說明、空狀態
- 手機與平板共用同一份 widget

**Non-Goals:**
- Supabase 持久化與跨裝置同步（後續變更）
- 自動擲骰判定（專注豁免由玩家自行擲骰，App 只提示 DC）
- 多角色同時編輯、Campaign 即時同步
- HP 變動的歷史記錄/undo

## Decisions

### 1. 以可變的角色狀態 provider 取代唯讀 provider
新增 `CurrentCharacterNotifier extends Notifier<Character>`（或 `StateNotifier<Character>`），初始值為 `Character.mock()`，提供方法：`adjustHp(int delta)`、`setTempHp(int)`、`clearTempHp()`、`addCondition(String)`、`removeCondition(String)`、`adjustExhaustion(int)`、`startConcentration(String name)`、`endConcentration()`。各方法以 `state = state.copyWith(...)` 更新。
- `currentCharacterProvider` 重構為此 notifier 的 provider；既有只讀取欄位的畫面（角色頁等）不受影響（仍 `ref.watch` 取得 `Character`）。
- **理由**：符合「全域狀態用 Provider/Notifier、Supabase 操作封裝於 repository」的慣例；之後接雲端時，notifier 內部改呼叫 repository 即可，UI 不變。
- **替代方案**：在 widget 內用本地 `useState`／`StateProvider` 暫存 → 否決，因為 HP/狀態屬角色卡資料、需跨區塊（如未來其他頁）一致。

### 2. HP / 臨時 HP 計算規則（依 D&D 5.5e）
- `adjustHp(delta)`：
  - `delta < 0`（傷害）：**先扣 `tempHp`**，溢出部分再扣 `currentHp`；`currentHp` 不低於 0。
  - `delta > 0`（治療）：只增加 `currentHp`（夾在 ≤ maxHp）；**不回復 `tempHp`**。
- `setTempHp(value)`：設定臨時 HP，**不與現有值相加**（取代）；臨時 HP 為獨立緩衝、不影響最大 HP。
- 臨時 HP >0 時以**藍色盾牌數字徽章**顯示於 HP 數值旁（語意：魔法護盾/緩衝；與綠色 HP、金色主題區隔）。新增一個冷色（藍/青）至 `DndColors`（如 `tempHp`/`shield`）統一管理。
- 瀕死：`currentHp == 0` 時血條與數值以警示色強調。

### 3. +/- 互動
- − / + 兩顆圓鈕，**單擊**：− 呼叫 `adjustHp(-1)`（傷害，先扣臨時 HP）、+ 呼叫 `adjustHp(+1)`（治療當前 HP）。觸控目標 ≥ 48dp。
- 臨時 HP 入口為 HP 欄的**常駐盾牌符號**（tempHp=0 淡色無數字、>0 藍色顯示數值），點擊開啟數值輸入，套用 `setTempHp`（不疊加；輸入 0 即清空）。本版臨時 HP **僅手動輸入**；「施法/能力自動給予臨時 HP」列為後續。
- 本次**不含長按連續**，也**不提供**傷害/治療整批數字輸入對話框（依設計截圖簡化；扣血/補血以 +/- 單步進行）。

### 4. 專注（bottom sheet 選擇 + 再點取消）
- 專注欄預設**空狀態且可點擊**。
- 點擊空狀態 → 彈出 bottom sheet，列出角色**需要專注的項目**；資料來源為角色法術/技能中標記為需專注者。
  - **資料模型調整**：`Spell` 需新增 `concentration: bool`（freezed，需 `build_runner` 重新產生）。bottom sheet 來源 = `character.spells + character.cantrips` 中 `concentration == true` 者（技能目前無需專注項目，預留擴充）。
  - mock 資料：將需專注的法術（如 朦朧術 Blur）補進法術清單並標 `concentration: true`。
- 選取項目 → `startConcentration(name)`，專注欄顯示該項目。
- 專注中再點專注欄 → 確認對話框，確認後 `endConcentration()` 回到空狀態。
- 本次**不含**受傷專注豁免提示（依設計截圖簡化）；如需可於後續變更加入。

### 5. 異常狀態選單（bottom sheet + checkbox）
- D&D 5.5e 標準 15 種狀態（中文名 + 效果說明）定義為本機常數（如 `decision` 內的 `conditions_catalog.dart`），不連雲端、不新增套件。
- 點狀態異常列的入口 → **bottom sheet**（與專注一致）：列出 15 種，每列含 **checkbox + 中文名 + 一行簡短效果說明**；現有狀態預先勾選。
  - **勾選 = 新增、取消勾選 = 移除**（批次切換，可一次調多個）。
  - **力竭那一列改用等級 stepper（0–6）**，不是 checkbox；0 = 無、6 = 上限。
- 主畫面狀態列的 chip 也可直接點 × 快速移除；點 chip 本體看效果說明。

### 6. 版面/視覺（依設計截圖）
- Status 為**單一大區塊（一張卡）**，內部以 divider 分隔：
  - **上半部：三欄（vertical divider 分隔）** — HP ｜ AC ｜ 專注
    - HP 欄：♥ HP 標題、`當前/最大`（綠色）、HP 血條、下方 − / + 圓鈕；HP 數值旁有**常駐盾牌符號**（臨時 HP 入口）：>0 藍色顯示數值（如 🛡5）、=0 淡色無數字，皆可點擊開啟輸入
    - AC 欄：盾牌壓印數值、下方副標（如「無甲・敏捷」）
    - 專注欄：空狀態可點擊（開 bottom sheet 選需專注項目）；專注中顯示項目名 + 副標（如「朦朧術／Blur・專注」），再點 → 確認取消
  - **horizontal divider**
  - **下半部：狀態異常列** — 左「⚠ 狀態異常・CONDITIONS」、右側顯示狀態 chip 或「目前無異常狀態」
- HP 血條依比例變色（健康/受傷/瀕死）；HP=0 警示強調。
- 手機單欄、平板沿用同一 widget（必要時於 layout 層調整）。

### 7. 互動範圍（定案）
- **HP**：+/- 兩顆圓鈕單擊（− 傷害先扣臨時 HP、+ 治療當前 HP）；提供臨時 HP 設定（不疊加）；臨時 HP >0 時顯示。移除長按連續與整批傷害/治療輸入對話框。
- **專注**：空狀態點擊 → bottom sheet 選需專注項目 → 顯示；再點 → 確認取消。移除受傷專注豁免提示。

### 8. 長休清空臨時 HP
- 依 D&D 5.5e，完成**長休**時失去所有臨時 HP；notifier 提供 `clearTempHp()`，於長休流程將 `tempHp` 設為 0。
- **短休**不清除也不回復臨時 HP（臨時 HP 撐過短休）。
- 註：長休對其他資源（HP、法術位等）的完整恢復屬既有 rest 區塊範疇；本次至少確保長休將 `tempHp` 歸零。

### 9. 異常狀態：資料表示與堆疊規則
- **二元狀態（14 種）**：存於 `Character.conditions: List<String>`（已存在）；新增去重、不疊加；不同狀態可並存。
- **力竭 Exhaustion（特例）**：以等級 0–6 表示，**新增欄位 `Character.exhaustionLevel: int`**（freezed，需 `build_runner`）；0 = 無、6 = 上限。chip 顯示當前等級，可加/減級，降至 0 即移除。
- notifier 方法：`addCondition` / `removeCondition`（二元）、`setExhaustion(int)` 或 `adjustExhaustion(±1)`（夾在 0~6）。
- **不自動套用衍生狀態**（如麻痺含失能、昏迷含倒地）——屬規則引擎範疇，本版由玩家自行加減。
- `conditions_catalog` 收錄 15 種（中文名 + 效果說明）；力竭額外提供「每級效果」說明。

## Risks / Trade-offs

- **[本機狀態與未來雲端資料分歧]** → notifier 介面以「動作方法」設計，之後改接 repository 時 UI 不需變動；mock 與真實資料共用同一 `Character` 模型確保結構一致。
- **[+/- 單步調整大量 HP 較慢]** → 本版以單擊 ±1 為主（夾 0~max）；大量數值調整的批次輸入留待後續評估。
- **[狀態清單完整度]** → 先涵蓋 5.5e 標準狀態；自訂狀態留待後續。
- **[臨時 HP 不疊加之取捨]** → RAW 為「新舊二選一（通常取較高）」；本次以「設定即取代、提示不疊加」實作，簡化操作；如需嚴格「取較高」可後續精修。
- **[長休完整恢復範疇]** → 本次長休僅保證清空臨時 HP；HP / 法術位等完整恢復屬既有 rest 區塊，非本次重點。
