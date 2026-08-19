> **重寫（2026-08-06）**：原提案範圍為「分享自訂背景」，且設計為**凍結快照**。
> 兩者皆已推翻——範圍擴為**所有 homebrew 型別的統一分享模型**，分享改為
> **活的檢視窗口**（理由見 design D1）。原提案於 Flutter 端凍結，本版以
> Next.js 實作為前提書寫。

## Why

SRD 收斂後內建選項本就不多，切到 5e（SRD 5.1）後更極端——**背景只有 1 個（侍僧）、專長只有 1 個（擒抱者）**；5r 也好不到哪去，**每個職業只收錄 1 個子職**。玩家到了 3 級打開子職選單只會看到一個選項，那不是選擇，是通知。

自訂內容（homebrew）是唯一的補足途徑，但目前它**完全無法傳遞**：`user_backgrounds` 與 `user_subclasses` 皆為 own-row RLS 且 `revoke all from anon`，拿到 id 也查不到任何列。同一團要用同一個「士兵」背景，五個人得各建五次，且內容不會一致。

而桌上跑團的實際流程是：**玩家設計 → DM 審核 → 全團採用**。這條流程目前在 App 裡一步都走不了。玩家只能把子職特性硬塞進「特長」欄位，失去等級對應與來源標示；DM 沒有任何檢視他人自訂內容的方式。

## What Changes

本 change 建立一套**統一的 homebrew 分享／檢視／收藏模型**，涵蓋所有型別，而非為每種型別各做一次。

### 分享是一扇窗，不是一份影本

分享連結指向**作者當下的資料**，不是發布時的快照。作者依 DM 要求調整數值後，同一個連結（與已貼在 Discord 的 QR code）自動反映最新版本，不必重發。

這與 `character_shares` 完全一致——一套機制、一套心智模型，連狀態處理（`not_found` / `revoked` / `deleted` / `ok`）都沿用。

### 收藏是快照

檢視頁的主要行動是**「收進我的資料庫」**：以新 id、自己的 `user_id` 複製一份到自己的 `user_backgrounds` / `user_subclasses`。收藏後與來源**完全脫鉤**——作者之後怎麼改都不影響已收藏的那一份。

於是形成三層凍結：

```
作者的資料（活）
  └─ 分享連結：看向作者當下資料的窗
       └─ 收進我的資料庫：複製，凍結
            └─ 用在角色卡上：再複製，再凍結
```

「作者偷改」的暴露窗口因此只存在於**看到**到**收藏**之間。這也給了 DM 一個現成的審核存證方式：**核准時自己也收一份**，那就是「我核准過的版本」。

### 收藏不設限，使用時才依規則過濾

檢視頁提供兩段式行動：

- **「收進我的資料庫」永遠可用**——不依賴任何角色狀態。各型別的採用時機差異極大（背景／種族只在建角、子職要 3 級且母職業相符、法術受職業與環數限制），若統一在收藏時擋，多數時候按鈕都是灰的且沒人看得懂為什麼。
- **「直接套用到這個角色」僅在規則允許時才出現**——不出現也不需要解釋。

一個法師子職躺在戰士玩家的資料庫裡不是錯誤，升級時它就是不出現。

### 更新＝刪除後重收

資料庫裡的副本要跟上來源，就是刪掉再收一次（提供一鍵完成）。**沒有回連來源的線，因此不需要任何同步或版本協調機制。** 若本地副本已被編輯過，一鍵更新前 SHALL 先警告——否則會蓋掉使用者自己的修改。

### 「我的資料庫」是一個實際存在的地方

收藏模型假設玩家能檢視自己收集的自創資料，但目前沒有這個地方——系統設定頁是「自訂背景」與「自訂子職業」兩條各自獨立的連結，型別一多就會變成一長串。

本 change 建立單一的 `/library`：所有型別分區塊列於一頁，每項標示是自建還是收藏而來，新增與編輯就地以 sheet 開啟。既有的 `/custom-backgrounds` 與 `/custom-subclasses` 轉為導向 `/library`，系統設定頁收斂為單一入口。

### 統一的檢視版面

所有型別共用同一個檢視頁骨架（標題、型別標示、規則版本、最後更新時間、行動區），差別僅在內容區塊：背景顯示技能／工具／裝備／起源專長，子職顯示母職業與各等級特性。新增型別時只需新增內容區塊。

## Capabilities

### New Capabilities
- `homebrew-share`: 自訂內容的分享、檢視與收藏——token 識別、活資料檢視、QR/連結載體、撤銷、收藏為快照複製、兩段式行動、規則版本檢查、無公開索引

### Modified Capabilities
- `custom-backgrounds`: 新增「發布分享」與「自收藏建立」兩條路徑；資料列新增來源標記欄位
- `custom-subclass`: 同上；並新增「自資料庫的收藏項選用」的升級路徑
- `content-scope`: 界定使用者自產內容的分享邊界——點對點傳遞不受 SRD 限制，但 App SHALL NOT 提供公開索引或內容散布介面
- `data-layer`: 新增一張以 token 存取（非 own-row）的資料表與其 `SECURITY DEFINER` RPC，需明文其存取模型與既有慣例的差異

## Impact

**資料層分類**：影響使用者自產內容（homebrew），不觸及靜態遊戲資料（內容庫）與 Campaign 共用資料；無 Realtime 訂閱異動。

### 新資料表 `homebrew_shares`（指標表，非快照表）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `token` | `text primary key` | 128-bit 隨機（base64url，22 字元） |
| `owner_id` | `uuid not null` | 發布者，`references auth.users on delete cascade` |
| `kind` | `text not null` | `background` / `subclass`（首版）；未來 `species` / `feat` / `spell` / `item` |
| `homebrew_id` | `text not null` | 指向 `user_backgrounds.id` 或 `user_subclasses.id` |
| `label` | `text` | 發布者自用的備註，不對外回傳 |
| `created_at` | `timestamptz not null` | |
| `revoked_at` | `timestamptz` | 非 null = 已撤銷 |

比照 `character_shares`：表本身對 `anon` / `authenticated` **完全不可讀**，檢視者不查表，只呼叫 `public.get_shared_homebrew(token)`（`SECURITY DEFINER`）。

> 原設計將此表定為**快照表**（`data jsonb` 存發布當下內容），並以此論證 `kind` 欄位的正當性。改為活資料後它變成**指標表**，`kind` 仍然需要，但理由改為「決定去哪張來源表查」。`0006_user_subclasses.sql` 開頭與 `custom-subclass` design D3 的相關論述需一併更正。

### 既有表的變更

**主鍵對齊**：`user_backgrounds` 與 `user_subclasses` 由 `primary key (id)` 改為 `primary key (user_id, id)`，比照 `user_characters`。理由不是整齊——這兩張表的既有 8 筆資料全部是 Flutter 時代的時間戳 id（可枚舉、跨使用者可能撞號），正是 `0002` 當初為角色修掉、卻沒推及後建之表的狀態。收藏功能會放大這個風險，而現在改幾乎沒有成本。詳見 design D3。

**欄位新增**：兩表各新增兩個可為 null 的欄位。

| 欄位 | 說明 |
|---|---|
| `source_token` | 收藏來源的 token；null = 自己建立的 |
| `source_updated_at` | 收藏當下來源的 `updated_at`，用於偵測「來源已更新」 |
| `source_note` | **收藏者自己寫的**備註（「小明給的」「DM 核准的版本」）；選填 |

三者皆 nullable，既有資料列不需回填。RLS 與 grant 不變。

### 程式碼影響

**新增**
- `supabase/migrations/0007_homebrew_pk_and_source.sql`：主鍵對齊、來源欄位
- `supabase/migrations/0008_homebrew_shares.sql`：表、RLS、`get_shared_homebrew` RPC
- `lib/homebrew/{types,share-actions,collect-actions}.ts`：型別註冊表、發布／撤銷、依 token 取回、收藏
- `components/homebrew/homebrew-view.tsx` 與各型別的內容區塊
- `app/h/[token]/page.tsx`：檢視頁（未登入可讀）
- `app/library/page.tsx` 與 `components/homebrew/library.tsx`：我的資料庫

**修改**
- `components/backgrounds/background-manager.tsx`、`components/subclasses/subclass-manager.tsx`：改為 `/library` 的區塊；分享入口、來源標記、「更新副本」
- `app/custom-backgrounds/page.tsx`、`app/custom-subclasses/page.tsx`：導向 `/library`
- `app/main/system/page.tsx`：兩條自訂連結收斂為單一「我的資料庫」
- `components/level-up/level-up-view.tsx`：子職來源已含自訂，收藏項自然併入（無額外改動）
- `lib/backgrounds/actions.ts`、`lib/subclasses/actions.ts`：讀寫新欄位

**版型影響**：檢視頁為新畫面，沿用既有的三段式寬度級距，無新版型分支。

**相依**
- QR code 產生已於 `character-share` 完成（本機繪製、無外部服務），直接複用
- 規則版本的標示與檢查**全數**依賴 `dual-rules-version`（凍結中）。Next.js 端目前無任何 `rulesVersion` 欄位，首版**完全不顯示**版本——顯示恆為「5r」的推定值在今日正確，但 5e 上線後所有既有分享都會標錯且無從分辨

## Non-Goals

- **自訂職業（母職業）的分享**——完整職業的資料量與規則面比其他型別大一個量級（生命骰、熟練、每級進度表、法術位…），不應與其他型別綁在同一個 change
- **自訂武器／法術／物品的分享**——這些型別與「自訂內容僅為顯示文字」的既有原則衝突：一把不會產生攻擊列的武器沒有用處。要先解決機制建模，才談得上分享
- **公開瀏覽、搜尋、排行或任何形式的內容索引**——分享為點對點傳遞，App 不成為內容散布平台（亦為著作權護欄）
- **收藏副本與來源的同步／版本協調**——刪除後重收即可，刻意不做
- **多人共同編輯同一份 homebrew**
