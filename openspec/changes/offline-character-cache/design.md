## Context

Web 版已有 service worker 快取 app shell，離線能開啟；但資料層完全沒有本機持久化，離線開起來是空殼。詳細動機見 proposal。

實作上有四項既有事實約束設計：

- **`Character` 本身沒有 `updatedAt` 欄位**（只有 `JournalEntry` 有）。雲端的 `updated_at` 由資料庫 trigger 維護，客戶端讀不到也寫不進。衝突偵測若要靠時間戳，得先把它帶進客戶端
- 角色清單以 `characterListProvider.replaceAll()` 整份取代（`character_providers.dart:501`），沒有逐筆合併的概念
- `resetToSeed()`（同檔 :507）是登出／試玩模式的既有出口，快取清除要掛在同一條路徑上，否則兩者會不同步
- 讀入回填鏈（`migrateLegacyWeapons` → `backfillClassResources`）目前在 `CharacterSyncRepository.fetchAll` 與 `CharacterShareRepository.fetchSharedCharacter` **各寫一次**

## Goals / Non-Goals

**Goals:**
- 離線可讀：角色卡、法術說明、物品資料在無網路時完整可用
- 離線可寫：扣 HP、消法術位、加狀態等戰鬥中的高頻操作照常，恢復連線後自動補推
- 離線且無快取時，使用者清楚知道「是離線」而不是「資料不見了」
- 共用裝置上登出即不留痕

**Non-Goals:**
- 離線建立新角色（離線產生的 id 與雲端併入是另一組問題）
- 離線編輯自訂背景／homebrew
- 即時協作
- 分享檢視頁（`/v/:token`）的離線支援——即時活資料是該功能的刻意設計

## Decisions

### D1：儲存採自建 `LocalStore` 抽象，web 走 IndexedDB、原生走檔案

介面極小：`Future<String?> read(String key)` / `Future<void> write(String key, String value)` / `Future<void> delete(String key)` / `Future<void> clear()`，值一律是 JSON 字串。平台分歧比照 `lib/shared/presentation/app_update/` 的 stub/web 條件匯入。

- **web**：IndexedDB，透過既有的 `package:web` ＋ `dart:js_interop`，**不新增相依**
- **原生**：`path_provider` ＋ JSON 檔（新增一個 Flutter 官方套件）

**否決 `shared_preferences`**（雖然它已在相依樹裡、看似最省事）：它在 web 上落到 localStorage，而 localStorage 是**同步**的，且 `SharedPreferences.getInstance()` 會在啟動時把**所有**鍵值讀進記憶體。把近 1 MB 的內容庫塞進去，等於每次啟動都同步 parse 1 MB，直接拖慢冷啟動。localStorage 每 origin 5–10 MB 的配額也讓內容庫日後成長沒有餘裕。原生端的 NSUserDefaults 同樣不是為 MB 級資料設計的。

**否決 hive／drift／sqflite**：都要 codegen 或原生編譯，為了一個 key-value 快取不值得。

**否決「用 service worker 快取 Supabase 的 REST 回應」**：概念上優雅（不必寫 Dart 端儲存），但 Flutter 每次 build 都會重新產生 `flutter_service_worker.js`，客製會被覆蓋；且跨來源請求不在它的 RESOURCES 內。維護成本遠高於收益。

### D2：讀取採 stale-while-revalidate，快取先上畫面

啟動流程：讀快取 → 立即 `replaceAll` 上畫面 → 同時發網路請求 → 成功則以雲端結果再次 `replaceAll` 並回寫快取；失敗則保持快取內容並標記為離線。

使用者永遠先看到東西，網路只決定它多新。這也順帶改善連線正常時的冷啟動觀感——現在是白畫面等 Supabase。

### D3：離線寫入以「待推送集合」表示，而非完整佇列

不記錄「操作序列」，只記錄**哪些角色 id 是髒的**。理由：推送本來就是整份文件 upsert（`data jsonb`），重放個別操作沒有意義；而戰鬥中同一張卡會被改幾十次，逐筆佇列只是浪費。

髒標記與角色本體一起持久化，App 被殺掉也不會遺失。推送成功才清除。既有的 debounce 推送（`characterSyncControllerProvider`）改為：推送失敗不再是終態，改成標記髒 ＋ 等待重連。

### D4：衝突以「本機優先」收斂，但必須讓使用者看見

要衝突，得先讓客戶端拿得到雲端的 `updated_at`——D1 之外的必要改動：`fetchAll` 把它帶進記憶體（`Character` 加欄位或另存一份 id→timestamp 對照，見 Open Questions）。

重連補推時比對：

- 雲端 `updated_at` ≤ 本機快取記錄的版本 → 直接推，無衝突（絕大多數情況）
- 雲端較新 → 代表同一個人在別的裝置也改過。**以本機為準推送**，並明確告知「這張卡在別的裝置上也改過，已以此裝置的版本為準」

本機優先的理由：離線的那台就是當下在桌邊使用的裝置，它的資料反映真實戰況；而另一台的變更多半是誤觸或早先的殘留。**但沉默地覆蓋是不可接受的**——玩家有權知道有東西被蓋掉了。

**否決「以較新的 timestamp 為準」**：離線裝置的時鐘不可信，且「較新」不等於「較正確」。
**否決「跳出衝突解決 UI 讓使用者逐欄選」**：戰鬥中沒人要做這件事，複雜度也不成比例。

### D5：角色清單為空時分三種狀態，`Character.mock()` 只留給訪客

現況 `character_providers.dart:31` 一律 fallback 到範例角色，離線時會讓使用者以為自己的角色被吃掉了。改為：

| 狀態 | 呈現 |
|---|---|
| 未登入（訪客試玩） | 維持現行的範例角色 |
| 已登入 ＋ 有快取 | 快取內容 |
| 已登入 ＋ 無快取 ＋ 離線 | 離線空狀態：「目前離線，這台裝置還沒有同步過你的角色」 |
| 已登入 ＋ 無快取 ＋ 連線正常 | 既有的「還沒有角色」引導 |

### D6：回填鏈收斂為單一入口

新增 `hydrateCharacter(Map<String, dynamic>)`，內含 `migrateLegacyWeapons` → `backfillClassResources`。雲端讀取、分享讀取、**快取讀取**三處共用。

快取讀取套用回填鏈是必要的，不是順手整理：快取寫入的當下是舊版 App，讀回來的可能是新版 App，中間可能多了需要回填的欄位。少了這一步，升級後讀快取的角色會缺欄位。

### D7：內容庫快取無條件背景更新，不做 TTL

內容庫不到 1 MB 且極少變動。啟動時先用快取，若連線正常就在背景重抓一次覆蓋。不設 TTL——TTL 只會製造「過期了但其實沒變」的無謂請求，以及「還沒過期但已經變了」的陳舊資料。

登出時**不清內容庫**：那是 SRD 公開內容、不是個人資料，留著能加速下次登入，也不構成任何洩漏。清除只針對角色與髒標記。

### D8：連線狀態由請求結果推導，不新增偵測相依

不引入 `connectivity_plus`。`navigator.onLine` 只知道有沒有連上網路介面，不知道 Supabase 是否可達，反而會給出錯誤的樂觀判斷。

以最近一次 Supabase 請求的成敗作為連線狀態，並在有髒標記時於角色頁首顯示「離線 · N 項待同步」。重連偵測用退避重試（失敗後 5s / 15s / 60s 重試推送），成功即恢復。

## Risks / Trade-offs

- **快取內容與雲端不一致（別的裝置改過）** → D2 的背景更新會在連線正常時很快覆蓋；離線期間的不一致由 D4 的告知處理
- **本機優先可能覆蓋另一台裝置的變更** → D4 明確告知；此情境需要同一人在兩台裝置上分別離線編輯同一張卡，罕見
- **IndexedDB 配額或寫入失敗** → `LocalStore` 所有操作都要能安靜失敗並退回「純網路」的現行行為。快取是最佳化，不是必要路徑；它壞掉不該讓 App 壞掉
- **共用電腦上的殘留** → 登出清除（D7）。但使用者若不登出就離開，快取仍在——這是瀏覽器 profile 層級的固有問題，非本 change 能解，應在說明中誠實交代
- **離線寫入讓使用者以為已同步** → 待同步數量必須持續可見（D8），不能只在推送失敗當下閃一次
- **啟動流程從單一來源變成雙來源** → 兩次 `replaceAll` 之間若使用者已開始編輯，第二次會蓋掉。需確保網路結果回來時，已被本機修改的角色不被覆蓋（以髒標記排除）

## Migration Plan

無資料庫 migration。快取是純附加的本機層：

1. 先落 `LocalStore` ＋ `hydrateCharacter` 收斂（無行為變化，可獨立驗證）
2. 加讀取快取（D2），此時仍為唯讀路徑，風險最低
3. 加離線寫入與待推送（D3/D4）
4. 加狀態呈現（D5/D8）

回退：`LocalStore` 全域停用即回到現行行為，不需要清除既有快取（讀不到就是沒有）。

## Open Questions

- 雲端 `updated_at` 要加進 `Character` 模型，還是另存 id→timestamp 對照？加進模型較直觀，但那是伺服器管理的欄位，混進領域模型可能造成「客戶端可以改它」的誤解
- 設定頁是否要提供手動「清除本機快取」？對除錯有用，但也可能被誤按
- 髒標記的粒度是否需要細到欄位層級，以便未來做真正的合併？首版不需要，但資料結構若一開始就留餘地，日後改動較小
- 離線期間的日誌（`journal`）與自訂背景是否也該快取？本 change 範圍只含角色與內容庫，但日誌歸屬角色，可能已經隨角色文件一起帶著——需確認 `journal` 的儲存位置
