# Design: character-delete

## Context

角色選擇頁（`character_select_page.dart`）以 `_CharacterCard` 列出角色，點擊選取進入主畫面；登入後清單由 `remoteCharactersProvider` 抓雲端並 `replaceAll` 取代本地。資料層已備：

- `CharacterSyncRepository.softDelete(id)`：UPDATE `deleted_at`（tombstone），未登入靜默略過；`fetchAll` 已過濾 `deleted_at is null`
- `CharacterListNotifier.remove(id)`：本地清單移除
- `selectedCharacterIdProvider`：當前選取（in-memory）

限制：尚無本機持久化——離線模式的清單是 in-memory mock；「僅本地刪除」在下次雲端載入時會被 `replaceAll` 蓋回（復活），因此登入狀態下刪除必須以雲端成功為準。

## Goals / Non-Goals

**Goals:**
- 選擇頁可刪除角色，跨裝置一致（軟刪除同步）
- 防誤刪（確認對話框、明示角色名）
- 刪除當前角色後 app 狀態一致（選取清除、不殘留已刪角色的編輯狀態）

**Non-Goals:**
- 已刪角色的還原 UI（tombstone 已保留，另案）
- tombstone 定期清理（維運議題）
- 角色編輯/改名（另案）
- 左滑刪除手勢（見 D1 捨棄方案）

## Decisions

### D1. 觸發方式：長按卡片
長按角色卡 → 直接彈確認對話框（AlertDialog：標題「刪除角色？」、內文含角色名與「此操作無法復原」、取消/刪除〔紅色〕）。
**捨棄方案**：(a) Dismissible 左滑刪除——與未來可能的卡片橫向手勢衝突，且誤觸率高；(b) 卡片上常駐刪除鈕——視覺噪音，違反「介面乾淨」原則。長按是 Material 慣例且零視覺成本。

### D2. 刪除順序：雲端先行（登入時）
已登入：`await softDelete(id)` 成功 → `remove(id)` → 清選取（若刪的是當前角色）。失敗（網路等）→ SnackBar「刪除失敗，請稍後再試」，本地不動。
**理由**：本地先刪的話，雲端失敗會在下次 `replaceAll` 時復活，使用者體感是「刪了又出現」——比「刪除失敗請重試」差得多。
未登入（離線 mock 模式）：直接 `remove(id)`（無雲端可同步）。判斷沿用 repository 的 `currentSession` 邏輯：`softDelete` 未登入時靜默略過並正常返回，故 UI 端統一「await 後 remove」即可，無需分支——僅錯誤時不移除。

### D3. 刪除當前角色的狀態清理
`selectedCharacterIdProvider` == 被刪 id 時設回 `null`。`currentCharacterProvider` 會因 watch 清單而 rebuild 至 fallback（清單首位或 mock）；同步控制器的「未選取不推送」守門可防止 fallback 角色被誤推上雲。刪除期間不觸發推送（刪除非 current 變更）。

### D4. 進行中狀態
確認對話框的「刪除」按下後顯示 loading（按鈕轉圈、雙鈕禁用），避免重複觸發；完成後關閉對話框。

## Risks / Trade-offs

- [長按無視覺提示，可發現性低] → v1 接受（選擇頁項目少）；未來若做角色編輯，長按可升級為 action sheet（編輯/刪除）
- [兩台裝置同時操作：A 刪除、B 編輯推送] → B 的 upsert 會寫回 row 但 `deleted_at` 不變（upsert 欄位不含 deleted_at），角色仍視為已刪；接受
- [離線刪除後重新上線，雲端仍有該角色 → 復活] → 離線模式本就以雲端為真相源；接受並於 D2 說明
- [誤刪] → tombstone 30 天內可由 DB 手動還原；v1 無 UI

## Open Questions

- 無
