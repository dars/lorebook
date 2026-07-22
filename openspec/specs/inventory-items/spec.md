# inventory-items Specification

## Purpose
TBD - created by archiving change inventory-items. Update Purpose after archive.
## Requirements
### Requirement: 物品資料模型
角色物品 SHALL 以「類型」與「來源」二維分類，並支援數量與任務旗標。類型（itemType）SHALL 為列舉：武器（weapon）／護甲（armor）／一般裝備（gear）／消耗品（consumable）。來源（source）SHALL 為列舉：內容庫（catalog）／自訂（custom）。任務旗標（quest）SHALL 正交於類型與來源，可疊加於任何物品。所有新增欄位 SHALL 帶預設值，既有角色 JSON 反序列化不得失敗。

#### Scenario: 舊資料向後相容
- **WHEN** 讀入本次變更前建立的角色 JSON（equipment 條目無新欄位）
- **THEN** 反序列化成功，itemType 預設 gear、source 預設 custom、quantity 預設 1、quest 預設 false

#### Scenario: 任務旗標可疊加於任何類型
- **WHEN** 一件 itemType=weapon 的物品標記 quest=true
- **THEN** 該物品同時以武器行為（可裝備）與任務保護（刪除需確認）呈現

### Requirement: 新增物品
物品頁 SHALL 提供新增物品入口，玩家可（a）自內容庫裝備目錄挑選，或（b）自訂輸入名稱與描述。自訂物品屬玩家自產內容，不受 SRD 範圍限制。內容庫目錄為空（資料未匯入或離線無快取）時，目錄挑選入口 SHALL 降級隱藏，自訂輸入不受影響。

#### Scenario: 從內容庫挑選
- **WHEN** 玩家於新增物品流程選擇「從目錄挑選」並選定一件裝備
- **THEN** 該物品以 source=catalog 加入物品欄，帶入目錄的名稱/類型/價格/規則文字，catalogRef 記錄目錄鍵

#### Scenario: 自訂輸入
- **WHEN** 玩家選擇「自訂物品」並輸入名稱（描述/類型/數量可選）
- **THEN** 該物品以 source=custom 加入物品欄

#### Scenario: 目錄為空時降級
- **WHEN** items 目錄查無資料（未匯入或離線）
- **THEN** 新增流程僅顯示自訂輸入，不顯示目錄挑選入口

### Requirement: 取得方式與購買扣款
自內容庫挑選物品時，SHALL 提供對等的兩種取得方式：（a）**購買**——自角色財富扣除成交金額；（b）**直接取得**——不扣款（隊友給予、戰利品搜刮、DM 發放等，取得管道與付費無關）。兩者為同層級選項，不得將直接取得置於購買的附屬位置。

購買時 SHALL 以 SRD 標價預填成交金額，且玩家 SHALL 可於確認前修改金額（DM 自訂價格/議價/折扣），扣款以修改後的成交金額計；`priceCp` 記錄實際成交價（直接取得則記錄標價），SRD 標價可經 catalogRef 隨時回查。

成交金額超過總財富（換算 cp）時 SHALL 擋下購買：明確提示差額、財富與物品欄皆不變，玩家可修改金額後重試或改用直接取得。扣款 SHALL 自幣值小到大先扣同階，不足時向上一階換零（1 pp=10 gp、1 gp=10 sp、1 ep=5 sp、1 sp=10 cp），且僅換所需最小枚數，不重排玩家其餘幣別組合。

#### Scenario: 足額購買自動扣款
- **WHEN** 玩家以成交金額 15 sp 購買且持有 2 gp 0 sp
- **THEN** 扣款後財富為 0 gp 5 sp（1 gp 換 10 sp 補足），物品入欄且 priceCp=150

#### Scenario: 修改成交金額
- **WHEN** 物品 SRD 標價 50 gp，玩家於購買確認前把金額改為 35 gp
- **THEN** 扣款以 35 gp 計，priceCp 記錄 3500（成交價）

#### Scenario: 不足額擋下可調整
- **WHEN** 玩家的總財富換算 cp 低於成交金額並按下購買
- **THEN** 購買被擋下並顯示差額（如「還差 5 gp 3 sp」），財富與物品欄皆不變
- **THEN** 玩家可修改成交金額後重試，或改用「直接取得」

#### Scenario: 數量購買與堆疊
- **WHEN** 玩家購買標槍、數量設 3、單價 5 sp
- **THEN** 扣款總額 15 sp（單價×數量）；若物品欄已有同目錄鍵的標槍則數量堆疊 +3，否則新增一列 quantity=3

#### Scenario: 直接取得不扣款
- **WHEN** 玩家選擇「直接取得」一件目錄物品（如隊友給予、戰利品搜刮）
- **THEN** 物品入欄且財富不變；priceCp 記錄 SRD 標價供未來販售參考

### Requirement: 數量與消耗
物品 SHALL 具數量（quantity ≥ 0）。消耗品（itemType=consumable）SHALL 提供「使用」操作使數量 −1；數量歸零時 SHALL 自清單移除並提供復原（SnackBar undo），但 quest=true 的消耗品歸零 SHALL 保留為 0 不移除。

#### Scenario: 使用消耗品
- **WHEN** 玩家對 quantity=3 的治療藥水執行「使用」
- **THEN** quantity 變為 2

#### Scenario: 用罄移除可復原
- **WHEN** 非任務消耗品 quantity 自 1 減至 0
- **THEN** 該物品自清單移除，SnackBar 提供復原；復原後 quantity=1

#### Scenario: 任務消耗品用罄保留
- **WHEN** quest=true 的消耗品 quantity 減至 0
- **THEN** 物品保留於清單顯示數量 0

### Requirement: 裝備狀態與刪除保護
武器與護甲 SHALL 可切換裝備/卸下狀態。物品 SHALL 可自清單左滑刪除；quest=true 的物品刪除 SHALL 經二次確認。

#### Scenario: 裝備切換
- **WHEN** 玩家對 itemType=weapon 或 armor 的物品切換裝備狀態
- **THEN** 物品在「已裝備」與「攜帶中」分區間移動

#### Scenario: 一般物品左滑刪除
- **WHEN** 玩家左滑一件 quest=false 的物品並確認
- **THEN** 物品自清單移除

#### Scenario: 任務物品刪除需確認
- **WHEN** 玩家左滑刪除 quest=true 的物品
- **THEN** 顯示明確警示（任務物品）之確認對話框，確認後才移除
