-- UNSAIDLY GLOBAL CHAT
-- MVP database setup. Public anon chat is inherently abuse-prone; this adds a basic
-- per-browser-ID limiter but is NOT a substitute for server-side IP/Turnstile protection.

create extension if not exists pgcrypto;

create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  nickname text not null,
  body text not null check (char_length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists global_chat_messages_created_at_idx
  on public.global_chat_messages (created_at desc);
create index if not exists global_chat_messages_anon_recent_idx
  on public.global_chat_messages (anon_id, created_at desc);

create table if not exists public.global_chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.global_chat_messages(id) on delete cascade,
  reporter_anon_id text not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 250),
  created_at timestamptz not null default now()
);

alter table public.global_chat_messages enable row level security;
alter table public.global_chat_reports enable row level security;

drop policy if exists "Anyone can read global chat" on public.global_chat_messages;
create policy "Anyone can read global chat"
  on public.global_chat_messages for select to anon, authenticated using (true);

-- Writes are intentionally routed through the Cloudflare Worker, which validates
-- Turnstile and uses the Supabase service key server-side.
drop policy if exists "Anonymous users can send global chat messages" on public.global_chat_messages;
drop policy if exists "Anyone can submit a report" on public.global_chat_reports;
revoke insert, update, delete on public.global_chat_messages from anon, authenticated;
revoke insert, update, delete on public.global_chat_reports from anon, authenticated;
grant select on public.global_chat_messages to anon, authenticated;

-- Basic per-anonymous-ID throttling. Users can reset/spoof browser IDs, so this is
-- only a first layer. Add Turnstile + Edge Function/Worker IP-based limits before launch.
create or replace function public.limit_global_chat_rate()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1 from public.global_chat_messages
    where anon_id = new.anon_id
      and created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Please wait a moment before sending another message.';
  end if;

  if (
    select count(*) from public.global_chat_messages
    where anon_id = new.anon_id
      and created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'Message limit reached. Please wait before sending more.';
  end if;

  return new;
end;
$$;

drop trigger if exists global_chat_rate_limit on public.global_chat_messages;
create trigger global_chat_rate_limit
before insert on public.global_chat_messages
for each row execute function public.limit_global_chat_rate();

-- Idempotently add the table to Supabase Realtime.
do $realtime$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_chat_messages'
  ) then
    alter publication supabase_realtime add table public.global_chat_messages;
  end if;
end $realtime$;

-- Suggested retention (run manually after choosing a retention period):
-- delete from public.global_chat_messages where created_at < now() - interval '30 days';
