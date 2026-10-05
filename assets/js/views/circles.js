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
route('circles', 'circles', () => {
  const r = role();
  const list = S.circles.filter(
    c =>
      inCtx(c) &&
      (memberRec(c) ||
        r === 'A' ||
        r === 'O' ||
        (r === 'F' && c.facilitator === myId()) ||
        c.visibility === 'Programme'),
  );
  return (
    head(
      'Circles',
      'Collaboration spaces for shared learning, sensemaking and decisions.',
      ['F', 'O'].includes(r) || r === 'P' ? B(ic('plus', 16) + 'Create Circle', 'newCircle', {}, 'btn-p') : '',
    ) +
    table(
      ['Circle', 'Purpose', 'Facilitator', 'Members', 'State', ''],
      list.map(c => [
        `<b>${h(c.name)}</b>`,
        h(c.purpose),
        nm(c.facilitator),
        c.members.length,
        pill(c.state),
        (() => {
          const m = memberRec(c);
          if (m && m.status === 'Requested') return pill('Pending');
          if (m && m.status === 'Invited')
            return B('Respond to invite', 'go', { r: 'circle', id: c.id }, 'btn-p btn-sm');
          return memberOf(c) || r === 'F' || r === 'A' || r === 'O' || c.visibility === 'Programme'
            ? L('Open', 'circle', { id: c.id })
            : B('Request to join', 'joinCircle', { id: c.id });
        })(),
      ]),
    )
  );
});
A.joinCircle = d => {
  const c = byId('circles', d.id);
  if (memberRec(c)) return;
  c.members.push({ pid: myId(), role: 'Member', status: 'Requested' });
  notify(c.facilitator, me().name + ' asked to join ' + c.name, 'circle', { id: c.id, tab: 'members' });
  audit('Circle join requested', c.id, '');
  toast('Request sent to the facilitator.');
  ok();
};
A.newCircle = d => {
  clearF('nc');
  const pr = d.project && byId('projects', d.project);
  UI.form.nc = {
    name: pr ? pr.title + ' Circle' : '',
    purpose: pr ? 'Discuss and agree requirements for “' + pr.title + '”' : '',
    vis: 'Members only',
  };
  modal(
    'Create a Circle',
    () => `<form data-f="nc" class="col" style="gap:14px" novalidate><input type="hidden" name="project" value="${d.project || ''}">${fi('nc', 'name', 'Name', { req: true })}${fi('nc', 'purpose', 'Purpose', { type: 'textarea', rows: 2, req: true })}${fi('nc', 'outcome', 'Expected outcome', { req: true })}${fi('nc', 'agreement', 'Working agreement', { type: 'select', opts: ['Circle working agreement v1'], req: true })}${fi('nc', 'vis', 'Visibility', { type: 'select', opts: ['Members only', 'Programme'], req: true })}
 <fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:8px">Invite members</legend><div class="g2">${S.assign
   .filter(a => a.ctx === ctxId() && a.status === 'Active' && ['P', 'M', 'C'].includes(a.role) && a.pid !== myId())
   .map(
     a =>
       `<label class="row"><input class="chk" type="checkbox" name="m" value="${a.pid}" ${pr && a.pid === pr.owner ? 'checked' : ''}>${nm(a.pid)} <span class="cap">${ROLE[a.role]}</span></label>`,
   )
   .join('')}</div></fieldset>
 ${role() === 'P' ? banner('info', '', 'As a participant group owner, your Circle starts as Pending Review until a facilitator approves it.') : ''}<div class="actions"><span></span><button class="btn btn-p" type="submit">Create Circle</button></div></form>`,
  );
};
F.nc = d => {
  if (!validate('nc', d, { name: ['req'], purpose: ['req'], outcome: ['req'] })) return render();
  const pr = d.project && byId('projects', d.project);
  const isP = role() === 'P';
  const fac = isP ? (S.assign.find(a => a.ctx === ctxId() && a.role === 'F') || {}).pid : myId();
  const c = {
    id: uid('ci'),
    ctx: ctxId(),
    name: d.name,
    purpose: d.purpose,
    outcome: d.outcome,
    owner: pr ? pr.owner : myId(),
    facilitator: fac,
    project: pr?.id || null,
    visibility: d.vis,
    state: isP ? 'Pending Review' : 'Active',
    agreement: d.agreement,
    members: [{ pid: pr ? pr.owner : myId(), role: pr || isP ? 'Project owner' : 'Facilitator', status: 'Active' }],
    chat: [],
    sessions: [],
    reflections: [],
    commitments: [],
    concerns: [],
    decisions: [],
    polls: [],
    pause: null,
  };
  if (!isP && !c.members.some(m => m.pid === myId()))
    c.members.push({ pid: myId(), role: 'Facilitator', status: 'Active' });
  [].concat(d.m || []).forEach(pid => {
    if (!c.members.some(m => m.pid === pid)) {
      const rr = S.assign.find(a => a.pid === pid && a.ctx === ctxId()).role;
      c.members.push({
        pid,
        role: rr === 'M' ? 'Mentor (invited)' : rr === 'C' ? 'Partner (invited)' : 'Member',
        status: 'Invited',
      });
      notify(pid, 'You were invited to join the Circle “' + c.name + '”', 'circle', { id: c.id });
    }
  });
  S.circles.push(c);
  if (pr) {
    pr.circle = c.id;
    pr.stage = 'Circle';
    pr.history.push({ at: today(), t: 'Circle created' });
    notify(pr.owner, 'Circle created for your project', 'circle', { id: c.id });
  }
  if (isP) notify(fac, 'Circle awaiting your review: ' + c.name, 'circle', { id: c.id });
  audit('Circle created', c.id, c.state);
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
  const mgr = (r === 'F' && c.facilitator === myId()) || (r === 'O' && inCtx(c));
  const myM = memberRec(c);
  if (myM && myM.status === 'Requested')
    return (
      head(h(c.name), h(c.purpose), pill('Pending'), [['Circles', 'circles'], [h(c.name)]]) +
      banner(
        'info',
        'Your request to join is with the facilitator',
        nm(c.facilitator) + ' will approve or decline it. You will be notified.',
      )
    );
  if (!(myM && myM.status === 'Invited') && !isMem && !mgr && r !== 'A' && !(c.visibility === 'Programme'))
    return deniedView('circles');
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
    body = `<div class="g12">${card('Responsibilities and commitments', 'Facilitators assign responsibilities; members make commitments. Assigned work is reviewed before it counts as done.', c.commitments.map(x => lrow(x.assignedBy ? 'flag' : 'calendar', h(x.t), nm(x.by) + (x.assignedBy ? ' · assigned by ' + nm(x.assignedBy) : '') + ' · due ' + fmt(x.due) + dueTag(x.due, x.status === 'Done') + (x.note ? `<span class="cap" style="display:block">Changes requested: ${h(x.note)}</span>` : ''), commitRight(x))).join('') || '<p class="cap">None yet.</p>', ro ? '' : B(ic('plus', 14) + (mgr ? 'Assign or add' : 'Add commitment'), 'addRec', { id: c.id, k: 'commitments' }), 'c6')}${card('Reflections', '', c.reflections.map(x => lrow('message', h(x.t), nm(x.by) + ' · ' + fmt(x.at))).join('') || '<p class="cap">None yet.</p>', ro ? '' : B(ic('plus', 14) + 'Add', 'addRec', { id: c.id, k: 'reflections' }), 'c6')}${card('Concerns', 'Routed to the facilitator, and to the Incident/Safety Owner when escalated.', c.concerns.map(x => lrow(x.ret ? 'refresh' : 'alert', h(x.t), (x.anon ? 'Anonymous' : nm(x.by)) + ' · ' + fmt(x.at), pill(x.status) + (mgr && x.status === 'Open' ? B('Resolve', 'resolveConcern', { c: c.id, id: x.id }) + (x.ret ? '' : B('Escalate', 'escalateConcern', { c: c.id, id: x.id })) : ''))).join('') || '<p class="cap">None raised.</p>', isMem && !ro ? B(ic('plus', 14) + 'Raise concern', 'addRec', { id: c.id, k: 'concerns' }) : '', 'c6')}${card('Decisions', 'Decision history. An approved decision is what moves the project forward.', c.decisions.map(x => lrow('check', h(x.t), fmt(x.at) + ' · ' + h(x.by))).join('') || '<p class="cap">None yet. Decide by weighted vote, or record a facilitator decision.</p>', mgr && !ro ? B(ic('plus', 14) + 'Record decision', 'addRec', { id: c.id, k: 'decisions' }) : '', 'c6')}</div>`;
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
  ${p.result ? `<p class="cap" style="margin-top:8px">Result: ${h(p.result)}</p>` : ''}${p.status === 'Open' && (mgr || c.owner === myId()) ? `<div class="row" style="margin-top:12px">${B('Close poll and record result', 'closePoll', { c: c.id, p: p.id }, 'btn-p btn-sm')}</div>` : ''}${p.status === 'Closed — Not approved' && (mgr || c.owner === myId()) ? `<div class="row" style="margin-top:12px">${B('Modify and re-poll', 'repoll', { c: c.id, p: p.id })}</div>` : ''}</div>`;
        })
        .join('') ||
        empty(
          'vote',
          'No polls yet',
          'The project owner or an authorised member can put an important decision to a vote.',
        ),
      !ro && (mgr || c.owner === myId()) ? B(ic('plus', 14) + 'New poll', 'newPoll', { id: c.id }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'members')
    body = card(
      'Members',
      'Only facilitators and authorised roles can change membership.',
      table(
        ['Member', 'Role', 'Status', ''],
        c.members.map((m, i) => [
          `<a href="#" class="lnk" data-a="viewProfile" data-pid="${m.pid}">${nm(m.pid)}</a>`,
          h(m.role),
          pill(m.status === 'Requested' ? 'Pending' : m.status),
          mgr
            ? m.status === 'Requested'
              ? B('Approve', 'memSet', { c: c.id, i, v: 'Active' }, 'btn-p btn-sm') +
                B('Decline', 'memSet', { c: c.id, i, v: 'Removed' })
              : m.pid !== c.facilitator
                ? `<select class="input" style="min-height:36px;font-size:12px;width:auto" data-ch="memRole" data-c="${c.id}" data-i="${i}" aria-label="Role">${['Member', 'Project owner', 'Mentor (invited)', 'Partner (invited)', 'Observer'].map(x => `<option ${x === m.role ? 'selected' : ''}>${x}</option>`).join('')}</select> ` +
                  CB('Remove', 'memSet', { c: c.id, i, v: 'Removed' }, 'Remove ' + P(m.pid).name + ' from this Circle? They lose access to its chat and records.')
                : ''
            : '',
        ]),
      ),
      mgr && !ro ? B(ic('plus', 14) + 'Invite', 'inviteMem', { c: c.id, kind: 'circles' }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'about') {
    const pr = byId('projects', c.project);
    const hvDone = S.harvests.some(x => x.scope === c.id && ['Approved', 'Released'].includes(x.state));
    body = `<div class="g12">${c.aiSummary && c.aiSummary.status === 'Draft' && mgr ? `<div class="c12">${card('AI-drafted Circle summary', 'Class B workflow draft — review before it is shared with members.', `<p class="muted">${h(c.aiSummary.text)}</p><div style="margin:10px 0">${aiTag('AI draft · sources: chat, sessions, decisions')}</div><div class="row">${B('Reject', 'summaryDecide', { id: c.id, v: 'Rejected' })}${B('Approve and share', 'summaryDecide', { id: c.id, v: 'Approved' }, 'btn-p btn-sm')}</div>`)}</div>` : ''}${card('About', '', dl([['Purpose', h(c.purpose)], ['Expected outcome', h(c.outcome)], ['Owner', nm(c.owner)], ['Facilitator', nm(c.facilitator)], ['Agreement', h(c.agreement)], ['Visibility', h(c.visibility)], ['Project', pr ? L(h(pr.title), 'project', { id: pr.id }) : '—'], ['State', pill(c.state)], paused && ['Pause reason', h(c.pause.reason) + ' · responsible: ' + nm(c.pause.who) + ' · restart when: ' + h(c.pause.restart)]]), '', 'c7')}
  ${card('Lifecycle', 'Draft → Pending Review → Active → Paused/Repair → Completed → Archived/Closed', `<div class="col" style="gap:8px">${mgr ? [c.state === 'Pending Review' && B('Approve Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm'), c.state === 'Active' && B(ic('pause', 14) + 'Pause and repair', 'pauseCircle', { id: c.id }), paused && B('Resume Circle', 'circleState', { id: c.id, v: 'Active' }, 'btn-p btn-sm'), c.state === 'Active' && B('Complete Circle', 'completeCircle', { id: c.id, ok: hvDone ? 1 : 0 }), c.state === 'Completed' && CB('Archive', 'circleState', { id: c.id, v: 'Archived/Closed' }, 'Archive this Circle? It becomes read-only and leaves active lists. Retention and visibility rules apply.')].filter(Boolean).join('') : '<p class="cap">Managed by the facilitator.</p>'}</div>`, '', 'c5')}
  ${pr ? `<div class="c7 col" style="gap:24px">${stageGate(pr, 'circles', c)}${reportsCard(pr, 'circles', c)}</div>` : ''}
  ${card('Move toward action', 'Create or link — the Circle always stays intact.', `<div class="col" style="gap:8px">${!ro ? B(ic('megaphone', 14) + 'Create Opportunity Card from this Circle', 'go', { r: 'newcard', from: c.id }) : ''}${mgr && !ro && !pr ? B(ic('room', 14) + 'Create or link ' + WL(), 'newRoom', { origin: 'Circle decision', oid: c.id }) : ''}${!ro ? B(ic('sparkle', 14) + 'Start a Learning Harvest', 'newHarvest', { scope: c.id }) : ''}</div>`, '', pr ? 'c5' : 'c12')}
  ${returnsCard(c) ? `<div class="c12">${returnsCard(c)}</div>` : ''}</div>`;
  }
  const prj = byId('projects', c.project);
  return (
    head(h(c.name), h(c.purpose), pill(c.state), [['Circles', 'circles'], [h(c.name)]]) +
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
  const c = byId(d.kind || 'circles', d.c);
  const m = c.members[d.i];
  m.status = d.v;
  sysMsg(c, P(m.pid).name + (d.v === 'Active' ? ' joined' : ' is no longer a member'));
  notify(m.pid, d.v === 'Active' ? 'You joined ' + c.name : 'Your membership of ' + c.name + ' ended', 'circles');
  audit('Membership ' + d.v, c.id, m.pid);
  ok();
};
A.memRole = (d, el) => {
  const c = byId('circles', d.c);
  c.members[d.i].role = el.value;
  audit('Member role assigned', c.id, el.value);
  ok();
};
A.inviteMem = d => {
  const c = byId(d.kind, d.c);
  const cands = S.assign.filter(
    a => a.ctx === ctxId() && a.status === 'Active' && ['P', 'M', 'C'].includes(a.role) && !memberOf(c, a.pid),
  );
  modal(
    'Invite members',
    `<form data-f="invm" class="col" style="gap:12px"><input type="hidden" name="c" value="${c.id}"><input type="hidden" name="kind" value="${d.kind}">${cands.map(a => `<label class="row"><input class="chk" type="checkbox" name="m" value="${a.pid}">${nm(a.pid)} <span class="cap">${ROLE[a.role]}</span></label>`).join('') || '<p class="cap">Everyone eligible is already a member.</p>'}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send invitations</button></div></form>`,
  );
};
F.invm = d => {
  const c = byId(d.kind, d.c);
  [].concat(d.m || []).forEach(pid => {
    const rr = S.assign.find(a => a.pid === pid && a.ctx === ctxId()).role;
    c.members.push({
      pid,
      role:
        d.kind === 'circles'
          ? rr === 'M'
            ? 'Mentor (invited)'
            : rr === 'C'
              ? 'Partner (invited)'
              : 'Member'
          : rr === 'M'
            ? 'Mentor'
            : 'Participant',
      status: d.kind === 'circles' ? 'Invited' : 'Active',
    });
    notify(pid, 'You were invited to ' + c.name, d.kind === 'circles' ? 'circle' : 'rope', { id: c.id });
  });
  audit('Members invited', c.id, [].concat(d.m || []).join(','));
  UI.modal = null;
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
