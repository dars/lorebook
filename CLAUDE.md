# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

Lorebook — 支援 iOS / Android 的 Flutter App，同時適配手機與平板版型。  
核心功能為 D&D 5.5e（2024 版規則）跑團角色卡，附帶世界觀筆記功能。

### 內容範圍政策（content-scope）

- 一切規則內容以 **D&D 2024（5r）** 為基準
- 規則內容**僅**來自 **SRD 5.2（CC-BY-4.0）** 或使用者自訂資料；不收錄任何非 SRD 的官方出版內容
- **不涵蓋**怪物、官方劇本/劇情
- Product Identity 名稱（如 Bigby's、Tasha's）一律使用 SRD 官方改名（如 Arcane Hand）
- 玩家自產內容（角色卡、個人筆記、Campaign 共用筆記）不受此限——排除的是官方出版內容，非使用者內容
- 內容庫匯入管線依上游 `srd52` 標記過濾，重匯不會回灌非 SRD 內容

## 常用指令

```bash
# 安裝套件
flutter pub get

# 執行 App（指定裝置）
flutter run -d <device_id>

# 列出可用裝置
flutter devices

# 執行所有測試
flutter test

# 執行單一測試檔
flutter test test/path/to/file_test.dart

# 執行單一測試案例（by name）
flutter test --name "test name"

# 格式化程式碼
dart format .

# 靜態分析
flutter analyze

# 建置 iOS（release）
flutter build ios --release

# 建置 Android APK（release）
flutter build apk --release
```

## 架構

_專案初始化後在此補充架構說明。_

### 版型適配原則

- 手機與平板使用同一份 codebase，以 `shared/presentation/responsive_layout.dart` 的 `ResponsiveLayout` 依**可用寬度**（非裝置種類）切換版型
- 三段式寬度級距（對齊 Material 3 window size class）：
  - **compact**（< 600dp，手機）：單欄 + 底部 Tab Bar
  - **medium**（600–840dp，iPad 直向）：排列沿用手機單欄、內容置中限寬；導覽為 NavigationRail
  - **expanded**（≥ 840dp，iPad 橫向）：可用多欄排列（如 Decision 頁三欄）
- 拆分原則：優先同檔內以參數/私有 layout widget 切換排列，資料與狀態保持一份；只有互動流程本身不同時才分頁面檔案

### 資料夾結構慣例（待確認後調整）

```
lib/
  main.dart
  app/          # App 入口、路由、主題
  features/     # 以功能為單位的模組（feature-first）
  shared/       # 跨功能共用的 widget、util、model
```

### 狀態管理

使用 **Riverpod**（`flutter_riverpod` + `riverpod_annotation`）。
- 全域狀態以 `Provider` / `AsyncNotifierProvider` 管理
- 本地 UI 狀態優先用 `StateProvider` 或 widget 內部 `useState`

### 角色卡核心資料模型（D&D 5.5e 2024）

角色卡涵蓋的主要資料域：
- **基本資訊**：名稱、種族（Species）、背景（Background）、職業（Class）、等級、陣營
- **能力值**：STR / DEX / CON / INT / WIS / CHA（含修正值、豁免骰）
- **戰鬥數值**：AC、HP（最大值/當前/臨時）、速度、先攻、熟練加值
- **技能**：各技能熟練度標記與修正值
- **武器與攻擊**
- **法術**：法術位、已知法術清單（按環數分類）
- **裝備與金幣**
- **特性與專長**（Traits / Feats）
- **筆記欄位**（外觀、性格、背景故事等）
