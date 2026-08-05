## ADDED Requirements

### Requirement: 規則版本域
App SHALL 定義兩個規則版本：`5r`（D&D 2024 修訂版）與 `5e`（D&D 2014）。版本 SHALL 以規則語意的識別碼表示（`'5r'` / `'5e'`），SHALL NOT 以內容庫書源代碼（`XPHB` / `PHB`）作為版本識別。版本至書源與至本地規則表的映射 SHALL 集中於單一解析點，除該解析點與測試注入外，程式碼不得出現書源字面值。

#### Scenario: 版本解析為書源
- **WHEN** 以版本 `5r` 解析內容庫書源
- **THEN** 得到 `XPHB`
- **WHEN** 以版本 `5e` 解析內容庫書源
- **THEN** 得到 `PHB`

#### Scenario: 無散落書源字面值
- **WHEN** 檢視 `lib/` 全域程式碼
- **THEN** 書源代碼字面值僅出現於版本解析點一處

### Requirement: 規則集（RuleSet）
App SHALL 以 `RuleSet` 介面表達版本相異的規則，並提供 `5r` 與 `5e` 兩個實作。`RuleSet` SHALL 涵蓋：種族清單（含種族屬性加值）、職業清單、內建背景清單、半施法者法術位表、戲法已知數、法術準備模型與數量、子職取得等級、ASI 等級、職業資源規則表、力竭語意、起源專長有無、武器精通有無。

兩版相同的規則（能力調整值、熟練加值、標準陣列與購點表、技能清單、全施法者與契約法術位表、護甲 AC 公式與 AC 推導、攻擊列推導、徒手攻擊、貨幣運算）SHALL NOT 進入 `RuleSet`，維持單一共用實作。

#### Scenario: 種族屬性加值依版本
- **WHEN** 自 `5r` 的 `RuleSet` 取任一種族
- **THEN** 該種族的屬性加值為空（2024 種族不給屬性加值）
- **WHEN** 自 `5e` 的 `RuleSet` 取「丘陵矮人」
- **THEN** 該種族帶有屬性加值（體質 +2、感知 +1）

#### Scenario: 子職取得等級依版本
- **WHEN** 以 `5r` 查詢任一職業的子職取得等級
- **THEN** 一律為 3
- **WHEN** 以 `5e` 查詢牧師 / 德魯伊 / 戰士的子職取得等級
- **THEN** 分別為 1 / 2 / 3

#### Scenario: 共用規則不分版
- **WHEN** 以兩版分別計算熟練加值、購點花費、著甲 AC
- **THEN** 結果相同，且該計算不經由 `RuleSet`

### Requirement: 法術準備模型
`RuleSet` SHALL 提供法術準備模型判定（`known` 已知法術／`prepared` 可備法術）與數量函式 `spellCountFor(職業, 等級, 施法屬性調整值)`。`5r` 全施法職業 SHALL 為 `prepared` 且數量取靜態等級表；`5e` SHALL 依職業區分：吟遊詩人／術士／遊俠／邪術師為 `known`（靜態等級表），牧師／德魯伊／聖騎士／法師為 `prepared`（數量 = 施法屬性調整值 + 職業等級，下限 1）。

角色資料的法術清單結構 SHALL NOT 因模型不同而改變；差異僅呈現於數量來源與 UI 文案。

#### Scenario: 5e 動態備法數
- **WHEN** 以 `5e` 牧師 Lv5、感知調整值 +3 查詢可備法術數
- **THEN** 得到 8

#### Scenario: 5e 已知法術數
- **WHEN** 以 `5e` 吟遊詩人 Lv5 查詢法術數
- **THEN** 依 `known` 靜態表取值，且函式忽略施法屬性調整值

#### Scenario: UI 文案依模型
- **WHEN** 法術步驟的職業為 `known` 模型
- **THEN** 標示為「已知法術」
- **WHEN** 為 `prepared` 模型
- **THEN** 標示為「可備法術」

### Requirement: 角色綁定規則版本且不可變更
`Character` SHALL 具備 `rulesVersion` 欄位，於建立角色時決定。既有角色文件缺此欄位時 SHALL 讀為 `5r`。角色建立後 App SHALL NOT 提供任何變更該角色規則版本的路徑（含編輯、匯入匯出繞道）；角色卡 SHALL 以唯讀方式呈現版本。

角色的所有規則解析（升級、衍生數值、內容庫查詢）SHALL 一律使用該角色自身的 `rulesVersion`。

#### Scenario: 既有角色預設為 5r
- **WHEN** 載入本 change 之前建立、文件中無 `rulesVersion` 的角色
- **THEN** 該角色視為 `5r`，行為與現況完全一致

#### Scenario: 無變更版本的入口
- **WHEN** 使用者於角色卡任一頁面尋找規則版本設定
- **THEN** 版本僅為唯讀顯示，無編輯控制項

#### Scenario: 升級沿用角色版本
- **WHEN** 對一個 `5e` 角色執行升級
- **THEN** 法術位、子職節點、ASI 等級、職業資源皆依 `5e` 規則解析

### Requirement: 內容庫查詢依當前規則版本
內容庫 repository 與其目錄 provider SHALL 以規則版本為查詢維度：同一組業務參數在不同版本下 SHALL 為互相獨立的查詢與快取，SHALL NOT 互相污染。角色卡情境的版本來自當前角色；建角流程的版本來自流程中的選擇。

#### Scenario: 版本隔離的快取
- **WHEN** 先以 `5r` 查詢法師戲法，再以 `5e` 查詢法師戲法
- **THEN** 兩次為獨立查詢，各自回傳對應書源的結果

#### Scenario: 角色卡依角色版本查詢
- **WHEN** 當前角色為 `5e` 且開啟法術或狀態全文
- **THEN** 查詢的書源為 `PHB`
