## 背景

Lorebook 是專為 D&D 5.5e（2024）規則打造的跑團輔助 App，目標平台為 iOS 與 Android。目前專案目錄內無任何 Flutter 程式碼，本設計文件定義從零開始的技術架構與專案骨架。

後端使用 Supabase（已確定），包含 Auth、PostgreSQL、Realtime。本階段專注於 App 端架構，畫面先填入假資料（參考「它式自動角卡 V3.9」Excel 中的戴夫林角色）驗證架構與 UI 呈現。

## 目標 / 非目標

**目標：**
- 建立可擴展的 feature-first 資料夾結構
- 設定 Riverpod + go_router + Supabase 的整合模式，後續功能可直接複製
- 建立 D&D 古書風格視覺設計系統（非 Material 3 預設外觀）
- 建立 responsive layout 框架，手機/平板一套 widget 兩種版型
- 實作完整 App 啟動流程：Launch Screen → 登入 → 角色選擇 → Decision 主畫面
- 實作四 Tab 主畫面架構（Decision / Character / Journal / System）
- 以戴夫林假資料驗證 Decision 頁面全部區塊與 Character 五個子頁的 UI 呈現

**非目標：**
- 完整的創建角色流程（後續 change）
- Campaign 功能與 Realtime 訂閱（後續 change）
- 靜態遊戲資料（法術、職業等）的雲端同步與快取機制
- 多語系（i18n），本階段 UI 固定繁體中文
- Journal 頁面的完整功能（本階段僅建骨架）
- D&D 規則計算引擎（如自動計算 AC、命中加值等），本階段數值來自假資料

## 設計決策

### 1. 專案初始化

在專案根目錄執行 `flutter create --org dev.code4soul --project-name lorebook .`。Flutter 3.44.3 (stable)、Dart 3.12.2。iOS 一律使用 Swift Package Manager（非 CocoaPods）。

整合 Shorebird 以支援 OTA code push。執行 `shorebird init` 產生 `shorebird.yaml`，後續 release 透過 `shorebird release` 與 `shorebird patch` 推送更新。

### 2. 資料夾結構（feature-first）

```
lib/
  main.dart
  app/
    router.dart              # go_router 設定
    theme/
      app_theme.dart         # ThemeData（亮色/暗色）
      app_colors.dart        # D&D 色系定義
      app_text_styles.dart   # 字型樣式
      decorations.dart       # 角飾、分隔線、紋理等裝飾元件
    app.dart                 # MaterialApp.router 入口
  features/
    auth/
      data/                  # repository
      domain/                # model（freezed）
      presentation/          # pages, widgets
    character/
      data/
      domain/
      presentation/
        tabs/                # 總覽、屬性、法術、物品、傳記子頁
    decision/
      data/
      domain/
      presentation/
        sections/            # status, resources, movement, action 等區塊
    journal/
      presentation/
  shared/
    data/
      supabase_client.dart   # Supabase 初始化與存取
    domain/
      app_exception.dart     # 統一錯誤型別
    presentation/
      responsive_layout.dart
      app_scaffold.dart      # 四 Tab 書籤導航 scaffold
      character_header.dart  # 跨 Tab 共用角色頭區塊
      widgets/               # 盾牌造型、水晶法術位等 D&D 風格 widget
```

**理由**：feature-first 搭配 data/domain/presentation 三層，在 Riverpod 生態中是主流慣例。每個 feature 自包含，降低耦合。

### 3. 狀態管理：Riverpod + code generation

使用 `riverpod_annotation` + `riverpod_generator` 搭配 `build_runner`。

```dart
@riverpod
class CharacterList extends _$CharacterList {
  @override
  Future<List<Character>> build() async {
    return ref.read(characterRepositoryProvider).getAll();
  }
}
```

**理由**：annotation-based 減少 boilerplate，自動決定 provider 類型，官方推薦方式。

### 4. 路由：go_router + auth redirect + 角色選擇

```
/auth/login
/auth/register
/character-select          ← 登入後進入角色選擇
/main                      ← 選擇角色後進入（四 Tab 主畫面）
  /main/decision           ← Home（預設 Tab）
  /main/character
  /main/journal
  /main/system
```

redirect 邏輯：
1. 未登入 → `/auth/login`
2. 已登入但未選擇角色 → `/character-select`
3. 已登入且已選角色 → `/main/decision`

**理由**：三層 guard 確保使用者在正確的狀態下看到正確的畫面。

### 5. Supabase 初始化與注入

在 `main.dart` 中 `Supabase.initialize()` 後再 `runApp()`。Supabase client 透過 Riverpod provider 注入：

```dart
@riverpod
SupabaseClient supabaseClient(Ref ref) => Supabase.instance.client;
```

環境設定（Supabase URL + anon key）使用 `--dart-define` 傳入。

### 6. Repository Pattern

每個 feature 的 `data/` 層包含 repository class，封裝 Supabase 操作，回傳 domain model（freezed class），不暴露 raw Map。

```dart
@riverpod
CharacterRepository characterRepository(Ref ref) {
  return CharacterRepository(ref.read(supabaseClientProvider));
}
```

### 7. Domain Model：freezed + json_serializable

角色卡 model 使用 `freezed` 產生 immutable class + `copyWith` + JSON serialization。模型欄位對齊 D&D 5e 規則結構（能力值、技能、法術、裝備等）。

### 8. 視覺設計系統

**色系**：
- 主色調：羊皮紙暖色（米/棕/金）
- 強調色：深綠（用於施法主屬性、熟練技能、選中 Tab 等）
- 暗色模式：深棕/深灰底搭配金色強調

**D&D 風格元件**（全部以「低存在感」為原則）：
- 卡片角飾：古書風格四角裝飾
- 分隔線：D&D 元素作為分隔線點綴
- 背景紋理：極淡的地圖/法陣紋理
- 能力值盾牌：六角盾牌造型顯示能力值，施法屬性以深綠標示
- AC 盾牌壓印：護甲值以盾牌壓印效果呈現
- 法術位水晶：水晶造型表示法術位剩餘/最大值
- 底部書籤 Tab：書籤造型的底部導航列

**字型**：
- 標題：Cinzel（古書碑文風格）
- 內文：Source Sans 3（清晰易讀）
- 載入方式：字型檔 bundle 在 `assets/fonts/`，不使用 `google_fonts` 套件（跑團場景網路不穩定，離線可用優先）

**實作方式**：透過 `CustomPainter` 與 SVG assets 實現裝飾元件，封裝在 `app/theme/decorations.dart` 與 `shared/presentation/widgets/`。

### 9. Responsive Layout

```dart
class ResponsiveLayout extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;

  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      if (constraints.maxWidth >= 600 && tablet != null) {
        return tablet!;
      }
      return mobile;
    });
  }
}
```

- 手機：單欄 + BottomNavigationBar（書籤造型）
- 平板：NavigationRail + 雙欄 master-detail

### 10. 四 Tab 主畫面架構

共用 `AppScaffold` 包含：
- **角色頭區塊**（跨 Tab 共用）：角色徽章 + 名稱下拉切換 + 種族·職業 + Level
- **底部書籤 Tab**：行動 / 角色 / 旅程 / 設定

Character Tab 內部再以頂部 TabBar 切分五個子頁：總覽 / 屬性 / 法術 / 物品 / 傳記。

### 11. 假資料策略

本階段不連接 Supabase 資料庫做角色卡真實 CRUD。所有畫面資料來自硬編碼的假資料 provider，回傳戴夫林角色的完整資料物件。當後續接上真實資料層時，只需替換 provider 實作，UI 層不需變動。

```dart
@riverpod
Character currentCharacter(Ref ref) => Character.mock(); // 戴夫林假資料
```

### 12. Auth 策略

本階段支援：
- Email + Password 登入/註冊
- Google OAuth（iOS + Android）
- Apple Sign In（僅 iOS）

使用 `supabase_flutter` 內建 auth 方法，session token 自動持久化。

### 13. 共用條目卡 `EntryCard`

法術、戲法、武器在 Decision 與 Character 頁面共用同一個可展開條目卡 `EntryCard`（`shared/presentation/widgets/`），對齊 designs.pen 的 AbilityCard：

- 單一卡片（圓角 + 邊框）：標題列（徽章 + 中/英名 + 右側資訊與數值 + 展開指示）→ 分隔線 → 較深底色的描述面板（描述本文 + 補充說明）
- 自管展開狀態；無描述時不顯示展開指示
- Spell/Weapon → EntryCard 的轉換以共用 builder（`features/character/presentation/widgets/spell_entry.dart` 的 `spellEntryCard` / `weaponEntryCard`）封裝，避免各頁重複

### 14. 傷害類型配色：`DndColors` ThemeExtension

各傷害類型（火/冰/閃電/雷鳴/酸/毒/黯蝕/光耀/心靈/力場/物理）顏色集中於 `app/theme/dnd_colors.dart` 的 `DndColors extends ThemeExtension<DndColors>`，提供 `damage(type)` 取色，並有 `dark`/`light` 兩套（實作 `lerp` 支援切換）。掛在 `ThemeData.extensions`，日後可依使用者設定整套替換，UI 層不需改動。

### 15. 導航單一來源與情境式頁首

- 主導航分頁定義集中於 `shared/presentation/app_destinations.dart`（path/icon/label/`characterScoped`），底部書籤列、平板 NavigationRail、路由切換共用。
- `AppScaffold` 依 `characterScoped` 決定頁首：角色情境頁用 `CharacterHeader`，全域/系統頁用純標題 `PageHeader`。

### 16. 浮動導航底部留白

底部導覽列為浮動造型且 `Scaffold` 採 `extendBody: true`，故各捲動頁面底部需保留留白避免遮擋。以 `BuildContext.bottomNavClearance`（`app/theme/app_spacing.dart`）統一計算：`MediaQuery.paddingOf(context).bottom`（extendBody 下已含導覽列高度與安全區）再加呼吸間距。

### 17. 模型實作調整（相對於 §3、§7）

- **Domain model：採用 freezed + json_serializable**。`character.dart` 全部子模型以 `@freezed` 定義（freezed **3.x** 語法：`abstract class X with _$X` + `const factory`），並產生 `fromJson`/`toJson`。
  - 版本備註：原規格曾 pin `freezed ^2.5.8`，與目前 Dart 3.10 相依衝突（即先前卡關的「狀況」）；改用 `flutter pub add` 解析到 **freezed 3.x / json_serializable 6.x / build_runner 2.x** 即正常。
  - codegen 指令：`dart run build_runner build`，產生 `*.freezed.dart` / `*.g.dart`。
- **Riverpod：維持手寫 provider**（暫未導入 `riverpod_generator`）。如需再評估加入。

## 風險 / 取捨

- **[視覺客製化工作量]** → D&D 古書風格與 Material 3 預設差距大，需要較多 CustomPainter 與 SVG 工作。緩解：先建立核心裝飾元件（角飾、分隔線、盾牌、水晶），其餘逐步補充。
- **[code generation 建置時間]** → freezed + riverpod_generator 依賴 build_runner，初期建置較慢。緩解：使用 `build_runner watch` 持續監聽。
- **[假資料與真實資料切換]** → 假資料 provider 可能與真實資料結構有落差。緩解：假資料使用與 Supabase 相同的 domain model，確保結構一致。
- **[OAuth 平台設定]** → Google/Apple OAuth 需要各平台的 credential 配置。緩解：先確保 Email 登入可用，OAuth 作為加分項。
