# Design: tablet-layout-character-journal

## Context

`ResponsiveLayout`（compact/medium/expanded）與 Decision 頁三欄前例已就緒。角色頁為 `CharacterTabBar` + 五 tab 內容（各自 ScrollView）；旅程頁為卡片 ListView + FAB，編輯器以 root navigator 全螢幕推頁。

## Goals / Non-Goals

**Goals:**
- 角色頁 expanded：總覽與明細並排（跑團高頻查閱場景）
- 旅程頁 expanded：卡片雙欄，恢復合理卡寬
- 排列層切換，tab/卡片實作零改動

**Non-Goals:**
- 旅程頁 master-detail（清單＋右側就地編輯）——涉及編輯器導覽重構，另案
- 各 tab 內容在寬欄下的再排版（如物品頁雙欄格）——另案
- 建角流程/選擇頁的 expanded 版型（既有置中限寬已足夠）

## Decisions

### D1. 角色頁 expanded：總覽常駐左欄（約 2:3 分欄）
左欄固定 `OverviewTab`，右欄 `CharacterTabBar`（僅四 tab：屬性/法術/物品/傳記）+ 內容。tab index 狀態依級距分開持有（expanded 的 index 對應四 tab 清單）；旋轉切換版型時 index 重置為首個 tab——可接受（旋轉不是高頻操作，維持簡單）。
**捨棄方案**：五 tab 照舊 + 內容雙欄——tab 內容各自為完整捲動流，硬拆雙欄會打散語意分組。

### D2. 旅程頁 expanded：雙欄卡片流（索引奇偶分配）
entries 依更新時間排序後以奇偶索引分左右欄（`Row` + 兩個 `Column`，外層單一 ScrollView）。不用瀑布流套件——卡片高度相近，奇偶分配視覺已均衡，零依賴。FAB 與空狀態不變。

### D3. medium 兩頁皆置中限寬
角色頁 700（tab bar 與內容一起限寬）、旅程頁 600，與 Decision 頁 medium 慣例一致。

## Risks / Trade-offs

- [expanded 左欄總覽不可切換，使用者若想全寬看法術] → 右欄即為全高分頁區，寬度足夠；接受
- [旋轉時右欄 tab index 重置] → D1 已述，接受
- [雙欄卡片奇偶分配在卡片高度懸殊時左右不齊] → 筆記卡有 maxLines 限制、高度相近；接受

## Open Questions

- 無
