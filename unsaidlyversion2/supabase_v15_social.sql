-- Pigpic V15: public profiles + private messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists messages_sender_idx on messages(sender_id, created_at desc);
create index if not exists messages_recipient_idx on messages(recipient_id, created_at desc);
create index if not exists messages_pair_idx on messages(sender_id, recipient_id, created_at desc);

alter table messages enable row level security;

drop policy if exists "Users can view own messages" on messages;
drop policy if exists "Users can send messages" on messages;
drop policy if exists "Users can mark received messages read" on messages;

create policy "Users can view own messages" on messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages" on messages
  for insert with check (auth.uid() = sender_id);

create policy "Users can mark received messages read" on messages
  for update using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Message notifications are generated server-side.
create or replace function pigpic_message_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, actor_id, type)
  values(new.recipient_id, new.sender_id, 'message');
  return new;
end $$;

drop trigger if exists trg_message_notify on messages;
create trigger trg_message_notify after insert on messages
for each row execute function pigpic_message_notify();
