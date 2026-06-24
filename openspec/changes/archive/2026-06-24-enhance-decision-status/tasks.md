## 1. 可變角色狀態

- [x] 1.1 將 `currentCharacterProvider` 重構為可變狀態：`CurrentCharacterNotifier extends Notifier<Character>`（初始 `Character.mock()`）
- [x] 1.2 實作動作方法：`adjustHp(int delta)`（delta<0 傷害先扣 `tempHp` 再扣 `currentHp` 不低於 0；delta>0 只補 `currentHp` ≤ max）、`setTempHp(int)`（取代不疊加）、`clearTempHp()`、`addCondition(String)`、`removeCondition(String)`、`adjustExhaustion(int)`（夾 0~6，0 視為無）、`startConcentration(String)`、`endConcentration()`，皆以 `copyWith` 更新
- [x] 1.3 確認既有唯讀畫面（角色頁等 `ref.watch(currentCharacterProvider)`）不受影響
- [x] 1.4 長休完成時呼叫 `clearTempHp()` 將臨時 HP 歸零（接於既有 rest 區塊的長休動作）；短休不動臨時 HP

## 2. 資料調整

- [x] 2.1 建立 D&D 5.5e 標準 15 種異常狀態本機常數（中文名 + 效果說明；力竭附每級效果）
- [x] 2.2 模型欄位（freezed，`build_runner` 重新產生）：`Spell` 新增 `concentration: bool`（mock 補需專注法術如 朦朧術 Blur）；`Character` 新增 `exhaustionLevel: int`（0–6）
- [x] 2.3 於 `DndColors` 新增臨時 HP/護盾冷色（藍/青），供盾牌徽章使用

## 3. 共用互動元件

- [x] 3.1 − / + 兩顆圓鈕：單擊 `adjustHp(∓1)`，觸控目標 ≥ 48dp（不含長按）
- [x] 3.2 異常狀態 bottom sheet：15 種逐列（checkbox + 中文名 + 一行簡說），現有狀態預勾、勾選=新增/取消=移除；力竭該列改用等級 stepper（0–6）。主畫面 condition chip 可快速移除、點本體看說明
- [x] 3.3 專注選擇 bottom sheet：列出 `spells + cantrips` 中 `concentration == true` 項目；空清單顯示空狀態提示
- [x] 3.4 臨時 HP 常駐盾牌入口（=0 淡色無數字、>0 藍色顯示數值），點擊開啟數值輸入，套用 `setTempHp`（不疊加，附提示；輸入 0 清空）

## 4. Status 區塊改版（單一區塊 + divider）

- [x] 4.1 單一卡片：上半三欄（HP ｜ AC ｜ 專注）以 vertical divider 分隔；下半以 horizontal divider 分出狀態異常列
- [x] 4.2 HP 欄：當前/最大 + 常駐盾牌（臨時 HP >0 藍色顯示數值、=0 淡色）+ 血條依比例變色（健康/受傷/瀕死）+ HP=0 警示；接上 +/- 與盾牌點擊輸入
- [x] 4.3 AC 欄：盾牌壓印數值 + 副標（如「無甲・敏捷」）
- [x] 4.4 專注欄：空狀態可點擊 → 開啟專注 bottom sheet → 選取 `startConcentration` 顯示；專注中再點 → 確認後 `endConcentration` 回到空狀態
- [x] 4.5 狀態異常列：chip 列出（不疊加/去重、不同狀態並存）、可新增/移除、點選看效果說明；力竭 chip 顯示等級並可加/減級（0 移除）；無狀態顯示「目前無異常狀態」
- [x] 4.6 手機單欄、平板沿用同一 widget

## 5. 驗證

- [x] 5.1 `flutter analyze` 無錯誤
- [x] 5.2 實機驗證：+/- 增減、夾在 0~max、HP=0 警示
- [x] 5.3 實機驗證：臨時 HP — 受傷先扣臨時 HP、治療不回臨時 HP、設定不疊加、長休清空、短休保留
- [x] 5.4 實機驗證：專注空狀態點擊開 bottom sheet → 選取顯示 → 再點確認取消
- [x] 5.5 實機驗證：異常狀態 bottom sheet 勾選新增/取消移除、現有預勾、每列簡說、不重複、空狀態；力竭 stepper 加/減級（0 移除、6 上限）
- [x] 5.6 驗證手機與平板版型呈現正常
