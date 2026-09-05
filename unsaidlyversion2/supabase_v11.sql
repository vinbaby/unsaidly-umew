-- Pigpic V11: performance + search + notification indexes
create index if not exists posts_created_at_idx on posts(created_at desc);
create index if not exists posts_status_created_idx on posts(status, created_at desc);
create index if not exists posts_caption_lower_idx on posts(lower(caption));
create index if not exists likes_post_idx on likes(post_id);
create index if not exists follows_following_idx on follows(following_id);
create index if not exists follows_follower_idx on follows(follower_id);
create index if not exists board_items_post_idx on board_items(post_id);
create index if not exists notifications_unread_idx on notifications(user_id, read_at, created_at desc);

-- Make sure thumbnail column exists even if V10 SQL was skipped.
alter table posts add column if not exists thumb_key text;
