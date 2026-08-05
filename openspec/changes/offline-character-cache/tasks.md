## 1. 前置整理（無行為變化，可獨立驗證）

- [ ] 1.1 抽出 `hydrateCharacter(Map<String, dynamic>)` 單一入口，內含 `migrateLegacyWeapons` → `backfillClassResources`
- [ ] 1.2 `CharacterSyncRepository.fetchAll` 與 `CharacterShareRepository.fetchSharedCharacter` 改用 `hydrateCharacter`，移除各自重複的回填呼叫
- [ ] 1.3 測試：兩個 repository 的回填結果一致（同一份舊格式 JSON 走兩條路徑得到相同角色）

## 2. LocalStore 儲存層

- [ ] 2.1 定義 `LocalStore` 介面（read / write / delete / clear，值為 JSON 字串）
- [ ] 2.2 web 實作：IndexedDB（`package:web` ＋ `dart:js_interop`，不新增相依）
- [ ] 2.3 原生實作：`path_provider` ＋ JSON 檔；新增 `path_provider` 相依
- [ ] 2.4 stub/條件匯入接線，比照 `lib/shared/presentation/app_update/`
- [ ] 2.5 所有操作包上安靜失敗，失敗時退回「無快取」語意而非拋出
- [ ] 2.6 測試：寫入讀回、讀取不存在的 key 回 null、底層失敗時不拋出

## 3. 角色讀取快取（唯讀路徑，風險最低）

- [ ] 3.1 角色清單寫入快取（雲端讀取成功後回寫）
- [ ] 3.2 啟動時先讀快取並 `replaceAll` 上畫面，再發雲端請求
- [ ] 3.3 快取讀回套用 `hydrateCharacter`
- [ ] 3.4 雲端結果回來時，排除已被本機修改的角色再覆蓋
- [ ] 3.5 測試：有快取時不等網路即有內容；雲端成功後被更新；雲端失敗時保留快取

## 4. 內容庫快取

- [ ] 4.1 內容庫各 `fetch*` 加入快取讀寫
- [ ] 4.2 啟動先用快取、連線正常時背景重抓覆蓋（無 TTL）
- [ ] 4.3 測試：離線時法術／物品清單自快取完整取得

## 5. 雲端版本與衝突偵測

- [ ] 5.1 讓客戶端取得角色的雲端 `updated_at`（模型欄位或 id→timestamp 對照，依 design Open Question 決議）
- [ ] 5.2 快取一併記錄每個角色對應的雲端版本
- [ ] 5.3 推送前比對雲端版本，判定是否為衝突
- [ ] 5.4 測試：雲端較新時判定為衝突；未較新時不判定

## 6. 離線寫入與待推送

- [ ] 6.1 角色變更寫入本機快取並標記待推送；標記與角色本體一同持久化
- [ ] 6.2 `CharacterSyncRepository` 的推送錯誤分為可重試／不可重試
- [ ] 6.3 `characterSyncControllerProvider` 改為：推送失敗保留待推送標記，不視為終態
- [ ] 6.4 退避重試（5s / 15s / 60s），成功即清除該角色標記
- [ ] 6.5 衝突時以本機版本推送，並產生一則待呈現的告知
- [ ] 6.6 測試：離線編輯後標記存在；重啟後標記仍在；恢復連線後自動推送並清除標記；連續失敗時間隔遞增

## 7. 空狀態分流

- [ ] 7.1 `character_providers.dart` 的 `Character.mock()` fallback 收斂為僅未登入（訪客試玩）適用
- [ ] 7.2 已登入 ＋ 離線 ＋ 無快取：離線空狀態畫面
- [ ] 7.3 已登入 ＋ 連線正常 ＋ 空清單：既有的建立引導
- [ ] 7.4 測試：四種狀態各自呈現正確，已登入時不再出現範例角色

## 8. 狀態呈現

- [ ] 8.1 由最近一次雲端請求成敗推導連線狀態（不新增偵測相依）
- [ ] 8.2 角色頁首呈現「離線 · N 項待同步」，持續可見
- [ ] 8.3 衝突告知的呈現（沿用既有提示元件，勿另造一套）
- [ ] 8.4 測試：有待同步時顯示、全部推送完成後消失

## 9. 登出清除

- [ ] 9.1 登出／試玩模式清除快取角色與待推送標記，掛在 `resetToSeed()` 同一條路徑
- [ ] 9.2 內容庫快取不清除
- [ ] 9.3 測試：登出後換帳號登入看不到前一帳號的角色；內容庫仍在

## 10. 驗證

- [ ] 10.1 `flutter analyze` 與 `flutter test` 全綠
- [ ] 10.2 `flutter build web` 通過（IndexedDB 為純 web 程式碼，測試蓋不到，需編譯驗證）
- [ ] 10.3 dev server 手動驗證：DevTools 切離線 → 重整 → 角色與法術仍在 → 扣血 → 恢復連線 → 變更已上雲
- [ ] 10.4 dev server 手動驗證：登出後本機無殘留
