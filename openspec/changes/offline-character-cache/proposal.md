## Why

Web 版已註冊 service worker，離線時 app 開得起來——但開起來是空的。角色資料完全沒有本機持久化（`shared_preferences` 全 app 只用於主題與 A2HS 旗標），一律來自 Supabase 並活在記憶體。內容庫（法術、物品、職業特性）同樣是每次進站現抓。

這對已經被 A2HS 引導裝到主畫面的使用者特別糟：一個裝在桌面、點開卻是空殼的 app，觀感比不能開更差。而 D&D 的實際使用場景——桌遊店、地下室、朋友家的死角——恰恰是收訊最差的地方，也正是最需要角色卡的時候。

現況更隱蔽的問題是：離線時角色清單為空，`character_providers.dart:31` 會 fallback 到 `Character.mock()`，使用者看到的是範例角色而不是自己的角色，很容易誤以為資料不見了。

## What Changes

- 新增本機快取層：登入後抓回的角色與內容庫寫入裝置，下次啟動先讀快取再背景更新（stale-while-revalidate）
- **離線可寫**：離線時角色卡照常可編輯（扣 HP、消法術位、加狀態），變更寫進本機並標記待推送；恢復連線後自動補推
- 衝突以既有的 LWW `updated_at` 收斂——角色只有本人能編輯、分享是唯讀，衝突僅可能發生在同一人的多裝置間
- 離線且無快取時顯示明確的離線空狀態，**取代** `Character.mock()` fallback（**BREAKING**：未登入訪客的試玩模式需保留現行行為，兩者要分流）
- 登出時清除快取，比照現行的 `resetToSeed()`——共用裝置不得殘留他人角色
- 內容庫整份快取。實測 Supabase 上法術 339 筆 395 kB、職業特性 353 筆 248 kB、物品 210 筆 70 kB、專長 17 筆 15 kB，全部不到 1 MB，沒有取捨必要
- App 內呈現連線狀態，讓使用者知道現在看的是快取、以及是否有尚未推送的變更

## Capabilities

### New Capabilities
- `offline-cache`: 本機快取的寫入、讀取、失效與清除；離線可寫與重連補推；連線狀態的呈現

### Modified Capabilities
- `data-layer`: 角色讀取由「雲端唯一來源」改為「快取優先 ＋ 背景更新」；推送失敗不再是終態，需入待推送佇列並於重連重試
- `character-management`: 角色清單為空時的行為分流——離線無快取顯示離線空狀態，不再一律 fallback 到範例角色

## Impact

**程式碼**
- `lib/features/character/data/character_sync_repository.dart`：fetchAll 前置快取讀取；push 失敗改為入佇列
- `lib/features/character/domain/character_providers.dart`：`replaceAll` 的來源分流、`Character.mock()` fallback 條件收斂、離線變更標記
- `lib/features/catalog/data/catalog_repository.dart`：各 `fetch*` 加快取層
- `lib/app/app.dart`：`characterSyncControllerProvider` 需加入重連偵測
- 新增 `lib/shared/data/local_store*`（跨平台，比照 `lib/shared/presentation/app_update/` 的 stub/web 條件匯入模式）

**回填鏈**
快取讀回時必須套用與雲端相同的回填鏈（`migrateLegacyWeapons` → `backfillClassResources`），否則舊快照會缺欄位。這條鏈目前在 `CharacterSyncRepository.fetchAll` 與 `CharacterShareRepository.fetchSharedCharacter` 各寫一次，本 change 應收斂為單一入口。

**相依**
可能需要新套件（視儲存方案而定，見 design）。優先評估不新增相依的作法。

**不影響**
分享檢視頁（`/v/:token`）維持即時活資料，不快取——那是刻意的設計，見 `character-share`。

## Non-Goals（首版）

- 離線建立新角色（需要處理離線產生的 id 與雲端的併入）
- 離線編輯自訂背景／homebrew
- 多人同時編輯同一張角色卡的即時協作
