// ---------- PROFILE (F03) ----------
const VIS = [
  'Only me',
  'My collaboration contexts',
  'Authorised discovery',
  'Matching/pathway roles only',
  'Named users',
];
route('profile', 'any', () => {
  const pid = myId();
  const pr = S.profiles[pid] || { ver: 0, history: [] };
  const cl = S.claims.filter(c => c.pid === pid && c.state !== 'Revoked');
  const cands = S.candidates.filter(c => c.pid === pid);
  const t = tabs(
    'prof',
    [
      ['claims', 'Profile'],
      role() === 'P' && ['compass', 'Purpose Compass'],
      ['cand', 'Change candidates', cands.filter(c => c.status === 'Pending').length],
      ['versions', 'Versions'],
      ['collab', 'Collaboration history'],
    ],
    UI.p.tab,
  );
  let body = '';
  if (t.cur === 'claims')
    body =
      (['C', 'O'].includes(role()) && me().org
        ? card(
            'Organization profile',
            h(S.orgs.find(o => o.id === me().org).type),
            dl([
              ['Name', h(S.orgs.find(o => o.id === me().org).name)],
              ['Sector', h(S.orgs.find(o => o.id === me().org).sector || '—')],
              ['About', h(S.orgs.find(o => o.id === me().org).profile || 'Not written yet')],
              ['Website', h(S.orgs.find(o => o.id === me().org).web || '—')],
            ]),
            B(ic('edit', 14) + 'Edit organization profile', 'orgEdit'),
          ) + '<div class="section-gap"></div>'
        : '') +
      card(
        'Basic information',
        'Each saved change creates an immutable version.',
        dl([
          ['Full name', h(me().name) + ' ' + pill('Self-declared', 'p-grey')],
          ['Display name', h(me().display)],
          ['Email', h(me().email) + ' · <span class="cap">Private; released only for an approved introduction</span>'],
          ['Language', h(pr.lang || '—')],
          ['Biography', h(pr.bio || '—')],
          ['Active role', ROLE[role()] + ' · ' + h(ctx().name)],
        ]) + `<div style="margin-top:12px">${B(ic('edit', 14) + 'Edit basics', 'editBasics')}</div>`,
      ) +
      `<div style="height:16px"></div>` +
      card(
        'Profile claims',
        'Each item is a separate claim with provenance. Provenance is not a trust score.',
        table(
          ['Field', 'Value', 'Provenance', 'Visibility', 'Actions'],
          cl.map(c => [
            h(c.field),
            h(c.value),
            pill(
              c.prov,
              c.prov.includes('verified')
                ? 'p-green'
                : c.prov.includes('Evidence')
                  ? 'p-navy'
                  : c.prov.includes('AI')
                    ? 'p-ai'
                    : 'p-grey',
            ),
            `<select class="input" style="min-height:36px;font-size:12px" data-ch="claimVis" data-id="${c.id}" aria-label="Visibility">${VIS.map(v => `<option ${v === c.vis ? 'selected' : ''}>${v}</option>`).join('')}</select>`,
            B('Correct', 'correctClaim', { id: c.id }) + CB('Revoke', 'revokeClaim', { id: c.id }, 'Revoke “' + c.field + ': ' + c.value + '”? It stops being shown anywhere; the version history keeps a record.'),
          ]),
        ),
        B(ic('plus', 14) + 'Add claim', 'addClaim'),
      );
  if (t.cur === 'compass') {
    const a = S.compass[pid] || {};
    body = card(
      'Purpose Compass v1.0',
      'PC1–PC6 are the minimum. PC7–PC12 are optional and asked in context. Private by default.',
      `<form data-f="compass" class="col" style="gap:16px" novalidate>${COMPASS.map(([id, p, q, v], i) => (id === 'PC4' ? `<div class="field"><label class="lbl">${id} · ${q} ${i < 6 ? '<span class="req">*</span>' : ''}</label><div class="row wrap"><input name="PC4n" type="number" min="1" class="input" style="width:120px" value="${h((a.PC4 || '').split('|')[0])}"><select name="PC4u" class="input" style="width:200px"><option ${(a.PC4 || '').includes('week') ? 'selected' : ''}>hours per week</option><option ${(a.PC4 || '').includes('month') ? 'selected' : ''}>hours per month</option></select></div><span class="vis">${ic('lock', 14)}${v}</span></div>` : fi('compass', id, `${id} · ${q}`, { type: 'textarea', rows: 2, req: i < 6, value: a[id], vis: v + ' · ' + p }))).join('')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
    );
  }
  if (t.cur === 'cand')
    body = card(
      'Profile change candidates',
      'Nothing becomes current without your decision.',
      cands
        .map(
          c =>
            `<div class="lrow" style="align-items:flex-start"><span class="tile t-soft">${ic('sparkle', 18)}</span><div class="lt"><b>${h(c.field)}: ${h(c.value)}</b><p class="cap">Source: ${h(c.source)}</p><div style="margin-top:6px">${c.prov === 'AI-proposed' ? aiTag('AI-proposed') : pill(c.prov, 'p-grey')} ${pill(c.status)}</div></div>${c.status === 'Pending' ? `<div class="row wrap">${B('Reject', 'cand', { id: c.id, v: 'Rejected' })}${B('Defer', 'cand', { id: c.id, v: 'Deferred' })}${B('Edit', 'candEdit', { id: c.id })}${B('Accept', 'cand', { id: c.id, v: 'Accepted' }, 'btn-p btn-sm')}</div>` : ''}</div>`,
        )
        .join('') ||
        empty(
          'sparkle',
          'No candidates',
          'Candidates come from AI (only when you ask, or after approved evidence), completed milestones or Learning Harvests.',
        ),
    );
  if (t.cur === 'versions')
    body = card(
      'Version history',
      'Who changed what, when, why and from which source.',
      table(
        ['Version', 'Date', 'What changed', 'By', 'Why', 'Source'],
        pr.history
          .slice()
          .reverse()
          .map(v => ['v' + v.ver, fmt(v.at), h(v.what), h(v.by), h(v.why), pill(v.source, 'p-grey')]),
      ),
    );
  if (t.cur === 'collab') {
    const rows = [
      ...S.circles
        .filter(c => memberOf(c, pid))
        .map(c => [h(c.name), 'Circle', h(c.members.find(m => m.pid === pid).role), pill(c.state)]),
      ...S.ropes
        .filter(c => memberOf(c, pid))
        .map(c => [h(c.name), 'Rope Team', h(c.members.find(m => m.pid === pid).role), pill(c.state)]),
      ...S.rooms
        .filter(c => memberOf(c, pid))
        .map(c => [h(c.name), WL(), h(c.members.find(m => m.pid === pid).role), pill(c.state)]),
    ];
    body = card(
      'Collaboration history',
      'Authorised summary only. Private discussions, Rope Team notes and restricted evidence are never copied here.',
      table(['Space', 'Type', 'Role', 'Status'], rows),
    );
  }
  return head('Profile', 'Your versioned profile. You can correct any claim and compare versions.') + t.html + body;
});
function bumpVer(what, why, source) {
  const pid = myId();
  const pr = (S.profiles[pid] = S.profiles[pid] || { ver: 0, history: [] });
  pr.ver++;
  pr.history.push({ ver: pr.ver, at: today(), what, by: me().name, why, source });
  audit('Profile version created', pid, 'v' + pr.ver + ' · ' + what);
}
A.claimVis = (d, el) => {
  const c = byId('claims', d.id);
  bumpVer(`Visibility of ${c.field} → ${el.value}`, 'Visibility change', 'Self-declared');
  c.vis = el.value;
  toast('Visibility updated. New version saved.');
  ok();
};
A.revokeClaim = d => {
  const c = byId('claims', d.id);
  c.state = 'Revoked';
  bumpVer(`Revoked ${c.field}: ${c.value}`, 'User revoked', 'Self-declared');
  ok();
};
A.addClaim = () => {
  clearF('claim');
  modal(
    'Add a profile claim',
    () =>
      `<form data-f="claim" class="col" style="gap:14px" novalidate>${fi('claim', 'field', 'Field', { type: 'select', req: true, opts: ['Skills', 'Experience', 'Capability', 'Interests', 'Languages', 'Availability', 'Relationships / resources', 'Preferences', 'Goals', 'Contributions', 'Constraints'], ph: 'Select' })}${fi('claim', 'value', 'Value', { req: true })}${fi('claim', 'vis', 'Visibility', { type: 'select', opts: VIS, value: 'Only me' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save claim</button></div></form>`,
  );
};
F.claim = d => {
  if (!validate('claim', d, { field: ['req'], value: ['req'] })) return render();
  S.claims.push({
    id: uid('cl'),
    pid: myId(),
    field: d.field,
    value: d.value,
    prov: 'Self-declared',
    vis: d.vis,
    state: 'Current',
    ver: 1,
  });
  bumpVer('Added ' + d.field + ': ' + d.value, 'User added', 'Self-declared');
  clearF('claim');
  UI.modal = null;
  ok();
};
A.correctClaim = d => {
  const c = byId('claims', d.id);
  UI.form.corr = { value: c.value, id: c.id };
  modal(
    'Correct claim',
    () =>
      `<form data-f="corr" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${c.id}">${fi('corr', 'value', h(c.field), { req: true })}${fi('corr', 'why', 'Reason for correction', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save correction</button></div></form>`,
  );
};
F.corr = d => {
  if (!validate('corr', d, { value: ['req'], why: ['req'] })) return render();
  const c = byId('claims', d.id);
  bumpVer(`Corrected ${c.field}: “${c.value}” → “${d.value}”`, d.why, 'Corrected');
  c.value = d.value;
  c.prov = 'Self-declared';
  UI.modal = null;
  clearF('corr');
  ok();
};
A.editBasics = () => {
  const pr = S.profiles[myId()] || {};
  UI.form.basics = { display: me().display, bio: pr.bio || '', lang: pr.lang || '' };
  modal(
    'Edit basics',
    () =>
      `<form data-f="basics" class="col" style="gap:14px" novalidate>${fi('basics', 'display', 'Display name', { req: true })}${fi('basics', 'lang', 'Preferred language', { type: 'select', opts: ['English', 'Spanish', 'Hindi', 'Polish', 'French', 'Arabic'], req: true })}${fi('basics', 'bio', 'Short biography', { type: 'textarea', rows: 3, max: 400 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save new version</button></div></form>`,
  );
};
F.basics = d => {
  if (!validate('basics', d, { display: ['req'], lang: ['req'] })) return render();
  me().display = d.display;
  const pr = (S.profiles[myId()] = S.profiles[myId()] || { ver: 0, history: [] });
  pr.bio = d.bio;
  pr.lang = d.lang;
  bumpVer('Basics updated', 'User edit', 'Self-declared');
  UI.modal = null;
  ok();
};
F.compass = d => {
  const r = {};
  COMPASS.slice(0, 6).forEach(([id]) => {
    if (id !== 'PC4') r[id] = ['req'];
  });
  r.PC4n = [['req', 'Enter hours.'], 'num'];
  if (!validate('compass', d, r)) return render();
  const a = (S.compass[myId()] = S.compass[myId()] || {});
  COMPASS.forEach(([id]) => {
    if (id === 'PC4') a.PC4 = d.PC4n + '|' + d.PC4u;
    else a[id] = d[id] || '';
  });
  bumpVer('Purpose Compass updated', 'User edit', 'Self-declared');
  toast('Purpose Compass saved as a new version.');
  ok();
};
A.cand = d => {
  const c = byId('candidates', d.id);
  c.status = d.v;
  if (d.v === 'Accepted') {
    S.claims.push({
      id: uid('cl'),
      pid: c.pid,
      field: c.field,
      value: c.value,
      prov: c.prov === 'AI-proposed' ? 'Self-declared' : c.prov,
      vis: 'Only me',
      state: 'Current',
      ver: 1,
    });
    bumpVer(`Accepted ${c.field}: ${c.value}`, c.source, c.prov);
  }
  audit('Profile candidate ' + d.v, c.id, c.value);
  ok();
};
A.candEdit = d => {
  const c = byId('candidates', d.id);
  UI.form.ce = { value: c.value };
  modal(
    'Edit before accepting',
    () =>
      `<form data-f="ce" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${c.id}">${fi('ce', 'value', h(c.field), { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Accept edited version</button></div></form>`,
  );
};
F.ce = d => {
  if (!validate('ce', d, { value: ['req'] })) return render();
  const c = byId('candidates', d.id);
  c.value = d.value;
  UI.modal = null;
  A.cand({ id: c.id, v: 'Accepted' });
};
// viewing someone else's profile (F/M: V if shared/required)
function viewProfile(pid) {
  const viewer = role();
  const cl = S.claims.filter(
    c =>
      c.pid === pid &&
      c.state === 'Current' &&
      c.vis !== 'Only me' &&
      (c.vis !== 'Matching/pathway roles only' || ['F', 'M'].includes(viewer)),
  );
  const cp = S.compass[pid] || {};
  modal(
    nm(pid),
    `${dl([
      ['Display name', h(P(pid).display)],
      ['Role here', ROLE[(S.assign.find(a => a.pid === pid && a.ctx === ctxId()) || {}).role] || '—'],
      ['Email', `<span class="cap">Private — released only for an approved introduction</span>`],
    ])}${table(
      ['Field', 'Value', 'Provenance'],
      cl.map(c => [h(c.field), h(c.value), pill(c.prov, 'p-grey')]),
      'No shared claims.',
    )}${['F', 'M'].includes(viewer) && cp.PC2 ? banner('info', 'Goal (shared with assigned support roles)', h(cp.PC2)) : ''}${banner('info', 'Hidden', 'Raw Purpose Compass, hurdle and private fields are not shown. Hurdles are shared only by explicit participant choice.')}`,
  );
  audit('Profile viewed', pid, 'Authorised fields only');
  save();
}
A.viewProfile = d => {
  if (!(can('profile') || ['F', 'M', 'C'].includes(role()))) return deny('profile view');
  viewProfile(d.pid);
};
// ---------- PRIVACY (F02) ----------
route('privacy', 'agreements', () => {
  const pid = myId();
  const c = S.consents[pid];
  const t = tabs(
    'priv',
    [
      ['consent', 'Permissions'],
      ['agr', 'Agreements & receipts'],
      ['data', 'Data held about me'],
      ['req', 'Requests'],
    ],
    UI.p.tab,
  );
  let body = '';
  if (t.cur === 'consent')
    body =
      card(
        'Optional purposes',
        'Withdrawing stops new use immediately, cancels queued AI work and restricts derivatives pending re-review. Declining never blocks the collaboration core.',
        PURPOSES.map(
          ([k, tt, dsc]) =>
            `<div class="lrow" style="align-items:flex-start"><span class="tile t-soft">${ic('shield')}</span><div class="lt"><b>${tt}</b><p class="cap">${dsc}</p><div style="margin-top:6px">${pill(c[k])}</div></div><button type="button" class="toggle ${c[k] === 'Granted' ? 'on' : ''}" role="switch" aria-checked="${c[k] === 'Granted'}" aria-label="${tt}" data-a="consentChange" data-k="${k}"></button></div>`,
        ).join(''),
      ) +
      `<div style="height:16px"></div>` +
      card(
        'Consent history',
        '',
        table(
          ['When', 'Change'],
          c.history
            .slice()
            .reverse()
            .map(x => [fmt(x.at), h(x.t)]),
        ),
      );
  if (t.cur === 'agr') {
    const acc = S.accepts.filter(x => x.pid === pid);
    const re = S.assign
      .filter(a => a.pid === pid)
      .map(a => {
        const g = S.agreements.find(g => g.ctx === a.ctx && g.status === 'Active' && g.roles.includes(a.role));
        return g && !acc.some(x => x.ag === g.id) ? [a, g] : null;
      })
      .filter(Boolean);
    body =
      (re.length
        ? banner(
            'warn',
            'Re-acceptance required',
            re
              .map(([a, g]) => h(g.type) + ' v' + g.ver + ' in ' + h(S.contexts.find(c => c.id === a.ctx).name))
              .join('; ') + '. Switch to that context to review it.',
          )
        : '') +
      card(
        'Accepted agreements',
        'A person may hold several active agreements, each with its own history.',
        table(
          ['Agreement', 'Version', 'Context', 'Status', 'Accepted', 'Receipt'],
          acc.map(x => {
            const g = byId('agreements', x.ag);
            return [
              h(g.type),
              'v' + g.ver,
              h(S.contexts.find(c => c.id === g.ctx).name),
              pill(g.status === 'Active' ? 'Accepted' : g.status),
              fmt(x.at),
              B(h(x.receipt), 'fakeDl', { n: x.receipt }),
            ];
          }),
        ),
      );
  }
  if (t.cur === 'data') {
    const cl = S.claims.filter(x => x.pid === pid);
    body =
      card(
        'Data held about me',
        'Self-declared or derived, who can see it, and for what purpose.',
        table(
          ['Item', 'Source', 'Audiences', 'Purpose'],
          [
            ['Name, email, sign-in', 'Self-declared', 'You + authorised administration', 'Service operation'],
            ['Role and context', 'Assigned', 'Context members (role only)', 'Authorised operation'],
            ...cl.map(x => [h(x.field + ': ' + x.value), pill(x.prov, 'p-grey'), h(x.vis), 'Profile']),
            ['Purpose Compass', 'Self-declared', 'Only you (contextual sharing only)', 'Orientation'],
            [
              'Evidence (' + S.evidence.filter(e => e.owner === pid).length + ')',
              'Self-declared',
              'Per evidence item',
              'Evidence of claims',
            ],
            ['Consent settings', 'Self-declared', 'You + Trust/Data Steward', 'Governance'],
          ],
        ),
      ) +
      `<div style="margin-top:12px" class="row wrap">${B(ic('download', 16) + 'Export my authorised records (JSON)', 'exportMine', {}, 'btn-s')}${B('Request a correction', 'go', { r: 'privacy', tab: 'req' })}</div>`;
  }
  if (t.cur === 'req') {
    const f = 'prq';
    body =
      card(
        'Make a request',
        'Correction, export or deletion requests follow the approved policy and are always free.',
        `<form data-f="prq" class="col" style="gap:14px" novalidate>${fi(f, 'kind', 'Request type', { type: 'select', req: true, ph: 'Select', opts: ['Correction', 'Permitted export', 'Deletion request', 'Withdraw from programme'] })}${fi(f, 'detail', 'Details', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit request</button></div></form>`,
      ) +
      `<div style="height:16px"></div>` +
      card(
        'My requests',
        '',
        table(
          ['Type', 'Details', 'Status'],
          (S.requests || []).filter(r => r.pid === pid).map(r => [h(r.kind), h(r.detail), pill(r.status)]),
        ),
      );
  }
  return head('Privacy & consent', 'You decide what is shared, with whom, and for what purpose.') + t.html + body;
});
A.consentChange = d => {
  const c = S.consents[myId()];
  const from = c[d.k],
    to = from === 'Granted' ? 'Withdrawn' : 'Granted';
  c[d.k] = to;
  c.history.push({ at: now(), t: `${d.k}: ${from} → ${to}` });
  if (d.k === 'ai' && to !== 'Granted') {
    const q = S.ai.filter(j => j.by === myId() && ['Queued', 'Draft'].includes(j.status));
    q.forEach(j => (j.status = 'Cancelled'));
    if (q.length) toast(q.length + ' queued AI job(s) cancelled.', 'warn');
  }
  if (d.k === 'matching' && to !== 'Granted')
    S.matches
      .filter(m => (m.a === myId() || m.b === myId()) && !['Introduced', 'Closed', 'Rejected'].includes(m.status))
      .forEach(m => {
        if (!m.blockers.includes('No matching consent from ' + me().name))
          m.blockers.push('No matching consent from ' + me().name);
      });
  if (d.k === 'matching' && to === 'Granted')
    S.matches.forEach(m => (m.blockers = m.blockers.filter(b => b !== 'No matching consent from ' + me().name)));
  audit('Consent ' + (to === 'Granted' ? 'granted' : 'withdrawn'), d.k, from + ' → ' + to);
  notify(myId(), `Your ${d.k} permission is now ${to}.`, 'privacy');
  if (!UI.toast) toast(`${d.k}: ${to}`);
  ok();
};
A.exportMine = () => {
  const pid = myId();
  const data = {
    person: { name: me().name, email: me().email },
    claims: S.claims.filter(c => c.pid === pid),
    compass: S.compass[pid],
    consents: S.consents[pid],
    evidence: S.evidence
      .filter(e => e.owner === pid)
      .map(e => ({ title: e.title, type: e.type, level: e.level, review: e.review })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'phoenix-my-records.json';
  try {
    a.click();
  } catch (e) {}
  audit('Personal export', pid, 'Authorised records');
  toast('Export prepared (download started where allowed).');
  ok();
};
F.prq = d => {
  if (!validate('prq', d, { kind: ['req'], detail: ['req'] })) return render();
  S.requests = S.requests || [];
  S.requests.push({ id: uid('rq'), pid: myId(), kind: d.kind, detail: d.detail, status: 'Open' });
  S.assign
    .filter(a => a.role === 'A')
    .forEach(a => notify(a.pid, `Privacy request (${d.kind}) from ${me().name}`, 'admin', { tab: 'support' }));
  audit('Privacy request', d.kind, d.detail);
  clearF('prq');
  toast('Request submitted.');
  ok();
};
// ---------- PATHWAY (F04) ----------
route('pathway', 'pathways', () => {
  const r = role(),
    pid = myId();
  if (r === 'P') {
    const list = S.pathways.filter(p => p.pid === pid && inCtx(p));
    const cur = list.find(p => p.state === 'Current');
    const prop = list.filter(p => p.state === 'Proposed to participant');
    return (
      head(
        'My pathway',
        'A pathway never becomes current without your acceptance.',
        B('Draft my own pathway', 'draftPathway', { pid }, 'btn-s'),
      ) +
      prop
        .map(p =>
          card(
            'Proposed: ' + h(p.name),
            'Mode ' + h(p.mode) + ' · by ' + nm(p.by),
            `<ol class="req-list">${p.steps.map(s => `<li>${h(s.t)}</li>`).join('')}</ol><div class="row wrap" style="margin-top:12px">${B('Request a change', 'pwChange', { id: p.id })}${B('Accept pathway', 'pwAccept', { id: p.id }, 'btn-p btn-sm')}</div>`,
          ),
        )
        .join('<div style="height:16px"></div>') +
      (prop.length ? '<div style="height:16px"></div>' : '') +
      (cur
        ? card(
            h(cur.name),
            'Current · Mode ' + h(cur.mode),
            cur.steps
              .map((s, i) =>
                lrow(
                  s.done ? 'check' : 'route',
                  `Step ${i + 1}: ${h(s.t)}`,
                  s.done ? 'Completed' : '',
                  s.done ? pill('Done') : B('Mark complete', 'pwStep', { id: cur.id, i }, 'btn-s btn-sm'),
                  s.done ? 't-teal' : 't-soft',
                ),
              )
              .join(''),
          )
        : empty(
            'route',
            'No current pathway',
            'A facilitator or mentor can propose one, or draft your own (it then needs reviewer approval).',
          )) +
      `<div style="height:16px"></div>` +
      card(
        'Pathway history',
        '',
        table(
          ['Pathway', 'Mode', 'State'],
          list.map(p => [h(p.name), h(p.mode), pill(p.state)]),
        ),
      )
    );
  }
  const parts = [
    ...new Set(S.assign.filter(a => a.ctx === ctxId() && a.role === 'P' && a.status === 'Active').map(a => a.pid)),
  ].filter(p => r !== 'M' || myRopes().some(rt => memberOf(rt, p)));
  return (
    head(
      'Pathways',
      r === 'M' ? 'For participants in your Rope Teams' : 'Participants in this context',
      r === 'A' ? B('Template library', 'go', { r: 'admin', tab: 'library' }, 'btn-s') : '',
    ) +
    table(
      ['Participant', 'Current pathway', 'Other pathways', 'Actions'],
      parts.map(p => {
        const ls = S.pathways.filter(x => x.pid === p && inCtx(x));
        const c = ls.find(x => x.state === 'Current');
        return [
          nm(p),
          c ? h(c.name) + ' · ' + c.steps.filter(s => s.done).length + '/' + c.steps.length : '—',
          ls
            .filter(x => x !== c)
            .map(x => h(x.name) + ' ' + pill(x.state))
            .join('<br>') || '—',
          ['F', 'M'].includes(r) ? B('Propose pathway', 'proposePathway', { pid: p }) : '',
        ];
      }),
    ) +
    (hasB('Reviewer')
      ? `<div style="height:16px"></div>` +
        card(
          'Awaiting your approval (mode 3)',
          '',
          S.pathways
            .filter(p => p.state === 'In review' && inCtx(p))
            .map(
              p =>
                `<div class="lrow"><div class="lt"><b>${h(p.name)}</b><p class="cap">For ${nm(p.pid)} · drafted by ${nm(p.by)} · ${p.steps.map(s => h(s.t)).join(' → ')}</p></div><div class="row">${B('Return', 'pwReview', { id: p.id, v: 'Draft' })}${B('Approve', 'pwReview', { id: p.id, v: 'Proposed to participant' }, 'btn-p btn-sm')}</div></div>`,
            )
            .join('') || empty('check', 'Nothing waiting', ''),
        )
      : '')
  );
});
A.proposePathway = d => {
  clearF('pp');
  UI.form.pp = { pid: d.pid, mode: '1' };
  modal('Propose a pathway for ' + nm(d.pid), () => {
    const m = fv('pp', 'mode', '1');
    const tpl = byId('templates', fv('pp', 'tpl'));
    return `<form data-f="pp" class="col" style="gap:14px" novalidate><input type="hidden" name="pid" value="${d.pid}">${fi(
      'pp',
      'mode',
      'Mode',
      {
        type: 'select',
        opts: [
          ['1', '1 · Pre-approved template (no review)'],
          ['2', '2 · Adapted from a template'],
          ['3', '3 · Custom pathway (needs reviewer approval)'],
        ],
        help: 'Select then press Update',
      },
    )}${m !== '3' ? fi('pp', 'tpl', 'Template', { type: 'select', req: true, ph: 'Select an approved template', opts: S.templates.filter(t => t.status === 'Approved').map(t => [t.id, t.name]) }) : fi('pp', 'name', 'Pathway name', { req: true })}${m !== '1' ? fi('pp', 'steps', 'Steps (one per line, 3–5)', { type: 'textarea', rows: 5, req: true, value: tpl ? tpl.steps.join('\n') : '' }) : ''}<div class="actions">${B('Update', 'ppRefresh')}<button class="btn btn-p" type="submit">Propose</button></div></form>`;
  });
};
A.ppRefresh = () => {
  const f = document.querySelector('[data-f="pp"]');
  const d = {};
  new FormData(f).forEach((v, k) => (d[k] = v));
  UI.form.pp = d;
  render();
};
F.pp = d => {
  const rules = {};
  if (d.mode !== '3') rules.tpl = ['req'];
  else rules.name = ['req'];
  if (d.mode !== '1')
    rules.steps = [
      'req',
      [
        'fn',
        {
          f: v => {
            const n = v.split('\n').filter(x => x.trim()).length;
            return n >= 3 && n <= 5;
          },
          m: 'Enter 3 to 5 steps.',
        },
      ],
    ];
  if (!validate('pp', d, rules)) return render();
  const tpl = byId('templates', d.tpl);
  const steps = (d.mode === '1' ? tpl.steps : d.steps.split('\n').filter(x => x.trim())).map(t => ({
    t: t.trim(),
    done: false,
  }));
  const state = d.mode === '3' ? 'In review' : 'Proposed to participant';
  const p = {
    id: uid('pw'),
    pid: d.pid,
    ctx: ctxId(),
    name: d.mode === '3' ? d.name : tpl.name + (d.mode === '2' ? ' (adapted)' : ''),
    tpl: d.tpl || null,
    mode: { 1: '1 · Pre-approved template', 2: '2 · Adapted pathway', 3: '3 · AI or custom pathway' }[d.mode],
    state,
    by: myId(),
    steps,
  };
  S.pathways.push(p);
  if (state === 'In review')
    S.assign
      .filter(a => a.ctx === ctxId() && a.bundles.includes('Reviewer'))
      .forEach(a => notify(a.pid, 'Custom pathway awaiting approval for ' + P(d.pid).name, 'pathway'));
  else notify(d.pid, 'A pathway was proposed to you: ' + p.name, 'pathway');
  audit('Pathway proposed', p.id, p.mode);
  clearF('pp');
  UI.modal = null;
  toast(state === 'In review' ? 'Sent to a Reviewer for approval.' : 'Proposed to the participant.');
  ok();
};
A.draftPathway = d => {
  UI.form.pp = { pid: d.pid, mode: '3' };
  modal(
    'Draft your own pathway',
    () =>
      `<form data-f="pp" class="col" style="gap:14px" novalidate><input type="hidden" name="pid" value="${d.pid}"><input type="hidden" name="mode" value="3">${fi('pp', 'name', 'Pathway name', { req: true })}${fi('pp', 'steps', 'Steps (one per line, 3–5)', { type: 'textarea', rows: 5, req: true })}${banner('info', '', 'Custom pathways are reviewed by an authorised Reviewer before they are proposed back to you.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for review</button></div></form>`,
  );
};
A.pwReview = d => {
  const p = byId('pathways', d.id);
  p.state = d.v;
  notify(
    d.v === 'Draft' ? p.by : p.pid,
    d.v === 'Draft' ? 'Pathway returned by reviewer: ' + p.name : 'Pathway proposed to you: ' + p.name,
    'pathway',
  );
  audit('Pathway review', p.id, d.v);
  ok();
};
A.pwAccept = d => {
  const p = byId('pathways', d.id);
  S.pathways
    .filter(x => x.pid === p.pid && x.ctx === p.ctx && x.state === 'Current')
    .forEach(x => (x.state = 'Superseded'));
  p.state = 'Current';
  notify(p.by, `${me().name} accepted the pathway “${p.name}”`, 'pathway');
  audit('Pathway accepted', p.id, '');
  ok();
};
A.pwChange = d => {
  UI.form.pwc = {};
  modal(
    'Request a change',
    () =>
      `<form data-f="pwc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('pwc', 'why', 'What would you like changed?', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.pwc = d => {
  if (!validate('pwc', d, { why: ['req'] })) return render();
  const p = byId('pathways', d.id);
  p.state = 'Draft';
  p.changeReq = d.why;
  notify(p.by, `${me().name} requested a change to “${p.name}”: ${d.why}`, 'pathway');
  audit('Pathway change requested', p.id, d.why);
  UI.modal = null;
  clearF('pwc');
  ok();
};
A.pwStep = d => {
  const p = byId('pathways', d.id);
  p.steps[d.i].done = true;
  audit('Pathway step completed', p.id, p.steps[d.i].t);
  S.candidates.push({
    id: uid('cd'),
    pid: p.pid,
    field: 'Completed milestone',
    value: p.steps[d.i].t,
    source: 'Pathway milestone',
    prov: 'Activity-derived',
    status: 'Pending',
  });
  if (p.steps.every(s => s.done)) {
    p.state = 'Completed';
    S.candidates.push({
      id: uid('cd'),
      pid: p.pid,
      field: 'Completed learning activity',
      value: p.name,
      source: 'Pathway completion',
      prov: 'Activity-derived',
      status: 'Pending',
    });
    toast('Pathway completed. Profile candidates added for your review.');
  } else toast('Step completed. A profile candidate was added for your review.');
  ok();
};
// ---------- ASK PHOENIX (F09, class A) ----------
route('ask', 'ai', () => {
  const hist = (S.askHist || []).filter(x => x.pid === myId());
  const okAI = consent(myId(), 'ai') === 'Granted';
  return (
    head(
      'Ask PHOENIX',
      'Approved-source answers with sources shown. Class A: private to you; nothing changes on your record.',
    ) +
    (!S.settings.aiAvailable
      ? banner(
          'warn',
          'AI is temporarily unavailable',
          'Your request cannot be processed right now. Every other part of PHOENIX keeps working.',
        )
      : '') +
    (!okAI
      ? banner(
          'info',
          'AI processing is off for you',
          `Turn it on in ${L('Privacy & consent', 'privacy')} to use Ask PHOENIX. Declining never blocks the rest of the platform.`,
        )
      : '') +
    card(
      '',
      '',
      `<div class="chat" style="max-height:none">${hist.map(x => `<div class="msg mine"><span class="av">${ini(myId())}</span><div class="bub">${h(x.q)}</div></div><div class="msg"><span class="tile t-navy" style="width:32px;height:32px">${ic('sparkle', 16)}</span><div class="bub">${x.refused ? `<b>Request refused.</b> ` : ''}${h(x.a)}${x.src ? `<div class="cap" style="margin-top:6px">Sources: ${h(x.src)} · Uncertainty: ${h(x.unc)}</div>` : ''}<div style="margin-top:6px">${aiTag('AI · Class A private assist')}</div></div></div>`).join('') || empty('sparkle', 'Ask a question', 'Try: “What evidence is missing for my milestone?”, “Explain the E0–E4 levels”, or “Summarise unresolved questions in my Circle”.')}</div>
 <form data-f="ask" class="row" style="margin-top:16px" novalidate><input class="input" name="q" aria-label="Your question" placeholder="Ask about your pathway, evidence, Circles…" ${okAI && S.settings.aiAvailable ? '' : 'disabled'} value="${h(UI.pre?.askQ || '')}"><button class="btn btn-p" type="submit" ${okAI && S.settings.aiAvailable ? '' : 'disabled'}>${ic('send', 16)}Ask</button></form>`,
    )
  );
});
A.askPreset = d => {
  UI.pre = { askQ: d.q };
  go('ask');
};
F.ask = d => {
  UI.pre = null;
  const q = (d.q || '').trim();
  if (!q) return;
  S.askHist = S.askHist || [];
  const pid = myId();
  if (!S.settings.aiAvailable || S.settings.aiUsed >= S.settings.aiQuota) {
    toast('AI is unavailable. Your request was not processed.', 'warn');
    audit('AI request failed safely', pid, 'Provider unavailable or quota');
    return ok();
  }
  if (consent(pid, 'ai') !== 'Granted') {
    audit('AI request refused', pid, 'No AI-processing consent', 'denied');
    return deny('AI processing consent is not granted');
  }
  const other = S.people
    .filter(p => p.id !== pid)
    .some(
      p => q.toLowerCase().includes(p.display.toLowerCase() + "'s") || q.toLowerCase().includes(p.name.toLowerCase()),
    );
  const inj = /ignore (all|previous|prior)|system prompt|reveal|bypass/i.test(q);
  S.settings.aiUsed++;
  let ans;
  if (other || inj) {
    ans = {
      q,
      a: inj
        ? 'This looks like an attempt to change my instructions. I cannot do that.'
        : 'I cannot share information about other people. Ask them directly, or ask your steward.',
      refused: true,
    };
    audit(
      'AI request refused',
      'AI gateway',
      inj ? 'Prompt-injection pattern' : 'Requested another user’s data',
      'denied',
    );
  } else {
    const pw = S.pathways.find(p => p.pid === pid && p.state === 'Current');
    const step = pw && pw.steps.find(s => !s.done);
    if (/evidence|E0|E4|level/i.test(q))
      ans = {
        q,
        a: 'Evidence Support Levels describe how strongly evidence supports a specific claim: E0 not evidenced, E1 self-report or single source, E2 documented trace, E3 corroborated by multiple sources, E4 independently verified. They are never a score of you. To raise support for a milestone, add a second source such as a partner confirmation.',
        src: 'Evidence guidance (E0–E4)',
        unc: 'Low',
      };
    else if (/next|milestone/i.test(q))
      ans = {
        q,
        a: step
          ? `Your next pathway step is “${step.t}”. ${nextAction()[0]} is also waiting for you. Approved sources do not cover timing, so agree a date with your mentor or steward.`
          : 'You have no open pathway step. Consider starting a project or browsing opportunities.',
        src: 'Your pathway; Programme handbook 2026',
        unc: 'Moderate',
      };
    else
      ans = {
        q,
        a: 'Approved sources do not support a confident answer to this question. Try asking your facilitator, or rephrase with a specific milestone, Circle or evidence item.',
        src: 'Programme handbook 2026',
        unc: 'High',
      };
  }
  ans.pid = pid;
  S.askHist.push(ans);
  S.ai.push({
    id: uid('aj'),
    by: pid,
    cls: 'A',
    purpose: 'Ask PHOENIX',
    sources: ans.src || '—',
    consent: 'Granted',
    model: '[Provider model via AI gateway]',
    status: ans.refused ? 'Refused' : 'Generated',
    at: today(),
  });
  audit('AI request', pid, 'Class A · ' + (ans.refused ? 'refused' : 'answered'));
  ok();
};
