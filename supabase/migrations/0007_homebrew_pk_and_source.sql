-- homebrew 兩表的主鍵對齊，並補上「這份是收藏來的」所需的三個欄位。
--
-- ## 主鍵改為 (user_id, id)
--
-- 與 0002 對 user_characters 做的是同一件事，理由也相同：id 由客戶端產生，
-- 早期是時間戳（1783655557961351），跨使用者可能撞號——先建的那筆會擋住
-- 後建的那筆，而錯誤會出現在受害者身上。0002 當時只修了角色，沒推及之後
-- 才建的這兩張表。
--
-- 現在改幾乎沒有成本（背景 8 筆、子職 0 筆），再拖就是等資料長出來以後
-- 才被迫處理。id 值本身不動——複合主鍵不需要重新產生 id。
--
-- ## source_* 三欄
--
-- 收藏他人分享的內容時，複製一份到收藏者自己的表；這三欄記錄那份副本的
-- 來歷。**不回連來源**：source_token 只用於「來源更新了沒」的比對與去重
-- 提示，不是外鍵，來源刪掉也不影響副本（見 openspec homebrew-share D2）。
--
--   source_token       非 null 即「收藏而來」，null 即自建
--   source_updated_at  收藏當下來源的 updated_at；來源之後比這新就是有更新
--   source_note        收藏者自填的備註，即來源標記本身（D7）
--
-- 一律 nullable 且不回填：既有資料全是自建的，null 正是正確答案。

alter table public.user_backgrounds
  drop constraint user_backgrounds_pkey;

alter table public.user_backgrounds
  add primary key (user_id, id);

alter table public.user_subclasses
  drop constraint user_subclasses_pkey;

alter table public.user_subclasses
  add primary key (user_id, id);

alter table public.user_backgrounds
  add column if not exists source_token      text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists source_note       text;

alter table public.user_subclasses
  add column if not exists source_token      text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists source_note       text;

-- 「這個 token 我是不是已經收過了」——收藏前的重複提示會走這條路徑。
create index if not exists user_backgrounds_source_idx
  on public.user_backgrounds (user_id, source_token)
  where source_token is not null;

create index if not exists user_subclasses_source_idx
  on public.user_subclasses (user_id, source_token)
  where source_token is not null;
