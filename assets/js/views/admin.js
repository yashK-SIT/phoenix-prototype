// ---------- INVITATIONS & USERS (shared by Org Rep and Programme Admin) ----------
function inviteTable(scopeCtx) {
  const inv = S.invites.filter(i => !scopeCtx || i.ctx === scopeCtx);
  inv.forEach(i => {
    if (['Pending', 'Resent'].includes(i.status) && i.expires < today()) i.status = 'Expired';
  });
  return table(
    ['Email', 'Role', 'Context', 'Status', 'Valid until', 'Invited by', ''],
    inv.map(i => [
      `<span class="adm-who"><span class="av sm" aria-hidden="true">${ic('mail', 12)}</span><b class="adm-em">${h(i.email)}</b></span>`,
      ROLE[i.role],
      `<span class="adm-sub">${h(S.contexts.find(c => c.id === i.ctx).name)}</span>`,
      pill(i.status),
      `<span class="adm-date">${fmt(i.expires)}</span>`,
      nm(i.by),
      ['Pending', 'Resent', 'Expired'].includes(i.status)
        ? B('Resend', 'invAct', { id: i.id, v: 'Resent' }) +
          (i.status !== 'Expired' ? CB('Revoke', 'invAct', { id: i.id, v: 'Revoked' }, 'Revoke the invitation for ' + i.email + '? The link stops working immediately.') : '')
        : '',
    ]),
  );
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
function usersTable(ctxFilter, canEdit) {
  const as = S.assign.filter(a => !ctxFilter || a.ctx === ctxFilter);
  return table(
    ['Person', 'Role and context', 'Status', 'Bundles and mandate', ''],
    as.map(a => [
      `<div class="adm-who"><span class="av">${ini(a.pid)}</span><div class="adm-who-t"><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email)}</div></div></div>`,
      `<span class="adm-role">${ROLE[a.role]}</span><div class="cap">${h(S.contexts.find(c => c.id === a.ctx).name)}</div>`,
      pill(a.status),
      `<div class="adm-tags">${a.bundles.map(b => pill(b, 'p-grey')).join('')}${a.mandate ? pill(a.mandate.valid ? 'Mandate to ' + fmt(a.mandate.until) : 'Mandate expired', a.mandate.valid ? 'p-teal' : 'p-red') : ''}${a.until ? pill((a.status === 'Expired' ? 'Role expired ' : 'Role expires ') + fmt(a.until), a.status === 'Expired' ? 'p-red' : 'p-grey') : ''}</div>`,
      canEdit && a.pid !== myId() ? B('Manage', 'userManage', { id: a.id }) : '',
    ]),
  );
}
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
      table(
        ['Project', 'Owner', 'Stage', 'Status'],
        S.projects
          .filter(p => p.ctx === c && p.status !== 'Draft')
          .map(p => [
            `<b>${h(p.title)}</b>`,
            nm(p.owner),
            p.stage ? pill(p.stage === 'Room' ? WL() : p.stage, SC[p.stage]) : '—',
            pill(p.status),
          ]),
      ),
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
 <div class="adm-locked"><span class="adm-locked-ic" aria-hidden="true">${ic('lock', 16)}</span><div><b>Platform-controlled (locked)</b><p class="cap">Consent framework · trust controls · security rules · audit model · core data semantics · Evidence Support Level definitions</p></div></div>${assumed('OI-09 — final split of configurable vs locked items')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save configuration</button></div></form>`,
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
    'Starter metrics',
    'Aggregate only. Metrics never determine trustworthiness, deservingness or fundability.',
    table(
      ['Metric', 'Category', 'Gate', 'Value'],
      rows.map(m => [`<b>${h(m.name)}</b>${m.def ? `<div class="cap adm-def">${h(m.def)}</div>` : ''}`, h(m.cat), m.gate === 'None' ? '<span class="cap">None</span>' : h(m.gate), '<b class="adm-val">' + metric(m.id) + '</b>']),
    ),
    `<span class="adm-n">${rows.length}</span>`,
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
  const c = ctxId();
  const pend = S.assign.filter(a => a.status === 'Pending role approval');
  const rqProj = S.projects.filter(p => inCtx(p) && p.status === 'Submitted' && !p.stewards.length);
  const rqPw = S.pathways.filter(p => inCtx(p) && p.state === 'Awaiting reviewer');
  const t = tabs(
    'adm',
    [
      ['requests', 'Review requests', rqProj.length + rqPw.length],
      ['users', 'Users'],
      ['invites', 'Invitations'],
      ['approvals', 'Role approvals', pend.length],
      ['library', 'Pathway library'],
      ['packs', 'Packs & configuration'],
      ['ai', 'AI sources & queue'],
      ['notify', 'Notifications'],
      ['xorg', 'Cross-org approvals', S.xorg.filter(x => x.status === 'Pending').length],
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
        table(
          ['Project', 'Owner', 'Areas', 'Submitted', ''],
          rqProj.map(p => [`<b>${L(h(p.title), 'project', { id: p.id })}</b>`, nm(p.owner), (p.tags || []).map(h).join(', ') || '—', `<span class="adm-date">${fmt(p.submitted || '')}</span>`, B('Assign reviewer', 'assignStewards', { id: p.id }, 'btn-p btn-sm')]),
          'No projects are waiting for a reviewer.',
        ),
        '',
        'adm-panel',
      )}${card(
        'Pathways waiting for a reviewer ' + n(rqPw.length),
        'Assign a Steward or Faculty member. They approve the pathway, reject it or ask the participant for changes.',
        table(
          ['Pathway', 'Participant', 'Steps', 'Submitted', ''],
          rqPw.map(p => [`<b>${h(p.name)}</b>`, nm(p.pid), `<span class="adm-steps">${p.steps.map(x => h(x.t)).join(' → ')}</span>`, `<span class="adm-date">${fmt(p.submitted || '')}</span>`, B('Assign reviewer', 'pwAssign', { id: p.id }, 'btn-p btn-sm')]),
          'No pathways are waiting for a reviewer.',
        ),
        '',
        'adm-panel',
      )}</div>`;
  if (t.cur === 'users')
    body = card(
      'Users and roles ' + n(S.assign.length),
      'Activate, deactivate, manage memberships and bundles. No direct database work.',
      usersTable(null, true),
      '',
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
  if (t.cur === 'approvals')
    body = card(
      'Sensitive role approvals ' + n(pend.length),
      'Unapproved roles cannot activate. Approval status and history are kept.',
      table(
        ['Person', 'Role', 'Context', 'Requested', 'History', ''],
        pend.map(a => [
          `<div class="adm-who"><span class="av">${ini(a.pid)}</span><b>${nm(a.pid)}</b></div>`,
          `<span class="adm-role">${ROLE[a.role]}</span>`,
          h(S.contexts.find(c => c.id === a.ctx).name),
          `<span class="adm-date">${fmt(a.approval?.[0]?.at)}</span>`,
          `<span class="cap">${(a.approval || []).map(x => h(x.note)).join('; ')}</span>`,
          B('Decline', 'roleDecide', { id: a.id, v: 'Role not activated' }) +
            B('Approve', 'roleDecide', { id: a.id, v: 'Active' }, 'btn-p btn-sm'),
        ]),
        'No roles awaiting approval.',
      ),
      '',
      'adm-panel',
    );
  if (t.cur === 'library')
    body = card(
      'Approved pathway templates ' + n(S.templates.length),
      'Mode 1 pathways come from this library.',
      table(
        ['Template', 'Steps', 'Status', ''],
        S.templates.map(x => [
          `<b>${h(x.name)}</b>`,
          `<span class="adm-steps">${x.steps.map(h).join(' → ')}</span>`,
          pill(x.status),
          B(x.status === 'Approved' ? 'Retire' : 'Approve', 'tplState', { id: x.id }),
        ]),
      ),
      B(ic('plus', 14) + 'Add template', 'tplNew', {}, 'btn-p btn-sm'),
      'adm-panel',
    );
  if (t.cur === 'packs')
    body =
      `<div class="adm-stack">${card(
        'Use-case packs ' + n(S.packs.length),
        'One platform; packs are configuration, not code branches.',
        table(
          ['Pack', 'Workspace label', 'Enabled flows', 'Evidence types', 'Metrics', 'Status', ''],
          S.packs.map(p => [
            `<b>${h(p.name)}</b>`,
            h(p.labels.workspace),
            `<span class="adm-flows">${p.flows.join(' ')}</span>`,
            `<span class="cap">${h(p.evidenceTypes)}</span>`,
            p.metrics,
            pill(p.status),
            p.status === 'Draft' ? B('Activate', 'packAct', { id: p.id }, 'btn-p btn-sm') : '',
          ]),
        ),
        '',
        'adm-panel',
      )}${cfgForm(false)}${tplForm()}${card(
        'Voting rule (D-03)',
        'Configurable until OI-01 is settled.',
        `<form data-f="vote" class="col adm-form" novalidate><div class="g3">${fi('vote', 'owner', 'Owner weight', { type: 'number', min: 1, value: S.settings.voting.ownerWeight, req: true })}${fi('vote', 'member', 'Member weight', { type: 'number', min: 1, value: S.settings.voting.memberWeight, req: true })}${fi('vote', 'th', 'Approval threshold (%)', { type: 'number', min: 1, value: S.settings.voting.threshold, req: true })}</div>${assumed('OI-01 relative weights')}<div class="actions"><span></span><button class="btn btn-s" type="submit">Save rule</button></div></form>`,
      )}${card(
        'Configuration versions ' + n(S.configVersions.length),
        'Export and restore without code changes or database work.',
        table(
          ['Version', 'Date', 'By', 'Note', ''],
          S.configVersions.map(v => [
            `<code class="adm-id">${h(v.id)}</code>`,
            `<span class="adm-date">${fmt(v.at)}</span>`,
            nm(v.by),
            h(v.note),
            B('Restore', 'cfgRestore', { id: v.id }),
          ]),
        ),
        B(ic('download', 14) + 'Export configuration', 'doExport', { n: 'Full configuration' }) +
          B('Save current as version', 'cfgSave', {}, 'btn-p btn-sm'),
        'adm-panel',
      )}${card(
        'Metrics registry ' + n(S.metrics.length),
        'About 8–12 visible pilot signals.',
        table(
          ['Metric', 'Definition', 'Category', 'Owner', 'Gate', 'Status', ''],
          S.metrics.map(m => [
            `<b>${h(m.name)}</b>`,
            `<span class="cap adm-def">${h(m.def)}</span>`,
            h(m.cat),
            h(m.owner),
            h(m.gate),
            pill(m.status),
            B(m.status === 'Active' ? 'Hide' : 'Show', 'metToggle', { id: m.id }),
          ]),
        ),
        '',
        'adm-panel',
      )}</div>`;
  if (t.cur === 'ai')
    body =
      `<div class="adm-stack">${card(
        'Approved AI sources ' + n(S.aiSources.length),
        'Ask PHOENIX answers only from approved sources.',
        table(
          ['Source', 'Status', ''],
          S.aiSources.map(s => [
            `<b>${h(s.title)}</b>`,
            pill(s.status === 'Approved' ? 'Approved' : 'Not approved'),
            hasB('AI Owner') ? B(s.status === 'Approved' ? 'Withdraw' : 'Approve', 'srcToggle', { id: s.id }) : '',
          ]),
        ),
        '',
        'adm-panel',
      )}${card(
        'AI job log ' + n(S.ai.length),
        'User, purpose, class, sources, consent, model and review state for every job.',
        table(
          ['Job', 'By', 'Class', 'Purpose', 'Sources', 'Consent', 'Status'],
          S.ai
            .slice()
            .reverse()
            .map(j => [
              `<code class="adm-id">${h(j.id)}</code>`,
              nm(j.by),
              pill(j.cls, 'p-ai'),
              h(j.purpose),
              `<span class="cap">${h(j.sources)}</span>`,
              `<span class="cap">${h(j.consent)}</span>`,
              pill(j.status),
            ]),
        ),
        '',
        'adm-panel',
      )}</div>`;
  if (t.cur === 'ai' && hasB('AI Owner'))
    body +=
      '<div class="section-gap"></div>' +
      card(
        'AI outputs awaiting review (Class C)',
        'Draft → Review → Edit → Approve/Reject → Release. Nothing is released without a person approving it.',
        table(
          ['Job', 'Purpose', 'Requested by', 'Sources', ''],
          S.ai
            .filter(j => j.status === 'In review' && j.cls === 'C')
            .map(j => [`<code class="adm-id">${h(j.id)}</code>`, h(j.purpose), nm(j.by), `<span class="cap">${h(j.sources)}</span>`, B('Reject', 'aiRev', { id: j.id, v: 'Rejected' }) + B('Approve release', 'aiRev', { id: j.id, v: 'Released' }, 'btn-p btn-sm')]),
          'Nothing waiting for review.',
        ),
        '',
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
        table(
          ['From', 'Question', 'Status', ''],
          S.supportQueries.map(q => [
            `<b>${nm(q.by)}</b>`,
            h(q.t),
            pill(q.status),
            q.status === 'Open' ? B('Mark resolved', 'sqDone', { id: q.id }) : '',
          ]),
        ),
        '',
        'adm-panel',
      )}${card(
        'Privacy requests ' + n((S.requests || []).length),
        'Correction, export and deletion requests.',
        table(
          ['From', 'Type', 'Details', 'Status', ''],
          (S.requests || []).map(r => [
            `<b>${nm(r.pid)}</b>`,
            h(r.kind),
            `<span class="cap">${h(r.detail)}</span>`,
            pill(r.status),
            r.status === 'Open' ? B('Complete', 'rqDone', { id: r.id }) : '',
          ]),
        ),
        '',
        'adm-panel',
      )}</div>`;
  if (t.cur === 'xorg') body = xorgView();
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
A.packAct = d => {
  byId('packs', d.id).status = 'Active';
  audit('Pack activated', d.id, 'Configured from approved primitives, no code changes');
  toast('Fourth pack activated without code changes.');
  ok();
};
F.vote = d => {
  if (!validate('vote', d, { owner: ['req', 'num'], member: ['req', 'num'], th: ['req', 'num'] })) return render();
  S.settings.voting = { ...S.settings.voting, ownerWeight: +d.owner, memberWeight: +d.member, threshold: +d.th };
  audit('Voting rule changed', 'D-03', JSON.stringify(S.settings.voting));
  clearF('vote');
  toast('Voting rule saved.');
  ok();
};
A.cfgSave = () => {
  S.configVersions.push({
    id: uid('cv'),
    at: today(),
    by: myId(),
    note: 'Saved by ' + me().name,
    snapshot: JSON.stringify({ packs: S.packs, settings: S.settings }),
  });
  audit('Configuration version saved', 'F12', '');
  ok();
};
A.cfgRestore = d => {
  const v = byId('configVersions', d.id);
  if (v.snapshot) {
    const s = JSON.parse(v.snapshot);
    S.packs = s.packs;
    S.settings = s.settings;
  }
  audit('Configuration restored', v.id, '');
  toast('Configuration ' + v.id + ' restored.');
  ok();
};
A.metToggle = d => {
  const m = byId('metrics', d.id);
  m.status = m.status === 'Active' ? 'Hidden' : 'Active';
  audit('Metric visibility', m.id, m.status);
  ok();
};
A.srcToggle = d => {
  const s = byId('aiSources', d.id);
  s.status = s.status === 'Approved' ? 'Not approved' : 'Approved';
  audit('AI source ' + s.status, s.id, '');
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
      ['contexts', 'Contexts'],
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
  if (t.cur === 'contexts')
    body =
      card(
        'Contexts ' + n(S.contexts.length),
        'Programmes, cohorts and organization spaces. Strict isolation: every record carries its context ID. Organizations are managed under Organizations.',
        table(
          ['Context', 'Kind', 'Organization', 'Pack', 'Status', 'Members', ''],
          S.contexts.map(c => [
            `<b>${h(c.name)}</b><div class="adm-id">${c.id}</div>`,
            h(c.kind),
            c.org && orgOf(c.org) ? `<span class="ops-org">${orgMark(orgOf(c.org), 24)}${L(h(orgOf(c.org).name), 'tenants', { id: c.org })}</span>` : '—',
            h(S.packs.find(p => p.id === c.pack)?.name || '—'),
            pill(c.status),
            `<span class="ops-num">${S.assign.filter(a => a.ctx === c.id).length}</span>`,
            c.kind !== 'Platform' ? B('Assign administrator', 'ctxAdmin', { id: c.id }) : '',
          ]),
        ),
        '',
        'adm-panel ops-ctx',
      ) +
      (S.cohortReqs.filter(r => r.status === 'Pending').length
        ? '<div class="section-gap"></div>' +
          card(
            'Cohort requests ' + n(S.cohortReqs.filter(r => r.status === 'Pending').length),
            'From Organization Representatives',
            table(
              ['Cohort', 'Organization', 'Pack', 'Start', ''],
              S.cohortReqs
                .filter(r => r.status === 'Pending')
                .map(r => [
                  `<b>${h(r.name)}</b>`,
                  h(S.orgs.find(o => o.id === r.org)?.name),
                  h(S.packs.find(p => p.id === r.pack)?.name),
                  `<span class="adm-date">${fmt(r.start)}</span>`,
                  '',
                ]),
            ),
            '',
            'adm-panel',
          )
        : '') +
      '<div class="section-gap"></div>' +
      banner(
        'info',
        'No default content access',
        'Technical administration does not grant access to participant content. Cross-organization visibility only through explicit authorisation or approved aggregation.',
      );
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
      table(
        ['When', 'Level', 'Message'],
        S.health.errors.map(e => [`<span class="adm-date">${fmt(e.at)}</span>`, pill(e.lvl, e.lvl === 'Error' ? 'p-red' : 'p-amber'), h(e.t)]),
      ),
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
      table(
        ['When', 'Event'],
        S.security.map(s => [`<span class="adm-date">${fmt(s.at)}</span>`, h(s.t)]),
      ),
      '',
      'c7 adm-panel',
    )}<div class="c5 adm-stack">${card(
      'Authentication',
      '',
      dl([
        ['MFA', 'Required for Programme and Platform Administrators'],
        ['Password policy', assumed('min 10 characters incl. a number')],
        ['Session timeout', '30 minutes idle'],
        ['Encryption', 'In transit and at rest'],
      ]),
    )}<section class="card ops-danger"><div class="ops-danger-t"><b>Sessions</b><p class="cap">Sign every user out of every device.</p></div>${CB('Revoke all sessions', 'revokeSessions', {}, 'Sign every user out of every device now?', 'btn-d btn-sm')}</section></div></div>`;
  if (t.cur === 'storage')
    body = `<div class="g12">${card(
      'Backups and restore tests ' + n(S.backups.length),
      '',
      table(
        ['When', 'Status', 'Size'],
        S.backups.map(b => [`<span class="adm-date">${fmt(b.at)}</span>`, pill(b.status.includes('passed') ? 'Completed' : b.status), `<span class="ops-num">${h(b.size)}</span>`]),
      ),
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
A.ctxAdmin = d => {
  modal(
    'Assign an administrator to ' + h(S.contexts.find(c => c.id === d.id).name),
    `<form data-f="cxa" class="col adm-form"><input type="hidden" name="ctx" value="${d.id}">${fi('cxa', 'role', 'Administrator role', { type: 'select', opts: [['O', 'Organization Representative / Administrator'], ['A', 'Programme Administrator']] })}${fi('cxa', 'pid', 'Person', { type: 'select', opts: S.people.map(p => [p.id, p.name + ' · ' + p.email]) })}${banner('info', '', 'Technical administration assigns the role; it gives you no access to the context’s participant content. ' + assumed('OI-14 who assigns organization administrators'))}<div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div></form>`,
  );
};
F.cxa = d => {
  const rr = d.role || 'A';
  if (S.assign.some(a => a.pid === d.pid && a.ctx === d.ctx && a.role === rr)) {
    toast('Already assigned.', 'warn');
    return render();
  }
  S.assign.push({
    id: uid('a'),
    pid: d.pid,
    role: rr,
    ctx: d.ctx,
    status: 'Active',
    bundles: [],
    onb: { agreement: false, consents: true, profile: true, compass: true },
  });
  notify(d.pid, 'You were assigned as ' + ROLE[rr] + ' for ' + S.contexts.find(c => c.id === d.ctx).name, 'home');
  audit(ROLE[rr] + ' assigned', d.ctx, d.pid);
  toast(ROLE[rr] + ' assigned. They accept the agreement for that role on next sign-in.');
  UI.modal = null;
  ok();
};
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
