-- 角色圖儲存：portraits bucket（公開讀；寫入僅限本人目錄）。
-- 路徑慣例：{user_id}/{character_id}.jpg（覆蓋制，不累積孤兒檔）。
-- 注意：storage 的 upsert 需要 INSERT + SELECT + UPDATE 三種權限。

insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

drop policy if exists "portraits read" on storage.objects;
create policy "portraits read" on storage.objects
  for select to authenticated
  using (bucket_id = 'portraits');

drop policy if exists "portraits own insert" on storage.objects;
create policy "portraits own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portraits own update" on storage.objects;
create policy "portraits own update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portraits own delete" on storage.objects;
create policy "portraits own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
