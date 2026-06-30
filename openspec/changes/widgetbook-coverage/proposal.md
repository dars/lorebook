> **狀態：BACKLOG（暫緩）** — 待有重用/設計價值時，選擇性逐步進行。

## Why

`widgetbook` 已建立型錄基礎設施 + 首批公開元件 use-case。但建角內部卡片、角色卡分頁元件、決策頁區段目前多為 feature 內 `private`（且部分綁 Provider），尚未納入型錄。本 backlog 記錄「逐步提升並收錄」的方向。

## What Changes（方向，待細化）

- **選擇性提升** presentational、吃參數、可重用的元件並加 `@UseCase`：
  - 建角：戰鬥數值卡、能力卡、方式切換 segmented。
  - 角色卡：技能/豁免 cell、英雄卡（改為吃資料）。
- **決策頁 sections（綁 `currentCharacterProvider`）**：若要收錄，需拆「呈現層 / 資料層」或以 `ProviderScope` + mock override 包裝——屬架構級，CP 值評估後再決定，預設不做。

## Impact

- **能力**：擴充 component-catalog 覆蓋率。
- **程式碼**：將選定的 private 元件提升為公開（移至 `shared/` 或公開化）+ 新增 use-case。
- **原則**：因「有重用 / 獨立檢視價值」才公開，不為覆蓋率而公開；避免為了型錄把 provider 綁定的頁面區段全部攤平。
- **範圍界線**：本 backlog 僅記錄，尚未規劃 design/specs/tasks。相關：[[widgetbook]]。
