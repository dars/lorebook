# Lorebook

支援 iOS / Android 的 Flutter App（手機與平板版型自適應）。核心功能為 D&D 5.5e（2024 版規則）跑團角色卡，附帶世界觀筆記功能。

## 內容範圍

- 一切規則內容以 **D&D 2024（5r）** 為基準
- 規則內容**僅**來自 **SRD 5.2**（CC-BY-4.0）或使用者自訂資料，不收錄其他官方出版內容
- 不涵蓋怪物、官方劇本/劇情
- Product Identity 名稱一律採用 SRD 官方改名（如 Bigby's Hand → Arcane Hand／奧法之掌）

## 開發

```bash
flutter pub get

# 需帶 Supabase 環境設定執行（否則為離線模式）
flutter run -d <device_id> --dart-define-from-file=.env.json

flutter test
flutter analyze
```

更多指令與架構說明見 [CLAUDE.md](CLAUDE.md)；內容資料庫說明見 [designs/SUPABASE.md](designs/SUPABASE.md)。

## 授權聲明（Attribution）

本作品收錄之遊戲規則內容取自 System Reference Document 5.2（"SRD 5.2"），著作權為 Wizards of the Coast LLC 所有，依 [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode)（CC-BY-4.0）授權使用。

> This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

繁體中文翻譯為本專案之衍生創作，同樣依 CC-BY-4.0 授權。App 程式碼之授權另計。
