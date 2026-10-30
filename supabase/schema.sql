create table couples(id uuid primary key default gen_random_uuid(), code text unique not null, created_at timestamptz default now());
create table members(
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples on delete cascade,
  name text not null, pin_hash text not null, panic_hash text not null,
  failed int default 0, locked_until timestamptz, unique(couple_id,name));
-- one table for every kind: lovelang, checkin, promise, date, story, letter, dream, sync
create table items(
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples on delete cascade,
  author uuid not null references members,
  kind text not null, payload jsonb not null default '{}',
  sealed_until timestamptz, needs_both boolean default false,
  opened_by uuid[] default '{}', created_at timestamptz default now());
create index on items(couple_id,kind,created_at desc);
-- RLS on, no policies: only the server (service key) can touch data
alter table couples enable row level security;
alter table members enable row level security;
alter table items enable row level security;
