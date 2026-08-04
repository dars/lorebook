## 1. Domain

- [x] 1.1 `BackgroundOption` 新增 `toolProficiency`（`String`，預設空）
- [x] 1.2 內建 4 個背景補上 SRD 對應工具：士兵→遊戲組、賢者→書法工具、侍僧→書法工具、罪犯→盜賊工具
- [x] 1.3 `CustomBackground` 新增 `toolProficiency`（`@Default('')`）；`toBackgroundOption()` 一併帶出
- [x] 1.4 `Character` 新增 `toolProficiencies`（`@Default(<String>[])`）——獨立於 `skills`，不帶關聯屬性與加值
- [x] 1.5 內容庫工具清單：新增 provider／輔助函式，自 `items` 篩 `type` 前綴為 `AT`／`T`／`GS`／`INS`，並依類別分組

## 2. 建角整合

- [x] 2.1 建角送出時把背景的工具寫入 `Character.toolProficiencies`（空字串不寫入）

## 3. 呈現

- [x] 3.1 `biography_tab.dart`：於語言列下方以相同形式呈現工具熟練
- [x] 3.2 清單為空時不渲染該列（既有角色的降級路徑）

## 4. 自訂背景編輯頁

- [x] 4.1 新增工具選擇欄位，選項來自 1.5，依類別分組呈現
- [x] 4.2 內容庫取用失敗時顯示離線提示、允許留空、不阻擋儲存
- [x] 4.3 觸控目標 ≥ 48dp；沿用既有欄位的視覺語言
- [x] 4.4 `_RulesNotice` 補上「一項工具熟練」——2024 背景的建構框架含此項，先前的說明少列了

## 5. 測試

- [x] 5.1 內建背景資料測試：4 個背景的工具皆非空且符合 SRD
- [x] 5.2 工具清單篩選測試：僅回傳工具類 type，分組正確
- [x] 5.3 建角測試：內建與自訂背景的工具皆帶入角色
- [x] 5.4 呈現測試：有工具時顯示於語言列下方；無工具時不渲染該列
- [x] 5.5 編輯頁測試：工具可選取並儲存；離線時可留空且儲存不受阻
- [x] 5.6 既有資料測試：無此欄位的舊角色與舊自訂背景讀入為空，行為不變

## 6. 收尾

- [x] 6.1 `flutter analyze` 與 `dart format .` 全數通過（code generation 需 `--force-jit`）
- [x] 6.2 `flutter test` 全綠
- [ ] 6.3 dev server 確認：以內建背景建角可見工具熟練；自訂背景可選工具；舊角色不異常
