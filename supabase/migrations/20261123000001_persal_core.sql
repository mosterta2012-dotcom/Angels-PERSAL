-- =====================================================================
-- Angels PERSAL – core schema (Supabase / PostgreSQL)
-- Source: PERSAL HR Portal Development Briefing, sections 3, 4, 5, 9, 11
-- Values marked [setting] are open decisions (briefing section 14).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Roles --------------------------------------------------
create type hr_role as enum (
  'hod_hr', 'hr_admin', 'head_of_finance', 'ceo',
  'programme_manager_bi', 'employee', 'direct_manager', 'board', 'qms_admin');

create table app_user_role (
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      hr_role not null,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function has_role(r hr_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_user_role where user_id = auth.uid() and role = r)
$$;

create or replace function is_hr_core() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_user_role where user_id = auth.uid()
                 and role in ('hod_hr','hr_admin','head_of_finance','ceo'))
$$;

-- ---------- Lists ----------------------------------------------------
create table lst_department (code text primary key, name text not null, active boolean default true);
create type staff_category as enum ('permanent','fixed_term','part_time','temporary','contract_sla','intern','volunteer','bursary_holder','supplier');
create type paid_through as enum ('simplepay_payroll','invoice_sla','stipend_simplepay','not_paid');
create table lst_funder (code text primary key, name text not null, active boolean default true);
create table lst_leave_type (
  code text primary key, name text not null, paid boolean not null,
  counts_working_days boolean not null default true, needs_certificate_after_days int,
  employees_only boolean not null default true);
create table hr_public_holiday (holiday date primary key, name text not null);

-- ---------- PERSAL number ------------------------------------------
create table hr_persal_number (
  persal_no  text primary key check (persal_no ~ '^[1-9][0-9]{7}$'),
  issued_at  timestamptz not null default now(),
  closed_at  timestamptz            -- locked on exit; never reused
);

create or replace function luhn_check_digit(body text) returns text
language plpgsql immutable as $$
declare s int := 0; d int; i int; n int := length(body);
begin
  for i in 0 .. n - 1 loop
    d := substr(body, n - i, 1)::int;
    if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    s := s + d;
  end loop;
  return ((10 - (s % 10)) % 10)::text;
end $$;

create or replace function is_valid_persal(p text) returns boolean
language sql immutable as $$
  select p ~ '^[1-9][0-9]{7}$' and luhn_check_digit(substr(p,1,7)) = substr(p,8,1)
$$;

create or replace function generate_persal_number() returns text
language plpgsql security definer set search_path = public as $$
declare body text; candidate text; tries int := 0;
begin
  loop
    tries := tries + 1;
    body := (1 + floor(random() * 9))::int::text || lpad(floor(random() * 1000000)::int::text, 6, '0');
    candidate := body || luhn_check_digit(body);
    exit when not exists (select 1 from hr_persal_number where persal_no = candidate);
    if tries > 100 then raise exception 'Could not issue a unique PERSAL number'; end if;
  end loop;
  insert into hr_persal_number(persal_no) values (candidate);
  return candidate;
end $$;

-- ---------- Establishment and grading -------------------------------
create table hr_post (
  post_no        text primary key check (post_no ~ '^[0-9]{7}$'),
  title          text not null,
  department     text not null references lst_department(code),
  level          text check (level in ('L1','L2','L3','L4','L5','L6')),
  category       staff_category not null,
  cost_centre    text not null,
  funder         text references lst_funder(code),
  status         text not null default 'proposed' check (status in ('proposed','approved','vacant_funded','filled','closed')),
  direct_manager_post     text references hr_post(post_no),
  functional_manager_post text references hr_post(post_no),
  created_at     timestamptz not null default now()
);

create table hr_grade_scale (
  id bigint generated always as identity primary key,
  title text not null, level text not null check (level in ('L1','L2','L3','L4','L5','L6')),
  financial_year text not null,
  step1 numeric(12,2), step2 numeric(12,2), step3 numeric(12,2), step4 numeric(12,2), step5 numeric(12,2),
  step_gap_pct numeric(4,2) not null default 5.00,   -- [setting] D-06
  effective_date date not null,
  unique (title, financial_year));

-- ---------- People ---------------------------------------------------
create table hr_person (
  id              uuid primary key default gen_random_uuid(),
  persal_no       text unique references hr_persal_number(persal_no),
  auth_user_id    uuid unique references auth.users(id),   -- leave portal sign-in (Entra ID via Supabase Auth)
  first_name      text not null,
  last_name       text not null,
  work_email      text,
  category        staff_category not null,
  paid_through    paid_through not null,
  department      text references lst_department(code),
  placed_with     text default 'Angels',
  start_date      date,              -- first day worked: drives leave cycles (L-01)
  contract_signed date,
  end_date        date,
  on_jibble       boolean default false,
  status          text not null default 'pre_start' check (status in ('pre_start','active','notice','exited')),
  created_at      timestamptz not null default now(),
  check (category = 'supplier' or persal_no is not null or status = 'pre_start')
);

-- Special and financial personal information: separate table, stricter access (POPIA s26–s33)
create table hr_person_sensitive (
  person_id     uuid primary key references hr_person(id) on delete cascade,
  id_number     text, tax_number text,
  bank_name     text, bank_account text, bank_branch text,
  ee_gender     text, ee_race text, ee_disability boolean, ee_nationality text, ee_level text,
  ee_form_signed date,
  updated_at    timestamptz not null default now());

create table hr_appointment (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  post_no   text not null references hr_post(post_no),
  level     text, step int check (step between 1 and 5),
  step_reason text,                   -- G-02: required above step 1
  start_date date not null, end_date date,
  created_at timestamptz not null default now());

-- Direct manager = the person holding the direct_manager_post of the person's current post
create or replace view v_direct_manager as
select a.person_id, dm.person_id as manager_person_id
from hr_appointment a
join hr_post p on p.post_no = a.post_no
join hr_appointment dm on dm.post_no = p.direct_manager_post and dm.end_date is null
where a.end_date is null;

-- ---------- Requests and approvals ---------------------------------
create table hr_request (
  id          bigint generated always as identity primary key,
  ref         text unique,                       -- PR-YY-NNNN
  code        text not null,                     -- 2.2, 2.3, 2.4, 3.6, 3.7, 4.2, 4.3, 4.5, 4.9, 5.1, 5.2, 9.9
  person_id   uuid references hr_person(id),
  payload     jsonb not null default '{}',       -- old and new values
  status      text not null default 'draft' check (status in ('draft','submitted','in_approval','approved','sent_to_payroll','done','declined','returned','cancelled')),
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now());

create sequence hr_request_seq;
create or replace function set_request_ref() returns trigger language plpgsql as $$
begin
  if new.ref is null then new.ref := 'PR-' || to_char(now(),'YY') || '-' || lpad(nextval('hr_request_seq')::text,4,'0'); end if;
  return new;
end $$;
create trigger trg_request_ref before insert on hr_request for each row execute function set_request_ref();

create table approval_step (
  id bigint generated always as identity primary key,
  entity text not null, entity_id bigint not null,    -- 'hr_request' | 'hr_leave_request' | 'hr_risk'
  step_no int not null, role hr_role not null,
  decided_by uuid, decision text check (decision in ('approved','declined','returned')),
  comment text, decided_at timestamptz,
  check (decision is null or decision = 'approved' or comment is not null));

-- R-03: nobody approves their own request
create or replace function block_self_approval() returns trigger language plpgsql as $$
begin
  if new.decided_by is not null and new.entity = 'hr_request'
     and exists (select 1 from hr_request r where r.id = new.entity_id and r.created_by = new.decided_by) then
    raise exception 'You cannot approve your own request';
  end if;
  return new;
end $$;
create trigger trg_no_self_approval before update on approval_step for each row execute function block_self_approval();

create table hr_payroll_instruction (
  id bigint generated always as identity primary key,
  request_id bigint references hr_request(id),
  leave_request_id bigint,
  person_id uuid not null references hr_person(id),
  kind text not null check (kind in ('new_starter','increase','unpaid_leave_days','banking','termination','leave_payout','stipend','reversal')),
  days numeric(6,2), amount numeric(12,2),
  effective date not null,
  batch text, status text not null default 'ready' check (status in ('ready','sent')),
  sent_at timestamptz);

-- ---------- Leave ----------------------------------------------------
create table hr_closure (
  id bigint generated always as identity primary key,
  start_date date not null, end_date date not null,
  approved_by uuid, approved_at timestamptz);

create or replace function working_days(d_from date, d_to date) returns int
language sql stable as $$
  select count(*)::int from generate_series(d_from, d_to, interval '1 day') g(d)
  where extract(isodow from g.d) < 6
    and not exists (select 1 from hr_public_holiday h where h.holiday = g.d::date)
$$;

create table hr_leave_request (
  id          bigint generated always as identity primary key,
  ref         text unique,                         -- LV-YY-NNNN
  person_id   uuid not null references hr_person(id),
  leave_type  text not null references lst_leave_type(code),
  date_from   date not null, date_to date not null check (date_to >= date_from),
  working_days numeric(5,2),
  note        text,
  certificate_path text,                           -- storage object; HR only
  status      text not null default 'submitted' check (status in ('submitted','with_manager','escalated','approved','declined','cancelled','taken')),
  manager_person_id uuid references hr_person(id),
  decision_reason text,
  source      text not null default 'portal' check (source in ('portal','paper_form')),
  created_at  timestamptz not null default now(),
  check (status <> 'declined' or decision_reason is not null));

create sequence hr_leave_seq;
create or replace function set_leave_defaults() returns trigger language plpgsql as $$
begin
  if new.ref is null then new.ref := 'LV-' || to_char(now(),'YY') || '-' || lpad(nextval('hr_leave_seq')::text,4,'0'); end if;
  new.working_days := working_days(new.date_from, new.date_to);
  if exists (select 1 from hr_person where id = new.person_id and status = 'notice') and new.leave_type = 'annual' then
    raise exception 'Leave cannot be taken during the notice period (Leave Policy)';
  end if;
  return new;
end $$;
create trigger trg_leave_defaults before insert on hr_leave_request for each row execute function set_leave_defaults();

-- Append-only ledger: every movement of every balance (L-02 … L-12)
create table hr_leave_ledger (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  leave_type text not null references lst_leave_type(code),
  cycle_start date not null,
  days numeric(6,2) not null,                       -- + accrual / credit, – leave / expiry / payout
  source text not null check (source in ('accrual','leave','closure','adjustment','legacy','opening_balance','expiry','payout','deficit')),
  ref text, note text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now());

-- security_invoker: the caller's row-level security applies, so people see only balances they may see
create or replace view v_leave_balance with (security_invoker = true) as
select person_id, leave_type, sum(days) as balance from hr_leave_ledger group by person_id, leave_type;

create table hr_legacy_leave (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  leave_type text not null, date_from date not null, date_to date not null, days numeric(5,2) not null,
  source text not null check (source in ('simplepay','tracker','paper','closure_list')),
  doc_ref text, status text not null default 'approved' check (status in ('approved','cancelled','disputed')));

create table hr_opening_balance (
  person_id uuid not null references hr_person(id),
  leave_type text not null references lst_leave_type(code),
  days numeric(6,2) not null, disputed_days numeric(6,2) default 0,
  status text not null default 'not_started' check (status in ('not_started','checking','differences','agreed','signed','disputed')),
  employee_signed_at timestamptz, hr_signed_at timestamptz, pdf_sha256 text,
  primary key (person_id, leave_type));

-- ---------- Documents, checklists, programmes ----------------------
create table hr_document (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  doc_type text not null, storage_path text not null, expires_on date,
  uploaded_by uuid default auth.uid(), uploaded_at timestamptz not null default now());

create table hr_checklist_item (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  checklist text not null check (checklist in ('onboarding','exit')),
  task text not null, owner_role text, due date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')));

create table hr_placement (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  client text not null, client_supervisor text, programme text,
  start_date date not null, end_date date, monthly_stipend numeric(10,2));

create table hr_bursary (
  id bigint generated always as identity primary key,
  person_id uuid not null references hr_person(id),
  institution text, qualification text, agreement_signed date, annual_award numeric(12,2), status text);

-- ---------- Risk register -------------------------------------------
create table hr_risk (
  id bigint generated always as identity primary key,
  ref text unique, title text not null, area text not null,
  likelihood int not null check (likelihood between 1 and 5),
  impact int not null check (impact between 1 and 5),
  score int generated always as (likelihood * impact) stored,
  level text generated always as (case when likelihood*impact >= 20 then 'Critical' when likelihood*impact >= 12 then 'High'
                                       when likelihood*impact >= 6 then 'Medium' else 'Low' end) stored,
  owner_role hr_role not null, controls text,
  reported_to text, reported_at timestamptz, action_due date, review_date date,
  status text not null default 'open' check (status in ('open','reported','action_in_progress','closed')),
  closure_note text, closure_evidence text, closed_approved_by uuid, qms_ref text,
  check (status <> 'closed' or (closure_note is not null and closure_evidence is not null and closed_approved_by is not null)));

-- Risk tracker: no names or personal details (K-04)
create or replace view v_risk_tracker as
select ref, qms_ref, area, level, score, owner_role, reported_to, reported_at, action_due, review_date, status, closure_evidence
from hr_risk;

-- ---------- Imports, notifications, audit ---------------------------
create table hr_import_batch (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('staff','legacy_leave')),
  file_path text, checks jsonb, status text not null default 'uploaded' check (status in ('uploaded','checked','fix_needed','approved','loaded')),
  approved_by uuid, created_at timestamptz not null default now());

create table notification (
  id bigint generated always as identity primary key,
  to_user uuid, channel text default 'teams', subject text not null, link text,
  sent_at timestamptz, created_at timestamptz not null default now());

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  table_name text not null, row_id text, action text not null,
  old_row jsonb, new_row jsonb);

create or replace function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare masked text[] := array['id_number','tax_number','bank_account','ee_gender','ee_race','ee_disability','ee_nationality'];
        o jsonb; n jsonb; k text;
begin
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  foreach k in array masked loop
    if o ? k then o := jsonb_set(o, array[k], '"***"'); end if;
    if n ? k then n := jsonb_set(n, array[k], '"***"'); end if;
  end loop;
  insert into audit_log(table_name,row_id,action,old_row,new_row)
  values (tg_table_name, coalesce(n->>'id', o->>'id', n->>'person_id', o->>'person_id'), tg_op, o, n);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['hr_person','hr_person_sensitive','hr_post','hr_appointment','hr_request','approval_step',
    'hr_payroll_instruction','hr_leave_request','hr_leave_ledger','hr_opening_balance','hr_document','hr_risk',
    'hr_closure','hr_grade_scale','app_user_role','hr_import_batch'] loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s for each row execute function audit_row()', t);
  end loop; end $$;

-- audit_log and leave ledger are append-only, even for admins
create or replace function forbid_change() returns trigger language plpgsql as $$
begin raise exception '% is append-only', tg_table_name; end $$;
create trigger trg_audit_append_only before update or delete on audit_log for each row execute function forbid_change();
create trigger trg_ledger_append_only before update or delete on hr_leave_ledger for each row execute function forbid_change();

-- HR risk reference HR-R01, HR-R02 …
create sequence hr_risk_seq;
create or replace function set_risk_ref() returns trigger language plpgsql as $$
begin
  if new.ref is null then new.ref := 'HR-R' || lpad(nextval('hr_risk_seq')::text, 2, '0'); end if;
  return new;
end $$;
create trigger trg_risk_ref before insert on hr_risk for each row execute function set_risk_ref();
