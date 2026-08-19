## Why

自訂內容的整條線——建立、分享、DM 審核、全團採用——最後一哩斷在角色卡上：**角色卡看不出哪些是自創的**。

實查現況：

- `background` 是 `z.string()`（`character.ts:207`），自訂背景與 SRD 背景在角色卡上完全一樣，無從分辨
- `customSubclass` 的整份快照有寫進角色（`character.ts:187`），但全專案只有 `level-up-view.tsx` 讀它——**角色卡頁與分享頁都沒有顯示**
- 自訂子職的特性靠來源字串的後綴 `子職：X・自訂` 標示（`level-up-view.tsx:154`）。那是給人看的慣例，不是可判定的旗標——UI 無法據以做任何呈現決策，字串一改標示就消失

而 `character-share` 是**活資料**：DM 隨時可以開連結看玩家的角色卡。這正是審核最終要看的地方。如果那張卡上不標「這個子職是自創的」，homebrew 分享做得再完整，DM 仍得逐項回頭比對他核准過的東西。

這個缺口不依賴 `homebrew-share`——即使永遠不做分享，同桌的 DM 直接看玩家的角色卡也需要分辨。因此獨立成一個 change，且應先做。

## What Changes

- **角色卡記錄自訂來源**：新增可判定的旗標，取代目前「靠字串後綴」與「什麼都沒有」兩種狀態
- **角色卡頁顯示標示**：背景與子職在概覽呈現時標注為自訂；特性列表中來自自訂來源的條目同樣標注
- **分享頁一併顯示**：`/v/[token]` 的呈現與角色卡頁一致——那是 DM 實際會看的畫面
- **特性來源改為結構化**：`CharacterFeature` 新增 `isCustom` 旗標，`source` 回歸單純的來源描述，不再靠 `・自訂` 後綴承載語意

標示的措辭沿用既有慣例：**文字＋數值而非裸符號**，因此用「自訂」二字而非圖示或色塊。

## Capabilities

### New Capabilities
- `homebrew-provenance`: 角色卡上自創內容的來源標示——旗標的記錄、角色卡頁與分享頁的一致呈現

### Modified Capabilities
- `character-management`: 角色文件新增自訂來源旗標；特性條目的來源由字串慣例改為結構化欄位
- `character-share`: 分享的角色卡需呈現自訂來源標示

## Impact

**修改**

- `lib/domain/character.ts`：`background` 旁新增 `backgroundIsCustom`；`CharacterFeature` 新增 `isCustom`
- `components/level-up/level-up-view.tsx`：特性來源不再附加 `・自訂`，改設旗標
- `lib/creation/build.ts`：建角選用自訂背景時設定旗標
- `components/character/tabs/overview-tab.tsx`：背景與子職的標示
- 特性列表元件：自訂條目的標示
- 分享頁的對應呈現

**不影響**

- 既有角色的數值：旗標為純標示，不參與任何推導
- 快照哲學：旗標記錄「這是自創的」，**不記錄來源 id**，避免誘使回查已可能刪除的來源

## Non-Goals

- **審核狀態機**（待核准／已核准／退回）——那需要 DM 身分、團的概念與通知，是另一個量級的功能
- **平衡驗證**——強度是 DM 的職責，App 不替桌上的人做裁決（與既有 homebrew 原則一致）
- **回連來源**——不記錄自訂內容的 id，角色卡上的自創內容一律是快照
- **自訂種族的標示**——`custom-species` 尚未實作；該 change 落地時照同一模式補旗標即可
