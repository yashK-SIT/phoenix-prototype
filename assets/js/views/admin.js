// ---------- INVITATIONS & USERS (shared by Org Rep and Programme Admin) ----------
function inviteTable(scopeCtx) {
  const inv = S.invites.filter(i => !scopeCtx || i.ctx === scopeCtx);
  inv.forEach(i => {
    if (['Pending', 'Resent'].includes(i.status) && i.expires < today()) i.status = 'Expired';
  });
  const cn = i => S.contexts.find(c => c.id === i.ctx).name;
  const uniq = xs => [...new Set(xs)].filter(Boolean);
  const canResend = i => ['Pending', 'Resent', 'Expired'].includes(i.status);
  const canRevoke = i => ['Pending', 'Resent'].includes(i.status);
  return dataView('adm:inv:' + (scopeCtx || 'all'), {
    label: 'invitations',
    items: inv,
    search: i => i.email + ' ' + ROLE[i.role] + ' ' + cn(i) + ' ' + P(i.by).name,
    quick: { label: 'Status', options: uniq(inv.map(i => i.status)).map(x => [x, x]), test: (i, v) => i.status === v },
    filters: [
      { key: 'role', label: 'Role', options: uniq(inv.map(i => i.role)).map(r => [r, ROLE[r] || r]), test: (i, v) => i.role === v },
      ...(scopeCtx ? [] : [{ key: 'ctx', label: 'Context', options: uniq(inv.map(i => i.ctx)).map(c => [c, S.contexts.find(x => x.id === c).name]), test: (i, v) => i.ctx === v }]),
    ],
    sorts: [
      ['until', 'Valid until', (a, b) => String(a.expires).localeCompare(String(b.expires))],
      ['email', 'Email', (a, b) => a.email.localeCompare(b.email)],
      ['status', 'Status', (a, b) => a.status.localeCompare(b.status)],
    ],
    rowId: i => i.id,
    row: i => ({
      lead: `<span class="av adm-inv-av" aria-hidden="true">${ic('mail', 14)}</span>`,
      title: `<span class="adm-em">${h(i.email)}</span>`,
      sub: `${ROLE[i.role]} · ${h(cn(i))}`,
      meta: [`Valid until ${fmt(i.expires)}`, `Invited by ${nm(i.by)}`],
      badges: pill(i.status),
      primary: canResend(i) ? B('Resend', 'invAct', { id: i.id, v: 'Resent' }) : '',
      menu: canRevoke(i) ? CB(ic('x', 16) + 'Revoke', 'invAct', { id: i.id, v: 'Revoked' }, 'Revoke the invitation for ' + i.email + '? The link stops working immediately.', 'menu-i danger', 'Revoke') : '',
    }),
    bulk: [
      { label: 'Resend', icon: 'refresh', run: ids => ids.map(id => byId('invites', id)).filter(i => i && canResend(i)).forEach(i => A.invAct({ id: i.id, v: 'Resent' })) },
      { label: 'Revoke', icon: 'x', danger: true, confirm: 'Revoke the selected pending invitations? Their links stop working immediately. Accepted, expired and already revoked invitations are left as they are.', run: ids => ids.map(id => byId('invites', id)).filter(i => i && canRevoke(i)).forEach(i => A.invAct({ id: i.id, v: 'Revoked' })) },
    ],
    empty: ['mail', 'No invitations yet', 'Invite people to give them a role in this context.', ''],
  });
}
A.invAct = d => {
  const i = byId('invites', d.id);
  i.status = d.v;
  if (d.v === 'Resent') {
    const e = new Date();
    e.setDate(e.getDate() + S.settings.inviteValidityDays);
    i.expires = e.toISOString().slice(0, 10);
    i.token = 'TKN-' + uid('R');
  }
  audit('Invitation ' + d.v, i.id, i.email);
  toast('Invitation ' + d.v.toLowerCase() + '.');
  ok();
};
A.invNew = d => {
  clearF('inv');
  const allowed = role() === 'O' ? ['P', 'F', 'M', 'C', 'O'] : ['P', 'F', 'M', 'C', 'O', 'S', 'A'];
  modal(
    'Create invitations',
    () =>
      `<form data-f="inv" class="col adm-form" novalidate>${fi('inv', 'emails', 'Email addresses (one per line, or paste a CSV column — up to 1,000)', { type: 'textarea', rows: 5, req: true })}<div class="f2">${fi('inv', 'role', 'Nominated role', { type: 'select', req: true, opts: invitableRoles(allowed).map(r => [r.id, r.name + (r.system ? '' : ' (custom)')]) })}${fi('inv', 'days', 'Valid for (days)', { type: 'number', req: true, min: 1, value: S.settings.inviteValidityDays })}</div>${fi('inv', 'until', 'Role assignment expires (optional)', { type: 'date', help: 'After this date the role stops working until an administrator renews it. Leave empty for no expiry.' })}${fi('inv', 'ctx', 'Context', { type: 'select', req: true, opts: S.contexts.filter(c => c.kind !== 'Platform' && (role() !== 'O' || c.id === ctxId())).map(c => [c.id, c.name]), value: ctxId() })}${banner('info', '', 'Single-use links are sent by transactional email. Sensitive roles need approval after registration. An existing PHOENIX email gets the role added to their record.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
  );
};
F.inv = d => {
  if (!validate('inv', d, { emails: ['req'], role: ['req'], days: ['req', 'num'], ctx: ['req'] })) return render();
  if (d.until && d.until <= today()) {
    UI.err.inv = { until: 'Choose a date after today, or leave it empty.' };
    return render();
  }
  const list = d.emails
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
  const bad = list.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (list.length > 1000) {
    UI.err.inv = { emails: 'Maximum 1,000 invitations per upload.' };
    return render();
  }
  if (bad.length) {
    UI.err.inv = { emails: 'Invalid: ' + bad.slice(0, 5).join(', ') + (bad.length > 5 ? '…' : '') };
    return render();
  }
  const e = new Date();
  e.setDate(e.getDate() + +d.days);
  let dup = 0;
  list.forEach(em => {
    if (S.invites.some(i => i.email === em && i.ctx === d.ctx && ['Pending', 'Resent'].includes(i.status))) {
      dup++;
      return;
    }
    S.invites.push({
      id: uid('i'),
      token: 'TKN-' + uid(''),
      email: em,
      role: d.role,
      ctx: d.ctx,
      status: 'Pending',
      expires: e.toISOString().slice(0, 10),
      by: myId(),
      sent: today(),
      ...(d.until ? { until: d.until } : {}),
    });
  });
  audit('Invitations created', d.ctx, list.length - dup + ' × ' + ROLE[d.role]);
  UI.modal = null;
  clearF('inv');
  toast(`${list.length - dup} invitation(s) sent${dup ? ', ' + dup + ' duplicate(s) skipped' : ''}.`);
  ok();
};
// crud: the Programme Administrator can also add, view, edit and delete the account itself.
function usersTable(ctxFilter, canEdit, crud) {
  const as = S.assign
    .filter(a => !ctxFilter || a.ctx === ctxFilter)
    .sort((x, y) => (y.status === 'Pending role approval') - (x.status === 'Pending role approval'));
  const cn = a => S.contexts.find(c => c.id === a.ctx).name;
  const uniq = xs => [...new Set(xs)].filter(Boolean);
  return dataView('adm:users:' + (ctxFilter || 'all'), {
    label: 'role assignments',
    searchLabel: 'Search people, emails or roles',
    items: as,
    search: a => P(a.pid).name + ' ' + (P(a.pid).email || '') + ' ' + ROLE[a.role] + ' ' + cn(a) + ' ' + a.bundles.join(' '),
    quick: { label: 'Status', options: uniq(as.map(a => a.status)).map(x => [x, x]), test: (a, v) => a.status === v },
    filters: [
      { key: 'role', label: 'Role', options: uniq(as.map(a => a.role)).map(r => [r, ROLE[r] || r]), test: (a, v) => a.role === v },
      { key: 'bundle', label: 'Permission bundle', options: S.bundles.map(b => [b.name, b.name]), test: (a, v) => a.bundles.includes(v) },
      ...(ctxFilter ? [] : [{ key: 'ctx', label: 'Context', options: uniq(as.map(a => a.ctx)).map(c => [c, S.contexts.find(x => x.id === c).name]), test: (a, v) => a.ctx === v }]),
    ],
    sorts: [
      ['name', 'Name', (a, b) => P(a.pid).name.localeCompare(P(b.pid).name)],
      ['role', 'Role', (a, b) => String(ROLE[a.role]).localeCompare(String(ROLE[b.role]))],
      ['status', 'Status', (a, b) => a.status.localeCompare(b.status)],
    ],
    row: a => ({
      lead: `<span class="av">${ini(a.pid)}</span>`,
      title: nm(a.pid),
      sub: h(P(a.pid).email),
      meta: [`<span class="adm-role">${ROLE[a.role]}</span>`, h(cn(a))],
      badges: pill(a.status) + a.bundles.map(b => pill(b, 'p-grey')).join('') + (a.mandate ? pill(a.mandate.valid ? 'Mandate to ' + fmt(a.mandate.until) : 'Mandate expired', a.mandate.valid ? 'p-teal' : 'p-red') : '') + (a.until ? pill((a.status === 'Expired' ? 'Role expired ' : 'Role expires ') + fmt(a.until), a.status === 'Expired' ? 'p-red' : 'p-grey') : ''),
      primary: crud
        ? B('View', 'userView', { id: a.id }) + (userEditable(a.pid) ? B(ic('edit', 14) + 'Edit', 'userEdit', { id: a.id }) + B('Manage', 'userManage', { id: a.id }) + CB('Delete', 'userDel', { pid: a.pid }, 'Delete the account of ' + P(a.pid).name + '? All of their roles are removed and they can no longer sign in. Their past contributions stay on record under their name.', 'btn-d btn-sm') : '')
        : canEdit && a.pid !== myId()
          ? B('Manage', 'userManage', { id: a.id })
          : '',
    }),
    empty: ['users', 'No users in this context yet', 'Invite people to give them a role.', ''],
  });
}
// ---- user accounts (Programme Administrator): create, read, update, delete
// Not your own account, and never a Platform Administrator's account.
const userEditable = pid => pid !== myId() && !S.assign.some(a => a.pid === pid && roleBase(a.role) === 'T');
const USER_ROLES = ['P', 'F', 'M', 'C', 'O', 'S', 'A'];
// A new role goes into the administrator's own context; an edited role keeps its context.
const userCtx = a => (a ? a.ctx : ctxId());
function userForm(p, a) {
  const f = 'usr';
  const cx = S.contexts.find(c => c.id === userCtx(a));
  const st = a ? (['Active', 'Deactivated'].includes(a.status) ? ['Active', 'Deactivated'] : [a.status, 'Active', 'Deactivated']) : null;
  return `<form data-f="usr" class="col" style="gap:14px" novalidate>${errSum(f)}<input type="hidden" name="aid" value="${a ? a.id : ''}">
  <h3 class="h3">Account</h3>
  <div class="f2">${fi(f, 'name', 'Full name', { req: true, value: p?.name, auto: 'off' })}${fi(f, 'display', 'Display name', { req: true, value: p?.display, auto: 'off' })}</div>
  <div class="f2">${fi(f, 'email', 'Email address', { type: 'email', req: true, value: p?.email, auto: 'off' })}${dobField(f, p?.dob || '', { req: true, auto: 'off', vis: '' })}</div>
  <h3 class="h3">${a ? 'This role assignment' : 'First role'}</h3>
  <div class="f2">${fi(f, 'role', 'Role', { type: 'select', req: true, ph: 'Choose a role', value: a?.role, opts: invitableRoles(USER_ROLES).map(r => [r.id, r.name + (r.system ? '' : ' (custom)')]) })}${fi(f, 'ctxName', 'Context', { value: cx ? cx.name : '', ro: true })}</div>
  ${a ? fi(f, 'status', 'Role status', { type: 'select', value: a.status, opts: st }) : ''}
  ${a && S.assign.filter(x => x.pid === a.pid).length > 1 ? banner('info', '', 'Account details apply to every role this person holds. Role and status apply only to this assignment.') : ''}
  ${a ? '' : banner('info', '', 'The account is created verified and the role is active. On first sign-in the person accepts the agreement for their role and completes their profile. Prototype: they sign in with the demo password demo1234.')}
  <div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${a ? 'Save changes' : 'Create user'}</button></div></form>`;
}
A.userNew = () => {
  clearF('usr');
  modal('Add user', () => userForm(null, null), true);
};
A.userEdit = d => {
  clearF('usr');
  const a = byId('assign', d.id);
  modal('Edit ' + nm(a.pid), () => userForm(P(a.pid), a), true);
};
A.userView = d => {
  const a = byId('assign', d.id);
  const p = P(a.pid);
  const roles = S.assign.filter(x => x.pid === p.id);
  modal(
    h(p.name),
    `<div class="col" style="gap:16px">${dl([
      ['Full name', h(p.name)],
      ['Display name', h(p.display)],
      ['Email', h(p.email)],
      ['Date of birth', p.dob ? fmt(p.dob) : '<span class="cap">Not recorded</span>'],
      ['Organization', h((S.orgs.find(o => o.id === p.org) || {}).name || '—')],
      ['Email verified', p.verified ? 'Yes' : 'No'],
      ['Account status', pill(p.status || 'Active')],
    ])}<div><h3 class="h3" style="margin-bottom:8px">Roles</h3>${table(
      ['Role', 'Context', 'Status', 'Expires'],
      roles.map(x => [h(ROLE[x.role]), h((S.contexts.find(c => c.id === x.ctx) || {}).name || x.ctx), pill(x.status), x.until ? fmt(x.until) : '—']),
    )}</div><div class="actions">${B('Close', 'closeM')}${userEditable(p.id) ? B(ic('edit', 14) + 'Edit', 'userEdit', { id: a.id }, 'btn-p btn-sm') : ''}</div></div>`,
    true,
  );
};
F.usr = d => {
  const a = d.aid ? byId('assign', d.aid) : null;
  const pid = a ? a.pid : null;
  const okv = validate('usr', d, {
    name: ['req'],
    display: ['req'],
    email: ['req', 'email', ['fn', { f: v => { const x = personByEmail(v); return !x || x.id === pid; }, m: 'Another account already uses this email address.' }]],
    dob: dobRules(true),
    role: ['req'],
  });
  if (!okv) return render();
  const ctx = userCtx(a);
  if (S.assign.some(x => x !== a && x.pid === pid && pid && x.role === d.role && x.ctx === ctx)) {
    UI.err.usr = { role: 'This person already holds that role in that context.' };
    return render();
  }
  const fields = { name: d.name.trim(), display: d.display.trim(), email: d.email.trim(), dob: d.dob };
  if (a) {
    const p = P(pid);
    const was = JSON.stringify({ name: p.name, display: p.display, email: p.email, dob: p.dob, role: a.role, ctx: a.ctx, status: a.status });
    Object.assign(p, fields);
    const roleChanged = a.role !== d.role;
    a.role = d.role;
    if (d.status && d.status !== a.status) {
      a.status = d.status;
      notify(a.pid, 'Your ' + ROLE[a.role] + ' access is now ' + d.status, 'home');
    }
    if (roleChanged) notify(a.pid, 'Your role was changed to ' + ROLE[a.role] + ' in ' + S.contexts.find(c => c.id === a.ctx).name, 'home');
    audit('User updated', p.id, was + ' → ' + JSON.stringify({ ...fields, role: a.role, ctx: a.ctx, status: a.status }));
    toast('User updated.');
  } else {
    const p = { id: uid('p'), ...fields, verified: true, status: 'Active', createdVia: 'admin', createdAt: now() };
    S.people.push(p);
    S.pw[p.id] = 'demo1234';
    S.consents[p.id] = { history: [] };
    S.assign.push({
      id: uid('a'),
      pid: p.id,
      role: d.role,
      ctx,
      status: 'Active',
      bundles: [],
      approval: [{ at: now(), by: myId(), note: 'Account created by ' + me().name }],
      onb: { agreement: false, consents: false, profile: false, compass: roleBase(d.role) !== 'P' },
    });
    notify(p.id, 'An account was created for you as ' + ROLE[d.role], 'home');
    audit('User created', p.id, ROLE[d.role] + ' · ' + ctx);
    toast('User created.');
  }
  UI.modal = null;
  clearF('usr');
  ok();
};
// Soft delete: the person record stays so names on past records still resolve; roles and sign-in are removed.
A.userDel = d => {
  const p = P(d.pid);
  const n = S.assign.filter(a => a.pid === p.id).length;
  S.assign = S.assign.filter(a => a.pid !== p.id);
  delete S.pw[p.id];
  p.status = 'Deleted';
  p.deletedAt = now();
  audit('User deleted', p.id, p.email + ' · ' + n + ' role(s) removed');
  toast(p.name + '’s account was deleted.');
  ok();
};
A.userManage = d => {
  const a = byId('assign', d.id);
  const isO = role() === 'O';
  modal(
    'Manage ' + nm(a.pid),
    () => `<div class="adm-dlg"><div class="adm-dlg-who"><span class="av lg">${ini(a.pid)}</span><div class="adm-who-t"><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email)}</div></div></div>${dl([
      ['Role', ROLE[a.role]],
      ['Context', h(S.contexts.find(c => c.id === a.ctx).name)],
      ['Status', pill(a.status)],
      ['Assignment expires', a.until ? fmt(a.until) : 'No expiry set'],
    ])}
 <section class="adm-sec"><h3 class="adm-sec-t">Access</h3><div class="row wrap adm-sec-a">${a.status === 'Pending role approval' ? B('Approve role', 'roleDecide', { id: a.id, v: 'Active' }, 'btn-p btn-sm') + B('Decline role', 'roleDecide', { id: a.id, v: 'Role not activated' }) : a.status === 'Active' ? CB('Deactivate', 'userStatus', { id: a.id, v: 'Deactivated' }, 'Deactivate this ' + ROLE[a.role] + ' access? The person keeps their account, consent, correction and export rights.', 'btn-d btn-sm') : B('Activate', 'userStatus', { id: a.id, v: 'Active' }, 'btn-p btn-sm')}</div></section>
 ${a.pid !== myId() ? `<form data-f="aexp" class="adm-sec" novalidate><input type="hidden" name="id" value="${a.id}">${fi('aexp', 'until', 'Role assignment expires', { type: 'date', value: a.until || '', help: 'Leave empty for no expiry. On the day after this date the role stops working until it is renewed.' })}<div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">Save expiry</button></div></form>` : ''}
 <form data-f="bund" class="adm-sec"><input type="hidden" name="id" value="${a.id}"><span class="lbl adm-sec-t">Specialist permission bundles</span><div class="adm-chks">${S.bundles.map(b => `<label class="adm-chk"><input class="chk" type="checkbox" name="b" value="${b.name}" ${a.bundles.includes(b.name) ? 'checked' : ''} ${isO && ['Finance Owner', 'AI Owner', 'Trust/Data Steward', 'Incident/Safety Owner'].includes(b.name) ? 'disabled' : ''}><span class="adm-chk-t">${b.name}</span><span class="cap">· ${h(b.approval)}</span></label>`).join('')}</div><span class="help">Higher-trust bundles need Programme/Organization Administrator approval and are not delegated at workspace level.</span><div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">Save bundles</button></div></form>
 ${['O', 'C'].includes(roleBase(a.role)) ? `<form data-f="mand" class="adm-sec"><input type="hidden" name="id" value="${a.id}"><span class="lbl adm-sec-t">Mandate (authority to bind the organization)</span><div class="f2">${fi('mand', 'scope', 'Scope', { value: a.mandate?.scope, req: true })}${fi('mand', 'until', 'Valid until', { type: 'date', req: true, value: a.mandate?.until })}</div><div class="actions">${a.mandate ? CB('Revoke mandate', 'mandRevoke', { id: a.id }, 'Revoke this mandate? Elevated access is removed; ordinary access continues.', 'btn-d btn-sm') : '<span></span>'}<button class="btn btn-s btn-sm" type="submit">Grant / update mandate</button></div></form>` : ''}</div>`,
  );
};
A.userStatus = d => {
  const a = byId('assign', d.id);
  if (d.v === 'Active' && a.until && a.until < today()) {
    audit('Role assignment expiry cleared on reactivation', a.id, 'was ' + a.until);
    delete a.until;
  }
  a.status = d.v;
  notify(a.pid, 'Your ' + ROLE[a.role] + ' access is now ' + d.v, 'home');
  audit('User ' + d.v, a.id, '');
  UI.modal = null;
  ok();
};
F.aexp = d => {
  const a = byId('assign', d.id);
  if (d.until && d.until < today()) {
    UI.err.aexp = { until: 'Choose today or a later date, or leave it empty.' };
    return render();
  }
  const was = a.until || 'none';
  if (d.until) a.until = d.until;
  else delete a.until;
  if (a.status === 'Expired' && (!a.until || a.until >= today())) a.status = 'Active';
  notify(a.pid, 'Your ' + ROLE[a.role] + ' assignment ' + (a.until ? 'now expires on ' + fmt(a.until) : 'no longer has an expiry date'), 'profile', { tab: 'compass' });
  audit('Role assignment expiry set', a.id, was + ' → ' + (a.until || 'none'));
  UI.modal = null;
  clearF('aexp');
  toast('Expiry saved.');
  ok();
};
F.bund = d => {
  const a = byId('assign', d.id);
  const isO = role() === 'O';
  const hi = ['Finance Owner', 'AI Owner', 'Trust/Data Steward', 'Incident/Safety Owner'];
  let nb = [].concat(d.b || []);
  if (isO) nb = nb.filter(b => !hi.includes(b)).concat(a.bundles.filter(b => hi.includes(b)));
  a.bundles = nb;
  audit('Bundles changed', a.id, nb.join(', '));
  UI.modal = null;
  toast('Bundles updated.');
  ok();
};
F.mand = d => {
  if (!validate('mand', d, { scope: ['req'], until: ['req', 'date'] })) return render();
  const a = byId('assign', d.id);
  a.mandate = { valid: true, until: d.until, scope: d.scope };
  audit('Mandate granted', a.id, d.scope);
  UI.modal = null;
  clearF('mand');
  ok();
};
A.mandRevoke = d => {
  const a = byId('assign', d.id);
  a.mandate.valid = false;
  S.rooms.forEach(x =>
    x.members.filter(m => m.pid === a.pid && /Institutional/.test(m.role)).forEach(m => (m.role = 'Member')),
  );
  audit('Mandate revoked', a.id, 'Elevated access removed; ordinary access continues');
  UI.modal = null;
  toast('Mandate revoked. Elevated access removed; ordinary access continues.');
  ok();
};
// ---------- ORGANIZATION WORKSPACE (6.5) ----------
route('org', 'admin', () => {
  if (role() !== 'O') return deniedView('admin');
  const c = ctxId();
  const pk = pack();
  const t = tabs(
    'org',
    [
      ['invites', 'Invitations'],
      ['users', 'Users & roles'],
      ['config', 'Configuration'],
      ['projects', 'Projects & spaces'],
      ['reports', 'Reports & exports'],
    ],
    UI.p.tab,
  );
  let body = '';
  if (t.cur === 'invites')
    body = card(
      `Invitation lifecycle <span class="adm-n">${S.invites.filter(i => i.ctx === c).length}</span>`,
      'Pending · Accepted · Expired · Revoked · Resent',
      inviteTable(c),
      B(ic('plus', 14) + 'Invite users', 'invNew', {}, 'btn-p btn-sm'),
      'adm-panel',
    );
  if (t.cur === 'users')
    body = card(
      `Users in your organisation’s context <span class="adm-n">${S.assign.filter(a => a.ctx === c).length}</span>`,
      'Assign roles, grant or revoke mandates within your organisation.',
      usersTable(c, true),
      '',
      'adm-panel',
    );
  if (t.cur === 'config')
    body =
      `<div class="adm-stack">${cfgForm(true)}${tplForm()}${card(
        'Grow your programme',
        'Launch a new cohort, initiative or use-case pack.',
        table(
          ['Request', 'Pack', 'Start', 'Status'],
          S.cohortReqs
            .filter(r => r.by === myId())
            .map(r => [
              `<b>${h(r.name)}</b>`,
              h(S.packs.find(p => p.id === r.pack)?.name),
              `<span class="adm-date">${fmt(r.start)}</span>`,
              pill(r.status === 'Created' ? 'Completed' : r.status),
            ]),
          'No requests yet.',
        ),
        B(ic('plus', 14) + 'Request a new cohort', 'cohortNew', {}, 'btn-p btn-sm'),
        'adm-panel',
      )}</div>`;
  if (t.cur === 'projects')
    body = card(
      'Projects and spaces',
      'Create projects and their structure; aggregate view only.',
      (ps =>
        dataView('org:projects', {
          label: 'projects',
          items: ps,
          search: p => p.title + ' ' + P(p.owner).name,
          quick: { label: 'Stage', options: [...new Set(ps.map(p => p.stage).filter(Boolean))].map(x => [x, x === 'Room' ? WL() : x]), test: (p, v) => p.stage === v },
          filters: [{ key: 'status', label: 'Status', options: [...new Set(ps.map(p => p.status))].map(x => [x, x]), test: (p, v) => p.status === v }],
          sorts: [['title', 'Title', (a, b) => a.title.localeCompare(b.title)], ['owner', 'Owner', (a, b) => P(a.owner).name.localeCompare(P(b.owner).name)]],
          row: p => ({ lead: `<span class="tile t-soft">${ic('folder', 18)}</span>`, title: h(p.title), sub: 'Owner: ' + nm(p.owner), badges: (p.stage ? pill(p.stage === 'Room' ? WL() : p.stage, SC[p.stage]) : '') + pill(p.status) }),
          empty: ['folder', 'No projects yet', 'Projects in this context appear here once they are submitted.', ''],
        }))(S.projects.filter(p => p.ctx === c && p.status !== 'Draft')),
      B(
        ic('plus', 14) + 'Create institutional ' + WL(),
        'newRoom',
        { origin: 'Institutional project' },
        'btn-p btn-sm',
      ),
      'adm-panel',
    );
  if (t.cur === 'reports')
    body =
      `<div class="adm-stack">${reportsView(true)}${card(
        'Cross-organization sharing',
        'Needs Programme Administrator approval.',
        table(
          ['Request', 'Status'],
          S.xorg.filter(x => x.by === myId()).map(x => [h(x.what), pill(x.status)]),
          'No requests.',
        ),
        B('Request sharing', 'xoNew', {}, 'btn-s btn-sm'),
        'adm-panel',
      )}</div>`;
  const org = S.orgs.find(o => o.id === me().org);
  return (
    `<header class="shead adm-ws"><div class="shead-main">${org ? orgMark(org, 48) : `<span class="tile">${ic('building', 22)}</span>`}<div class="shead-t"><div class="shead-kind">Organization workspace</div><h1 class="h1">${h(org?.name || '') || 'Organization workspace'}</h1><div class="shead-meta"><span>${h(ctx().name)}</span><span>pack: ${h(pk.name)}</span></div></div></div></header>` +
    t.html +
    body
  );
});
function cfgForm(isOrg) {
  const pk = pack();
  return card(
    isOrg ? 'Configure within the pack envelope' : 'Use-case pack: ' + h(pk.name),
    'Platform-controlled items cannot be changed by a tenant.',
    `<form data-f="cfg" class="col adm-form" novalidate><div class="g3">${fi('cfg', 'workspace', 'Label for workspaces', { value: 'Action Room', ro: true, help: 'Fixed across PHOENIX so every role sees the same name.' })}${fi('cfg', 'circle', 'Label for Circles', { value: pk.labels.circle, req: true })}${fi('cfg', 'rope', 'Label for Rope Teams', { value: pk.labels.rope, req: true })}</div>${fi('cfg', 'compassOpt', 'Ask optional Purpose Compass questions PC7–PC12 in context', { type: 'checkbox', value: pk.compassOptional ? 'yes' : '' })}${fi('cfg', 'propose', 'Participants may propose a ' + pk.labels.workspace, { type: 'checkbox', value: S.settings.participantCanProposeWorkspace ? 'yes' : '' })}
 <div class="adm-locked"><span class="adm-locked-ic" aria-hidden="true">${ic('lock', 16)}</span><div><b>Platform-controlled (locked)</b><p class="cap">Consent framework · trust controls · security rules · audit model · core data semantics · Evidence Support Level definitions</p></div></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Save configuration</button></div></form>`,
  );
}
F.cfg = d => {
  if (!validate('cfg', d, { circle: ['req'], rope: ['req'] })) return render();
  const pk = pack();
  pk.labels = { workspace: 'Action Room', circle: d.circle, rope: d.rope };
  pk.compassOptional = d.compassOpt === 'yes';
  S.settings.participantCanProposeWorkspace = d.propose === 'yes';
  audit('Pack configuration changed', pk.id, JSON.stringify(pk.labels));
  clearF('cfg');
  toast('Configuration saved. Labels update everywhere in this pack.');
  ok();
};
function reportsView(isOrg) {
  const c = ctxId();
  const rows = S.metrics.filter(m => m.status === 'Active');
  const xs = ['Participation summary (aggregate)', 'Evidence summary (approved)', 'Learning Harvests (released)', ...(isOrg ? [] : ['Audit log', 'Payments & entitlements', 'Full configuration'])];
  return `<div class="adm-report"><dl class="adm-rmeta"><div><dt>Context</dt><dd>${h(ctx().name)}</dd></div><div><dt>Period</dt><dd>Programme to date · as of ${fmt(today())}</dd></div><div><dt>Metrics shown</dt><dd>${rows.length}</dd></div><div><dt>Exports</dt><dd>${xs.length} authorised</dd></div></dl><div class="g12">${card(
    `Starter metrics <span class="adm-n">${rows.length}</span>`,
    'Aggregate only. Metrics never determine trustworthiness, deservingness or fundability.',
    dataView('rep:metrics:' + (isOrg ? 'agg' : 'all'), {
      label: 'metrics',
      items: rows,
      layout: 'table',
      search: m => m.name + ' ' + (m.def || '') + ' ' + m.cat,
      filters: [
        { key: 'cat', label: 'Category', options: [...new Set(rows.map(m => m.cat))].map(v => [v, v]), test: (m, v) => m.cat === v },
        { key: 'gate', label: 'Gate', options: [...new Set(rows.map(m => m.gate))].map(v => [v, v]), test: (m, v) => m.gate === v },
      ],
      sorts: [['name', 'Metric', (a, b) => a.name.localeCompare(b.name)], ['cat', 'Category', (a, b) => a.cat.localeCompare(b.cat)]],
      columns: [
        { label: 'Metric', sort: 'name', cell: m => `<b>${h(m.name)}</b>${m.def ? `<div class="cap adm-def">${h(m.def)}</div>` : ''}` },
        { label: 'Category', sort: 'cat', cell: m => h(m.cat) },
        { label: 'Gate', cell: m => (m.gate === 'None' ? '<span class="cap">None</span>' : h(m.gate)) },
        { label: 'Value', num: true, cell: m => '<b class="adm-val">' + metric(m.id) + '</b>' },
      ],
      pageSize: 25,
      empty: ['chart', 'No metrics are visible', 'A Programme Administrator chooses which metrics are shown.', ''],
    }),
    '',
    'c8 adm-panel adm-metrics',
  )}
 ${card('Authorised exports', 'Machine-readable; relationships and governance metadata kept. Small groups are suppressed.', `<div class="adm-xlist">${xs.map(x => B(`<span class="adm-x-ic" aria-hidden="true">${ic('file', 16)}</span><span class="adm-x-t">${x}</span><span class="adm-x-f">JSON</span>${ic('download', 16)}`, 'doExport', { n: x }, 'adm-x')).join('')}</div>`, '', 'c4 adm-panel adm-exports')}</div></div>`;
}
A.doExport = d => {
  const data = {
    export: d.n,
    context: ctx().name,
    generated: now(),
    metrics: S.metrics.map(m => ({ name: m.name, value: metric(m.id) })),
  };
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = d.n.replace(/\W+/g, '-').toLowerCase() + '.json';
    a.click();
  } catch (e) {}
  audit('Export', d.n, 'Authorised export');
  toast('Export prepared: ' + d.n);
  ok();
};
// ---------- PROGRAMME ADMIN (6.7, E12, F12) ----------
route('admin', 'admin', () => {
  if (role() !== 'A') return deniedView('admin');
  const pend = S.assign.filter(a => a.status === 'Pending role approval');
  const rqProj = S.projects.filter(p => inCtx(p) && p.status === 'Submitted' && !p.stewards.length);
  const rqPw = S.pathways.filter(p => inCtx(p) && pwNeedsSteward(p));
  const inProj = S.projects.filter(p => inCtx(p) && ['Submitted', 'Clarification requested'].includes(p.status) && p.stewards.length);
  const t = tabs(
    'adm',
    [
      ['requests', 'Review requests', rqProj.length + rqPw.length],
      ['users', 'Users', pend.length || null],
      ['invites', 'Invitations'],
      ['library', 'Pathway library'],
      ['notify', 'Notifications'],
      ['initiatives', 'Sponsor initiatives'],
      [
        'support',
        'Support & requests',
        S.supportQueries.filter(q => q.status === 'Open').length +
          (S.requests || []).filter(r => r.status === 'Open').length,
      ],
      ['reports', 'Reports & exports'],
    ],
    UI.p.tab,
  );
  let body = '';
  const n = k => `<span class="adm-n">${k}</span>`;
  if (t.cur === 'requests')
    body =
      `<div class="adm-stack">${card(
        'Projects waiting for a reviewer ' + n(rqProj.length),
        'Assign a Steward, Faculty member or Facilitator. They review the project and accept it or ask for clarification.',
        dataView('adm:rqproj', {
          label: 'projects',
          items: rqProj,
          search: p => p.title + ' ' + P(p.owner).name + ' ' + (p.tags || []).join(' '),
          quick: { label: 'Type', options: dvOpts(rqProj, p => p.type), test: (p, v) => p.type === v },
          filters: [{ key: 'area', label: 'Area', options: [...new Set(rqProj.flatMap(p => p.tags || []))].map(x => [x, x]), test: (p, v) => (p.tags || []).includes(v) }],
          sorts: [['sub', 'Submitted', (a, b) => String(a.submitted || '').localeCompare(String(b.submitted || ''))], ['title', 'Title', (a, b) => a.title.localeCompare(b.title)]],
          defaultSort: 'sub',
          row: p => ({ lead: `<span class="tile t-navy" aria-hidden="true">${ic('folder', 18)}</span>`, title: L(h(p.title), 'project', { id: p.id }, 'dv-link'), sub: h(p.type), meta: ['Owner <b>' + nm(p.owner) + '</b>', (p.tags || []).map(h).join(', '), p.submitted ? 'Submitted ' + fmt(p.submitted) : ''], badges: pill(p.status), primary: L('Open', 'project', { id: p.id }, 'btn btn-s btn-sm') + B('Assign reviewer', 'assignStewards', { id: p.id }, 'btn-p btn-sm') }),
          empty: ['check', 'No projects are waiting for a reviewer', 'New submissions appear here until you assign a reviewer.', ''],
        }),
        '',
        'adm-panel',
      )}${card(
        'Projects in review ' + n(inProj.length),
        'Projects with an assigned reviewer. Open one to read the conversation and add a comment.',
        dataView('adm:inproj', {
          label: 'projects',
          items: inProj,
          search: p => [p.title, P(p.owner).name, ...p.stewards.map(x => P(x).name)].join(' '),
          quick: { label: 'Status', options: dvOpts(inProj, p => p.status), test: (p, v) => p.status === v },
          sorts: [['title', 'Title', (a, b) => a.title.localeCompare(b.title)], ['msgs', 'Most messages', (a, b) => convoN(b) - convoN(a)]],
          defaultSort: 'title',
          row: p => ({
            lead: `<span class="tile t-navy" aria-hidden="true">${ic('folder', 18)}</span>`,
            title: L(h(p.title), 'project', { id: p.id }, 'dv-link'),
            sub: h(p.type),
            meta: ['Owner <b>' + nm(p.owner) + '</b>', 'Reviewer <b>' + p.stewards.map(nm).join(', ') + '</b>', convoN(p) + ' message' + (convoN(p) === 1 ? '' : 's')],
            badges: pill(p.status) + (projAnswered(p) ? pill('Owner replied', 'p-navy') : ''),
            primary: L('Open', 'project', { id: p.id }, 'btn btn-s btn-sm'),
          }),
          empty: ['check', 'Nothing is in review right now', 'Projects appear here once a reviewer is assigned.', ''],
        }),
        '',
        'adm-panel',
      )}${pwAdminCards()}</div>`;
  if (t.cur === 'users')
    body =
      (pend.length ? banner('warn', pend.length + ' role' + (pend.length > 1 ? 's' : '') + ' awaiting approval', 'Open Manage on the person to approve or decline the role.') + '<div style="height:12px"></div>' : '') +
      card(
        'Users and roles ' + n(S.assign.length),
        'Add, view, edit and delete user accounts. Manage roles, bundles and mandates. No direct database work.',
        usersTable(null, true, true),
        B(ic('plus', 14) + 'Add user', 'userNew', {}, 'btn-p btn-sm'),
        'adm-panel',
      );
  if (t.cur === 'invites')
    body = card(
      'Invitations ' + n(S.invites.length),
      '',
      inviteTable(null),
      B(ic('plus', 14) + 'Create / bulk upload', 'invNew', {}, 'btn-p btn-sm'),
      'adm-panel',
    );

  if (t.cur === 'library')
    body = card(
      'Approved pathway templates ' + n(S.templates.length),
      'Mode 1 pathways come from this library.',
      dataView('adm:library', {
        label: 'templates',
        items: S.templates,
        search: x => x.name + ' ' + x.steps.join(' '),
        quick: { label: 'Status', options: [...new Set(S.templates.map(x => x.status))].map(v => [v, v]), test: (x, v) => x.status === v },
        sorts: [['name', 'Name', (a, b) => a.name.localeCompare(b.name)], ['steps', 'Number of steps', (a, b) => a.steps.length - b.steps.length]],
        row: x => ({ lead: `<span class="tile t-soft">${ic('route', 18)}</span>`, title: h(x.name), sub: `<span class="adm-steps">${x.steps.map(h).join(' → ')}</span>`, meta: [x.steps.length + ' steps'], badges: pill(x.status), primary: B(x.status === 'Approved' ? 'Retire' : 'Approve', 'tplState', { id: x.id }) }),
        empty: ['route', 'No templates yet', 'Add an approved template for Mode 1 pathways.', ''],
      }),
      B(ic('plus', 14) + 'Add template', 'tplNew', {}, 'btn-p btn-sm'),
      'adm-panel',
    );

  if (t.cur === 'notify')
    body =
      `<div class="g12">${card(
        'Send an announcement',
        'In-app notification to everyone in this context; transactional email follows the template.',
        `<form data-f="ann" class="col adm-form" novalidate>${fi('ann', 'to', 'Audience', {
          type: 'select',
          opts: [
            ['all', 'Everyone in this context'],
            ...Object.entries(ROLE)
              .filter(([k]) => k !== 'T')
              .map(([k, v]) => [k, v + 's']),
          ],
        })}${fi('ann', 't', 'Message', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">${ic('send', 14)}Send</button></div></form>`,
        '',
        'c5',
      )}${card(
        'Notification events',
        'Configured triggers',
        table(
          ['Event', 'Channel'],
          [
            ['Invitation, verification', 'Email'],
            ['Consent actions, re-acceptance', 'Email + in-app'],
            ['Approval requests and outcomes', 'Email + in-app'],
            ['Circle activity, chat, votes', 'In-app'],
            ['Commitments, milestones', 'In-app'],
            ['AI review', 'In-app'],
            ['Funding tranches, progress summaries', 'Email + in-app'],
            ['Payment / entitlement changes', 'Email'],
          ].map(([e, ch]) => [e, `<span class="adm-chan">${ch}</span>`]),
        ),
        '',
        'c7 adm-panel',
      )}</div>`;
  if (t.cur === 'support')
    body =
      `<div class="adm-stack">${card(
        'Support queries ' + n(S.supportQueries.length),
        '',
        dataView('adm:support', {
          label: 'support queries',
          items: S.supportQueries,
          search: q => P(q.by).name + ' ' + q.t,
          quick: { label: 'Status', options: [...new Set(S.supportQueries.map(q => q.status))].map(v => [v, v]), test: (q, v) => q.status === v },
          sorts: [['from', 'From', (a, b) => P(a.by).name.localeCompare(P(b.by).name)]],
          rowId: q => q.id,
          row: q => ({ lead: `<span class="av">${ini(q.by)}</span>`, title: nm(q.by), sub: h(q.t), badges: pill(q.status), primary: q.status === 'Open' ? B('Mark resolved', 'sqDone', { id: q.id }) : '' }),
          bulk: [{ label: 'Mark resolved', icon: 'check', run: ids => ids.forEach(id => byId('supportQueries', id)?.status === 'Open' && A.sqDone({ id })) }],
          empty: ['question', 'No support queries', '', ''],
        }),
        '',
        'adm-panel',
      )}${card(
        'Privacy requests ' + n((S.requests || []).length),
        'Correction, export and deletion requests.',
        (rs =>
          dataView('adm:privacy', {
            label: 'privacy requests',
            items: rs,
            search: r => P(r.pid).name + ' ' + r.kind + ' ' + r.detail,
            quick: { label: 'Status', options: [...new Set(rs.map(r => r.status))].map(v => [v, v]), test: (r, v) => r.status === v },
            filters: [{ key: 'kind', label: 'Type', options: [...new Set(rs.map(r => r.kind))].map(v => [v, v]), test: (r, v) => r.kind === v }],
            sorts: [['from', 'From', (a, b) => P(a.pid).name.localeCompare(P(b.pid).name)], ['kind', 'Type', (a, b) => a.kind.localeCompare(b.kind)]],
            row: r => ({ lead: `<span class="av">${ini(r.pid)}</span>`, title: nm(r.pid), sub: h(r.detail), meta: [h(r.kind)], badges: pill(r.status), primary: r.status === 'Open' ? B('Complete', 'rqDone', { id: r.id }) : '' }),
            empty: ['lock', 'No privacy requests', '', ''],
          }))(S.requests || []),
        '',
        'adm-panel',
      )}</div>`;
  if (t.cur === 'initiatives')
    body = card(
      'Initiative summaries for sponsors ' + n(S.initiatives.length),
      'Sponsors see these on their Projects & funding page.',
      S.initiatives
        .map(i =>
          lrow(
            'megaphone',
            h(i.title),
            h(i.summary) + ' · ' + fmt(i.at),
            pill(i.status === 'Published' ? 'Active' : i.status),
          ),
        )
        .join('') || '<p class="cap">None yet.</p>',
      B(ic('plus', 14) + 'Publish initiative', 'initNew', {}, 'btn-p btn-sm'),
      'adm-lrows',
    );
  if (t.cur === 'reports') body = reportsView(false);
  return head('Programme administration', h(ctx().name)) + t.html + body;
});
A.roleDecide = d => {
  UI.modal = null;
  const a = byId('assign', d.id);
  a.status = d.v;
  a.approval = a.approval || [];
  a.approval.push({
    at: now(),
    by: myId(),
    note: d.v === 'Active' ? 'Approved by ' + me().name : 'Declined by ' + me().name,
  });
  notify(
    a.pid,
    d.v === 'Active'
      ? 'Your ' + ROLE[a.role] + ' role was approved'
      : 'Your ' + ROLE[a.role] + ' role was not activated',
    'home',
  );
  audit('Role approval', a.id, d.v);
  ok();
};
A.tplState = d => {
  const x = byId('templates', d.id);
  x.status = x.status === 'Approved' ? 'Retired' : 'Approved';
  audit('Template ' + x.status, x.id, '');
  ok();
};
A.tplNew = () => {
  clearF('tpl');
  modal(
    'Add pathway template',
    () =>
      `<form data-f="tpl" class="col adm-form" novalidate>${fi('tpl', 'name', 'Name', { req: true })}${fi('tpl', 'steps', 'Steps (3–5, one per line)', { type: 'textarea', rows: 5, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Add as approved</button></div></form>`,
  );
};
F.tpl = d => {
  const st = (d.steps || '').split('\n').filter(x => x.trim());
  if (
    !validate('tpl', d, {
      name: ['req'],
      steps: ['req', ['fn', { f: () => st.length >= 3 && st.length <= 5, m: 'Enter 3 to 5 steps.' }]],
    })
  )
    return render();
  S.templates.push({ id: uid('t'), name: d.name, status: 'Approved', steps: st });
  audit('Template added', d.name, '');
  UI.modal = null;
  clearF('tpl');
  ok();
};
F.ann = d => {
  if (!validate('ann', d, { t: ['req'] })) return render();
  const ps = S.assign.filter(a => a.ctx === ctxId() && (d.to === 'all' || a.role === d.to)).map(a => a.pid);
  [...new Set(ps)].forEach(p => notify(p, 'Announcement: ' + d.t, 'notifications'));
  audit('Announcement sent', d.to, ps.length + ' recipients');
  clearF('ann');
  toast('Sent to ' + ps.length + ' people.');
  ok();
};
A.sqDone = d => {
  byId('supportQueries', d.id).status = 'Resolved';
  ok();
};
A.rqDone = d => {
  const r = (S.requests || []).find(x => x.id === d.id);
  r.status = 'Completed';
  notify(r.pid, 'Your ' + r.kind.toLowerCase() + ' request was completed', 'privacy', { tab: 'req' });
  audit('Privacy request completed', r.id, r.kind);
  ok();
};
// ---------- PLATFORM ADMIN (6.8) ----------
route('platform', 'platform', () => {
  const t = tabs(
    'plat',
    [
      ['integrations', 'Integrations'],
      ['security', 'Security & access'],
      ['health', 'Health & alerts'],
      ['storage', 'Storage & backups'],
      ['lms', 'LMS deep links'],
    ],
    UI.p.tab,
  );
  let body = '';
  const n = k => `<span class="adm-n">${k}</span>`;
  if (t.cur === 'integrations')
    body =
      `<div class="adm-stack">${card(
        'External integrations ' + n(S.integrations.length),
        'Shared WSS-controlled accounts with tenant separation in configuration and audit.',
        `<ul class="ops-list">${S.integrations
          .map(
            (i, n) =>
              `<li class="ops-item"><span class="tile t-soft" aria-hidden="true">${ic('link', 16)}</span><div class="ops-item-t"><b>${h(i.name)}</b></div><div class="ops-item-s">${pill(i.status)}</div><div class="ops-item-a">${
                n === 1
                  ? B(S.settings.aiAvailable ? 'Simulate provider outage' : 'Restore provider', 'aiToggle', {})
                  : ''
              }</div></li>`,
          )
          .join('')}</ul><div class="ops-quota">${dl([['AI quota today', S.settings.aiUsed + ' / ' + S.settings.aiQuota]])}<div class="progress" aria-hidden="true"><div class="bar" style="width:${Math.min(100, Math.round((100 * S.settings.aiUsed) / (S.settings.aiQuota || 1)))}%"></div></div></div>`,
        '',
        'adm-panel',
      )}${card(
        'Provider settings',
        'Credentials are stored in the platform secret store, never in this console.',
        `<form data-f="prov" class="col adm-form" novalidate><div class="g3">${fi('prov', 'ai', 'AI provider', { value: S.providers.ai.name, req: true })}${fi('prov', 'aimode', 'AI mode', { type: 'select', opts: ['Production', 'Sandbox'], value: S.providers.ai.mode })}${fi('prov', 'quota', 'Daily AI request quota', { type: 'number', min: 1, value: S.settings.aiQuota, req: true })}</div><div class="g3">${fi('prov', 'pay', 'Payment provider', { value: S.providers.pay.name, req: true })}${fi('prov', 'paymode', 'Payment mode', { type: 'select', opts: ['Sandbox', 'Live'], value: S.providers.pay.mode })}${fi('prov', 'email', 'Email service', { value: S.providers.email.name, req: true })}</div><div class="actions"><span></span><button class="btn btn-p" type="submit">Save provider settings</button></div></form>`,
      )}</div>`;
  if (t.cur === 'health')
    body = `<div class="g12">${card('Availability', '', `<div class="kpis"><div class="kpi"><span class="lt">Uptime</span><span class="statnum">${h(S.health.uptime)}</span></div><div class="kpi"><span class="lt">p95 response time</span><span class="statnum">${h(S.health.p95)}</span></div><div class="kpi"><span class="lt">Status</span><span class="ops-stat">${pill('Healthy')}</span></div></div>`, '', 'c12 ops-avail')}${card(
      'Error log ' + n(S.health.errors.length),
      'Latest application errors and warnings',
      dataView('plat:errors', {
        label: 'log entries',
        items: S.health.errors,
        search: e => e.t + ' ' + e.lvl,
        quick: { label: 'Level', options: dvOpts(S.health.errors, e => e.lvl), test: (e, v) => e.lvl === v },
        sorts: [['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))], ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))]],
        defaultSort: 'new',
        layout: 'table',
        dense: true,
        columns: [
          { label: 'When', sort: 'new', cell: e => `<span class="adm-date">${fmt(e.at)}</span>` },
          { label: 'Level', cell: e => pill(e.lvl, e.lvl === 'Error' ? 'p-red' : 'p-amber') },
          { label: 'Message', cell: e => h(e.t) },
        ],
        empty: ['check', 'No errors or warnings', 'Application errors and warnings appear here.', ''],
      }),
      '',
      'c7 adm-panel',
    )}${card(
      'Alert rules',
      '',
      table(
        ['Rule', 'Notify', 'Enabled'],
        S.health.alerts.map((a, i) => [
          `<b>${h(a.rule)}</b>`,
          h(a.to),
          `<button type="button" class="toggle ops-switch ${a.on ? 'on' : ''}" role="switch" aria-checked="${a.on}" aria-label="${h(a.rule)}" data-a="alertToggle" data-i="${i}"></button>`,
        ]),
      ),
      '',
      'c5 adm-panel',
    )}</div>`;
  if (t.cur === 'security')
    body = `<div class="g12">${card(
      'Security events and access logs ' + n(S.security.length),
      '',
      dataView('plat:security', {
        label: 'security events',
        items: S.security,
        search: s => s.t,
        sorts: [['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))], ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))]],
        defaultSort: 'new',
        layout: 'table',
        dense: true,
        columns: [
          { label: 'When', sort: 'new', cell: s => `<span class="adm-date">${fmt(s.at)}</span>` },
          { label: 'Event', cell: s => h(s.t) },
        ],
        empty: ['shield', 'No security events', 'Sign-ins, session revocations and provider changes appear here.', ''],
      }),
      '',
      'c7 adm-panel',
    )}<div class="c5 adm-stack">${card(
      'Authentication',
      '',
      dl([
        ['MFA', 'Required for Programme and Platform Administrators'],
        ['Password policy', 'At least 10 characters, including a number'],
        ['Session timeout', '30 minutes idle'],
        ['Encryption', 'In transit and at rest'],
      ]),
    )}<section class="card ops-danger"><div class="ops-danger-t"><b>Sessions</b><p class="cap">Sign every user out of every device.</p></div>${CB('Revoke all sessions', 'revokeSessions', {}, 'Sign every user out of every device now?', 'btn-d btn-sm')}</section></div></div>`;
  if (t.cur === 'storage')
    body = `<div class="g12">${card(
      'Backups and restore tests ' + n(S.backups.length),
      '',
      dataView('plat:backups', {
        label: 'backups',
        items: S.backups,
        search: b => b.status + ' ' + b.size,
        quick: { label: 'Status', options: dvOpts(S.backups, b => (b.status.includes('passed') ? 'Completed' : b.status)), test: (b, v) => (b.status.includes('passed') ? 'Completed' : b.status) === v },
        sorts: [['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))], ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))]],
        defaultSort: 'new',
        layout: 'table',
        dense: true,
        columns: [
          { label: 'When', sort: 'new', cell: b => `<span class="adm-date">${fmt(b.at)}</span>` },
          { label: 'Status', cell: b => pill(b.status.includes('passed') ? 'Completed' : b.status) },
          { label: 'Size', num: true, cell: b => `<span class="ops-num">${h(b.size)}</span>` },
        ],
        empty: ['archive', 'No backups yet', 'Run a backup or a restore test.', ''],
      }),
      B('Run restore test', 'restoreTest') + B('Run backup now', 'backup', {}, 'btn-p btn-sm'),
      'c7 adm-panel',
    )}${card(
      'Storage',
      '',
      dl([
        [
          'Used',
          S.records.reduce((a, x) => a + x.sizeMB, 0).toFixed(1) +
            ' MB + evidence ' +
            S.evidence.reduce((a, x) => a + x.sizeMB, 0).toFixed(1) +
            ' MB',
        ],
        ['Default file limit', S.settings.maxFileMB + ' MB'],
        ['Quarantined files', S.records.filter(r => r.state === 'Quarantined').length],
        ['Signed URLs', 'Enabled'],
      ]),
      '',
      'c5',
    )}</div>`;
  if (t.cur === 'lms')
    body = card(
      'LMS deep-link layer',
      'Secure links in and out. No LTI 1.3, SSO, roster or grade sync. The LMS is not authoritative for PHOENIX permissions.',
      `<form data-f="lms" class="col adm-form" novalidate><div class="f2">${fi('lms', 'returnUrl', 'Return URL', { value: S.settings.lms.returnUrl, req: true })}${fi(
        'lms',
        'dest',
        'Default destination',
        {
          type: 'select',
          opts: [
            ['circle', 'Circle'],
            ['room', WL()],
            ['project', 'Project'],
          ],
          value: S.settings.lms.dest,
        },
      )}</div><div class="actions">${B('Test incoming deep link', 'lmsTest')}<button class="btn btn-p" type="submit">Save</button></div></form>`,
    );
  return (
    head(
      'Platform administration',
      'Technical operations across all tenants · no default access to participant content',
    ) +
    t.html +
    body
  );
});

A.aiToggle = () => {
  S.settings.aiAvailable = !S.settings.aiAvailable;
  S.integrations[1].status = S.settings.aiAvailable ? 'Healthy' : 'Unavailable';
  S.security.unshift({
    at: now(),
    t: 'AI provider ' + (S.settings.aiAvailable ? 'restored' : 'unavailable — AI requests fail safely'),
  });
  audit('AI provider status', S.integrations[1].status, '');
  ok();
};
A.revokeSessions = () => {
  S.security.unshift({ at: now(), t: 'All sessions revoked by ' + me().name });
  audit('Sessions revoked', 'platform', '');
  toast('All other sessions revoked.');
  ok();
};
A.backup = () => {
  S.backups.unshift({ at: now(), status: 'Completed', size: '1.8 GB' });
  audit('Backup run', 'platform', '');
  ok();
};
A.restoreTest = () => {
  S.backups.unshift({ at: now(), status: 'Restore test passed', size: '—' });
  audit('Restore test', 'platform', 'passed');
  ok();
};
F.lms = d => {
  if (!validate('lms', d, { returnUrl: ['req'] })) return render();
  S.settings.lms = { ...S.settings.lms, returnUrl: d.returnUrl, dest: d.dest };
  audit('LMS deep-link configured', '7.13', '');
  toast('Saved.');
  ok();
};
A.lmsTest = () => {
  audit('LMS deep link tested', '7.13', 'Signature valid; authorisation checked in PHOENIX');
  toast('Deep link validated. Users still sign in and pass PHOENIX permission checks.');
  ok();
};
