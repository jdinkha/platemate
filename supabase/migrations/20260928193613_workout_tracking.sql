-- Updates the schema built in the table editor (20260928192323_remote_schema.sql)
-- so the PlateMate app can use it. No tables are created or dropped.
--
-- How the app uses the tables:
--   profiles         one row per user: name, goal, unit, time zone, week start
--   splits           a user's split. Each change of split or weekly schedule
--                    starts a new row with `active_from`, so past days are
--                    judged against the split that was active at the time
--   split_days       the workouts in a split (Push, Pull, …)
--   split_day_exercises / split_day_schedule
--                    each workout's exercises and targets, and its weekdays
--   exercises        exercise library; users own the exercises they log
--   workout_sessions one row per user per day: completed, skipped or a break
--   set_logs         the sets logged in a session, stored in kilograms

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- A rest day the user chooses to take. Unlike 'skipped', it doesn't count as
-- a missed workout. (New enum values can't be used in this same transaction,
-- and nothing below uses it.)
alter type public.status_enum add value if not exists 'break';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

update public.profiles set goal = 'mass' where goal is null;
update public.profiles set unit_preference = 'lbs' where unit_preference is null;
update public.profiles set timezone = 'UTC' where timezone is null or timezone = '';

alter table public.profiles
  alter column goal set default 'mass',
  alter column goal set not null,
  alter column unit_preference set default 'lbs',
  alter column unit_preference set not null,
  alter column timezone set default 'UTC',
  alter column timezone set not null,
  -- 0 = Sunday, 1 = Monday
  add column week_starts_on smallint not null default 1,
  add constraint profiles_week_starts_on_check check (week_starts_on in (0, 1)),
  add constraint profiles_display_name_check check (char_length(display_name) between 1 and 60),
  add constraint profiles_timezone_check check (char_length(timezone) <= 64);

-- ---------------------------------------------------------------------------
-- splits and their days
-- ---------------------------------------------------------------------------

alter table public.splits
  -- The built-in split this was created from (e.g. 'ppl'); null for custom splits.
  add column template_key text,
  -- The first day this split applies. Null for a split that was never
  -- activated or was replaced on the same day it started.
  add column active_from date,
  add constraint splits_template_key_check check (char_length(template_key) <= 40);

create index splits_user_id_active_from_idx on public.splits (user_id, active_from);
create index split_days_split_id_idx on public.split_days (split_id);

-- One row per exercise per workout.
alter table public.split_day_exercises
  add constraint split_day_exercises_pkey primary key (split_day_id, exercise_id);
create index split_day_exercises_exercise_id_idx on public.split_day_exercises (exercise_id);

-- Weekdays follow Postgres's extract(dow): 0 = Sunday … 6 = Saturday.
-- Weekdays with no row are rest days.
alter table public.split_day_schedule
  add constraint split_day_schedule_weekday_check check (weekday between 0 and 6);

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------

alter table public.exercises
  add constraint exercises_name_check check (char_length(name) between 1 and 80),
  add constraint exercises_user_id_name_key unique (user_id, name);

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------

-- The three single-column UNIQUE constraints allowed only one session per
-- user ever, one per date across all users, and one per split day ever.
-- What's wanted is one session per user per day.
alter table public.workout_sessions
  drop constraint workout_sessions_date_key,
  drop constraint workout_sessions_split_day_id_key,
  drop constraint workout_sessions_user_id_key,
  alter column date set not null,
  alter column status set not null,
  add constraint workout_sessions_user_id_date_key unique (user_id, date);

create index workout_sessions_split_day_id_idx on public.workout_sessions (split_day_id);

-- ---------------------------------------------------------------------------
-- set_logs
-- ---------------------------------------------------------------------------

-- numeric(4,1) stores 0.1 kg steps, so pound weights didn't survive the round
-- trip (225 lb became 225.1 lb). Two decimals keep them exact.
alter table public.set_logs
  alter column weight_kg type numeric(6, 2),
  alter column weight_kg set not null,
  alter column exercise_id set not null,
  alter column set_number set not null,
  alter column reps set not null,
  add constraint set_logs_weight_kg_check check (weight_kg >= 0),
  add constraint set_logs_set_number_check check (set_number > 0),
  add constraint set_logs_reps_check check (reps between 1 and 999);

create index set_logs_session_id_idx on public.set_logs (session_id);
create index set_logs_exercise_id_idx on public.set_logs (exercise_id);

-- ---------------------------------------------------------------------------
-- Row level security policies
-- RLS was already enabled on every table, but with no policies nothing could
-- be read or written through the API.
-- ---------------------------------------------------------------------------

create policy "Users can read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Exercises with no owner are a shared library anyone signed in can use.
create policy "Users can read shared and their own exercises" on public.exercises
  for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "Users can create their own exercises" on public.exercises
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can read their own splits" on public.splits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own splits" on public.splits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own splits" on public.splits
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Split days, their exercises and their schedule belong to whoever owns the split.
create policy "Users can read days of their splits" on public.split_days
  for select to authenticated
  using (exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid())));
create policy "Users can add days to their splits" on public.split_days
  for insert to authenticated
  with check (exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid())));

create policy "Users can read exercises in their splits" on public.split_day_exercises
  for select to authenticated
  using (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ));
create policy "Users can add exercises to their splits" on public.split_day_exercises
  for insert to authenticated
  with check (
    exists (
      select 1 from public.split_days d join public.splits s on s.id = d.split_id
      where d.id = split_day_id and s.user_id = (select auth.uid())
    )
    -- ...and only exercises they can see (their own or shared)
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
create policy "Users can update exercises in their splits" on public.split_day_exercises
  for update to authenticated
  using (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.split_days d join public.splits s on s.id = d.split_id
      where d.id = split_day_id and s.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "Users can read their split schedules" on public.split_day_schedule
  for select to authenticated
  using (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ));
create policy "Users can add to their split schedules" on public.split_day_schedule
  for insert to authenticated
  with check (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ));
create policy "Users can remove from their split schedules" on public.split_day_schedule
  for delete to authenticated
  using (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ));

-- A session may only point at a split day the user owns.
create policy "Users can read their own sessions" on public.workout_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own sessions" on public.workout_sessions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (split_day_id is null or exists (select 1 from public.split_days d where d.id = split_day_id))
  );
create policy "Users can update their own sessions" on public.workout_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (split_day_id is null or exists (select 1 from public.split_days d where d.id = split_day_id))
  );
create policy "Users can delete their own sessions" on public.workout_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Sets belong to whoever owns the session, and must use a visible exercise.
create policy "Users can read their own sets" on public.set_logs
  for select to authenticated
  using (exists (select 1 from public.workout_sessions w where w.id = session_id and w.user_id = (select auth.uid())));
create policy "Users can log their own sets" on public.set_logs
  for insert to authenticated
  with check (
    exists (select 1 from public.workout_sessions w where w.id = session_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );
create policy "Users can delete their own sets" on public.set_logs
  for delete to authenticated
  using (exists (select 1 from public.workout_sessions w where w.id = session_id and w.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Grants: signed-in users get only the operations the app performs; the
-- anonymous role gets nothing. (The table editor granted ALL to both.)
-- ---------------------------------------------------------------------------

revoke all on table
  public.profiles, public.exercises, public.splits, public.split_days, public.split_day_exercises,
  public.split_day_schedule, public.workout_sessions, public.set_logs
  from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.exercises to authenticated;
grant select, insert, update on table public.splits to authenticated;
grant select, insert on table public.split_days to authenticated;
grant select, insert, update on table public.split_day_exercises to authenticated;
grant select, insert, delete on table public.split_day_schedule to authenticated;
grant select, insert, update, delete on table public.workout_sessions to authenticated;
grant select, insert, delete on table public.set_logs to authenticated;
