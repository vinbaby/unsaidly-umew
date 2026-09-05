alter table profiles add column if not exists cover_url text;
create index if not exists profiles_username_idx on profiles(username);
