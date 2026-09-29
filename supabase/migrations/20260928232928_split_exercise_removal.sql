-- Lets users remove exercises from the workouts in their own splits.
-- (Sets already logged for an exercise are kept; they reference `exercises`,
-- not the split.) The app makes sure a workout keeps at least one exercise.

create policy "Users can remove exercises from their splits" on public.split_day_exercises
  for delete to authenticated
  using (exists (
    select 1 from public.split_days d join public.splits s on s.id = d.split_id
    where d.id = split_day_id and s.user_id = (select auth.uid())
  ));

grant delete on table public.split_day_exercises to authenticated;
