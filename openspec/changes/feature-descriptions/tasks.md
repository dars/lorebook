## 1. 資料形狀

- [x] 1.1 `lib/features/character/domain/character_creation_data.dart` 新增 `SpeciesTrait`（name／nameEn／description）
- [x] 1.2 `SpeciesOption.traits` 型別由 `List<String>` 改為 `List<SpeciesTrait>`；內建 8 個種族的 traits 定義改寫（其餘機制欄位不動）
- [x] 1.3 補齊內建各種族特性的中文說明（每條 1–2 句、定位為「看得懂在做什麼」而非規則原文）
- [x] 1.4 `character_create_page.dart` 送出時，種族特性以 name／nameEn／description 三欄分別映射至 `CharacterFeature`，`source` 維持「種族：X」
- [x] 1.4b `SpeciesOption.darkvision`（bool）改為 `darkvisionFt`（0／60／120），新增 `allTraits` 推導黑暗視覺條目；移除 5 個種族 traits 內重複的黑暗視覺、補上精靈遺漏的 60 呎；建角敘述卡移除獨立的黑暗視覺 chip
- [x] 1.5 起源專長的說明改自內容庫 `feats` 表帶入（`originFeatDetail`）——否則它是角色卡上唯一永遠點不開的特性。變體名稱（「法術新手（法師）」）以主名比對；查無或取用失敗時說明留空，退化為不可點擊

## 2. 呈現（依賴 1）

- [x] 2.1 建角種族步驟的敘述卡：特性只顯示名稱，點擊出說明
- [x] 2.2 `biography_tab.dart` 特性清單：移除常駐的 `description` 區塊，改為點擊出說明
- [x] 2.3 職業特性一併適用同一互動（同一份清單不混用兩種行為）
- [x] 2.4 `description` 為空時不呈現可點擊提示（既有角色與背景起源專長皆走此路徑）
- [x] 2.5 說明呈現沿用 App 既有慣例（比照決策頁狀態異常的說明彈窗）；觸控目標 ≥ 48dp

## 3. 測試

- [x] 3.1 映射測試：`SpeciesTrait` 的三欄正確落到 `CharacterFeature`，不合併為單一字串
- [x] 3.1a 黑暗視覺去重測試：traits 內不含黑暗視覺、`allTraits` 依距離推導出唯一一條、各種族距離符合 SRD
- [x] 3.1b `originFeatDetail` 單元測試：主名命中、變體括號以主名比對、查無／空清單回傳空值；建角流程測試斷言起源專長帶到英文名與說明
- [x] 3.2 建角 widget 測試：種族步驟的特性可點擊並顯示說明
- [x] 3.3 角色頁 widget 測試：清單只顯示名稱；點擊有說明者出現說明；職業特性行為相同
- [x] 3.4 降級測試：以「名稱為整串、說明為空」的舊特性快照渲染，不呈現可點擊提示且畫面正常
- [x] 3.5 既有測試修正：受 `traits` 型別變更影響的測試（如建角相關）一併更新

## 4. 收尾

- [x] 4.1 `flutter analyze` 與 `dart format .` 全數通過
- [x] 4.2 `flutter test` 全綠
- [ ] 4.3 實機／模擬器確認：新建角色的種族特性可點開看說明；上線前建立的舊角色開啟角色頁不異常
