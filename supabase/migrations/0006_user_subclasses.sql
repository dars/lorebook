-- Lorebook 使用者自訂子職業（homebrew）：文件模式比照 user_backgrounds。
-- 同步策略：文件層級 last-write-wins；updated_at 由 trigger 維護；
-- 刪除採軟刪除（deleted_at tombstone），避免多裝置下被復活。
--
-- 角色卡於選用時快照**整份**子職定義（含所有等級的特性），後續等級升級一律
-- 自快照取用而不回查本表——使用者可能已刪除該子職，回查會讓角色升不上去。
--
-- 刻意不做通用的 user_homebrew（kind 欄位）：每種 homebrew 的提升欄位不同
-- （背景沒有 class_en），通用表只能把它們都塞進 jsonb，查詢反而變差。
-- shared_homebrew 用 kind 是對的，因為那是快照表——所有型別在那裡都只是
-- 不可變的 JSON，沒有各自的查詢需求。來源表與快照表的取捨不同。

create table if not exists public.user_subclasses (
  id          text primary key,                 -- 客戶端產生
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  -- 提升欄位：選項清單用，不必下載整份文件
  name        text not null default '',
  -- 母職業英文名（Fighter/Cleric…）。角色卡存的是 classNameEn，且 classes
  -- 表的中文名欄位中英混雜不可靠，一律以英文名為關聯鍵。
  class_en    text not null default '',
  data        jsonb not null,                   -- 完整 CustomSubclass
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists user_subclasses_user_idx
  on public.user_subclasses (user_id);

-- 升級時依母職業篩選，該組合是主要查詢路徑
create index if not exists user_subclasses_user_class_idx
  on public.user_subclasses (user_id, class_en);

-- updated_at 由 server 維護（複用 0001 的 set_updated_at）
drop trigger if exists user_subclasses_updated_at on public.user_subclasses;
create trigger user_subclasses_updated_at
  before update on public.user_subclasses
  for each row execute function public.set_updated_at();

-- RLS：只能存取自己的自訂子職
alter table public.user_subclasses enable row level security;

drop policy if exists "own select" on public.user_subclasses;
create policy "own select" on public.user_subclasses
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own insert" on public.user_subclasses;
create policy "own insert" on public.user_subclasses
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own update" on public.user_subclasses;
create policy "own update" on public.user_subclasses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own delete" on public.user_subclasses;
create policy "own delete" on public.user_subclasses
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 使用者資料不開放匿名角色
grant select, insert, update, delete on public.user_subclasses to authenticated;
revoke all on public.user_subclasses from anon;
