# 內文標記規格（Text Markup Spec）

**狀態**：提案，**尚未實作**。目前 codebase 跑的仍是舊的 5etools 標記解析
（`next/lib/catalog/fivetools.ts`）。
**日期**：2026-08-28
**適用範圍**：內容庫規則文字、角色卡自由文字欄位（`description`／`notes.body`／
`traits`／`ideals`／`bonds`／`flaws`）、自創內容（homebrew 背景與子職）。

---

## 這份文件在解決什麼

內容庫的規則文字帶有行內標記，用來把「這段字是個規則名詞／是傷害骰／要強調」
標記出來，讓渲染層能上色、加 tooltip、做導覽。

現行標記沿用上游 5etools 的 `{@tag 內容|參數|參數}` 格式，靠**參數的位置**決定
語意。實測全庫後確認這個設計有 6 類系統性錯誤（見〈附錄 A〉），成因都一樣：

> 「顯示文字在第幾段」依 tag 而變 —— 參照類在第 3 段、骰子類在第 2 段、
> `filter` 在第 1 段。每加一個 tag 都在賭它的形狀跟同組成員一樣，賭錯就
> 把 `category=EB`、`1-9` 這種內部參數顯示到畫面上。

本規格重新設計語法，把「顯示文字的位置」變成**結構上固定**，讓這類錯誤不可能發生。

---

## 一、語法

### 1.1 基本形狀

```
{@tag key}
{@tag key param=value param=value}
```

- `{@` 是唯一的觸發序列，`}` 結束。
- **第一段是 key**：指向某個實體或術語的識別字（英文），或數值本身。
- 其餘一律是 `key=value` 具名參數，**順序無關**。

```
{@term Long Rest kind=rule}
{@term Long Rest kind=rule}   ← 與上一行等價
{@term Long Rest kind=rule}   ← 參數對調也等價
```

### 1.2 第一段怎麼斷

第一段從 `{@tag ` 之後開始，**一路讀到第一個符合 `key=` 形式的 token 為止**。

```
{@term Long Rest kind=rule}          → key = "Long Rest"，kind=rule
{@spell Greater Restoration}         → key = "Greater Restoration"
{@term Cone [Area of Effect]}        → key = "Cone [Area of Effect]"
{@damage 5d6 type=fire}              → key = "5d6"，type=fire
```

key 可以含空格、方括號、數字。不需要引號、不需要跳脫——實際內容裡不會有
`某某=` 形式的詞出現在名字中間。

### 1.3 巢狀

允許，以深度計數配對：

```
{@hl 造成 {@damage 5d6 type=fire} 火焰傷害 as=danger}
```

實務上極罕見（全庫僅 1 例），但解析器必須支援，不得吞內容。

### 1.4 逸出

只有 `{@` 觸發解析，所以只需要逸出這一個序列：

```
{@@   →   字面的 {@
```

**裸的 `{` 永遠是文字**。這讓「使用者在筆記裡貼了一段 JSON 或程式碼」天然不會
被誤判成標記。

### 1.5 未知標記與壞掉的標記

- **未登記的 tag** → 顯示第一段，丟棄參數。因為第一段的位置是固定的，
  這個降級**結構上不可能出錯**。
- **不成對的括號** → 連同其後文字原樣輸出。不拋例外、不吞內容。
- 兩者在 dev 環境印 warning，正式環境安靜降級。

這個性質讓**新增 tag 永遠向後相容**：舊版讀到新標記會顯示成沒有樣式的正常文字，
而不是壞掉。分享／收藏路徑會把別人的內容帶進來，這條保證是必要的。

### 1.6 渲染的安全邊界

解析必須產生 React 節點，**絕不可組 HTML 字串走 `dangerouslySetInnerHTML`**。
標記可能來自使用者自產內容與他人分享的內容，解析層是信任邊界。

---

## 二、標記清單（12 個）

### role: `entity` —— 內容庫實體，強調色 + 可導覽

#### `{@spell}`

```
{@spell Greater Restoration}
{@spell Dispel Magic}
{@spell Fireball}
```

顯示：金色可點，導向 `/catalog/spells`。

#### `{@item}`

```
{@item Holy Symbol}
{@item Dagger}
{@item Shield}
```

顯示：金色可點，導向 `/catalog/items`。

#### `{@feat}`

```
{@feat Ability Score Improvement}
{@feat Boon of Dimensional Travel}
```

#### `{@race}`

```
{@race Elf}
{@race Dwarf}
```

---

### role: `state` —— 可套用到角色

#### `{@condition}`

```
目標陷入{@condition Charmed}狀態。
豁免失敗者受到{@condition Frightened}與{@condition Incapacitated}。
```

顯示：虛線底線 + tooltip 顯示狀態全文（`entries` 表有 15 種狀態，齊全）。

`condition` 是唯一從 `term` 獨立出來的術語類 tag，因為它**有規則行為**：
`next/lib/rules/conditions.ts` 已存在，長按／點擊可以直接把狀態掛到角色身上。
其餘術語只能查閱，不能對角色做事。

---

### role: `term` —— 規則術語，tooltip 釋義

#### `{@term}`

`kind=` 白名單：`rule`｜`action`｜`skill`｜`sense`｜`status`｜`mastery`｜`property`｜`hazard`

```
{@term Long Rest kind=rule}
{@term Bonus Action kind=rule}
{@term Athletics kind=skill}
{@term Darkvision kind=sense}
{@term Concentration kind=status}
{@term Sap kind=mastery}
{@term Light kind=property}
{@term Burning kind=hazard}
```

顯示：全部同一種呈現——虛線底線 + tooltip。`kind` 只決定 glossary 查哪一區。

> **為什麼合併成一個 tag**：上游把這些分成 7 種 tag（`variantrule`／`action`／
> `skill`／`sense`／`status`／`itemMastery`／`itemProperty`），但它們的渲染行為
> 100% 相同，差異只是「屬於哪一類術語」——那是分類欄位，不是行為差異。
> 全庫這 7 類共 1262 處引用，只由 **88 個相異術語**構成。

---

### role: `value` —— 數值

#### `{@damage}` — 可擲，結果套用到 HP

`type=` 白名單：`fire`｜`cold`｜`lightning`｜`thunder`｜`acid`｜`poison`｜
`necrotic`｜`radiant`｜`psychic`｜`force`｜`physical`

```
失敗者受到 {@damage 5d6 type=cold} 寒冷傷害，成功則傷害減半。
攻擊者受到暖盾的 {@damage 2d8 type=fire} 火焰傷害。
{@damage 7d8+30 type=necrotic}
```

顯示：依 `type` 套 `--color-damage-*` token（`next/app/globals.css`，深淺各一套），
點擊擲骰並可扣血。

#### `{@roll}` — 可擲，不套用到 HP

`as=` 白名單：`percent`

```
目標回復 {@roll 4d12} {@term Hit Points kind=rule}。
必須在每個回合開始時擲 {@roll 1d10}，查閱下表決定行為。
有 {@roll 25 as=percent} 的機率隨機解讀。
```

顯示：等寬強調、點擊擲骰。治療、隨機表、機率共用這個 tag。

#### `{@dc}` — 不可擲的門檻

```
進行一次 {@dc 15} 敏捷豁免檢定。
{@dc 10}
```

顯示：渲染成 `DC 15`，**不可點擊**——它是目標值，不是骰子。

#### `{@scale}` — 升環／升級縮放

```
{@scale 8d6 per=1d6 from=3 type=fire}
{@scale 2d8 per=1d8 from=1 type=cold}
{@scale 2d4 per=1d4 from=3}
```

- 第一段 `8d6` — 基礎值，也是純文字壓平時顯示的東西
- `per=` — 每升一環增加多少
- `from=` — 從第幾環開始算增量（法術本身的環數）
- `type=` — 元素，與 `damage` 共用同一組 token

顯示：顯示基礎值，副標或 tooltip 說明「自 3 環起每環 +1d6」。

> 上限恆為 9 環（法術位就到 9 環），是可推導的常數，**不存進資料**。
> 現行 `{@scaledamage 8d6|3-9|1d6}` 把上限寫進字串並誤當顯示名，是 52 處
> 顯示成 `3-9` 的成因。

---

### role: `emphasis` —— 強調

#### `{@hl}`

`as=` 白名單：`label`｜`danger`｜`success`｜`note`

```
{@hl 豁免失敗： as=label}{@damage 12d6 type=fire} 火焰傷害。
{@hl 豁免成功： as=label}傷害減半。
{@hl 這個能力每次長休只能使用一次 as=danger}
{@hl 法杖也可以當作{@item Quarterstaff}使用。 as=note}
```

顯示：`label` 是效果分支標題；`danger`／`success` 取 `--color-danger`／
`--color-success`；`note` 是補充說明。

> **`{@hl}` 是唯一第一段不是 key 的 tag**——它包的是自由文字，沒有 key 可指。
> 這個不一致是必要的，且不影響降級：未知情況下顯示第一段仍然正確。

---

### role: `nav` —— 站內導覽

#### `{@list}`

`to=` 白名單：`spells`｜`items`｜`feats`

```
{@list Druid Spells to=spells class=Druid}
{@list Epic Boon Feats to=feats category=EB}
{@list Martial Weapons to=items type=martial-weapon}
```

顯示：導向站內篩選後的內容庫頁。`to=` 之外的參數原樣帶進 query string。

---

## 三、參數詞彙表

跨 tag 共用同一套參數名，不讓各 tag 自己發明。

| 參數 | 用在 | 意義 |
|---|---|---|
| `kind=` | `term` | 術語分類，決定 glossary 查哪一區 |
| `type=` | `damage`、`scale` | 傷害元素，決定顏色 token |
| `as=` | `hl`、`roll` | 語意變體 |
| `to=` | `list` | 導覽目標頁 |
| `per=` `from=` | `scale` | 每環增量、起算環數 |
| `text=` | 全部（罕用） | 覆寫顯示文字，見 §4.3 |

---

## 四、設計決策與理由

### 4.1 顯示文字不存進資料

資料只說**指向誰**（key），顯示什麼由渲染層查表決定。

```
{@term Long Rest kind=rule}
    → 中文頁面顯示「長休」
    → 英文頁面顯示「Long Rest」
```

好處：改譯名、加英文版、修漏翻，全都不用碰標記本身。

**代價**：需要一張 `key → 顯示名` 的對照表打包進 bundle（約 700 條、20KB 級），
否則純文字壓平會需要 IO——而清單摘要、搜尋索引、分享的純文字、離線狀態全靠它。
注意**只需要 name map，不是整個內容庫**（後者是 1MB 級，不可行）。

查不到 key 時退回顯示 key 本身（英文）。難看，但不壞。

### 4.2 標記標語意，不標外觀

tag 名與參數值一律是**語意名**（`danger`、`fire`），絕不是外觀名（`red`、`bold`）
或色碼。

理由不是潔癖：資料比程式碼難改一個數量級。一旦 tag 名是 `red`，深淺兩套主題、
色盲模式、未來改配色就全都改不動了。顏色是 `tag + 參數 → role → token` 這條鏈的
末端產物，只存在於渲染層。

### 4.3 `text=` 是逃生口，不是常態

實測全庫：六百多個 key 中，同一個 key 需要顯示成不同中文的只有 **2 個**
（`Book` → 書（歷史）／書（禱文）／書（神秘學識）；`Druidic Focus` →
德魯伊法器（木棍））。**不到 1%**。

```
{@item Book text=書（歷史）}
```

不寫也不會壞（退回查表結果）。

### 4.4 什麼該當 tag、什麼該當參數

> **變體集合固定且小、變體名本身是好讀的名詞 → tag。
> 變體是某個維度上的取值、或集合開放 → 參數。**

檢驗：

- 11 種傷害元素是「傷害的元素維度」，渲染路徑相同、只有顏色不同 → **參數**。
  做成 11 個 tag 會讓 registry 憑空膨脹，且 tag 名綁死一個顏色。
- `spell`／`item`／`condition` 是固定小集合、名字本身說明了它是什麼 → **tag**。

**新增 tag 的門檻只有一條：它的渲染或互動行為和現有 12 個都不同。**
只是顏色不同、tooltip 內容不同、導向不同篩選條件 → 那是參數。

從參數升格成 tag 隨時可做且向後相容；把 tag 降級成參數要改所有資料。
**拿不定主意時一律先當參數。**

經驗數字：registry 若逼近 20 個，通常不是內容變豐富了，而是某個維度該抽成參數
卻做成了 tag——回頭檢查分類軸，別直接往下加。

### 4.5 為什麼保留 `{@ }` 這個形狀

- `{@` 兩字元觸發，誤判率趨近於零。裸 `{` 在中文行文裡幾乎不出現，但筆記裡貼
  JSON 或程式碼並非不可能，單靠 `{` 就得為此逸出。
- 閉合符明確，巢狀用深度計數就解得掉；不像 markdown 的 `*`／`_` 那種同一符號
  既開又關、永遠有歧義。
- 純文字 fallback 免費——壓平就能用於摘要、搜尋、匯出。

已知弱點：**閉合符沒有名字**，`{@hl 一段很長的文字…}` 讀到 `}` 時不知道關的是誰。
XML 式 `</hl>` 在這點上較好，但實測全庫巢狀只有 1 例——這種語法的實際形態是
「短標記散落在長文字中」，不是深層嵌套的樹，不值得為此換一套更冗長的語法。

附帶好處：`{@ }` 不像任何既有格式，所以不會誘使人「反正就是 HTML，直接
`dangerouslySetInnerHTML` 算了」。

---

## 五、分類維度

registry 是**唯一真相**，取代現行的 4 個 Set。每個 tag 有兩個欄位：

### `role` — 怎麼呈現

| role | 呈現 |
|---|---|
| `entity` | 強調色 + 導覽 |
| `state` | 虛線底線 + tooltip + 可套用到角色 |
| `term` | 虛線底線 + tooltip |
| `value` | 等寬強調 + 可點擊擲骰 |
| `emphasis` | 依 `as=` 套語意色 |
| `nav` | 站內跳轉 |

### `target` — 指向哪，決定 `role` 能不能真的互動

`role` 說「想讓它可點」，`target` 說「點得動嗎」。**這一維不能省**——少了它就會
做出一整頁點不動的連結，而且每次看到都要重新判斷那是 bug 還是未完成。

| target | tag | 說明 |
|---|---|---|
| `spells`／`items`／`feats`／`races` | entity 四個 | 有表，可導覽 |
| `entries` | `condition` | 15 種狀態齊全 |
| `glossary` | `term` | **目前無資料**，88 條術語待建 |
| `none` | （見下） | 永遠不會有，不是待辦 |

標成 `none` 的典型是怪物——依 content-scope 政策不涵蓋怪物，
`{@creature …}` 這類引用永遠導覽不到，匯入時直接降級為純文字。

---

## 六、與現行標記的對照

現行實作有 27 種 tag 實際出現在內容庫，本規格收斂為 12 個。

| 現行 | 新規格 | 處理 |
|---|---|---|
| `spell`／`item`／`feat`／`race` | 同名 | 保留 |
| `condition` | `condition` | 保留 |
| `variantrule`／`action`／`skill`／`sense`／`status`／`itemMastery`／`itemProperty`／`hazard` | `term kind=…` | **合併**，行為相同 |
| `dice`／`d20`／`chance` | `roll` | **合併**，都是「擲一顆骰」 |
| `damage` | `damage type=…` | 元素改為參數 |
| `scaledamage`／`scaledice` | `scale` | **合併**，形狀相同 |
| `dc` | `dc` | 保留 |
| `b`／`i`／`note` | `hl as=…` | **合併**，改為語意強調 |
| `filter` | `list` | 更名 |
| `hit` | — | **砍掉**，SRD 玩家內容 0 處（只出現在怪物數據塊） |
| `book`／`5etools` | — | **砍掉**，web-only app 裡點不了實體書與外部連結，降級純文字 |
| `creature`／`table` | — | **砍掉**，`target: none`，降級純文字 |
| 上游登記但 0 引用的 15 個 | — | **不開**（`deity`／`vehicle`／`trap`／`quickref` 等） |

---

## 七、待決事項

1. **glossary 資料來源**。`term` 的 88 條術語目前**沒有任何資料表**，
   在建好之前 `term` 只能是無互動的視覺強調。
2. **name map 的產生方式**。§4.1 那張 700 條的對照表要在建置時從內容庫產出，
   還是手工維護。
3. **`Cover` 這類 key 太粗的情況**。上游用同一個 key 指涉全掩蔽／半掩蔽／
   四分之三掩蔽三種不同規則，需要拆細。
4. **編輯器 UX**。自產內容的標記應該由選單插入而非手打，並要求往返無損
   （插入 → 渲染 → 再編輯還原成同樣的標記）。
5. **`golden/` 快照**。修正顯示錯誤會改動 `ft_plain_text.json` 等基準檔，
   屬於「移植正確但上游原本就錯」，須在手改記錄註明。

---

## 附錄 A：現行實作的 6 類顯示錯誤

實測 `ftPlainText()` 的輸出（2026-08-28，掃全部 9 張內容表）：

```
{@scaledamage 2d8|1-9|1d8}            ==>  1-9            應為 2d8
{@scaledice 2d4|3-9|1d4}              ==>  3-9            應為 2d4
{@filter 史詩恩賜專長|feats|category=EB}  ==>  category=EB    應為 史詩恩賜專長
{@book 第七章|XPHB|7}                  ==>  7              應為 第七章
{@5etools 專長|feats.html}             ==>  專長|feats.html
{@itemMastery Sap|XPHB|削弱}           ==>  Sap|XPHB|削弱
{@itemProperty L|XPHB|輕型}            ==>  L|XPHB|輕型
{@hazard extreme cold|XDMG}           ==>  extreme cold   缺中譯
{@chance 25|||隨機解讀！|正常解讀}         ==>  25             語意是 25%
```

| 問題 | 影響處數 |
|---|---|
| `filter` 顯示篩選條件 | 172 |
| `5etools` 漏出 `\|feats.html` | 63 |
| `scaledamage`／`scaledice` 顯示環數區間 | 58 |
| `chance` 顯示裸數字、`hazard` 缺中譯 | 12 |
| `book` 顯示章節數字 | 10 |
| `itemMastery`／`itemProperty` 漏出全部參數 | 6 |

其中 `scaledamage` 那 58 處是實際的傷害數值被換成 `1-9`，跑團當下最容易誤導。

## 附錄 B：內容庫標記現況統計

掃描 `spells`／`items`／`classes`／`subclasses`／`class_features`／`backgrounds`／
`races`／`feats`／`entries` 九張表（2026-08-28）。

| 標記 | 處數 | 標記 | 處數 | 標記 | 處數 |
|---|---|---|---|---|---|
| `variantrule` | 1000 | `feat` | 68 | `book` | 17 |
| `item` | 326 | `5etools` | 63 | `race` | 10 |
| `condition` | 277 | `dc` | 59 | `chance` | 10 |
| `spell` | 244 | `i` | 55 | `hazard` | 9 |
| `damage` | 225 | `scaledamage` | 52 | `scaledice` | 6 |
| `filter` | 172 | `creature` | 42 | `itemMastery` | 3 |
| `action` | 137 | `sense` | 27 | `itemProperty` | 3 |
| `skill` | 74 | `status` | 24 | `note` | 2 |
| `dice` | 72 | `b` | 19 | `table` | 1 |

**相異名詞數**（決定 glossary 規模）：

| 類別 | 相異名詞 | 引用處數 |
|---|---|---|
| `variantrule` | 54 | 1000 |
| `skill` | 17 | 74 |
| `action` | 11 | 137 |
| `sense` | 4 | 27 |
| `status` | 2 | 24 |
| **合計** | **88** | **1262** |

**可導覽性**：

| 標記 | 對應資料 |
|---|---|
| `spell`／`item`／`feat`／`race` | ✅ 各自的表 |
| `condition` | ✅ `entries` 表，15 種齊全 |
| `variantrule`／`action`／`skill`／`sense`／`status` | ❌ 無表，需建 glossary |
| `creature` | ❌ 依 content-scope 政策永遠不會有 |

**書源**：內容庫只有 `XPHB` 一個來源（spells 339／items 210／entries 44／feats 17），
因此標記不需要書源參數。文字中出現的 `XDMG`／`XMM` 是指向未收錄內容的引用。

## 附錄 C：不由標記負責的事

**傷害型別的顏色**目前不是靠標記，而是靠結構化欄位 `damageType` 查表：
`next/components/character/entry-card.tsx` 的 `DAMAGE_CLASS`（中英雙軌），
用於 `spell-card.tsx` 與 `decision/actions-section.tsx`，只給數值那一格上色。

注意上游文字裡 `{@damage 5d6} 寒冷傷害` 的「寒冷」在標記**外面**，所以現行標記
拿不到元素型別。本規格的 `{@damage 5d6 type=cold}` 把元素收進標記，兩條路徑才
能共用同一組 token。
