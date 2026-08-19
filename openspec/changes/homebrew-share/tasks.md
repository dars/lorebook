# Tasks: homebrew-share

> 首版型別範圍為**自訂背景與自訂子職**（design D9）。
> 第 7 節（規則版本）全數相依凍結中的 `dual-rules-version`，本 change 不做。
> 第 9 節（直接套用到角色）為 Open Question，得視情況延後。

## 1. 資料庫：主鍵對齊與來源欄位

- [ ] 1.1 `supabase/migrations/0007_homebrew_pk_and_source.sql`：`user_backgrounds` 與 `user_subclasses` 的主鍵由 `(id)` 改為 `(user_id, id)`；註解記錄理由（既有資料含 Flutter 時間戳 id，比照 `0002`）
- [ ] 1.2 同一 migration 新增 `source_token text`、`source_updated_at timestamptz`、`source_note text`（皆 nullable，不回填）
- [ ] 1.3 套用至 linked 專案，確認 8 筆既有背景的 id 值未變、RLS 與 grant 未受影響
- [ ] 1.4 更正 `0006_user_subclasses.sql` 開頭關於「`shared_homebrew` 是快照表」的註解（design D4）
- [ ] 1.5 更正 `custom-subclass` design D3 的同一段論述

## 2. 資料庫：分享指標表與 RPC

- [ ] 2.1 `supabase/migrations/0008_homebrew_shares.sql`：`homebrew_shares` 表（token / owner_id / kind / homebrew_id / label / created_at / revoked_at）
- [ ] 2.2 RLS：`revoke all` from `anon` 與 `authenticated`；`insert` 與撤銷用 `update` 限 `owner_id = auth.uid()`
- [ ] 2.3 `public.get_shared_homebrew(p_token text)`（`SECURITY DEFINER`）：依 `kind` 分派至來源表，回傳 `(status, kind, data, source_updated_at)`；狀態機 `not_found` / `revoked` / `deleted` / `ok`。**不含 `rules_version`**（design D4）
- [ ] 2.4 migration 註解明文其偏離 own-row 慣例的理由與約束（比照 `0005`）
- [ ] 2.5 驗證：以 anon 直接查表遭拒；以 anon 呼叫 RPC 可取得內容；RPC 不回傳 `owner_id`

## 3. 型別註冊表與資料層

- [ ] 3.1 `lib/homebrew/types.ts`：`HomebrewKind` 與註冊表（來源表名、Zod schema、內容區塊元件、收藏寫入函式）
- [ ] 3.2 `lib/homebrew/share-actions.ts`：發布（產 token、建立指標）、撤銷、查詢自己某內容的分享狀態
- [ ] 3.3 `lib/homebrew/fetch.ts`：依 token 呼叫 RPC，回傳判別聯集型別（依 status 分支）
- [ ] 3.4 `lib/homebrew/collect-actions.ts`：收藏——驗證（與手動建立同一 schema）→ 產新 id → 寫入收藏者的來源表，含 `source_token` / `source_updated_at` / `source_note`
- [ ] 3.5 `lib/backgrounds/actions.ts`、`lib/subclasses/actions.ts`：讀寫新欄位；確認 upsert 僅於實際儲存時發生（design D6 的風險）

## 4. 統一檢視頁

- [ ] 4.1 `app/h/[token]/page.tsx`：SSR 取內容，未登入可讀
- [ ] 4.2 `components/homebrew/homebrew-view.tsx`：骨架（型別標示、名稱、最後更新時間、行動區、顯示文字免責說明）
- [ ] 4.3 四種狀態的呈現：不存在／已撤銷／來源已刪除／正常
- [ ] 4.4 `components/homebrew/background-body.tsx`：技能／工具／裝備／起源專長
- [ ] 4.5 `components/homebrew/subclass-body.tsx`：母職業與各等級特性
- [ ] 4.6 外來文字一律純文字呈現，不進 5etools 標記渲染路徑（含測試）

## 5. 收藏流程

- [ ] 5.1 「收進我的資料庫」按鈕：未登入導向登入並於登入後保留 token 返回
- [ ] 5.2 收藏成功後的回饋與「前往我的資料庫」入口
- [ ] 5.3 驗證失敗的錯誤呈現（具體原因，不寫入任何資料）
- [ ] 5.4 收藏確認時的備註輸入（選填，一行；design D7）
- [ ] 5.5 已收藏過同一 token 時的提示（Open Question：傾向允許但提示）
- [ ] 5.6 測試：兩個不同使用者收藏同一 token 皆成功且各得不同 id

## 6. 我的資料庫（`/library`）

> **已完成（2026-08-20）。** 兩處與本節原文不同：UI 名稱定為**「收藏紀錄」**
> 而非「我的資料庫」（「資料庫」在這個 App 裡已被 SRD 內容庫佔用），路由
> `/library` 不變；型別區塊不另建 `components/homebrew/library.tsx`，改為讓
> 既有的 `BackgroundManager` / `SubclassManager` 多一個 `embedded` 模式，
> 由 page 直接排列——包一層只為了轉呼叫同兩個元件沒有意義。

- [x] 6.1 `app/library/page.tsx`：SSR 取回所有型別的自訂內容
- [x] 6.2 ~~`components/homebrew/library.tsx`~~ → 兩個 manager 的 `embedded` 模式
- [x] 6.3 `app/custom-backgrounds/page.tsx`、`app/custom-subclasses/page.tsx` 改為導向 `/library`
- [x] 6.4 `app/main/system/page.tsx`：兩條自訂連結收斂為「收藏紀錄」
- [x] 6.5 空狀態：尚無任何自創內容時說明可自建或收藏他人分享

## 7. 分享入口、來源標示、更新副本

- [ ] 7.1 各型別區塊的分享入口（產生連結、QR、複製）
- [ ] 7.2 分享狀態顯示與撤銷入口
- [ ] 7.3 清單項的備註行（即來源標記，無另外的徽章）；留空時顯示空狀態文字；可就地編輯；不限制編輯／刪除／再分享
- [ ] 7.4 偵測來源已更新（來源 `updated_at` > 本地 `source_updated_at`）並提示
- [ ] 7.5 「更新副本」＝刪除＋重收，**保留 `source_note`**；本地已編輯（`updated_at` > `created_at`）時先警告
- [ ] 7.6 QR 產生複用 `character-share` 的本機繪製元件，確認無外部請求

## 8. 規則版本（**全節相依 `dual-rules-version`，本 change 不做**）

> Next.js 端目前無任何 `rulesVersion` 欄位。首版**不顯示**規則版本——顯示恆為
> 「5r」的推定值在今日正確，但 5e 上線後所有既有分享都會標錯且無從分辨。

- [ ] 8.1 RPC 回傳值加入 `rules_version`
- [ ] 8.2 檢視頁顯示規則版本
- [ ] 8.3 收藏時的版本不符阻擋

## 9. 直接套用到角色（Open Question，可延後）

- [ ] 9.1 檢視頁取得角色上下文
- [ ] 9.2 各型別的規則判定（子職：3 級且母職業相符）
- [ ] 9.3 規則不允許時不渲染該行動（非停用狀態）

## 10. 驗證與收尾

- [ ] 10.1 `npm run lint` 與 `tsc --noEmit` 通過
- [ ] 10.2 端到端手動驗證：A 發布 → B 未登入檢視 → B 登入收藏 → A 修改 → B 看到提示並更新副本 → A 撤銷 → B 的副本不受影響
- [ ] 10.3 確認無任何列舉路徑（App 內與 RPC 皆然）
- [ ] 10.4 更新 `openspec/specs` 主規格（archive 時同步）
