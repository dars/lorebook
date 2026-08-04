# Tasks: homebrew-share

> 首版範圍為自訂背景；`shared_homebrew` 以 `kind` 欄位預留其他 homebrew 型別。
> 第 5 節（規則版本檢查）相依 `dual-rules-version` 階段二的 `CustomBackground.rulesVersion`，
> 其餘各節可先行。

## 0. 前置決定

- [ ] 0.1 定案分享連結路徑前綴（design Open Question 1）：確認與既有 go_router 路由不衝突，且能寫進 universal link / app link 的路徑比對
- [ ] 0.2 定案撤銷後的呈現文案（design Open Question 2）：「已撤銷」或通用「找不到內容」
- [ ] 0.3 定案首版是否納入「我發布過的分享」管理清單（design Open Question 4）；傾向僅於自訂背景項目上顯示分享狀態與撤銷入口

## 1. 資料層

- [ ] 1.1 新增 migration `00xx_shared_homebrew.sql`：建表（`token` text pk、`kind`、`rules_version`、`data jsonb`、`owner_id` → `auth.users`、`created_at`、`revoked_at`），註解說明其 token 存取模型與偏離 own-row 慣例的理由
- [ ] 1.2 RLS 政策：`select` to `anon, authenticated` 條件 `revoked_at is null`；`insert` / `update` 限 `owner_id = auth.uid()`；grant 僅開放必要動作，不建立任何無 token 的查詢路徑
- [ ] 1.3 以 SQL 驗證 data-layer spec 的四個場景：有效 token 可讀、無 token 查詢為空、已撤銷不可讀、非擁有者不可發布或撤銷
- [ ] 1.4 新增 `lib/features/character/data/homebrew_share_repository.dart`：`publish()`、`revoke()`、`fetchByToken()`，例外封裝為 `DataException`（比照既有 repository 慣例），以 Riverpod provider 注入

## 2. token 與 id

- [ ] 2.1 新增 token 產生工具：128-bit 密碼學安全隨機（`Random.secure()`）→ base64url，22 字元
- [ ] 2.2 `custom_background_edit_page.dart:75` 的 id 產生由 `DateTime.now().microsecondsSinceEpoch` 改為隨機值；既有時間戳 id 資料列不遷移
- [ ] 2.3 測試：token 與 id 的隨機性與長度、既有時間戳 id 的資料列仍可正常讀寫

## 3. 發布與撤銷 UI

- [ ] 3.1 自訂背景項目新增分享入口（僅自己擁有者顯示）
- [ ] 3.2 分享頁：顯示連結（可複製）、QR code、發布時間、「持有連結者皆可檢視」明示、撤銷入口
- [ ] 3.3 QR code 產生（本機繪製，新增 `qr_flutter` 相依；確認無網路呼叫）
- [ ] 3.4 撤銷流程：確認後寫 `revoked_at`，UI 更新分享狀態；驗證原始自訂背景完全不受影響
- [ ] 3.5 「重新發布」：產生新 token 的快照（舊 token 維持原狀或由使用者另行撤銷）

## 4. 匯入流程

- [ ] 4.1 `lib/app/router.dart` 新增匯入路由（token 為路徑參數），可由 deep link 進入
- [ ] 4.2 universal link（`apple-app-site-association`）與 app link（`assetlinks.json`）設定與網域驗證檔部署；未裝 App 時落到 web 版同一頁
- [ ] 4.3 匯入預覽頁：顯示名稱、規則版本、技能與其他機制欄位；未登入亦可檢視
- [ ] 4.4 匯入驗證：欄位白名單、長度上限、技能／專長值合法性，比照手動建立的驗證規則；失敗顯示具體原因且不寫入
- [ ] 4.5 外來文字一律純文字呈現，確認不進入 5etools 標記渲染路徑
- [ ] 4.6 匯入寫入：新隨機 id、自己的 `user_id`，寫入 `user_backgrounds`；同名同版本時顯示重複提示但不阻擋
- [ ] 4.7 未登入匯入：導向登入，登入後回到同一 token 的匯入預覽（token 於流程中保留）
- [ ] 4.8 撤銷後開啟連結的呈現（依 0.2 定案）

## 5. 規則版本（相依 dual-rules-version 階段二）

- [ ] 5.1 發布時將 `CustomBackground.rulesVersion` 寫入快照的 `rules_version`
- [ ] 5.2 匯入預覽顯示規則版本；版本與匯入情境不符時阻擋並說明，不做任何自動轉換
- [ ] 5.3 測試：跨版本匯入被阻擋且未寫入任何資料

## 6. 測試與驗收

- [ ] 6.1 repository 測試：發布 / 依 token 取回 / 撤銷後取回為空 / 非擁有者不可撤銷
- [ ] 6.2 匯入流程測試：複製語意（新 id、新擁有者）、匯入後與來源脫鉤、驗證失敗不寫入、同名提示
- [ ] 6.3 安全性測試：無 token 查詢無結果、快照內容不觸發標記渲染、超長欄位被拒
- [ ] 6.4 實機驗證：兩個帳號實測「A 發布 → B 掃碼 → B 匯入 → A 撤銷 → B 那份仍可用」；手機與平板版型各一次
- [ ] 6.5 `flutter test` 全綠、`flutter analyze` 無告警

## 7. 收尾

- [ ] 7.1 更新 CLAUDE.md 或 README 的內容政策段落：載明點對點分享的邊界與「不提供公開索引」
- [ ] 7.2 確認 design Open Questions 皆已結案；未結案者轉為新 change 或記錄為 Non-Goal
