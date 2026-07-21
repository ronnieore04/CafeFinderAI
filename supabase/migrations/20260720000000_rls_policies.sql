create policy "Anyone can view cafes"
    on cafes for select
    using (true);

create policy "Users can view their own profile"
    on profiles for select
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on profiles for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on profiles for update
    using (auth.id() = id);

create policy "Users can view their friendships"
    on friendships for select
    using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendship requests"
    on friendships for insert
    with check (auth.uid() = user_id);

create policy "Recipients can update friendship status"
    on friendships for update
    using (auth.uid() = friend_id);

create policy "Users can view their own checkins"
    on checkins for select
    using (auth.uid() = user_id);

create policy "Users can update their own checkins"
    on checkins for select
    with check (auth.uid() = user_id);

create policy "Users can delete their own checkins"
    on checkins for delete
    using (auth.uid() = user_id);