-- Pigpic V10: thumbnail key for fast feed loading
alter table posts add column if not exists thumb_key text;
