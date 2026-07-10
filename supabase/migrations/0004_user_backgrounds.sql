-- Lorebook 使用者自訂背景（homebrew）：文件模式比照 user_characters。
-- 同步策略：文件層級 last-write-wins；updated_at 由 trigger 維護；
-- 刪除採軟刪除（deleted_at tombstone），避免多裝置下被復活。
-- 角色卡為建卡時快照，自訂背景刪改不影響既有角色。

create table if not exists public.user_backgrounds (
  id          text primary key,                 -- 客戶端產生
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  -- 提升欄位：選項清單用，不必下載整份文件
  name        text not null default '',
  data        jsonb not null,                   -- 完整 CustomBackground.toJson()
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists user_backgrounds_user_idx
  on public.user_backgrounds (user_id);

-- updated_at 由 server 維護（複用 0001 的 set_updated_at）
drop trigger if exists user_backgrounds_updated_at on public.user_backgrounds;
create trigger user_backgrounds_updated_at
  before update on public.user_backgrounds
  for each row execute function public.set_updated_at();

-- RLS：只能存取自己的自訂背景
alter table public.user_backgrounds enable row level security;

drop policy if exists "own select" on public.user_backgrounds;
create policy "own select" on public.user_backgrounds
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own insert" on public.user_backgrounds;
create policy "own insert" on public.user_backgrounds
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own update" on public.user_backgrounds;
create policy "own update" on public.user_backgrounds
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own delete" on public.user_backgrounds;
create policy "own delete" on public.user_backgrounds
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 使用者資料不開放匿名角色
grant select, insert, update, delete on public.user_backgrounds to authenticated;
revoke all on public.user_backgrounds from anon;
