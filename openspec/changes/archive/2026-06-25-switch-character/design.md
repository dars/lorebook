## Context

現有零件多已就緒，只是沒接起來：`CharacterSelectPage`（列出 `characterListProvider`、回呼 `onCharacterSelected(id)`）、路由私有的 `_selectedCharacterProvider`、頁首 `CharacterHeader`（已畫下拉箭頭但不可點）。缺口在 `currentCharacterProvider` 寫死 `Character.mock()`，與選取脫鉤。本變更純接線 + 補 UI，**不改資料模型**。

## Goals / Non-Goals

**Goals:**
- 選取角色（初始選擇畫面或設定頁切換）即驅動全 App 當前角色資料。
- 切換入口集中於設定頁 → 角色選擇畫面；頁首僅顯示當前角色。
- 切換時保留當前角色於 session 內的暫存編輯。

**Non-Goals:**
- 跨 session 持久化、Supabase 同步（後續）。
- 新增/刪除角色流程（character-management 已另有需求；本次聚焦「切換」）。
- 多角色完整正式資料（本次只補代表性 mock）。

## Decisions

### 1. 單一選取來源 `selectedCharacterIdProvider`
新增公開 `selectedCharacterIdProvider`（`StateProvider<String?>`）於 `character_providers.dart`；`router.dart` 改用它（移除私有 `_selectedCharacterProvider`）。為當前角色與路由 gate 的共同依據。

### 2. `currentCharacterProvider` 改為依選取載入
`CurrentCharacterNotifier.build()`：
- `final id = ref.watch(selectedCharacterIdProvider);`
- `final list = ref.read(characterListProvider);`
- 回傳 `list.firstWhere(id) ?? list.first ?? Character.mock()`。
- 選取 id 改變 → Notifier 重建 → 當前角色切換。既有編輯方法（adjustHp…）維持原樣，編輯 Notifier 狀態。

### 3. 切換動作保留編輯
切換時：先把當前角色狀態 upsert 回 `characterListProvider`（以 id 取代清單中該筆），再設定 `selectedCharacterIdProvider = newId`。如此 build 重建會從清單載入新角色，而剛才的編輯已存回清單，session 內切回時仍在。
- 提供協調方法（例如 `characterListProvider` 的 `upsert(Character)` + 一個 `switchCharacter(ref, id)` 輔助）。

### 4. 切換入口置於設定頁；頁首僅顯示
- **設定頁**新增「切換角色」項目（顯示當前角色名稱）→ `go('/character-select')`。
- `CharacterSelectPage` 選取 → `switchCharacter(ref, id)`（見決策 3）→ 導航回主畫面。
- `CharacterHeader` **移除下拉箭頭**，純資訊呈現當前角色（不再是切換觸發點）。
- **理由**：跑團少切角色，集中於設定頁是低頻動作的慣常位置；避免頁首誤觸與多餘 UI。

### 5. 初始選取與回退
- 經 `CharacterSelectPage` 選取 → 設 `selectedCharacterIdProvider`，導航主畫面。
- 未選取（dev 直接進主畫面）→ `build()` 回退清單第一位，畫面仍有資料。

### 6. 多 mock 角色
`CharacterListNotifier` 初始改為 2–3 個完整 mock（不同職業/等級，皆有足夠資料讓各頁渲染）。戴夫林（法師）保留為其一。

## Risks / Trade-offs

- **[編輯持久化僅 session 內]** → 寫回記憶體清單，App 重啟即失；正式持久化（Supabase）後續。
- **[build watch 選取會重置狀態]** → 切換時當前 Notifier 重建；已用「切換前 upsert 回清單」緩解編輯遺失。
- **[多 mock 維護成本]** → 僅為 demo/驗證；待真實資料層接入後移除。
