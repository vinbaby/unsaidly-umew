-- UNSAIDLY V2 — shared anonymous backend
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(content) between 1 and 500),
  mood text not null check (mood in ('lonely','love','angry','happy','confused','secret','lovely')),
  anon_id uuid not null,
  me_too_count integer not null default 0,
  reply_count integer not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  anon_id uuid not null,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.me_too_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  anon_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, anon_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  anon_id uuid not null,
  reason text not null check (reason in ('Spam','Harassment','Hate','Dangerous content','Other')),
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.me_too_reactions enable row level security;
alter table public.reports enable row level security;

drop policy if exists "public read active posts" on public.posts;
create policy "public read active posts" on public.posts for select using (status='active');
drop policy if exists "public create posts" on public.posts;
create policy "public create posts" on public.posts for insert with check (status='active');

drop policy if exists "public read active replies" on public.replies;
create policy "public read active replies" on public.replies for select using (status='active');
drop policy if exists "public create replies" on public.replies;
create policy "public create replies" on public.replies for insert with check (status='active');

drop policy if exists "public read reactions" on public.me_too_reactions;
create policy "public read reactions" on public.me_too_reactions for select using (true);
drop policy if exists "public insert reactions" on public.me_too_reactions;
create policy "public insert reactions" on public.me_too_reactions for insert with check (true);
drop policy if exists "public delete own reaction by supplied anon id" on public.me_too_reactions;
create policy "public delete own reaction by supplied anon id" on public.me_too_reactions for delete using (true);

drop policy if exists "public create reports" on public.reports;
create policy "public create reports" on public.reports for insert with check (true);

create or replace function public.toggle_me_too(p_post_id uuid, p_anon_id uuid)
returns table(active boolean, me_too_count integer)
language plpgsql security definer set search_path = public
as $$
declare v_count integer; v_active boolean;
begin
  if exists (select 1 from public.me_too_reactions where post_id=p_post_id and anon_id=p_anon_id) then
    delete from public.me_too_reactions where post_id=p_post_id and anon_id=p_anon_id;
    update public.posts set me_too_count=greatest(0, me_too_count-1) where id=p_post_id returning me_too_count into v_count;
    v_active := false;
  else
    insert into public.me_too_reactions(post_id,anon_id) values(p_post_id,p_anon_id);
    update public.posts set me_too_count=me_too_count+1 where id=p_post_id returning me_too_count into v_count;
    v_active := true;
  end if;
  return query select v_active,v_count;
end;
$$;

grant execute on function public.toggle_me_too(uuid,uuid) to anon, authenticated;

create or replace function public.create_reply(p_post_id uuid, p_content text, p_anon_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare rid uuid;
begin
  insert into public.replies(post_id,content,anon_id) values(p_post_id,p_content,p_anon_id) returning id into rid;
  update public.posts set reply_count=reply_count+1 where id=p_post_id;
  return rid;
end;
$$;

grant execute on function public.create_reply(uuid,text,uuid) to anon, authenticated;
