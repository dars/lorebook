# Tasks: custom-backgrounds

## 1. 資料層(App Supabase 專案;純新增,無破壞性)

- [x] 1.1 migration `supabase/migrations/0004_user_backgrounds.sql`:建 `user_backgrounds` 表(id text pk、user_id、name 提升欄位、data jsonb、created_at/updated_at/deleted_at),複用 `set_updated_at` trigger,RLS 與 grants 比照 `user_characters`;`supabase db push`(執行前向使用者確認)

## 2. Domain 與資料存取(lib/features/character)

- [x] 2.1 `CustomBackground` domain model(freezed:id/name/abilities/skills/originFeat/description,`toJson`/`fromJson`),含 `toBackgroundOption()` adapter 與 `kOriginFeatChoices` 常數(6 個起源專長字串)
- [x] 2.2 `CustomBackgroundRepository`(Supabase CRUD:list〔過濾 tombstone〕/upsert/softDelete),比照 user_characters repository 慣例;單元測試以 fake client 驗證查詢條件與 tombstone 行為
- [x] 2.3 `customBackgroundsProvider`(AsyncNotifierProvider:登入後載入、CRUD 後就地更新;未登入/離線為 AsyncError)

## 3. 編輯器 UI

- [x] 3.1 自訂背景編輯頁(go_router route;建立與編輯共用):名稱、能力值三選(互異)、技能兩選(18 技能、互異)、起源專長單選(kOriginFeatChoices)、敘述;表單即時驗證(design D6),未通過禁止儲存;compact 全頁單欄、medium/expanded 置中限寬
- [x] 3.2 widget 測試:驗證規則(名稱空/能力重複/技能不足)、儲存呼叫 repository

## 4. 建角流程整合

- [x] 4.1 背景步驟選項合併:`kBackgrounds + 自訂背景.map(toBackgroundOption)`,自訂項帶「自訂」badge;清單尾端「+ 自訂背景」入口導向編輯頁,返回後清單刷新
- [x] 4.2 自訂背景項的編輯/刪除動作(刪除經確認對話框 → 軟刪除成功才移除;比照角色刪除語意)
- [x] 4.3 離線降級:provider 為 error 時僅顯示內建 4 個 + 「自訂背景離線不可用」提示,不阻擋建角
- [x] 4.4 快照行為驗證:選自訂背景建角後,能力值加值卡候選、技能帶入、確認頁與角色快照(background 字串、backgroundEn 空字串)正確;單元/widget 測試覆蓋

## 5. 收尾

- [x] 5.1 `flutter test` 全綠、`flutter analyze` 無告警
- [x] 5.2 實機驗證(手機 + 平板模擬器):建立自訂背景 → 建角選用 → 跨裝置(或重登)可見;離線降級提示正常
