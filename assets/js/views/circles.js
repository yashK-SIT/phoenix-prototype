// ---------- CIRCLES (E04, F05, D-03, D-04) ----------
const eligibleVoter = (c, pid) =>
  c.members.some(m => m.pid === pid && m.status === 'Active' && ['Project owner', 'Member'].includes(m.role));
function tally(c, p) {
  const V = S.settings.voting;
  const el = c.members.filter(m => m.status === 'Active' && ['Project owner', 'Member'].includes(m.role));
  const w = m => (m.role === 'Project owner' ? V.ownerWeight : V.memberWeight);
  const tot = el.reduce((a, m) => a + w(m), 0);
  const per = p.options.map((o, i) => el.filter(m => p.votes[m.pid] === i).reduce((a, m) => a + w(m), 0));
  const best = per.indexOf(Math.max(...per));
  return {
    tot,
    per,
    best,
    pct: tot ? Math.round((per[best] / tot) * 100) : 0,
    voted: el.filter(m => p.votes[m.pid] != null).length,
    eligible: el.length,
  };
}
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
  const all = S.circles.filter(inCtx);
  const sees = c => memberOf(c) || ['A', 'O'].includes(r) || c.facilitator === myId() || ['Requested', 'Invited'].includes((memberRec(c) || {}).status);
  const mine = all.filter(sees);
  const others = all.filter(c => !sees(c) && !['Archived/Closed'].includes(c.state));
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
      table(
        ['Circle', 'Purpose', 'Facilitator', 'Members', 'Your role', 'State', ''],
        mine.map(c => [
          `<b>${h(c.name)}</b>${unreadIn(c) && memberOf(c) ? ` <span class="mbadge">${unreadIn(c)}</span>` : ''}`,
          h(c.purpose),
          nm(c.facilitator),
          c.members.filter(m => m.status === 'Active').length,
          spaceRole('circles', c) ? h(spaceRole('circles', c)) : joinState(c) === 'pending' ? pill('Pending') : joinState(c) === 'invited' ? pill('Invited') : '<span class="cap">Oversight</span>',
          pill(c.state),
          joinState(c) === 'invited' ? B('Respond to invite', 'go', { r: 'circle', id: c.id }, 'btn-p btn-sm') : joinState(c) === 'pending' ? B('Withdraw request', 'joinWithdraw', { id: c.id, kind: 'circles' }) : L('Open', 'circle', { id: c.id }),
        ]),
        'You are not in a Circle yet. Ask to join one below, or wait for an invitation.',
      ),
    ) +
    (others.length && !['A', 'O'].includes(r)
      ? '<div class="section-gap"></div>' +
        card(
          'Other Circles in this programme',
          'You can see what each Circle is for. Content stays with its members until the facilitator or project owner approves your request.',
          table(
            ['Circle', 'Purpose', 'Facilitator', 'Visibility', 'State', ''],
            others.map(c => [
              `<b>${h(c.name)}</b>`,
              h(c.purpose),
              nm(c.facilitator),
              h(c.visibility),
              pill(c.state),
              (c.visibility === 'Programme' ? L('Open', 'circle', { id: c.id }) + ' ' : '') + (c.state === 'Active' ? joinBtn(c) : ''),
            ]),
          ),
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
  const pid0 = d.project || (ownP[0] && isP ? ownP[0].id : '');
  const pr = pid0 && byId('projects', pid0);
  UI.form.nc = {
    project: pid0 || '',
    name: pr ? pr.title + ' Circle' : '',
    purpose: pr ? 'Discuss and agree requirements for “' + pr.title + '”' : '',
    vis: 'Members only',
  };
  modal('Create a Circle', () => {
    const cur = byId('projects', fv('nc', 'project'));
    const exclude = [myId(), cur ? cur.owner : null];
    const def = cur ? (cur.owner !== myId() ? [cur.owner] : []) : [];
    const projOpts = (isP ? ownP : S.projects.filter(p => inCtx(p) && p.status === 'Accepted' && !p.circle && (role() === 'O' || stewardOf(p)))).map(p => [p.id, p.title]);
    return `<form data-f="nc" class="col" style="gap:14px" novalidate>${fi('nc', 'project', 'Project', { type: 'select', ph: isP ? 'Not linked to a project (needs facilitator approval)' : 'Not linked to a project', opts: projOpts, ch: 'ncProject', help: isP ? 'Linking your accepted project makes the Circle active straight away; a project steward joins as facilitator.' : '' })}${fi('nc', 'name', 'Name', { req: true })}${fi('nc', 'purpose', 'Purpose', { type: 'textarea', rows: 2, req: true })}${fi('nc', 'outcome', 'Expected outcome', { req: true })}${fi('nc', 'agreement', 'Working agreement', { type: 'select', opts: ['Circle working agreement v1'], req: true })}${fi('nc', 'vis', 'Visibility', { type: 'select', opts: ['Members only', 'Programme'], req: true, help: 'Members only: others see the name and purpose and can request to join. Programme: anyone in the programme can read it.' })}
 ${msel('nc', 'm', 'Invite members', eligiblePeople(exclude.filter(Boolean)), def, { help: 'Each person gets an invitation and a starting role you can change later in Members.' })}
 ${isP && !cur ? banner('info', '', 'Without a linked project, your Circle starts as Pending Review until a facilitator approves it.') : ''}<div class="actions"><span></span><button class="btn btn-p" type="submit">Create Circle</button></div></form>`;
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
F.nc = d => {
  if (!validate('nc', d, { name: ['req'], purpose: ['req'], outcome: ['req'] })) return render();
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
    visibility: d.vis,
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
  [].concat(d.m || []).forEach(pid => {
    if (c.members.some(m => m.pid === pid)) return;
    c.members.push({ pid, role: defaultSpaceRole(ctxRole(pid)), status: 'Invited' });
    notify(pid, 'You were invited to join the Circle “' + c.name + '”', 'circle', { id: c.id });
  });
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
  mselReset('nc', 'm');
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
      card('', '', dl([['Purpose', h(c.purpose)], ['Facilitator', nm(c.facilitator)], ['Requested', fmt(myM.at || '')]]) + `<div class="row" style="margin-top:12px">${B('Withdraw request', 'joinWithdraw', { id: c.id, kind: 'circles' })}</div>`)
    );
  if (!(myM && myM.status === 'Invited') && !isMem && !mgr && c.visibility !== 'Programme')
    return (
      head(h(c.name), h(c.purpose), pill(c.state), [['Circles', 'circles'], [h(c.name)]]) +
      card(
        'Members only',
        'Only members see this Circle’s chat, sessions and records.',
        dl([['Purpose', h(c.purpose)], ['Expected outcome', h(c.outcome || '—')], ['Facilitator', nm(c.facilitator)], ['Project owner', nm(c.owner)], ['Members', c.members.filter(m => m.status === 'Active').length]]) +
          (c.state === 'Active' ? `<div class="row" style="margin-top:14px">${joinBtn(c)}</div>` : ''),
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
        ])}<div class="row" style="margin-top:14px">${B('Decline', 'circleInvite', { id: c.id, v: 'Declined' })}${B('Accept and join', 'circleInvite', { id: c.id, v: 'Active' }, 'btn-p btn-sm')}</div>`,
      )
    );
  const paused = c.state === 'Paused/Repair';
  const ro = paused || ['Completed', 'Archived/Closed'].includes(c.state) || (!isMem && !mgr);
  const noRec = ro || !(canRec || mgr);
  const t = tabs(
    'ci_' + c.id,
    [
      ['chat', 'Chat', isMem && unreadIn(c) ? unreadIn(c) : null],
      ['sessions', 'Sessions', c.sessions.length],
      ['records', 'Reflections & commitments'],
      ['polls', 'Decisions & votes', c.polls.filter(p => p.status === 'Open').length],
      ['members', 'Members', c.members.length],
      ['about', 'About & lifecycle'],
    ],
    UI.p.tab,
  );
  let body = '';
  if (t.cur === 'chat')
    body =
      `<div class="row wrap chatbar"><span class="cap">Real-time chat for members of this Circle. ${isMem ? L('Open in Messages', 'messages', { c: c.id, k: 'circles' }) : ''}</span>${mgr && !ro ? B(ic('sparkle', 14) + 'Draft Circle summary with AI', 'circleSummary', { id: c.id }) : ''}</div>` +
      chatThread('circles', c, { embedded: true });
  if (t.cur === 'sessions')
    body = card(
      'Sessions',
      'Agenda, participation, check-ins and reflections.',
      table(
        ['Session', 'Date', 'Agenda', 'Attended', 'Check-ins', 'Status'],
        c.sessions.map(s => [
          h(s.title),
          fmt(s.date),
          h(s.agenda),
          s.attended.map(nm).join(', '),
          h(s.checkins || '—'),
          pill(s.status),
        ]),
      ),
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
    body = `<div class="g12">${card('Responsibilities and commitments', 'Facilitators assign responsibilities; members make commitments. Assigned work is reviewed before it counts as done.', c.commitments.map(x => lrow(x.assignedBy ? 'flag' : 'calendar', h(x.t), nm(x.by) + (x.assignedBy ? ' · assigned by ' + nm(x.assignedBy) : '') + ' · due ' + fmt(x.due) + dueTag(x.due, x.status === 'Done') + (x.note ? `<span class="cap" style="display:block">Changes requested: ${h(x.note)}</span>` : ''), commitRight(x))).join('') || '<p class="cap">None yet.</p>', noRec ? '' : B(ic('plus', 14) + (mgr ? 'Assign or add' : 'Add commitment'), 'addRec', { id: c.id, k: 'commitments' }), 'c6')}${card('Reflections', '', c.reflections.map(x => lrow('message', h(x.t), nm(x.by) + ' · ' + fmt(x.at))).join('') || '<p class="cap">None yet.</p>', noRec ? '' : B(ic('plus', 14) + 'Add', 'addRec', { id: c.id, k: 'reflections' }), 'c6')}${card('Concerns', 'Routed to the facilitator, and to the Incident/Safety Owner when escalated.', c.concerns.map(x => lrow(x.ret ? 'refresh' : 'alert', h(x.t), (x.anon ? 'Anonymous' : nm(x.by)) + ' · ' + fmt(x.at), pill(x.status) + (mgr && x.status === 'Open' ? B('Resolve', 'resolveConcern', { c: c.id, id: x.id }) + (x.ret ? '' : B('Escalate', 'escalateConcern', { c: c.id, id: x.id })) : ''))).join('') || '<p class="cap">None raised.</p>', isMem && !ro && canRec ? B(ic('plus', 14) + 'Raise concern', 'addRec', { id: c.id, k: 'concerns' }) : '', 'c6')}${card('Decisions', 'Decision history. An approved decision is what moves the project forward.', c.decisions.map(x => lrow('check', h(x.t), fmt(x.at) + ' · ' + h(x.by))).join('') || '<p class="cap">None yet. Decide by weighted vote, or record a facilitator decision.</p>', mgr && !ro ? B(ic('plus', 14) + 'Record decision', 'addRec', { id: c.id, k: 'decisions' }) : '', 'c6')}</div>`;
  }
  if (t.cur === 'polls')
    body = card(
      'Weighted votes',
      'Project owner counts twice a regular member. Approved when approving weight ÷ total eligible weight ≥ ' +
        S.settings.voting.threshold +
        '%. ' +
        assumed('OI-01 relative-weight interpretation'),
      c.polls
        .map(p => {
          const tl = tally(c, p);
          const mv = p.votes[myId()];
          const canV = eligibleVoter(c, myId()) && p.status === 'Open' && !ro;
          return `<div class="card" style="margin-bottom:12px;padding:18px"><div class="row wrap" style="justify-content:space-between"><b>${h(p.q)}</b>${pill(p.status)}</div><p class="cap">Closes ${fmt(p.closes)} · ${tl.voted} of ${tl.eligible} eligible voters · total eligible weight ${tl.tot}</p>
  <div class="col" style="gap:8px;margin-top:12px">${p.options.map((o, i) => `<div class="row wrap" style="gap:10px"><div style="flex:1;min-width:200px"><div class="row" style="justify-content:space-between"><span>${h(o)}</span><span class="cap">${tl.per[i]} weight · ${tl.tot ? Math.round((tl.per[i] / tl.tot) * 100) : 0}%</span></div><div class="bar"><span style="width:${tl.tot ? (tl.per[i] / tl.tot) * 100 : 0}%"></span></div></div>${canV ? B(mv === i ? 'Your vote' : 'Vote', 'vote', { c: c.id, p: p.id, i }, mv === i ? 'btn-p btn-sm' : 'btn-s btn-sm') : ''}</div>`).join('')}</div>
  ${p.result ? `<p class="cap" style="margin-top:8px">Result: ${h(p.result)}</p>` : ''}${p.status === 'Open' && pollMgr ? `<div class="row" style="margin-top:12px">${B('Close poll and record result', 'closePoll', { c: c.id, p: p.id }, 'btn-p btn-sm')}</div>` : ''}${p.status === 'Closed — Not approved' && pollMgr ? `<div class="row" style="margin-top:12px">${B('Modify and re-poll', 'repoll', { c: c.id, p: p.id })}</div>` : ''}</div>`;
        })
        .join('') ||
        empty(
          'vote',
          'No polls yet',
          'The project owner or an authorised member can put an important decision to a vote.',
        ),
      !ro && pollMgr ? B(ic('plus', 14) + 'New poll', 'newPoll', { id: c.id }, 'btn-p btn-sm') : '',
    );
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
                memMgr && !ro && !fixed && m.status !== 'Removed' ? roleSelect('memRole', { c: c.id, i, kind: 'circles' }, sr, 'Role of ' + P(m.pid).name) : h(sr),
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
    body = `<div class="g12">${c.aiSummary && c.aiSummary.status === 'Draft' && mgr ? `<div class="c12">${card('AI-drafted Circle summary', 'Class B workflow draft — review before it is shared with members.', `<p class="muted">${h(c.aiSummary.text)}</p><div style="margin:10px 0">${aiTag('AI draft · sources: chat, sessions, decisions')}</div><div class="row">${B('Reject', 'summaryDecide', { id: c.id, v: 'Rejected' })}${B('Approve and share', 'summaryDecide', { id: c.id, v: 'Approved' }, 'btn-p btn-sm')}</div>`)}</div>` : ''}${card('About', '', dl([['Purpose', h(c.purpose)], ['Expected outcome', h(c.outcome)], ['Owner', nm(c.owner)], ['Facilitator', nm(c.facilitator)], ['Agreement', h(c.agreement)], ['Visibility', h(c.visibility)], ['Project', pr ? L(h(pr.title), 'project', { id: pr.id }) : '—'], ['State', pill(c.state)], paused && ['Pause reason', h(c.pause.reason) + ' · responsible: ' + nm(c.pause.who) + ' · restart when: ' + h(c.pause.restart)]]), '', 'c7')}
  ${card('Lifecycle', 'Draft → Pending Review → Active → Paused/Repair → Completed → Archived/Closed', `<div class="col" style="gap:8px">${mgr ? [c.state === 'Pending Review' && B('Approve Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm'), c.state === 'Active' && B(ic('pause', 14) + 'Pause and repair', 'pauseCircle', { id: c.id }), paused && B('Resume Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm'), c.state === 'Active' && B('Complete Circle', 'completeCircle', { id: c.id, ok: hvDone ? 1 : 0 }), c.state === 'Completed' && CB('Archive', 'circleState', { id: c.id, v: 'Archived/Closed' }, 'Archive this Circle? It becomes read-only and leaves active lists. Retention and visibility rules apply.')].filter(Boolean).join('') : '<p class="cap">Managed by the facilitator.</p>'}</div>`, '', 'c5')}
  ${pr ? `<div class="c7 col" style="gap:24px">${stageGate(pr, 'circles', c)}${reportsCard(pr, 'circles', c)}</div>` : ''}
  ${card('Move toward action', 'Create or link — the Circle always stays intact.', `<div class="col" style="gap:8px">${!ro && sCan('circles', c, 'card') && can('opportunities', 'CM') ? B(ic('megaphone', 14) + 'Create Opportunity Card from this Circle', 'go', { r: 'newcard', from: c.id }) : ''}${mgr && !ro && !pr ? B(ic('room', 14) + 'Create or link ' + WL(), 'newRoom', { origin: 'Circle decision', oid: c.id }) : ''}${!ro && (sCan('circles', c, 'harvest') || mgr) ? B(ic('sparkle', 14) + 'Start a Learning Harvest', 'newHarvest', { scope: c.id }) : ''}</div>`, '', pr ? 'c5' : 'c12')}
  ${card('Opportunity Cards from this Circle', 'Cards created here link back to this Circle. Audience is set by each card’s creator.', fromCards.map(k => lrow('megaphone', h(k.title), h(k.kind) + ' · ' + h(k.vis === 'Circle members' ? 'This Circle’s members' : k.vis) + ' · ' + nm(k.owner), pill(k.status) + ' ' + L('Open', 'card', { id: k.id }))).join('') || '<p class="cap">None yet.</p>', '', 'c12')}
  ${returnsCard(c) ? `<div class="c12">${returnsCard(c)}</div>` : ''}</div>`;
  }
  const prj = byId('projects', c.project);
  return (
    spaceHead('circles', c, h(c.purpose), [['Circles', 'circles'], [h(c.name)]], !isMem && !mgr && c.state === 'Active' ? joinBtn(c) : isMem ? L(ic('message', 16) + 'Open in Messages', 'messages', { c: c.id, k: 'circles' }, 'btn btn-s') : '') +
    roleNote('circles', c) +
    (paused
      ? banner('warn', 'Paused for repair', h(c.pause.reason) + ' — members can read but not add records.')
      : '') +
    (prj ? stageTrack(prj, 'circles') : '') +
    t.html +
    body
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
A.newSession = d => {
  clearF('ses');
  const c = byId('circles', d.id);
  modal(
    'Record a session',
    () =>
      `<form data-f="ses" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}">${fi('ses', 'title', 'Title', { req: true })}${fi('ses', 'date', 'Date', { type: 'date', req: true })}${fi('ses', 'agenda', 'Agenda', { type: 'textarea', rows: 2, req: true })}<fieldset style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:8px">Participation</legend><div class="g2">${c.members
        .filter(m => m.status === 'Active')
        .map(
          m =>
            `<label class="row"><input class="chk" type="checkbox" name="att" value="${m.pid}" checked>${nm(m.pid)}</label>`,
        )
        .join(
          '',
        )}</div></fieldset>${fi('ses', 'checkins', 'Check-ins and reflections', { type: 'textarea', rows: 3 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save session</button></div></form>`,
  );
};
F.ses = d => {
  if (!validate('ses', d, { title: ['req'], date: ['req'], agenda: ['req'] })) return render();
  const c = byId('circles', d.c);
  c.sessions.push({
    id: uid('se'),
    title: d.title,
    date: d.date,
    agenda: d.agenda,
    attended: [].concat(d.att || []),
    checkins: d.checkins,
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
      `<form data-f="rec" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${d.id}"><input type="hidden" name="k" value="${k}">${fi('rec', 't', k === 'concerns' ? 'Describe the concern' : k === 'decisions' ? 'Decision' : k === 'commitments' ? 'Responsibility or commitment' : 'Reflection', { type: 'textarea', rows: 3, req: true })}${k === 'commitments' && mgr ? fi('rec', 'owner', 'Responsible member', { type: 'select', req: true, opts: [[myId(), P(myId()).name + ' (me)'], ...mem], help: 'Work you assign to someone else is reviewed by you before it counts as done.' }) : ''}${k === 'commitments' ? fi('rec', 'due', 'Due date', { type: 'date', req: true }) : ''}${k === 'decisions' ? banner('info', '', 'Use this for decisions the Circle agreed in a session. Important project or task-implementation decisions should go to a weighted vote.') : ''}${k === 'concerns' ? fi('rec', 'anon', 'Hide my name from other members (the facilitator still sees it)', { type: 'checkbox' }) + banner('info', '', 'Concerns go to the facilitator. Serious issues are escalated to the Incident/Safety Owner. Visibility is controlled.') : ''}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
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
A.newPoll = d => {
  clearF('poll');
  modal(
    'New weighted poll',
    () =>
      `<form data-f="poll" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${d.id}">${fi('poll', 'q', 'Question', { req: true })}${fi('poll', 'opts', 'Options (one per line, at least 2)', { type: 'textarea', rows: 3, req: true, value: 'Approve\nDo not approve' })}${fi('poll', 'closes', 'Closing date', { type: 'date', req: true })}${banner('info', 'Eligibility', 'Project owner and regular members vote. Facilitators and mentors do not. Abstentions count as not approving. ' + assumed('OI-01'))}<div class="actions"><span></span><button class="btn btn-p" type="submit">Open poll</button></div></form>`,
  );
};
F.poll = d => {
  if (
    !validate('poll', d, {
      q: ['req'],
      opts: [
        'req',
        ['fn', { f: v => v.split('\n').filter(x => x.trim()).length >= 2, m: 'Enter at least two options.' }],
      ],
      closes: ['req', 'date'],
    })
  )
    return render();
  const c = byId('circles', d.c);
  const p = {
    id: uid('po'),
    q: d.q,
    options: d.opts
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean),
    closes: d.closes,
    status: 'Open',
    votes: {},
  };
  c.polls.unshift(p);
  c.members
    .filter(m => eligibleVoter(c, m.pid))
    .forEach(m => notify(m.pid, 'New vote in ' + c.name + ': ' + p.q, 'circle', { id: c.id, tab: 'polls' }));
  sysMsg(c, me().name + ' opened a vote: ' + p.q);
  audit('Poll opened', c.id, p.q);
  UI.modal = null;
  clearF('poll');
  ok();
};
A.vote = d => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  if (!eligibleVoter(c, myId())) return deny('not an eligible voter');
  if (c.state !== 'Active') return deny('Circle is not active');
  p.votes[myId()] = +d.i;
  audit('Vote cast', p.id, '');
  const tl = tally(c, p);
  if (tl.voted === tl.eligible) {
    closePollCore({ c: c.id, p: p.id }, true);
    return;
  }
  toast('Vote recorded.');
  ok();
};
const closePollCore = (d, auto, silent) => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  const tl = tally(c, p);
  const pass = tl.pct >= S.settings.voting.threshold;
  p.status = pass ? 'Closed — Approved' : 'Closed — Not approved';
  p.result = `${p.options[tl.best]} · ${tl.pct}% of eligible weight`;
  if (pass)
    c.decisions.push({ t: p.q + ' → ' + p.options[tl.best], at: today(), by: 'Poll — approved ' + tl.pct + '%' });
  c.members
    .filter(m => m.status === 'Active')
    .forEach(m =>
      notify(m.pid, `Poll closed in ${c.name}: ${pass ? 'approved' : 'not approved'}`, 'circle', {
        id: c.id,
        tab: 'polls',
      }),
    );
  sysMsg(c, `Vote closed${auto === 'due' ? ' at its closing date' : ''}: ${p.q} — ${pass ? 'approved' : 'not approved'} (${tl.pct}% of eligible weight)`);
  audit('Poll closed', p.id, p.status + (auto === 'due' ? ' · closing date reached' : ''));
  if (silent) return save();
  toast(auto ? 'All eligible members voted — poll closed. ' + p.status : p.status);
  ok();
};
A.closePoll = closePollCore;
A.repoll = d => {
  const c = byId('circles', d.c);
  const p = c.polls.find(x => x.id === d.p);
  UI.form.poll = { q: p.q + ' (revised)', opts: p.options.join('\n') };
  modal(
    'Modify and re-poll',
    () =>
      `<form data-f="poll" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}">${fi('poll', 'q', 'Question', { req: true })}${fi('poll', 'opts', 'Options', { type: 'textarea', rows: 3, req: true })}${fi('poll', 'closes', 'Closing date', { type: 'date', req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Open new poll</button></div></form>`,
  );
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
  sysMsg(c, P(m.pid).name + ' is now ' + el.value + ' in this ' + SPACE_KIND_LABEL(kind));
  notify(m.pid, 'Your role in ' + c.name + ' is now ' + el.value, { circles: 'circle', ropes: 'rope', rooms: 'room' }[kind], { id: c.id });
  audit('Space role assigned', c.id, P(m.pid).name + ' → ' + el.value);
  ok();
};
A.inviteMem = d => {
  const c = byId(d.kind, d.c);
  mselReset('invm', 'm');
  const cands = eligiblePeople(c.members.filter(m => ['Active', 'Invited'].includes(m.status)).map(m => m.pid), d.kind === 'ropes' ? ['P', 'F', 'M'] : ['P', 'F', 'M', 'C', 'O']);
  modal('Invite to ' + h(c.name), () =>
    `<form data-f="invm" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="kind" value="${d.kind}">${msel('invm', 'm', 'People', cands, [], { req: true, none: 'Everyone eligible is already a member or invited.' })}${fi('invm', 'role', 'Role in this ' + SPACE_KIND_LABEL(d.kind), { type: 'select', opts: [['', 'Based on each person’s platform role'], ...SPACE_ROLES.filter(x => x !== 'Project owner').map(x => [x, x])], help: 'You can change individual roles later in Members.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
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
    else c.members.push({ pid, role: rl, status: 'Invited' });
    notify(pid, 'You were invited to ' + c.name + ' as ' + rl, r, { id: c.id });
  });
  sysMsg(c, me().name + ' invited ' + ids.map(p => P(p).name).join(', '));
  audit('Members invited', c.id, ids.join(','));
  UI.modal = null;
  UI.err.invm = {};
  mselReset('invm', 'm');
  toast(ids.length + ' invitation' + (ids.length > 1 ? 's' : '') + ' sent.');
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
      `<form data-f="pause" class="col" style="gap:14px" novalidate><input type="hidden" name="c" value="${d.id}">${fi('pause', 'reason', 'Reason (members see a summary only)', { type: 'textarea', rows: 2, req: true })}${fi(
        'pause',
        'who',
        'Responsible human',
        {
          type: 'select',
          req: true,
          opts: byId('circles', d.id)
            .members.filter(m => m.status === 'Active')
            .map(m => [m.pid, P(m.pid).name]),
        },
      )}${fi('pause', 'restart', 'Restart conditions', { req: true })}<div class="actions"><span></span><button class="btn btn-d" type="submit">Pause Circle</button></div></form>`,
  );
};
F.pause = d => {
  if (!validate('pause', d, { reason: ['req'], restart: ['req'] })) return render();
  const c = byId('circles', d.c);
  c.pause = { reason: d.reason, who: d.who, restart: d.restart };
  UI.modal = null;
  clearF('pause');
  A.circleState({ id: c.id, v: 'Paused/Repair' });
};
A.completeCircle = d => {
  if (d.ok !== '1') {
    toast('Complete a Learning Harvest for this Circle first (F05 exit state).', 'warn');
    return A.newHarvest({ scope: d.id });
  }
  A.circleState({ id: d.id, v: 'Completed' });
};
