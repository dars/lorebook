# 升級等級流程（level-up-flow）

## Why

`character-create` 只涵蓋角色的**起始**狀態（Lv1）。跑團過程中角色會升級，但 app 目前沒有任何升級 UI——等級、HP、熟練加值、法術位、職業特性都只能停在建角當下的數值。需要一條引導式的「升級流程」，讓非專業玩家也能依 D&D 5.5e（2024）規則正確完成升級，並自動連動重算衍生數值。此為 backlog `character-progression` 中「升級（Level Up）」方向的具體化。

## What Changes

- 新增**引導式升級流程**（單職業，Lv1→20 逐級升級，一次升一級）：
  - **HP 增加**：預設取生命骰固定平均值（如 d8→5），亦可手動輸入自己擲出的骰值（App 不代擲，與建角能力值擲骰原則一致）；加上 CON 調整值後累加至最大 HP。
  - **熟練加值**：依角色等級自動更新（Lv5/9/13/17 提升）。
  - **職業特性**：顯示新等級獲得的職業／子職特性（來自內容庫 `class_features`），寫入角色的 features 清單。特性一律**唯讀顯示**；含玩家選項的「選項型特性」（如專精、超魔法、魔能祈喚、戰技、武器精通）在特性卡上顯示「此特性需做選擇，請閱讀說明後自行記錄」提示，選擇器另立 backlog（見非目標）。
  - **子職選擇**：升至 Lv3 時自內容庫 `subclasses` 選擇子職（2024 規則），並帶入子職特性。
  - **ASI**：Lv4/8/12/16/19 提供能力值提升（+2 或 +1/+1，上限 20）；**專長（Feat）不在本次範圍**，留待後續 change。
  - **法術位與新法術**：施法職業依施法進程更新各環法術位；流程內引導選擇新戲法／新法術（同建角法術步驟，自內容庫依職業與環數過濾；內容庫離線時可跳過）。
  - **衍生數值連動重算**：修正值、最大 HP、先攻、被動察覺、豁免、技能加值、施法 DC／命中等隨能力值、等級、熟練加值變動自動更新（與 `character-create` 共用計算邏輯）。
- 角色頁新增**升級入口**：頁首右上角 LEVEL 徽章（共用 `CharacterHeader`）於角色頁可點擊，點擊後彈出確認對話框「調升至 Lv N？」，使用者確認才進入升級流程；完成後回角色頁並反映新數值。
- 升級結果透過既有 `user_characters` 同步（jsonb 文件 LWW），離線（未登入）時僅存本地。

**非目標（本次不做）**：多職業（multiclass）、專長（Feats）、降級／復原、能力值因物品/事件的編輯（屬 `character-progression` 其餘方向）、App 代擲骰、**選項型特性的選擇 UI**（專精／超魔法／魔能祈喚／戰技／武器精通等 choose-N-from-list 選擇器與逐職業選項資料，另立 backlog `class-choice-features`，建議與專長同批處理）、升級時替換既有法術（只做新增）。

## Capabilities

### New Capabilities

- `character-level-up`: 引導式升級流程——升級步驟（HP／子職／ASI／特性／法術）、每級規則資料的取得與離線降級、衍生數值重算、升級入口與完成後的資料寫回。

### Modified Capabilities

- `character-management`: 角色頁頁首右上角 LEVEL 徽章新增升級入口（點擊 → 確認對話框 → 升級流程）。

## Impact

### 資料層

- **靜態內容庫（唯讀）**：讀取既有 `classes`（生命骰、施法屬性、施法進程）、`class_features`（依 classId + level 過濾，含子職特性）、`subclasses`（依 classId 過濾）、`v_spells`（選新法術）。**無新資料表**；各環法術位表依 `classes.caster_progression`（full／half 等）以標準 2024 進程表推得。內容庫不可用時：HP／熟練加值／ASI 等本地可算的步驟照常，特性／子職／法術步驟顯示離線提示並允許跳過。
- **角色卡資料（使用者自有）**：更新既有 `user_characters`（`level` 提升欄位 + `data` jsonb 全文件），**無 schema 變更、無新 RLS**。
- **Campaign 共用資料**：不涉及，無 Realtime 訂閱。

### 程式碼

- `lib/features/character/`：新增升級流程頁（presentation）、升級規則與狀態（domain）；`character_providers` 新增套用升級結果的方法。
- `lib/shared/presentation/character_header.dart`：LEVEL 徽章於角色頁加入點擊觸發與確認對話框（其他頁維持純顯示）。
- 衍生數值計算自 `character_creation_data.dart` 抽出共用 helper，供建角與升級共用。
- `lib/features/catalog/`：`catalog_repository` 視需要補依 classId + level 查 `class_features` 的方法（現有查詢已涵蓋大部分）。

### 版型

- 手機與平板皆受影響：升級流程沿用建角流程的 responsive 模式（compact 單欄；medium 置中限寬；expanded 同 medium）。

### 相依

- 不引入新第三方套件；沿用 Riverpod、go_router、supabase_flutter 與既有內容庫快取機制。
