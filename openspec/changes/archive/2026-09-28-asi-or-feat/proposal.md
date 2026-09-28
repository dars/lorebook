## Why

2024 規則在 Lv4/8/12/16（戰士另有 6/14、盜賊另有 10）給的是「一個通用專長」，屬性值提升（ASI）只是其中一個選項；Lv19 的史詩恩賜同理。目前升級流程在這些等級只能做 ASI，想選專長的玩家在 App 內**完全沒有路可走**——角色卡也沒有手動新增特性的入口，連「先做 ASI 再自己補記」都做不到。

SRD 5.2 內容庫的通用專長只有「屬性值提升」與「擒抱大師（Grappler）」兩個，史詩恩賜 7 個。只接內容庫等於只多一個選項，所以這次的重點是**自訂專長**：玩家從其他來源取得的專長，以名稱＋說明＋（可選的）+1 能力值記進角色卡——與背景的自訂起源專長同一模式。

## What Changes

- 升級流程的「屬性值提升」區段改為「屬性值提升或專長」，三選一：
  - **屬性值提升**：現行行為不變（+2 或 +1/+1，上限 20）
  - **內容庫專長**：列出 SRD 通用專長（Lv19 另列史詩恩賜），依專長資料帶出 +1 能力值的候選範圍；先決條件未滿足者停用並標示原因（如擒抱大師需力量或敏捷 13）
  - **自訂專長**：填名稱與說明，可選擇是否附帶一項 +1 能力值（半專長）；**僅在目標等級 19 時**另有「這是史詩恩賜」勾選（預設不勾）
- 選擇的專長寫入角色的特性清單（來源標示等級），自訂者 `isCustom: true`
- 能力值上限依專長而定：一般 20，史詩恩賜 30（內容庫恩賜依資料；自訂專長依勾選）
- 內容庫離線時：ASI 與自訂專長照常，內容庫專長選項顯示離線提示
- 新增內容庫的專長讀取（`feats` 表，匿名 client）
- `class-choice-features` backlog 移除「專長」一項，改指向本 change

**非目標**：自訂專長的**專長庫**（跨角色重用、分享，比照自訂法術的 homebrew 軌道——另立）；戰鬥風格專長（屬職業特性選擇，留在 `class-choice-features`）；已升過級的角色事後把 ASI 改成專長；專長的機制連動（如擒抱大師的效果）——專長只是一筆特性條目，除了 +1 能力值不改任何衍生數值。

## Capabilities

### New Capabilities
- `level-up-feat`: 升級時的「屬性值提升或專長」選擇——三種模式、內容庫專長的候選與先決條件、自訂專長的欄位與限制、+1 能力值與上限、寫入角色特性、離線降級

### Modified Capabilities
（無。升級流程的既有規格仍在未歸檔的 `level-up-flow` change 內的 `character-level-up`，不在 `openspec/specs/`；本 change 的規格以新 capability 表達，與其 ASI requirement 並存，design 說明兩者關係。）

## Impact

- **資料層**
  - 靜態內容庫：**新讀取** `feats`（既有表，SRD 17 筆；不新增表或 view）。只取 `category` 為 G／EB 者
  - 角色卡：`user_characters.data` 的 `features` 多一筆專長條目；**不改 schema**（沿用 `CharacterFeature`：name／nameEn／source／description／isCustom）
  - 自創內容、分享：無新資料。分享檢視沿用既有特性清單呈現，自訂專長的自創標示由 `isCustom` 帶出
- **程式**
  - `next/lib/rules/level-up.ts`：`LevelUpChoices` 加入專長與能力值上限；`applyLevelUp` 的夾值上限改由選擇決定（ASI 仍為 20，golden `apply_level_up.json` 應不變）
  - `next/lib/catalog/`：新增專長讀取與型別
  - `next/components/level-up/level-up-view.tsx`：ASI 區段擴充；草稿（`useFormDraft`）納入新欄位
  - `openspec/changes/class-choice-features/proposal.md`：移除專長項
- **版型**：升級頁在 compact／medium／expanded 皆為單欄，本 change 不引入版型差異；新選項沿用既有按鈕列與 `ParchmentCard`，觸控目標 ≥ 44px
- **相依**：無新 npm 相依
