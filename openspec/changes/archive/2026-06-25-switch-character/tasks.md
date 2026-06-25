## 1. 選取狀態與當前角色

- [x] 1.1 新增公開 `selectedCharacterIdProvider`（`StateProvider<String?>`）於 `character_providers.dart`
- [x] 1.2 `router.dart` 改用公開 `selectedCharacterIdProvider`（移除私有版本），`CharacterSelectPage` 選取時設定它
- [x] 1.3 `CurrentCharacterNotifier.build()` 改為依 `selectedCharacterIdProvider` + `characterListProvider` 載入；找不到回退清單第一位，再回退 `Character.mock()`

## 2. 切換動作與多角色

- [x] 2.1 `CharacterListNotifier` 新增 `upsert(Character)`（以 id 取代清單中該筆）
- [x] 2.2 新增切換動作 `switchCharacter(ref, id)`：先 upsert 當前角色回清單，再設定 `selectedCharacterIdProvider = id`
- [x] 2.3 `characterListProvider` 初始補上 2–3 個完整 mock 角色（不同職業/等級，皆能讓各頁渲染）

## 3. 切換入口（設定頁）與頁首

- [x] 3.1 系統頁新增「切換角色」項目（顯示當前角色名稱）→ `go('/character-select')`
- [x] 3.2 `CharacterSelectPage` 選取 → `switchCharacter(ref, id)` → 導航回主畫面
- [x] 3.3 `CharacterHeader` 移除下拉箭頭，純顯示當前角色

## 4. 驗證

- [x] 4.1 `flutter analyze` 無錯誤
- [x] 4.2 實機驗證：設定頁「切換角色」→ 選擇後行動/角色/旅程資料一起換
- [x] 4.3 實機驗證：切換後再切回，HP/資源等編輯仍保留（session 內）
- [x] 4.4 驗證手機與平板版型呈現正常
