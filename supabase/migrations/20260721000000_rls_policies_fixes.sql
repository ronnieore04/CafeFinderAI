-- Grant table-level API access (separate from RLS row-level rules)
grant select on cafes to anon, authenticated;
grant select on cafe_tags to anon, authenticated;
grant select, insert, update on profiles to authenticated;
grant select, insert, update on friendships to authenticated;
grant select, insert, update, delete on checkins to authenticated;

-- cafe_tags was missing its read policy entirely
create policy "Anyone can view cafe tags"
  on cafe_tags for select
  using (true);

-- checkins: fix the mislabeled update policy and add the missing insert policy
drop policy if exists "Users can update their own checkins" on checkins;

create policy "Users can update own checkins"
  on checkins for update
  using (auth.uid() = user_id);

create policy "Users can create own checkins"
  on checkins for insert
  with check (auth.uid() = user_id);