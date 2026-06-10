-- RLS policies for review_sections and review_responses
-- Apply before TA review forms go live.

create policy "Authenticated users can read review sections"
  on public.review_sections for select to authenticated using (true);

create policy "TA can read own responses"
  on public.review_responses for select to authenticated
  using (responded_by = auth.uid());

create policy "TA can insert own responses"
  on public.review_responses for insert to authenticated
  with check (responded_by = auth.uid());

create policy "TA can update own draft responses"
  on public.review_responses for update to authenticated
  using (responded_by = auth.uid() and status = 'draft');
