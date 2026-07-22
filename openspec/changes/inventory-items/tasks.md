# Tasks: inventory-items

## 1. 內容庫（前置，外部內容專案）

- [x] 1.1 盤點上游 XPHB 裝備條目中屬 srd52 範圍者（武器/護甲/冒險裝備/工具），確認各類筆數與中譯來源
- [x] 1.2 items 匯入管線：比照既有資料域過濾 `srd52`，寫入 `source='XPHB'`、`srd=true`，價格正規化為 `price_cp` 整數、重量欄位；武器帶傷害骰/傷害類型/屬性標籤、護甲帶 AC 公式參數；各條目帶 `subcategory` 子分類（分組瀏覽用）
- [x] 1.3 驗證 `v_items` 查詢：四類別皆非空、欄位完整（中文名/類別/price_cp/重量/規則文字）、非 SRD 條目為零

## 2. 資料模型與扣款邏輯

- [x] 2.1 `Equipment` freezed 模型擴充：`itemType`/`source` 列舉、`quantity`、`quest`、`priceCp`、`catalogRef`，全帶預設值；跑 build_runner 並以舊 JSON fixture 驗證向後相容
- [x] 2.2 分層扣款純函式 `payFrom(Currency, int priceCp)`：小幣值優先扣同階、不足向上一階換零（僅換最小枚數）、不足額回傳失敗與差額
- [x] 2.3 扣款單元測試：剛好足額、跨多階換零、ep 匯率（1 ep=5 sp）、不足額擋下、不重排其餘幣別
- [x] 2.4 `CurrentCharacterNotifier` 物品 CRUD：addItem/updateItem/removeItem/restoreItem（undo 用）、useConsumable（quest 歸零保留）、toggleEquipped、purchaseItem（接 payFrom + adjustCurrency）

## 3. 目錄查詢（App 端）

- [x] 3.1 `CatalogRepository` 新增 items 查詢（`v_items`、`source='XPHB'`），比照 spells 的 provider/本機快取模式
- [x] 3.2 items provider：類別過濾 + 中英文關鍵字搜尋；目錄為空/離線無快取時回報空狀態供 UI 降級

## 4. 物品頁 UI

- [x] 4.1 物品卡片改版：類型圖示、數量（>1 顯示）、任務徽章、分區（已裝備/攜帶中）依新模型計算
- [x] 4.2 物品列操作：數量 +/−、消耗品「使用」（歸零移除 + SnackBar 復原）、武器/護甲裝備切換（觸控目標 ≥48dp）
- [x] 4.3 左滑刪除（比照日誌卡片），quest 物品刪除加警示確認
- [x] 4.4 新增入口：物品區塊標題列 `SectionEditIcon` → bottom sheet 二選一（目錄挑選/自訂輸入）；目錄為空時僅顯示自訂
- [x] 4.5 自訂物品編輯 sheet：名稱（必填）/描述/類型選單/數量/任務旗標，沿用 `EditorSheetScaffold`
- [x] 4.6 目錄挑選畫面：compact 單欄清單+搜尋，≥600dp 主從式（左清單右詳情）；詳情含價格換算顯示
- [x] 4.8 目錄瀏覽結構：子分類分組標頭＋「再次取得」置頂區（自物品欄 source=catalog 推導）
- [x] 4.7 取得流程：詳情處「購買」與「直接取得」對等雙入口；購買確認時 SRD 標價預填、成交金額可修改（DM 自訂價），不足額提示差額並可改金額重試

## 5. 裝備效果

- [x] 5.1 AC 推導純函式 `computeAc(character)`：無甲 10+Dex、無甲防禦特性（野蠻人/武僧）、輕/中/重甲公式、盾牌 +2；單元測試以 mock 角色驗證與現值一致
- [x] 5.2 攻擊列推導：裝備中武器＋固定徒手攻擊（命中 力調+熟練、傷害 1+力調鈍擊）；finesse 取高屬性；自訂武器缺機制資料時只顯示名稱
- [x] 5.3 靜態 `weapons` 清單退場：舊資料讀入一次性轉為 equipment 武器條目（equipped=true）、mock 種子資料改寫、`ac` 欄位轉推導 fallback
- [x] 5.4 行動頁 `actions_section` 與狀態卡 `_AcShield` 改讀推導值，AC 註記反映推導依據（無甲/護甲名/盾牌）
- [x] 5.6 裝備狀態判定式（著甲/著重甲/持盾）＋武僧持盾失效等 SRD 細節；單元測試覆蓋三種嚴格度
- [x] 5.7 著甲條件特性提示：內建 SRD 條件對照（野蠻人/武僧五項特性），特性清單顯示失效標示
- [x] 5.8 法師護甲開關：僅法術清單含 Mage Armor 者可見；生效採 13+Dex 入基礎公式取高、著甲自動關閉；含單元測試（疊盾、取高、著甲結束）
- [x] 5.5 自訂武器編輯 sheet 增加選填機制欄位（傷害骰/傷害類型/finesse）

## 6. 驗證與收尾

- [x] 6.1 Widget/單元測試：新增自訂物品、目錄加入、購買扣款成功/失敗、使用消耗品歸零復原、quest 刪除確認、AC 推導各公式、攻擊列裝備連動與徒手攻擊恆在
- [ ] 6.2 手機與 iPad 兩版型實機檢視（含淺色/深色模式）
- [x] 6.3 `flutter analyze` 與 `dart format` 全綠；更新 CLAUDE.md 資料模型段落（Equipment 欄位）
