# Tasks: homebrew-provenance

> 先確認 design 的 Open Question（自訂起源專長於 Next.js 端的移植狀態），
> 結果會決定第 2 節是否多一個寫入點。

## 1. 資料模型

- [x] 1.1 `lib/domain/character.ts`：新增 `backgroundIsCustom: z.boolean().default(false)`
- [x] 1.2 同檔 `CharacterFeature` 新增 `isCustom: z.boolean().default(false)`
- [x] 1.3 註解記錄「不記來源 id」的理由（design D1）與「既有角色的自訂背景不回填」的理由（design D3），避免日後被改成猜測式回填

## 2. 寫入端

- [x] 2.1 `lib/creation/build.ts`：建角選用自訂背景時設定 `backgroundIsCustom`
- [x] 2.2 `components/level-up/level-up-view.tsx`：自訂子職特性改設 `isCustom: true`，`source` 移除 `・自訂` 後綴（design D2）
- [x] 2.3 背景編輯路徑：建角後不可改背景來源，無此路徑（已確認）
- [x] 2.4 自訂起源專長**已移植**（`CustomBackground.originFeatCustom`），寫入點在 `build.ts`，同樣改為旗標

## 3. 呈現

- [x] 3.1 「自訂」標籤元件（文字，非圖示；沿用既有 chip 樣式）
- [x] 3.2 `components/character/tabs/overview-tab.tsx`：背景欄的標示
- [x] 3.3 子職的標示——以 `customSubclass !== null` 判定，不另加旗標（design D1）
- [x] 3.4 特性列表：`isCustom` 條目的來源行標示
- [x] 3.5 確認角色清單卡片維持不加標示（design Open Question 的傾向）

## 4. 分享頁

- [x] 4.1 確認 `/v/[token]` 與 `/main/character` 共用同一組呈現元件
- [x] 4.2 以 curl 匿名抓 `/v/<token>` 的 SSR HTML：立繪卡的子職與背景、總覽 BACKGROUND 欄三處徽章皆渲染（無 cookie）。特性徽章位於「傳記」分頁，SSR 首屏不渲染，由單元測試涵蓋

## 5. 既有資料回填

- [x] 5.1 一次性 SQL：`source` 以 `・自訂` 結尾的特性條目設 `isCustom: true` 並移除後綴（以 `with ordinality` 重建陣列，保序）
- [x] 5.2 先 select 確認影響範圍：全庫僅 1 筆（kirkpaul1124 的「艾托 塔林」）；UPDATE 帶 `user_id` 與 `id` 雙條件
- [x] 5.3 影響 1 列；事後全庫掃描 `source like %自訂%` 已無殘留，其餘使用者資料未觸及

## 6. 驗證

- [x] 6.1 `npm run lint` 與 `tsc --noEmit` 通過
- [x] 6.2 測試：帶自訂子職的角色其特性條目 `isCustom` 為 true；SRD 子職為 false
- [x] 6.3 測試：`Character` schema 能解析無新欄位的既有文件（預設 false）
- [ ] 6.4 手動驗證：建一個用自訂背景與自訂子職的角色 → 角色卡頁有標示 → 分享連結亦有標示
- [ ] 6.5 更新 `openspec/specs` 主規格（archive 時同步）
