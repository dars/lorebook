# 規則邏輯的 golden 對照

Next.js 重寫時，規則推導**不得憑規格重寫**，必須逐項對上這裡的輸出
（`web-only-nextjs-migration` design D7）。

這類邏輯的失敗模式不是「寫不出來」，而是「看起來對、但特定情境算錯」——
玩家不會回報，只會默默失去信任。clean-slate 一次性切換沒有並行雙軌可以
當安全網，對拍因此是主要防線。

## 重新產生

```bash
flutter test tool/export_rule_goldens.dart --dart-define=out=golden
```

**只在確認現行實作正確的前提下重跑。** golden 的價值來自它凍結了一個已驗證
的狀態；若新實作對不上就重跑 golden 讓它「通過」，這道防線等於不存在。

## 檔案

| 檔案 | 筆數 | 對應的現行實作 |
|---|---|---|
| `compute_ac.json` | 15 | `derived_stats.dart` 的 `computeAc` |
| `pay_from.json` | 10 | `currency_math.dart` 的 `payFrom` |
| `format_cp.json` | 10 | `currency_math.dart` 的 `formatCp` |
| `derive_class_resources.json` | 160 | `class_resources.dart` 的 `deriveClassResources`（8 職業 × 1–20 級） |
| `real_characters.json` | 6 | 真實資料樣本，供新型別定義驗證解析 |

格式一律 `[{desc, input, output}, …]`。`input` 為新實作也吃得到的純資料
（`compute_ac` 的 input 是完整的 Character JSON），`output` 為現行實作的結果。

### 特別留意的規則

這幾條在重寫時最容易漏，golden 各有專門案例：

- **武僧持盾時無甲防禦失效**，退回一般無甲；**野蠻人持盾則仍有效**
- **中甲的敏捷上限 +2**，敏捷 +1 時全額計入而非補到 2
- **找零不產生 ep**：1 ep 買 3 cp 的結果是 4 sp 7 cp
- **自訂護甲缺 `acBase`** 時回退舊的靜態 `ac` 欄位
- 無甲的多個候選公式（一般／無甲防禦／法師護甲）**取最高**，不是後者覆蓋前者

## 未覆蓋的範圍

誠實列出，不以「已全數對拍」表述：

- **`level_up`**：升級流程含 UI 互動（選子職業、ASI 或專長、法術），純函式部分
  未獨立匯出。重寫該流程時需另外補
- **`attackEntries`**（武器攻擊列推導）：依賴裝備的武器機制欄位，案例尚未建構
- **`syncClassResources`**：升級後的資源差額入帳邏輯（升級不視為休息，已消耗的
  不回復）未涵蓋，只涵蓋了 `deriveClassResources`
- **`real_characters.json` 只含專案擁有者本人的 6 張**。資料表是多租戶的，
  其他 10 位測試者的角色不進版控。切換上線前需對**全部**存活資料跑一次解析
  驗證（tasks 7.1），不能只憑這 6 筆
- 能力值修正、被動察覺、法術 DC 等單純算式未匯出——它們的公式短且在 golden 的
  Character 樣本中已間接涵蓋

## 相關

- 產生器：`tool/export_rule_goldens.dart`
- demo 角色產生器：`tool/seed_demo_characters.dart`（切換後重灌 demo 用；其
  組裝邏輯對齊建角流程，可作為新實作建角的對照）
