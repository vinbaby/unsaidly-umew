-- Pigpic V5 database upgrade
alter table profiles add column if not exists is_private boolean default false;
alter table profiles add column if not exists age_confirmed boolean default false;
alter table posts add column if not exists tags text[] default '{}';
alter table posts add column if not exists is_nsfw boolean default false;
alter table posts add column if not exists likes_count integer default 0;
alter table posts add column if not exists saves_count integer default 0;
alter table posts add column if not exists views_count integer default 0;

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete cascade,
  type text not null,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists posts_created_at_idx on posts(created_at desc);
create index if not exists posts_likes_count_idx on posts(likes_count desc);
create index if not exists posts_tags_idx on posts using gin(tags);
create index if not exists blocks_blocker_idx on blocks(blocker_id);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

alter table blocks enable row level security;
alter table notifications enable row level security;

-- New policies only; safe to re-run.
drop policy if exists "Users can create own blocks" on blocks;
drop policy if exists "Users can view own blocks" on blocks;
drop policy if exists "Users can remove own blocks" on blocks;
create policy "Users can create own blocks" on blocks for insert with check (auth.uid() = blocker_id);
create policy "Users can view own blocks" on blocks for select using (auth.uid() = blocker_id);
create policy "Users can remove own blocks" on blocks for delete using (auth.uid() = blocker_id);

drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users can update their own profile fields.
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users can update/delete their own posts (existing policies may already exist).
drop policy if exists "Users can update own posts" on posts;
drop policy if exists "Users can delete own posts" on posts;
create policy "Users can update own posts" on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own posts" on posts for delete using (auth.uid() = user_id);

-- Automatic counters + notifications. Triggers run server-side so users cannot forge counts.
create or replace function pigpic_like_counter() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = coalesce(likes_count,0) + 1 where id = new.post_id;
    insert into notifications(user_id, actor_id, type, post_id)
      select p.user_id, new.user_id, 'like', new.post_id from posts p
      where p.id = new.post_id and p.user_id <> new.user_id;
    return new;
  else
    update posts set likes_count = greatest(coalesce(likes_count,0) - 1, 0) where id = old.post_id;
    return old;
  end if;
end $$;

drop trigger if exists trg_like_counter on likes;
create trigger trg_like_counter after insert or delete on likes for each row execute function pigpic_like_counter();

create or replace function pigpic_save_counter() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; pid uuid;
begin
  if tg_op = 'INSERT' then
    select user_id into uid from boards where id = new.board_id;
    pid := new.post_id;
    update posts set saves_count = coalesce(saves_count,0) + 1 where id = pid;
    return new;
  else
    select user_id into uid from boards where id = old.board_id;
    pid := old.post_id;
    update posts set saves_count = greatest(coalesce(saves_count,0) - 1, 0) where id = pid;
    return old;
  end if;
end $$;

drop trigger if exists trg_save_counter on board_items;
create trigger trg_save_counter after insert or delete on board_items for each row execute function pigpic_save_counter();

create or replace function pigpic_follow_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications(user_id, actor_id, type) values(new.following_id, new.follower_id, 'follow');
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_follow_notify on follows;
create trigger trg_follow_notify after insert on follows for each row execute function pigpic_follow_notify();
