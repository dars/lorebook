-- Lorebook 自創內容（homebrew）分享：唯讀、活資料、統一入口。
--
-- 存取模型與 0005 的 character_shares 完全相同——授權表 ＋ SECURITY DEFINER
-- 函式；表本身 own-row RLS 且 revoke all from anon，檢視者不查表，只呼叫
-- public.get_shared_homebrew(token)。來源表（user_backgrounds /
-- user_subclasses）的欄位、RLS、grant 一律不動，anon 存取面維持為零。
--
-- ## 這是指標表，不是快照表
--
-- 0006 的檔頭曾寫著「shared_homebrew 是快照表」，那個設計已被推翻（見
-- openspec homebrew-share design D4）：分享連結指向作者**當下**的資料。
-- 作者依 DM 要求調完數值，同一個連結與已經貼在 Discord 的 QR code 自動
-- 反映最新版，不必重發。
--
-- 「作者偷改」的顧慮由收藏那一層擋掉——收藏是複製，複製完就與來源脫鉤，
-- 暴露窗口只存在於「看到」到「收藏」之間。DM 要留審核存證，核准時自己也
-- 收一份即可。
--
-- 因此 kind 存在的理由不是「所有型別在這裡都只是不可變的 JSON」，而是
-- **決定去哪張來源表查**。
--
-- 首版型別範圍為背景與子職（D10）；種族解凍後在 check 與函式各加一支即可。

create table if not exists public.homebrew_shares (
  token       text primary key,                 -- 128-bit 隨機（base64url，22 字元）
  owner_id    uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  kind        text not null
              check (kind in ('background', 'subclass')),
  homebrew_id text not null,                    -- 對應來源表的 id（主鍵為 (user_id, id)）
  label       text,                             -- 分享對象備註，僅擁有者可讀；函式不回傳
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz                       -- 非 null = 已撤銷
);

-- 擁有者查自己某份內容的分享狀態（收藏紀錄頁每個項目都要問一次）
create index if not exists homebrew_shares_owner_idx
  on public.homebrew_shares (owner_id);

create index if not exists homebrew_shares_owner_item_idx
  on public.homebrew_shares (owner_id, kind, homebrew_id);

-- RLS：授權表對外完全不可讀，只有擁有者能建立、查看與撤銷自己的分享
alter table public.homebrew_shares enable row level security;

drop policy if exists "own select" on public.homebrew_shares;
create policy "own select" on public.homebrew_shares
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "own insert" on public.homebrew_shares;
create policy "own insert" on public.homebrew_shares
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "own update" on public.homebrew_shares;
create policy "own update" on public.homebrew_shares
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "own delete" on public.homebrew_shares;
create policy "own delete" on public.homebrew_shares
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.homebrew_shares to authenticated;
revoke all on public.homebrew_shares from anon;

-- 憑 token 取回自創內容的活資料。
--
-- SECURITY DEFINER：這是唯一的授權判斷點，RLS 不再構成第二道防線，
-- 因此以下約束為硬性要求（與 get_shared_character 相同）——
--   * search_path = ''，所有物件全名限定
--   * 唯一參數為 token，不接受任何可影響查詢範圍的參數
--   * 無動態 SQL，回傳形狀固定；kind 以 if 分派而非拼接表名
--   * 回傳前自行驗證全部失效條件（撤銷、來源軟刪除、不存在）
--   * 不回傳 owner_id / label，或任何關於「這個 token 屬於誰」的資訊
--
-- 不回傳 rules_version：雙規則版本（dual-rules-version）尚未定案，把一個
-- 推定值寫進 API 契約，之後改就是破壞性變更。
--
-- source_updated_at 回傳的是**來源當下的 updated_at**，收藏者原樣存進自己
-- 那份副本的 source_updated_at；日後比對這兩個值就知道來源有沒有更新。
--
-- status 值：'ok' | 'revoked' | 'deleted' | 'not_found'
-- kind / data / source_updated_at 僅在 status = 'ok' 時為非 null。
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

-- 檢視者可能未登入（拿到連結時還沒有帳號）
revoke all on function public.get_shared_homebrew(text) from public;
grant execute on function public.get_shared_homebrew(text) to anon, authenticated;
