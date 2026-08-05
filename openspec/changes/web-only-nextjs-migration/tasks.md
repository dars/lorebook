## 1. 了結原生與凍結 Flutter

- [x] 1.1 處置 `ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 目前未進版控的變動，不留懸置
- [x] 1.2 打版控標籤 `native-final`，作為日後取回原生支援的起點
- [x] 1.3 `git rm -r ios/ android/`
- [x] 1.4 移除 `web/.well-known/apple-app-site-association`、`assetlinks.json` 與 `web/_headers` 中對應的 Content-Type 規則
- [x] 1.5 移除 `share_link.dart` 等處與 deep link／universal link 相關的敘述與設定
- [x] 1.6 更新 CLAUDE.md：平台敘述、常用指令中的原生建置段落
- [x] 1.7 於 `custom-species`、`homebrew-share`、`dual-rules-version`、`offline-character-cache` 各自標注「Flutter 端凍結，待 Next.js 重寫完成後接續」
- [x] 1.8 `flutter analyze` 與 `flutter test` 全綠

## 2. Golden 對照匯出

- [x] 2.1 匯出全部 21 筆存活角色的 JSON 快照，作為新型別定義的解析素材（切換前不清除資料）
- [x] 2.2 記錄「0 筆含舊版 weapons 清單」的查詢與結果，作為不移植回填鏈的依據
- [x] 2.3 確認 `tool/seed_demo_characters.dart` 的 demo 規格可於新實作重現（切換後重灌用）
- [x] 2.4 匯出 `derived_stats` 的 golden 對照（各 AC 分支：無甲／無甲防禦／法師護甲／護甲公式＋盾牌）
- [x] 2.5 匯出 `currency_math` 的 golden 對照（分層扣款的邊界：剛好、需借位、不足）
- [x] 2.6 匯出 `level_up` 與 `class_resources` 的 golden 對照（各職業 1–20 級的資源與法術位）
- [x] 2.7 明確記錄 golden 未覆蓋的部分，不假裝全蓋到

## 3. Next.js 基礎

- [x] 3.1 決定 Cloudflare 部署方案——next-on-pages 已棄用，採 OpenNext；目標由 Pages 改為 Workers（design D10）
- [x] 3.2 建立 Next.js 專案骨架（`next/`，因 `web/` 已被 Flutter 佔用）與 OpenNext 設定
- [ ] 3.3 自 Flutter theme 抽出設計 token（色票、字級、間距、圓角），確保色票不漂移
- [ ] 3.4 字型策略：woff2 ＋ unicode-range 分片；使用者自產內容需 fallback，不得出現豆腐字
- [ ] 3.5 Supabase JS client 接線（anon key；**service role key 不得進入前端可達路徑**）
- [ ] 3.6 Google／Apple OAuth 登入與 session 管理
- [ ] 3.7 舊 service worker 註銷程式碼（`getRegistrations()` → `unregister()`），標注為切換期暫時性程式碼
- [ ] 3.8 狀態管理選型定案（見 design Open Questions）

## 4. 規則邏輯移植（頁面的前置）

- [ ] 4.1 型別定義：`Character` 及其巢狀模型（55 個頂層欄位），與現行 JSON 形狀對齊
- [ ] 4.2 以真實的 21 筆資料驗證型別解析，全數通過才算完成
- [ ] 4.3 移植能力值與熟練推導（`character_math`）
- [ ] 4.4 移植 AC 推導（`derived_stats`），逐項對上 2.4 的 golden
- [ ] 4.5 移植貨幣分層扣款（`currency_math`），逐項對上 2.5 的 golden
- [ ] 4.6 移植職業資源推導（`class_resources`），逐項對上 2.6 的 golden
- [ ] 4.7 移植升級邏輯（`level_up`），逐項對上 2.6 的 golden
- [ ] 4.8 移植武器攻擊列推導（由裝備推導，非靜態清單）

## 5. 角色卡呈現與分享頁

- [ ] 5.1 版型框架：三段式寬度級距（compact / medium / expanded）與導覽
- [ ] 5.2 角色卡唯讀呈現元件（屬性、法術、物品、傳記四個分頁）
- [ ] 5.3 分享頁 `/v/:token`，以 anon key 呼叫既有的 `get_shared_character` RPC
- [ ] 5.4 分享頁 SSR ＋ Open Graph 中介資料，且維持不被搜尋引擎索引
- [ ] 5.5 失效分享的呈現、資料抓取時間與手動重新整理
- [ ] 5.6 量測分享頁首次載入的傳輸量與可見內容時間，與 Flutter 版基準比對

## 6. 建角、編輯與戰鬥

- [ ] 6.1 建角流程（種族／職業／背景／能力值三種配點法／技能與法術選擇）
- [ ] 6.2 角色卡編輯（HP、臨時 HP、狀態、法術位、資源）
- [ ] 6.3 裝備與購買（含分層扣款接線）
- [ ] 6.4 熟練編輯（語言與工具）
- [ ] 6.5 升級流程
- [ ] 6.6 分享建立與撤銷
- [ ] 6.7 內容庫瀏覽（法術 339、物品 210；分頁策略見 design Open Questions）
- [ ] 6.8 冒險日誌
- [ ] 6.9 自訂背景

## 7. 切換上線

- [ ] 7.1 以全部 21 筆真實資料驗證解析與呈現，不只測樣本
- [ ] 7.2 清除既有測試資料（**帶 user_id 並先 select 確認影響範圍**），以產生器重灌 demo 角色
- [ ] 7.3 端到端驗證：登入 → 建角 → 編輯 → 分享 → 撤銷
- [ ] 7.4 切換部署目標至 Next.js，確認舊 SW 註銷生效
- [ ] 7.5 通知使用者需重新登入，並於登入頁說明
- [ ] 7.6 量測並記錄切換後的首次載入，與 proposal 的 7.8 MB／8–10 秒基準比對

## 8. 收尾

- [ ] 8.1 觀察期無舊畫面回報後，移除 SW 註銷程式碼
- [ ] 8.2 以獨立 commit 刪除 `lib/`、`test/` 與 Flutter 設定
- [ ] 8.3 更新 CLAUDE.md 為 Next.js 專案的指令與架構
- [ ] 8.4 解凍擱置的 change，各自以 Next.js 為前提更新 design
