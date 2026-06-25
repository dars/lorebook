## Why

「切換角色」在規格上已存在（app-shell 情境式頁首的「切換角色」scenario、character-management 的「選擇角色設為當前角色」），但**實作尚未接通**：

- `currentCharacterProvider` 永遠回傳 `Character.mock()`，**完全忽略選取的角色**。
- 路由的 `_selectedCharacterProvider`（已選 id）只用於導航 gate，未驅動當前角色資料。
- 頁首角色名稱旁的下拉箭頭 `▾` 不可點，沒有切換選單。
- `characterListProvider` 只有單一 mock 角色，無從切換。

結果：選了角色或想切換，畫面資料都不會變。本變更把這條線接通。

## What Changes

- **當前角色由選取驅動**：`currentCharacterProvider` 改為依「已選角色 id」從角色清單載入對應角色（找不到則回退清單第一位），選取改變即全 App 角色情境分頁切換資料。
- **公開選取狀態**：將選取 id 提升為公開的 `selectedCharacterIdProvider`（取代路由內私有版本），作為當前角色的單一來源。
- **切換入口置於設定頁**：系統/設定頁新增「切換角色」項目 → 導航至既有角色選擇畫面（跑團少切，屬低頻動作，集中於設定）。**頁首移除下拉箭頭**，只呈現當前角色資訊。
- **切換不丟失編輯**：切換前先把當前角色的暫存編輯（HP、資源…）寫回清單，切換後從清單載入新角色（本機 session 內保留）。
- **多個 mock 角色**：`characterListProvider` 補上 2–3 個完整 mock 角色（不同職業/等級）以利切換與驗證。

## Impact

- **程式碼**：`features/character/domain/character_providers.dart`（currentCharacter 改為依選取載入、新增切換動作、多 mock）、`features/system/presentation/system_page.dart`（新增「切換角色」入口）、`shared/presentation/character_header.dart`（移除下拉箭頭）、`app/router.dart`（改用公開 `selectedCharacterIdProvider`）、`character_select_page.dart`（沿用，設定選取）。
- **資料層**：本階段角色清單仍為記憶體 mock；跨 session 持久化與 Supabase 同步屬後續。
- **能力**：app-shell（情境式頁首移除頁首切換）、system（新增角色切換入口）、character-management（當前角色資料來源）。
- **相依套件**：不新增。
