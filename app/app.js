/* Angels PERSAL – web app (plain JavaScript, no build step).
   Demo mode uses sample data in the browser; live mode reads and writes Supabase,
   where row-level security decides what each signed-in person may see. */
(function () {
  'use strict';
  const C = window.PERSAL_CONFIG || { DEMO: true };
  const DEMO = !!C.DEMO;
  const sb = !DEMO && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtDate = (d) => d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const HR_CORE = ['hod_hr', 'hr_admin', 'head_of_finance', 'ceo'];
  const ROLE_NAMES = { hod_hr: 'HOD HR', hr_admin: 'HR Administrator', head_of_finance: 'Head of Finance', ceo: 'CEO', programme_manager_bi: 'Programme Manager B&I', employee: 'Employee', direct_manager: 'Direct manager', board: 'Board', qms_admin: 'QMS Administrator' };
  const CAT = { permanent: 'Permanent', fixed_term: 'Fixed-term', part_time: 'Part-time', temporary: 'Temporary', contract_sla: 'Contract (SLA)', intern: 'Intern', volunteer: 'Volunteer', bursary_holder: 'Bursary holder', supplier: 'Supplier' };
  const LEAVE_PILL = { submitted: 'p-info', with_manager: 'p-warn', escalated: 'p-bad', approved: 'p-ok', declined: 'p-bad', cancelled: 'p-grey', taken: 'p-ok' };
  const RISK_PILL = { Critical: 'p-bad', High: 'p-bad', Medium: 'p-warn', Low: 'p-ok' };
  let me = { userId: null, personId: null, name: '', roles: [] };
  let cache = { holidays: [], leaveTypes: [] };

  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 3500); };
  const has = (...r) => r.some((x) => me.roles.includes(x));
  const isHR = () => has(...HR_CORE);
  const pill = (cls, txt) => `<span class="pill ${cls}">${esc(txt)}</span>`;
  const words = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

  // ---------- Working days (weekends and public holidays skipped) ----------
  function workingDays(from, to) {
    if (!from || !to || to < from) return 0;
    let n = 0; const d = new Date(from + 'T00:00:00'); const end = new Date(to + 'T00:00:00');
    while (d <= end) {
      const iso = d.toISOString().slice(0, 10); const wd = d.getDay();
      if (wd !== 0 && wd !== 6 && !cache.holidays.includes(iso)) n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  }

  // ---------- PERSAL number check digit (Luhn) ----------
  function luhn(body) { let s = 0; body.split('').reverse().forEach((c, i) => { let d = +c; if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; } s += d; }); return String((10 - (s % 10)) % 10); }
  const validPersal = (p) => /^[1-9][0-9]{7}$/.test(p) && luhn(p.slice(0, 7)) === p[7];

  // =====================================================================
  // Data: demo (sample data in this browser) and live (Supabase)
  // =====================================================================
  const demoDb = (() => {
    const P = (id, fn, ln, cat, dept, title, start, mgr, persal) => ({ id, first_name: fn, last_name: ln, category: cat, department: dept, title, start_date: start, manager: mgr, persal_no: persal, status: 'active' });
    const people = [
      P('p1', 'Sample', 'Employee A', 'permanent', 'Operations', 'Social Performance Practitioner', '2019-03-01', 'p2', '31847205'),
      P('p2', 'Sample', 'Manager B', 'permanent', 'Operations', 'National Operations Co-ordinator', '2016-07-01', 'p5', '58201740'),
      P('p3', 'Sample', 'Employee C', 'permanent', 'Operations', 'Economic Development Administrator', '2024-02-01', 'p2', null),
      P('p4', 'Sample', 'Intern D', 'intern', 'Human Resources', 'Social Performance Intern', '2026-02-01', 'p6', null),
      P('p5', 'Sample', 'HOD E', 'permanent', 'Operations', 'Head of Operations and Systems', '2026-10-01', 'p7', '90631581'),
      P('p6', 'Sample', 'HOD F', 'permanent', 'Human Resources', 'HOD Human Resources', '2020-01-15', 'p7', null),
      P('p7', 'Sample', 'CEO G', 'contract_sla', 'Office of the CEO', 'Chief Executive Officer', '2012-01-01', null, null)];
    const balances = { p1: { annual: 12.5, sick: 27, family: 3, toil: 0 }, p2: { annual: 20, sick: 30, family: 2, toil: 1 }, p3: { annual: 6.25, sick: 30, family: 3, toil: 0 }, p4: { annual: 0, sick: 10, family: 3, toil: 0 }, p5: { annual: 3.75, sick: 30, family: 3, toil: 0 }, p6: { annual: 15, sick: 30, family: 3, toil: 0 }, p7: { annual: 0, sick: 0, family: 0, toil: 0 } };
    let seq = 3;
    const leave = [
      { id: 1, ref: 'LV-27-0001', person_id: 'p1', leave_type: 'annual', date_from: '2027-04-19', date_to: '2027-04-23', working_days: 5, status: 'with_manager', manager_person_id: 'p2', note: 'Family visit' },
      { id: 2, ref: 'LV-27-0002', person_id: 'p3', leave_type: 'family', date_from: '2027-04-14', date_to: '2027-04-14', working_days: 1, status: 'approved', manager_person_id: 'p2' },
      { id: 3, ref: 'LV-27-0003', person_id: 'p1', leave_type: 'sick', date_from: '2027-03-03', date_to: '2027-03-04', working_days: 2, status: 'approved', manager_person_id: 'p2' }];
    let rseq = 5;
    const risks = [
      { id: 1, ref: 'HR-R01', title: 'Leave records split over SimplePay, Excel trackers and paper', area: 'Leave · BCEA', likelihood: 4, impact: 4, owner_role: 'hod_hr', status: 'action_in_progress', reported_to: 'CEO', reported_at: '2026-11-20', action_due: '2027-03-31', qms_ref: 'QMS-R101' },
      { id: 2, ref: 'HR-R02', title: 'Staff not told when unused leave expires', area: 'Leave · BCEA', likelihood: 4, impact: 3, owner_role: 'hod_hr', status: 'open', reported_to: null, action_due: '2027-02-28' },
      { id: 3, ref: 'HR-R04', title: 'Unauthorised access to personal, pay or EE data', area: 'POPIA', likelihood: 2, impact: 5, owner_role: 'hod_hr', status: 'reported', reported_to: 'HOD', reported_at: '2026-11-21', action_due: '2027-01-31' },
      { id: 4, ref: 'HR-R05', title: 'Angels passes 50 employees without EE reporting in place', area: 'EEA', likelihood: 3, impact: 4, owner_role: 'hod_hr', status: 'open' },
      { id: 5, ref: 'HR-R09', title: 'Leave policy still names SimplePay as the leave system', area: 'Policy', likelihood: 4, impact: 2, owner_role: 'hod_hr', status: 'closed', reported_to: 'HOD', reported_at: '2026-11-21', closure_note: 'Rev 3 drafted', closure_evidence: 'Leave Policy Rev 3 DRAFT' }];
    const audit = [{ at: new Date().toISOString(), actor: 'Demo', table_name: 'hr_person', action: 'UPDATE', row_id: 'p1' }];
    const log = (t, a, id) => audit.unshift({ at: new Date().toISOString(), actor: ROLE_NAMES[me.roles[0]] || 'Demo', table_name: t, action: a, row_id: id });
    const score = (r) => { const s = r.likelihood * r.impact; return { score: s, level: s >= 20 ? 'Critical' : s >= 12 ? 'High' : s >= 6 ? 'Medium' : 'Low' }; };
    const name = (id) => { const p = people.find((x) => x.id === id); return p ? p.first_name + ' ' + p.last_name : '—'; };
    return {
      async init() {
        cache.holidays = ['2026-12-16', '2026-12-25', '2026-12-26', '2027-01-01', '2027-03-22', '2027-03-26', '2027-03-29', '2027-04-27', '2027-05-01', '2027-06-16', '2027-08-09', '2027-09-24', '2027-12-16', '2027-12-25', '2027-12-27'];
        cache.leaveTypes = [['annual', 'Annual leave'], ['sick', 'Sick leave'], ['family', 'Family responsibility'], ['toil', 'Time off for overtime'], ['special', 'Special leave'], ['unpaid', 'Unpaid leave'], ['parental', 'Parental leave'], ['maternity', 'Maternity leave']].map(([code, n]) => ({ code, name: n }));
      },
      async people() { return people.map((p) => ({ ...p })); },
      async person(id) { const p = people.find((x) => x.id === id); return p ? { ...p, balances: balances[id] || {}, manager_name: name(p.manager) } : null; },
      async issuePersal(id) { let n; do { const b = String(1 + Math.floor(Math.random() * 9)) + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'); n = b + luhn(b); } while (people.some((p) => p.persal_no === n)); people.find((p) => p.id === id).persal_no = n; log('hr_person', 'UPDATE', id); return n; },
      async balances(pid) { return balances[pid] || {}; },
      async myLeave(pid) { return leave.filter((l) => l.person_id === pid).sort((a, b) => b.id - a.id); },
      async applyLeave(pid, f) {
        const p = people.find((x) => x.id === pid);
        if (p && p.status === 'notice' && f.leave_type === 'annual') throw new Error('Leave cannot be taken during the notice period (Leave Policy).');
        const days = workingDays(f.date_from, f.date_to);
        seq++; const r = { id: seq, ref: 'LV-27-' + String(seq).padStart(4, '0'), person_id: pid, ...f, working_days: days, status: p && p.manager ? 'with_manager' : 'submitted', manager_person_id: p ? p.manager : null };
        leave.push(r); log('hr_leave_request', 'INSERT', r.ref); return r;
      },
      async cancelLeave(id) { const r = leave.find((l) => l.id === id); r.status = 'cancelled'; log('hr_leave_request', 'UPDATE', r.ref); },
      async teamLeave(pid) { return leave.filter((l) => l.manager_person_id === pid && ['submitted', 'with_manager', 'escalated'].includes(l.status)).map((l) => ({ ...l, person_name: name(l.person_id), balance: (balances[l.person_id] || {})[l.leave_type] })); },
      async decideLeave(id, status, reason) {
        const r = leave.find((l) => l.id === id); r.status = status; r.decision_reason = reason || null;
        if (status === 'approved' && balances[r.person_id] && r.leave_type in balances[r.person_id]) balances[r.person_id][r.leave_type] -= r.working_days;
        log('hr_leave_request', 'UPDATE', r.ref);
      },
      async allLeave() { return leave.map((l) => ({ ...l, person_name: name(l.person_id) })).sort((a, b) => b.id - a.id); },
      async grades() { return [['Chief Executive Officer', 'L6'], ['Head of Operations and Systems', 'L5'], ['HOD Human Resources', 'L5'], ['Marketing HOD', 'L5'], ['Finance HOD', 'L5'], ['National Operations Co-ordinator', 'L4'], ['Programme Manager: Bursaries & Internships', 'L4'], ['Operations and Programme Systems Coordinator', 'L3'], ['Social Performance Practitioner', 'L3'], ['Economic Development Administrator', 'L3'], ['PA to the CEO', 'L3'], ['Graphic & Digital Design', 'L3'], ['HR Assistant', 'L2'], ['Logistics Factotum', 'L2']].map(([title, level]) => ({ title, level, step3: null })); },
      async risks() { return risks.map((r) => ({ ...r, ...score(r) })); },
      async addRisk(f) { rseq++; const r = { id: rseq, ref: 'HR-R' + String(rseq + 5).padStart(2, '0'), status: 'open', ...f }; risks.push(r); log('hr_risk', 'INSERT', r.ref); },
      async updateRisk(id, f) { const r = risks.find((x) => x.id === id); if (f.status === 'closed' && (!f.closure_note || !f.closure_evidence)) throw new Error('Closing needs a closure note and evidence.'); Object.assign(r, f); log('hr_risk', 'UPDATE', r.ref); },
      async tracker() { return risks.map((r) => { const s = score(r); return { ref: r.ref, qms_ref: r.qms_ref, area: r.area, level: s.level, score: s.score, owner_role: r.owner_role, reported_to: r.reported_to, reported_at: r.reported_at, action_due: r.action_due, status: r.status, closure_evidence: r.closure_evidence }; }); },
      async audit() { return audit.slice(0, 200); }
    };
  })();

  const liveDb = {
    async init() {
      const [h, t] = await Promise.all([sb.from('hr_public_holiday').select('holiday'), sb.from('lst_leave_type').select('code,name').order('name')]);
      cache.holidays = (h.data || []).map((x) => x.holiday); cache.leaveTypes = t.data || [];
    },
    async people() { const { data, error } = await sb.from('hr_person').select('id,persal_no,first_name,last_name,category,department,status,start_date').order('last_name'); if (error) throw error; return data; },
    async person(id) {
      const { data, error } = await sb.from('hr_person').select('*').eq('id', id).single(); if (error) throw error;
      data.balances = await liveDb.balances(id); return data;
    },
    async issuePersal(id) { const { data: n, error } = await sb.rpc('generate_persal_number'); if (error) throw error; const u = await sb.from('hr_person').update({ persal_no: n }).eq('id', id); if (u.error) throw u.error; return n; },
    async balances(pid) { const { data } = await sb.from('v_leave_balance').select('leave_type,balance').eq('person_id', pid); const o = {}; (data || []).forEach((r) => (o[r.leave_type] = +r.balance)); return o; },
    async myLeave(pid) { const { data, error } = await sb.from('hr_leave_request').select('*').eq('person_id', pid).order('created_at', { ascending: false }); if (error) throw error; return data; },
    async applyLeave(pid, f) {
      const m = await sb.from('v_direct_manager').select('manager_person_id').eq('person_id', pid).maybeSingle();
      const mgr = m.data ? m.data.manager_person_id : null;
      const { data, error } = await sb.from('hr_leave_request').insert({ person_id: pid, ...f, manager_person_id: mgr, status: mgr ? 'with_manager' : 'submitted' }).select().single();
      if (error) throw error; return data;
    },
    async cancelLeave(id) { const { error } = await sb.from('hr_leave_request').update({ status: 'cancelled' }).eq('id', id); if (error) throw error; },
    async teamLeave(pid) {
      const { data, error } = await sb.from('hr_leave_request').select('*, person:hr_person!hr_leave_request_person_id_fkey(first_name,last_name)').eq('manager_person_id', pid).in('status', ['submitted', 'with_manager', 'escalated']);
      if (error) throw error; return data.map((l) => ({ ...l, person_name: l.person ? l.person.first_name + ' ' + l.person.last_name : '—' }));
    },
    async decideLeave(id, status, reason) { const { error } = await sb.from('hr_leave_request').update({ status, decision_reason: reason || null }).eq('id', id); if (error) throw error; },
    async allLeave() {
      const { data, error } = await sb.from('hr_leave_request').select('*, person:hr_person!hr_leave_request_person_id_fkey(first_name,last_name)').order('created_at', { ascending: false }).limit(300);
      if (error) throw error; return data.map((l) => ({ ...l, person_name: l.person ? l.person.first_name + ' ' + l.person.last_name : '—' }));
    },
    async grades() { const { data, error } = await sb.from('hr_grade_scale').select('*').order('level', { ascending: false }); if (error) throw error; return data; },
    async risks() { const { data, error } = await sb.from('hr_risk').select('*').order('score', { ascending: false }); if (error) throw error; return data; },
    async addRisk(f) { const { error } = await sb.from('hr_risk').insert(f); if (error) throw error; },
    async updateRisk(id, f) { if (f.status === 'closed') f.closed_approved_by = me.userId; const { error } = await sb.from('hr_risk').update(f).eq('id', id); if (error) throw error; },
    async tracker() { const { data, error } = await sb.from('v_risk_tracker').select('*'); if (error) throw error; return data; },
    async audit() { const { data, error } = await sb.from('audit_log').select('at,actor,table_name,action,row_id').order('at', { ascending: false }).limit(200); if (error) throw error; return data; }
  };
  const db = DEMO ? demoDb : liveDb;

  // =====================================================================
  // Identity
  // =====================================================================
  const DEMO_IDS = { employee: 'p1', direct_manager: 'p2', hod_hr: 'p6', hr_admin: null, head_of_finance: null, ceo: 'p7', qms_admin: null };
  async function loadMe() {
    if (DEMO) {
      const role = sessionStorageGet('demoRole') || 'hod_hr';
      me = { userId: 'demo', personId: DEMO_IDS[role] || null, roles: [role], name: 'Demo · ' + ROLE_NAMES[role] };
      if (role === 'direct_manager') me.roles.push('employee');
      return true;
    }
    const { data } = await sb.auth.getUser();
    if (!data || !data.user) return false;
    const uid = data.user.id;
    const [r, p] = await Promise.all([sb.from('app_user_role').select('role').eq('user_id', uid), sb.from('hr_person').select('id,first_name,last_name').eq('auth_user_id', uid).maybeSingle()]);
    me = { userId: uid, personId: p.data ? p.data.id : null, roles: (r.data || []).map((x) => x.role), name: p.data ? p.data.first_name + ' ' + p.data.last_name : data.user.email };
    if (me.personId && !me.roles.includes('employee')) me.roles.push('employee');
    return true;
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  // =====================================================================
  // Navigation
  // =====================================================================
  const NAV = [
    ['Overview', [['#/home', 'Home', '0.0', () => true]]],
    ['My leave', [['#/my-leave', 'My leave', 'P1', () => !!me.personId], ['#/team-leave', 'Team approvals', 'P2', () => has('direct_manager', 'ceo', 'board') || isHR()]]],
    ['HR', [['#/people', 'People', '2.1', isHR], ['#/leave-admin', 'Leave (HR)', '3.0', isHR], ['#/grading', 'Grading & scales', '1.2', isHR], ['#/risks', 'Risk register', '8.0', isHR], ['#/audit', 'Audit log', '9.1', () => has('hod_hr', 'head_of_finance', 'ceo')]]],
    ['Quality', [['#/risk-tracker', 'Risk tracker', 'R1', () => has('qms_admin') || isHR()]]],
    ['Help', [['#/help', 'How to use', '?', () => true]]]
  ];
  function renderNav() {
    const cur = location.hash.split('/').slice(0, 2).join('/') || '#/home';
    let h = '<div class="brand"><div class="logo">A</div><div><div style="font-weight:800">Angels PERSAL</div><div class="note">HR portal</div></div></div>';
    NAV.forEach(([g, items]) => {
      const vis = items.filter((i) => i[3]()); if (!vis.length) return;
      h += `<div class="group">${esc(g)}</div>` + vis.map(([href, label, code]) => `<a href="${href}" class="${cur === href ? 'on' : ''}">${esc(label)}<span class="code">${esc(code)}</span></a>`).join('');
    });
    $('#nav').innerHTML = h;
    let w = `<span>Signed in as <strong>${esc(me.name)}</strong></span>`;
    if (DEMO) w += `<label style="flex-direction:row;align-items:center;gap:6px">View as <select id="roleSel">${Object.keys(DEMO_IDS).map((r) => `<option value="${r}" ${me.roles[0] === r ? 'selected' : ''}>${ROLE_NAMES[r]}</option>`).join('')}</select></label>`;
    else w += '<button class="btn sec sm" id="signOut">Sign out</button>';
    $('#who').innerHTML = w;
    if (DEMO) $('#roleSel').onchange = (e) => { sessionStorageSet('demoRole', e.target.value); loadMe().then(() => { location.hash = '#/home'; route(); }); };
    else $('#signOut').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  }

  // =====================================================================
  // Pages
  // =====================================================================
  const page = (title, sub, body) => `<div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${body}`;
  const empty = (t) => `<tr><td colspan="9" class="note">${esc(t)}</td></tr>`;

  async function pHome() {
    const tiles = [];
    if (me.personId) { const b = await db.balances(me.personId); tiles.push(['My annual leave', (b.annual != null ? (+b.annual).toFixed(2) : '—') + ' days', '15 a year · 20 after 5 years', '#/my-leave']); }
    if (has('direct_manager')) { const t = await db.teamLeave(me.personId); tiles.push(['Waiting for my approval', t.length, 'Leave from my direct reports', '#/team-leave']); }
    if (isHR()) {
      const [ppl, lv, rk] = await Promise.all([db.people(), db.allLeave(), db.risks()]);
      tiles.push(['People', ppl.length, ppl.filter((p) => !p.persal_no).length + ' without a PERSAL number', '#/people']);
      tiles.push(['Leave with managers', lv.filter((l) => ['submitted', 'with_manager', 'escalated'].includes(l.status)).length, 'Not yet decided', '#/leave-admin']);
      tiles.push(['Open HR risks', rk.filter((r) => r.status !== 'closed').length, rk.filter((r) => ['High', 'Critical'].includes(r.level) && r.status === 'open').length + ' High/Critical not reported', '#/risks']);
    }
    if (has('qms_admin') && !isHR()) { const t = await db.tracker(); tiles.push(['HR risks to follow', t.filter((r) => r.status !== 'closed').length, 'No names or personal details', '#/risk-tracker']); }
    return page(DEMO ? 'Welcome · ' + (ROLE_NAMES[me.roles[0]] || '') : 'Welcome' + (me.name ? ', ' + me.name.split(' ')[0] : ''), esc(C.ORGANISATION || 'Angels Resource Centres') + ' · HR portal',
      (DEMO ? '<div class="banner" style="background:var(--warnbg);color:var(--warn)"><strong>Demo mode.</strong> Sample data only, kept in this browser tab. Use “View as” at the top to see each role. Nothing is saved online.</div>' : '') +
      `<div class="grid">${tiles.map(([l, v, s, href]) => `<a class="card tile" href="${href}" style="text-decoration:none;color:inherit"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s)}</div></a>`).join('')}</div>`);
  }

  async function pMyLeave() {
    if (!me.personId) return page('My leave', '', '<div class="card">Your sign-in is not linked to a person record yet. Please ask HR.</div>');
    const [b, list] = await Promise.all([db.balances(me.personId), db.myLeave(me.personId)]);
    const opts = cache.leaveTypes.map((t) => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join('');
    setTimeout(() => {
      const f = $('#leaveForm'); const upd = () => { $('#days').textContent = workingDays(f.date_from.value, f.date_to.value) + ' working days · public holidays not counted'; };
      f.date_from.oninput = upd; f.date_to.oninput = upd; upd();
      f.onsubmit = async (e) => {
        e.preventDefault(); const btn = f.querySelector('button'); btn.disabled = true;
        try {
          if (f.date_to.value < f.date_from.value) throw new Error('The end date is before the start date.');
          const r = await db.applyLeave(me.personId, { leave_type: f.leave_type.value, date_from: f.date_from.value, date_to: f.date_to.value, note: f.note.value || null });
          toast('Sent to your direct manager · ' + (r.ref || '')); route();
        } catch (err) { toast(err.message); btn.disabled = false; }
      };
      document.querySelectorAll('[data-cancel]').forEach((x) => (x.onclick = async () => { try { await db.cancelLeave(+x.dataset.cancel); toast('Request cancelled'); route(); } catch (err) { toast(err.message); } }));
    });
    const bal = [['Annual', b.annual], ['Sick', b.sick], ['Family responsibility', b.family], ['Time off for overtime', b.toil]];
    return page('My leave', 'Apply here; your direct manager approves. You see only your own leave.',
      `<div class="grid">${bal.map(([l, v]) => `<div class="card tile"><div class="l">${l}</div><div class="v">${v != null ? (+v).toFixed(2) : '—'}</div><div class="s">days available</div></div>`).join('')}</div>
      <div class="grid2"><section class="card"><h2>Apply for leave</h2><form id="leaveForm">
        <label>Leave type<select name="leave_type" required>${opts}</select></label>
        <div class="two"><label>From<input type="date" name="date_from" required></label><label>To<input type="date" name="date_to" required></label></div>
        <div class="banner" style="background:var(--bg)" id="days"></div>
        <label>Note for your manager (optional)<textarea name="note" rows="2"></textarea></label>
        <p class="note">Sick leave of more than 2 days needs a medical certificate, given to HR by the day you return. No annual leave during a notice period.</p>
        <button class="btn" type="submit">Send to my direct manager</button></form></section>
      <section class="card"><h2>My requests</h2><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.length ? list.map((l) => `<tr><td class="m">${esc(l.ref)}</td><td>${esc(words(l.leave_type))}</td><td>${fmtDate(l.date_from)} – ${fmtDate(l.date_to)}</td><td>${esc(l.working_days)}</td><td>${pill(LEAVE_PILL[l.status] || 'p-grey', words(l.status))}${l.decision_reason ? `<div class="note">${esc(l.decision_reason)}</div>` : ''}</td><td>${['submitted', 'with_manager'].includes(l.status) ? `<button class="btn sec sm" data-cancel="${l.id}">Cancel</button>` : ''}</td></tr>`).join('') : empty('No requests yet.')}
      </tbody></table></div></section></div>`);
  }

  async function pTeamLeave() {
    const list = me.personId ? await db.teamLeave(me.personId) : [];
    setTimeout(() => document.querySelectorAll('[data-decide]').forEach((x) => (x.onclick = async () => {
      const [id, status] = x.dataset.decide.split(':'); let reason = null;
      if (status === 'declined') { reason = (document.getElementById('r' + id).value || '').trim(); if (!reason) { toast('Please give a reason to decline.'); return; } }
      try { await db.decideLeave(+id, status, reason); toast(status === 'approved' ? 'Approved' : 'Declined'); route(); } catch (err) { toast(err.message); }
    })));
    return page('Team approvals', 'Leave from people who report directly to you. Requests move to the next level after [3] working days.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>Name</th><th>Type</th><th>Dates</th><th>Days</th><th>Balance now</th><th>Note</th><th>Decision</th></tr></thead><tbody>
      ${list.length ? list.map((l) => `<tr><td><strong>${esc(l.person_name)}</strong><div class="m">${esc(l.ref)}</div></td><td>${esc(words(l.leave_type))}</td><td>${fmtDate(l.date_from)} – ${fmtDate(l.date_to)}</td><td>${esc(l.working_days)}</td><td>${l.balance != null ? (+l.balance).toFixed(2) : '—'}</td><td class="note">${esc(l.note || '')}</td>
        <td><div class="row"><button class="btn ok sm" data-decide="${l.id}:approved">Approve</button><input id="r${l.id}" placeholder="Reason to decline" style="min-width:150px"><button class="btn bad sm" data-decide="${l.id}:declined">Decline</button></div></td></tr>`).join('') : empty('Nothing waiting for you.')}
      </tbody></table></div></section>`);
  }

  async function pPeople() {
    const list = await db.people();
    setTimeout(() => { const s = $('#q'); s.oninput = () => { const v = s.value.toLowerCase(); document.querySelectorAll('#ppl tr').forEach((tr) => (tr.style.display = tr.textContent.toLowerCase().includes(v) ? '' : 'none')); }; });
    return page('People', 'Personnel records. Visible to HOD HR, HR Administrator, Head of Finance and CEO only.',
      `<section class="card"><div class="row" style="margin-bottom:10px"><input id="q" placeholder="Search name, PERSAL number, department" style="flex:1;min-width:220px" aria-label="Search people"></div>
      <div class="tblwrap"><table><thead><tr><th>PERSAL no</th><th>Name</th><th>Category</th><th>Department</th><th>Start date</th><th>Status</th></tr></thead><tbody id="ppl">
      ${list.map((p) => `<tr><td class="m">${p.persal_no ? esc(p.persal_no) : pill('p-warn', 'Not issued')}</td><td><a href="#/person/${esc(p.id)}"><strong>${esc(p.first_name + ' ' + p.last_name)}</strong></a></td><td>${esc(CAT[p.category] || p.category)}</td><td>${esc(p.department || '')}</td><td>${fmtDate(p.start_date)}</td><td>${pill(p.status === 'active' ? 'p-ok' : 'p-grey', words(p.status))}</td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  async function pPerson(id) {
    const p = await db.person(id); if (!p) return page('Not found', '', '');
    setTimeout(() => { const b = $('#issue'); if (b) b.onclick = async () => { b.disabled = true; try { const n = await db.issuePersal(id); toast('PERSAL number issued: ' + n); route(); } catch (err) { toast(err.message); b.disabled = false; } }; });
    const bl = p.balances || {};
    return page(p.first_name + ' ' + p.last_name, esc((p.title || '') + (p.department ? ' · ' + p.department : '')) + ' · <a href="#/people">Back to people</a>',
      `<div class="grid2"><section class="card"><h2>PERSAL number</h2>
        ${p.persal_no ? `<div class="m" style="font-size:28px">${esc(p.persal_no)}</div><p class="note">${validPersal(p.persal_no) ? 'Check digit valid' : 'Check digit invalid'} · never changed or reused</p>`
          : `<p>No PERSAL number yet. It is normally issued when the appointment or agreement is approved.</p>${has('hod_hr', 'hr_admin') ? '<button class="btn" id="issue">Issue PERSAL number</button>' : ''}`}
        <p class="note">8 digits: 7 random digits and a check digit. Not based on ID number, start date or name.</p></section>
      <section class="card"><h2>Record</h2><dl class="kv">
        <div><dt>Category</dt><dd>${esc(CAT[p.category] || p.category)}</dd></div><div><dt>Status</dt><dd>${esc(words(p.status))}</dd></div>
        <div><dt>Employment start (first day worked)</dt><dd>${fmtDate(p.start_date)}</dd></div><div><dt>Direct manager</dt><dd>${esc(p.manager_name || '—')}</dd></div></dl>
        <p class="note">ID, tax, bank and Employment Equity details are kept separately and shown only to HOD HR, Head of Finance and CEO.</p></section>
      <section class="card"><h2>Leave balances</h2><dl class="kv">${['annual', 'sick', 'family', 'toil'].map((k) => `<div><dt>${esc(words(k === 'toil' ? 'time off for overtime' : k))}</dt><dd>${bl[k] != null ? (+bl[k]).toFixed(2) : '—'}</dd></div>`).join('')}</dl></section></div>`);
  }

  async function pLeaveAdmin() {
    const list = await db.allLeave();
    return page('Leave (HR)', 'All leave requests. Leave Policy: 15 days a year, 20 after 5 completed years; Dec–Jan closure; carried-over leave used within 4 months; no leave in the notice period.',
      `<div class="grid">${['with_manager', 'escalated', 'approved', 'declined'].map((s) => `<div class="card tile"><div class="l">${words(s)}</div><div class="v">${list.filter((l) => l.status === s).length}</div></div>`).join('')}</div>
      <section class="card"><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Person</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead><tbody>
      ${list.length ? list.map((l) => `<tr><td class="m">${esc(l.ref)}</td><td>${esc(l.person_name)}</td><td>${esc(words(l.leave_type))}</td><td>${fmtDate(l.date_from)} – ${fmtDate(l.date_to)}</td><td>${esc(l.working_days)}</td><td>${pill(LEAVE_PILL[l.status] || 'p-grey', words(l.status))}</td></tr>`).join('') : empty('No leave requests.')}
      </tbody></table></div></section>`);
  }

  async function pGrading() {
    const g = await db.grades();
    setTimeout(() => {
      const f = $('#calc'); const run = () => {
        const sal = +f.sal.value, mid = +f.mid.value, gap = 1 + (+f.gap.value || 5) / 100;
        const steps = [0, 1, 2, 3, 4].map((i) => Math.round(mid / (gap * gap) * Math.pow(gap, i) / 50) * 50);
        let res = 'Enter a salary and the market rate.';
        if (sal && mid) {
          if (sal > steps[4]) res = 'Above step 5: salary kept; smaller increases until the scale catches up.';
          else if (sal < steps[0]) res = 'Below step 1: brought up to step 1 in phases.';
          else { const on = steps.indexOf(sal); if (on >= 0) res = 'On step ' + (on + 1) + '.'; else { const lo = steps.filter((s) => s < sal).length; res = `Between step ${lo} and step ${lo + 1}: round up (costs R ${(steps[lo] - sal).toLocaleString('en-ZA')} a month) or keep until the next annual increase.`; } }
        }
        $('#steps').innerHTML = steps.map((s, i) => `<div class="card tile" style="padding:10px"><div class="l">Step ${i + 1}</div><div class="m" style="font-size:14px">R ${s.toLocaleString('en-ZA')}</div></div>`).join('');
        $('#res').textContent = res;
      };
      f.oninput = run; run();
    });
    return page('Grading & salary scales', 'Proposal · levels L1–L6 (Paterson) · 5 steps per title · step 3 = market rate · rand values to be approved.',
      `<div class="grid2"><section class="card"><h2>Where does a salary fall?</h2><form id="calc" onsubmit="return false">
        <div class="two"><label>Current monthly salary (R)<input name="sal" type="number" value="25000"></label><label>Market rate · step 3 (R)<input name="mid" type="number" value="25000"></label></div>
        <label>Gap between steps (%)<input name="gap" type="number" step="0.5" value="5"></label></form>
        <div class="grid" id="steps" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:12px"></div>
        <div class="banner" id="res" style="background:var(--infobg);color:var(--info);margin-top:12px"></div></section>
      <section class="card"><h2>Starting step for new appointments</h2><table><tbody>
        <tr><td>${pill('p-ok', 'Step 1')}</td><td>Meets the minimum requirements (default)</td></tr>
        <tr><td>${pill('p-info', 'Step 2')}</td><td>[2–4] years of relevant experience above the minimum, or a higher relevant qualification</td></tr>
        <tr><td>${pill('p-warn', 'Step 3')}</td><td>[5+] years; approved by HOD HR and Head of Finance</td></tr>
        <tr><td>${pill('p-bad', 'Steps 4–5')}</td><td>Scarce skill or strong current salary; CEO with a written reason</td></tr></tbody></table></section></div>
      <section class="card"><h2>Levels per title</h2><div class="tblwrap"><table><thead><tr><th>Title</th><th>Level</th><th>Step 1</th><th>Step 3 (market)</th><th>Step 5</th></tr></thead><tbody>
      ${g.map((r) => `<tr><td>${esc(r.title)}</td><td>${pill('p-info', r.level)}</td><td class="m">${r.step1 ? 'R ' + (+r.step1).toLocaleString('en-ZA') : '[R]'}</td><td class="m">${r.step3 ? 'R ' + (+r.step3).toLocaleString('en-ZA') : '[R]'}</td><td class="m">${r.step5 ? 'R ' + (+r.step5).toLocaleString('en-ZA') : '[R]'}</td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  async function pRisks() {
    const list = await db.risks();
    setTimeout(() => {
      const f = $('#riskForm');
      if (f) f.onsubmit = async (e) => { e.preventDefault(); try { await db.addRisk({ title: f.title.value, area: f.area.value, likelihood: +f.l.value, impact: +f.i.value, owner_role: f.owner.value, controls: f.controls.value || null }); toast('Risk logged · the QMS Administrator is alerted'); route(); } catch (err) { toast(err.message); } };
      document.querySelectorAll('[data-status]').forEach((sel) => (sel.onchange = async () => {
        const id = +sel.dataset.status; const st = sel.value; const fld = { status: st };
        if (st === 'reported') { fld.reported_to = prompt('Reported to whom (CEO, HOD, Board)?') || null; fld.reported_at = new Date().toISOString(); }
        if (st === 'closed') { fld.closure_note = prompt('Closure note:') || ''; fld.closure_evidence = prompt('Evidence (document reference):') || ''; }
        try { await db.updateRisk(id, fld); toast('Risk updated'); } catch (err) { toast(err.message); } route();
      }));
    });
    const st = ['open', 'reported', 'action_in_progress', 'closed'];
    return page('HR risk register', 'Score = likelihood × impact. Critical 20–25: CEO and Board immediately · High 12–19: CEO within [48 hours] · Medium 6–11: HOD within [5] days · Low: quarterly report.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Risk</th><th>Area</th><th>L × I</th><th>Level</th><th>Reported to</th><th>Action due</th><th>Status</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td class="m">${esc(r.ref)}</td><td><strong>${esc(r.title)}</strong></td><td>${esc(r.area)}</td><td class="m">${r.likelihood} × ${r.impact} = ${r.score}</td><td>${pill(RISK_PILL[r.level], r.level)}</td><td>${esc(r.reported_to || '—')}${r.reported_at ? `<div class="note">${fmtDate(String(r.reported_at).slice(0, 10))}</div>` : ''}</td><td>${fmtDate(r.action_due)}</td>
        <td>${has('hod_hr', 'hr_admin', 'ceo') ? `<select data-status="${r.id}" aria-label="Status of ${esc(r.ref)}">${st.map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${words(s)}</option>`).join('')}</select>` : pill('p-grey', words(r.status))}</td></tr>`).join('')}
      </tbody></table></div><p class="note">Closing needs a closure note, an evidence reference and HOD HR approval (CEO too for High and Critical).</p></section>
      ${has('hod_hr', 'hr_admin') ? `<section class="card"><h2>Log a risk</h2><form id="riskForm"><label>Risk<input name="title" required></label>
        <div class="two"><label>Area<input name="area" required placeholder="Leave · BCEA"></label><label>Owner<select name="owner">${HR_CORE.map((r) => `<option value="${r}">${ROLE_NAMES[r]}</option>`).join('')}</select></label></div>
        <div class="two"><label>Likelihood (1–5)<input name="l" type="number" min="1" max="5" value="3" required></label><label>Impact (1–5)<input name="i" type="number" min="1" max="5" value="3" required></label></div>
        <label>Controls / action<textarea name="controls" rows="2"></textarea></label><button class="btn" type="submit">Log risk</button></form></section>` : ''}`);
  }

  async function pTracker() {
    const list = await db.tracker();
    const late = list.filter((r) => ['High', 'Critical'].includes(r.level) && r.status === 'open');
    return page('Risk tracker', 'HR risks for the QMS risk register. No names or personal details.',
      `<div class="grid"><div class="card tile"><div class="l">Open</div><div class="v">${list.filter((r) => r.status !== 'closed').length}</div></div><div class="card tile"><div class="l">High/Critical not reported</div><div class="v" style="color:var(--bad)">${late.length}</div></div><div class="card tile"><div class="l">Closed</div><div class="v" style="color:var(--ok)">${list.filter((r) => r.status === 'closed').length}</div></div></div>
      <section class="card"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">All HR risks</h2><button class="btn sec sm" id="csv">Export quarterly report (CSV)</button></div><div class="tblwrap"><table><thead><tr><th>HR ref</th><th>QMS ref</th><th>Area</th><th>Level</th><th>Owner</th><th>Reported</th><th>Action due</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td class="m">${esc(r.ref)}</td><td class="m">${esc(r.qms_ref || '[add]')}</td><td>${esc(r.area)}</td><td>${pill(RISK_PILL[r.level], r.level)}</td><td>${esc(ROLE_NAMES[r.owner_role] || r.owner_role)}</td><td>${r.reported_to ? esc(r.reported_to) + ' · ' + fmtDate(String(r.reported_at || '').slice(0, 10)) : (['High', 'Critical'].includes(r.level) ? pill('p-bad', 'Not reported') : '—')}</td><td>${fmtDate(r.action_due)}</td><td>${pill(r.status === 'closed' ? 'p-ok' : 'p-grey', words(r.status))}</td><td class="note">${esc(r.closure_evidence || '')}</td></tr>`).join('')}
      </tbody></table></div></section>` + scriptExport(list));
  }
  function scriptExport(list) {
    setTimeout(() => { const b = $('#csv'); if (b) b.onclick = () => {
      const cols = ['ref', 'qms_ref', 'area', 'level', 'score', 'owner_role', 'reported_to', 'reported_at', 'action_due', 'status', 'closure_evidence'];
      const csv = [cols.join(',')].concat(list.map((r) => cols.map((c) => '"' + String(r[c] == null ? '' : r[c]).replace(/"/g, '""') + '"').join(','))).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'HR-risks-quarterly.csv'; a.click();
    }; });
    return '';
  }

  async function pAudit() {
    const list = await db.audit();
    return page('Audit log', 'Every change is recorded and can never be edited or deleted. ID, tax, bank and EE values are masked.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>When</th><th>Who</th><th>Table</th><th>Action</th><th>Record</th></tr></thead><tbody>
      ${list.map((a) => `<tr><td>${esc(new Date(a.at).toLocaleString('en-ZA'))}</td><td class="m">${esc(a.actor)}</td><td>${esc(a.table_name)}</td><td>${esc(a.action)}</td><td class="m">${esc(a.row_id)}</td></tr>`).join('')}
      </tbody></table></div></section>`);
  }

  function pHelp() {
    return page('How to use PERSAL', '', `<div class="grid2">
      <section class="card"><h2>Staff</h2><ol><li>Open <a href="#/my-leave">My leave</a>.</li><li>Choose the type and dates; the working days are counted for you (weekends and public holidays are skipped).</li><li>Send it: your direct manager is told and decides in the portal.</li><li>Follow the status under My requests; cancel while it is still waiting.</li></ol></section>
      <section class="card"><h2>Direct managers</h2><ol><li>Open <a href="#/team-leave">Team approvals</a>.</li><li>Approve, or type a reason and decline (the reason is shown to the employee).</li><li>If you do not act within [3] working days, the request moves up a level.</li></ol></section>
      <section class="card"><h2>HR</h2><ul><li>People: search records, issue PERSAL numbers.</li><li>Leave (HR): all requests and their status.</li><li>Grading: check where a salary falls on a title's 5 steps.</li><li>Risk register: log and update HR risks; closing needs evidence.</li></ul></section>
      <section class="card"><h2>Privacy (POPIA)</h2><p>Staff see only their own leave. Managers see only their direct reports' leave. Personnel, pay and Employment Equity data stay with the four HR roles. Every action is in the audit log. Questions about your information: the Information Officer.</p></section></div>`);
  }

  // =====================================================================
  // Sign-in (live mode)
  // =====================================================================
  function loginPage() {
    $('#nav').innerHTML = ''; $('#who').innerHTML = '';
    $('#main').innerHTML = `<div class="card login"><div class="brand"><div class="logo">A</div><div><div style="font-weight:800">Angels PERSAL</div><div class="note">HR portal</div></div></div>
      ${C.SIGN_IN_WITH_MICROSOFT ? '<button class="btn" id="ms" style="width:100%">Sign in with Microsoft</button><p class="note" style="text-align:center">or</p>' : ''}
      <form id="mail"><label>Work email<input type="email" name="email" required placeholder="name@angelsinc.co.za"></label><button class="btn sec" type="submit">Email me a sign-in link</button></form></div>`;
    const ms = $('#ms'); if (ms) ms.onclick = () => sb.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: location.href.split('#')[0] } });
    $('#mail').onsubmit = async (e) => { e.preventDefault(); const { error } = await sb.auth.signInWithOtp({ email: e.target.email.value, options: { emailRedirectTo: location.href.split('#')[0] } }); toast(error ? error.message : 'Check your email for the sign-in link.'); };
  }

  // =====================================================================
  // Router
  // =====================================================================
  const ROUTES = { home: pHome, 'my-leave': pMyLeave, 'team-leave': pTeamLeave, people: pPeople, person: pPerson, 'leave-admin': pLeaveAdmin, grading: pGrading, risks: pRisks, 'risk-tracker': pTracker, audit: pAudit, help: pHelp };
  async function route() {
    const [, name, arg] = (location.hash || '#/home').split('/');
    const fn = ROUTES[name] || pHome;
    const ALLOW = { people: isHR, person: isHR, 'leave-admin': isHR, grading: isHR, risks: isHR, audit: () => has('hod_hr', 'head_of_finance', 'ceo'), 'risk-tracker': () => has('qms_admin') || isHR(), 'team-leave': () => has('direct_manager', 'ceo', 'board') || isHR() };
    if (ALLOW[name] && !ALLOW[name]()) { renderNav(); $('#main').innerHTML = page('No access', '', '<div class="card">This page is not part of your role. <a href="#/home">Back to home</a></div>'); return; }
    renderNav(); $('#nav').classList.remove('open');
    $('#main').innerHTML = '<p class="note">Loading…</p>';
    try { $('#main').innerHTML = await fn(arg); $('#main').focus(); }
    catch (err) { $('#main').innerHTML = page('Something went wrong', '', `<div class="card">${esc(err.message || err)}<p class="note">If this keeps happening, tell HR. You may not have access to this page.</p></div>`); }
  }

  async function start() {
    $('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
    if (!DEMO && !sb) { $('#main').innerHTML = '<div class="card">Supabase could not load. Check config.js and your internet connection.</div>'; return; }
    if (!DEMO) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' || (ev === 'SIGNED_IN' && !me.userId)) location.reload(); });
    if (!(await loadMe())) { loginPage(); return; }
    await db.init();
    window.addEventListener('hashchange', route);
    route();
  }
  start();
})();
