// ---------- CIRCLES (E04, F05, D-03, D-04) ----------
// One eligible member = one vote. The project owner and active Circle members vote; the owner has no extra weight.
// Facilitators, mentors and observers take part in the discussion but do not vote.
const VOTER_ROLES = ['Project owner', 'Member'];
const eligibleVoter = (c, pid) => c.members.some(m => m.pid === pid && m.status === 'Active' && VOTER_ROLES.includes(m.role));
const eligibleVoters = c => c.members.filter(m => m.status === 'Active' && VOTER_ROLES.includes(m.role));
// Every poll has exactly three choices, stored by index: Yes (0), No (1), NTA (2). Yes and No carry the creator's text.
const VOTE_KEYS = ['Yes', 'No', 'NTA'];
const NTA_TEXT = 'Not applicable — I abstain on this question';
const YES = 0,
  NO = 1,
  NTA = 2;
// Outcome against all eligible members (not only those who voted): not voting and NTA both count as not approving.
// Approved when Yes ÷ eligible ≥ threshold. Otherwise a Yes/No tie returns the proposal to Shared for revision
// and a new vote; anything else is not approved.
function tally(c, p) {
  const th = S.settings.voting.threshold;
  const el = eligibleVoters(c);
  const n = el.length;
  const per = [YES, NO, NTA].map(i => el.filter(m => p.votes[m.pid] === i).length);
  const voted = el.filter(m => p.votes[m.pid] != null).length;
  const pct = n ? Math.round((per[YES] / n) * 100) : 0;
  const pass = n > 0 && per[YES] * 100 >= th * n;
  const tie = !pass && voted > 0 && per[YES] === per[NO] && per[YES] > 0;
  return { eligible: n, per, voted, pct, pass, tie, need: Math.ceil((th * n) / 100), outcome: pass ? 'pass' : tie ? 'tie' : voted ? 'fail' : 'none' };
}
const SHARED = 'Shared — revise and re-vote';
const POLL_PILL = { 'Closed — Approved': 'p-green', 'Closed — Not approved': 'p-amber', 'Closed — No decision': 'p-amber', [SHARED]: 'p-navy', 'Closed — Revised': 'p-grey' };
// Circles a project owner can create: their own accepted projects that do not have a Circle yet.
const ownCircleProjects = () =>
  S.projects.filter(p => inCtx(p) && p.owner === myId() && p.status === 'Accepted' && !p.circle);
const canCreateCircle = () => ['F', 'O'].includes(role()) || (role() === 'P' && can('circles', 'C'));
// Request state for a person who is not (or no longer) an active member.
const joinState = c => {
  const m = memberRec(c);
  if (!m) return 'none';
  if (m.status === 'Active') return 'member';
  if (m.status === 'Requested') return 'pending';
  if (m.status === 'Invited') return 'invited';
  return 'ended';
};
const joinBtn = (c, kind = 'circles') => {
  const s = joinState(c);
  if (s === 'pending') return pill('Pending') + ' ' + B('Withdraw request', 'joinWithdraw', { id: c.id, kind });
  if (s === 'invited') return B('Respond to invite', 'go', { r: kind === 'circles' ? 'circle' : 'rope', id: c.id }, 'btn-p btn-sm');
  if (s === 'member') return '';
  return B(s === 'ended' ? 'Request to join again' : 'Request to join', kind === 'circles' ? 'joinCircle' : 'joinRope', { id: c.id }, 'btn-p btn-sm');
};
route('circles', 'circles', () => {
  const r = role();
  UI._afterHead = invitesCard('circles');
  const all = S.circles.filter(inCtx);
  const sees = c => memberOf(c) || ['A', 'O'].includes(r) || c.facilitator === myId() || ['Requested', 'Invited'].includes((memberRec(c) || {}).status);
  // Only Circles that are part of the active role's work; Participants can also discover Circles to join.
  const mine = all.filter(c => sees(c) && inScope('circles', c));
  const others = r === 'P' ? all.filter(c => !mine.includes(c) && !memberRec(c) && !['Archived/Closed'].includes(c.state)) : [];
  const ownP = r === 'P' ? ownCircleProjects() : [];
  return (
    head(
      'Circles',
      'Collaboration spaces for shared learning, sensemaking and decisions.',
      canCreateCircle() ? B(ic('plus', 16) + 'Create Circle', 'newCircle', ownP.length === 1 ? { project: ownP[0].id } : {}, 'btn-p') : '',
    ) +
    (ownP.length
      ? banner('info', 'Your project is ready for a Circle', ownP.map(p => '“' + h(p.title) + '”').join(', ') + ' was accepted. You can create its Circle yourself; your steward joins it as facilitator.')
      : '') +
    card(
      'Your Circles',
      '',
      dataView('circles:mine', {
        label: 'Circles',
        items: mine,
        search: c => [c.name, c.purpose, P(c.facilitator).name, wsRoleTxt('circles', c), c.visibility].join(' '),
        quick: { label: 'State', options: wsOpts(mine, c => c.state), test: (c, v) => c.state === v },
        filters: [
          { key: 'role', label: 'Your role', options: wsOpts(mine, c => wsRoleTxt('circles', c)), test: (c, v) => wsRoleTxt('circles', c) === v },
          { key: 'fac', label: 'Facilitator', options: wsPeople(mine, c => c.facilitator), test: (c, v) => c.facilitator === v },
          { key: 'vis', label: 'Visibility', options: wsOpts(mine, c => c.visibility), test: (c, v) => c.visibility === v },
        ],
        sorts: [
          ['name', 'Name', (a, b) => a.name.localeCompare(b.name)],
          ['activity', 'Latest activity', (a, b) => wsLastAt(b).localeCompare(wsLastAt(a))],
          ['decisions', 'Decisions', (a, b) => (b.decisions || []).length - (a.decisions || []).length],
          ['members', 'Members', (a, b) => wsActive(b).length - wsActive(a).length],
        ],
        defaultSort: 'name',
        row: c => ({
          lead: `<span class="tile t-purple" aria-hidden="true">${ic('users', 18)}</span>`,
          title: L(h(c.name), 'circle', { id: c.id }, 'dv-link') + wsUnread(c),
          sub: h(c.purpose),
          meta: ['Facilitator <b>' + nm(c.facilitator) + '</b>', 'Your role <b>' + h(wsRoleTxt('circles', c)) + '</b>', wsMem(c), (c.decisions || []).length + ' decision' + ((c.decisions || []).length === 1 ? '' : 's')],
          badges: pill(c.state) + (joinState(c) === 'pending' ? pill('Pending') : joinState(c) === 'invited' ? pill('Invited') : ''),
          primary: joinState(c) === 'invited' ? B('Respond to invite', 'go', { r: 'circle', id: c.id }, 'btn-p btn-sm') : joinState(c) === 'pending' ? B('Withdraw request', 'joinWithdraw', { id: c.id, kind: 'circles' }) : L('Open', 'circle', { id: c.id }, 'btn btn-s btn-sm'),
        }),
        empty: ['users', 'You are not in a Circle yet.', 'Ask to join one below, or wait for an invitation.', ''],
      }),
    ) +
    (others.length && !['A', 'O'].includes(r)
      ? '<div class="section-gap"></div>' +
        card(
          'Other Circles you can ask to join',
          'You can see what each Circle is for. Content stays with its members until the facilitator or project owner approves your request.',
          dataView('circles:others', {
            label: 'Circles',
            items: others,
            search: c => [c.name, c.purpose, P(c.facilitator).name].join(' '),
            quick: { label: 'Visibility', options: wsOpts(others, c => c.visibility), test: (c, v) => c.visibility === v },
            sorts: [['name', 'Name', (a, b) => a.name.localeCompare(b.name)]],
            defaultSort: 'name',
            dense: true,
            row: c => ({
              lead: `<span class="tile t-purple" aria-hidden="true">${ic('users', 18)}</span>`,
              title: `<b>${h(c.name)}</b>`,
              sub: h(c.purpose),
              meta: ['Facilitator ' + nm(c.facilitator), h(c.visibility)],
              badges: pill(c.state),
              primary: (c.visibility === 'Programme' ? L('Open', 'circle', { id: c.id }, 'btn btn-s btn-sm') : '') + (c.state === 'Active' ? joinBtn(c) : ''),
            }),
            empty: ['users', 'No other Circles', 'Circles you are not in appear here.', ''],
          }),
        )
      : '')
  );
});
// Requests are always recorded, shown as Pending to the requester, and routed to the facilitator and project owner.
const joinApprovers = (kind, o) => {
  const ids = kind === 'circles' ? [o.facilitator, o.owner] : o.members.filter(m => ['Facilitator', 'Project owner'].includes(spaceRole('ropes', o, m.pid))).map(m => m.pid).concat(o.owner);
  return [...new Set(ids.filter(Boolean))];
};
function requestJoin(kind, id) {
  const o = byId(kind, id);
  const m = memberRec(o);
  if (m && ['Active', 'Requested', 'Invited'].includes(m.status)) return ok();
  if (m) Object.assign(m, { status: 'Requested', role: 'Member', at: now() });
  else o.members.push({ pid: myId(), role: 'Member', status: 'Requested', at: now() });
  const r = kind === 'circles' ? 'circle' : 'rope';
  joinApprovers(kind, o)
    .filter(p => p !== myId())
    .forEach(p => notify(p, me().name + ' asked to join ' + o.name + ' — approve or decline in Members', r, { id: o.id, tab: 'members' }));
  audit(SPACE_KIND_LABEL(kind) + ' join requested', o.id, '');
  toast('Request sent. It shows as Pending until the facilitator or project owner decides.');
  ok();
}
A.joinCircle = d => requestJoin('circles', d.id);
A.joinRope = d => requestJoin('ropes', d.id);
A.joinWithdraw = d => {
  const o = byId(d.kind, d.id);
  const m = memberRec(o);
  if (m && m.status === 'Requested') m.status = 'Withdrawn';
  audit('Join request withdrawn', o.id, '');
  toast('Request withdrawn.');
  ok();
};
A.newCircle = d => {
  clearF('nc');
  mselReset('nc', 'm');
  const isP = role() === 'P';
  const ownP = isP ? ownCircleProjects() : [];
  const firstP = isP ? ownP[0] : S.projects.find(p => inCtx(p) && p.status === 'Accepted' && !p.circle && (role() === 'O' || stewardOf(p)));
  const pid0 = d.project || (firstP ? firstP.id : '');
  const pr = pid0 && byId('projects', pid0);
  UI.form.nc = {
    project: pid0 || '',
    name: pr ? pr.title + ' Circle' : '',
    purpose: pr ? 'Discuss and agree requirements for “' + pr.title + '”' : '',
  };
  modal('Create a Circle', () => {
    const cur = byId('projects', fv('nc', 'project'));
    const exclude = [myId(), cur ? cur.owner : null];
    const def = cur ? (cur.owner !== myId() ? [cur.owner] : []) : [];
    const projOpts = (isP ? ownP : S.projects.filter(p => inCtx(p) && p.status === 'Accepted' && !p.circle && (role() === 'O' || stewardOf(p)))).map(p => [p.id, p.title]);
    return `<form data-f="nc" class="col" style="gap:14px" novalidate>${projOpts.length ? fi('nc', 'project', 'Project', { type: 'select', req: true, opts: projOpts, ch: 'ncProject', help: isP ? 'Your accepted projects that do not have a Circle yet. A project steward joins as facilitator.' : 'Accepted projects you steward that do not have a Circle yet.' }) : banner('warn', 'No project available', isP ? 'You can create a Circle once one of your projects has been accepted.' : 'There are no accepted projects you steward that still need a Circle.')}${fi('nc', 'name', 'Name', { req: true })}${fi('nc', 'purpose', 'Purpose', { type: 'textarea', rows: 2, req: true })}${fi('nc', 'outcome', 'Expected outcome', { type: 'textarea', rows: 3, req: true })}${fi('nc', 'agreement', 'Working agreement', { type: 'select', opts: ['Circle working agreement v1'], req: true })}
 <div class="field"><label class="lbl" for="nc_docs">Documents <span class="req">*</span></label><input id="nc_docs" type="file" name="docs" class="input${fe('nc', 'docs') ? ' err' : ''}" style="padding:8px" multiple aria-invalid="${!!fe('nc', 'docs')}">${fe('nc', 'docs') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('nc', 'docs')}</span>` : ''}<span class="help">Upload at least one document the Circle needs, such as a brief, charter or terms of reference. Up to ${S.settings.maxFileMB} MB each. Choose the project first; changing it clears the selection.</span></div>
 <div class="actions"><span></span><button class="btn btn-p" type="submit" ${projOpts.length ? '' : 'disabled'}>Create Circle</button></div></form>`;
  });
};
A.ncProject = (d, el) => {
  const f = {};
  new FormData(el.form).forEach((v, k) => {
    if (k !== 'm') f[k] = v;
  });
  const pr = byId('projects', el.value);
  if (pr) {
    f.name = pr.title + ' Circle';
    f.purpose = 'Discuss and agree requirements for “' + pr.title + '”';
  }
  clearF('nc');
  UI.form.nc = f;
  mselReset('nc', 'm');
  render();
};
F.nc = (d, form) => {
  if (!validate('nc', d, { project: [['req', 'Choose the project this Circle is for.']], name: ['req'], purpose: ['req'], outcome: ['req'] })) return render();
  const files = [...(form?.querySelector('input[name="docs"]')?.files || [])];
  const big = files.find(f => f.size > S.settings.maxFileMB * 1048576);
  const bad = files.find(f => /\.(exe|bat|cmd|sh|msi|js)$/i.test(f.name));
  if (!files.length || big || bad) {
    UI.err.nc = { ...(UI.err.nc || {}), docs: !files.length ? 'Upload at least one document.' : big ? big.name + ' is over ' + S.settings.maxFileMB + ' MB.' : bad.name + ' is not a supported file type.' };
    return render();
  }
  const pr = d.project && byId('projects', d.project);
  const isP = role() === 'P';
  if (pr && isP && (pr.owner !== myId() || pr.status !== 'Accepted' || pr.circle))
    return deny('you can create a Circle only for your own accepted project that does not have one yet');
  const steward = pr && (pr.stewards.find(s => S.assign.some(a => a.pid === s && a.ctx === pr.ctx && roleBase(a.role) === 'F' && a.status === 'Active')) || pr.stewards[0]);
  const fac = isP ? steward || (S.assign.find(a => a.ctx === ctxId() && roleBase(a.role) === 'F' && a.status === 'Active') || {}).pid : myId();
  const owner = pr ? pr.owner : myId();
  const c = {
    id: uid('ci'),
    ctx: ctxId(),
    name: d.name,
    purpose: d.purpose,
    outcome: d.outcome,
    owner,
    facilitator: fac,
    project: pr?.id || null,
    visibility: 'Members only',
    docs: files.map(f => ({ id: uid('dc'), n: f.name, mb: +(f.size / 1048576).toFixed(2), by: myId(), at: now() })),
    state: isP && !pr ? 'Pending Review' : 'Active',
    agreement: d.agreement,
    members: [{ pid: owner, role: pr || isP ? 'Project owner' : 'Facilitator', status: 'Active' }],
    chat: [],
    sessions: [],
    reflections: [],
    commitments: [],
    concerns: [],
    decisions: [],
    polls: [],
    pause: null,
    createdBy: myId(),
  };
  if (fac && !c.members.some(m => m.pid === fac)) c.members.push({ pid: fac, role: 'Facilitator', status: 'Active' });
  S.circles.push(c);
  sysMsg(c, 'Circle created by ' + me().name);
  if (pr) {
    pr.circle = c.id;
    pr.stage = 'Circle';
    pr.history.push({ at: today(), t: 'Circle created by ' + me().name });
    if (pr.owner !== myId()) notify(pr.owner, 'Circle created for your project', 'circle', { id: c.id });
  }
  if (isP && fac) notify(fac, (pr ? 'You are facilitator of the new Circle “' : 'Circle awaiting your review: “') + c.name + '”', 'circle', { id: c.id });
  audit('Circle created', c.id, c.state + (pr ? ' · project ' + pr.id : ''));
  UI.modal = null;
  clearF('nc');
  save();
  go('circle', { id: c.id });
};
route('circle', 'circles', () => {
  const c = byId('circles', UI.p.id);
  if (!c) return empty('users', 'Circle not found', '');
  const r = role();
  const isMem = memberOf(c);
  const mgr = sCan('circles', c, 'facilitate') || spaceAdmin('circles', c);
  const memMgr = mgr || sCan('circles', c, 'members');
  const pollMgr = mgr || sCan('circles', c, 'poll');
  const canRec = sCan('circles', c, 'record');
  const myM = memberRec(c);
  if (myM && myM.status === 'Requested')
    return (
      head(h(c.name), h(c.purpose), pill('Pending'), [['Circles', 'circles'], [h(c.name)]]) +
      banner(
        'info',
        'Your request to join is pending',
        nm(c.facilitator) + ' (facilitator)' + (c.owner && c.owner !== c.facilitator ? ' or ' + nm(c.owner) + ' (project owner)' : '') + ' will approve or decline it. You will be notified either way.',
      ) +
      card('', '', dl([['Purpose', h(c.purpose)], ['Facilitator', nm(c.facilitator)], ['Requested', fmt(myM.at || '')]]) + `<div class="row ws-acts">${B('Withdraw request', 'joinWithdraw', { id: c.id, kind: 'circles' })}</div>`)
    );
  if (!(myM && myM.status === 'Invited') && !isMem && !mgr && c.visibility !== 'Programme')
    return (
      head(h(c.name), h(c.purpose), pill(c.state), [['Circles', 'circles'], [h(c.name)]]) +
      card(
        'Members only',
        'Only members see this Circle’s chat, sessions and records.',
        dl([['Purpose', h(c.purpose)], ['Expected outcome', h(c.outcome || '—')], ['Facilitator', nm(c.facilitator)], ['Project owner', nm(c.owner)], ['Members', c.members.filter(m => m.status === 'Active').length]]) +
          (c.state === 'Active' ? `<div class="row ws-acts">${joinBtn(c)}</div>` : ''),
      )
    );
  if (myM && myM.status === 'Invited')
    return (
      head(h(c.name), 'You have been invited to this Circle') +
      card(
        '',
        '',
        `<p>${h(c.purpose)}</p>${dl([
          ['Facilitator', nm(c.facilitator)],
          ['Agreement', h(c.agreement)],
          ['Visibility', h(c.visibility)],
        ])}${invPanel('circles', c)}`,
      )
    );
  const paused = c.state === 'Paused/Repair';
  const ro = paused || ['Completed', 'Archived/Closed'].includes(c.state) || (!isMem && !mgr);
  const noRec = ro || !(canRec || mgr);
  const t = subnav(
    'ci_' + c.id,
    [
      ['overview', 'Overview'],
      ['chat', 'Chat', isMem && unreadIn(c) ? unreadIn(c) : null],
      ['sessions', 'Sessions', c.sessions.length],
      ['records', 'Reflections & commitments'],
      ['polls', 'Decisions & votes', c.polls.filter(p => p.status === 'Open').length],
      ['members', 'Members', c.members.length],
      ['about', 'About & lifecycle'],
      ['docs', 'Documents', (c.docs || []).length],
    ],
    UI.p.tab,
    {
      label: 'Circle sections',
      groups: [
        ['', '', ['overview']],
        ['Conversation', 'message', ['chat', 'sessions']],
        ['Decisions', 'vote', ['polls', 'records']],
        ['People & context', 'users', ['members', 'about', 'docs']],
      ],
    },
  );
  let body = '';
  if (t.cur === 'chat')
    body =
      `<div class="ws-split ws-chat"><div class="ws-main"><div class="row wrap chatbar"><span class="cap">Real-time chat for members of this Circle. ${isMem ? L('Open in Messages', 'messages', { c: c.id, k: 'circles' }) : ''}</span>${mgr && !ro ? B(ic('sparkle', 14) + 'Draft Circle summary with AI', 'circleSummary', { id: c.id }) : ''}</div>` +
      chatThread('circles', c, { embedded: true }) +
      `</div><aside class="ws-rail hide-md" aria-label="Members">${wsTeamCard('circles', c)}</aside></div>`;
  if (t.cur === 'sessions')
    body = card(
      'Sessions',
      'Agenda and the transcription and minutes of meeting (MOM). Visible to everyone in this Circle.',
      c.sessions
        .slice()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map(s => `<article class="sess"><header class="sess-h"><span class="sess-date" aria-hidden="true"><b>${s.date ? new Date(s.date + 'T00:00:00').getDate() : '–'}</b><span>${s.date ? new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }) : ''}</span></span><div class="sess-t"><b>${h(s.title)}</b><span class="cap">${fmt(s.date)}${s.by ? ' · recorded by ' + nm(s.by) : ''}${s.edited ? ' · edited ' + fmt(s.edited.at.slice(0, 16)) + ' by ' + nm(s.edited.by) : ''}</span></div><span class="row sess-a">${pill(s.status)}${mgr && !ro ? B(ic('edit', 14) + 'Edit', 'editSession', { c: c.id, id: s.id }) : ''}</span></header>${s.agenda ? `<div class="sess-f"><span class="lbl">Agenda</span><p class="ws-pre">${h(s.agenda)}</p></div>` : ''}<div class="sess-f"><span class="lbl">Transcription & MOM</span><p class="ws-pre">${h(s.checkins || '—')}</p></div></article>`)
        .join('') || empty('calendar', 'No sessions yet', 'Recorded sessions appear here for everyone in the Circle.'),
      mgr && !ro ? B(ic('plus', 14) + 'Record session', 'newSession', { id: c.id }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'records') {
    const commitRight = x => {
      if (ro) return pill(x.status);
      const owner = x.by === myId();
      let act = '';
      if (['Open', 'Changes requested'].includes(x.status) && (owner || mgr))
        act = B(owner && !mgr && x.assignedBy ? 'Submit as done' : 'Mark done', 'doneCommit', { c: c.id, id: x.id });
      if (x.status === 'Awaiting review' && mgr)
        act = B('Request changes', 'commitReview', { c: c.id, id: x.id, v: 'changes' }) + B('Accept work', 'commitReview', { c: c.id, id: x.id, v: 'ok' }, 'btn-p btn-sm');
      return pill(x.status) + act;
    };
    body = `<div class="g12">${card('Responsibilities and commitments', 'Facilitators assign responsibilities; members make commitments. Assigned work is reviewed before it counts as done.', c.commitments.map(x => lrow(x.assignedBy ? 'flag' : 'calendar', h(x.t), nm(x.by) + (x.assignedBy ? ' · assigned by ' + nm(x.assignedBy) : '') + ' · due ' + fmt(x.due) + dueTag(x.due, x.status === 'Done') + (x.note ? `<span class="cap" style="display:block">Changes requested: ${h(x.note)}</span>` : ''), commitRight(x))).join('') || '<p class="cap">None yet.</p>', noRec ? '' : B(ic('plus', 14) + (mgr ? 'Assign or add' : 'Add commitment'), 'addRec', { id: c.id, k: 'commitments' }), 'c6')}${card('Reflections', '', c.reflections.map(x => lrow('message', h(x.t), nm(x.by) + ' · ' + fmt(x.at))).join('') || '<p class="cap">None yet.</p>', noRec ? '' : B(ic('plus', 14) + 'Add', 'addRec', { id: c.id, k: 'reflections' }), 'c6')}${card('Concerns', 'Routed to the facilitator, and to the Incident/Safety Owner when escalated.', c.concerns.map(x => lrow(x.ret ? 'refresh' : 'alert', h(x.t), (x.anon ? 'Anonymous' : nm(x.by)) + ' · ' + fmt(x.at), pill(x.status) + (mgr && x.status === 'Open' ? B('Resolve', 'resolveConcern', { c: c.id, id: x.id }) + (x.ret ? '' : B('Escalate', 'escalateConcern', { c: c.id, id: x.id })) : ''))).join('') || '<p class="cap">None raised.</p>', isMem && !ro && canRec ? B(ic('plus', 14) + 'Raise concern', 'addRec', { id: c.id, k: 'concerns' }) : '', 'c6')}${card('Decisions', 'Decision history. An approved decision is what moves the project forward.', c.decisions.map(x => lrow('check', h(x.t), fmt(x.at) + ' · ' + h(x.by))).join('') || '<p class="cap">None yet. Decide by vote, or record a facilitator decision.</p>', mgr && !ro ? B(ic('plus', 14) + 'Record decision', 'addRec', { id: c.id, k: 'decisions' }) : '', 'c6')}</div>`;
  }
  if (t.cur === 'polls') {
    const th = S.settings.voting.threshold;
    const el = eligibleVoters(c);
    const amV = eligibleVoter(c, myId());
    const who = `<section class="poll-elig" aria-label="Who can vote"><div class="poll-elig-h">${ic('users', 16)}<b>Who can vote</b><span class="cap">${el.length} eligible member${el.length === 1 ? '' : 's'} · one vote each</span></div><p class="cap">The project owner and active Circle members each have <b>one vote</b>; the project owner has no extra weight. Facilitators, mentors and observers join the discussion but do not vote. ${amV ? 'You are an eligible voter.' : 'You are not an eligible voter in this Circle.'}</p><p class="cap">${el.map(m => nm(m.pid) + (m.role === 'Project owner' ? ' (project owner)' : '')).join(' · ') || 'No eligible members yet.'}</p><p class="cap">A proposal is <b>approved</b> when Yes votes reach ${th}% of all ${el.length} eligible members (at least ${Math.ceil((th * el.length) / 100)} Yes). NTA and not voting count as not approving. A Yes/No <b>tie</b> returns the proposal to Shared for revision and a new vote.</p></section>`;
    body = card(
      'Decisions & votes',
      'One eligible member = one vote. Each member votes once per round.',
      who +
        (c.polls
          .map(p => {
            const tl = tally(c, p);
            const mv = p.votes[myId()];
            const canV = amV && p.status === 'Open' && !ro && mv == null;
            const opt = i => {
              const pctOf = tl.eligible ? Math.round((tl.per[i] / tl.eligible) * 100) : 0;
              return `<div class="poll-opt${mv === i ? ' is-mine' : ''}${p.status !== 'Open' && i === YES && tl.pass ? ' is-lead' : ''}"><div class="poll-ob"><div class="poll-ol"><span><b class="poll-k poll-k-${VOTE_KEYS[i].toLowerCase()}">${VOTE_KEYS[i]}</b>${h(p.options[i])}</span><span class="cap">${tl.per[i]} vote${tl.per[i] === 1 ? '' : 's'} · ${pctOf}% of ${tl.eligible} eligible</span></div><div class="progress poll-bar" aria-hidden="true"><span class="bar" style="width:${pctOf}%"></span></div></div>${canV ? B('Vote ' + VOTE_KEYS[i], 'vote', { c: c.id, p: p.id, i }, 'btn-s btn-sm') : mv === i ? `<span class="pill p-teal">Your vote</span>` : ''}</div>`;
            };
            return `<article class="poll-item"><header class="poll-h"><span class="tile t-purple" aria-hidden="true">${ic('vote', 16)}</span><b>${h(p.q)}</b>${p.round > 1 ? `<span class="pill p-grey">Round ${p.round}</span>` : ''}${pill(p.status, POLL_PILL[p.status])}</header>${p.desc ? `<p class="muted ws-pre poll-desc">${h(p.desc)}</p>` : ''}<p class="cap poll-meta">${p.created ? 'Created ' + fmt(p.created.slice(0, 16)) + (p.by ? ' by ' + nm(p.by) : '') + ' · ' : ''}${p.status === 'Open' ? 'Closes ' : 'Closed '}${fmt(p.closedAt ? p.closedAt.slice(0, 16) : p.closes)} · ${tl.voted} of ${tl.eligible} eligible members voted · approval needs ${tl.need} Yes (${th}%)</p>
  <div class="poll-opts">${[YES, NO, NTA].map(opt).join('')}</div>
  ${p.status === 'Open' && amV && mv != null ? `<p class="cap poll-res">You voted ${VOTE_KEYS[mv]}. Your vote is locked for this round; if the proposal returns to Shared, you vote again in the next round.</p>` : ''}${p.result ? `<p class="cap poll-res">Result: ${h(p.result)}</p>` : ''}${p.status === SHARED ? banner('info', 'Tie — returned to Shared', 'Yes and No are tied. The project owner or facilitator revises the proposal and opens a new round; every eligible member votes again.') : ''}${p.status === 'Open' && pollMgr ? `<div class="row ws-acts">${B('Close poll and record result', 'closePoll', { c: c.id, p: p.id }, 'btn-p btn-sm')}</div>` : ''}${[SHARED, 'Closed — Not approved', 'Closed — No decision'].includes(p.status) && pollMgr && !ro ? `<div class="row ws-acts">${B(p.status === SHARED ? 'Revise and open re-vote' : 'Modify and re-poll', 'repoll', { c: c.id, p: p.id }, p.status === SHARED ? 'btn-p btn-sm' : 'btn-s btn-sm')}</div>` : ''}${p.status !== 'Open' && p.status !== SHARED ? pollReview(c, p) : ''}</article>`;
          })
          .join('') || empty('vote', 'No votes yet', 'The project owner or facilitator can put an important decision to a vote.')),
      !ro && pollMgr ? B(ic('plus', 14) + 'Create vote', 'newPoll', { id: c.id }, 'btn-p btn-sm') : '',
    );
  }
  if (t.cur === 'members') {
    const reqs = c.members.map((m, i) => [m, i]).filter(([m]) => m.status === 'Requested');
    body =
      (reqs.length
        ? card(
            'Join requests',
            memMgr ? 'Approve or decline. The person is notified either way.' : 'Waiting for the facilitator or project owner.',
            table(
              ['Person', 'Platform role', 'Requested', ''],
              reqs.map(([m, i]) => [
                `<a href="#" class="lnk" data-a="viewProfile" data-pid="${m.pid}">${nm(m.pid)}</a>`,
                h(ROLE[ctxRole(m.pid, c.ctx)] || '—'),
                fmt(m.at || ''),
                memMgr && !ro ? B('Decline', 'memSet', { c: c.id, i, v: 'Declined' }) + B('Approve', 'memSet', { c: c.id, i, v: 'Active' }, 'btn-p btn-sm') : pill('Pending'),
              ]),
            ),
          ) + '<div class="section-gap"></div>'
        : '') +
      card(
        'Members',
        'Each member’s role applies in this Circle only. ' + (memMgr ? 'You can change roles, invite and remove members.' : 'The facilitator and project owner manage membership.'),
        table(
          ['Member', 'Role in this Circle', 'Status', ''],
          c.members
            .map((m, i) => [m, i])
            .filter(([m]) => m.status !== 'Requested')
            .map(([m, i]) => {
              const fixed = m.pid === c.facilitator || m.pid === c.owner;
              const sr = m.pid === c.facilitator ? 'Facilitator' : m.pid === c.owner ? 'Project owner' : normRole(m.role);
              return [
                `<a href="#" class="lnk" data-a="viewProfile" data-pid="${m.pid}">${nm(m.pid)}</a> <span class="cap">${h(ROLE[ctxRole(m.pid, c.ctx)] || '')}</span>`,
                memMgr && !ro && !fixed && m.status !== 'Removed' ? roleSelect('memRole', { c: c.id, i, kind: 'circles' }, sr, 'Role of ' + P(m.pid).name) : h(roleLabel(sr, 'circles')),
                pill(m.status),
                memMgr && !ro && !fixed && ['Active', 'Invited'].includes(m.status)
                  ? CB('Remove', 'memSet', { c: c.id, i, v: 'Removed' }, 'Remove ' + P(m.pid).name + ' from this Circle? They lose access to its chat and records.')
                  : '',
              ];
            }),
        ),
        memMgr && !ro ? B(ic('plus', 14) + 'Invite', 'inviteMem', { c: c.id, kind: 'circles' }, 'btn-p btn-sm') : '',
      );
  }
  if (t.cur === 'about') {
    const pr = byId('projects', c.project);
    const fromCards = S.cards.filter(k => k.from === c.id && (k.owner === myId() || cardVisible(k) || ['A', 'F'].includes(r)));
    const hvDone = S.harvests.some(x => x.scope === c.id && ['Approved', 'Released'].includes(x.state));
    body = `<div class="g12">${c.aiSummary && c.aiSummary.status === 'Draft' && mgr ? `<div class="c12">${card('AI-drafted Circle summary', 'Class B workflow draft — review before it is shared with members.', `<p class="muted">${h(c.aiSummary.text)}</p><div style="margin:10px 0">${aiTag('AI draft · sources: chat, sessions, decisions')}</div><div class="row">${B('Reject', 'summaryDecide', { id: c.id, v: 'Rejected' })}${B('Approve and share', 'summaryDecide', { id: c.id, v: 'Approved' }, 'btn-p btn-sm')}</div>`)}</div>` : ''}${card('About', '', dl([['Purpose', h(c.purpose)], ['Expected outcome', h(c.outcome)], ['Owner', nm(c.owner)], ['Facilitator', nm(c.facilitator)], ['Agreement', h(c.agreement)], ['Project', pr ? L(h(pr.title), 'project', { id: pr.id }) : '—'], ['State', pill(c.state)], paused && ['Pause reason', h(c.pause.reason) + ' · restart when: ' + h(c.pause.restart)]]), '', 'c7')}
  ${card('Lifecycle', 'Pending Review → Active → Paused/Repair', `<div class="col" style="gap:8px">${mgr ? [c.state === 'Pending Review' && B('Approve Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm'), c.state === 'Active' && B(ic('pause', 14) + 'Pause and repair', 'pauseCircle', { id: c.id }), paused && B('Resume Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm')].filter(Boolean).join('') || '<p class="cap">Nothing to change right now.</p>' : '<p class="cap">Managed by the project owner and facilitator.</p>'}</div>`, '', 'c5')}
  ${pr ? `<div class="c7 col ws-stack">${stageGate(pr, 'circles', c)}${reportsCard(pr, 'circles', c)}</div>` : ''}
  ${card('Move toward action', 'Create or link — the Circle always stays intact.', `<div class="col" style="gap:8px">${!ro && sCan('circles', c, 'card') && can('opportunities', 'CM') ? B(ic('megaphone', 14) + 'Create Opportunity Card from this Circle', 'go', { r: 'newcard', from: c.id }) : ''}${mgr && !ro && !pr ? B(ic('room', 14) + 'Create or link ' + WL(), 'newRoom', { origin: 'Circle decision', oid: c.id }) : ''}${!ro && (sCan('circles', c, 'harvest') || mgr) ? B(ic('sparkle', 14) + 'Start a Learning Harvest', 'newHarvest', { scope: c.id }) : ''}</div>`, '', pr ? 'c5' : 'c12')}
  ${card('Opportunity Cards from this Circle', 'Cards created here link back to this Circle. Audience is set by each card’s creator.', fromCards.map(k => lrow('megaphone', h(k.title), h(k.kind) + ' · ' + h(k.vis === 'Circle members' ? 'This Circle’s members' : k.vis) + ' · ' + nm(k.owner), pill(k.status) + ' ' + L('Open', 'card', { id: k.id }))).join('') || '<p class="cap">None yet.</p>', '', 'c12')}
  ${returnsCard(c) ? `<div class="c12">${returnsCard(c)}</div>` : ''}</div>`;
  }
  if (t.cur === 'docs')
    body = card(
      'Documents',
      'Documents uploaded for this Circle. Visible to everyone in the Circle.',
      dataView('ci:docs:' + c.id, {
        label: 'documents',
        items: c.docs || [],
        search: x => x.n + ' ' + P(x.by).name,
        filters: [{ key: 'by', label: 'Uploaded by', options: wsPeople(c.docs || [], x => x.by), test: (x, v) => x.by === v }],
        sorts: [['at', 'Newest', (a, b) => String(b.at || '').localeCompare(String(a.at || ''))], ['n', 'Name', (a, b) => a.n.localeCompare(b.n)], ['mb', 'Size', (a, b) => (b.mb || 0) - (a.mb || 0)]],
        defaultSort: 'at',
        dense: true,
        row: x => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic('file', 16)}</span>`,
          title: `<b>${h(x.n)}</b>`,
          meta: [x.mb != null ? x.mb + ' MB' : '—', 'Uploaded by ' + nm(x.by), fmt(x.at)],
        }),
        empty: ['file', 'No documents yet.', '', ''],
      }),
      !ro && (isMem || mgr) ? `<form data-f="cdoc" class="row wrap ws-upform" novalidate><input type="hidden" name="c" value="${c.id}"><input type="file" name="f" class="input ws-file" multiple aria-label="Choose documents"><button class="btn btn-p btn-sm" type="submit">${ic('upload', 14)}Upload</button></form>` : '',
    );
  const prj = byId('projects', c.project);
  const acts = spaceEditBtn('circles', c) + (!isMem && !mgr && c.state === 'Active' ? joinBtn(c) : isMem ? L(ic('message', 16) + 'Open in Messages', 'messages', { c: c.id, k: 'circles' }, 'btn btn-s') : '');
  // the space header, its facts and the project journey live in Overview; other sections get a one-line context bar
  if (t.cur === 'overview') body = spaceHead('circles', c, h(c.purpose), null, acts) + roleNote('circles', c) + (prj ? stageTrack(prj, 'circles') : '');
  else body = wsBar('circles', c, acts) + body;
  return (
    crumbsHtml([['Circles', 'circles'], [h(c.name)]]) +
    (paused
      ? banner('warn', 'Paused for repair', h(c.pause.reason) + ' — members can read but not add records.')
      : '') +
    withSubnav(t, body)
  );
});
A.noop = () => {};
A.circleInvite = d => {
  const c = byId('circles', d.id);
  const m = c.members.find(m => m.pid === myId());
  m.status = d.v === 'Active' ? 'Active' : 'Removed';
  audit('Circle invitation ' + (d.v === 'Active' ? 'accepted' : 'declined'), c.id, '');
  if (d.v === 'Active') sysMsg(c, me().name + ' joined the Circle');
  if (d.v !== 'Active') {
    save();
    return go('circles');
  }
  ok();
};
A.editSession = d => {
  const c = byId('circles', d.c);
  const s = c.sessions.find(x => x.id === d.id);
  if (!s) return;
  A.newSession({ id: c.id, edit: s });
};
A.newSession = d => {
  clearF('ses');
  const c = byId('circles', d.id);
  const s0 = d.edit || null;
  if (s0) UI.form.ses = { title: s0.title, date: s0.date, agenda: s0.agenda, checkins: s0.checkins || '' };
  modal(
    s0 ? 'Edit session' : 'Record a session',
    () =>
      `<form data-f="ses" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="sid" value="${s0 ? s0.id : ''}">${fi('ses', 'title', 'Title', { req: true })}${fi('ses', 'date', 'Date', { type: 'date', req: true })}${fi('ses', 'agenda', 'Agenda', { type: 'textarea', rows: 2, req: true })}${fi('ses', 'checkins', 'Transcription & MOM', { type: 'textarea', rows: 6, ph: 'Transcription and minutes of the meeting: discussion, decisions, actions and owners' })}${banner('info', '', 'Everyone in this Circle can read recorded sessions.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">${s0 ? 'Save changes' : 'Save session'}</button></div></form>`,
  );
};
F.ses = d => {
  if (!validate('ses', d, { title: ['req'], date: ['req'], agenda: ['req'] })) return render();
  const c = byId('circles', d.c);
  const ex = d.sid && c.sessions.find(x => x.id === d.sid);
  if (ex) {
    Object.assign(ex, { title: d.title, date: d.date, agenda: d.agenda, checkins: d.checkins, edited: { at: now(), by: myId() } });
    sysMsg(c, 'Session updated: ' + d.title);
    audit('Session edited', c.id, d.title);
    UI.modal = null;
    clearF('ses');
    toast('Session updated.');
    return ok();
  }
  c.sessions.push({
    id: uid('se'),
    title: d.title,
    date: d.date,
    agenda: d.agenda,
    checkins: d.checkins,
    by: myId(),
    status: 'Recorded',
  });
  c.members
    .filter(m => m.status === 'Active')
    .forEach(m => notify(m.pid, 'Session recorded in ' + c.name, 'circle', { id: c.id, tab: 'sessions' }));
  sysMsg(c, 'Session recorded: ' + d.title);
  audit('Session recorded', c.id, d.title);
  UI.modal = null;
  clearF('ses');
  toast('Session recorded. You can start a Learning Harvest from it.');
  ok();
};
A.addRec = d => {
  clearF('rec');
  const k = d.k;
  const c = byId('circles', d.id);
  const mgr = isFac(c.id);
  const mem = c.members.filter(m => m.status === 'Active' && m.role !== 'Facilitator').map(m => [m.pid, P(m.pid).name]);
  if (k === 'commitments' && mgr) UI.form.rec = { owner: myId() };
  modal(
    {
      reflections: 'Add a reflection',
      commitments: mgr ? 'Assign a responsibility or add a commitment' : 'Add a commitment',
      concerns: 'Raise a concern',
      decisions: 'Record a decision',
    }[k],
    () =>
      `<form data-f="rec" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${d.id}"><input type="hidden" name="k" value="${k}">${fi('rec', 't', k === 'concerns' ? 'Describe the concern' : k === 'decisions' ? 'Decision' : k === 'commitments' ? 'Responsibility or commitment' : 'Reflection', { type: 'textarea', rows: 3, req: true })}${k === 'commitments' && mgr ? fi('rec', 'owner', 'Responsible member', { type: 'select', req: true, opts: [[myId(), P(myId()).name + ' (me)'], ...mem], help: 'Work you assign to someone else is reviewed by you before it counts as done.' }) : ''}${k === 'commitments' ? fi('rec', 'due', 'Due date', { type: 'date', req: true }) : ''}${k === 'decisions' ? banner('info', '', 'Use this for decisions the Circle agreed in a session. Important project or task-implementation decisions should go to a Circle vote.') : ''}${k === 'concerns' ? fi('rec', 'anon', 'Hide my name from other members (the facilitator still sees it)', { type: 'checkbox' }) + banner('info', '', 'Concerns go to the facilitator. Serious issues are escalated to the Incident/Safety Owner. Visibility is controlled.') : ''}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.rec = d => {
  const rules = { t: ['req'] };
  if (d.k === 'commitments') rules.due = ['req', 'date'];
  if (!validate('rec', d, rules)) return render();
  const c = byId('circles', d.c);
  if (d.k === 'decisions') {
    if (!isFac(c.id)) return deny('only the facilitator records Circle decisions');
    c.decisions.push({ t: d.t, at: today(), by: 'Recorded by ' + me().name });
    sysMsg(c, 'Decision recorded: ' + d.t.slice(0, 90));
    audit('Circle decision recorded', c.id, d.t);
    UI.modal = null;
    clearF('rec');
    return ok();
  }
  const o = { id: uid('x'), by: myId(), t: d.t, at: today() };
  if (d.k === 'commitments') {
    o.due = d.due;
    o.status = 'Open';
    if (d.owner && d.owner !== myId()) {
      o.by = d.owner;
      o.assignedBy = myId();
      notify(d.owner, 'Responsibility assigned to you in ' + c.name + ': ' + d.t, 'circle', { id: c.id, tab: 'records' });
    }
  }
  if (d.k === 'concerns') {
    o.status = 'Open';
    o.anon = d.anon === 'yes';
    notify(c.facilitator, 'Concern raised in ' + c.name, 'circle', { id: c.id, tab: 'records' });
  }
  c[d.k].push(o);
  audit(d.k.slice(0, -1) + ' added', c.id, '');
  UI.modal = null;
  clearF('rec');
  ok();
};
A.doneCommit = d => {
  const c = byId('circles', d.c);
  const x = c.commitments.find(x => x.id === d.id);
  if (x.assignedBy && !isFac(c.id)) {
    x.status = 'Awaiting review';
    x.note = '';
    notify(x.assignedBy, nm(x.by) + ' submitted work for review in ' + c.name + ': ' + x.t, 'circle', { id: c.id, tab: 'records' });
    toast('Submitted. The facilitator reviews it before it counts as done.');
  } else x.status = 'Done';
  audit('Commitment ' + x.status, c.id, d.id);
  ok();
};
A.commitReview = d => {
  const c = byId('circles', d.c);
  const x = c.commitments.find(x => x.id === d.id);
  if (d.v === 'ok') {
    x.status = 'Done';
    x.note = '';
    notify(x.by, 'Your work was accepted in ' + c.name + ': ' + x.t, 'circle', { id: c.id, tab: 'records' });
    audit('Work accepted', c.id, x.t);
    return ok();
  }
  clearF('crv');
  modal(
    'Request changes',
    () =>
      `<form data-f="crv" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="id" value="${x.id}">${dl([['Responsibility', h(x.t)], ['Responsible', nm(x.by)]])}${fi('crv', 'note', 'What needs to change?', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send back</button></div></form>`,
  );
};
F.crv = d => {
  if (!validate('crv', d, { note: ['req'] })) return render();
  const c = byId('circles', d.c);
  const x = c.commitments.find(x => x.id === d.id);
  x.status = 'Changes requested';
  x.note = d.note;
  notify(x.by, 'Changes requested on your work in ' + c.name + ': ' + d.note, 'circle', { id: c.id, tab: 'records' });
  audit('Work changes requested', c.id, x.t);
  UI.modal = null;
  clearF('crv');
  ok();
};
A.resolveConcern = d => {
  const c = byId('circles', d.c);
  const x = c.concerns.find(x => x.id === d.id);
  x.status = 'Resolved';
  if (x.ret) resolveReturn(x.ret, 'decided in ' + c.name);
  audit('Concern resolved', c.id, d.id);
  toast(x.ret ? 'Resolved. The originating space has been told it can move forward again.' : 'Concern resolved.');
  ok();
};
A.escalateConcern = d => {
  const c = byId('circles', d.c);
  const x = c.concerns.find(x => x.id === d.id);
  x.status = 'Escalated';
  const inc = {
    id: uid('in'),
    by: x.by,
    ctx: c.ctx,
    where: c.name,
    kind: 'Escalated concern',
    desc: x.t,
    state: 'Reported',
    owner: null,
    paused: false,
    conf: 'Restricted to Incident/Safety Owner',
    timeline: [{ at: today(), t: 'Escalated from Circle by ' + me().name }],
    decision: null,
  };
  S.incidents.push(inc);
  S.assign
    .filter(a => a.bundles.includes('Incident/Safety Owner'))
    .forEach(a => notify(a.pid, 'Concern escalated from ' + c.name, 'incidents', { id: inc.id }));
  audit('Concern escalated (F11)', inc.id, c.name);
  toast('Escalated to the Incident/Safety Owner.');
  ok();
};
// A vote is a question with exactly three choices — Yes, No and NTA — and a closing date and time.
// The creator writes what Yes and No mean; NTA (not applicable / abstain) is fixed. One eligible member = one vote.
function pollForm(c, base) {
  const f = 'poll';
  const v = UI.form.poll || {};
  const th = S.settings.voting.threshold;
  const row = (k, n, ph) => {
    const e = fe(f, n);
    return `<div class="vote-row"><label class="vote-k vote-k-${k.toLowerCase()}" for="${f}_${n}">${k}</label><div class="vote-in"><input id="${f}_${n}" class="input${e ? ' err' : ''}" name="${n}" value="${h(v[n] ?? '')}" placeholder="${h(ph)}" maxlength="120" aria-invalid="${!!e}" aria-describedby="vote-help">${e ? `<span class="emsg" role="alert">${ic('alert', 14)}${e}</span>` : ''}</div></div>`;
  };
  return `<form data-f="poll" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}">${base ? `<input type="hidden" name="base" value="${base.id}">` : ''}${fi(f, 'q', 'Question', { req: true, ph: 'What should the Circle decide?' })}${fi(f, 'desc', 'Description (optional)', { type: 'textarea', rows: 2, ph: 'Background, what is being decided, links' })}
  <fieldset class="vote-opts"><legend class="lbl">Voting options <span class="req">*</span></legend><p class="help" id="vote-help">Every vote has exactly these three options. Write what Yes and No mean for this question.</p>${row('Yes', 'yes', 'e.g. Approve the proposal')}${row('No', 'no', 'e.g. Do not approve')}<div class="vote-row"><span class="vote-k vote-k-nta" id="vote-nta">NTA</span><div class="vote-in"><p class="vote-fixed" aria-labelledby="vote-nta">${NTA_TEXT}</p><span class="help">Fixed. Counts as taking part, not as approval.</span></div></div></fieldset>
  ${fi(f, 'closes', 'Closes on (date and time)', { type: 'datetime-local', req: true })}${banner('info', 'Who votes', 'The project owner and active Circle members — one vote each; the project owner has no extra weight. Facilitators and mentors do not vote. Approved when Yes reaches ' + th + '% of all eligible members. A Yes/No tie returns the proposal to Shared for revision and a new vote.')}<div class="actions"><span class="cap">Created ${fmt(now().slice(0, 16))} by ${nm(myId())}</span><button class="btn btn-p" type="submit">${base ? 'Open round ' + ((base.round || 1) + 1) : 'Create vote'}</button></div></form>`;
}
A.newPoll = d => {
  clearF('poll');
  UI.form.poll = { yes: 'Approve', no: 'Do not approve' };
  const c = byId('circles', d.id);
  modal('Create a vote', () => pollForm(c));
};
F.poll = d => {
  const yes = (d.yes || '').trim(),
    no = (d.no || '').trim();
  const okv = validate('poll', d, {
    q: ['req'],
    yes: [['req', 'Write what a Yes vote means.']],
    no: [['req', 'Write what a No vote means.'], ['fn', { f: v => !v || v.trim().toLowerCase() !== yes.toLowerCase(), m: 'Yes and No must say different things.' }]],
    closes: ['req', ['fn', { f: v => !v || v > now().slice(0, 16), m: 'Choose a closing date and time in the future.' }]],
  });
  if (!okv) return render();
  const c = byId('circles', d.c);
  const base = d.base ? c.polls.find(x => x.id === d.base) : null;
  const p = {
    id: uid('po'),
    v: 2,
    q: d.q.trim(),
    desc: (d.desc || '').trim(),
    options: [yes, no, NTA_TEXT],
    closes: d.closes,
    created: now(),
    by: myId(),
    status: 'Open',
    votes: {},
    reviews: [],
    round: base ? (base.round || 1) + 1 : 1,
    ...(base ? { prev: base.id } : {}),
  };
  if (base) {
    base.status = 'Closed — Revised';
    base.next = p.id;
  }
  c.polls.unshift(p);
  c.members
    .filter(m => m.status === 'Active' && m.pid !== myId())
    .forEach(m => notify(m.pid, (eligibleVoter(c, m.pid) ? (base ? 'Re-vote (round ' + p.round + ') in ' : 'New vote in ') : 'New vote you can follow in ') + c.name + ': ' + p.q, 'circle', { id: c.id, tab: 'polls' }));
  sysMsg(c, me().name + (base ? ' opened round ' + p.round + ' of the vote: ' : ' created a vote: ') + p.q);
  audit(base ? 'Vote re-opened (new round)' : 'Vote created', c.id, p.q);
  UI.modal = null;
  clearF('poll');
  ok();
};
// After a vote closes, the project owner, Faculty/Steward or facilitator records a final review of the outcome.
const canFinalReview = c => {
  const pr = byId('projects', c.project);
  return c.owner === myId() || c.facilitator === myId() || sCan('circles', c, 'facilitate') || (role() === 'F' && (memberOf(c) || (pr && pr.stewards.includes(myId()))));
};
function pollReview(c, p) {
  const rv = p.reviews || [];
  const can_ = canFinalReview(c) && c.state === 'Active';
  return `<section class="pfr"><div class="pfr-h"><b>Final review</b><span class="cap">By the project owner, Faculty/Steward or facilitator</span></div>${rv.map(x => `<div class="pfr-i"><p class="ws-pre">${h(x.t)}</p><span class="cap">${nm(x.by)} · ${fmt(x.at.slice(0, 16))}</span></div>`).join('') || (can_ ? '' : '<p class="cap">No final review yet.</p>')}${can_ ? `<form data-f="pfr" class="col" style="gap:8px" novalidate><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="p" value="${p.id}">${fi('pfr', 't_' + p.id, rv.length ? 'Add to the review' : 'Review of the outcome', { type: 'textarea', rows: 3, ph: 'What was decided, how it will be acted on, anything to watch' })}<div><button class="btn btn-s btn-sm" type="submit">Save final review</button></div></form>` : ''}</section>`;
}
F.pfr = d => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  const t = (d['t_' + p.id] || '').trim();
  if (t.length < 5) {
    UI.err.pfr = { ['t_' + p.id]: 'Write the review (at least a short sentence).' };
    return render();
  }
  (p.reviews = p.reviews || []).push({ by: myId(), at: now(), t });
  sysMsg(c, 'Final review recorded for “' + p.q + '” by ' + me().name);
  audit('Poll final review', p.id, t.slice(0, 80));
  clearF('pfr');
  toast('Final review saved.');
  ok();
};
// The guard (guards.js → G.vote) checks eligibility, an open poll, a valid choice and one vote per round.
A.vote = d => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  p.votes[myId()] = +d.i;
  audit('Vote cast', p.id, VOTE_KEYS[+d.i]);
  const tl = tally(c, p);
  if (tl.voted === tl.eligible) {
    closePollCore({ c: c.id, p: p.id }, true);
    return;
  }
  toast('Vote recorded: ' + VOTE_KEYS[+d.i] + '. It is locked for this round.');
  ok();
};
const closePollCore = (d, auto, silent) => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  if (!p || p.status !== 'Open') return silent ? save() : ok();
  const tl = tally(c, p);
  const th = S.settings.voting.threshold;
  const counts = `${tl.per[YES]} Yes · ${tl.per[NO]} No · ${tl.per[NTA]} NTA · ${tl.eligible - tl.voted} did not vote — ${tl.eligible} eligible`;
  p.closedAt = now();
  p.tally = { yes: tl.per[YES], no: tl.per[NO], nta: tl.per[NTA], eligible: tl.eligible, threshold: th };
  if (tl.pass) {
    p.status = 'Closed — Approved';
    p.result = `Approved — Yes reached ${tl.pct}% of eligible members (threshold ${th}%). ${counts}.`;
    c.decisions.push({ t: p.q + ' → ' + p.options[YES], at: today(), by: `Vote — ${tl.per[YES]} of ${tl.eligible} eligible members said Yes (${tl.pct}%)` });
  } else if (tl.tie) {
    p.status = SHARED;
    p.result = `Tie — Yes and No both have ${tl.per[YES]}. The proposal returns to Shared for revision and a new vote. ${counts}.`;
  } else if (tl.voted) {
    p.status = 'Closed — Not approved';
    p.result = `Not approved — Yes reached ${tl.pct}% of eligible members; ${th}% (${tl.need} Yes) was needed. ${counts}.`;
  } else {
    p.status = 'Closed — No decision';
    p.result = `No decision — nobody voted. ${counts}.`;
  }
  const word = { pass: 'approved', tie: 'tie — returned to Shared for revision', fail: 'not approved', none: 'no decision' }[tl.outcome];
  c.members
    .filter(m => m.status === 'Active')
    .forEach(m => notify(m.pid, `Vote closed in ${c.name}: ${word}`, 'circle', { id: c.id, tab: 'polls' }));
  sysMsg(c, `Vote closed${auto === 'due' ? ' at its closing time' : ''}: ${p.q} — ${p.result}`);
  audit('Vote closed', p.id, p.status + (auto === 'due' ? ' · closing date reached' : ''));
  if (silent) return save();
  toast(auto ? 'All eligible members voted — vote closed: ' + word + '.' : 'Vote closed: ' + word + '.');
  ok();
};
A.closePoll = closePollCore;
// Re-vote: the owner or facilitator revises the proposal and opens a new round; everyone votes again.
A.repoll = d => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  clearF('poll');
  UI.form.poll = { q: p.q.replace(/ \(revised\)$/, '') + ' (revised)', desc: p.desc || '', yes: p.options[YES], no: p.options[NO] };
  modal(p.status === SHARED ? 'Revise and open a re-vote' : 'Modify and re-poll', () => pollForm(c, p));
};
A.memSet = d => {
  const kind = d.kind || 'circles';
  const c = byId(kind, d.c);
  const m = c.members[d.i];
  const was = m.status;
  m.status = d.v;
  const r = { circles: 'circle', ropes: 'rope', rooms: 'room' }[kind];
  if (d.v === 'Active') {
    m.since = today();
    if (kind === 'ropes' && ['Member', 'Project owner'].includes(normRole(m.role)))
      c.indicators[m.pid] = c.indicators[m.pid] || { pacing: 'On track', workload: '—', availability: '—', support: 'None reported', absence: 'None' };
  }
  sysMsg(c, P(m.pid).name + (d.v === 'Active' ? ' joined' : was === 'Requested' ? '’s request to join was declined' : ' is no longer a member'));
  notify(
    m.pid,
    d.v === 'Active' ? (was === 'Requested' ? 'Your request to join ' + c.name + ' was approved' : 'You joined ' + c.name) : was === 'Requested' ? 'Your request to join ' + c.name + ' was declined' : 'Your membership of ' + c.name + ' ended',
    d.v === 'Active' ? r : kind === 'circles' ? 'circles' : kind === 'ropes' ? 'ropeteams' : 'rooms',
    d.v === 'Active' ? { id: c.id } : {},
  );
  audit((was === 'Requested' ? 'Join request ' : 'Membership ') + (d.v === 'Active' && was === 'Requested' ? 'approved' : d.v), c.id, m.pid);
  ok();
};
A.memRole = (d, el) => {
  const kind = d.kind || 'circles';
  const c = byId(kind, d.c);
  const m = c.members[d.i];
  m.role = el.value;
  sysMsg(c, P(m.pid).name + ' is now ' + roleLabel(el.value, kind) + ' in this ' + SPACE_KIND_LABEL(kind));
  notify(m.pid, 'Your role in ' + c.name + ' is now ' + roleLabel(el.value, kind), { circles: 'circle', ropes: 'rope', rooms: 'room' }[kind], { id: c.id });
  audit('Space role assigned', c.id, P(m.pid).name + ' → ' + el.value);
  ok();
};
A.inviteMem = d => {
  const c = byId(d.kind, d.c);
  mselReset('invm', 'm');
  const cands = eligiblePeople(c.members.filter(m => ['Active', 'Invited'].includes(m.status)).map(m => m.pid), d.kind === 'ropes' ? ['P', 'F', 'M'] : ['P', 'F', 'M', 'C', 'O']);
  modal('Invite to ' + h(c.name), () =>
    `<form data-f="invm" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="kind" value="${d.kind}">${msel('invm', 'm', 'People', cands, [], { req: true, none: 'Everyone eligible is already a member or invited.' })}${fi('invm', 'role', 'Role in this ' + SPACE_KIND_LABEL(d.kind), { type: 'select', opts: [['', 'Based on each person’s platform role'], ...INVITE_ROLES.map(x => [x, roleLabel(x, d.kind)])], help: 'You can change individual roles later in Members.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
  );
};
F.invm = d => {
  const ids = [].concat(d.m || []);
  if (!ids.length) {
    UI.err.invm = { m: 'Choose at least one person.' };
    return render();
  }
  const c = byId(d.kind, d.c);
  const r = { circles: 'circle', ropes: 'rope', rooms: 'room' }[d.kind];
  ids.forEach(pid => {
    const rl = d.role || defaultSpaceRole(ctxRole(pid, c.ctx));
    const ex = memberRec(c, pid);
    if (ex) Object.assign(ex, { role: rl, status: 'Invited' });
    else c.members.push({ pid, role: rl, status: 'Invited', by: myId(), at: now() });
    notify(pid, 'You were invited to ' + c.name + ' as ' + roleLabel(rl, d.kind), r, { id: c.id });
  });
  sysMsg(c, me().name + ' invited ' + ids.map(p => P(p).name).join(', '));
  audit('Members invited', c.id, ids.join(','));
  UI.modal = null;
  UI.err.invm = {};
  mselReset('invm', 'm');
  toast(ids.length + ' invitation' + (ids.length > 1 ? 's' : '') + ' sent.');
  ok();
};
F.cdoc = (d, form) => {
  const c = byId('circles', d.c);
  const files = [...(form.querySelector('input[type=file]')?.files || [])];
  if (!files.length) {
    toast('Choose at least one document.', 'warn');
    return render();
  }
  const big = files.find(f => f.size > S.settings.maxFileMB * 1048576);
  if (big) {
    toast(big.name + ' is over ' + S.settings.maxFileMB + ' MB.', 'err');
    return render();
  }
  c.docs = c.docs || [];
  files.forEach(f => c.docs.push({ id: uid('dc'), n: f.name, mb: +(f.size / 1048576).toFixed(2), by: myId(), at: now() }));
  sysMsg(c, me().name + ' uploaded ' + files.length + ' document' + (files.length > 1 ? 's' : ''));
  audit('Circle documents uploaded', c.id, files.map(f => f.name).join(', '));
  toast('Uploaded.');
  ok();
};
A.circleState = d => {
  const c = byId('circles', d.id);
  const from = c.state;
  c.state = d.v;
  if (d.v === 'Active') c.pause = null;
  sysMsg(c, `Circle ${d.v === 'Paused/Repair' ? 'paused for repair' : from === 'Paused/Repair' && d.v === 'Active' ? 'resumed' : 'is now ' + d.v.toLowerCase()}`);
  c.members
    .filter(m => m.status === 'Active')
    .forEach(m => notify(m.pid, `${c.name}: ${from} → ${d.v}`, 'circle', { id: c.id }));
  audit('Circle state changed', c.id, from + ' → ' + d.v);
  ok();
};
A.pauseCircle = d => {
  clearF('pause');
  modal(
    'Pause and repair',
    () =>
      `<form data-f="pause" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${d.id}">${fi('pause', 'reason', 'Reason (members see a summary only)', { type: 'textarea', rows: 2, req: true })}${fi('pause', 'restart', 'Restart conditions', { req: true })}<div class="actions"><span></span><button class="btn btn-d" type="submit">Pause Circle</button></div></form>`,
  );
};
F.pause = d => {
  if (!validate('pause', d, { reason: ['req'], restart: ['req'] })) return render();
  const c = byId('circles', d.c);
  c.pause = { reason: d.reason, restart: d.restart, by: myId() };
  UI.modal = null;
  clearF('pause');
  A.circleState({ id: c.id, v: 'Paused/Repair' });
};
