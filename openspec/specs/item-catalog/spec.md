# item-catalog Specification

## Purpose
TBD - created by archiving change inventory-items. Update Purpose after archive.
## Requirements
### Requirement: 裝備目錄查詢
App SHALL 提供 SRD 裝備目錄查詢：依類別（武器／護甲／冒險裝備／工具）瀏覽與關鍵字搜尋（中英文名稱）。資料來自內容庫 `v_items`，查詢 SHALL 遵循 catalog-source 單一書源政策（`source = 'XPHB'`），並比照既有資料域的 provider/快取模式（讀取後快取至本機，離線時使用快取）。

目錄品項量大（SRD 裝備約兩百餘條），瀏覽 SHALL NOT 使用下拉選單；以「搜尋為主、分組瀏覽為輔、重複取得捷徑置頂」三層結構：
- 類別內依子分類（subcategory）以分組標頭呈現（武器：簡易/軍用×近戰/遠程；護甲：輕/中/重/盾；冒險裝備：依用途組）
- 清單頂部 SHALL 提供「再次取得」區：列出角色物品欄中來源為目錄（source=catalog）的品項，供高頻重複購買（箭矢/藥水/口糧）快速再購；由物品欄即時推導，不另存記錄

#### Scenario: 依類別瀏覽（子分類分組）
- **WHEN** 玩家於目錄挑選畫面選擇「武器」類別
- **THEN** 清單僅顯示武器類條目並依子分類分組（如「簡易近戰」「軍用遠程」標頭），含中英文名稱與價格

#### Scenario: 再次取得置頂
- **WHEN** 角色物品欄含來源為目錄的「治療藥水」且玩家開啟目錄挑選
- **THEN** 清單頂部「再次取得」區顯示治療藥水，點選直接進入取得流程

#### Scenario: 關鍵字搜尋
- **WHEN** 玩家輸入關鍵字（中文或英文）
- **THEN** 清單過濾為名稱符合的條目

#### Scenario: 離線使用快取
- **WHEN** 裝置離線且本機已有 items 快取
- **THEN** 目錄瀏覽與搜尋照常運作

### Requirement: 單品詳情
目錄條目 SHALL 可展開詳情：中英文名稱、類別、價格（cp 整數計價，顯示時換算為慣用幣別）、重量、規則文字。價格於內容庫以 `price_cp` 整數欄位儲存，App 端 SHALL NOT 解析幣別字串。

#### Scenario: 詳情顯示
- **WHEN** 玩家點開一件目錄條目
- **THEN** 顯示名稱、類別、價格（如 15 sp 顯示為「15 銀幣」）、重量與規則文字

### Requirement: 目錄挑選版型
目錄挑選畫面 SHALL 依可用寬度適配：compact（<600dp）單欄清單，點條目展開詳情；≥600dp 主從式（左清單、右詳情）。互動元件觸控目標 SHALL ≥48dp。

#### Scenario: 手機單欄
- **WHEN** 可用寬度 <600dp
- **THEN** 目錄以單欄清單呈現，詳情以展開或次層呈現

#### Scenario: 平板主從
- **WHEN** 可用寬度 ≥600dp
- **THEN** 左側清單、右側常駐詳情面板
