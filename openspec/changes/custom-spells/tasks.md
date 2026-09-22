> **⚠️ 事後盤點（2026-09-22）**：實作先於 artifacts，因此以下勾選是**對既有
> 程式碼的盤點**，不是實作紀錄。所有 `[x]` 都在程式碼裡指認過；`[ ]` 是真的
> 還沒做，`[~]` 是刻意不做。
>
> **目前狀態（2026-09-22）：程式碼完成、`tsc`／`eslint`／`vitest`（689 tests）
> 全綠、migration 已套用線上、anon 權限已實測、已部署。剩線上實測（7.3／7.4）
> 與 id 收斂（7.5）。**
> 順序不可顛倒：程式碼先上線而表還沒建，收藏紀錄頁會直接報錯（見 design
> Migration Plan）——這次是先推表再部署，方向正確。
>
> **實作偏離記錄**
>
> - **新建的 id 用 `crypto.randomUUID()`**，其他三個型別用 `generateShareToken()`。
>   安全性等價（122-bit vs 128-bit，都不可枚舉），但是不必要的第二種做法。
>   刻意不順手改，理由與收斂方式見 design D7 與任務 7.1。
> - **法術頁的顯示條件放寬到「可編輯即顯示」**（design D3）：戰士等無施法能力
>   的角色卡從此多一個大致為空的法術頁。這是為了解決「沒有法術就沒有入口、
>   沒有入口就選不到第一道法術」的雞生蛋問題，不是漏改條件。
> - **6.x 無元件測試與 Supabase 測試環境**：`vitest.config.mts` 只跑
>   `lib/**/*.test.ts`、node 環境。與自訂背景／種族／子職的 actions 同樣無測試，
>   以既有紀律歸線上實測（6.1）的範圍。

## 1. 資料庫（需 migration ＋ 新 RLS 政策）

- [x] 1.1 新增 migration `20260910043545_custom_spells.sql`：建立 `public.user_spells`，欄位與註解比照 `0009_user_species.sql`，主鍵為複合主鍵 `(user_id, id)`、自建表即含 `source_*` 三欄
- [x] 1.2 同 migration 建立索引 `(user_id)` 與部分索引 `(user_id, source_token) where source_token is not null`，並複用既有 `public.set_updated_at()` 建 `before update` trigger
- [x] 1.3 同 migration 設定 RLS：四條 own-row policy、`grant ... to authenticated`、`revoke all ... from anon`
- [x] 1.4 同 migration 補 `homebrew_shares_kind_check` 加入 `'spell'`
- [x] 1.5 同 migration 全文重貼 `get_shared_homebrew` 並加入法術分支（`create or replace` 不接受部分更新；約束同 0008：`search_path = ''`、無動態 SQL、回傳形狀固定）
- [x] 1.6 已以 `supabase db push` 套用（2026-09-22，linked 專案即正式環境）。首次套用時 `drop trigger/policy if exists` 各回一行 NOTICE，屬正常輸出
- [x] 1.7 anon key 實測（2026-09-22）：`user_spells` 的 select 與 insert 皆回 401 `42501 permission denied for table user_spells`——`revoke all from anon` 比 RLS 過濾更早擋下，連空陣列都不會回（同 custom-species 任務 1.4 的觀察）。另以假 token 呼叫 `get_shared_homebrew` 回 `not_found`／HTTP 200，確認函式全文重貼後 anon 的 execute 權限仍在

## 2. Domain 與 Repository（依賴 1）

- [x] 2.1 新增 `next/lib/spells/types.ts`：`CustomSpell` 以角色卡的 `Spell` `extend`（design D1），補 `id`／`nameEn`／`school`／`duration`／`components`／`ritual` 與長度界限
- [x] 2.2 `spellFromCustom()`：快照轉換，把學派／儀式／持續／成分併進 `description` 首行，並帶上 `homebrewId`
- [x] 2.3 `addCustomSpell()`：依環數分流（0 環進 `cantrips`、1–9 進 `spells`）、以 `homebrewId` 去重、**再次選用不覆寫角色版本**（design D2）、不改動 `spellSlots`
- [x] 2.4 `removeCustomSpell()`：以 `homebrewId` 移除，並在該法術正是專注對象時清除 `concentrationSpell`
- [x] 2.5 新增 `next/lib/spells/actions.ts`：server actions `fetchCustomSpells`（過濾 tombstone、依 `created_at` 升冪、解析失敗者略過而非整批失敗）、`upsertCustomSpell`（`onConflict: 'user_id,id'`，送出提升欄位 `name` 與完整 `data`）、`deleteCustomSpell`（軟刪，帶 `user_id` 條件）
- [x] 2.6 `next/lib/domain/character.ts`：`Spell` 新增 `homebrewId: z.string().optional()`
- [x] 2.7 `next/lib/homebrew/types.ts`：`HOMEBREW_KINDS` 加入 `'spell'`、`HOMEBREW_KIND` 註冊表加一筆、`HomebrewContent` 與 `parseHomebrew` 的分支——分享／檢視／收藏三條路徑因此自動支援

## 3. 規則隔離（依賴 2.6）

- [x] 3.1 `next/lib/rules/ac.ts`：`knowsMageArmor` 加上 `!s.homebrewId`，同名自創法術不觸發官方法師護甲的 AC 公式（design D5）
- [x] 3.2 全 codebase 盤查其他以法術名比對驅動規則的地方——目前僅 `knowsMageArmor` 一處
- [~] 3.3 **不做**：以 lint 規則擋「比對法術名時忘記排除自創」。只有一處，加規則的成本高於收益。這個判斷會隨處數增加而反轉，見 design Risks

## 4. 介面（依賴 2）

- [x] 4.1 新增 `next/components/spells/spell-manager.tsx`：收藏紀錄的管理區塊，含新增／編輯／刪除與刪除確認
- [x] 4.2 編輯表單：名稱與效果說明必填、環數選單（戲法至 9 環）、行動分類選單、專注與儀式勾選、其餘顯示欄位；儲存鍵以 `CustomSpell.safeParse` 把關
- [x] 4.3 明示「採用前請與 DM 確認」、「儲存不會更新已選用此法術的角色」、刪除確認載明影響範圍
- [x] 4.4 新增 `next/components/spells/spell-picker.tsx`：角色法術頁的選用對話框，含已選用清單與移除
- [x] 4.5 選用對話框明示「不會增加法術位」、「請與 DM 確認環數與使用資格」、「重新選用會取得收藏中的最新版本」，並指路 `/library`
- [x] 4.6 `next/components/character/spell-card.tsx`：自創法術的副標標示與施法時間／專注資訊行
- [x] 4.7 `next/components/homebrew/homebrew-view.tsx`：分享檢視頁的法術內容區塊（沿用角色卡的 `SpellCard`）
- [x] 4.8 `next/app/library/page.tsx` 新增法術區塊——不新增路由，收藏紀錄頁就是管理入口
- [x] 4.9 觸控目標 ≥ 44px（`min-h-11`）、色彩一律取 `globals.css` 的 token

## 5. 角色卡整合（依賴 4）

- [x] 5.1 `character-sheet.tsx`：新增 `spellTools` 插槽，往下傳給 `SpellsTab`
- [x] 5.2 `character-sheet-live.tsx`：`persist` 時傳入 `SpellPicker`——**唯讀檢視不傳**，分享出去的角色卡不會多出編輯入口
- [x] 5.3 `rest-tabs.tsx`：`SpellsTab` 接受 `tools` 並渲染於施法區段
- [x] 5.4 法術頁顯示條件放寬為 `spellSlots.length > 0 || cantrips.length > 0 || spells.length > 0 || !!spellTools`（design D3）
- [~] 5.5 **不做**：建角流程整合。消費點不同、且自創法術不佔職業額度會讓「已選 2/3」說不清，見 design D4

## 6. 測試

- [x] 6.1 `CustomSpell` 驗證測試：環數越界與非整數、必填欄位空白、說明過長 → 皆判定不合法
- [x] 6.2 快照測試：`spellFromCustom` 保留 `castKind`／`concentration`／`upgrade`／原始說明文字，且併入持續時間與成分；`Spell.parse(快照)` 恆等（design D1 的保證）
- [x] 6.3 分流測試：戲法與環級法術各進對應陣列，且 `spellSlots` 不變
- [x] 6.4 去重測試：以 id 去重、同名不同 id 可並存、再次選用不覆寫角色版本
- [x] 6.5 移除測試：清除專注、不改動收藏與其他法術
- [x] 6.6 規則隔離測試：同名自創法術不啟用 `knowsMageArmor`
- [x] 6.7 收藏測試：`collectRow` 換新 id 後文件內的 id 一併換新、來源標記帶上、仍可解析
- [~] 6.8 **未實作**（無 Supabase 測試環境，見檔頭）：server actions 測試——未登入的行為、查詢過濾 tombstone、upsert 送出提升欄位、softDelete 為 update `deleted_at`
- [~] 6.9 **未實作**（無元件測試環境，見檔頭）：法術頁顯示條件測試——戰士（可編輯）有法術頁、同一角色唯讀檢視無法術頁

## 7. 收尾

- [x] 7.1 `npx tsc --noEmit`、`npx eslint .`、`npx vitest run`（689 tests）全綠（2026-09-22）
- [x] 7.2 已部署（2026-09-22）：`supabase db push` → `npx opennextjs-cloudflare build` → `npx wrangler deploy`。線上 chunk 的 md5 與本機一致，build id 為 `8b120fb`
  - ⚠️ 踩到一次：先跑 `npm run build`（＝只有 `next build`）就 deploy，把 9/3 的舊 bundle 重新上線且 wrangler 回 Success 不報錯。`.open-next/` 要靠 `opennextjs-cloudflare build` 產生。CLAUDE.md 的部署段原本就漏了這步，已一併修正
  - 附帶發現：線上最後一次部署是 **9/3**，所以 **`custom-species`（9/4 的 commit）在此之前從未上線**——本次部署一併帶上了自訂種族
- [ ] 7.3 線上實測走完整流程：建立自創法術（含專注與升環）→ 於角色法術頁選用 → 確認法術位不變且標示為自創 → 編輯收藏 → 確認角色版本不變 → 自角色移除 → 確認收藏仍在 → 刪除收藏 → 確認既有角色仍正常 → 分享該法術 → 另一帳號檢視並收藏 → 確認副本 id 已換
- [ ] 7.4 線上實測：以戰士（無法術位、無戲法）確認法術頁出現且可選用；分享該戰士角色卡，確認唯讀檢視無法術頁
- [x] 7.5 **收斂 id 產生方式**（design D7）：`spell-manager.tsx` 改用 `randomId()`（`lib/creation/id.ts`）
  - 原任務寫「改為 `generateShareToken()`」是**錯的**：盤查後 id 產生方式其實有三套，而正解是 `randomId()`——它的 doc comment 就是為使用者自有資料而寫，且**收藏來的法術副本走的就是它**（`collect-actions.ts:50`）。`generateShareToken()` 是分享 token 的產生器，拿來產資料 id 語意錯位
  - 順帶記錄：**種族仍用 `generateShareToken()` 產 id**，是另一筆既有偏離，屬 `custom-species` 的範圍，本 change 不動
- [x] 7.7 7.5 之後重新部署（2026-09-22）：線上 `BUILD_ID` 為 `25a94e4`，`spell-manager` 所在 chunk 的 md5 與本機一致且不含 `randomUUID`
  - 順帶確認：`wrangler deploy` 會偵測到 OpenNext 專案並轉呼叫 `opennextjs-cloudflare deploy`，同時把 `.dev.vars` 的值當 secrets 帶上去。但它**只做 deploy 不做 build**——這正是 `npm run build` 那個坑會靜默成立的原因
- [ ] 7.6 更新 `openspec/specs` 主規格（archive 時同步）
