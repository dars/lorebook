> **狀態：BACKLOG（暫緩）** — 僅記錄方向，待 `level-up-flow` 完成後再規劃 artifacts 與實作。建議與專長（Feats）同批處理。

## Why

`level-up-flow` 的「新特性確認」為唯讀：含玩家選項的「選項型特性」只顯示「此特性需做選擇，請閱讀說明後自行記錄」提示，玩家的選擇結果在 app 內無處記錄。需要一個通用的 choose-N-from-list 特性選擇器，讓升級（與建角）時的職業選項落進角色卡。

## What Changes（方向，待細化）

- **通用選擇器 UI**：特性宣告「從清單選 N 個」時，於升級/建角流程內提供選擇步驟，結果寫入角色（features 或專屬欄位）並連動衍生數值（如專精加倍熟練加值）。
- **涵蓋的選項型特性**（2024，初步清單）：
  - 專精 Expertise（遊蕩者 Lv1/6、吟遊詩人 Lv2/9 等）：選技能加倍熟練，**最單純、優先做**
  - 超魔法 Metamagic（術士 Lv2 起）
  - 魔能祈喚 Eldritch Invocations（邪術師，逐級增加、可替換）
  - 戰技 Maneuvers（戰鬥大師 Lv3 起）
  - 武器精通 Weapon Mastery 的換選（武人職業）
  - 戰鬥風格 Fighting Style（戰士 Lv1、聖騎士 Lv2 等）
- **專長（Feats）**：ASI 步驟擴充為「ASI 或專長」（2024 規則專長即 ASI 的一種），含半專長的 +1 能力值連動——與本 change 共用選擇器基礎，建議同批。
- **選項資料建置**：內容庫 `class_features.data` 為 5etools 原文，選項清單需另行結構化（新表或 data 欄位約定），含中文化。
- **既有角色回填**：已用唯讀模式升過級的角色，提供事後補選入口（類似 `level-up-flow` 的補選子職模式）。

## Impact

- **能力**：character-level-up（特性步驟由唯讀改為可選擇）、character-management（可能需事後補選入口）。
- **資料層**：靜態內容庫需新增結構化選項資料（範圍與 schema 待定）；角色卡 jsonb 文件新增選擇結果欄位，無 Campaign 影響。
- **相依**：`level-up-flow` 完成後再動；選擇器 UI 可沿用其 wizard 步驟框架。
- **範圍界線**：本 backlog 僅記錄，尚未規劃 design/specs/tasks。
