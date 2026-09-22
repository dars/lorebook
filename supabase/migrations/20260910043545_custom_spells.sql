-- Lorebook 使用者自訂法術（homebrew）：文件模式比照 user_backgrounds。
-- 同步策略：文件層級 last-write-wins；updated_at 由 trigger 維護；
-- 刪除採軟刪除（deleted_at tombstone），避免多裝置下被復活。
-- 角色卡為建卡時快照，自訂法術刪改不影響既有角色。
--
-- 與 0004／0006 的差別只有兩處，都是後來才補對的東西，新表直接做對：
--   * 主鍵一開始就是 (user_id, id)——0007 為既有兩表補過同一件事
--   * source_* 三欄一開始就在——收藏他人分享時記錄副本的來歷（0007）

create table if not exists public.user_spells (
  id          text not null,                    -- 客戶端產生的 128-bit 隨機值
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  -- 提升欄位：選項清單用，不必下載整份文件
  name        text not null default '',
  data        jsonb not null,                   -- 完整 CustomSpell
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  -- 收藏而來的副本才有值；不是外鍵，來源刪掉不影響副本（見 0007 檔頭）
  source_token      text,
  source_updated_at timestamptz,
  source_note       text,
  primary key (user_id, id)
);

create index if not exists user_spells_user_idx
  on public.user_spells (user_id);

-- 「這個 token 我是不是已經收過了」
create index if not exists user_spells_source_idx
  on public.user_spells (user_id, source_token)
  where source_token is not null;

-- updated_at 由 server 維護（複用 0001 的 set_updated_at）
drop trigger if exists user_spells_updated_at on public.user_spells;
create trigger user_spells_updated_at
  before update on public.user_spells
  for each row execute function public.set_updated_at();

-- RLS：只能存取自己的自訂法術
alter table public.user_spells enable row level security;

drop policy if exists "own select" on public.user_spells;
create policy "own select" on public.user_spells
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own insert" on public.user_spells;
create policy "own insert" on public.user_spells
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own update" on public.user_spells;
create policy "own update" on public.user_spells
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own delete" on public.user_spells;
create policy "own delete" on public.user_spells
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 使用者資料不開放匿名角色
grant select, insert, update, delete on public.user_spells to authenticated;
revoke all on public.user_spells from anon;

-- ── 分享：0008 預留的「法術解凍後加一支」 ────────────────────────
--
-- kind 的 check 與 get_shared_homebrew 的分派各補一筆即可，形狀不動。

alter table public.homebrew_shares
  drop constraint if exists homebrew_shares_kind_check;

alter table public.homebrew_shares
  add constraint homebrew_shares_kind_check
  check (kind in ('background', 'subclass', 'species', 'spell'));

-- 函式全文重貼（create or replace 不接受部分更新）。約束與 0008 相同：
-- search_path = ''、無動態 SQL、回傳形狀固定、不洩漏擁有者資訊。
create or replace function public.get_shared_homebrew(p_token text)
returns table (status text, kind text, data jsonb, source_updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share   public.homebrew_shares%rowtype;
  v_data    jsonb;
  v_updated timestamptz;
begin
  select * into v_share
  from public.homebrew_shares s
  where s.token = p_token;

  if not found then
    return query select 'not_found'::text, null::text, null::jsonb, null::timestamptz;
    return;
  end if;

  if v_share.revoked_at is not null then
    return query select 'revoked'::text, null::text, null::jsonb, null::timestamptz;
    return;
  end if;

  if v_share.kind = 'background' then
    select b.data, b.updated_at into v_data, v_updated
    from public.user_backgrounds b
    where b.user_id = v_share.owner_id
      and b.id = v_share.homebrew_id
      and b.deleted_at is null;
  elsif v_share.kind = 'subclass' then
    select s.data, s.updated_at into v_data, v_updated
    from public.user_subclasses s
    where s.user_id = v_share.owner_id
      and s.id = v_share.homebrew_id
      and s.deleted_at is null;
  elsif v_share.kind = 'species' then
    select sp.data, sp.updated_at into v_data, v_updated
    from public.user_species sp
    where sp.user_id = v_share.owner_id
      and sp.id = v_share.homebrew_id
      and sp.deleted_at is null;
  elsif v_share.kind = 'spell' then
    select sp.data, sp.updated_at into v_data, v_updated
    from public.user_spells sp
    where sp.user_id = v_share.owner_id
      and sp.id = v_share.homebrew_id
      and sp.deleted_at is null;
  end if;

  -- 來源被軟刪除，或 kind 是這個版本還不認得的型別（舊 App 開新型別的連結）。
  -- 兩者對檢視者是同一件事：這個連結現在給不出內容。
  if v_data is null then
    return query select 'deleted'::text, null::text, null::jsonb, null::timestamptz;
    return;
  end if;

  return query select 'ok'::text, v_share.kind, v_data, v_updated;
end;
$$;

revoke all on function public.get_shared_homebrew(text) from public;
grant execute on function public.get_shared_homebrew(text) to anon, authenticated;
