// ---------- ROPE TEAMS & MENTOR REQUESTS (E04, F05, Section 6.3, Figure 9) ----------
// Mentors are onboarded by invitation (D-05). Engagement on a project starts with a Mentor Request from a
// Faculty/Steward; the mentor accepts or declines, joins the Rope Team, and sees only the project context needed.
const OPEN_REQ = 'open';
const isRopeFac = x => spaceRole('ropes', x) === 'Facilitator';
// Only the project owner or an assigned Faculty/Steward invites people to a Rope Team and decides join requests.
const ropeInviter = x => {
  if (!x) return false;
  const pr = byId('projects', x.project);
  return x.owner === myId() || (role() === 'F' && ((pr && pr.stewards.includes(myId())) || isRopeFac(x)));
};
// Rope Teams a person may ask to join: those linked to a Circle they belong to.
const ropeJoinable = x => !!x.circle && memberOf(byId('circles', x.circle) || {}) && !memberOf(x) && x.state === 'Active';
A.mentorRequest = d => {
  clearF('mrq');
  const pr = byId('projects', d.project);
  const mentors = S.assign.filter(a => a.ctx === ctxId() && roleBase(a.role) === 'M' && a.status === 'Active');
  modal(
    'Raise a Mentor Request',
    () =>
      `<form data-f="mrq" class="col" style="gap:14px" novalidate><input type="hidden" name="project" value="${pr.id}">${dl([['Project', h(pr.title)], ['Stage', pill(stageLabel(pr.stage || 'Circle'))]])}${fi('mrq', 'need', 'Skill gap or support needed', { req: true, ph: 'e.g. GIS mapping guidance' })}${fi('mrq', 'detail', 'What the mentor should help with', { type: 'textarea', rows: 3, help: 'Shared with the mentor together with the authorised project summary only.' })}${fi('mrq', 'hours', 'Expected time commitment (optional)', { ph: 'e.g. 2 hours a week for 4 weeks' })}${fi('mrq', 'to', 'Send to', { type: 'select', req: true, ph: 'Choose a mentor or an open request', opts: [[OPEN_REQ, 'Open request — visible to mentors in this programme'], ...mentors.map(a => [a.pid, P(a.pid).name])], help: assumed('OI-15 open pool vs direct assignment') })}${banner('info', 'Need a collaborator instead?', 'Use “Find a collaborator” on the project to start a steward-reviewed match for a defined requirement (F06).')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.mrq = d => {
  if (!validate('mrq', d, { need: ['req'], to: ['req'] })) return render();
  const m = { id: uid('mr'), from: myId(), to: d.to === OPEN_REQ ? null : d.to, open: d.to === OPEN_REQ, project: d.project, need: d.need, detail: d.detail || '', hours: (d.hours || '').trim(), status: 'Pending', at: today() };
  S.mentorReqs.push(m);
  const pr = byId('projects', d.project);
  const recips = m.open ? S.assign.filter(a => a.ctx === pr.ctx && roleBase(a.role) === 'M' && a.status === 'Active').map(a => a.pid) : [d.to];
  recips.forEach(p => notify(p, (m.open ? 'Open Mentor Request: ' : 'Mentor Request from ' + me().name + ': ') + d.need, 'ropeteams'));
  const c = byId('circles', pr.circle);
  if (c) sysMsg(c, 'Mentor Request raised: ' + d.need);
  audit('Mentor Request raised', m.id, d.need + (m.open ? ' (open)' : ''));
  UI.modal = null;
  clearF('mrq');
  toast(m.open ? 'Open request sent to mentors in this programme.' : 'Mentor Request sent.');
  ok();
};
const mentorReqVisible = m => m.to === myId() || m.from === myId() || (m.open && role() === 'M' && inCtx(byId('projects', m.project) || {}));
A.mentorReq = d => {
  const m = byId('mentorReqs', d.id);
  if (d.v === 'Declined' && m.open) {
    (m.declinedBy = m.declinedBy || []).push(myId());
    audit('Open Mentor Request declined', m.id, '');
    toast('Declined. The request stays open for other mentors.');
    return ok();
  }
  m.status = d.v;
  if (m.open) m.to = myId();
  notify(m.from, `${me().name} ${d.v.toLowerCase()} your Mentor Request: ${m.need}`, 'ropeteams');
  audit('Mentor Request ' + d.v, m.id, '');
  if (d.v === 'Accepted') {
    const pr = byId('projects', m.project);
    let rt = pr.rope && byId('ropes', pr.rope);
    if (!rt) {
      const circle = byId('circles', pr.circle);
      rt = {
        id: uid('rt'),
        ctx: pr.ctx,
        name: pr.title + ' Rope Team',
        charter: 'Support: ' + m.need + (m.detail ? '. ' + m.detail : ''),
        mentor: myId(),
        owner: pr.owner,
        circle: pr.circle,
        project: pr.id,
        state: 'Active',
        members: [
          { pid: pr.owner, role: 'Project owner', status: 'Active' },
          ...(circle ? circle.members.filter(x => x.status === 'Active' && x.pid !== pr.owner && normRole(x.role) === 'Member').map(x => ({ pid: x.pid, role: 'Member', status: 'Active' })) : []),
          { pid: myId(), role: 'Mentor', status: 'Active' },
          { pid: m.from, role: 'Facilitator', status: 'Active' },
        ],
        chat: [],
        checkins: [],
        support: [],
        reviews: [],
        contribs: [],
        engagement: null,
        indicators: {},
        privateNotes: [],
        reqFinal: false,
      };
      rt.members.filter(x => ['Project owner', 'Member'].includes(x.role)).forEach(x => (rt.indicators[x.pid] = { pacing: 'On track', workload: '—', availability: '—', support: 'None reported', absence: 'None' }));
      S.ropes.push(rt);
      pr.rope = rt.id;
      pr.stage = 'Rope Team';
      pr.history.push({ at: today(), t: 'Rope Team formed; moved to Rope Team stage' });
      sysMsg(rt, 'Rope Team formed. ' + me().name + ' joined as mentor for: ' + m.need);
      if (circle) sysMsg(circle, 'Project moved to the Rope Team stage — ' + rt.name);
      rt.members.filter(x => x.pid !== myId()).forEach(x => notify(x.pid, 'Rope Team formed for “' + pr.title + '”', 'rope', { id: rt.id }));
    } else if (!memberOf(rt)) {
      rt.members.push({ pid: myId(), role: 'Mentor', status: 'Active' });
      if (!rt.mentor || rt.engagement?.status === 'Exited') rt.mentor = myId();
      sysMsg(rt, me().name + ' joined as mentor for: ' + m.need);
    }
    toast('Accepted. You have joined the Rope Team.');
  }
  ok();
};
route('ropeteams', 'ropeteams', () => {
  const r = role();
  const list = S.ropes.filter(x => inCtx(x) && (memberOf(x) || r === 'A' || r === 'O' || ['Requested', 'Invited'].includes((memberRec(x) || {}).status)));
  const joinable = S.ropes.filter(x => inCtx(x) && !list.includes(x) && ropeJoinable(x));
  const reqs = S.mentorReqs.filter(m => mentorReqVisible(m) && !(m.open && m.status === 'Pending' && (m.declinedBy || []).includes(myId())));
  return (
    head(
      r === 'M' ? 'Rope Teams & Mentor Requests' : 'Rope Teams',
      'Small mentoring, support and accountability groups. Not a clinical or care-management system.',
    ) +
    (reqs.length || r === 'M'
      ? card(
          'Mentor Requests',
          r === 'M' ? 'Accept only where your expertise is relevant. Declining has no consequences.' : 'Requests you raised or received.',
          table(
            ['Need', 'Project', 'From', 'To', 'Status', ''],
            reqs.map(m => [
              `<b>${h(m.need)}</b>${m.hours ? `<div class="cap">${ic('clock', 12)} ${h(m.hours)}</div>` : ''}`,
              cName(m.project),
              nm(m.from),
              m.open && m.status === 'Pending' ? pill('Open request', 'p-purple') : m.to ? nm(m.to) : '—',
              pill(m.status),
              B('Details', 'mrDetails', { id: m.id }) +
                ((m.to === myId() || (m.open && r === 'M')) && m.status === 'Pending'
                  ? B('Decline', 'mentorReq', { id: m.id, v: 'Declined' }) + B('Accept', 'mentorReq', { id: m.id, v: 'Accepted' }, 'btn-p btn-sm')
                  : ''),
            ]),
            r === 'M' ? 'No Mentor Requests for you right now.' : 'No requests.',
          ),
        ) + '<div class="section-gap"></div>'
      : '') +
    card(
      'Rope Teams',
      '',
      table(
        ['Rope Team', 'Mentor', 'Linked to', 'Your role', 'State', ''],
        list.map(x => [
          `<b>${h(x.name)}</b>${unreadIn(x) && memberOf(x) ? ` <span class="mbadge">${unreadIn(x)}</span>` : ''}`,
          x.mentor ? nm(x.mentor) : '—',
          cName(x.circle) + ' · ' + cName(x.project),
          spaceRole('ropes', x) ? h(spaceRole('ropes', x)) : joinState(x) === 'pending' ? pill('Pending') : joinState(x) === 'invited' ? pill('Invited') : '<span class="cap">Oversight</span>',
          pill(x.state),
          joinState(x) === 'pending' ? B('Withdraw request', 'joinWithdraw', { id: x.id, kind: 'ropes' }) : joinState(x) === 'invited' ? B('Respond to invite', 'go', { r: 'rope', id: x.id }, 'btn-p btn-sm') : L('Open', 'rope', { id: x.id }),
        ]),
        'No Rope Teams. One is formed when a mentor accepts a Mentor Request.',
      ),
    ) +
    (joinable.length
      ? '<div class="section-gap"></div>' +
        card(
          'Rope Teams linked to your Circles',
          'You can ask to join. The project owner or the Faculty/Steward approves or declines.',
          table(
            ['Rope Team', 'Circle', 'Mentor', 'State', ''],
            joinable.map(x => [`<b>${h(x.name)}</b>`, cName(x.circle), x.mentor ? nm(x.mentor) : '—', pill(x.state), joinBtn(x, 'ropes')]),
          ),
        )
      : '')
  );
});
route('rope', 'ropeteams', () => {
  const x = byId('ropes', UI.p.id);
  if (!x) return empty('route', 'Not found', '');
  const r = role();
  const isMem = memberOf(x);
  const myM = memberRec(x);
  const isMentor = sCan('ropes', x, 'mentor');
  const isFac = isRopeFac(x);
  const inviter = ropeInviter(x);
  const crumbs = [['Rope Teams', 'ropeteams'], [h(x.name)]];
  if (myM && myM.status === 'Requested')
    return (
      head(h(x.name), 'Rope Team', pill('Pending'), crumbs) +
      banner('info', 'Your request to join is pending', 'The project owner or the Faculty/Steward will approve or decline it. You will be notified either way.') +
      card('', '', dl([['Charter', h(x.charter)], ['Mentor', x.mentor ? nm(x.mentor) : '—'], ['Requested', fmt(myM.at || '')]]) + `<div class="row" style="margin-top:12px">${B('Withdraw request', 'joinWithdraw', { id: x.id, kind: 'ropes' })}</div>`)
    );
  if (myM && myM.status === 'Invited')
    return (
      head(h(x.name), 'You have been invited to this Rope Team', '', crumbs) +
      card('', '', `<p>${h(x.charter)}</p>${dl([['Mentor', x.mentor ? nm(x.mentor) : '—'], ['Your role', h(normRole(myM.role))], ['Circle', cName(x.circle)]])}<div class="row" style="margin-top:14px">${B('Decline', 'ropeInvite', { id: x.id, v: 'Declined' })}${B('Accept and join', 'ropeInvite', { id: x.id, v: 'Active' }, 'btn-p btn-sm')}</div>`)
    );
  if (!isMem && !['A', 'O'].includes(r) && !inviter) {
    if (ropeJoinable(x) || (x.circle && memberOf(byId('circles', x.circle) || {})))
      return (
        head(h(x.name), 'Rope Team', pill(x.state), crumbs) +
        card('Members only', 'Only Rope Team members see its chat, reviews and support.', dl([['Charter', h(x.charter)], ['Mentor', x.mentor ? nm(x.mentor) : '—'], ['Circle', cName(x.circle)]]) + (x.state === 'Active' ? `<div class="row" style="margin-top:14px">${joinBtn(x, 'ropes')}</div>` : ''))
      );
    return deniedView('ropeteams');
  }
  const ro = x.state !== 'Active' || !isMem;
  const canShare = sCan('ropes', x, 'share');
  const canAsk = sCan('ropes', x, 'ask');
  const pr = byId('projects', x.project);
  x.reviews = x.reviews || [];
  const t = tabs(
    'rt_' + x.id,
    [
      ['chat', 'Chat', isMem && unreadIn(x) ? unreadIn(x) : null],
      ['reviews', 'Work reviews', x.reviews.filter(v => v.status === 'Awaiting review').length || null],
      ['checkins', 'Check-ins & sessions'],
      ['support', 'Support requests', x.support.filter(s => s.status !== 'Resolved').length || null],
      (isMentor || isFac) && ['ind', 'Support indicators'],
      (isMentor || isFac) && ['notes', 'Private notes'],
      ['contrib', 'Contributions', (x.contribs || []).length || null],
      ['members', 'Members', x.members.filter(m => m.status === 'Requested').length || null],
      ['about', 'Charter & stage'],
    ],
    UI.p.tab,
  );
  let body = '';
  if (t.cur === 'chat')
    body =
      `<div class="row wrap chatbar"><span class="cap">Rope Team chat — members only. ${isMem ? L('Open in Messages', 'messages', { c: x.id, k: 'ropes' }) : ''}</span></div>` +
      chatThread('ropes', x, { embedded: true });
  if (t.cur === 'reviews')
    body = card(
      'Work for mentor review',
      'Share specific deliverables, designs, documents or approaches. The mentor reviews and recommends improvements; reviews are recorded as mentor contributions.',
      x.reviews
        .slice()
        .reverse()
        .map(
          v =>
            `<div class="rvitem"><div class="row wrap" style="justify-content:space-between;gap:8px"><div class="col" style="min-width:0"><b>${h(v.title)}</b><span class="cap">${nm(v.by)} · ${fmt(v.at)}</span></div>${pill(v.status, { 'Looks good': 'p-green', 'Changes recommended': 'p-amber', 'Awaiting review': 'p-navy' }[v.status])}</div>${v.desc ? `<p class="muted" style="margin-top:6px">${h(v.desc)}</p>` : ''}${v.att ? `<div style="margin-top:8px">${attCard(v.att)}</div>` : ''}${v.response ? `<div class="rvresp"><span class="cap"><b>${nm(v.reviewer)}</b> · mentor review</span><p>${h(v.response)}</p></div>` : ''}<div class="row wrap" style="margin-top:10px">${isMentor && !ro && v.status === 'Awaiting review' ? B('Review', 'revRespond', { r: x.id, id: v.id }, 'btn-p btn-sm') : ''}${v.by === myId() && !ro && v.status === 'Changes recommended' ? B('Resubmit after changes', 'revNew', { id: x.id, re: v.id }) : ''}</div></div>`,
        )
        .join('') || empty('file', 'Nothing shared for review yet', 'Participants share work here when they want the mentor’s view.'),
      !ro && canShare ? B(ic('upload', 14) + 'Share work for review', 'revNew', { id: x.id }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'checkins')
    body = card(
      'Check-ins and sessions',
      'One-to-one or group guidance and accountability check-ins.',
      table(
        ['Date', 'Type', 'By', 'Note', 'Pacing'],
        x.checkins
          .slice()
          .reverse()
          .map(c => [fmt(c.at), h(c.kind || 'Check-in'), nm(c.by), h(c.t), pill(c.pacing, c.pacing === 'On track' ? 'p-teal' : 'p-amber')]),
        'No check-ins recorded yet.',
      ),
      isMentor && !ro ? B(ic('plus', 14) + 'Record check-in or session', 'checkin', { id: x.id }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'support')
    body = card(
      'Support requests',
      'Create, assign response ownership and track status. Issues returned from the ' + WL() + ' arrive here.',
      table(
        ['Request', 'From', 'Owner', 'Status', ''],
        x.support.map(s => [
          (s.ret ? pill('Returned', 'p-amber') + ' ' : '') + h(s.t),
          nm(s.by),
          s.owner ? nm(s.owner) : '—',
          pill(s.status),
          (isMentor || isFac) && s.status !== 'Resolved' && !ro
            ? (s.status === 'Open' ? B('Take ownership', 'supStatus', { r: x.id, id: s.id, v: 'Assigned' }) : '') +
              B('Resolve', 'supStatus', { r: x.id, id: s.id, v: 'Resolved' })
            : '',
        ]),
        'No support requests.',
      ),
      !ro && canAsk ? B(ic('plus', 14) + 'Ask for support', 'supNew', { id: x.id }, 'btn-p btn-sm') : '',
    );
  if (t.cur === 'ind')
    body = card(
      'Participant support indicators',
      'Activity-derived or participant-reported. Visible only to the mentor and facilitator. Never a score.',
      table(
        ['Participant', 'Pacing', 'Workload', 'Availability', 'Support needs', 'Absence'],
        Object.entries(x.indicators).map(([k, v]) => [nm(k), h(v.pacing), h(v.workload), h(v.availability), h(v.support), h(v.absence)]),
      ),
    );
  if (t.cur === 'notes')
    body = card(
      'Private mentor notes',
      'Never copied to profiles, Harvests or sponsor reports.',
      x.privateNotes.map(n => lrow('lock', h(n.t), nm(n.by))).join('') || '<p class="cap">None.</p>',
      isMentor ? B(ic('plus', 14) + 'Add note', 'privNote', { id: x.id }, 'btn-s btn-sm') : '',
    );
  if (t.cur === 'contrib')
    body =
      card(
        'Mentor contributions',
        'Guidance, reviews, recommendations and issues resolved — captured in the project record.',
        table(
          ['Date', 'Type', 'Contribution', 'By'],
          (x.contribs || []).map(c => [fmt(c.at), pill(c.kind, 'p-grey'), h(c.t), nm(c.by)]),
          'No contributions recorded yet.',
        ),
        isMentor && !ro
          ? B(ic('plus', 14) + 'Record contribution', 'ropeContrib', { id: x.id }, 'btn-p btn-sm') +
              B('Feedback to facilitator', 'ropeFeedback', { id: x.id }) +
              B('Suggest an opportunity', 'suggestOpp', { id: x.id })
          : '',
      ) +
      (isFac
        ? '<div class="section-gap"></div>' +
          card('Mentor feedback', '', S.feedback.filter(f => f.rope === x.id).map(f => lrow('message', h(f.t), nm(f.by) + ' · ' + fmt(f.at))).join('') || '<p class="cap">No feedback yet.</p>')
        : '');
  if (t.cur === 'members') {
    const reqs = x.members.map((m, i) => [m, i]).filter(([m]) => m.status === 'Requested');
    body =
      (reqs.length
        ? card(
            'Join requests',
            inviter ? 'Approve or decline. The person is notified either way.' : 'Waiting for the project owner or Faculty/Steward.',
            table(
              ['Person', 'Platform role', 'Requested', ''],
              reqs.map(([m, i]) => [nm(m.pid), h(ROLE[ctxRole(m.pid, x.ctx)] || '—'), fmt(m.at || ''), inviter && x.state === 'Active' ? B('Decline', 'memSet', { kind: 'ropes', c: x.id, i, v: 'Declined' }) + B('Approve', 'memSet', { kind: 'ropes', c: x.id, i, v: 'Active' }, 'btn-p btn-sm') : pill('Pending')]),
            ),
          ) + '<div class="section-gap"></div>'
        : '') +
      card(
        'Members',
        'Roles apply in this Rope Team only. Only the project owner or an assigned Faculty/Steward invites people.',
        table(
          ['Member', 'Role in this Rope Team', 'Status', ''],
          x.members
            .map((m, i) => [m, i])
            .filter(([m]) => m.status !== 'Requested')
            .map(([m, i]) => {
              const fixed = m.pid === x.owner || (m.pid === x.mentor && normRole(m.role) === 'Mentor');
              const sr = m.pid === x.owner ? 'Project owner' : normRole(m.role);
              return [
                nm(m.pid) + ` <span class="cap">${h(ROLE[ctxRole(m.pid, x.ctx)] || '')}</span>`,
                inviter && x.state === 'Active' && !fixed && (!m.status || m.status === 'Active') ? roleSelect('memRole', { kind: 'ropes', c: x.id, i }, sr, 'Role of ' + P(m.pid).name) : h(sr),
                pill(m.status || 'Active'),
                inviter && x.state === 'Active' && !fixed && ['Active', 'Invited', undefined].includes(m.status)
                  ? CB('Remove', 'memSet', { kind: 'ropes', c: x.id, i, v: 'Removed' }, 'Remove ' + P(m.pid).name + ' from this Rope Team? Their recorded contributions stay in the project record.')
                  : '',
              ];
            }),
        ),
        inviter && x.state === 'Active' ? B(ic('plus', 14) + 'Invite', 'inviteMem', { c: x.id, kind: 'ropes' }, 'btn-p btn-sm') : '',
      );
  }
  if (t.cur === 'about') {
    const eng = x.engagement;
    const secs = pr && pr.sections;
    body = `<div class="g12">${card(
      'Charter',
      '',
      dl([
        ['Charter', h(x.charter)],
        ['Mentor', x.mentor ? nm(x.mentor) : '—'],
        ['Rope Team owner', nm(x.owner)],
        ['Circle', x.circle ? L(cName(x.circle), 'circle', { id: x.circle }) : '—'],
        ['Project', pr ? L(h(pr.title), 'project', { id: pr.id }) : '—'],
        ['State', pill(x.state)],
        ['Members', x.members.filter(m => !m.status || m.status === 'Active').map(m => nm(m.pid) + ' <span class="cap">(' + h(spaceRole('ropes', x, m.pid) || normRole(m.role)) + ')</span>').join(', ')],
      ]),
      L('Members', 'rope', { id: x.id, tab: 'members' }),
      'c7',
    )}${pr ? `<div class="c5 col" style="gap:24px">${stageGate(pr, 'ropes', x)}</div>` : ''}
 ${secs ? card('Authorised project context', 'Only what the Rope Team needs to guide effectively. Purpose Compass, hurdles and private records are never shown here.', dl([[SECTIONS[0], h(secs[0].text)], [SECTIONS[1], `<span style="white-space:pre-line">${h(secs[1].text)}</span>`], [SECTIONS[2], `<span style="white-space:pre-line">${h(secs[2].text)}</span>`], [SECTIONS[3], `<span style="white-space:pre-line">${h(secs[3].text)}</span>`]]), '', 'c7') : ''}
 <div class="${secs ? 'c5' : 'c12'} col" style="gap:24px">${pr ? reportsCard(pr, 'ropes', x) : ''}${card(
   'Mentor engagement',
   'When the need is addressed, the mentor and Faculty/Steward decide whether the engagement continues or ends.',
   `${eng ? dl([['Decision', pill(eng.status)], ['Need addressed', h(eng.addressed)], ['Note', h(eng.note || '—')], ['Proposed by', nm(eng.by) + ' · ' + fmt(eng.at)]]) : '<p class="cap">Engagement is active.</p>'}<div class="row wrap" style="margin-top:12px">${isMentor && !ro && (!eng || eng.status === 'Continuing') ? B('Review engagement', 'engage', { id: x.id }, 'btn-s btn-sm') : ''}${isFac && eng && eng.status === 'Exit proposed' && !ro ? B('Continue instead', 'engageDecide', { id: x.id, v: 'Continuing' }) + B('Confirm mentor exit', 'engageDecide', { id: x.id, v: 'Exited' }, 'btn-p btn-sm') : ''}${!ro && (isMentor || isFac) ? B(ic('alert', 14) + 'Escalate a concern', 'escalateRope', { id: x.id }) : ''}${(isFac || isMentor) && x.state === 'Active' ? B('Close Rope Team', 'ropeClose', { id: x.id }) : ''}</div>`,
 )}</div>
 ${returnsCard(x) ? `<div class="c12">${returnsCard(x)}</div>` : ''}</div>`;
  }
  return (
    spaceHead('ropes', x, h(x.charter), crumbs, isMem ? L(ic('message', 16) + 'Open in Messages', 'messages', { c: x.id, k: 'ropes' }, 'btn btn-s') : '') +
    roleNote('ropes', x) +
    (pr ? stageTrack(pr, 'ropes') : '') +
    t.html +
    body
  );
});
A.checkin = d => {
  clearF('ck');
  modal(
    'Record a check-in or session',
    () =>
      `<form data-f="ck" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('ck', 'kind', 'Type', { type: 'select', opts: ['Check-in', 'One-to-one guidance session', 'Group guidance session'], req: true })}${fi('ck', 't', 'Note', { type: 'textarea', rows: 3, req: true, help: 'Visible to Rope Team members. Use private notes for anything sensitive.' })}${fi('ck', 'pacing', 'Pacing', { type: 'select', opts: ['On track', 'Slightly behind', 'Behind'], req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.ck = d => {
  if (!validate('ck', d, { t: ['req'] })) return render();
  const x = byId('ropes', d.id);
  x.checkins.push({ at: today(), by: myId(), kind: d.kind, t: d.t, pacing: d.pacing });
  sysMsg(x, (d.kind || 'Check-in') + ' recorded by ' + me().name);
  audit('Check-in recorded', x.id, d.kind || '');
  UI.modal = null;
  clearF('ck');
  ok();
};
A.revNew = d => {
  clearF('rvn');
  const x = byId('ropes', d.id);
  const prev = d.re && x.reviews.find(v => v.id === d.re);
  if (prev) UI.form.rvn = { title: prev.title.replace(/ \(revised\)$/, '') + ' (revised)', desc: prev.desc };
  modal(
    prev ? 'Resubmit after changes' : 'Share work for review',
    () =>
      `<form data-f="rvn" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${x.id}"><input type="hidden" name="re" value="${d.re || ''}">${fi('rvn', 'title', 'What should the mentor review?', { req: true, ph: 'e.g. Survey question set v3' })}${fi('rvn', 'desc', 'Context and what kind of feedback you want', { type: 'textarea', rows: 3, req: true })}<div class="field"><label class="lbl" for="rvn_f">File (optional)</label><input id="rvn_f" type="file" name="f" class="input" style="padding:8px"><span class="help">Up to ${S.settings.maxFileMB} MB. Link video externally.</span></div><div class="actions"><span></span><button class="btn btn-p" type="submit">Send for review</button></div></form>`,
  );
};
F.rvn = (d, form) => {
  if (!validate('rvn', d, { title: ['req'], desc: ['req'] })) return render();
  const file = form.querySelector('input[type=file]')?.files?.[0];
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    UI.err.rvn = { title: 'File over ' + S.settings.maxFileMB + ' MB. Link it externally instead.' };
    return render();
  }
  const x = byId('ropes', d.id);
  x.reviews.push({ id: uid('rv'), by: myId(), title: d.title, desc: d.desc, att: file ? { n: file.name, mb: +(file.size / 1048576).toFixed(2) } : null, at: today(), status: 'Awaiting review', response: '', reviewer: null, prev: d.re || null });
  if (x.mentor) notify(x.mentor, 'Work shared for review in ' + x.name + ': ' + d.title, 'rope', { id: x.id, tab: 'reviews' });
  sysMsg(x, me().name + ' shared work for review: ' + d.title);
  audit('Work shared for mentor review', x.id, d.title);
  UI.modal = null;
  clearF('rvn');
  toast('Sent to your mentor for review.');
  ok();
};
A.revRespond = d => {
  clearF('rvr');
  const x = byId('ropes', d.r);
  const v = x.reviews.find(y => y.id === d.id);
  modal(
    'Review: ' + h(v.title),
    () =>
      `<form data-f="rvr" class="col" style="gap:14px" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${v.id}">${dl([['From', nm(v.by)], ['Shared', fmt(v.at)], ['Context', h(v.desc)]])}${fi('rvr', 'status', 'Outcome', { type: 'select', req: true, opts: ['Looks good', 'Changes recommended'] })}${fi('rvr', 'response', 'Your review and recommendations', { type: 'textarea', rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send review</button></div></form>`,
  );
};
F.rvr = d => {
  if (!validate('rvr', d, { response: ['req', ['min', 10]] })) return render();
  const x = byId('ropes', d.r);
  const v = x.reviews.find(y => y.id === d.id);
  v.status = d.status;
  v.response = d.response;
  v.reviewer = myId();
  (x.contribs = x.contribs || []).push({ by: myId(), kind: 'Review of deliverable', t: v.title + ' — ' + d.status.toLowerCase(), at: today() });
  notify(v.by, 'Mentor review of “' + v.title + '”: ' + d.status, 'rope', { id: x.id, tab: 'reviews' });
  sysMsg(x, 'Mentor reviewed “' + v.title + '”: ' + d.status);
  audit('Mentor review recorded', x.id, v.title + ' · ' + d.status);
  UI.modal = null;
  clearF('rvr');
  ok();
};
A.engage = d => {
  clearF('eng');
  modal(
    'Review the mentor engagement',
    () =>
      `<form data-f="eng" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('eng', 'addressed', 'Has the need been addressed?', { type: 'select', req: true, opts: ['Yes', 'Partly', 'Not yet'] })}${fi('eng', 'choice', 'Proposal', { type: 'select', req: true, opts: [['Continuing', 'Continue the engagement'], ['Exit proposed', 'End my engagement (the Faculty/Steward confirms)']] })}${fi('eng', 'note', 'Note for the Faculty/Steward', { type: 'textarea', rows: 3 })}${banner('info', '', 'Ending your engagement removes your access to this Rope Team. Your recorded contributions stay in the project record.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
  );
};
F.eng = d => {
  if (!validate('eng', d, { addressed: ['req'], choice: ['req'] })) return render();
  const x = byId('ropes', d.id);
  x.engagement = { status: d.choice, addressed: d.addressed, note: d.note || '', by: myId(), at: today() };
  x.members.filter(m => m.role === 'Facilitator').forEach(m => notify(m.pid, `Mentor engagement review in ${x.name}: ${d.choice === 'Continuing' ? 'continue' : 'exit proposed'} (need addressed: ${d.addressed})`, 'rope', { id: x.id, tab: 'about' }));
  audit('Mentor engagement reviewed', x.id, d.choice);
  UI.modal = null;
  clearF('eng');
  toast(d.choice === 'Continuing' ? 'Recorded. The engagement continues.' : 'Exit proposed. The Faculty/Steward confirms it.');
  ok();
};
A.engageDecide = d => {
  const x = byId('ropes', d.id);
  const ment = x.mentor;
  x.engagement.status = d.v;
  x.engagement.decidedBy = myId();
  if (d.v === 'Exited') {
    x.members.filter(m => m.pid === ment && m.role === 'Mentor').forEach(m => (m.status = 'Exited'));
    sysMsg(x, P(ment).name + ' ended their mentor engagement. Contributions stay in the project record.');
    notify(ment, 'Your engagement with ' + x.name + ' has ended. Thank you — please share Harvest input or feedback if you have not yet.', 'rope', { id: x.id });
    toast('Mentor exit confirmed. Raise a new Mentor Request if more support is needed.');
  } else notify(ment, 'The Faculty/Steward asked you to continue with ' + x.name, 'rope', { id: x.id });
  audit('Mentor engagement ' + d.v, x.id, P(ment).name);
  ok();
};
A.supNew = d => {
  clearF('sup');
  modal(
    'Ask for support',
    () =>
      `<form data-f="sup" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('sup', 't', 'What do you need help with?', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
  );
};
F.sup = d => {
  if (!validate('sup', d, { t: ['req'] })) return render();
  const x = byId('ropes', d.id);
  x.support.push({ id: uid('su'), by: myId(), t: d.t, owner: null, status: 'Open' });
  if (x.mentor) notify(x.mentor, 'Support request in ' + x.name, 'rope', { id: x.id, tab: 'support' });
  audit('Support request', x.id, '');
  UI.modal = null;
  clearF('sup');
  ok();
};
A.supStatus = d => {
  const x = byId('ropes', d.r);
  const s = x.support.find(s => s.id === d.id);
  s.status = d.v;
  if (d.v === 'Assigned') s.owner = myId();
  if (d.v === 'Resolved' && s.ret) resolveReturn(s.ret, 'guidance given in ' + x.name);
  notify(s.by, 'Your support request is ' + d.v.toLowerCase(), 'rope', { id: x.id });
  audit('Support request ' + d.v, x.id, s.id);
  if (d.v === 'Resolved' && s.ret) toast('Resolved. The ' + WL() + ' has been told it can move forward again.');
  ok();
};
A.privNote = d => {
  clearF('pn');
  modal(
    'Private note',
    () =>
      `<form data-f="pn" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('pn', 't', 'Note', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.pn = d => {
  if (!validate('pn', d, { t: ['req'] })) return render();
  byId('ropes', d.id).privateNotes.push({ by: myId(), t: d.t });
  UI.modal = null;
  clearF('pn');
  ok();
};
A.escalateRope = d => {
  clearF('esc');
  modal(
    'Escalate a concern',
    () =>
      `<form data-f="esc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('esc', 't', 'Concern (e.g. disengagement or risk of harm)', { type: 'textarea', rows: 3, req: true })}${fi('esc', 'to', 'Escalate to', { type: 'select', opts: [['steward', 'Steward / facilitator'], ['safety', 'Incident/Safety Owner']], req: true })}<div class="actions"><span></span><button class="btn btn-d" type="submit">Escalate</button></div></form>`,
  );
};
F.esc = d => {
  if (!validate('esc', d, { t: ['req'] })) return render();
  const x = byId('ropes', d.id);
  if (d.to === 'safety') {
    const inc = { id: uid('in'), by: myId(), ctx: x.ctx, where: x.name, kind: 'Rope Team concern', desc: d.t, state: 'Reported', owner: null, paused: false, conf: 'Restricted to Incident/Safety Owner', timeline: [{ at: today(), t: 'Reported by mentor' }], decision: null };
    S.incidents.push(inc);
    S.assign.filter(a => a.bundles.includes('Incident/Safety Owner')).forEach(a => notify(a.pid, 'Concern escalated from ' + x.name, 'incidents', { id: inc.id }));
  } else {
    x.members.filter(m => m.role === 'Facilitator').forEach(m => notify(m.pid, 'Concern escalated in ' + x.name, 'rope', { id: x.id }));
  }
  (S.mentorConcerns = S.mentorConcerns || []).push({ by: myId(), rope: x.id, to: d.to, at: today(), t: d.t });
  audit('Rope Team concern escalated', x.id, d.to);
  UI.modal = null;
  clearF('esc');
  toast('Escalated with appropriate confidentiality.');
  ok();
};
A.reqFinal = d => {
  const x = byId('ropes', d.id);
  x.reqFinal = true;
  sysMsg(x, 'Requirements finalised by the mentor — ready for the ' + WL());
  const pr = byId('projects', x.project);
  if (pr) pr.history.push({ at: today(), t: 'Requirements finalised in the Rope Team' });
  x.members.filter(m => m.role === 'Facilitator').forEach(m => notify(m.pid, 'Requirements finalised in ' + x.name + ' — ready for ' + WL(), 'rope', { id: x.id, tab: 'about' }));
  audit('Requirements finalised', x.id, '');
  ok();
};
A.ropeClose = d => {
  clearF('rcl');
  const x = byId('ropes', d.id);
  modal(
    'Close ' + h(x.name),
    () =>
      `<form data-f="rcl" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${x.id}">${!x.reqFinal ? banner('warn', 'Requirements are not finalised', 'Closing now means the project continues without a finalised Rope Team outcome.') : ''}${fi('rcl', 'outcome', 'Outcome and anything carried forward', { type: 'textarea', rows: 3, req: true })}${banner('info', '', 'The Rope Team becomes read-only. Contributions, reviews and reports stay in the project record. Private mentor notes are not copied anywhere.')}<div class="actions"><span></span><button class="btn btn-d" type="submit">Close Rope Team</button></div></form>`,
  );
};
F.rcl = d => {
  if (!validate('rcl', d, { outcome: ['req'] })) return render();
  const x = byId('ropes', d.id);
  x.state = 'Closed';
  x.outcome = d.outcome;
  sysMsg(x, 'Rope Team closed: ' + d.outcome.slice(0, 90));
  x.members.filter(m => m.pid !== myId() && (!m.status || m.status === 'Active')).forEach(m => notify(m.pid, x.name + ' was closed', 'rope', { id: x.id }));
  audit('Rope Team closed', x.id, d.outcome);
  UI.modal = null;
  clearF('rcl');
  ok();
};
// Full context for a mentor before they decide: project, stage, owner, stewards, the exact help needed and the time asked for.
A.mrDetails = d => {
  const m = byId('mentorReqs', d.id);
  const pr = byId('projects', m.project) || {};
  const sec = i => (pr.sections && pr.sections[i] ? `<span style="white-space:pre-line">${h(pr.sections[i].text)}</span>` : '—');
  const canAct = (m.to === myId() || (m.open && role() === 'M')) && m.status === 'Pending';
  modal(
    'Mentor Request · ' + h(m.need),
    `<div class="col" style="gap:16px">${dl([
      ['Status', pill(m.open && m.status === 'Pending' ? 'Open request' : m.status, m.open && m.status === 'Pending' ? 'p-purple' : '')],
      ['Raised by', nm(m.from) + ' · ' + fmt(m.at)],
      ['Help needed', '<b>' + h(m.need) + '</b>' + (m.detail ? `<p class="muted" style="margin-top:4px">${h(m.detail)}</p>` : '')],
      ['Expected time commitment', m.hours ? h(m.hours) : '<span class="cap">Not specified — ask the steward if you need this before deciding.</span>'],
    ])}<div><h3 class="h3" style="margin-bottom:8px">Project</h3>${dl([
      ['Title', h(pr.title || '—')],
      ['Problem', sec(0)],
      ['Objectives', sec(1)],
      ['Current stage', pill(stageLabel(pr.stage || 'Circle'))],
      ['Project owner', pr.owner ? nm(pr.owner) : '—'],
      ['Faculty/Steward', (pr.stewards || []).map(nm).join(', ') || '—'],
      ['Circle', pr.circle ? cName(pr.circle) : '—'],
    ])}</div>${banner('info', 'What you see', 'Only the authorised project summary. Purpose Compass responses, hurdles and private records are never shared with mentors.')}${
      canAct
        ? `<div class="actions">${B('Decline', 'mentorReq', { id: m.id, v: 'Declined' })}${B('Accept and join the Rope Team', 'mentorReq', { id: m.id, v: 'Accepted' }, 'btn-p btn-sm')}</div>`
        : ''
    }</div>`,
    true,
  );
};
A.ropeInvite = d => {
  const x = byId('ropes', d.id);
  const m = memberRec(x);
  m.status = d.v === 'Active' ? 'Active' : 'Declined';
  if (d.v === 'Active') {
    if (['Member', 'Project owner'].includes(normRole(m.role)))
      x.indicators[m.pid] = x.indicators[m.pid] || { pacing: 'On track', workload: '—', availability: '—', support: 'None reported', absence: 'None' };
    sysMsg(x, me().name + ' joined the Rope Team');
  }
  audit('Rope Team invitation ' + (d.v === 'Active' ? 'accepted' : 'declined'), x.id, '');
  if (d.v !== 'Active') {
    save();
    return go('ropeteams');
  }
  ok();
};
