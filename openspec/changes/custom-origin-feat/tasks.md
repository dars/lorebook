## 1. Domain

- [x] 1.1 `CustomBackground` 新增 `originFeatCustom`（`@Default(false)`）與 `originFeatDescription`（`@Default('')`）；`toBackgroundOption()` 一併帶出
- [x] 1.2 `BackgroundOption` 新增對應欄位（內建背景為 false／空——其說明來自內容庫）
- [x] 1.3 模式一律以 `originFeatCustom` 判斷，**不得由名稱推導**——使用者可自訂與 SRD 候選同名的專長
- [x] 1.4 驗證：自訂模式時名稱必填、長度上限（名稱 20 字、說明 200 字）

## 2. 編輯頁

- [x] 2.1 起源專長改為二擇一：「自 SRD 選取」／「自行填寫」，切換時保留各自的輸入並更新 `originFeatCustom`（讀取端另有把關，見 3.2）
- [x] 2.2 自訂模式顯示名稱與說明兩欄
- [x] 2.3 明示「自訂的起源專長僅為顯示文字，不產生規則效果」
- [x] 2.4 觸控目標 ≥ 48dp；沿用既有 `_RulesNotice` 的視覺語言

## 3. 建角整合

- [x] 3.1 `character_create_page`：`originFeatCustom` 為 true 時採背景自帶的說明，false 時走 `originFeatDetail()` 查內容庫
- [x] 3.2 讀取端一律以旗標為準——不可只靠編輯頁切換模式時清除殘留值，否則舊資料或他處寫入的文件會漏過去
- [x] 3.3 自訂起源專長於角色卡與建角流程呈現時帶自訂標示（來源可辨識，見 design D2a）

## 4. 測試

- [x] 4.1 model 測試：JSON round-trip 含新欄位；既有資料（無此二欄位）讀入為 false／空字串
- [x] 4.2 驗證測試：自訂模式名稱空白不可儲存；長度上限
- [x] 4.3 編輯頁 widget 測試：兩種模式切換、自訂模式的兩欄、限制說明可見
- [x] 4.4 建角測試：自訂起源專長帶到角色卡且可點開
- [x] 4.4b 邊界測試：`originFeatCustom` 為 false 但文件內殘留自訂說明時，採內容庫的說明
- [x] 4.4c 同名測試：自訂模式填「警覺」時，角色卡顯示使用者的說明而非內容庫的警覺
- [x] 4.5 既有自訂背景（起源專長為 SRD 候選、新欄位為空）行為不變

## 5. 收尾

- [x] 5.1 `flutter analyze` 與 `dart format .` 全數通過
- [x] 5.2 `flutter test` 全綠
- [x] 5.3 dev server 確認：自訂背景填自訂起源專長 → 建角 → 角色卡可點開看說明（2026-08-04 使用者驗證通過）
