-- Lorebook 角色卡分享（唯讀、活資料）。
--
-- 存取模型：**授權表 ＋ SECURITY DEFINER 函式**，與 own-row 慣例不同。
-- character_shares 本身仍是 own-row RLS 且 revoke all from anon——此表對外
-- 完全不可讀，檢視者不查表，只呼叫 public.get_shared_character(token)。
-- 該函式在 definer 權限下 join user_characters 並自行驗證全部失效條件，
-- 因此 user_characters 的欄位、RLS、grant 一律不動（anon 存取面維持為零）。
--
-- 分享的是**活資料**而非快照：每次呼叫都讀 user_characters 當下的內容。
-- 首版刻意不設有效期限（見 openspec design D3a）——分享建立後持續有效，
-- 直到擁有者手動撤銷。日後要加期限是純附加（nullable expires_at ＋
-- 函式多一條判斷），既有資料不需遷移。

create table if not exists public.character_shares (
  token       text primary key,                 -- 128-bit 隨機（base64url，22 字元）
  owner_id    uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  character_id text not null,                   -- 對應 user_characters.id（主鍵為 (user_id, id)）
  label       text,                             -- 分享對象備註，僅擁有者可讀；函式不回傳
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz                       -- 非 null = 已撤銷
);

-- 擁有者查自己某角色的分享清單
create index if not exists character_shares_owner_idx
  on public.character_shares (owner_id);

create index if not exists character_shares_owner_character_idx
  on public.character_shares (owner_id, character_id);

-- RLS：授權表對外完全不可讀，只有擁有者能建立、查看與撤銷自己的分享
alter table public.character_shares enable row level security;

drop policy if exists "own select" on public.character_shares;
create policy "own select" on public.character_shares
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "own insert" on public.character_shares;
create policy "own insert" on public.character_shares
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "own update" on public.character_shares;
create policy "own update" on public.character_shares
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "own delete" on public.character_shares;
create policy "own delete" on public.character_shares
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.character_shares to authenticated;
revoke all on public.character_shares from anon;

-- 憑 token 取回角色活資料。
--
-- SECURITY DEFINER：這是唯一的授權判斷點，RLS 不再構成第二道防線，
-- 因此以下約束為硬性要求——
--   * search_path = ''，所有物件全名限定
--   * 唯一參數為 token，不接受任何可影響查詢範圍的參數
--   * 無動態 SQL，回傳形狀固定
--   * 回傳前自行驗證全部失效條件（撤銷、來源角色軟刪除、不存在）
--   * 不回傳 owner_id / label，或任何關於「這個 token 屬於誰」的資訊
--
-- status 值：'ok' | 'revoked' | 'deleted' | 'not_found'
-- data 僅在 status = 'ok' 時為非 null。
create or replace function public.get_shared_character(p_token text)
returns table (status text, data jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_share  public.character_shares%rowtype;
  v_data   jsonb;
begin
  select * into v_share
  from public.character_shares s
  where s.token = p_token;

  if not found then
    return query select 'not_found'::text, null::jsonb;
    return;
  end if;

  if v_share.revoked_at is not null then
    return query select 'revoked'::text, null::jsonb;
    return;
  end if;

  select c.data into v_data
  from public.user_characters c
  where c.user_id = v_share.owner_id
    and c.id = v_share.character_id
    and c.deleted_at is null;

  if v_data is null then
    return query select 'deleted'::text, null::jsonb;
    return;
  end if;

  return query select 'ok'::text, v_data;
end;
$$;

-- 檢視者可能未登入（掃碼的隊友沒裝 App、沒帳號）
revoke all on function public.get_shared_character(text) from public;
grant execute on function public.get_shared_character(text) to anon, authenticated;
