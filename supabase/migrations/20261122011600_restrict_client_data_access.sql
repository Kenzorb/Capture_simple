revoke all on table
  public.profiles, public.articles, public.article_contents, public.personal_notes,
  public.topics, public.topic_tree_versions, public.article_topics, public.concepts, public.article_concepts,
  public.processing_jobs, public.job_outbox, public.usage_periods, public.usage_events,
  public.subscriptions, public.billing_events
from public, anon, authenticated;

grant all on table
  public.profiles, public.articles, public.article_contents, public.personal_notes,
  public.topics, public.topic_tree_versions, public.article_topics, public.concepts, public.article_concepts,
  public.processing_jobs, public.job_outbox, public.usage_periods, public.usage_events,
  public.subscriptions, public.billing_events
to service_role;

grant select on table
  public.profiles, public.articles, public.article_contents, public.personal_notes,
  public.topics, public.article_topics, public.concepts, public.article_concepts, public.usage_periods
to authenticated;

grant update (display_name) on public.profiles to authenticated;
grant insert (user_id, article_id, body), update (body) on public.personal_notes to authenticated;
grant delete on public.personal_notes to authenticated;
grant select (user_id, plan, status, period_end, cancel_at_period_end) on public.subscriptions to authenticated;

create policy profiles_read_own on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy articles_read_own on public.articles
for select to authenticated using (user_id = (select auth.uid()));
create policy article_contents_read_own on public.article_contents
for select to authenticated using (user_id = (select auth.uid()));

create policy personal_notes_read_own on public.personal_notes
for select to authenticated using (user_id = (select auth.uid()));
create policy personal_notes_insert_own on public.personal_notes
for insert to authenticated with check (user_id = (select auth.uid()));
create policy personal_notes_update_own on public.personal_notes
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy personal_notes_delete_own on public.personal_notes
for delete to authenticated using (user_id = (select auth.uid()));

create policy topics_read_own on public.topics
for select to authenticated using (user_id = (select auth.uid()));
create policy article_topics_read_own on public.article_topics
for select to authenticated using (user_id = (select auth.uid()));
create policy concepts_read_own on public.concepts
for select to authenticated using (user_id = (select auth.uid()));
create policy article_concepts_read_own on public.article_concepts
for select to authenticated using (user_id = (select auth.uid()));

create policy usage_periods_read_own on public.usage_periods
for select to authenticated using (user_id = (select auth.uid()));
create policy subscriptions_read_own on public.subscriptions
for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.capture_touch_updated_at() from public, anon, authenticated;
