## 1. Domain

- [x] 1.1 `CurrentCharacterNotifier` 新增 `addToolProficiency`／`removeToolProficiency`：去空白、去重、不排序（與語言一致）

## 2. 編輯介面

- [x] 2.1 熟練 sheet 新增「工具」段（語言段之後），沿用既有的 chip 元件
- [x] 2.2 候選自 `toolProficiencyOptionsProvider` 取得，依 subcategory 分組並加分組標題
- [x] 2.3 已擁有者自候選中移除
- [x] 2.4 自由填寫欄位（與語言各自獨立）
- [x] 2.5 離線降級：候選為空時顯示提示，不阻擋語言段與關閉；自由填寫仍可用

## 3. 測試

- [x] 3.1 notifier 測試：新增、移除、去重（含前後空白）、順序維持、不影響語言
- [x] 3.2 widget 測試：自分組候選選取加入；移除生效
- [x] 3.3 widget 測試：自由填寫加入
- [x] 3.4 widget 測試：內容庫為空時顯示離線提示，語言段仍可操作、自由填寫仍可加入
- [x] 3.5 版面測試：候選 chip 橫向流動（沿用語言段的回歸斷言）

## 4. 收尾

- [x] 4.1 `flutter analyze` 與 `dart format .` 全數通過
- [x] 4.2 `flutter test` 全綠
- [x] 4.3 dev server 確認：加入鐵匠工具、重新載入後仍在——2026-08-04 使用者驗證通過
