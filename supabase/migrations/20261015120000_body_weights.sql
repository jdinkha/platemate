-- The user's body weight, at most one weigh-in a day, stored in kilograms.
-- The app asks for it once a week; the user can also log it any time.

create table public.body_weights (
  user_id uuid not null default auth.uid() references public.profiles (id) on update cascade on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  primary key (user_id, date)
);

alter table public.body_weights enable row level security;

create policy "Users can read their own weigh-ins" on public.body_weights
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can log their own weigh-ins" on public.body_weights
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- Logging again on the same day replaces that day's weigh-in.
create policy "Users can update their own weigh-ins" on public.body_weights
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.body_weights from anon, authenticated;
grant select, insert, update on table public.body_weights to authenticated;
