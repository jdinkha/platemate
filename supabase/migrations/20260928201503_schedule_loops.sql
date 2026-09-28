-- Lets a split follow a repeating loop (e.g. Upper → Rest → Lower → Rest)
-- instead of fixed weekdays.
--
-- In a loop, rest days always pass, but a missed workout stays next in line
-- until it's done or skipped. The app works out where the loop is from the
-- split's active_from, loop_start and the user's workout_sessions.

create type public.schedule_type_enum as enum ('weekly', 'loop');

alter table public.splits
  add column schedule_type public.schedule_type_enum not null default 'weekly',
  -- For loops: the entry (by position, 0-based) the loop is on at active_from.
  add column loop_start smallint not null default 0,
  add constraint splits_loop_start_check check (loop_start >= 0);

-- The loop, in order. A row with no split day is a rest day.
create table public.split_loop_entries (
  split_id uuid not null references public.splits (id) on update cascade on delete cascade,
  position smallint not null check (position >= 0),
  split_day_id uuid references public.split_days (id) on update cascade on delete cascade,
  primary key (split_id, position)
);

create index split_loop_entries_split_day_id_idx on public.split_loop_entries (split_day_id);

alter table public.split_loop_entries enable row level security;

create policy "Users can read their split loops" on public.split_loop_entries
  for select to authenticated
  using (exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid())));

-- Workouts in a loop must come from the same split.
create policy "Users can add to their split loops" on public.split_loop_entries
  for insert to authenticated
  with check (
    exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid()))
    and (
      split_day_id is null
      or exists (
        select 1 from public.split_days d
        where d.id = split_day_id and d.split_id = split_loop_entries.split_id
      )
    )
  );

-- Loops are never edited in place: a changed loop is saved as a new split
-- starting today, so only reading and adding are needed.
revoke all on table public.split_loop_entries from anon, authenticated;
grant select, insert on table public.split_loop_entries to authenticated;
