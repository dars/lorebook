# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

Lorebook — 支援 iOS / Android 的 Flutter App，同時適配手機與平板版型。  
核心功能為 D&D 5.5e（2024 版規則）跑團角色卡，附帶世界觀筆記功能。

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

- 手機與平板使用同一份 codebase，透過 `LayoutBuilder` 或螢幕寬度判斷 breakpoint 切換版型
- 平板版型 breakpoint：寬度 ≥ 600dp

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
