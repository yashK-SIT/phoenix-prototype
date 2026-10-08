// ---------- INVITATIONS & USERS (shared by Org Rep and Programme Admin) ----------
function inviteTable(scopeCtx) {
  const inv = S.invites.filter(i => !scopeCtx || i.ctx === scopeCtx);
  inv.forEach(i => {
    if (['Pending', 'Resent'].includes(i.status) && i.expires < today()) i.status = 'Expired';
  });
  return table(
    ['Email', 'Role', 'Context', 'Status', 'Valid until', 'Invited by', ''],
    inv.map(i => [
      h(i.email),
      ROLE[i.role],
      h(S.contexts.find(c => c.id === i.ctx).name),
      pill(i.status),
      fmt(i.expires),
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
      `<form data-f="inv" class="col" style="gap:14px" novalidate>${fi('inv', 'emails', 'Email addresses (one per line, or paste a CSV column — up to 1,000)', { type: 'textarea', rows: 5, req: true })}<div class="f2">${fi('inv', 'role', 'Nominated role', { type: 'select', req: true, opts: invitableRoles(allowed).map(r => [r.id, r.name + (r.system ? '' : ' (custom)')]) })}${fi('inv', 'days', 'Valid for (days)', { type: 'number', req: true, min: 1, value: S.settings.inviteValidityDays })}</div>${fi('inv', 'until', 'Role assignment expires (optional)', { type: 'date', help: 'After this date the role stops working until an administrator renews it. Leave empty for no expiry.' })}${fi('inv', 'ctx', 'Context', { type: 'select', req: true, opts: S.contexts.filter(c => c.kind !== 'Platform' && (role() !== 'O' || c.id === ctxId())).map(c => [c.id, c.name]), value: ctxId() })}${banner('info', '', 'Single-use links are sent by transactional email. Sensitive roles need approval after registration. An existing PHOENIX email gets the role added to their record.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
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
      `<div class="row" style="gap:10px"><span class="av">${ini(a.pid)}</span><div><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email)}</div></div></div>`,
      `<b style="font-weight:600">${ROLE[a.role]}</b><div class="cap">${h(S.contexts.find(c => c.id === a.ctx).name)}</div>`,
      pill(a.status),
      `<div class="row wrap" style="gap:4px">${a.bundles.map(b => pill(b, 'p-grey')).join('')}${a.mandate ? pill(a.mandate.valid ? 'Mandate to ' + fmt(a.mandate.until) : 'Mandate expired', a.mandate.valid ? 'p-teal' : 'p-red') : ''}${a.until ? pill((a.status === 'Expired' ? 'Role expired ' : 'Role expires ') + fmt(a.until), a.status === 'Expired' ? 'p-red' : 'p-grey') : ''}</div>`,
      canEdit && a.pid !== myId() ? B('Manage', 'userManage', { id: a.id }) : '',
    ]),
  );
}
A.userManage = d => {
  const a = byId('assign', d.id);
  const isO = role() === 'O';
  modal(
    'Manage ' + nm(a.pid),
    () => `<div class="col" style="gap:14px">${dl([
      ['Role', ROLE[a.role]],
      ['Context', h(S.contexts.find(c => c.id === a.ctx).name)],
      ['Status', pill(a.status)],
      ['Assignment expires', a.until ? fmt(a.until) : 'No expiry set'],
    ])}
 ${a.pid !== myId() ? `<form data-f="aexp" class="col" style="gap:8px" novalidate><input type="hidden" name="id" value="${a.id}">${fi('aexp', 'until', 'Role assignment expires', { type: 'date', value: a.until || '', help: 'Leave empty for no expiry. On the day after this date the role stops working until it is renewed.' })}<div class="actions"><span></span><button class="btn btn-s" type="submit">Save expiry</button></div></form>` : ''}
 <div class="row wrap">${a.status === 'Pending role approval' ? B('Approve role', 'roleDecide', { id: a.id, v: 'Active' }, 'btn-p btn-sm') + B('Decline role', 'roleDecide', { id: a.id, v: 'Role not activated' }) : a.status === 'Active' ? CB('Deactivate', 'userStatus', { id: a.id, v: 'Deactivated' }, 'Deactivate this ' + ROLE[a.role] + ' access? The person keeps their account, consent, correction and export rights.') : B('Activate', 'userStatus', { id: a.id, v: 'Active' }, 'btn-p btn-sm')}</div>
 <form data-f="bund" class="col" style="gap:8px"><input type="hidden" name="id" value="${a.id}"><span class="lbl">Specialist permission bundles</span>${S.bundles.map(b => `<label class="row"><input class="chk" type="checkbox" name="b" value="${b.name}" ${a.bundles.includes(b.name) ? 'checked' : ''} ${isO && ['Finance Owner', 'AI Owner', 'Trust/Data Steward', 'Incident/Safety Owner'].includes(b.name) ? 'disabled' : ''}>${b.name}<span class="cap">· ${h(b.approval)}</span></label>`).join('')}<span class="help">Higher-trust bundles need Programme/Organization Administrator approval and are not delegated at workspace level.</span><div class="actions"><span></span><button class="btn btn-s" type="submit">Save bundles</button></div></form>
 ${['O', 'C'].includes(roleBase(a.role)) ? `<form data-f="mand" class="col" style="gap:8px"><input type="hidden" name="id" value="${a.id}"><span class="lbl">Mandate (authority to bind the organization)</span>${fi('mand', 'scope', 'Scope', { value: a.mandate?.scope, req: true })}${fi('mand', 'until', 'Valid until', { type: 'date', req: true, value: a.mandate?.until })}<div class="actions">${a.mandate ? CB('Revoke mandate', 'mandRevoke', { id: a.id }, 'Revoke this mandate? Elevated access is removed; ordinary access continues.') : '<span></span>'}<button class="btn btn-s" type="submit">Grant / update mandate</button></div></form>` : ''}</div>`,
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
      'Invitation lifecycle',
      'Pending · Accepted · Expired · Revoked · Resent',
      inviteTable(c),
      B(ic('plus', 14) + 'Invite users', 'invNew', {}, 'btn-p btn-sm'),
    );
  if (t.cur === 'users')
    body = card(
      'Users in your organisation’s context',
      'Assign roles, grant or revoke mandates within your organisation.',
      usersTable(c, true),
    );
  if (t.cur === 'config')
    body =
      cfgForm(true) +
      '<div class="section-gap"></div>' +
      tplForm() +
      '<div class="section-gap"></div>' +
      card(
        'Grow your programme',
        'Launch a new cohort, initiative or use-case pack.',
        B(ic('plus', 14) + 'Request a new cohort', 'cohortNew', {}, 'btn-p btn-sm') +
          table(
            ['Request', 'Pack', 'Start', 'Status'],
            S.cohortReqs
              .filter(r => r.by === myId())
              .map(r => [
                h(r.name),
                h(S.packs.find(p => p.id === r.pack)?.name),
                fmt(r.start),
                pill(r.status === 'Created' ? 'Completed' : r.status),
              ]),
            'No requests yet.',
          ),
      );
  if (t.cur === 'projects')
    body = card(
      'Projects and spaces',
      'Create projects and their structure; aggregate view only.',
      table(
        ['Project', 'Owner', 'Stage', 'Status'],
        S.projects
          .filter(p => p.ctx === c && p.status !== 'Draft')
          .map(p => [
            h(p.title),
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
    );
  if (t.cur === 'reports')
    body =
      reportsView(true) +
      '<div class="section-gap"></div>' +
      card(
        'Cross-organization sharing',
        'Needs Programme Administrator approval.',
        table(
          ['Request', 'Status'],
          S.xorg.filter(x => x.by === myId()).map(x => [h(x.what), pill(x.status)]),
          'No requests.',
        ),
        B('Request sharing', 'xoNew', {}, 'btn-s btn-sm'),
      );
  return (
    head(
      'Organization workspace',
      h(S.orgs.find(o => o.id === me().org)?.name || '') + ' · ' + h(ctx().name) + ' · pack: ' + h(pk.name),
    ) +
    t.html +
    body
  );
});
function cfgForm(isOrg) {
  const pk = pack();
  return card(
    isOrg ? 'Configure within the pack envelope' : 'Use-case pack: ' + h(pk.name),
    'Platform-controlled items cannot be changed by a tenant.',
    `<form data-f="cfg" class="col" style="gap:14px" novalidate><div class="g3">${fi('cfg', 'workspace', 'Label for workspaces', { value: 'Action Room', ro: true, help: 'Fixed across PHOENIX so every role sees the same name.' })}${fi('cfg', 'circle', 'Label for Circles', { value: pk.labels.circle, req: true })}${fi('cfg', 'rope', 'Label for Rope Teams', { value: pk.labels.rope, req: true })}</div>${fi('cfg', 'compassOpt', 'Ask optional Purpose Compass questions PC7–PC12 in context', { type: 'checkbox', value: pk.compassOptional ? 'yes' : '' })}${fi('cfg', 'propose', 'Participants may propose a ' + pk.labels.workspace, { type: 'checkbox', value: S.settings.participantCanProposeWorkspace ? 'yes' : '' })}
 <div class="card" style="background:#F7F8FB;padding:14px"><b>Platform-controlled (locked)</b><p class="cap" style="margin-top:4px">${ic('lock', 12)} Consent framework · trust controls · security rules · audit model · core data semantics · Evidence Support Level definitions</p></div>${assumed('OI-09 — final split of configurable vs locked items')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save configuration</button></div></form>`,
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
  return `<div class="g12">${card(
    'Starter metrics',
    'Aggregate only. Metrics never determine trustworthiness, deservingness or fundability.',
    table(
      ['Metric', 'Category', 'Value', 'Gate'],
      S.metrics
        .filter(m => m.status === 'Active')
        .map(m => [h(m.name), h(m.cat), '<b>' + metric(m.id) + '</b>', h(m.gate)]),
    ),
    '',
    'c12',
  )}
 ${card('Authorised exports', 'Machine-readable; relationships and governance metadata kept. Small groups are suppressed.', `<div class="row wrap">${['Participation summary (aggregate)', 'Evidence summary (approved)', 'Learning Harvests (released)', ...(isOrg ? [] : ['Audit log', 'Payments & entitlements', 'Full configuration'])].map(x => B(ic('download', 14) + x, 'doExport', { n: x })).join('')}</div>`, '', 'c12')}</div>`;
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
  if (t.cur === 'requests')
    body =
      card(
        'Projects waiting for a reviewer',
        'Assign a Steward, Faculty member or Facilitator. They review the project and accept it or ask for clarification.',
        table(
          ['Project', 'Owner', 'Areas', 'Submitted', ''],
          rqProj.map(p => [L(h(p.title), 'project', { id: p.id }), nm(p.owner), (p.tags || []).map(h).join(', ') || '—', fmt(p.submitted || ''), B('Assign reviewer', 'assignStewards', { id: p.id }, 'btn-p btn-sm')]),
          'No projects are waiting for a reviewer.',
        ),
      ) +
      '<div class="section-gap"></div>' +
      card(
        'Pathways waiting for a reviewer',
        'Assign a Steward or Faculty member. They approve the pathway, reject it or ask the participant for changes.',
        table(
          ['Pathway', 'Participant', 'Steps', 'Submitted', ''],
          rqPw.map(p => [h(p.name), nm(p.pid), p.steps.map(x => h(x.t)).join(' → '), fmt(p.submitted || ''), B('Assign reviewer', 'pwAssign', { id: p.id }, 'btn-p btn-sm')]),
          'No pathways are waiting for a reviewer.',
        ),
      );
  if (t.cur === 'users')
    body = card(
      'Users and roles',
      'Activate, deactivate, manage memberships and bundles. No direct database work.',
      usersTable(null, true),
    );
  if (t.cur === 'invites')
    body = card(
      'Invitations',
      '',
      inviteTable(null),
      B(ic('plus', 14) + 'Create / bulk upload', 'invNew', {}, 'btn-p btn-sm'),
    );
  if (t.cur === 'approvals')
    body = card(
      'Sensitive role approvals',
      'Unapproved roles cannot activate. Approval status and history are kept.',
      table(
        ['Person', 'Role', 'Context', 'Requested', 'History', ''],
        pend.map(a => [
          nm(a.pid),
          ROLE[a.role],
          h(S.contexts.find(c => c.id === a.ctx).name),
          fmt(a.approval?.[0]?.at),
          (a.approval || []).map(x => h(x.note)).join('; '),
          B('Decline', 'roleDecide', { id: a.id, v: 'Role not activated' }) +
            B('Approve', 'roleDecide', { id: a.id, v: 'Active' }, 'btn-p btn-sm'),
        ]),
        'No roles awaiting approval.',
      ),
    );
  if (t.cur === 'library')
    body = card(
      'Approved pathway templates',
      'Mode 1 pathways come from this library.',
      table(
        ['Template', 'Steps', 'Status', ''],
        S.templates.map(x => [
          h(x.name),
          x.steps.map(h).join(' → '),
          pill(x.status),
          B(x.status === 'Approved' ? 'Retire' : 'Approve', 'tplState', { id: x.id }),
        ]),
      ),
      B(ic('plus', 14) + 'Add template', 'tplNew', {}, 'btn-p btn-sm'),
    );
  if (t.cur === 'packs')
    body =
      card(
        'Use-case packs',
        'One platform; packs are configuration, not code branches.',
        table(
          ['Pack', 'Workspace label', 'Enabled flows', 'Evidence types', 'Metrics', 'Status', ''],
          S.packs.map(p => [
            `<b>${h(p.name)}</b>`,
            h(p.labels.workspace),
            p.flows.join(' '),
            h(p.evidenceTypes),
            p.metrics,
            pill(p.status),
            p.status === 'Draft' ? B('Activate', 'packAct', { id: p.id }, 'btn-p btn-sm') : '',
          ]),
        ),
      ) +
      '<div style="height:16px"></div>' +
      cfgForm(false) +
      '<div style="height:16px"></div>' +
      tplForm() +
      '<div style="height:16px"></div>' +
      card(
        'Voting rule (D-03)',
        'Configurable until OI-01 is settled.',
        `<form data-f="vote" class="col" style="gap:12px" novalidate><div class="g3">${fi('vote', 'owner', 'Owner weight', { type: 'number', min: 1, value: S.settings.voting.ownerWeight, req: true })}${fi('vote', 'member', 'Member weight', { type: 'number', min: 1, value: S.settings.voting.memberWeight, req: true })}${fi('vote', 'th', 'Approval threshold (%)', { type: 'number', min: 1, value: S.settings.voting.threshold, req: true })}</div>${assumed('OI-01 relative weights')}<div class="actions"><span></span><button class="btn btn-s" type="submit">Save rule</button></div></form>`,
      ) +
      '<div style="height:16px"></div>' +
      card(
        'Configuration versions',
        'Export and restore without code changes or database work.',
        table(
          ['Version', 'Date', 'By', 'Note', ''],
          S.configVersions.map(v => [
            h(v.id),
            fmt(v.at),
            nm(v.by),
            h(v.note),
            B('Restore', 'cfgRestore', { id: v.id }),
          ]),
        ),
        B('Save current as version', 'cfgSave', {}, 'btn-p btn-sm') +
          B(ic('download', 14) + 'Export configuration', 'doExport', { n: 'Full configuration' }),
      ) +
      '<div style="height:16px"></div>' +
      card(
        'Metrics registry',
        'About 8–12 visible pilot signals.',
        table(
          ['Metric', 'Definition', 'Category', 'Owner', 'Gate', 'Status', ''],
          S.metrics.map(m => [
            h(m.name),
            h(m.def),
            h(m.cat),
            h(m.owner),
            h(m.gate),
            pill(m.status),
            B(m.status === 'Active' ? 'Hide' : 'Show', 'metToggle', { id: m.id }),
          ]),
        ),
      );
  if (t.cur === 'ai')
    body =
      card(
        'Approved AI sources',
        'Ask PHOENIX answers only from approved sources.',
        table(
          ['Source', 'Status', ''],
          S.aiSources.map(s => [
            h(s.title),
            pill(s.status === 'Approved' ? 'Approved' : 'Not approved'),
            hasB('AI Owner') ? B(s.status === 'Approved' ? 'Withdraw' : 'Approve', 'srcToggle', { id: s.id }) : '',
          ]),
        ),
      ) +
      '<div style="height:16px"></div>' +
      card(
        'AI job log',
        'User, purpose, class, sources, consent, model and review state for every job.',
        table(
          ['Job', 'By', 'Class', 'Purpose', 'Sources', 'Consent', 'Status'],
          S.ai
            .slice()
            .reverse()
            .map(j => [
              h(j.id),
              nm(j.by),
              pill(j.cls, 'p-ai'),
              h(j.purpose),
              h(j.sources),
              h(j.consent),
              pill(j.status),
            ]),
        ),
      );
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
            .map(j => [h(j.id), h(j.purpose), nm(j.by), h(j.sources), B('Reject', 'aiRev', { id: j.id, v: 'Rejected' }) + B('Approve release', 'aiRev', { id: j.id, v: 'Released' }, 'btn-p btn-sm')]),
          'Nothing waiting for review.',
        ),
      );
  if (t.cur === 'notify')
    body =
      card(
        'Send an announcement',
        'In-app notification to everyone in this context; transactional email follows the template.',
        `<form data-f="ann" class="col" style="gap:12px" novalidate>${fi('ann', 'to', 'Audience', {
          type: 'select',
          opts: [
            ['all', 'Everyone in this context'],
            ...Object.entries(ROLE)
              .filter(([k]) => k !== 'T')
              .map(([k, v]) => [k, v + 's']),
          ],
        })}${fi('ann', 't', 'Message', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
      ) +
      '<div style="height:16px"></div>' +
      card(
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
          ],
        ),
      );
  if (t.cur === 'support')
    body =
      card(
        'Support queries',
        '',
        table(
          ['From', 'Question', 'Status', ''],
          S.supportQueries.map(q => [
            nm(q.by),
            h(q.t),
            pill(q.status),
            q.status === 'Open' ? B('Mark resolved', 'sqDone', { id: q.id }) : '',
          ]),
        ),
      ) +
      '<div style="height:16px"></div>' +
      card(
        'Privacy requests',
        'Correction, export and deletion requests.',
        table(
          ['From', 'Type', 'Details', 'Status', ''],
          (S.requests || []).map(r => [
            nm(r.pid),
            h(r.kind),
            h(r.detail),
            pill(r.status),
            r.status === 'Open' ? B('Complete', 'rqDone', { id: r.id }) : '',
          ]),
        ),
      );
  if (t.cur === 'xorg') body = xorgView();
  if (t.cur === 'initiatives')
    body = card(
      'Initiative summaries for sponsors',
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
      `<form data-f="tpl" class="col" style="gap:12px" novalidate>${fi('tpl', 'name', 'Name', { req: true })}${fi('tpl', 'steps', 'Steps (3–5, one per line)', { type: 'textarea', rows: 5, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Add as approved</button></div></form>`,
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
  if (t.cur === 'contexts')
    body =
      card(
        'Contexts',
        'Programmes, cohorts and organization spaces. Strict isolation: every record carries its context ID. Organizations are managed under Organizations.',
        table(
          ['Context', 'Kind', 'Organization', 'Pack', 'Status', 'Members', ''],
          S.contexts.map(c => [
            `<b>${h(c.name)}</b><div class="cap">${c.id}</div>`,
            h(c.kind),
            c.org && orgOf(c.org) ? `<span class="row" style="gap:8px;flex-wrap:nowrap">${orgMark(orgOf(c.org), 24)}${L(h(orgOf(c.org).name), 'tenants', { id: c.org })}</span>` : '—',
            h(S.packs.find(p => p.id === c.pack)?.name || '—'),
            pill(c.status),
            S.assign.filter(a => a.ctx === c.id).length,
            c.kind !== 'Platform' ? B('Assign administrator', 'ctxAdmin', { id: c.id }) : '',
          ]),
        ),
        '',
      ) +
      (S.cohortReqs.filter(r => r.status === 'Pending').length
        ? '<div class="section-gap"></div>' +
          card(
            'Cohort requests',
            'From Organization Representatives',
            table(
              ['Cohort', 'Organization', 'Pack', 'Start', ''],
              S.cohortReqs
                .filter(r => r.status === 'Pending')
                .map(r => [
                  h(r.name),
                  h(S.orgs.find(o => o.id === r.org)?.name),
                  h(S.packs.find(p => p.id === r.pack)?.name),
                  fmt(r.start),
                  '',
                ]),
            ),
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
      card(
        'External integrations',
        'Shared WSS-controlled accounts with tenant separation in configuration and audit.',
        S.integrations
          .map((i, n) =>
            lrow(
              'link',
              h(i.name),
              '',
              pill(i.status) +
                (n === 1
                  ? B(S.settings.aiAvailable ? 'Simulate provider outage' : 'Restore provider', 'aiToggle', {})
                  : ''),
            ),
          )
          .join('') + dl([['AI quota today', S.settings.aiUsed + ' / ' + S.settings.aiQuota]]),
      ) +
      '<div class="section-gap"></div>' +
      card(
        'Provider settings',
        'Credentials are stored in the platform secret store, never in this console.',
        `<form data-f="prov" class="col" style="gap:12px" novalidate><div class="g3">${fi('prov', 'ai', 'AI provider', { value: S.providers.ai.name, req: true })}${fi('prov', 'aimode', 'AI mode', { type: 'select', opts: ['Production', 'Sandbox'], value: S.providers.ai.mode })}${fi('prov', 'quota', 'Daily AI request quota', { type: 'number', min: 1, value: S.settings.aiQuota, req: true })}</div><div class="g3">${fi('prov', 'pay', 'Payment provider', { value: S.providers.pay.name, req: true })}${fi('prov', 'paymode', 'Payment mode', { type: 'select', opts: ['Sandbox', 'Live'], value: S.providers.pay.mode })}${fi('prov', 'email', 'Email service', { value: S.providers.email.name, req: true })}</div><div class="actions"><span></span><button class="btn btn-p" type="submit">Save provider settings</button></div></form>`,
      );
  if (t.cur === 'health')
    body = `<div class="g12">${card(
      'Availability',
      '',
      dl([
        ['Uptime', h(S.health.uptime)],
        ['p95 response time', h(S.health.p95)],
        ['Status', pill('Healthy')],
      ]),
      '',
      'c5',
    )}${card(
      'Error log',
      'Latest application errors and warnings',
      table(
        ['When', 'Level', 'Message'],
        S.health.errors.map(e => [fmt(e.at), pill(e.lvl, e.lvl === 'Error' ? 'p-red' : 'p-amber'), h(e.t)]),
      ),
      '',
      'c7',
    )}${card(
      'Alert rules',
      '',
      table(
        ['Rule', 'Notify', 'Enabled'],
        S.health.alerts.map((a, i) => [
          h(a.rule),
          h(a.to),
          `<button type="button" class="toggle ${a.on ? 'on' : ''}" role="switch" aria-checked="${a.on}" aria-label="${h(a.rule)}" data-a="alertToggle" data-i="${i}"></button>`,
        ]),
      ),
      '',
      'c12',
    )}</div>`;
  if (t.cur === 'security')
    body =
      card(
        'Security events and access logs',
        '',
        table(
          ['When', 'Event'],
          S.security.map(s => [fmt(s.at), h(s.t)]),
        ),
      ) +
      '<div style="height:16px"></div>' +
      card(
        'Authentication',
        '',
        dl([
          ['MFA', 'Required for Programme and Platform Administrators'],
          ['Password policy', assumed('min 10 characters incl. a number')],
          ['Session timeout', '30 minutes idle'],
          ['Encryption', 'In transit and at rest'],
        ]) + `<div style="margin-top:12px">${CB('Revoke all sessions', 'revokeSessions', {}, 'Sign every user out of every device now?', 'btn-d btn-sm')}</div>`,
      );
  if (t.cur === 'storage')
    body =
      card(
        'Backups and restore tests',
        '',
        table(
          ['When', 'Status', 'Size'],
          S.backups.map(b => [fmt(b.at), pill(b.status.includes('passed') ? 'Completed' : b.status), h(b.size)]),
        ),
        B('Run backup now', 'backup', {}, 'btn-p btn-sm') + B('Run restore test', 'restoreTest'),
      ) +
      '<div style="height:16px"></div>' +
      card(
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
      );
  if (t.cur === 'lms')
    body = card(
      'LMS deep-link layer',
      'Secure links in and out. No LTI 1.3, SSO, roster or grade sync. The LMS is not authoritative for PHOENIX permissions.',
      `<form data-f="lms" class="col" style="gap:12px" novalidate>${fi('lms', 'returnUrl', 'Return URL', { value: S.settings.lms.returnUrl, req: true })}${fi(
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
      )}<div class="actions">${B('Test incoming deep link', 'lmsTest')}<button class="btn btn-p" type="submit">Save</button></div></form>`,
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
    `<form data-f="cxa" class="col" style="gap:12px"><input type="hidden" name="ctx" value="${d.id}">${fi('cxa', 'role', 'Administrator role', { type: 'select', opts: [['O', 'Organization Representative / Administrator'], ['A', 'Programme Administrator']] })}${fi('cxa', 'pid', 'Person', { type: 'select', opts: S.people.map(p => [p.id, p.name + ' · ' + p.email]) })}${banner('info', '', 'Technical administration assigns the role; it gives you no access to the context’s participant content. ' + assumed('OI-14 who assigns organization administrators'))}<div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div></form>`,
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
