-- UNSAIDLY GLOBAL CHAT
-- Run in Supabase SQL Editor. This MVP permits public anonymous chat inserts.
-- Apply strict rate limiting / Turnstile / Edge Function before large public launch.

create extension if not exists pgcrypto;

create table if not exists public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  nickname text not null,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists global_chat_messages_created_at_idx
  on public.global_chat_messages (created_at desc);

create table if not exists public.global_chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.global_chat_messages(id) on delete cascade,
  reporter_anon_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.global_chat_messages enable row level security;
alter table public.global_chat_reports enable row level security;

drop policy if exists "Anyone can read global chat" on public.global_chat_messages;
create policy "Anyone can read global chat"
  on public.global_chat_messages for select to anon, authenticated using (true);

drop policy if exists "Anonymous users can send global chat messages" on public.global_chat_messages;
create policy "Anonymous users can send global chat messages"
  on public.global_chat_messages for insert to anon, authenticated
  with check (char_length(body) between 1 and 600 and char_length(nickname) between 1 and 40 and char_length(anon_id) between 8 and 80);

drop policy if exists "Anyone can submit a report" on public.global_chat_reports;
create policy "Anyone can submit a report"
  on public.global_chat_reports for insert to anon, authenticated
  with check (char_length(reason) between 1 and 250 and char_length(reporter_anon_id) between 8 and 80);

-- Keep messages from becoming an unbounded archive (adjust retention as desired).
-- Enable Realtime on the message table:
alter publication supabase_realtime add table public.global_chat_messages;
