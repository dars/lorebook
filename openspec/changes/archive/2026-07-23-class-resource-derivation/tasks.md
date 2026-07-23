# Tasks: 職業資源推導

## 1. 規則表與推導函式

- [x] 1.1 建立 `lib/features/character/domain/class_resources.dart`：`ResourceUsesFormula` 列舉、`ClassResourceRule` 模型、`deriveClassResources()` 純函式
- [x] 1.2 依 SRD 5.2 原文逐職業填規則表：野蠻人（狂暴）、吟遊詩人（吟遊激勵）、牧師（引導神力）、德魯伊（荒野變身）、戰士（第二風、動作如潮）、武僧（專注點）、聖騎士（聖療之觸、引導神力）、術士（術法點數）；遊俠/賊/法師/契術師確認無合格資源
- [x] 1.3 單元測試 `class_resources_test.dart`：每職業關鍵級距（獲得級、成長級、骰面升級）對照 SRD 數值；abilityMod 下限 1；未達等級不出現

## 2. 建角接入

- [x] 2.1 `character_create_page.dart` `_create()`：以 Lv1＋定案能力值呼叫 `deriveClassResources` 寫入 `resources`（不依賴內容庫，離線同樣產出）
- [x] 2.2 擴充 `create_with_custom_background_test.dart`：建出的戰士含第二風 pips；（如有法師案例）resources 為空

## 3. 升級接入

- [x] 3.1 `character_level_up_page.dart` 升級確認：重算 max/骰面、current 差額入帳、新資源以 current = max 加入；能力值變動（加值/專長）後 abilityMod 型重算
- [x] 3.2 擴充升級測試：野蠻人 2→3 狂暴 1/2→2/3；術士 1→2 獲得術法點數 2/2；吟遊詩人 4→5 骰面 d6→d8 且短休標記依 design D5

## 4. 載入回填與範例校正

- [x] 4.1 角色載入路徑（與 weapons→equipment 轉換同位置）加 `backfillClassResources`：nameEn 比對、僅補缺不覆寫、current = max
- [x] 4.2 回填測試：空 resources 的吟遊詩人 Lv5 補入 3/3 d8；既有狂暴 1/3 不被覆寫
- [x] 4.3 校正 `character.dart` 範例角色：resources 改由推導函式生成或數值對齊規則表；跑全套測試確認樣本相依測試不破

## 5. 驗證

- [x] 5.1 `flutter analyze`＋全套測試通過；`dart format`
- [x] 5.2 dev server 手動驗證：新建吟遊詩人資源區顯示吟遊激勵（dice）、野蠻人顯示狂暴（pips）、舊角色（回填）開啟後即有資源；消耗/回復與短休長休行為正常
