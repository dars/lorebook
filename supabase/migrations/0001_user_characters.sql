-- Lorebook 使用者角色資料（jsonb 文件 + 清單用提升欄位）
-- 同步策略：文件層級 last-write-wins；updated_at 由 trigger 維護；
-- 刪除採軟刪除（deleted_at tombstone），避免多裝置下被復活。

create table if not exists public.user_characters (
  id          uuid primary key,                 -- 客戶端產生（Character.id）
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  -- 提升欄位：角色選擇頁清單用，不必下載整份文件
  name        text not null default '',
  class_name  text not null default '',
  level       smallint not null default 1,
  data        jsonb not null,                   -- 完整 Character.toJson()
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists user_characters_user_idx
  on public.user_characters (user_id);

-- updated_at 由 server 維護（LWW 紀錄用，不信客戶端時鐘）
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_characters_updated_at on public.user_characters;
create trigger user_characters_updated_at
  before update on public.user_characters
  for each row execute function public.set_updated_at();

-- RLS：只能存取自己的角色
alter table public.user_characters enable row level security;

drop policy if exists "own select" on public.user_characters;
create policy "own select" on public.user_characters
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own insert" on public.user_characters;
create policy "own insert" on public.user_characters
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own update" on public.user_characters;
create policy "own update" on public.user_characters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own delete" on public.user_characters;
create policy "own delete" on public.user_characters
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 使用者資料不開放匿名角色
grant select, insert, update, delete on public.user_characters to authenticated;
revoke all on public.user_characters from anon;
