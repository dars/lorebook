## 1. 資料庫（需 migration ＋ 新 RLS 政策 ＋ definer 函式）

- [x] 1.1 新增 migration `0005_character_shares.sql`：建立 `public.character_shares` 表（`token text primary key`、`owner_id uuid not null references auth.users(id) on delete cascade`、`character_id text not null`、`label text`、`created_at timestamptz not null default now()`、`revoked_at timestamptz`），註解中明文其為「授權表 ＋ definer 函式」存取模型，並註明首版刻意不設有效期限（見 design D3a）
- [x] 1.2 同 migration 建立索引：`(owner_id)` 與 `(owner_id, character_id)`（供擁有者查自己的分享清單）
- [x] 1.3 同 migration 設定 RLS：`enable row level security`，四條 own-row policy（select / insert / update / delete 皆 `(select auth.uid()) = owner_id`），`grant ... to authenticated`、`revoke all ... from anon`（授權表對外完全不可讀）
- [x] 1.4 同 migration 建立 `SECURITY DEFINER` 函式 `public.get_shared_character(p_token text)`：`set search_path = ''`、無動態 SQL、唯一參數為 token；join `public.character_shares` 與 `public.user_characters`（以 `owner_id = user_id and character_id = id`），驗證 `revoked_at is null`、`deleted_at is null`；回傳固定形狀（角色 `data` ＋ 可區分的失效狀態碼），SHALL NOT 回傳 `owner_id` / `label`
- [x] 1.5 同 migration `grant execute` 該函式給 `anon` 與 `authenticated`；確認 `public.user_characters` 的 grant 與 policy 完全未被更動
- [x] 1.6 以 Supabase CLI 對 dev 專案套用 migration（已套用；推送前需先 repair 遷移歷史，本地 0001–0004 與遠端舊時間戳名稱不符）。**已驗**：`not_found` 路徑、anon 直接查 `user_characters` 與 `character_shares` 皆 42501。**未驗**：撤銷與來源角色軟刪除兩條路徑需登入才能備妥測試資料，函式邏輯由單元測試涵蓋（見 7.3）

## 2. Domain 與 Repository（依賴 1）

- [x] 2.1 新增 `lib/features/character/domain/character_share.dart`：freezed model `CharacterShare`（token、characterId、label、createdAt、revokedAt）＋ 衍生 getter `isActive`
- [x] 2.2 新增 `lib/features/character/domain/shared_character_result.dart`：freezed sealed 結果型別，涵蓋成功（含 `Character` 與抓取時間）與三種失效態（已撤銷 / 角色已刪除 / 不存在）
- [x] 2.3 新增 `lib/shared/util/random_token.dart`：以 `Random.secure()` 產生 128-bit 隨機值並以 base64url 編碼（22 字元、去除 padding）
- [x] 2.4 新增 `lib/features/character/data/character_share_repository.dart` 的 `createShare(characterId, {label})`：產生 token 並 insert（未登入時擲 `DataException`）
- [x] 2.5 同 repository 的 `listShares(characterId)`：回傳該角色未撤銷的分享（走 own-row RLS）
- [x] 2.6 同 repository 的 `revokeShare(token)`：更新 `revoked_at`
- [x] 2.7 同 repository 的 `fetchSharedCharacter(token)`：呼叫 `get_shared_character` RPC，成功時對回傳的 `data` 套用與 `CharacterSyncRepository.fetchAll()` 相同的回填鏈（`migrateLegacyWeapons` → `backfillClassResources`），並映射失效狀態碼為 2.2 的結果型別；例外統一封裝為 `DataException`
- [x] 2.8 新增 repository 的 Riverpod provider，並新增 `sharedCharacterProvider(token)`（family，AsyncNotifier 或 FutureProvider，支援手動 refresh）

## 3. 唯讀模式改造（依賴 2.2；可與 4 並行）

- [x] 3.0 行動頁六個 section（status / resources / movement / actions / checks / rest）加入可注入的 `character` 參數；唯讀時不取 `currentCharacterProvider.notifier`，HP 加減、臨時 HP、狀態增刪、專注切換、法術位與資源增減一律不渲染，休息整段不呈現

- [x] 3.1 盤點五個 tab（`overview_tab.dart`、`abilities_tab.dart`、`spells_tab.dart`、`inventory_tab.dart`、`biography_tab.dart`）內部仍直接讀寫 `currentCharacterProvider` 的位置（如總覽頁立繪上傳／移除），確認唯讀模式下不會被觸發；tab 已接受 `character` 參數，注入路徑不需改造
- [x] 3.2 新增統一的唯讀模式旗標（單一參數／InheritedWidget，不由各 tab 各自判斷），並讓五個 tab 在唯讀時**不渲染**編輯、擲骰、HP 調整、法術位與職業資源消耗等入口
- [x] 3.3 檢查既有 widget（`editor_sheet.dart`、`item_editor_sheet.dart`、`ability_shield.dart`、`spell_entry.dart` 等）在唯讀模式下不再被掛載，且無殘留的可點擊區域
- [x] 3.4 確認唯讀模式在 compact / medium / expanded 三級距下沿用既有排列（含 expanded 的總覽常駐左欄）

## 4. 分享管理 UI（依賴 2.4–2.6）

- [x] 4.1 加入 `qr_flutter` 套件（純本機繪製、無網路）至 `pubspec.yaml`
- [x] 4.2 新增 `lib/features/character/presentation/widgets/share_sheet.dart`：分享建立流程（備註輸入、明示「持有連結者皆可檢視，包含之後的所有變動，直到你手動撤銷」的說明文案）
- [x] 4.3 同 sheet 的分享結果呈現：QR code、連結文字、複製按鈕、系統分享
- [x] 4.4 新增分享清單區塊：列出該角色未撤銷的分享（備註、建立時間）與逐筆撤銷（撤銷為破壞性操作，需二次確認）；清單不標示「有效」狀態——列於此即為有效，撤銷後該筆自清單移除
- [x] 4.5 於 `overview_tab.dart` 底部新增「SHARE 分享」`CollapsibleSection`（預設收合，排在 `STATS 戰鬥數值` 之後），內含建立分享按鈕與 4.4 的分享清單；訪客試玩／未登入時區段說明需登入才能分享
- [x] 4.6 該區段標頭顯示目前有效分享數（如「分享 · 2 條有效」）；無有效分享時不顯示數量
- [x] 4.7 確認唯讀檢視模式下此區段不渲染，且角色頁首（`character_header.dart`）未加入任何分享操作
- [x] 4.8 所有互動元件觸控目標 ≥ 48dp，樣式沿用金色／暗黑主題與 Material 3

## 5. 檢視頁與路由（依賴 2.7、2.8、3）

- [x] 5.1 新增 `lib/features/character/presentation/shared_character_view_page.dart`：以 `sharedCharacterProvider(token)` 驅動，成功時以唯讀模式渲染五個 tab
- [x] 5.2 檢視頁顯示資料抓取時間，並提供下拉重新整理（重新呼叫 RPC）
- [x] 5.3 檢視頁的三種失效態畫面（已撤銷 / 角色已刪除 / 找不到），文案以角色主人為中心說明，不含任何身分資訊
- [x] 5.4 檢視頁的無網路／載入失敗態：明確說明並提供重試，不顯示任何部分資料
- [x] 5.5 `lib/app/router.dart` 新增 `/v/:token` 路由（與 homebrew 的 `/s/` 錯開），指向 5.1
- [x] 5.6 `lib/app/router.dart` 的 auth redirect guard 加入 `/v/:token` 豁免——未登入與已登入者皆停留於該路由
- [x] 5.7 確認檢視他人角色卡不會寫入或改變檢視者的 `currentCharacter` 與角色清單

## 6. Deep link 設定（依賴 5.5）

- [x] 6.1 web 部署新增／更新 `apple-app-site-association` 與 `assetlinks.json`，路徑比對同時涵蓋 `/v/` 與（既有規劃的）`/s/`
- [ ] 6.2 iOS：Associated Domains 設定與 universal link 實測（已裝 App 開連結進 App、未裝落 web）——**未完成，另起 change 追蹤**。`Runner.entitlements` 與三個 build config 的 `CODE_SIGN_ENTITLEMENTS` 已就位，尚缺 Apple Developer 後台為 App ID 開通 Associated Domains，且需實機驗證
- [ ] 6.3 Android：app link intent-filter 與 domain 驗證實測——**未完成，另起 change 追蹤**。intent-filter 已加入 `AndroidManifest.xml`，但 `web/.well-known/assetlinks.json` 目前放的是 **debug keystore 指紋**（專案尚無 release 簽章設定），正式發版前必須換成 release 憑證的 SHA-256

## 7. 測試

- [x] 7.1 `random_token` 單元測試：長度、字元集、重複性（大量產生無碰撞）
- [x] 7.2 `fetchSharedCharacter` 的回填測試：以含舊版靜態 weapons 且缺職業資源的角色 JSON 為輸入，斷言結果與 `CharacterSyncRepository.fetchAll()` 的回填結果一致
- [x] 7.3 失效態映射測試：三種失效狀態碼各自映射到正確的結果型別
- [x] 7.4 唯讀模式 widget 測試：五個 tab 在唯讀模式下不存在編輯／擲骰／消耗入口
- [x] 7.5 檢視頁 widget 測試：成功、三種失效、載入失敗共五種狀態的畫面
- [x] 7.6 router 測試：未登入存取 `/v/:token` 不被導向 `/auth/login`；已登入亦不被導向角色選擇

## 8. 收尾

- [x] 8.1 `flutter analyze` 與 `dart format .` 全數通過
- [x] 8.2 `flutter test` 全綠
- [x] 8.3 於 web（localhost:8087）走過流程：登入 → 建立分享 → 無痕視窗免登入開連結檢視，確認可用。「扣血→重新整理」與「撤銷→顯示已停止分享」兩步未逐一回報，行為由 widget 測試涵蓋（見 7.5）

## 9. 後續（不在本 change 範圍）

- deep link 的網域驗證（6.2 / 6.3）需 Apple Developer 後台開通與 Android release 簽章就位後才能完成，另起 change 追蹤。在此之前分享連結一律落 web 版，功能本身不受影響。
