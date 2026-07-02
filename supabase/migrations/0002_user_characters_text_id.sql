-- App 端的 Character.id 為客戶端字串（timestamp / 'mock-*'），非 uuid。
-- 改為 text，並以 (user_id, id) 複合主鍵避免跨使用者撞號。

alter table public.user_characters
  drop constraint user_characters_pkey;

alter table public.user_characters
  alter column id type text;

alter table public.user_characters
  add primary key (user_id, id);
