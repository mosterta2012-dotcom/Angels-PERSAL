-- =====================================================================
-- Angels PERSAL – row level security (briefing section 3 and 11)
-- PERSAL core: HOD HR, HR Admin, Head of Finance, CEO. Staff and direct
-- managers reach only leave rows; QMS Administrator only the risk view.
-- =====================================================================

create or replace function my_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from hr_person where auth_user_id = auth.uid()
$$;

do $$ declare t text; begin
  foreach t in array array['app_user_role','lst_department','lst_funder','lst_leave_type','hr_public_holiday','hr_persal_number',
    'hr_post','hr_grade_scale','hr_person','hr_person_sensitive','hr_appointment','hr_request','approval_step',
    'hr_payroll_instruction','hr_closure','hr_leave_request','hr_leave_ledger','hr_legacy_leave','hr_opening_balance',
    'hr_document','hr_checklist_item','hr_placement','hr_bursary','hr_risk','hr_import_batch','notification','audit_log'] loop
    execute format('alter table %I enable row level security', t);
  end loop; end $$;

-- Lists: everyone signed in may read; HOD HR maintains
do $$ declare t text; begin
  foreach t in array array['lst_department','lst_funder','lst_leave_type','hr_public_holiday'] loop
    execute format('create policy %1$s_read on %1$I for select to authenticated using (true)', t);
    execute format('create policy %1$s_write on %1$I for all to authenticated using (has_role(''hod_hr'')) with check (has_role(''hod_hr''))', t);
  end loop; end $$;

-- Core HR tables: the four HR roles read; HOD HR and HR Admin write
do $$ declare t text; begin
  foreach t in array array['hr_persal_number','hr_post','hr_grade_scale','hr_appointment','hr_request','approval_step',
    'hr_closure','hr_legacy_leave','hr_document','hr_checklist_item','hr_placement','hr_bursary','hr_import_batch','hr_risk'] loop
    execute format('create policy %1$s_hr_read on %1$I for select to authenticated using (is_hr_core() or has_role(''programme_manager_bi''))', t);
    execute format('create policy %1$s_hr_write on %1$I for insert to authenticated with check (has_role(''hod_hr'') or has_role(''hr_admin''))', t);
    execute format('create policy %1$s_hr_update on %1$I for update to authenticated using (is_hr_core())', t);
  end loop; end $$;

-- People: HR core; each person sees their own row; managers see their direct reports
create policy person_hr on hr_person for all to authenticated using (is_hr_core()) with check (has_role('hod_hr') or has_role('hr_admin'));
create policy person_self on hr_person for select to authenticated using (auth_user_id = auth.uid());
create policy person_team on hr_person for select to authenticated
  using (id in (select person_id from v_direct_manager where manager_person_id = my_person_id()));

-- Sensitive data: HOD HR, Head of Finance, CEO only (HR Admin cannot read bank, ID or EE fields)
create policy sensitive_read on hr_person_sensitive for select to authenticated
  using (has_role('hod_hr') or has_role('head_of_finance') or has_role('ceo'));
create policy sensitive_write on hr_person_sensitive for all to authenticated
  using (has_role('hod_hr') or has_role('head_of_finance')) with check (has_role('hod_hr') or has_role('head_of_finance'));

-- Payroll instructions: HR prepares, Head of Finance sends (segregation of duties)
create policy payroll_read on hr_payroll_instruction for select to authenticated using (is_hr_core());
create policy payroll_create on hr_payroll_instruction for insert to authenticated with check (has_role('hod_hr') or has_role('hr_admin'));
create policy payroll_send on hr_payroll_instruction for update to authenticated using (has_role('head_of_finance'));

-- Leave requests: own (leave portal), direct reports (manager), HR core
create policy leave_own_read on hr_leave_request for select to authenticated using (person_id = my_person_id());
create policy leave_own_apply on hr_leave_request for insert to authenticated
  with check (person_id = my_person_id() or has_role('hod_hr') or has_role('hr_admin'));
create policy leave_own_cancel on hr_leave_request for update to authenticated
  using (person_id = my_person_id() and status in ('submitted','with_manager')) with check (status = 'cancelled');
create policy leave_team on hr_leave_request for select to authenticated using (manager_person_id = my_person_id());
create policy leave_team_decide on hr_leave_request for update to authenticated
  using (manager_person_id = my_person_id() and person_id <> my_person_id())
  with check (status in ('approved','declined'));
create policy leave_hr on hr_leave_request for all to authenticated using (is_hr_core()) with check (is_hr_core());

-- Balances: own and HR core; only HR writes (accrual and closure jobs run as service role)
create policy ledger_own on hr_leave_ledger for select to authenticated using (person_id = my_person_id());
create policy ledger_hr on hr_leave_ledger for select to authenticated using (is_hr_core());
create policy ledger_hr_write on hr_leave_ledger for insert to authenticated with check (has_role('hod_hr') or has_role('hr_admin'));

create policy opening_own on hr_opening_balance for select to authenticated using (person_id = my_person_id());
create policy opening_sign on hr_opening_balance for update to authenticated
  using (person_id = my_person_id() and status = 'agreed') with check (person_id = my_person_id());
create policy opening_hr on hr_opening_balance for all to authenticated using (is_hr_core()) with check (has_role('hod_hr') or has_role('hr_admin'));

-- Roles: see your own; HOD HR manages
create policy roles_self on app_user_role for select to authenticated using (user_id = auth.uid());
create policy roles_hod on app_user_role for all to authenticated using (has_role('hod_hr')) with check (has_role('hod_hr'));

create policy notif_own on notification for select to authenticated using (to_user = auth.uid());

-- Audit log: read by HOD HR, Head of Finance, CEO; written only by the trigger
create policy audit_read on audit_log for select to authenticated
  using (has_role('hod_hr') or has_role('head_of_finance') or has_role('ceo'));

-- Risk tracker view for the QMS Administrator (no names, K-04)
create or replace view v_risk_tracker with (security_barrier) as
select ref, qms_ref, area, level, score, owner_role, reported_to, reported_at, action_due, review_date, status, closure_evidence
from hr_risk where has_role('qms_admin') or is_hr_core();
revoke all on v_risk_tracker from anon;
grant select on v_risk_tracker to authenticated;

-- Table privileges for signed-in users (Supabase grants these by default; RLS above decides which rows)
grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke update, delete on audit_log from authenticated;
revoke insert on audit_log from authenticated;

-- Never expose anything to anonymous users
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on %I from anon', t.tablename);
  end loop; end $$;
