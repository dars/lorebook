> **完成狀態註記（archive 前）**
> - 實作層（§1–§12）大致完成，`flutter analyze` 無錯誤，主畫面以戴夫林假資料實機驗證。
> - **偏差**：狀態管理採 freezed + json_serializable（已導入），但 **Riverpod 維持手寫 provider**，未導入 `riverpod_generator`/`riverpod_annotation`（§1.4 部分）。
> - **延後**：OAuth（Google/Apple）程式碼完成但平台 credential 設定待後續；完整創角流程（選種族→職業→配點）為後續變更（本階段為簡化新增）；登入串接與平板版型的實機 E2E 驗證待後續（§12.1/12.5/12.7）。

## 1. Flutter 專案初始化

- [x] 1.1 在專案根目錄執行 `flutter create --org dev.code4soul --project-name lorebook .` 建立專案骨架（bundle: dev.code4soul.lorebook）
- [x] 1.2 確認 iOS 使用 Swift Package Manager（非 CocoaPods）：若 `ios/Podfile` 存在則刪除，確保 `ios/Flutter/flutter_export_environment.sh` 無 CocoaPods 相關設定
- [x] 1.3 調整資料夾結構：建立 `lib/app/`（含 `theme/`）、`lib/features/`（auth/character/decision/journal）、`lib/shared/`（data/domain/presentation/widgets）
- [x] 1.4 在 `pubspec.yaml` 加入核心依賴：`flutter_riverpod`、`riverpod_annotation`、`riverpod_generator`、`go_router`、`supabase_flutter`、`freezed`、`freezed_annotation`、`json_annotation`、`json_serializable`、`build_runner`、`shared_preferences`
- [x] 1.5 安裝 Shorebird CLI 並執行 `shorebird init`，產生 `shorebird.yaml`（app_id 綁定 dev.code4soul.lorebook）
- [x] 1.6 執行 `flutter pub get` 確認依賴安裝成功（iOS 端應透過 SPM 解析，無 pod install）

## 2. 視覺設計系統

- [x] 2.1 建立 `lib/app/theme/app_colors.dart`：D&D 色系定義（羊皮紙暖色、深綠強調色、暗色模式色系）
- [x] 2.2 建立 `lib/app/theme/app_text_styles.dart`：字型樣式定義
- [x] 2.3 將 Cinzel 與 Source Sans 3 字型檔放入 `assets/fonts/`，並在 `pubspec.yaml` 的 `fonts:` 區塊宣告（bundled，不依賴網路）
- [x] 2.4 建立 `lib/app/theme/app_theme.dart`：亮色/暗色 ThemeData，使用自訂色系
- [x] 2.5 建立 `lib/app/theme/decorations.dart`：D&D 風格裝飾元件（卡片角飾、分隔線、背景紋理）
- [x] 2.6 建立 `lib/shared/presentation/widgets/shield_badge.dart`：盾牌造型 widget（用於能力值、AC）
- [x] 2.7 建立 `lib/shared/presentation/widgets/crystal_slot.dart`：水晶造型法術位 widget
- [x] 2.8 建立 `lib/shared/presentation/widgets/bookmark_tab_bar.dart`：書籤造型底部導航列

## 3. App Shell（入口與框架）

- [x] 3.1 修改 `lib/main.dart`：Supabase.initialize()（使用 --dart-define 傳入 URL + anon key）+ ProviderScope 包裹 App
- [x] 3.2 建立 `lib/app/app.dart`：MaterialApp.router 入口 widget
- [x] 3.3 建立 `lib/shared/presentation/responsive_layout.dart`：ResponsiveLayout widget（breakpoint 600dp）
- [x] 3.4 建立 `lib/shared/presentation/app_scaffold.dart`：四 Tab scaffold（手機 BottomNavigationBar 書籤造型、平板 NavigationRail）
- [x] 3.5 建立 `lib/shared/presentation/character_header.dart`：跨 Tab 共用角色頭區塊（徽章 + 名稱下拉 + 種族·職業 + Level）

## 4. Supabase 基礎設施

- [x] 4.1 建立 `lib/shared/data/supabase_client.dart`：supabaseClient provider
- [x] 4.2 建立 `lib/shared/domain/app_exception.dart`：統一錯誤型別

## 5. 路由

- [x] 5.1 建立 `lib/app/router.dart`：GoRouter 設定（auth routes、/character-select、/main 含四 Tab 子路由）
- [x] 5.2 實作三層 redirect guard：未登入 → login、已登入未選角色 → character-select、已登入已選角色 → main/decision
- [x] 5.3 建立 auth state listenable（監聽 Supabase auth 狀態變更，觸發 router refresh）

## 6. Auth 功能

- [x] 6.1 建立 `lib/features/auth/data/auth_repository.dart`：封裝 Supabase Auth（signUp、signIn、signOut、signInWithGoogle、signInWithApple）
- [x] 6.2 建立 auth repository provider
- [x] 6.3 建立 `lib/features/auth/domain/auth_state.dart`：auth 狀態 model
- [x] 6.4 建立 auth state provider（監聽 supabase.auth.onAuthStateChange）
- [x] 6.5 建立 `lib/features/auth/presentation/login_page.dart`：Email/Password 登入表單 + OAuth 按鈕（Google、Apple 僅 iOS）
- [x] 6.6 建立 `lib/features/auth/presentation/register_page.dart`：Email/Password 註冊表單
- [x] 6.7 實作表單驗證（email 格式、密碼 ≥ 6 字元）

## 7. 假資料與 Domain Model

- [x] 7.1 建立 `lib/features/character/domain/character.dart`：Character freezed model（完整欄位：基本資訊、能力值、技能、法術、裝備、金幣、傳記等）
- [x] 7.2 建立相關子 model：AbilityScores、Skill、Spell、Equipment、Weapon、Currency、Personality、Feature 等 freezed class
- [x] 7.3 執行 `build_runner build` 產生 freezed / json_serializable 程式碼
- [x] 7.4 建立 `Character.mock()` 工廠方法：回傳戴夫林（Devlin）完整假資料
- [x] 7.5 建立 currentCharacter provider：回傳 Character.mock()

## 8. 角色選擇畫面

- [x] 8.1 建立 `lib/features/character/presentation/character_select_page.dart`：角色選擇畫面（角色卡片列表、新增/刪除按鈕、空狀態）
- [x] 8.2 建立簡化版新增角色對話框（僅名稱 + 基本欄位）
- [x] 8.3 建立刪除角色確認對話框

## 9. Decision（行動）頁面

- [x] 9.1 建立 `lib/features/decision/presentation/decision_page.dart`：Decision 頁面主框架（ScrollView 容納所有區塊）
- [x] 9.2 建立 `sections/status_section.dart`：HP（數值 + 血條 + 增減按鈕）、AC（盾牌壓印）、專注、Conditions
- [x] 9.3 建立 `sections/resources_section.dart`：法術位（水晶造型，依環數分列）+ 其他職業資源
- [x] 9.4 建立 `sections/movement_section.dart`：速度/衝刺（ft + 格數換算）
- [x] 9.5 建立 `sections/action_section.dart`：可收合攻擊清單（武器 + 命中 + 傷害）、施法·戲法、法術（依環數）、其他動作
- [x] 9.6 建立 `sections/bonus_action_section.dart`：附贈動作（有/無狀態）
- [x] 9.7 建立 `sections/reaction_section.dart`：反應（有/無狀態）
- [x] 9.8 建立 `sections/checks_section.dart`：能力/豁免/技能檢定修正值
- [x] 9.9 建立 `sections/rest_section.dart`：長休/短休功能

## 10. Character（角色）頁面

- [x] 10.1 建立 `lib/features/character/presentation/character_page.dart`：Character 頁面主框架（含五個次級 Tab）
- [x] 10.2 建立 `tabs/overview_tab.dart`：總覽頁（角色立繪 + 基本資訊表格 2×4 + 快速數值列）
- [x] 10.3 建立 `tabs/abilities_tab.dart`：屬性頁（盾牌造型能力值 3×2 grid + 技能清單依能力值分組）
- [x] 10.4 建立 `tabs/spells_tab.dart`：法術頁（施法三欄數值 + 戲法 grid + 已備法術依環數分段）
- [x] 10.5 建立 `tabs/inventory_tab.dart`：物品頁（五種錢幣 + 已裝備/未裝備區塊）
- [x] 10.6 建立 `tabs/biography_tab.dart`：傳記頁（其人其事 + 性格四欄 + 特長與語言）

## 11. Journal（旅程）頁面

- [x] 11.1 建立 `lib/features/journal/presentation/journal_page.dart`：Journal 頁面骨架（空狀態提示）

## 12. System（設定）頁面

- [x] 12.1 建立 `lib/features/system/presentation/system_page.dart`：System 頁面
- [x] 12.2 實作主題切換（亮色/暗色/跟隨系統），偏好以 `SharedPreferences` 持久化
- [x] 12.3 實作登出按鈕（含確認對話框，清除 session 後重導登入頁）

## 13. 整合驗證

- [ ] 12.1 端對端驗證：啟動 App → Launch Screen → 登入 → 角色選擇 → Decision 主畫面（本階段以離線模式驗證主畫面；登入串接 E2E 待後續）
- [x] 12.2 驗證 Decision 頁面所有區塊（Status/Resources/Movement/Action/Bonus Action/Reaction/Checks）以假資料正確呈現
- [x] 12.3 驗證 Character 五個子頁（總覽/屬性/法術/物品/傳記）以假資料正確呈現
- [x] 12.4 驗證四 Tab 切換正常，角色頭區塊跨 Tab 共用
- [ ] 12.5 驗證手機與平板版型切換正常（手機已驗證；平板版型程式碼已具備，實機驗證待後續）
- [x] 12.6 驗證亮色/暗色主題切換
- [ ] 12.7 驗證登出後 redirect 至登入頁（待登入串接 E2E 一併驗證）
- [x] 12.8 執行 `flutter analyze` 確認無靜態分析錯誤
