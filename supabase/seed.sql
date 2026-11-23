-- Starter lists only. NO personal information. Verify public holidays against gov.za before go-live.
insert into lst_department (code, name) values
 ('01','Office of the CEO'),('02','Operations'),('03','Finance'),('04','Human Resources'),('05','Marketing / PR'),('06','Logistics');

insert into lst_funder (code, name) values
 ('CORE','Core (Angels)'),('SCATEC','Scatec'),('SERITI','Seriti Green'),('NOTSI','Notsi'),('NWF','Noblesfontein');

insert into lst_leave_type (code, name, paid, needs_certificate_after_days, employees_only) values
 ('annual','Annual leave',true,null,true),
 ('sick','Sick leave',true,2,true),
 ('family','Family responsibility leave',true,null,true),
 ('maternity','Maternity leave',false,null,true),
 ('parental','Parental leave',false,null,true),
 ('adoption','Adoption / commissioning parental leave',false,null,true),
 ('special','Special leave (incl. study)',true,null,true),
 ('unpaid','Unpaid leave',false,null,true),
 ('toil','Time off for overtime',true,null,true);

insert into hr_public_holiday (holiday, name) values
 ('2026-01-01','New Year''s Day'),('2026-03-21','Human Rights Day'),('2026-04-03','Good Friday'),('2026-04-06','Family Day'),
 ('2026-04-27','Freedom Day'),('2026-05-01','Workers'' Day'),('2026-06-16','Youth Day'),('2026-08-10','National Women''s Day (observed)'),
 ('2026-09-24','Heritage Day'),('2026-12-16','Day of Reconciliation'),('2026-12-25','Christmas Day'),('2026-12-26','Day of Goodwill'),
 ('2027-01-01','New Year''s Day'),('2027-03-22','Human Rights Day (observed)'),('2027-03-26','Good Friday'),('2027-03-29','Family Day'),
 ('2027-04-27','Freedom Day'),('2027-05-01','Workers'' Day'),('2027-06-16','Youth Day'),('2027-08-09','National Women''s Day'),
 ('2027-09-24','Heritage Day'),('2027-12-16','Day of Reconciliation'),('2027-12-25','Christmas Day'),('2027-12-27','Day of Goodwill (observed)');

-- Proposed levels per title (rand amounts left empty until approved, decision D-06)
insert into hr_grade_scale (title, level, financial_year, effective_date) values
 ('Chief Executive Officer','L6','2027/28','2027-03-01'),
 ('Head of Operations and Systems','L5','2027/28','2027-03-01'),('HOD Human Resources','L5','2027/28','2027-03-01'),
 ('Marketing HOD','L5','2027/28','2027-03-01'),('Finance HOD','L5','2027/28','2027-03-01'),
 ('National Operations Co-ordinator','L4','2027/28','2027-03-01'),('Programme Manager: Bursaries & Internships','L4','2027/28','2027-03-01'),
 ('Operations and Programme Systems Coordinator','L3','2027/28','2027-03-01'),('Social Performance Practitioner','L3','2027/28','2027-03-01'),
 ('Economic Development Administrator','L3','2027/28','2027-03-01'),('PA to the CEO','L3','2027/28','2027-03-01'),
 ('Graphic & Digital Design','L3','2027/28','2027-03-01'),('HR Assistant','L2','2027/28','2027-03-01'),('Logistics Factotum','L2','2027/28','2027-03-01');
