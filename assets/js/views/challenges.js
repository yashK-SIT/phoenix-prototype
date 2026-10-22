// ---------- OPEN CHALLENGES: sponsor-led projects, from the bulletin board to milestone payments ----------
// A Sponsor posts an open challenge on the Explore board under an alias generated for that post. Participants and
// Partners ask to take part, and every discussion about the challenge happens in its chat room. The Sponsor shortlists,
// forms the team's Circle, starts the project in a Circle, Rope Team or Action Room, then closes or archives the post.
// Funding is committed in full before execution and paid offline: PHOENIX has no payment gateway and never processes,
// holds or transfers money. It records what each side states, and a payment is Confirmed only when both sides agree.
// Milestones are agreed with the Circle owner and approved by the Sponsor on completion. A disagreement goes to an
// independent human Steward, who sees both sides under aliases, never their names or organisations.
const CH_CUR = ['USD', 'GBP', 'EUR', 'INR', 'KES', 'ZAR'];
const CH_AVAIL = ['A few hours a week', '1–2 days a week', 'Half time or more'];
const CH_ENTRY = [
  ['circles', 'Circle', 'users', 't-purple', 'The team agrees scope, priorities and the plan together before execution.'],
  ['ropes', 'Rope Team', 'route', 't-teal', 'A mentor supports the team first: skills, confidence or accountability.'],
  ['rooms', 'Action Room', 'room', 't-navy', 'Requirements are clear, so delivery starts straight away with tasks and milestones.'],
];
const CH_WORDS = [
  ['Amber', 'Cedar', 'Cobalt', 'Juniper', 'Harbor', 'Linden', 'Saffron', 'Willow', 'Quartz', 'Meadow', 'Indigo', 'Russet'],
  ['Heron', 'Kestrel', 'Lantern', 'Compass', 'Beacon', 'Fern', 'Otter', 'Summit', 'Wren', 'Orchard', 'Delta', 'Falcon'],
];
Object.assign(SC, {
  'Requests closed': 'p-grey',
  'Team formed': 'p-green',
  Shortlisted: 'p-teal',
  Selected: 'p-green',
  'Not selected': 'p-grey',
  Agreed: 'p-teal',
  'Awaiting sponsor review': 'p-amber',
  'More information requested': 'p-amber',
  'Awaiting owner confirmation': 'p-amber',
  'Pending verification': 'p-amber',
  'Flagged for review': 'p-red',
  'Not established': 'p-red',
  'In dispute': 'p-red',
  'Awaiting Steward assignment': 'p-amber',
  'Awaiting Steward acceptance': 'p-amber',
  Decided: 'p-navy',
  Paid: 'p-green',
});
// The challenge chat room is a conversation like a Circle's: members post, nobody moderates.
SPACE_CAN.chrooms = { post: ALL_BUT_OBS, moderate: [] };
// An alias nobody else holds: "<prefix> · <Word> <Word> <nn>". It belongs to one post (or one dispute) only.
function chAlias(prefix) {
  const taken = new Set([...(S.challenges || []).map(c => c.alias), ...(S.disputes || []).flatMap(d => Object.values(d.aliases || {}))]);
  const pick = l => l[Math.floor(Math.random() * l.length)];
  let a;
  do a = prefix + ' · ' + pick(CH_WORDS[0]) + ' ' + pick(CH_WORDS[1]) + ' ' + (10 + Math.floor(Math.random() * 90));
  while (taken.has(a));
  return a;
}
// ---- selectors and who is who
const chById = id => byId('challenges', id);
const chRoom = ch => byId('chrooms', ch.room);
const chProj = ch => byId('projects', ch.project);
const chMine = ch => !!ch && role() === 'S' && ch.sponsor === myId();
const chApp = (ch, pid = myId()) => ch.apps.find(a => a.pid === pid && a.status !== 'Withdrawn');
const chAppAny = (ch, pid = myId()) => ch.apps.find(a => a.pid === pid);
const chTeam = ch => (ch.team ? [...new Set([ch.team.owner, ...ch.team.members])] : []);
const chOwner = ch => !!ch && !!ch.team && ch.team.owner === myId();
const chOnTeam = ch => !!ch && chTeam(ch).includes(myId());
// The two parties to the agreement: the Sponsor, and the Circle owner who acts for the team.
const chSide = ch => (chMine(ch) ? 'sponsor' : chOwner(ch) ? 'owner' : null);
const chParty = ch => !!chSide(ch);
const chAccepting = ch => ch.status === 'Open' && !ch.project && (!ch.closes || ch.closes >= today());
const chStateLabel = ch => (ch.status === 'Archived' ? 'Archived' : ch.project ? 'Team formed' : chAccepting(ch) ? 'Open' : 'Requests closed');
const chVisible = ch => !!ch && inCtx(ch) && (chMine(ch) || chOnTeam(ch) || !!chAppAny(ch) || (['P', 'C'].includes(role()) && ch.status !== 'Archived'));
const chCanApply = ch => ['P', 'C'].includes(role()) && inCtx(ch) && chAccepting(ch) && ch.sponsor !== myId() && !chApp(ch);
const chOrgName = pid => (S.orgs.find(o => o.id === P(pid).org) || {}).name || '';
// Everyone else sees the post's alias. The selected team sees the Sponsor's name and organisation only if the Sponsor
// chose to share them when forming the team.
const chKnows = ch => ch.sponsor === myId() || (!!ch.reveal && chTeam(ch).includes(myId()));
const chWho = ch => (chKnows(ch) ? nm(ch.sponsor) + (chOrgName(ch.sponsor) ? ' · ' + h(chOrgName(ch.sponsor)) : '') : h(ch.alias));
const chNm = (ch, pid) => (pid === ch.sponsor ? (chKnows(ch) ? nm(pid) : h(ch.alias)) + ' <span class="cap">(sponsor)</span>' : nm(pid) + (ch.team && pid === ch.team.owner ? ' <span class="cap">(Circle owner)</span>' : ''));
const chLog = (ch, t) => (ch.log = ch.log || []).push({ at: now(), by: myId(), t });
const fmtD = s => fmt(String(s || '').slice(0, 10));
// A short excerpt cut at a word boundary.
const chClip = (s, n) => (String(s || '').length > n ? String(s).slice(0, n).replace(/\s+\S*$/, '') + '…' : String(s || ''));
const chText = s => (s ? h(s).replace(/\n/g, '<br>') : '<span class="cap">—</span>');
const chFacs = ch => [...new Set(S.assign.filter(a => a.ctx === ch.ctx && roleBase(a.role) === 'F' && a.status === 'Active').map(a => a.pid))].filter(p => p !== ch.sponsor);
const chMentors = ch => [...new Set(S.assign.filter(a => a.ctx === ch.ctx && roleBase(a.role) === 'M' && a.status === 'Active').map(a => a.pid))].filter(p => p !== ch.sponsor);
const chIsP = (pid, ch) => roleBase(ctxRole(pid, ch.ctx) || '') === 'P';
// ---- money: committed, stated and confirmed amounts
const chCur = ch => (ch.commit && ch.commit.currency) || ch.currency || 'USD';
const chLive = ch => !!ch.commit && ch.commit.status === 'Confirmed';
const chMsTotal = (ch, skip) => ch.milestones.filter(m => m.id !== skip).reduce((a, m) => a + (+m.amount || 0), 0);
const payRec = (p, side) => (side === 'sponsor' ? p.sp : p.ow);
const payStated = p => +((p.sp || p.ow || {}).amount || 0);
const payLive = p => !['Not established'].includes(p.status);
const chPaid = ch => ch.payments.filter(p => p.status === 'Confirmed').reduce((a, p) => a + (+p.final || 0), 0);
const chPending = ch => ch.payments.filter(p => p.status === 'Pending verification').reduce((a, p) => a + payStated(p), 0);
const msPays = (ch, m) => ch.payments.filter(p => p.ms === m.id && payLive(p));
const MS_LABEL = { Submitted: 'Awaiting sponsor review' };
const msLabel = m => MS_LABEL[m.status] || m.status;
const msPayState = (ch, m) => {
  const ps = msPays(ch, m);
  if (!ps.length) return m.status === 'Approved' ? 'Payment not recorded yet' : '';
  if (ps.some(p => p.status === 'Flagged for review')) return 'Flagged for review';
  if (ps.some(p => p.status === 'Pending verification')) return 'Pending verification';
  return ps.reduce((a, p) => a + (+p.final || 0), 0) >= +m.amount ? 'Paid' : 'Part paid';
};
// ---- disputes
const chDsps = ch => (S.disputes || []).filter(d => d.ch === ch.id);
const dspOpen = d => !['Decided', 'Withdrawn'].includes(d.status);
const dspOn = (ch, kind, id) => chDsps(ch).find(d => d.subject.kind === kind && d.subject.id === id && dspOpen(d)) || null;
// While a person is the independent Steward on an open dispute, the project's identifying records stay hidden from them.
const chHidden = p => !!p && !!p.challenge && (S.disputes || []).some(d => d.ch === p.challenge && d.steward === myId() && dspOpen(d));
// ---- what is waiting for the person signed in (My PHOENIX next action, menu counts)
function chTodo() {
  const out = [];
  const add = (t, s, ch, tab) => out.push([t, h(ch.title) + (s ? ' · ' + s : ''), 'challenge', { id: ch.id, tab }]);
  (S.challenges || [])
    .filter(c => inCtx(c))
    .forEach(ch => {
      const side = chSide(ch);
      if (!side) return;
      const n = ch.apps.filter(a => a.status === 'Submitted').length;
      if (side === 'sponsor' && n && !ch.project && ch.status !== 'Archived') add('Review ' + n + ' new application' + (n > 1 ? 's' : ''), 'people asked to take part', ch, 'apps');
      if (side === 'sponsor' && ch.project && !ch.commit) add('Record the funding commitment', 'execution starts once both sides confirm it', ch, 'agree');
      if (side === 'owner' && ch.commit && ch.commit.status === 'Awaiting owner confirmation') add('Confirm the funding commitment', 'enter the amount you agreed with the sponsor', ch, 'agree');
      if (ch.commit && ch.commit.status === 'Flagged for review') add('Resolve the funding commitment', 'the two figures differ', ch, 'agree');
      ch.milestones.forEach(m => {
        if (m.status === 'Proposed' && !m.ok[side]) add('Review a proposed milestone', h(m.t), ch, 'agree');
        if (m.status === 'Changes requested' && m.by === myId()) add('Revise a milestone', h(m.t), ch, 'agree');
        if (side === 'sponsor' && m.status === 'Submitted' && !dspOn(ch, 'ms', m.id)) add('Review a completed milestone', h(m.t), ch, 'agree');
        if (side === 'owner' && m.status === 'More information requested' && !dspOn(ch, 'ms', m.id)) add('Send what the sponsor asked for', h(m.t), ch, 'agree');
      });
      ch.payments.forEach(p => {
        if (p.status === 'Pending verification' && !payRec(p, side)) add('Confirm a payment', p.ref, ch, 'pay');
      });
    });
  return out;
}

// ---------- LIST ----------
const chHow = () =>
  card(
    'How an open challenge works',
    '',
    `<ol class="ch-how">${[
      ['Post', 'Describe the need on the Explore board. You appear under an alias made for this post.'],
      ['Applications', 'Participants and Partners ask to take part. Review what they share and shortlist.'],
      ['Chat room', 'Every question, clarification and negotiation happens in the challenge’s chat room.'],
      ['Team', 'Form the team’s Circle and start the project in a Circle, Rope Team or Action Room.'],
      ['Commit and agree', 'Commit the full amount, then agree milestones with the Circle owner.'],
      ['Approve and confirm', 'Approve completed milestones. Payments are made offline and confirmed by both sides.'],
    ]
      .map(([t, s], i) => `<li><span class="ch-how-n" aria-hidden="true">${i + 1}</span><div><b>${t}</b><p class="cap">${s}</p></div></li>`)
      .join('')}</ol>`,
    '',
    'ch-how-card',
  );
route('challenges', 'any', () => {
  const r = role();
  if (r === 'S') return chListSponsor();
  if (['P', 'C'].includes(r)) return chListPeople();
  return head('Open challenges', '') + card('', '', empty('megaphone', 'Open challenges are for Sponsors, Participants and Partners', 'Sponsors post challenges on the Explore board; Participants and Partners ask to take part. Disputes about a challenge are handled from Dispute reviews.', L('Back to My PHOENIX', 'home', {}, 'btn btn-s btn-sm')));
});
function chListSponsor() {
  const mine = S.challenges.filter(c => inCtx(c) && c.sponsor === myId());
  return (
    head(
      'Open challenges',
      'Post a challenge under an alias, choose who takes part, then fund agreed milestones. Payments happen offline between you and the project owner; PHOENIX records what both sides confirm.',
      B(ic('plus', 16) + 'Post an open challenge', 'chNew', {}, 'btn-p'),
    ) +
    chHow() +
    card(
      'Your challenges',
      '',
      dataView('ch:mine', {
        label: 'challenges',
        items: mine,
        search: c => [c.title, c.alias, c.problem, c.needs, chStateLabel(c)].join(' '),
        quick: { label: 'Status', options: [...new Set(mine.map(chStateLabel))].map(v => [v, v]), test: (c, v) => chStateLabel(c) === v },
        sorts: [
          ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
          ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
        ],
        defaultSort: 'new',
        row: c => {
          const nNew = c.apps.filter(a => a.status === 'Submitted').length;
          return {
            lead: `<span class="tile t-ember" aria-hidden="true">${ic('megaphone', 18)}</span>`,
            title: L(h(c.title), 'challenge', { id: c.id }, 'dv-link'),
            sub: 'Shown as <b>' + h(c.alias) + '</b>',
            meta: [
              c.apps.filter(a => a.status !== 'Withdrawn').length + ' application' + (c.apps.filter(a => a.status !== 'Withdrawn').length === 1 ? '' : 's') + (nNew ? ' · <b>' + nNew + ' new</b>' : ''),
              c.apps.filter(a => ['Shortlisted', 'Selected'].includes(a.status)).length + ' shortlisted',
              c.project ? 'Circle owner <b>' + nm(c.team.owner) + '</b>' : chAccepting(c) ? 'Requests close ' + fmtD(c.closes) : '',
              c.commit ? 'Commitment ' + h(c.commit.status.toLowerCase()) : '',
            ],
            badges: pill(chStateLabel(c)),
            primary: L('Open', 'challenge', { id: c.id }, 'btn btn-s btn-sm'),
          };
        },
        empty: ['megaphone', 'No open challenges yet', 'Post one to find people for a project you want to fund.', B(ic('plus', 14) + 'Post an open challenge', 'chNew', {}, 'btn-p btn-sm')],
      }),
    )
  );
}
function chListPeople() {
  const all = S.challenges.filter(c => inCtx(c) && c.status !== 'Archived');
  const mine = S.challenges.filter(c => inCtx(c) && chAppAny(c));
  return (
    head('Open challenges', 'Challenges sponsors posted on the Explore board. Each sponsor appears under an alias created for that post. Ask to take part, then talk in the challenge’s chat room.') +
    (mine.length
      ? card(
          'Your applications',
          '',
          table(
            ['Challenge', 'Asked', 'Status', ''],
            mine.map(c => {
              const a = chAppAny(c);
              return [`<b>${h(c.title)}</b><div class="cap">Posted by ${chWho(c)}</div>`, fmtD(a.at), pill(chOnTeam(c) ? (chOwner(c) ? 'Circle owner' : 'Selected') : a.status, chOnTeam(c) ? 'p-green' : ''), L('Open', 'challenge', { id: c.id }, 'btn btn-s btn-sm')];
            }),
          ),
          '',
          'ch-mine',
        ) + '<div class="section-gap"></div>'
      : '') +
    card(
      'Challenges in ' + h(ctxName(ctxId())),
      '',
      dataView('ch:open', {
        label: 'challenges',
        items: all,
        search: c => [c.title, c.alias, c.problem, c.needs, (c.skills || []).join(' '), c.country].join(' '),
        quick: { label: 'Status', options: [['Open', 'Open'], ['closed', 'Not accepting requests']], test: (c, v) => (v === 'Open' ? chAccepting(c) : !chAccepting(c)) },
        sorts: [
          ['closes', 'Closing soonest', (a, b) => String(a.closes).localeCompare(String(b.closes))],
          ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
        ],
        defaultSort: 'closes',
        row: c => ({
          lead: `<span class="tile t-ember" aria-hidden="true">${ic('flag', 18)}</span>`,
          title: L(h(c.title), 'challenge', { id: c.id }, 'dv-link'),
          sub: h((c.needs || '').split('\n')[0].slice(0, 140)),
          meta: ['Posted by <b>' + chWho(c) + '</b>', c.country ? h(c.country) : '', chAccepting(c) ? 'Requests close ' + fmtD(c.closes) : 'Not accepting requests'],
          badges: pill(chStateLabel(c)) + (chApp(c) ? pill(chApp(c).status === 'Submitted' ? 'Applied' : chApp(c).status, 'p-navy') : ''),
          primary: L('View', 'challenge', { id: c.id }, 'btn btn-s btn-sm'),
        }),
        empty: ['flag', 'No open challenges right now', 'Challenges appear here and on the Explore board when a sponsor posts one.', L('Explore board', 'board', {}, 'btn btn-s btn-sm')],
      }),
    )
  );
}

// ---------- POST AND EDIT A CHALLENGE (point 1) ----------
A.chNew = d => {
  const ch = d.id && chById(d.id);
  clearF('chn');
  UI.chAlias = ch ? ch.alias : chAlias('Sponsor');
  UI.form.chn = ch
    ? { id: ch.id, title: ch.title, problem: ch.problem, objectives: ch.objectives, outcomes: ch.outcomes, needs: ch.needs, skills: (ch.skills || []).join(', '), country: ch.country, area: ch.area || '', budget: ch.budget || '', currency: ch.currency || 'USD', closes: ch.closes }
    : { currency: 'USD', country: ctxCountry(ctxId()) };
  modal(
    ch ? 'Edit the challenge' : 'Post an open challenge',
    () =>
      `<form data-f="chn" class="col fgap" novalidate>${errSum('chn')}<input type="hidden" name="id" value="${ch ? ch.id : ''}"><div class="ch-alias-box">${ic('shield', 18)}<div><b>This post shows as <span class="ch-alias">${h(UI.chAlias)}</span></b><p class="cap">The alias is made for this post only. Your name, organisation and contact details never appear on the post, in its chat room or in notices to applicants.</p></div></div>${fi('chn', 'title', 'Challenge title', { req: true, max: 120, ph: 'e.g. Low-cost shade for market stalls' })}${fi('chn', 'problem', 'Requirements and problem', { type: 'textarea', rows: 4, req: true, max: 3000, help: 'What needs solving, for whom, and any constraints. At least 40 characters.' })}<div class="f2">${fi('chn', 'objectives', 'Objectives', { type: 'textarea', rows: 3, req: true, max: 2000 })}${fi('chn', 'outcomes', 'Expected outcomes', { type: 'textarea', rows: 3, req: true, max: 2000 })}</div>${fi('chn', 'needs', 'Specific needs', { type: 'textarea', rows: 3, req: true, max: 2000, ph: 'Skills, resources, time commitment, permissions', help: 'Applicants read this to decide whether to take part.' })}${fi('chn', 'skills', 'Areas or skills (optional)', { ph: 'Comma-separated, e.g. Design, Community engagement' })}<div class="f2">${countryField('chn')}${fi('chn', 'area', 'Location or area (optional)', { ph: 'e.g. Ward 4 market' })}</div><div class="f2">${fi('chn', 'budget', 'Indicative budget (optional)', { type: 'number', min: 0, step: '1', help: 'A guide for applicants. The full amount is agreed with the team and committed before work starts.' })}${fi('chn', 'currency', 'Currency', { type: 'select', opts: CH_CUR })}</div>${fi('chn', 'closes', 'Applications close on', { type: 'date', req: true, help: 'You can stop new applications earlier.' })}${banner('info', 'Payments stay offline', 'PHOENIX has no payment gateway. It never processes, holds or transfers money. Payments you make to the project owner are recorded only when both of you confirm them.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${ch ? 'Save changes' : 'Post to the Explore board'}</button></div></form>`,
    true,
  );
};
A.chEdit = d => A.chNew(d);
F.chn = d => {
  if (
    !validate('chn', d, {
      title: ['req'],
      problem: ['req', ['min', 40]],
      objectives: ['req', ['min', 20]],
      outcomes: ['req', ['min', 20]],
      needs: ['req', ['min', 10]],
      country: countryRules(),
      budget: [['fn', { f: v => !v || +v >= 0, m: 'Enter an amount of 0 or more, or leave it empty.' }]],
      closes: ['req', 'date'],
    })
  )
    return render();
  const f = {
    title: d.title.trim(),
    problem: d.problem.trim(),
    objectives: d.objectives.trim(),
    outcomes: d.outcomes.trim(),
    needs: d.needs.trim(),
    skills: [...new Set((d.skills || '').split(',').map(x => x.trim().slice(0, 40)).filter(Boolean))],
    country: d.country,
    area: (d.area || '').trim(),
    budget: d.budget ? +d.budget : null,
    currency: d.currency || 'USD',
    closes: d.closes,
  };
  let ch = d.id && chById(d.id);
  if (ch) {
    Object.assign(ch, f);
    chRoom(ch).name = 'Challenge · ' + ch.title;
    sysMsg(chRoom(ch), 'The sponsor updated the challenge description.');
    chLog(ch, 'Post edited');
    audit('Open challenge edited', ch.id, '');
    toast('Challenge updated.');
  } else {
    const alias = S.challenges.some(c => c.alias === UI.chAlias) ? chAlias('Sponsor') : UI.chAlias;
    ch = { id: uid('ch'), ctx: ctxId(), sponsor: myId(), alias, ...f, status: 'Open', at: now(), apps: [], milestones: [], payments: [], commit: null, team: null, project: null, reveal: false, log: [] };
    const rm = { id: uid('chr'), ctx: ch.ctx, challenge: ch.id, sponsor: myId(), alias, name: 'Challenge · ' + ch.title, state: 'Active', members: [{ pid: myId(), role: 'Sponsor', status: 'Active' }], chat: [] };
    sysMsg(rm, 'Chat room for the open challenge “' + ch.title + '”. Everyone who asks to take part joins here. The sponsor appears as ' + alias + '.');
    ch.room = rm.id;
    S.challenges.push(ch);
    S.chrooms.push(rm);
    chLog(ch, 'Posted to the Explore board as ' + alias);
    audit('Open challenge posted', ch.id, alias);
    toast('Posted to the Explore board as ' + alias + '.');
  }
  UI.modal = null;
  clearF('chn');
  save();
  go('challenge', { id: ch.id });
};
// ---- close, reopen and archive the post (point 5). The selection chat room closes once selection is over: when the
// post is archived, or when new requests stop after the team is formed.
function chSetState(ch, v) {
  ch.status = v;
  if (v === 'Archived')
    ch.apps
      .filter(a => ['Submitted', 'Shortlisted'].includes(a.status))
      .forEach(a => {
        a.status = 'Not selected';
        a.log.push({ at: now(), by: myId(), t: 'Challenge archived' });
        notify(a.pid, 'The open challenge “' + ch.title + '” was archived by ' + ch.alias + '. You were not selected.', 'challenge', { id: ch.id });
      });
  const rm = chRoom(ch);
  if (rm && rm.state === 'Active' && (v === 'Archived' || (v === 'Requests closed' && ch.project))) {
    rm.state = 'Closed';
    rm.closedAt = now();
    sysMsg(rm, 'Selection is complete. This chat room is closed for further discussion. It stays readable for the people who took part, under the programme’s data-retention rules.');
    rm.members.filter(m => m.status === 'Active' && m.pid !== myId()).forEach(m => notify(m.pid, 'The chat room for “' + ch.title + '” is now closed', 'challenge', { id: ch.id, tab: 'chat' }));
  }
}
A.chState = d => {
  const ch = chById(d.id);
  chSetState(ch, d.v);
  chLog(ch, { Open: 'New applications reopened', 'Requests closed': 'New applications stopped', Archived: 'Post archived and removed from the Explore board' }[d.v]);
  audit('Open challenge ' + d.v.toLowerCase(), ch.id, '');
  toast({ Open: 'Applications are open again.', 'Requests closed': 'No new applications will be accepted.', Archived: 'Post archived. It no longer appears on the Explore board.' }[d.v]);
  ok();
};

// ---------- DETAIL ----------
const chGone = () =>
  head('Open challenge', '') +
  card('', '', empty('megaphone', 'This challenge is not available to you', 'It may have been archived, or it belongs to another programme. Open challenges are posted for Participants and Partners, and their agreements are visible only to the sponsor and the selected team.', L('Open challenges', 'challenges', {}, 'btn btn-s btn-sm')));
route('challenge', 'any', () => {
  const ch = chById(UI.p.id);
  if (!chVisible(ch)) return chGone();
  const mine = chMine(ch);
  const team = chOnTeam(ch);
  const rm = chRoom(ch);
  const inRoom = rm && (memberOf(rm) || (memberRec(rm) || {}).status === 'Ended');
  const todo = chTodo().filter(x => x[3].id === ch.id);
  const tn = k => todo.filter(x => x[3].tab === k).length || null;
  const t = tabs(
    'ch_' + ch.id,
    [
      ['overview', 'Challenge'],
      mine && ['apps', 'Applications', ch.project ? null : ch.apps.filter(a => a.status === 'Submitted').length || null],
      (mine || inRoom) && ['chat', 'Chat room', rm && memberOf(rm) && unreadIn(rm) ? unreadIn(rm) : null],
      (mine || (ch.project && team)) && ['team', 'Team & project'],
      ch.project && (mine || team) && ['agree', 'Funding & milestones', tn('agree')],
      ch.project && (mine || team) && ['pay', 'Payments', tn('pay')],
      ch.project && chParty(ch) && ['dsp', 'Disputes', chDsps(ch).filter(dspOpen).length || null],
    ],
    UI.p.tab,
  );
  const body = { overview: chOverview, apps: chApps, chat: chChat, team: chTeamTab, agree: chAgree, pay: chPays, dsp: chDspTab }[t.cur](ch);
  return chHead(ch) + t.html + `<div class="ch-body">${body}</div>`;
});
function chHead(ch) {
  let acts = '';
  if (chMine(ch) && ch.status !== 'Archived') {
    if (!ch.project) acts += B(ic('edit', 14) + 'Edit', 'chEdit', { id: ch.id });
    if (ch.status === 'Open') acts += CB('Stop new applications', 'chState', { id: ch.id, v: 'Requests closed' }, ch.project ? 'Stop new applications? The selection chat room closes and stays readable for the people who took part.' : 'Stop new applications? You can still review, shortlist and form the team, and you can reopen applications later.');
    else if (!ch.project) acts += B('Reopen applications', 'chState', { id: ch.id, v: 'Open' });
    acts += CB(ic('archive', 14) + 'Archive post', 'chState', { id: ch.id, v: 'Archived' }, 'Archive this post? It leaves the Explore board, the selection chat room closes, and anyone not yet selected is told.' + (ch.project ? ' The project, milestones and payments are not affected.' : ''), 'btn-s btn-sm', 'Archive post');
  }
  const a = chApp(ch);
  if (!chMine(ch) && chCanApply(ch)) acts += B(ic('send', 14) + 'Ask to take part', 'chApply', { id: ch.id }, 'btn-p btn-sm');
  if (a && !ch.project && ['Submitted', 'Shortlisted'].includes(a.status)) acts += CB('Withdraw', 'chWithdraw', { id: ch.id }, 'Withdraw your application? You leave the chat room. You can apply again while applications are open.');
  return (
    crumbsHtml([['Open challenges', 'challenges'], [h(ch.title)]]) +
    `<div class="shead-main ch-head"><span class="tile t-ember" aria-hidden="true">${ic('megaphone', 20)}</span><div class="shead-t"><div class="shead-kind">Open challenge · posted by ${chMine(ch) ? 'you · others see ' : ''}<span class="ch-alias">${ic('shield', 12)}${chMine(ch) ? h(ch.alias) : chWho(ch)}</span></div><div class="row wrap prj-ttl"><h1 class="h1">${h(ch.title)}</h1>${pill(chStateLabel(ch))}${a && !chOnTeam(ch) ? pill(a.status === 'Submitted' ? 'Applied' : a.status, 'p-navy') : ''}${chOnTeam(ch) ? pill(chOwner(ch) ? 'You are the Circle owner' : 'You are on the team', 'p-green') : ''}</div><div class="shead-meta"><span>Posted ${fmtD(ch.at)}</span><span>${chAccepting(ch) ? 'Applications close ' + fmtD(ch.closes) : 'Not accepting applications'}</span>${ch.country ? `<span>Country · ${h(ch.country)}</span>` : ''}${ch.budget ? `<span>Indicative budget · ${money(ch.currency, ch.budget)}</span>` : ''}</div></div>${acts ? `<div class="shead-a">${acts}</div>` : ''}</div>`
  );
}
// How the post reads on the Explore board (the board itself builds the same item in freeze.js).
const chBoardSub = ch => h(chClip((ch.needs || '').split('\n')[0], 120)) + ' · ' + (chAccepting(ch) ? 'applications close ' + fmtD(ch.closes) : 'not accepting applications');
function chOverview(ch) {
  const main = card(
    'The challenge',
    'What the sponsor needs, why, and what success looks like.',
    dl([
      ['Requirements and problem', chText(ch.problem)],
      ['Objectives', chText(ch.objectives)],
      ['Expected outcomes', chText(ch.outcomes)],
      ['Specific needs', chText(ch.needs)],
      (ch.skills || []).length && ['Areas or skills', `<span class="rec-tags">${ch.skills.map(x => `<span class="rec-tag">${h(x)}</span>`).join('')}</span>`],
      ['Where', h(ch.country || '—') + (ch.area ? ' · ' + h(ch.area) : '')],
      ch.budget && ['Indicative budget', money(ch.currency, ch.budget) + '<div class="cap">The full amount is agreed with the team and committed before work starts.</div>'],
      ['Applications close', fmtD(ch.closes)],
    ]),
    '',
    'ch-post',
  );
  return hmCols(main, chMine(ch) ? chIdentity(ch) + chActivity(ch) : chTakePart(ch));
}
function chIdentity(ch) {
  return (
    card(
      'Your identity on this post',
      '',
      `<p class="muted">Everyone else sees <span class="ch-alias">${ic('shield', 12)}${h(ch.alias)}</span>. Your name, organisation and contact details are not shown on the post, in the chat room or in notices to applicants.</p>${ch.project ? `<p class="cap">${ch.reveal ? 'You shared your name and organisation with the selected team.' : 'The selected team also sees your alias.'}</p>` : ''}`,
      '',
      'ch-id',
    ) +
    card(
      'On the Explore board',
      ch.status === 'Archived' ? 'Archived: no longer shown.' : 'How Participants and Partners see your post.',
      `<article class="board-i ch-prev"><span class="tile t-ember" aria-hidden="true">${ic('flag', 18)}</span><div class="col board-b"><span class="over">Open challenge</span><b>${h(ch.title)}</b><span class="cap">${chBoardSub(ch)}</span><span class="cap board-src">${ic('shield', 12)}Posted by ${h(ch.alias)}</span></div></article>`,
    )
  );
}
function chActivity(ch) {
  return card(
    'Activity',
    'Kept with the challenge',
    (ch.log || []).length ? `<ol class="mtl ws-tl">${ch.log.slice().reverse().slice(0, 12).map(l => `<li class="done"><span class="mtl-dot">${ic('check', 12)}</span><div class="col"><b>${h(l.t)}</b><span class="cap">${fmtD(l.at)}</span></div></li>`).join('')}</ol>` : '<p class="cap">No activity yet.</p>',
  );
}
function chTakePart(ch) {
  const a = chAppAny(ch);
  let c;
  if (chOnTeam(ch))
    c = card(
      'You are on the team',
      '',
      `<p class="muted">${chOwner(ch) ? 'You are the Circle owner. You agree milestones, submit completed work and confirm payments for the team.' : 'You were selected. The Circle owner agrees milestones and confirms payments for the team.'}</p>${dl([
        ['Project', chProj(ch) ? (chOwner(ch) ? L(h(chProj(ch).title), 'project', { id: ch.project }) : h(chProj(ch).title)) : '—'],
        ['Team Circle', byId('circles', ch.team.circle) ? L(h(byId('circles', ch.team.circle).name), 'circle', { id: ch.team.circle }) : '—'],
      ])}`,
      B('Funding & milestones', 'tab', { k: 'ch_' + ch.id, v: 'agree' }, 'btn-p btn-sm'),
      'ch-take',
    );
  else if (a && a.status !== 'Withdrawn')
    c = card(
      'Your application',
      '',
      dl([
        ['Status', pill(a.status === 'Submitted' ? 'Applied' : a.status, a.status === 'Submitted' ? 'p-navy' : '')],
        ['Sent', fmtD(a.at)],
        ['Availability', h(a.avail)],
        ['Profile summary', a.share ? 'Shared with the sponsor' : 'Not shared'],
      ]) +
        `<p class="cap">${{ Submitted: 'The sponsor reviews applications and shortlists people. Ask questions in the chat room.', Shortlisted: 'You are shortlisted. The sponsor forms the team from the shortlist.', 'Not selected': 'You were not selected this time. The chat room stays readable for you.', Selected: 'You were selected.' }[a.status] || ''}</p>`,
      chRoom(ch) && memberOf(chRoom(ch)) ? B(ic('message', 14) + 'Chat room', 'tab', { k: 'ch_' + ch.id, v: 'chat' }) : '',
      'ch-take',
    );
  else
    c = card(
      'Take part',
      '',
      chCanApply(ch)
        ? `<p class="muted">Tell the sponsor what you would bring. You then join the challenge’s chat room, where every question and discussion about it takes place.</p>`
        : `<p class="muted">${a && a.status === 'Withdrawn' ? 'You withdrew your application.' : ''} This challenge is not accepting applications${['P', 'C'].includes(role()) ? '' : ' from your role'}.</p>`,
      chCanApply(ch) ? B(ic('send', 14) + 'Ask to take part', 'chApply', { id: ch.id }, 'btn-p btn-sm') : '',
      'ch-take',
    );
  return c + banner('info', 'Who posted this', 'The sponsor appears as <b>' + h(ch.alias) + '</b>, an alias made for this post. Their name and organisation are not shown.', 'shield');
}

// ---------- APPLICATIONS (point 2) ----------
A.chApply = d => {
  const ch = chById(d.id);
  clearF('cha');
  modal(
    'Ask to take part',
    () =>
      `<form data-f="cha" class="col fgap" novalidate>${errSum('cha')}<input type="hidden" name="id" value="${ch.id}">${dl([
        ['Challenge', h(ch.title)],
        ['Posted by', h(ch.alias)],
      ])}${fi('cha', 'pitch', 'What you would bring to this challenge', { type: 'textarea', rows: 4, req: true, max: 2000, help: 'At least 40 characters. The sponsor reads this when shortlisting.' })}${fi('cha', 'exp', 'Relevant experience', { type: 'textarea', rows: 3, req: true, max: 2000, help: 'Projects, skills or evidence that show you can do this.' })}${fi('cha', 'avail', 'Availability', { type: 'select', req: true, ph: 'Select', opts: CH_AVAIL })}${fi('cha', 'share', 'Share my profile summary with this challenge’s sponsor: my bio, the profile claims I made discoverable, and how many approved evidence items and completed projects I have', { type: 'checkbox' })}<p class="cap">Optional. Nothing else from your profile, pathway, Purpose Compass or private spaces is shared.</p>${banner('info', 'What happens next', 'You join the challenge’s chat room, where all questions and discussion take place. The sponsor shortlists people and forms the project team. You can withdraw until the team is formed.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Send application</button></div></form>`,
    true,
  );
};
// A person who asks to take part joins the chat room; it is the only channel for the challenge.
function chRoomJoin(ch, pid) {
  const rm = chRoom(ch);
  const m = memberRec(rm, pid);
  if (m) Object.assign(m, { status: 'Active', role: 'Applicant' });
  else rm.members.push({ pid, role: 'Applicant', status: 'Active' });
  sysMsg(rm, P(pid).name + ' asked to take part and joined the chat room');
}
F.cha = d => {
  if (!validate('cha', d, { pitch: ['req', ['min', 40]], exp: ['req', ['min', 20]], avail: ['req'] })) return render();
  const ch = chById(d.id);
  const prev = chAppAny(ch);
  const rec = { pid: myId(), at: now(), pitch: d.pitch.trim(), exp: d.exp.trim(), avail: d.avail, share: d.share === 'yes', status: 'Submitted', rating: null, note: '' };
  if (prev) {
    Object.assign(prev, rec);
    prev.log.push({ at: now(), by: myId(), t: 'Applied again' });
  } else ch.apps.push({ id: uid('cap'), ...rec, log: [{ at: now(), by: myId(), t: 'Applied' }] });
  chRoomJoin(ch, myId());
  notify(ch.sponsor, me().name + ' asked to take part in “' + ch.title + '”', 'challenge', { id: ch.id, tab: 'apps' });
  chLog(ch, me().name + ' applied');
  audit('Open challenge application sent', ch.id, d.share === 'yes' ? 'profile summary shared' : 'profile summary not shared');
  UI.modal = null;
  clearF('cha');
  toast('Application sent. You have joined the challenge’s chat room.');
  ok();
};
A.chWithdraw = d => {
  const ch = chById(d.id);
  const a = chApp(ch);
  a.status = 'Withdrawn';
  a.log.push({ at: now(), by: myId(), t: 'Withdrew' });
  const m = memberRec(chRoom(ch));
  if (m) m.status = 'Left';
  sysMsg(chRoom(ch), me().name + ' withdrew and left the chat room');
  notify(ch.sponsor, me().name + ' withdrew from “' + ch.title + '”', 'challenge', { id: ch.id, tab: 'apps' });
  chLog(ch, me().name + ' withdrew');
  audit('Open challenge application withdrawn', ch.id, '');
  toast('Application withdrawn.');
  ok();
};
function chApps(ch) {
  const n = s => ch.apps.filter(a => a.status === s).length;
  const kpi = (l, v) => `<div class="kpi"><span class="lt">${l}</span><span class="fig">${v}</span></div>`;
  const sts = ['Submitted', 'Shortlisted', 'Selected', 'Not selected', 'Withdrawn'].filter(s => n(s));
  return (
    `<div class="kpis ch-kpis">${kpi('New', n('Submitted'))}${kpi('Shortlisted', n('Shortlisted') + n('Selected'))}${kpi('Not selected', n('Not selected'))}${kpi('Withdrawn', n('Withdrawn'))}</div>` +
    card(
      'Applications',
      'Read what each person wrote and what they chose to share, rate the fit and shortlist. Your ratings and notes are visible only to you.',
      dataView('ch:apps:' + ch.id, {
        label: 'applications',
        items: ch.apps,
        search: a => [P(a.pid).name, a.pitch, a.exp, a.status].join(' '),
        quick: { label: 'Status', options: sts.map(v => [v, v === 'Submitted' ? 'New' : v]), test: (a, v) => a.status === v },
        sorts: [
          ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
          ['rating', 'Best fit first', (a, b) => (b.rating || 0) - (a.rating || 0)],
        ],
        defaultSort: 'new',
        row: a => ({
          lead: `<span class="av" aria-hidden="true">${ini(a.pid)}</span>`,
          title: nm(a.pid),
          sub: h(ROLE[ctxRole(a.pid, ch.ctx)] || '') + (chOrgName(a.pid) ? ' · ' + h(chOrgName(a.pid)) : ''),
          meta: ['Applied ' + fmtD(a.at), h(a.avail), a.rating ? 'Fit <b>' + a.rating + ' of 5</b>' : 'Not rated', a.share ? 'Profile summary shared' : 'Profile not shared'],
          badges: pill(a.status === 'Submitted' ? 'New' : a.status, a.status === 'Submitted' ? 'p-navy' : ''),
          primary: B(a.status === 'Submitted' ? 'Review' : 'Open', 'chAppView', { id: ch.id, app: a.id }, a.status === 'Submitted' ? 'btn-p btn-sm' : 'btn-s btn-sm'),
        }),
        empty: ['users', 'No applications yet', 'Participants and Partners apply from the Explore board or the Open challenges page.', ''],
      }),
    ) +
    (!ch.project && n('Shortlisted') ? banner('ok', n('Shortlisted') + ' shortlisted', 'When you are ready, form the team from ' + L('Team & project', 'challenge', { id: ch.id, tab: 'team' }) + '.') : '')
  );
}
// What a person chose to share: their bio, discoverable profile claims, and counts of approved evidence and closed projects.
function chProfile(a) {
  if (!a.share) return banner('info', 'Profile summary not shared', 'This person chose not to share a profile summary. Judge the application on what they wrote, and ask questions in the chat room.');
  const pr = (S.profiles || {})[a.pid] || {};
  const cl = S.claims.filter(c => c.pid === a.pid && c.state === 'Current' && c.vis === 'Authorised discovery');
  const ev = S.evidence.filter(e => e.owner === a.pid && e.review === 'Approved').length;
  const done = S.projects.filter(p => p.owner === a.pid && p.stage === 'Closed').length;
  return card(
    'Profile summary shared with you',
    'Shared by the applicant for this challenge only',
    dl([
      ['Bio', pr.bio ? h(pr.bio) : '<span class="cap">No bio</span>'],
      ['Discoverable claims', cl.length ? cl.map(c => h(c.field) + ': ' + h(c.value) + ` <span class="cap">(${h(c.prov)})</span>`).join('<br>') : '<span class="cap">None</span>'],
      ['Approved evidence', ev + ' item' + (ev === 1 ? '' : 's')],
      ['Completed projects', String(done)],
    ]),
    '',
    'quiet ch-prof',
  );
}
A.chAppView = d => {
  const ch = chById(d.id);
  // the application id travels as data-app: "data-a" is the button's own action attribute
  const a = ch.apps.find(x => x.id === d.app);
  if (!a) return;
  clearF('chev');
  UI.form.chev = { rating: a.rating ? String(a.rating) : '', note: a.note || '' };
  const locked = !!ch.project || ['Withdrawn', 'Selected'].includes(a.status);
  modal(
    'Application from ' + nm(a.pid),
    () =>
      `<div class="col fgap">${dl([
        ['Status', pill(a.status === 'Submitted' ? 'New' : a.status, a.status === 'Submitted' ? 'p-navy' : '')],
        ['Role', h(ROLE[ctxRole(a.pid, ch.ctx)] || '—') + (chOrgName(a.pid) ? ' · ' + h(chOrgName(a.pid)) : '')],
        ['Applied', fmtD(a.at)],
        ['Availability', h(a.avail)],
        ['What they would bring', chText(a.pitch)],
        ['Relevant experience', chText(a.exp)],
      ])}${chProfile(a)}${
        locked
          ? a.note || a.rating
            ? dl([['Your fit rating', a.rating ? a.rating + ' of 5' : '—'], ['Your notes', chText(a.note)]])
            : ''
          : `<form data-f="chev" class="col fgap ch-eval" novalidate><input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="app" value="${a.id}"><h3 class="h3">Your evaluation</h3><div class="f2">${fi('chev', 'rating', 'Fit with your requirements', { type: 'select', ph: 'Not rated', opts: [['5', '5 · Excellent fit'], ['4', '4 · Strong fit'], ['3', '3 · Possible fit'], ['2', '2 · Weak fit'], ['1', '1 · Poor fit']] })}</div>${fi('chev', 'note', 'Your notes (only you see these)', { type: 'textarea', rows: 3, max: 2000 })}<div class="actions"><button class="btn btn-s" type="submit" name="v" value="save">Save evaluation</button><div class="row wrap">${a.status !== 'Not selected' ? '<button class="btn btn-s" type="submit" name="v" value="Not selected">Not selected</button>' : ''}${a.status !== 'Shortlisted' ? '<button class="btn btn-p" type="submit" name="v" value="Shortlisted">Shortlist</button>' : ''}</div></div></form>`
      }<details class="ws-done"><summary class="cap">Activity</summary><ol class="mtl ws-tl">${a.log
        .slice()
        .reverse()
        .map(l => `<li class="done"><span class="mtl-dot">${ic('check', 12)}</span><div class="col"><b>${h(l.t)}</b><span class="cap">${fmtD(l.at)}</span></div></li>`)
        .join('')}</ol></details></div>`,
    true,
  );
};
F.chev = d => {
  const ch = chById(d.id);
  const a = ch.apps.find(x => x.id === d.app);
  a.rating = d.rating ? +d.rating : null;
  a.note = (d.note || '').trim();
  if (['Shortlisted', 'Not selected'].includes(d.v) && d.v !== a.status) {
    a.status = d.v;
    a.log.push({ at: now(), by: myId(), t: d.v === 'Shortlisted' ? 'Shortlisted' : 'Marked not selected' });
    notify(a.pid, d.v === 'Shortlisted' ? ch.alias + ' shortlisted you for “' + ch.title + '”. Discussion continues in the chat room.' : ch.alias + ' did not shortlist you for “' + ch.title + '”.', 'challenge', { id: ch.id });
    chLog(ch, P(a.pid).name + ': ' + d.v.toLowerCase());
    audit('Open challenge application ' + d.v.toLowerCase(), ch.id, a.pid);
    toast(P(a.pid).name + (d.v === 'Shortlisted' ? ' shortlisted.' : ' marked not selected.'));
  } else toast('Evaluation saved.');
  UI.modal = null;
  clearF('chev');
  ok();
};

// ---------- CHAT ROOM (point 3) ----------
function chChat(ch) {
  const rm = chRoom(ch);
  return (
    (rm.state === 'Active'
      ? banner('info', 'One place for every discussion', 'Questions, clarifications, negotiation and coordination about this challenge happen here, and are kept with it. The sponsor and everyone who applied see every message. The sponsor appears as ' + h(ch.alias) + '.')
      : banner('info', 'Chat room closed', 'Selection is complete, so the room no longer takes new messages. It stays readable for the people who took part, under the programme’s data-retention rules. Project work continues in the team’s Circle.')) +
    '<div class="section-gap"></div>' +
    chatThread('chrooms', rm, { embedded: true })
  );
}

// ---------- TEAM AND ENTRY ROOM (point 4) ----------
function chTeamTab(ch) {
  if (!ch.project) {
    const sl = ch.apps.filter(a => a.status === 'Shortlisted');
    return card(
      'Form the project team',
      'Choose people from your shortlist and the Circle owner who acts for the team. Their Circle is created, and the project starts in the Circle, Rope Team or Action Room that fits its entry-level needs.',
      sl.length
        ? sl.map(a => lrow('user', nm(a.pid), h(ROLE[ctxRole(a.pid, ch.ctx)] || '') + (a.rating ? ' · fit ' + a.rating + ' of 5' : ''), pill('Shortlisted'))).join('')
        : empty('users', 'Shortlist people first', 'Review applications and shortlist at least one person.', B('Review applications', 'tab', { k: 'ch_' + ch.id, v: 'apps' }, 'btn-p btn-sm')),
      sl.length && chMine(ch) ? B(ic('users', 14) + 'Form the team and start the project', 'chForm', { id: ch.id }, 'btn-p btn-sm') : '',
      'ch-team',
    );
  }
  const p = chProj(ch);
  const sp = SPACE_KINDS.map(k => [k, projSpace(p, k)]).filter(([, o]) => o);
  const c = byId('circles', ch.team.circle);
  const st = pid => (memberRec(c, pid) || {}).status || '—';
  const open = (k, o) => (!chMine(ch) && canOpenSpace(k, o) ? L(h(o.name), OBJ_ROUTE[k], { id: o.id }) : h(o.name));
  return hmCols(
    card(
      'Project team',
      'Formed ' + fmtD(ch.team.formedAt),
      dl([
        ['Project', chOwner(ch) ? L(h(p.title), 'project', { id: p.id }) : h(p.title)],
        ['Circle owner', nm(ch.team.owner) + '<div class="cap">Owns the project and its Circle; agrees milestones and confirms payments for the team.</div>'],
        ['Team members', chTeam(ch).filter(x => x !== ch.team.owner).map(x => nm(x) + ' ' + pill(st(x) === 'Active' ? 'Joined' : st(x), st(x) === 'Active' ? 'p-green' : '')).join('<br>') || '<span class="cap">Only the Circle owner</span>'],
        ['Circle facilitator', nm(ch.team.facilitator)],
        ['Started in', h(projRoomLabel(projRoomOf(ch.team.entry)))],
        ch.team.mentor && ['Rope Team mentor', nm(ch.team.mentor)],
        ['Where it is now', projHere(p) ? h(projRoomLabel(projHere(p))) + (projSpace(p, projHere(p).kind) ? ' · ' + h(projSpace(p, projHere(p).kind).name) : '') : 'Not started'],
      ]),
      '',
      'ch-team',
    ) +
      card(
        'The project’s spaces',
        'Separate, linked spaces. The project moves between them in any order.',
        sp.map(([k, o]) => lrow(OBJ_ICON[k], open(k, o), OBJ_LABEL(k) + ' · ' + h(o.state), '', OBJ_TILE[k])).join(''),
      ),
    banner('info', chMine(ch) ? 'You are not a member of the team’s spaces' : 'Working with the sponsor', chMine(ch) ? 'You follow the work through milestones, completion submissions and payments. The team’s Circle, Rope Team and Action Room stay private to their members.' : 'The sponsor is not a member of your Circle, Rope Team or Action Room. They see milestones, completion submissions and payments only.'),
  );
}
A.chForm = d => {
  const ch = chById(d.id);
  clearF('chf');
  const sl = ch.apps.filter(a => a.status === 'Shortlisted');
  UI.form.chf = { title: ch.title, m: sl.map(a => a.pid), owner: (sl.find(a => chIsP(a.pid, ch)) || {}).pid || '', fac: chFacs(ch)[0] || '', entry: 'circles', mentor: '', reveal: '', close: 'yes' };
  modal(
    'Form the team and start the project',
    () => {
      const entry = fv('chf', 'entry', 'circles');
      const sel = [].concat(fv('chf', 'm', []));
      return `<form data-f="chf" class="col fgap" novalidate>${errSum('chf')}<input type="hidden" name="id" value="${ch.id}">${fi('chf', 'title', 'Project title', { req: true, max: 120 })}<fieldset class="np-fs col"><legend class="lbl">Team members <span class="req">*</span></legend>${chkGroup(
        'm',
        sl.map(a => [a.pid, nm(a.pid) + ` <span class="cap">· ${h(ROLE[ctxRole(a.pid, ch.ctx)] || '')}${a.rating ? ' · fit ' + a.rating + ' of 5' : ''}</span>`]),
        sel,
      )}${fe('chf', 'm') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('chf', 'm')}</span>` : ''}<span class="help">Each person you choose is invited to the team’s Circle and joins when they accept. Shortlisted people you leave out are told they were not selected.</span></fieldset><div class="f2">${fi('chf', 'owner', 'Circle owner', { type: 'select', req: true, ph: 'Choose one of the team', opts: sl.map(a => [a.pid, P(a.pid).name + ' · ' + (ROLE[ctxRole(a.pid, ch.ctx)] || '')]), help: 'Owns the project and its Circle, agrees milestones and confirms payments for the team. Must be a Participant in this programme.' })}${fi('chf', 'fac', 'Circle facilitator (Faculty/Steward)', { type: 'select', req: true, ph: 'Choose', opts: chFacs(ch).map(x => [x, P(x).name]), help: 'Facilitates the Circle and acts as the project’s Steward. Not the independent Steward used for disputes.' })}</div><fieldset class="np-fs col"><legend class="lbl">Start the project in <span class="req">*</span></legend><div class="pmv-opts">${CH_ENTRY.map(([k, l, i, t, s]) => `<label class="choice np-choice pmv-opt ${entry === k ? 'sel' : ''}"><input type="radio" name="entry" value="${k}" ${entry === k ? 'checked' : ''} data-ch="chfRedraw"><span class="rad" aria-hidden="true"></span><span class="tile ${t}" aria-hidden="true">${ic(i, 16)}</span><span class="col pmv-t"><b>${k === 'rooms' ? WL() : l}</b><span class="cap">${s}</span></span></label>`).join('')}</div>${fe('chf', 'entry') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('chf', 'entry')}</span>` : ''}<span class="help">The team’s Circle is always created. The project starts in the room you choose and can move between rooms afterwards.</span></fieldset>${entry === 'ropes' ? fi('chf', 'mentor', 'Rope Team mentor', { type: 'select', req: true, ph: 'Choose a mentor', opts: chMentors(ch).map(x => [x, P(x).name]), help: 'Invited to the Rope Team; joins when they accept.' }) : ''}${fi('chf', 'reveal', 'Share my name and organisation with the selected team', { type: 'checkbox' })}<p class="cap">Optional. Most teams need to know who is paying to arrange payments offline. Applicants who are not selected, and everyone else, keep seeing ${h(ch.alias)}.</p>${fi('chf', 'close', 'Stop new applications and close the selection chat room now', { type: 'checkbox' })}<p class="cap">You can also do this later from the challenge.</p><div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Form the team</button></div></form>`;
    },
    true,
  );
};
// Keeps every field, including the checked team members, while the starting room changes.
A.chfRedraw = (d, el) => {
  const f = {};
  new FormData(el.form).forEach((v, k) => (k === 'm' ? (f.m = [].concat(f.m || [], v)) : (f[k] = v)));
  f.m = f.m || [];
  UI.form.chf = f;
  render();
};
// Links the sponsor creates show the post's alias as their author, never the sponsor's name.
const chLink = (ch, k, id, pid, type) => {
  const l = addLink(k, id, 'projects', pid, type, true);
  if (l) l.byLabel = ch.alias;
};
const chMembers = (others, role_) => others.map(pid => ({ pid, role: role_, status: 'Invited' }));
function chMkCircle(ch, p, owner, fac, others) {
  const c = { id: uid('ci'), ctx: ch.ctx, name: p.title + ' Circle', purpose: 'Agree scope and plan for “' + p.title + '”, formed from an open challenge.', outcome: ch.outcomes, owner, facilitator: fac, project: p.id, origin: { type: 'Project', id: p.id }, visibility: 'Members only', docs: [], state: 'Active', agreement: 'Circle working agreement v1', members: [{ pid: owner, role: 'Project owner', status: 'Active' }, { pid: fac, role: 'Facilitator', status: 'Active' }, ...chMembers(others, 'Member')], chat: [], sessions: [], reflections: [], commitments: [], concerns: [], decisions: [], polls: [], pause: null, createdBy: owner };
  S.circles.push(c);
  chLink(ch, 'circles', c.id, p.id, 'originated-from');
  p.circle = c.id;
  sysMsg(c, 'Circle formed from the open challenge “' + ch.title + '”. Sponsor: ' + ch.alias + '.');
  notify(fac, 'You facilitate the new Circle “' + c.name + '”, formed from an open challenge', 'circle', { id: c.id });
  others.forEach(pid => notify(pid, ch.alias + ' selected you for “' + ch.title + '”. Accept your invitation to the team’s Circle.', 'circle', { id: c.id }));
  return c;
}
function chMkRope(ch, p, owner, mentor, others) {
  const x = { id: uid('rt'), ctx: ch.ctx, name: p.title + ' Rope Team', charter: 'Mentor support for the team delivering “' + p.title + '”.', mentor, owner, circle: p.circle, project: p.id, origin: { type: 'Project', id: p.id }, contentVis: ROPE_ONLY, state: 'Active', members: [{ pid: owner, role: 'Project owner', status: 'Active' }, { pid: mentor, role: 'Mentor', status: 'Invited' }, ...chMembers(others.filter(o => o !== mentor), 'Member')], chat: [], checkins: [], support: [], reviews: [], contribs: [], docs: [], engagement: null, indicators: { [owner]: { pacing: 'On track', workload: '—', availability: '—', support: 'None reported', absence: 'None' } }, privateNotes: [], reqFinal: false };
  S.ropes.push(x);
  chLink(ch, 'ropes', x.id, p.id, 'supports');
  p.rope = x.id;
  notify(mentor, 'You are invited to mentor the Rope Team “' + x.name + '”', 'rope', { id: x.id });
  others.forEach(pid => notify(pid, 'You are invited to the Rope Team “' + x.name + '”', 'rope', { id: x.id }));
  return x;
}
function chMkRoom(ch, p, owner, fac, others) {
  const x = { id: uid('ar'), ctx: ch.ctx, name: p.title + ' — execution', purpose: ch.objectives, charter: ch.objectives, outcome: ch.outcomes, lead: owner, origin: { type: 'Project', id: p.id }, mandate: null, related: [p.id], state: 'Active', flags: [], members: [{ pid: owner, role: 'Project owner', status: 'Active' }, { pid: fac, role: 'Facilitator', status: 'Active' }, ...chMembers(others, 'Member')], chat: [], joinReqs: [], tasks: [], milestones: [], decisions: [], risks: [], deps: [], resources: [], wins: [], changes: [], returns: [], links: [], final: null, docs: [] };
  S.rooms.push(x);
  chLink(ch, 'rooms', x.id, p.id, 'originated-from');
  p.room = x.id;
  notify(fac, 'You facilitate the ' + WL() + ' “' + x.name + '”', 'room', { id: x.id });
  others.forEach(pid => notify(pid, 'Invitation to join ' + x.name, 'room', { id: x.id }));
  return x;
}
F.chf = d => {
  const ch = chById(d.id);
  const sl = ch.apps.filter(a => a.status === 'Shortlisted').map(a => a.pid);
  const ms = [].concat(d.m || []).filter(x => sl.includes(x));
  const e = {};
  if (!(d.title || '').trim()) e.title = 'Give the project a title.';
  if (!ms.length) e.m = 'Choose at least one person from your shortlist.';
  if (!d.owner) e.owner = 'Choose the Circle owner.';
  else if (!ms.includes(d.owner)) e.owner = 'The Circle owner must be one of the team members you chose.';
  else if (!chIsP(d.owner, ch)) e.owner = 'The Circle owner must hold an active Participant role in this programme.';
  if (!chFacs(ch).includes(d.fac)) e.fac = 'Choose an active Faculty/Steward in this programme.';
  if (!CH_ENTRY.some(([k]) => k === d.entry)) e.entry = 'Choose where the project starts.';
  if (d.entry === 'ropes' && !chMentors(ch).includes(d.mentor)) e.mentor = 'Choose an active mentor in this programme.';
  UI.form.chf = { ...d, m: ms };
  UI.err.chf = e;
  if (Object.keys(e).length) return render();
  const owner = d.owner;
  const others = ms.filter(x => x !== owner);
  const p = { id: uid('pr'), owner, ctx: ch.ctx, status: 'Accepted', stage: null, stewards: [d.fac], clar: [], history: [], thread: [], type: 'Opportunity', title: d.title.trim(), desc: ch.problem, tags: ch.skills || [], country: ch.country || '', area: ch.area || '', challenge: ch.id, supportPath: { circles: 'Start in a Circle', ropes: 'Start in a Rope Team', rooms: 'Start in an Action Workspace' }[d.entry], submitted: today() };
  p.history.push({ at: now(), t: 'Formed from the open challenge “' + ch.title + '” by its sponsor, ' + ch.alias + '. Faculty/Steward: ' + P(d.fac).name + '.' });
  S.projects.push(p);
  const c = chMkCircle(ch, p, owner, d.fac, others);
  const sp = d.entry === 'ropes' ? chMkRope(ch, p, owner, d.mentor, others) : d.entry === 'rooms' ? chMkRoom(ch, p, owner, d.fac, others) : c;
  // the project starts in the chosen room; the move is recorded under the sponsor's alias
  const to = projRoomOf(d.entry);
  p.stage = to.stage;
  p.moves = [{ at: now(), by: myId(), byLabel: ch.alias, from: null, to: to.stage, space: sp.id, why: 'Starting room chosen by the sponsor' }];
  p.history.push({ at: now(), t: 'Started in ' + projRoomLabel(to) + ' “' + sp.name + '”' });
  if (sp !== c) {
    sysMsg(sp, 'Project “' + p.title + '” starts here. It can move between its Circle, Rope Team and ' + WL() + ' at any time.');
    // only the starting room is Active (journey.js room lifecycle); the team's Circle waits, closed, until the project moves there
    Object.assign(c, { state: 'Closed', closedAt: now(), closedBy: myId(), closedFor: { project: p.id, to: sp.id } });
    sysMsg(c, 'This Circle is closed while the project works in ' + projRoomLabel(to) + ' “' + sp.name + '”. Moving the project here reopens it.');
  }
  ch.project = p.id;
  ch.team = { owner, members: ms, facilitator: d.fac, entry: d.entry, mentor: d.entry === 'ropes' ? d.mentor : null, circle: c.id, formedAt: now() };
  ch.reveal = d.reveal === 'yes';
  ch.apps.forEach(a => {
    if (ms.includes(a.pid)) {
      a.status = 'Selected';
      a.log.push({ at: now(), by: myId(), t: a.pid === owner ? 'Selected as Circle owner' : 'Selected for the team' });
    } else if (['Submitted', 'Shortlisted'].includes(a.status)) {
      a.status = 'Not selected';
      a.log.push({ at: now(), by: myId(), t: 'Not selected: team formed' });
      notify(a.pid, 'The team for “' + ch.title + '” has been formed. You were not selected this time.', 'challenge', { id: ch.id });
    }
  });
  notify(owner, 'You are the Circle owner for “' + p.title + '”. The sponsor records the funding commitment next; you confirm it and agree milestones.', 'challenge', { id: ch.id, tab: 'agree' });
  sysMsg(chRoom(ch), 'The team has been formed. Project work continues in the team’s own Circle.');
  if (d.close === 'yes') chSetState(ch, 'Requests closed');
  chLog(ch, 'Team formed: ' + ms.map(x => P(x).name).join(', ') + '; Circle owner ' + P(owner).name + '; started in ' + projRoomLabel(to));
  audit('Open challenge team formed', ch.id, p.id + ' · ' + d.entry + (ch.reveal ? ' · sponsor identity shared with the team' : ' · sponsor alias kept'));
  UI.modal = null;
  clearF('chf');
  toast('Team formed. “' + p.title + '” starts in ' + projRoomLabel(to) + '.');
  save();
  go('challenge', { id: ch.id, tab: 'team' });
};

// ---------- FUNDING COMMITMENT (point 6) ----------
const CH_OFFLINE = 'PHOENIX has no payment gateway and never processes, holds or transfers money. You pay or receive money offline as you agreed; PHOENIX records each statement, and an amount counts only when both sides confirm it.';
function chCommitCard(ch) {
  const c = ch.commit;
  const side = chSide(ch);
  const cur = chCur(ch);
  if (!c)
    return card(
      'Funding commitment',
      'The full agreed project amount, committed before execution begins',
      empty('coin', 'No commitment recorded yet', side === 'sponsor' ? 'Record the full amount you agreed with the team. Execution starts once the Circle owner confirms the same amount.' : 'The sponsor records the full agreed amount. The Circle owner then confirms it independently.', side === 'sponsor' ? B('Record the funding commitment', 'chCommit', { id: ch.id }, 'btn-p btn-sm') : ''),
      '',
      'ch-commit',
    );
  const seeSp = side === 'sponsor' || c.status !== 'Awaiting owner confirmation';
  return card(
    'Funding commitment',
    'The full agreed project amount, committed before execution begins',
    dl([
      ['Status', pill(c.status)],
      ['Committed by the sponsor', (seeSp ? money(c.currency, c.amount) : '<span class="cap">Shown after the Circle owner confirms, so the confirmation is independent</span>') + ' · ' + fmtD(c.at)],
      ['Confirmed by the Circle owner', c.own ? (side === 'owner' || c.status !== 'Awaiting owner confirmation' ? money(c.currency, c.own.amount) : 'Confirmed') + ' · ' + fmtD(c.own.at) + (c.own.note ? `<div class="cap">${h(c.own.note)}</div>` : '') : '<span class="cap">Not yet</span>'],
      ['Payment arrangement', chText(c.terms)],
      c.status === 'Flagged for review' && ['Why it is flagged', 'The two figures differ: sponsor ' + money(cur, c.amount) + ', Circle owner ' + money(cur, c.own.amount) + '. Either side can correct their figure. Nothing counts as committed until they match.'],
    ]),
    (side === 'sponsor' && c.status !== 'Confirmed' ? B('Revise the commitment', 'chCommit', { id: ch.id }) : '') +
      (side === 'owner' && c.status === 'Awaiting owner confirmation' ? B('Confirm the agreed amount', 'chCommitConf', { id: ch.id }, 'btn-p btn-sm') : '') +
      (side === 'owner' && c.status === 'Flagged for review' ? B('Correct my figure', 'chCommitConf', { id: ch.id }) : ''),
    'ch-commit',
  );
}
A.chCommit = d => {
  const ch = chById(d.id);
  const c = ch.commit;
  clearF('chcm');
  UI.form.chcm = c ? { amount: String(c.amount), currency: c.currency, terms: c.terms } : { currency: ch.currency || 'USD', amount: ch.budget ? String(ch.budget) : '' };
  modal(
    c ? 'Revise the funding commitment' : 'Record the funding commitment',
    () =>
      `<form data-f="chcm" class="col fgap" novalidate>${errSum('chcm')}<input type="hidden" name="id" value="${ch.id}"><div class="f2">${fi('chcm', 'amount', 'Full agreed project amount', { type: 'number', req: true, min: 1, step: '0.01' })}${fi('chcm', 'currency', 'Currency', { type: 'select', opts: CH_CUR })}</div>${fi('chcm', 'terms', 'Payment arrangement', { type: 'textarea', rows: 3, req: true, max: 1000, ph: 'e.g. USD 2,000 advance when the project starts; each milestone paid within 10 days of approval', help: 'How and when you will pay the project owner. Both sides see this.' })}${fi('chcm', 'pledge', 'I commit the full agreed amount to this project before execution begins, and will pay the project owner offline as agreed', { type: 'checkbox', req: true })}${banner('info', 'Recorded, never processed', CH_OFFLINE)}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Record commitment</button></div></form>`,
  );
};
const chFigEq = (a, b) => Math.abs(+a - +b) < 0.005;
F.chcm = d => {
  const ch = chById(d.id);
  const agreed = ch.milestones.filter(m => m.status !== 'Proposed' && m.status !== 'Changes requested');
  const min = agreed.reduce((a, m) => a + +m.amount, 0);
  if (!validate('chcm', d, { amount: ['req', 'num', ['fn', { f: v => +v >= min, m: 'Agreed milestones already total ' + (d.currency || '') + ' ' + min.toLocaleString('en-US') + '. Commit at least that amount.' }]], terms: ['req', ['min', 10]], pledge: [['req', 'Confirm the commitment.']] })) return render();
  const own = ch.commit && ch.commit.own;
  ch.commit = { amount: +d.amount, currency: d.currency || 'USD', terms: d.terms.trim(), at: now(), by: myId(), own: own || null, status: 'Awaiting owner confirmation' };
  if (own) ch.commit.status = chFigEq(own.amount, d.amount) ? 'Confirmed' : 'Flagged for review';
  chLog(ch, 'Funding commitment recorded by the sponsor: ' + d.currency + ' ' + (+d.amount).toLocaleString('en-US'));
  notify(ch.team.owner, ch.alias + ' recorded the funding commitment for “' + ch.title + '”. Confirm the amount you agreed.', 'challenge', { id: ch.id, tab: 'agree' });
  if (ch.commit.status === 'Confirmed') chCommitDone(ch);
  audit('Funding commitment recorded', ch.id, d.currency + ' ' + d.amount + ' · ' + ch.commit.status);
  UI.modal = null;
  clearF('chcm');
  toast(ch.commit.status === 'Confirmed' ? 'Commitment confirmed by both sides. Execution can begin.' : ch.commit.status === 'Flagged for review' ? 'Recorded, but your figure differs from the Circle owner’s. It is flagged for review.' : 'Recorded. It counts once the Circle owner confirms the same amount.');
  ok();
};
A.chCommitConf = d => {
  const ch = chById(d.id);
  const c = ch.commit;
  clearF('chco');
  UI.form.chco = c.own ? { amount: String(c.own.amount), note: c.own.note || '' } : {};
  modal(
    c.own ? 'Correct your figure' : 'Confirm the agreed amount',
    () =>
      `<form data-f="chco" class="col fgap" novalidate>${errSum('chco')}<input type="hidden" name="id" value="${ch.id}">${dl([
        ['Challenge', h(ch.title)],
        ['Payment arrangement', chText(c.terms)],
        c.status === 'Flagged for review' && ['Sponsor’s figure', money(c.currency, c.amount)],
      ])}${c.status === 'Flagged for review' ? '' : banner('info', 'Independent confirmation', 'Enter the total you agreed with the sponsor. Their figure is shown after you confirm, so your confirmation stays independent.')}<div class="f2">${fi('chco', 'amount', 'Total agreed project amount (' + h(c.currency) + ')', { type: 'number', req: true, min: 1, step: '0.01' })}</div>${fi('chco', 'note', 'Note (optional)', { type: 'textarea', rows: 2, max: 500 })}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Confirm</button></div></form>`,
  );
};
function chCommitDone(ch) {
  chLog(ch, 'Funding commitment confirmed by both sides. Execution can begin.');
  chTeam(ch)
    .filter(x => x !== myId())
    .concat(ch.sponsor === myId() ? [] : [ch.sponsor])
    .forEach(x => notify(x, 'Funding for “' + ch.title + '” is committed and confirmed by both sides. Execution can begin.', 'challenge', { id: ch.id, tab: 'agree' }));
}
F.chco = d => {
  if (!validate('chco', d, { amount: ['req', 'num'] })) return render();
  const ch = chById(d.id);
  const c = ch.commit;
  c.own = { amount: +d.amount, at: now(), by: myId(), note: (d.note || '').trim() };
  c.status = chFigEq(c.amount, d.amount) ? 'Confirmed' : 'Flagged for review';
  chLog(ch, 'Circle owner confirmed ' + c.currency + ' ' + (+d.amount).toLocaleString('en-US') + ' · ' + c.status);
  if (c.status === 'Confirmed') chCommitDone(ch);
  else notify(ch.sponsor, 'The funding commitment for “' + ch.title + '” is flagged: the Circle owner’s figure differs from yours.', 'challenge', { id: ch.id, tab: 'agree' });
  audit('Funding commitment ' + (c.status === 'Confirmed' ? 'confirmed' : 'flagged'), ch.id, c.currency + ' ' + d.amount);
  UI.modal = null;
  clearF('chco');
  toast(c.status === 'Confirmed' ? 'Confirmed. Both figures match, so execution can begin.' : 'Your figure differs from the sponsor’s, so the commitment is flagged for review.', c.status === 'Confirmed' ? 'ok' : 'warn');
  ok();
};

// ---------- MILESTONES: agree (point 7), complete and approve (point 8) ----------
const msOk = (m, k) => (m.ok[k] ? `${ic('check', 13)}${fmtD(m.ok[k])}` : '<span class="cap">not yet</span>');
function chAgree(ch) {
  const side = chSide(ch);
  const cur = chCur(ch);
  const tot = chMsTotal(ch);
  const c = ch.commit;
  const rows = ch.milestones.map(m => {
    const dsp = dspOn(ch, 'ms', m.id);
    const ps = msPayState(ch, m);
    return [
      String(m.n),
      `<b>${h(m.t)}</b><div class="cap">${h(chClip(m.deliv, 90))}</div>`,
      fmtD(m.due) + dueTag(m.due, ['Submitted', 'Approved'].includes(m.status)),
      money(cur, m.amount),
      `<span class="ch-ok"><span>Sponsor ${msOk(m, 'sponsor')}</span><span>Circle owner ${msOk(m, 'owner')}</span></span>`,
      pill(msLabel(m)) + (dsp ? ' ' + pill('In dispute') : '') + (ps ? `<div class="cap">Payment: ${h(ps.toLowerCase())}</div>` : ''),
      B('Open', 'chMs', { id: ch.id, m: m.id }, chTodo().some(x => x[3].id === ch.id && x[1].includes(h(m.t))) ? 'btn-p btn-sm' : 'btn-s btn-sm'),
    ];
  });
  return (
    (chLive(ch) ? '' : banner('warn', 'Execution starts once the funding commitment is confirmed', 'Milestones can be agreed now. Completion submissions and payments open when the sponsor’s commitment and the Circle owner’s confirmation match.')) +
    chCommitCard(ch) +
    '<div class="section-gap"></div>' +
    card(
      'Milestones',
      `Agreed by the sponsor and the Circle owner, who approves for the team. Milestones total ${money(cur, tot)}${c ? ' of ' + money(cur, c.amount) + ' committed' : ''}.`,
      table(['#', 'Milestone', 'Due', 'Amount', 'Agreement', 'Status', ''], rows, 'No milestones yet. Either side proposes one; the other side approves it.'),
      side ? B(ic('plus', 14) + 'Propose a milestone', 'chMsNew', { id: ch.id }, 'btn-p btn-sm') : '',
      'ch-ms',
    ) +
    banner('info', 'Recorded, never processed', CH_OFFLINE)
  );
}
// The fields both sides agree: deliverables, outcome, acceptance criteria, an optional deadline and the amount paid on approval.
A.chMsNew = d => {
  const ch = chById(d.id);
  const m = d.m && ch.milestones.find(x => x.id === d.m);
  clearF('chms');
  UI.form.chms = m ? { t: m.t, deliv: m.deliv, outcome: m.outcome, criteria: m.criteria, due: m.due || '', amount: String(m.amount), why: '' } : {};
  modal(
    m ? (m.status === 'Agreed' ? 'Propose a change to milestone ' + m.n : 'Revise milestone ' + m.n) : 'Propose a milestone',
    () =>
      `<form data-f="chms" class="col fgap" novalidate>${errSum('chms')}<input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="m" value="${m ? m.id : ''}">${fi('chms', 't', 'Milestone', { req: true, max: 120, ph: 'e.g. Prototype shades on five stalls' })}${fi('chms', 'deliv', 'Deliverables', { type: 'textarea', rows: 3, req: true, max: 2000 })}<div class="f2">${fi('chms', 'outcome', 'Expected outcome', { type: 'textarea', rows: 3, req: true, max: 1000 })}${fi('chms', 'criteria', 'Acceptance criteria', { type: 'textarea', rows: 3, req: true, max: 1000, help: 'How the sponsor will judge that it is complete.' })}</div><div class="f2">${fi('chms', 'due', 'Deadline (optional)', { type: 'date' })}${fi('chms', 'amount', 'Amount paid on approval (' + h(chCur(ch)) + ')', { type: 'number', req: true, min: 0, step: '0.01' })}</div>${m ? fi('chms', 'why', 'What changed and why', { type: 'textarea', rows: 2, req: true, max: 500 }) : ''}${banner('info', '', 'The other side approves it before it is agreed. ' + (chSide(ch) === 'owner' ? 'You approve for the team as Circle owner.' : 'The Circle owner approves for the team.'))}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${m ? 'Send revised milestone' : 'Propose milestone'}</button></div></form>`,
    true,
  );
};
A.chMsEdit = d => A.chMsNew(d);
F.chms = d => {
  const ch = chById(d.id);
  const m = d.m && ch.milestones.find(x => x.id === d.m);
  const cap = ch.commit ? ch.commit.amount : null;
  const others = chMsTotal(ch, m && m.id);
  if (
    !validate('chms', d, {
      t: ['req'],
      deliv: ['req', ['min', 10]],
      outcome: ['req', ['min', 10]],
      criteria: ['req', ['min', 10]],
      due: ['date'],
      amount: ['req', ['fn', { f: v => +v >= 0, m: 'Enter an amount of 0 or more.' }], ['fn', { f: v => cap == null || others + +v <= cap, m: 'Milestones would total more than the committed ' + chCur(ch) + ' ' + (cap || 0).toLocaleString('en-US') + '.' }]],
      ...(m ? { why: ['req', ['min', 5]] } : {}),
    })
  )
    return render();
  const side = chSide(ch);
  const f = { t: d.t.trim(), deliv: d.deliv.trim(), outcome: d.outcome.trim(), criteria: d.criteria.trim(), due: d.due || '', amount: +d.amount };
  let x = m;
  if (x) {
    (x.versions = x.versions || []).push({ t: x.t, deliv: x.deliv, outcome: x.outcome, criteria: x.criteria, due: x.due, amount: x.amount, status: x.status, at: now() });
    Object.assign(x, f);
    x.notes.push({ id: uid('mn'), by: myId(), at: now(), kind: 'revise', t: 'Revised: ' + d.why.trim() });
  } else {
    x = { id: uid('ms'), n: ch.milestones.length + 1, ...f, notes: [], subs: [], versions: [] };
    ch.milestones.push(x);
  }
  Object.assign(x, { by: myId(), status: 'Proposed', ok: { sponsor: side === 'sponsor' ? now() : null, owner: side === 'owner' ? now() : null } });
  const other = side === 'sponsor' ? ch.team.owner : ch.sponsor;
  notify(other, (side === 'sponsor' ? ch.alias : me().name) + (m ? ' revised' : ' proposed') + ' milestone ' + x.n + ' for “' + ch.title + '”: ' + x.t + '. Approve it or ask for changes.', 'challenge', { id: ch.id, tab: 'agree' });
  chLog(ch, 'Milestone ' + x.n + (m ? ' revised' : ' proposed') + ': ' + x.t);
  audit('Challenge milestone ' + (m ? 'revised' : 'proposed'), ch.id, x.id);
  UI.modal = null;
  clearF('chms');
  toast('Sent to the other side for approval.');
  ok();
};
function chMsActs(ch, m) {
  const side = chSide(ch);
  const dsp = dspOn(ch, 'ms', m.id);
  const out = [];
  if (!side) return '';
  if (m.status === 'Proposed' && !m.ok[side]) out.push(B('Ask for changes', 'chMsChanges', { id: ch.id, m: m.id }), B(ic('check', 14) + (side === 'owner' ? 'Approve for the team' : 'Approve milestone'), 'chMsAgree', { id: ch.id, m: m.id }, 'btn-p btn-sm'));
  if (['Proposed', 'Changes requested'].includes(m.status) && m.by === myId()) out.push(B(ic('edit', 14) + 'Revise', 'chMsEdit', { id: ch.id, m: m.id }, m.status === 'Changes requested' ? 'btn-p btn-sm' : 'btn-s btn-sm'));
  if (m.status === 'Agreed' && !dsp) out.push(B(ic('edit', 14) + 'Propose a change', 'chMsEdit', { id: ch.id, m: m.id }));
  if (side === 'owner' && ['Agreed', 'More information requested'].includes(m.status) && !dsp) out.push(chLive(ch) ? B(ic('check', 14) + (m.status === 'Agreed' ? 'Mark complete' : 'Send what was asked for'), 'chMsDone', { id: ch.id, m: m.id }, 'btn-p btn-sm') : '<span class="cap">Completion opens once the funding commitment is confirmed.</span>');
  if (side === 'sponsor' && m.status === 'Submitted' && !dsp) out.push(B('Request more information', 'chMsMore', { id: ch.id, m: m.id }), B(ic('check', 14) + 'Approve milestone', 'chMsApprove', { id: ch.id, m: m.id }, 'btn-p btn-sm'));
  if (['Submitted', 'More information requested'].includes(m.status) && !dsp) out.push(B(ic('shield', 14) + 'Escalate to a Steward', 'chDspNew', { id: ch.id, kind: 'ms', s: m.id }));
  if (dsp) out.push(L(ic('shield', 14) + 'Open dispute ' + h(dsp.ref), 'dispute', { id: dsp.id }, 'btn btn-s btn-sm'));
  if (chLive(ch) && chPayFor(ch).some(([v]) => v === 'ms:' + m.id)) out.push(B(ic('coin', 14) + (side === 'sponsor' ? 'Record payment made' : 'Record payment received'), 'chPay', { id: ch.id, ms: m.id }, 'btn-p btn-sm'));
  return out.join('');
}
const chFiles = fs => ((fs || []).length ? `<span class="ch-files">${fs.map(f => `<button type="button" class="ch-file" data-a="fakeDl" data-n="${h(f.n)}">${ic('clip', 13)}${h(f.n)}</button>`).join('')}</span>` : '');
const chEvs = ids => (ids || []).map(id => byId('evidence', id)).filter(Boolean).map(e => h(e.title) + ' ' + pill(e.review)).join('<br>');
A.chMs = d => {
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  if (!m) return;
  clearF('chmc');
  const cur = chCur(ch);
  const can = chMine(ch) || chOnTeam(ch);
  modal(
    'Milestone ' + m.n + ' · ' + h(m.t),
    () => {
      const ps = msPays(ch, m);
      return `<div class="col fgap ch-msd"><div class="row wrap" style="gap:8px">${pill(msLabel(m))}${dspOn(ch, 'ms', m.id) ? pill('In dispute') : ''}${msPayState(ch, m) ? pill(msPayState(ch, m), SC[msPayState(ch, m)] || 'p-grey') : ''}</div>${dl([
        ['Deliverables', chText(m.deliv)],
        ['Expected outcome', chText(m.outcome)],
        ['Acceptance criteria', chText(m.criteria)],
        ['Deadline', m.due ? fmtD(m.due) + dueTag(m.due, ['Submitted', 'Approved'].includes(m.status)) : '<span class="cap">None</span>'],
        ['Amount paid on approval', money(cur, m.amount)],
        ['Proposed by', chNm(ch, m.by)],
        ['Approved by', `Sponsor ${msOk(m, 'sponsor')} · Circle owner ${msOk(m, 'owner')}`],
      ])}${
        m.subs.length
          ? `<section class="col fgap"><h3 class="h3">Completion submissions</h3>${m.subs
              .slice()
              .reverse()
              .map(
                (s, i) =>
                  `<div class="ch-sub"><div class="row wrap ch-sub-h"><b>Submission ${m.subs.length - i}</b><span class="cap">${fmtD(s.at)} · ${chNm(ch, s.by)}</span></div><p>${chText(s.note)}</p>${chFiles(s.files)}${(s.evs || []).length ? `<div class="cap">Evidence: ${chEvs(s.evs)}</div>` : ''}${s.decision ? `<div class="ch-dec">${pill(s.decision.v)} <span class="cap">${fmtD(s.decision.at)} · ${s.decision.steward ? 'Independent Steward decision ' + h(s.decision.steward) : chNm(ch, s.decision.by)}</span>${s.decision.note ? `<p>${chText(s.decision.note)}</p>` : ''}</div>` : '<div class="cap">Awaiting the sponsor’s review</div>'}</div>`,
              )
              .join('')}</section>`
          : ''
      }${ps.length ? `<section class="col fgap"><h3 class="h3">Payments for this milestone</h3>${ps.map(p => lrow('coin', h(p.ref) + ' · ' + pill(p.status), (p.status === 'Confirmed' ? money(cur, p.final) + ' confirmed by both sides' : 'Recorded ' + fmtD(p.at)) + (payRec(p, 'sponsor') && payRec(p, 'sponsor').ref ? ' · ref ' + h(payRec(p, 'sponsor').ref) : ''))).join('')}</section>` : ''}<section class="col fgap"><h3 class="h3">Discussion</h3>${
        m.notes.length
          ? `<ol class="ch-notes">${m.notes.map(n => `<li class="${n.kind}"><b>${n.kind === 'steward' ? 'Independent Steward' : chNm(ch, n.by)}</b><span class="cap"> · ${fmtD(n.at)}${n.kind === 'changes' ? ' · asked for changes' : n.kind === 'revise' ? ' · revision' : ''}</span><p>${chText(n.t)}</p></li>`).join('')}</ol>`
          : '<p class="cap">No discussion yet.</p>'
      }${can ? `<form data-f="chmc" class="col fgap" novalidate><input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="m" value="${m.id}">${fi('chmc', 't', 'Add to the discussion', { type: 'textarea', rows: 2, req: true, max: 2000, help: 'The sponsor and the team see this. It is kept with the milestone.' })}<div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">${ic('send', 14)}Post</button></div></form>` : ''}</section>${(m.versions || []).length ? `<details class="ws-done"><summary class="cap">${m.versions.length} earlier version${m.versions.length > 1 ? 's' : ''}</summary>${m.versions.map(v => `<p class="cap">${fmtD(v.at)} · ${h(v.t)} · ${money(cur, v.amount)} · was ${h(v.status)}</p>`).join('')}</details>` : ''}<div class="actions ch-ms-acts"><span></span><div class="row wrap">${chMsActs(ch, m)}</div></div></div>`;
    },
    true,
  );
};
F.chmc = d => {
  if (!validate('chmc', d, { t: ['req', ['min', 2]] })) return render();
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  m.notes.push({ id: uid('mn'), by: myId(), at: now(), kind: 'comment', t: d.t.trim() });
  const who = myId() === ch.sponsor ? ch.alias : me().name;
  [ch.sponsor, ...chTeam(ch)].filter(x => x !== myId()).forEach(x => notify(x, who + ' commented on milestone ' + m.n + ' of “' + ch.title + '”', 'challenge', { id: ch.id, tab: 'agree' }));
  audit('Challenge milestone comment', ch.id, m.id);
  clearF('chmc');
  ok();
};
A.chMsAgree = d => {
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  const side = chSide(ch);
  m.ok[side] = now();
  if (m.ok.sponsor && m.ok.owner) {
    m.status = 'Agreed';
    m.agreedAt = now();
  }
  const other = side === 'sponsor' ? ch.team.owner : ch.sponsor;
  notify(other, 'Milestone ' + m.n + ' of “' + ch.title + '” is ' + (m.status === 'Agreed' ? 'agreed by both sides' : 'approved by the other side'), 'challenge', { id: ch.id, tab: 'agree' });
  chLog(ch, 'Milestone ' + m.n + ' approved by the ' + (side === 'sponsor' ? 'sponsor' : 'Circle owner') + (m.status === 'Agreed' ? '; agreed' : ''));
  audit('Challenge milestone approved', ch.id, m.id + ' · ' + side);
  UI.modal = null;
  toast(m.status === 'Agreed' ? 'Milestone agreed by both sides.' : 'Approved. Waiting for the other side.');
  ok();
};
// A short reason form used by "ask for changes", "request more information" and "approve completion".
function chNoteModal(title, f, d, label, req, help, btn) {
  clearF(f);
  modal(title, () => `<form data-f="${f}" class="col fgap" novalidate><input type="hidden" name="id" value="${d.id}"><input type="hidden" name="m" value="${d.m}">${fi(f, 'note', label, { type: 'textarea', rows: 4, req, max: 2000, help })}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${btn}</button></div></form>`);
}
A.chMsChanges = d => chNoteModal('Ask for changes', 'chmr', d, 'What needs to change', true, 'The proposer revises the milestone and sends it again.', 'Ask for changes');
F.chmr = d => {
  if (!validate('chmr', d, { note: ['req', ['min', 10]] })) return render();
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  m.status = 'Changes requested';
  m.notes.push({ id: uid('mn'), by: myId(), at: now(), kind: 'changes', t: d.note.trim() });
  notify(m.by, 'Changes requested on milestone ' + m.n + ' of “' + ch.title + '”', 'challenge', { id: ch.id, tab: 'agree' });
  chLog(ch, 'Changes requested on milestone ' + m.n);
  audit('Challenge milestone changes requested', ch.id, m.id);
  UI.modal = null;
  clearF('chmr');
  toast('Sent. The proposer revises the milestone.');
  ok();
};
// The Circle owner marks a milestone complete with a note, files and any evidence from the project.
A.chMsDone = d => {
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  const p = chProj(ch);
  const evs = S.evidence.filter(e => evProjects(e).includes(p) && e.review !== 'Rejected');
  const ask = m.status === 'More information requested' ? m.subs.slice(-1)[0] : null;
  clearF('chmd');
  modal(
    (ask ? 'Send what was asked for · milestone ' : 'Mark milestone complete · ') + m.n,
    () =>
      `<form data-f="chmd" class="col fgap" novalidate>${errSum('chmd')}<input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="m" value="${m.id}">${dl([
        ['Milestone', h(m.t)],
        ['Acceptance criteria', chText(m.criteria)],
      ])}${ask && ask.decision ? banner('warn', 'The sponsor asked for', chText(ask.decision.note)) : ''}${fi('chmd', 'note', 'What was delivered', { type: 'textarea', rows: 4, req: true, max: 3000, help: 'How each acceptance criterion is met. At least 20 characters.' })}<div class="field"><label class="lbl" for="chmd_files">Supporting documents and deliverables (optional)</label><input id="chmd_files" class="input" type="file" name="files" multiple><span class="help">Up to ${S.settings.maxFileMB} MB each. File names are recorded with the submission.</span></div><div class="field"><span class="lbl">Evidence from the project (optional)</span>${chkGroup('evs', evs.map(e => [e.id, h(e.title) + ` <span class="cap">· ${h(e.review)}</span>`]), [])}</div><div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Send to the sponsor</button></div></form>`,
    true,
  );
};
// File names and sizes from a multi-file input; null (with a message) when a file is too large or not allowed.
function chTakeFiles(form) {
  const fs = [...((form && form.querySelector('input[type=file]')) || { files: [] }).files];
  const big = fs.find(f => f.size > S.settings.maxFileMB * 1048576);
  if (big) {
    toast(big.name + ' is over ' + S.settings.maxFileMB + ' MB. Link large media instead.', 'err');
    return null;
  }
  const bad = fs.find(f => /\.(exe|bat|cmd|sh|msi)$/i.test(f.name));
  if (bad) {
    toast(bad.name + ': this file type is not allowed.', 'err');
    return null;
  }
  return fs.map(f => ({ n: f.name, mb: +(f.size / 1048576).toFixed(2) }));
}
F.chmd = (d, form) => {
  if (!validate('chmd', d, { note: ['req', ['min', 20]] })) return render();
  const files = chTakeFiles(form);
  if (!files) return render();
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  m.subs.push({ id: uid('msb'), at: now(), by: myId(), note: d.note.trim(), files, evs: [].concat(d.evs || []), decision: null });
  m.status = 'Submitted';
  notify(ch.sponsor, me().name + ' marked milestone ' + m.n + ' of “' + ch.title + '” complete. Review it.', 'challenge', { id: ch.id, tab: 'agree' });
  chLog(ch, 'Milestone ' + m.n + ' submitted as complete (submission ' + m.subs.length + ')');
  audit('Challenge milestone submitted', ch.id, m.id + ' · ' + files.length + ' file(s)');
  UI.modal = null;
  clearF('chmd');
  toast('Sent to the sponsor for approval.');
  ok();
};
A.chMsMore = d => chNoteModal('Request more information', 'chmi', d, 'What is missing or needs correcting', true, 'The milestone stays pending until the Circle owner sends it and you review it again.', 'Send request');
A.chMsApprove = d => chNoteModal('Approve milestone', 'chma', d, 'Note to the team (optional)', false, 'Approving records that the acceptance criteria are met. The milestone payment can then be recorded.', 'Approve milestone');
function chMsDecide(d, v) {
  const ch = chById(d.id);
  const m = ch.milestones.find(x => x.id === d.m);
  const s = m.subs.slice(-1)[0];
  s.decision = { v, by: myId(), at: now(), note: (d.note || '').trim() };
  m.status = v;
  if (v === 'Approved') m.approvedAt = now();
  chTeam(ch).forEach(x => notify(x, 'Milestone ' + m.n + ' of “' + ch.title + '”: ' + (v === 'Approved' ? 'approved by the sponsor' : 'the sponsor asked for more information'), 'challenge', { id: ch.id, tab: 'agree' }));
  chLog(ch, 'Milestone ' + m.n + ': ' + v.toLowerCase());
  audit('Challenge milestone ' + v.toLowerCase(), ch.id, m.id);
  UI.modal = null;
}
F.chmi = d => {
  if (!validate('chmi', d, { note: ['req', ['min', 20]] })) return render();
  chMsDecide(d, 'More information requested');
  clearF('chmi');
  toast('Sent. The milestone stays pending until the Circle owner responds.');
  ok();
};
F.chma = d => {
  chMsDecide(d, 'Approved');
  clearF('chma');
  toast('Milestone approved. Record the payment once you have paid it.');
  ok();
};

// ---------- PAYMENTS: offline, mutually confirmed (point 11) ----------
function chPayEval(p) {
  if (!p.sp || !p.ow) return 'Pending verification';
  if (p.sp.made && p.ow.received && chFigEq(p.sp.amount, p.ow.amount)) {
    p.final = +p.sp.amount;
    return 'Confirmed';
  }
  return 'Flagged for review';
}
// A side sees the other side's figure only once its own confirmation is in, so the two confirmations stay independent.
function payCell(ch, p, side) {
  const r = payRec(p, side);
  const me_ = chSide(ch);
  if (!r) return '<span class="cap">Not confirmed</span>';
  const yes = side === 'sponsor' ? r.made : r.received;
  const hide = me_ && me_ !== side && !payRec(p, me_);
  const what = side === 'sponsor' ? (yes ? 'Paid' : 'Says not paid') : yes ? 'Received' : 'Says not received';
  return `${yes ? ic('check', 13) : ic('alert', 13)} ${what}${yes ? ' ' + (hide ? '<span class="cap">· amount shown after you confirm</span>' : money(chCur(ch), r.amount)) : ''}<div class="cap">${fmtD(r.date)}${r.ref ? ' · ref ' + h(r.ref) : ''}</div>${chFiles(r.files)}`;
}
function chPays(ch) {
  const c = ch.commit;
  const cur = chCur(ch);
  const side = chSide(ch);
  const kpi = (l, v) => `<div class="kpi"><span class="lt">${l}</span><span class="fig">${v}</span></div>`;
  const committed = chLive(ch) ? c.amount : 0;
  const paid = chPaid(ch);
  const pend = chPending(ch);
  const flagged = ch.payments.filter(p => p.status === 'Flagged for review').length;
  const what = p => (p.kind === 'Initial funding' ? 'Initial project funding' : 'Milestone ' + ((ch.milestones.find(m => m.id === p.ms) || {}).n || '?') + ' · ' + h((ch.milestones.find(m => m.id === p.ms) || {}).t || ''));
  const acts = p => {
    if (!side) return '';
    const dsp = dspOn(ch, 'pay', p.id);
    if (dsp) return L(ic('shield', 14) + h(dsp.ref), 'dispute', { id: dsp.id }, 'btn btn-s btn-sm');
    if (p.status === 'Pending verification' && !payRec(p, side)) return B('Confirm', 'chPayConf', { id: ch.id, p: p.id }, 'btn-p btn-sm');
    if (p.status === 'Flagged for review') return B('Correct my record', 'chPayConf', { id: ch.id, p: p.id }) + B(ic('shield', 14) + 'Escalate to a Steward', 'chDspNew', { id: ch.id, kind: 'pay', s: p.id });
    return '';
  };
  return (
    (chLive(ch) ? '' : banner('warn', 'Payments open once the funding commitment is confirmed', 'The sponsor records the full agreed amount, and the Circle owner confirms the same figure.')) +
    `<div class="kpis ch-kpis">${kpi('Committed', chLive(ch) ? money(cur, committed) : '—')}${kpi('Confirmed by both', money(cur, paid))}${kpi('Pending verification', money(cur, pend))}${kpi('Flagged for review', flagged)}${kpi('Still to pay', chLive(ch) ? money(cur, Math.max(0, committed - paid - pend)) : '—')}</div>` +
    card(
      'Milestone payments',
      'For each milestone: the agreed amount, its approval and the payment confirmations from both sides.',
      table(
        ['Milestone', 'Agreed amount', 'Milestone status', 'Payment reference', 'Sponsor', 'Circle owner', 'Payment status'],
        ch.milestones
          .filter(m => !['Proposed', 'Changes requested'].includes(m.status))
          .map(m => {
            const ps = msPays(ch, m);
            const p = ps.slice(-1)[0];
            return [`<b>${m.n} · ${h(m.t)}</b>`, money(cur, m.amount), pill(msLabel(m)), p ? h(p.ref) + (payRec(p, 'sponsor') && payRec(p, 'sponsor').ref ? `<div class="cap">${h(payRec(p, 'sponsor').ref)}</div>` : '') : '<span class="cap">—</span>', p ? payCell(ch, p, 'sponsor') : '<span class="cap">—</span>', p ? payCell(ch, p, 'owner') : '<span class="cap">—</span>', msPayState(ch, m) ? pill(msPayState(ch, m), SC[msPayState(ch, m)] || 'p-grey') : '<span class="cap">Not due yet</span>'];
          }),
        'No agreed milestones yet.',
      ),
      '',
      'ch-paytbl',
    ) +
    '<div class="section-gap"></div>' +
    card(
      'Payment history',
      'Every payment either side recorded, with both confirmations and supporting records. Newest first.',
      table(
        ['Recorded', 'Payment', 'Amount', 'Sponsor', 'Circle owner', 'Status', ''],
        ch.payments
          .slice()
          .reverse()
          .map(p => [`<span class="mono">${h(p.ref)}</span><div class="cap">${fmtD(p.at)}</div>`, what(p), p.status === 'Confirmed' ? money(cur, p.final) : side && !payRec(p, side) ? '<span class="cap">Shown after you confirm</span>' : money(cur, payStated(p)), payCell(ch, p, 'sponsor'), payCell(ch, p, 'owner'), pill(p.status) + (p.resolved ? `<div class="cap">By Steward decision ${h(p.resolved)}</div>` : ''), acts(p)]),
        'No payments recorded yet.',
      ),
      side && chLive(ch) ? B(ic('plus', 14) + (side === 'sponsor' ? 'Record a payment made' : 'Record a payment received'), 'chPay', { id: ch.id }, 'btn-p btn-sm') : '',
      'ch-paytbl',
    ) +
    banner('info', 'Recorded, never processed', CH_OFFLINE + ' If the two confirmations differ, the payment is flagged for review rather than marked complete.')
  );
}
// What a payment can be for: initial funding, or an approved milestone that is not fully paid.
const chPayFor = ch => [['init', 'Initial project funding (advance)'], ...ch.milestones.filter(m => m.status === 'Approved' && msPayState(ch, m) !== 'Paid' && msPays(ch, m).every(p => p.status === 'Confirmed')).map(m => ['ms:' + m.id, 'Milestone ' + m.n + ' · ' + m.t + ' (' + chCur(ch) + ' ' + (+m.amount).toLocaleString('en-US') + ')'])];
A.chPay = d => {
  const ch = chById(d.id);
  const side = chSide(ch);
  clearF('chp');
  UI.form.chp = { what: d.ms ? 'ms:' + d.ms : '', date: today() };
  const ms = d.ms && ch.milestones.find(m => m.id === d.ms);
  if (ms) UI.form.chp.amount = String(Math.max(0, +ms.amount - msPays(ch, ms).reduce((a, p) => a + (+p.final || 0), 0)));
  modal(
    side === 'sponsor' ? 'Record a payment you made' : 'Record a payment you received',
    () =>
      `<form data-f="chp" class="col fgap" novalidate>${errSum('chp')}<input type="hidden" name="id" value="${ch.id}">${fi('chp', 'what', 'What it is for', { type: 'select', req: true, ph: 'Select', opts: chPayFor(ch) })}<div class="f2">${fi('chp', 'amount', 'Amount (' + h(chCur(ch)) + ')', { type: 'number', req: true, min: 0.01, step: '0.01' })}${fi('chp', 'date', side === 'sponsor' ? 'Date paid' : 'Date received', { type: 'date', req: true, maxv: today() })}</div>${fi('chp', 'ref', 'Payment reference (optional)', { ph: 'Bank or transfer reference', max: 80 })}<div class="field"><label class="lbl" for="chp_files">Supporting records (optional)</label><input id="chp_files" class="input" type="file" name="files" multiple><span class="help">For example a remittance advice or receipt.</span></div>${fi('chp', 'note', 'Note (optional)', { type: 'textarea', rows: 2, max: 500 })}${banner('info', 'Pending until both sides confirm', 'This is recorded as pending verification. ' + (side === 'sponsor' ? 'The Circle owner confirms independently whether the amount was received.' : 'The sponsor confirms independently whether they made this payment.') + ' ' + CH_OFFLINE)}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Record payment</button></div></form>`,
    true,
  );
};
F.chp = (d, form) => {
  const ch = chById(d.id);
  const opts = chPayFor(ch).map(([v]) => v);
  const ms = d.what && d.what.startsWith('ms:') ? ch.milestones.find(m => m.id === d.what.slice(3)) : null;
  const stated = ch.payments.filter(payLive).reduce((a, p) => a + (p.status === 'Confirmed' ? +p.final : payStated(p)), 0);
  const msLeft = ms ? +ms.amount - msPays(ch, ms).reduce((a, p) => a + (p.status === 'Confirmed' ? +p.final : payStated(p)), 0) : Infinity;
  if (
    !validate('chp', d, {
      what: [['req', 'Choose what the payment is for.'], ['fn', { f: v => opts.includes(v), m: 'Choose one of the listed items.' }]],
      amount: ['req', 'num', ['fn', { f: v => stated + +v <= ch.commit.amount + 0.005, m: 'This would take payments above the committed ' + chCur(ch) + ' ' + ch.commit.amount.toLocaleString('en-US') + '.' }], ['fn', { f: v => +v <= msLeft + 0.005, m: 'This is more than is still due on this milestone (' + chCur(ch) + ' ' + (msLeft === Infinity ? 0 : msLeft).toLocaleString('en-US') + ').' }]],
      date: ['req', ['fn', { f: v => v <= today(), m: 'The date cannot be in the future.' }]],
    })
  )
    return render();
  const files = chTakeFiles(form);
  if (!files) return render();
  const side = chSide(ch);
  const rec = { amount: +d.amount, date: d.date, ref: (d.ref || '').trim(), files, note: (d.note || '').trim(), at: now(), by: myId() };
  const p = { id: uid('cpy'), ref: 'PAY-' + String(ch.payments.length + 1).padStart(3, '0'), kind: ms ? 'Milestone payment' : 'Initial funding', ms: ms ? ms.id : null, at: now(), sp: side === 'sponsor' ? { ...rec, made: true } : null, ow: side === 'owner' ? { ...rec, received: true } : null, status: 'Pending verification' };
  ch.payments.push(p);
  const other = side === 'sponsor' ? ch.team.owner : ch.sponsor;
  notify(other, (side === 'sponsor' ? ch.alias + ' recorded a payment for “' + ch.title + '”. Confirm whether you received it.' : me().name + ' recorded a payment received for “' + ch.title + '”. Confirm whether you made it.'), 'challenge', { id: ch.id, tab: 'pay' });
  chLog(ch, p.ref + ' recorded by the ' + (side === 'sponsor' ? 'sponsor' : 'Circle owner') + ' · pending verification');
  audit('Challenge payment recorded', ch.id, p.ref + ' · ' + chCur(ch) + ' ' + d.amount + ' · ' + side);
  UI.modal = null;
  clearF('chp');
  toast('Recorded as pending verification. It is confirmed only when the other side confirms it too.');
  ok();
};
A.chPayConf = d => {
  const ch = chById(d.id);
  const p = ch.payments.find(x => x.id === d.p);
  const side = chSide(ch);
  const mineR = payRec(p, side);
  const theirs = payRec(p, side === 'sponsor' ? 'owner' : 'sponsor');
  const fix = p.status === 'Flagged for review';
  clearF('chpc');
  UI.form.chpc = mineR ? { yes: (side === 'sponsor' ? mineR.made : mineR.received) ? 'yes' : 'no', amount: String(mineR.amount || ''), date: mineR.date, ref: mineR.ref || '' } : { yes: 'yes', date: today() };
  const ms = ch.milestones.find(m => m.id === p.ms);
  modal(
    fix ? 'Correct your record · ' + p.ref : 'Confirm payment ' + p.ref,
    () =>
      `<form data-f="chpc" class="col fgap" novalidate>${errSum('chpc')}<input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="p" value="${p.id}">${dl([
        ['For', ms ? 'Milestone ' + ms.n + ' · ' + h(ms.t) : 'Initial project funding'],
        theirs && [side === 'sponsor' ? 'Circle owner says' : 'Sponsor says', (fix ? (side === 'sponsor' ? (theirs.received ? 'Received ' + money(chCur(ch), theirs.amount) : 'Not received') : theirs.made ? 'Paid ' + money(chCur(ch), theirs.amount) : 'Not paid') : side === 'sponsor' ? 'Received' : 'Paid') + ' · ' + fmtD(theirs.date) + (theirs.ref ? ' · ref ' + h(theirs.ref) : '')],
        theirs && theirs.note && ['Their note', h(theirs.note)],
      ])}${fix ? banner('warn', 'The two records differ', 'Correct your record if you made a mistake. If you still disagree, escalate the payment to an independent Steward.') : banner('info', 'Independent confirmation', 'Enter what actually happened. The other side’s amount is shown after you confirm.')}<fieldset class="np-fs col"><legend class="lbl">${side === 'sponsor' ? 'Did you make this payment?' : 'Did you receive this payment?'} <span class="req">*</span></legend><div class="row wrap">${[
        ['yes', side === 'sponsor' ? 'Yes, I paid it' : 'Yes, I received it'],
        ['no', side === 'sponsor' ? 'No, I did not pay it' : 'No, I have not received it'],
      ]
        .map(([v, l]) => `<label class="choice"><input type="radio" name="yes" value="${v}" ${fv('chpc', 'yes') === v ? 'checked' : ''}><span class="rad" aria-hidden="true"></span><span>${l}</span></label>`)
        .join('')}</div></fieldset><div class="f2">${fi('chpc', 'amount', 'Amount ' + (side === 'sponsor' ? 'paid' : 'received') + ' (' + h(chCur(ch)) + ')', { type: 'number', min: 0, step: '0.01', help: 'Needed when you answer Yes.' })}${fi('chpc', 'date', side === 'sponsor' ? 'Date paid' : 'Date received', { type: 'date', maxv: today() })}</div>${fi('chpc', 'ref', 'Payment reference (optional)', { max: 80 })}<div class="field"><label class="lbl" for="chpc_files">Supporting records (optional)</label><input id="chpc_files" class="input" type="file" name="files" multiple></div>${fi('chpc', 'note', 'Note (optional)', { type: 'textarea', rows: 2, max: 500 })}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${fix ? 'Save correction' : 'Confirm'}</button></div></form>`,
    true,
  );
};
F.chpc = (d, form) => {
  const yes = d.yes === 'yes';
  if (!validate('chpc', d, { yes: [['req', 'Answer the question.']], ...(yes ? { amount: ['req', 'num'], date: ['req', ['fn', { f: v => v <= today(), m: 'The date cannot be in the future.' }]] } : {}) })) return render();
  const files = chTakeFiles(form);
  if (!files) return render();
  const ch = chById(d.id);
  const p = ch.payments.find(x => x.id === d.p);
  const side = chSide(ch);
  const old = payRec(p, side);
  const rec = { amount: yes ? +d.amount : 0, date: d.date || today(), ref: (d.ref || '').trim(), files: files.length ? files : (old && old.files) || [], note: (d.note || '').trim(), at: now(), by: myId() };
  if (side === 'sponsor') p.sp = { ...rec, made: yes };
  else p.ow = { ...rec, received: yes };
  p.status = chPayEval(p);
  const other = side === 'sponsor' ? ch.team.owner : ch.sponsor;
  notify(other, 'Payment ' + p.ref + ' for “' + ch.title + '”: ' + (p.status === 'Confirmed' ? 'confirmed by both sides' : 'flagged for review: the two records differ'), 'challenge', { id: ch.id, tab: 'pay' });
  chLog(ch, p.ref + ': ' + (side === 'sponsor' ? 'sponsor' : 'Circle owner') + (old ? ' corrected their record' : ' confirmed') + ' · ' + p.status);
  audit('Challenge payment ' + (p.status === 'Confirmed' ? 'confirmed' : 'flagged'), ch.id, p.ref + ' · ' + side);
  UI.modal = null;
  clearF('chpc');
  toast(p.status === 'Confirmed' ? 'Confirmed by both sides.' : 'The two records differ, so the payment is flagged for review.', p.status === 'Confirmed' ? 'ok' : 'warn');
  ok();
};

// ---------- DISPUTES: independent Steward (point 9), aliases (point 10) ----------
const DSP_SIDE = { sponsor: 'Sponsor side', owner: 'Team side' };
const dspCh = dp => chById(dp.ch);
const dspSubject = dp => {
  const ch = dspCh(dp);
  if (dp.subject.kind === 'ms') {
    const m = ch.milestones.find(x => x.id === dp.subject.id);
    return 'Milestone ' + (m ? m.n + ' · ' + m.t : '');
  }
  const p = ch.payments.find(x => x.id === dp.subject.id);
  return 'Payment ' + (p ? p.ref : '');
};
// Inside a dispute nobody is named: the sponsor and everyone on the team appear under the dispute's two aliases.
const dspAlias = (dp, pid) => {
  const ch = dspCh(dp);
  if (pid === ch.sponsor) return dp.aliases.sponsor;
  if (chTeam(ch).includes(pid)) return dp.aliases.team;
  if (pid === dp.steward) return 'Independent Steward';
  return 'Programme administration';
};
const dspMine = dp => {
  const ch = dspCh(dp);
  return chMine(ch) ? 'sponsor' : chOwner(ch) ? 'owner' : null;
};
const dspSees = dp => !!dp && inCtx(dp) && (dspMine(dp) || (role() === 'F' && dp.steward === myId()) || role() === 'A');
const dspAdmins = dp => S.assign.filter(a => a.ctx === dp.ctx && roleBase(a.role) === 'A' && a.status === 'Active').map(a => a.pid).filter((v, i, l) => l.indexOf(v) === i);
// Who could act as Steward, and why someone cannot: a human Faculty/Steward in the programme with no tie to either side.
function dspCands(dp) {
  const ch = dspCh(dp);
  const p = chProj(ch);
  const spOrg = P(ch.sponsor).org;
  const team = chTeam(ch);
  const teamOrgs = team.map(x => P(x).org).filter(Boolean);
  const spaces = p ? SPACE_KINDS.flatMap(k => [byId(k, p[projRoomOf(k).key]), ...linkedObjs(p.id, k)]).filter(Boolean) : [];
  return chFacs(ch).map(pid => {
    const o = P(pid).org;
    const why =
      team.includes(pid)
        ? 'is on the project team'
        : ch.apps.some(a => a.pid === pid)
          ? 'applied to this challenge'
          : o && o === spOrg
            ? 'belongs to the sponsor’s organisation'
            : o && teamOrgs.includes(o)
              ? 'belongs to a team member’s organisation'
              : p && p.stewards.includes(pid)
                ? 'is the project’s Faculty/Steward'
                : spaces.some(s => (s.members || []).some(m => m.pid === pid))
                  ? 'is a member or facilitator of one of the project’s spaces'
                  : (dp.declined || []).some(x => x.pid === pid)
                    ? 'declared a conflict of interest on this dispute'
                    : '';
    return { pid, why };
  });
}
A.chDspNew = d => {
  const ch = chById(d.id);
  clearF('chdn');
  const subj = d.kind === 'ms' ? 'Milestone ' + ch.milestones.find(m => m.id === d.s).n + ' · ' + h(ch.milestones.find(m => m.id === d.s).t) : 'Payment ' + h(ch.payments.find(p => p.id === d.s).ref);
  modal(
    'Escalate to an independent Steward',
    () =>
      `<form data-f="chdn" class="col fgap" novalidate>${errSum('chdn')}<input type="hidden" name="id" value="${ch.id}"><input type="hidden" name="kind" value="${d.kind}"><input type="hidden" name="s" value="${d.s}">${dl([['About', subj]])}${fi('chdn', 'reason', 'What is disputed, and why', { type: 'textarea', rows: 4, req: true, max: 3000, help: 'At least 40 characters. Refer to the agreed milestone, acceptance criteria or payment records.' })}${fi('chdn', 'want', 'The outcome you are asking for', { type: 'textarea', rows: 2, req: true, max: 1000 })}<div class="field"><label class="lbl" for="chdn_files">Supporting files (optional)</label><input id="chdn_files" class="input" type="file" name="files" multiple></div>${banner('info', 'How a dispute is decided', 'The Programme Administrator assigns a human Steward who is not affiliated with either side. The Steward reviews the agreement, the milestone and its acceptance criteria, submissions, decisions, the milestone discussion and payment records, then decides. Both sides appear under new aliases: your name and organisation are not shown to the Steward or to the other side in the dispute.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Escalate</button></div></form>`,
    true,
  );
};
F.chdn = (d, form) => {
  if (!validate('chdn', d, { reason: ['req', ['min', 40]], want: ['req', ['min', 10]] })) return render();
  const files = chTakeFiles(form);
  if (!files) return render();
  const ch = chById(d.id);
  const side = chSide(ch);
  S.disputes = S.disputes || [];
  const dp = { id: uid('dsp'), ref: 'DSP-' + String(S.disputes.length + 1).padStart(4, '0'), ch: ch.id, ctx: ch.ctx, subject: { kind: d.kind, id: d.s }, raisedBy: myId(), side, at: now(), reason: d.reason.trim(), want: d.want.trim(), aliases: {}, status: 'Awaiting Steward assignment', steward: null, declined: [], thread: [], decision: null, log: [] };
  dp.aliases = { sponsor: chAlias('Sponsor side'), team: chAlias('Team side') };
  dp.thread.push({ id: uid('dst'), by: myId(), at: now(), kind: 'statement', t: d.reason.trim() + '\n\nOutcome sought: ' + d.want.trim(), files });
  dp.log.push({ at: now(), t: 'Raised by the ' + DSP_SIDE[side].toLowerCase() + ' (' + dspAlias(dp, myId()) + ')' });
  S.disputes.push(dp);
  const other = side === 'sponsor' ? ch.team.owner : ch.sponsor;
  notify(other, 'Dispute ' + dp.ref + ' was raised about ' + dspSubject(dp) + ' of “' + ch.title + '”. An independent Steward will decide.', 'dispute', { id: dp.id });
  dspAdmins(dp).forEach(a => notify(a, 'Dispute ' + dp.ref + ' needs an independent Steward', 'dispute', { id: dp.id }));
  chLog(ch, 'Dispute ' + dp.ref + ' raised about ' + dspSubject(dp));
  audit('Challenge dispute raised', dp.id, dspSubject(dp) + ' · ' + side);
  UI.modal = null;
  clearF('chdn');
  toast('Escalated. The Programme Administrator assigns an independent Steward.');
  save();
  go('dispute', { id: dp.id });
};
function chDspTab(ch) {
  const ds = chDsps(ch);
  const side = chSide(ch);
  return (
    banner('info', 'Independent Steward', 'If you cannot agree on a milestone’s completion or acceptance, or on a payment, escalate it from the milestone or the payment. A human Steward with no tie to either side reviews the evidence and decides. Both sides appear under aliases.', 'shield') +
    '<div class="section-gap"></div>' +
    card(
      'Disputes',
      '',
      table(
        ['Reference', 'About', 'Raised by', 'Raised', 'Status', ''],
        ds
          .slice()
          .reverse()
          .map(dp => [`<span class="mono">${h(dp.ref)}</span>`, h(dspSubject(dp)), dp.side === side ? 'Your side' : DSP_SIDE[dp.side], fmtD(dp.at), pill(dp.status), L('Open', 'dispute', { id: dp.id }, 'btn btn-s btn-sm')]),
        'No disputes. They are raised from a milestone awaiting review or a flagged payment.',
      ),
    )
  );
}
route('disputes', 'any', () => {
  const r = role();
  if (!['A', 'F'].includes(r)) return head('Disputes', '') + card('', '', empty('shield', 'Disputes are handled by Programme Administrators and independent Stewards', 'Sponsors and Circle owners follow their disputes from the challenge.', L('Back to My PHOENIX', 'home', {}, 'btn btn-s btn-sm')));
  const list = (S.disputes || []).filter(dp => inCtx(dp) && (r === 'A' || dp.steward === myId()));
  return (
    head(r === 'A' ? 'Challenge disputes' : 'Dispute reviews', r === 'A' ? 'Disagreements between sponsors and project teams. Assign a human Steward with no tie to either side. You see aliases, not names.' : 'Disputes you are asked to decide as an independent Steward. Both sides appear under aliases.') +
    banner('info', 'Independence', 'A Steward must be a person, never an AI, and must not be the sponsor, on the project team, an applicant, a member or facilitator of the project’s spaces, or from either side’s organisation. PHOENIX checks these ties; the Steward also confirms independence before seeing the evidence.', 'shield') +
    '<div class="section-gap"></div>' +
    card(
      r === 'A' ? 'Disputes in ' + h(ctxName(ctxId())) : 'Assigned to you',
      '',
      table(
        ['Reference', 'About', 'Raised', r === 'A' ? 'Steward' : 'Raised by', 'Status', ''],
        list
          .slice()
          .reverse()
          .map(dp => [`<span class="mono">${h(dp.ref)}</span>`, h(dspSubject(dp)), fmtD(dp.at), r === 'A' ? (dp.steward ? nm(dp.steward) : '<span class="cap">Not assigned</span>') : h(dp.aliases[dp.side === 'sponsor' ? 'sponsor' : 'team']), pill(dp.status), r === 'A' && dp.status === 'Awaiting Steward assignment' ? B('Assign Steward', 'chDspAssign', { id: dp.id }, 'btn-p btn-sm') : L('Open', 'dispute', { id: dp.id }, 'btn btn-s btn-sm')]),
        r === 'A' ? 'No disputes in this programme.' : 'No disputes are assigned to you.',
      ),
    )
  );
});
A.chDspAssign = d => {
  const dp = byId('disputes', d.id);
  clearF('chda');
  const cs = dspCands(dp);
  modal(
    'Assign an independent Steward · ' + h(dp.ref),
    () =>
      `<form data-f="chda" class="col fgap" novalidate>${errSum('chda')}<input type="hidden" name="id" value="${dp.id}">${dl([
        ['About', h(dspSubject(dp))],
        ['Sides', h(dp.aliases.sponsor) + ' and ' + h(dp.aliases.team)],
      ])}<fieldset class="np-fs col"><legend class="lbl">Faculty/Stewards in this programme <span class="req">*</span></legend><div class="ch-cands">${cs
        .map(c => `<label class="choice ch-cand ${c.why ? 'is-off' : ''}"><input type="radio" name="s" value="${c.pid}" ${c.why ? 'disabled' : ''}><span class="rad" aria-hidden="true"></span><span class="col"><b>${nm(c.pid)}</b><span class="cap">${c.why ? 'Not independent: ' + h(c.why) : 'No tie to either side found'}</span></span></label>`)
        .join('')}</div>${fe('chda', 's') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('chda', 's')}</span>` : ''}</fieldset>${cs.every(c => c.why) ? banner('warn', 'Nobody independent is available', 'Invite a Facilitator / Steward from outside both organisations from ' + L('Programme admin → Invitations', 'admin', { tab: 'invites' }) + ', then assign them here.') : banner('info', '', 'The Steward confirms their independence before they see the evidence, and can decline with a conflict.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit" ${cs.every(c => c.why) ? 'disabled' : ''}>Assign</button></div></form>`,
    true,
  );
};
F.chda = d => {
  const dp = byId('disputes', d.id);
  const c = dspCands(dp).find(x => x.pid === d.s);
  if (!c || c.why) {
    UI.err.chda = { s: c ? 'This person is not independent: ' + c.why + '.' : 'Choose an independent Steward.' };
    return render();
  }
  Object.assign(dp, { steward: d.s, status: 'Awaiting Steward acceptance', assignedBy: myId(), assignedAt: now() });
  dp.log.push({ at: now(), t: 'Steward assigned by the Programme Administrator' });
  notify(d.s, 'You are asked to act as independent Steward on dispute ' + dp.ref + '. Confirm you have no tie to either side before you see the evidence.', 'dispute', { id: dp.id });
  const ch = dspCh(dp);
  [ch.sponsor, ch.team.owner].forEach(x => notify(x, 'An independent Steward was assigned to dispute ' + dp.ref, 'dispute', { id: dp.id }));
  audit('Dispute Steward assigned', dp.id, d.s);
  UI.modal = null;
  clearF('chda');
  toast('Assigned. The Steward confirms independence before reviewing.');
  ok();
};
const dspThread = dp =>
  dp.thread.length
    ? `<ol class="ch-notes">${dp.thread.map(t => `<li class="${t.kind}"><b>${h(dspAlias(dp, t.by))}</b><span class="cap"> · ${fmtD(t.at)}${t.kind === 'question' ? ' · question to both sides' : ''}</span><p>${chText(t.t)}</p>${chFiles(t.files)}</li>`).join('')}</ol>`
    : '<p class="cap">No statements yet.</p>';
// The evidence pack: the agreement, the milestone or payment, submissions, decisions and discussion, under aliases.
function dspPack(dp) {
  const ch = dspCh(dp);
  const cur = chCur(ch);
  const c = ch.commit;
  const al = pid => h(dspAlias(dp, pid));
  let out = card(
    'What was agreed',
    'The funding commitment both sides confirmed',
    c ? dl([['Committed amount', money(c.currency, c.amount) + ' · ' + pill(c.status)], ['Payment arrangement', chText(c.terms)]]) : '<p class="cap">No commitment recorded.</p>',
  );
  if (dp.subject.kind === 'ms') {
    const m = ch.milestones.find(x => x.id === dp.subject.id);
    out +=
      card(
        'The milestone',
        'As agreed by both sides',
        dl([
          ['Milestone', m.n + ' · ' + h(m.t)],
          ['Deliverables', chText(m.deliv)],
          ['Expected outcome', chText(m.outcome)],
          ['Acceptance criteria', chText(m.criteria)],
          ['Deadline', m.due ? fmtD(m.due) : 'None'],
          ['Amount paid on approval', money(cur, m.amount)],
          ['Agreed', m.agreedAt ? fmtD(m.agreedAt) : 'Not recorded'],
          ['Status now', pill(msLabel(m))],
        ]),
      ) +
      card(
        'Completion submissions and decisions',
        '',
        m.subs.map((s, i) => `<div class="ch-sub"><div class="row wrap ch-sub-h"><b>Submission ${i + 1}</b><span class="cap">${fmtD(s.at)} · ${al(s.by)}</span></div><p>${chText(s.note)}</p>${chFiles(s.files)}${(s.evs || []).length ? `<div class="cap">Evidence: ${chEvs(s.evs)}</div>` : ''}${s.decision ? `<div class="ch-dec">${pill(s.decision.v)} <span class="cap">${fmtD(s.decision.at)} · ${s.decision.steward ? 'Steward decision' : al(s.decision.by)}</span>${s.decision.note ? `<p>${chText(s.decision.note)}</p>` : ''}</div>` : '<div class="cap">No decision yet</div>'}</div>`).join('') || '<p class="cap">No submissions.</p>',
      ) +
      card('Milestone discussion', 'Messages the two sides exchanged about this milestone', m.notes.length ? `<ol class="ch-notes">${m.notes.map(n => `<li class="${n.kind}"><b>${n.kind === 'steward' ? 'Independent Steward' : al(n.by)}</b><span class="cap"> · ${fmtD(n.at)}</span><p>${chText(n.t)}</p></li>`).join('')}</ol>` : '<p class="cap">No discussion.</p>');
  } else {
    const p = ch.payments.find(x => x.id === dp.subject.id);
    const ms = ch.milestones.find(m => m.id === p.ms);
    const side = (r, k) => (r ? `${(k === 'sponsor' ? r.made : r.received) ? (k === 'sponsor' ? 'Paid ' : 'Received ') + money(cur, r.amount) : k === 'sponsor' ? 'Says not paid' : 'Says not received'}<div class="cap">${fmtD(r.date)}${r.ref ? ' · ref ' + h(r.ref) : ''}</div>${r.note ? `<p class="cap">${h(r.note)}</p>` : ''}${chFiles(r.files)}` : '<span class="cap">No record</span>');
    out += card(
      'The payment records',
      'What each side stated',
      dl([
        ['Payment', h(p.ref) + ' · ' + (ms ? 'Milestone ' + ms.n + ' · ' + h(ms.t) + ' (' + money(cur, ms.amount) + ', ' + h(msLabel(ms)) + ')' : 'Initial project funding')],
        [h(dp.aliases.sponsor), side(p.sp, 'sponsor')],
        [h(dp.aliases.team), side(p.ow, 'owner')],
        ['Status', pill(p.status)],
      ]),
    );
  }
  return out;
}
route('dispute', 'any', () => {
  const dp = byId('disputes', UI.p.id);
  if (!dspSees(dp)) return head('Dispute', '') + card('', '', empty('shield', 'This dispute is not available to you', 'Disputes are visible to the two sides, the assigned Steward and Programme Administrators in the same programme.', L('Back to My PHOENIX', 'home', {}, 'btn btn-s btn-sm')));
  const ch = dspCh(dp);
  const mineSide = dspMine(dp);
  const stew = role() === 'F' && dp.steward === myId();
  const accepted = !!dp.accepted;
  const crumbs = mineSide ? [['Open challenges', 'challenges'], [h(ch.title), 'challenge', { id: ch.id, tab: 'dsp' }], [h(dp.ref)]] : [[role() === 'A' ? 'Challenge disputes' : 'Dispute reviews', 'disputes'], [h(dp.ref)]];
  const sideRow = (k, a) => `<div class="lrow"><span class="tile t-soft">${ic('shield', 16)}</span><div class="lt"><b>${h(a)}</b><p class="cap">${k === 'sponsor' ? 'The sponsor' : 'The project team; the Circle owner speaks for it'}${mineSide && (mineSide === k || (mineSide === 'owner' && k === 'team')) ? ' · your side' : ''}</p></div></div>`;
  const parties = card(
    'The two sides',
    'Names and organisations are not shown in a dispute, to the Steward or to each other.',
    sideRow('sponsor', dp.aliases.sponsor) + sideRow('team', dp.aliases.team) + `<div class="lrow"><span class="tile t-soft">${ic('user', 16)}</span><div class="lt"><b>Independent Steward</b><p class="cap">${dp.steward ? nm(dp.steward) + (accepted ? ' · confirmed independence ' + fmtD(dp.accepted.at) : ' · awaiting acceptance') : 'Not assigned yet'}</p></div></div>`,
    '',
    'ch-dsp-parties',
  );
  // the Steward confirms independence before any evidence is shown
  if (stew && dp.status === 'Awaiting Steward acceptance')
    return (
      crumbsHtml(crumbs) +
      head('Dispute ' + h(dp.ref), 'About ' + h(dspSubject(dp)) + ' · raised ' + fmtD(dp.at), pill(dp.status)) +
      hmCols(
        card(
          'Confirm your independence',
          'You see the evidence only after you confirm.',
          `<form data-f="chdsa" class="col fgap" novalidate><input type="hidden" name="id" value="${dp.id}">${fi('chdsa', 'attest', 'I am not affiliated with either side or their organisations, and I have no personal or financial interest in this project or its outcome', { type: 'checkbox' })}${fi('chdsa', 'why', 'If you have a conflict, say what it is', { type: 'textarea', rows: 2, max: 500, help: 'Needed only if you decline. The Programme Administrator assigns someone else.' })}<div class="actions"><button class="btn btn-s" type="submit" name="v" value="decline">Decline: I have a conflict</button><button class="btn btn-p" type="submit" name="v" value="accept">Accept and review</button></div></form>`,
          '',
          'accent',
        ),
        parties,
      )
    );
  const canPost = dspOpen(dp) && (mineSide || (stew && accepted));
  const decide = stew && dp.status === 'Under review';
  const kinds =
    dp.subject.kind === 'ms'
      ? [
          ['accept', 'Milestone accepted as complete: it is recorded as approved and its payment can be recorded'],
          ['more', 'Further work required: the milestone stays pending until the items below are delivered'],
        ]
      : [
          ['confirm', 'Payment established: confirmed at the amount below'],
          ['none', 'Payment not established: the record is closed and a new payment must be recorded'],
        ];
  const main =
    card(
      'The dispute',
      'Raised ' + fmtD(dp.at) + ' by ' + h(dp.aliases[dp.side === 'sponsor' ? 'sponsor' : 'team']),
      dl([
        ['About', h(dspSubject(dp)) + ' · open challenge “' + h(ch.title) + '”'],
        ['What is disputed', chText(dp.reason)],
        ['Outcome sought', chText(dp.want)],
      ]),
    ) +
    (dp.decision
      ? card(
          'Decision',
          'Recorded ' + fmtD(dp.decision.at) + ' by the independent Steward',
          dl([
            ['Outcome', '<b>' + h(kinds.find(([v]) => v === dp.decision.v)[1]) + '</b>' + (dp.decision.amount != null ? ' · ' + money(chCur(ch), dp.decision.amount) : '')],
            ['Reasons', chText(dp.decision.reasons)],
            dp.decision.next && ['What happens next', chText(dp.decision.next)],
          ]),
          '',
          'accent',
        )
      : '') +
    dspPack(dp) +
    card(
      'Statements and questions',
      'Both sides and the Steward see everything here.',
      dspThread(dp) +
        (canPost
          ? `<form data-f="chds" class="col fgap" novalidate><input type="hidden" name="id" value="${dp.id}">${fi('chds', 't', stew ? 'Question to both sides' : 'Add a statement', { type: 'textarea', rows: 3, req: true, max: 3000, help: 'Shown under ' + h(stew ? 'Independent Steward' : dspAlias(dp, myId())) + '. Do not include names or organisations.' })}<div class="field"><label class="lbl" for="chds_files">Files (optional)</label><input id="chds_files" class="input" type="file" name="files" multiple></div><div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">${ic('send', 14)}Post</button></div></form>`
          : ''),
    ) +
    (decide
      ? card(
          'Record your decision',
          'Base it on the agreement, the acceptance criteria and the documented facts.',
          `<form data-f="chdd" class="col fgap" novalidate>${errSum('chdd')}<input type="hidden" name="id" value="${dp.id}"><fieldset class="np-fs col"><legend class="lbl">Decision <span class="req">*</span></legend>${kinds.map(([v, l]) => `<label class="choice"><input type="radio" name="v" value="${v}" ${fv('chdd', 'v') === v ? 'checked' : ''}><span class="rad" aria-hidden="true"></span><span>${h(l)}</span></label>`).join('')}${fe('chdd', 'v') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('chdd', 'v')}</span>` : ''}</fieldset>${dp.subject.kind === 'pay' ? fi('chdd', 'amount', 'Established amount (' + h(chCur(ch)) + ')', { type: 'number', min: 0.01, step: '0.01', help: 'Needed when the payment is established.' }) : ''}${fi('chdd', 'reasons', 'Reasons', { type: 'textarea', rows: 4, req: true, max: 3000, help: 'At least 40 characters. Both sides read this.' })}${fi('chdd', 'next', 'What happens next', { type: 'textarea', rows: 2, max: 1000, help: dp.subject.kind === 'ms' ? 'For further work, list exactly what must be delivered.' : 'Optional.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Record decision</button></div></form>`,
          '',
          'accent',
        )
      : '');
  const rail =
    parties +
    (role() === 'A' && dp.status === 'Awaiting Steward assignment' ? card('Needs a Steward', '', '<p class="cap">Assign a Faculty/Steward with no tie to either side.</p>', B('Assign Steward', 'chDspAssign', { id: dp.id }, 'btn-p btn-sm')) : '') +
    (dp.raisedBy === myId() && dspOpen(dp) ? card('Withdraw', '', '<p class="cap">If you have settled it with the other side, withdraw the dispute.</p>', CB('Withdraw dispute', 'chDspWithdraw', { id: dp.id }, 'Withdraw dispute ' + dp.ref + '? The milestone or payment returns to where it was.')) : '') +
    card('Record', '', `<ol class="mtl ws-tl">${dp.log.slice().reverse().map(l => `<li class="done"><span class="mtl-dot">${ic('check', 12)}</span><div class="col"><b>${h(l.t)}</b><span class="cap">${fmtD(l.at)}</span></div></li>`).join('')}</ol>`);
  return crumbsHtml(crumbs) + head('Dispute ' + h(dp.ref), 'About ' + h(dspSubject(dp)) + ' · raised ' + fmtD(dp.at), pill(dp.status)) + hmCols(main, rail);
});
F.chdsa = d => {
  const dp = byId('disputes', d.id);
  if (d.v === 'decline') {
    if (!validate('chdsa', d, { why: [['req', 'Say what the conflict is.'], ['min', 5]] })) return render();
    dp.declined.push({ pid: myId(), at: now(), why: d.why.trim() });
    Object.assign(dp, { steward: null, status: 'Awaiting Steward assignment' });
    dp.log.push({ at: now(), t: 'The assigned Steward declined with a conflict of interest' });
    dspAdmins(dp).forEach(a => notify(a, 'The Steward declined dispute ' + dp.ref + ' with a conflict. Assign someone else.', 'dispute', { id: dp.id }));
    audit('Dispute Steward declined', dp.id, 'conflict declared');
    clearF('chdsa');
    toast('Declined. The Programme Administrator assigns someone else.');
    save();
    return go('disputes');
  }
  if (!validate('chdsa', d, { attest: [['req', 'Confirm your independence to review this dispute.']] })) return render();
  Object.assign(dp, { status: 'Under review', accepted: { at: now(), attest: true } });
  dp.log.push({ at: now(), t: 'Steward confirmed independence and started the review' });
  const ch = dspCh(dp);
  [ch.sponsor, ch.team.owner].forEach(x => notify(x, 'The independent Steward started reviewing dispute ' + dp.ref, 'dispute', { id: dp.id }));
  audit('Dispute Steward accepted', dp.id, 'independence confirmed');
  clearF('chdsa');
  toast('Independence confirmed. The evidence is now visible to you.');
  ok();
};
F.chds = (d, form) => {
  if (!validate('chds', d, { t: ['req', ['min', 5]] })) return render();
  const files = chTakeFiles(form);
  if (!files) return render();
  const dp = byId('disputes', d.id);
  const stew = dp.steward === myId();
  dp.thread.push({ id: uid('dst'), by: myId(), at: now(), kind: stew ? 'question' : 'statement', t: d.t.trim(), files });
  const ch = dspCh(dp);
  [ch.sponsor, ch.team.owner, dp.steward].filter(x => x && x !== myId()).forEach(x => notify(x, (stew ? 'The Steward asked a question on dispute ' : 'New statement on dispute ') + dp.ref, 'dispute', { id: dp.id }));
  audit('Dispute ' + (stew ? 'question' : 'statement') + ' posted', dp.id, '');
  clearF('chds');
  toast('Posted.');
  ok();
};
F.chdd = d => {
  const dp = byId('disputes', d.id);
  const pay = dp.subject.kind === 'pay';
  if (!validate('chdd', d, { v: [['req', 'Choose a decision.']], reasons: ['req', ['min', 40]], ...(pay && d.v === 'confirm' ? { amount: ['req', 'num'] } : {}), ...(!pay && d.v === 'more' ? { next: [['req', 'List what must be delivered.'], ['min', 10]] } : {}) })) return render();
  const ch = dspCh(dp);
  dp.decision = { v: d.v, reasons: d.reasons.trim(), next: (d.next || '').trim(), amount: pay && d.v === 'confirm' ? +d.amount : null, at: now(), by: myId() };
  dp.status = 'Decided';
  dp.log.push({ at: now(), t: 'Decision recorded by the independent Steward' });
  // the decision takes effect on the milestone or payment
  if (pay) {
    const p = ch.payments.find(x => x.id === dp.subject.id);
    p.resolved = dp.ref;
    if (d.v === 'confirm') {
      p.status = 'Confirmed';
      p.final = +d.amount;
    } else p.status = 'Not established';
  } else {
    const m = ch.milestones.find(x => x.id === dp.subject.id);
    const s = m.subs.slice(-1)[0];
    const v = d.v === 'accept' ? 'Approved' : 'More information requested';
    if (s) s.decision = { v, at: now(), by: myId(), steward: dp.ref, note: d.reasons.trim() + (d.next ? '\n\n' + d.next.trim() : '') };
    m.status = v;
    if (v === 'Approved') m.approvedAt = now();
    m.notes.push({ id: uid('mn'), by: myId(), at: now(), kind: 'steward', t: 'Steward decision ' + dp.ref + ': ' + (v === 'Approved' ? 'accepted as complete.' : 'further work required. ' + d.next.trim()) });
  }
  chLog(ch, 'Dispute ' + dp.ref + ' decided by the independent Steward');
  [ch.sponsor, ch.team.owner, ...dspAdmins(dp)].forEach(x => notify(x, 'Dispute ' + dp.ref + ' has been decided', 'dispute', { id: dp.id }));
  audit('Dispute decided', dp.id, d.v);
  clearF('chdd');
  toast('Decision recorded. Both sides have been told.');
  ok();
};
A.chDspWithdraw = d => {
  const dp = byId('disputes', d.id);
  dp.status = 'Withdrawn';
  dp.log.push({ at: now(), t: 'Withdrawn by the side that raised it' });
  const ch = dspCh(dp);
  [ch.sponsor, ch.team.owner, dp.steward, ...dspAdmins(dp)].filter(x => x && x !== myId()).forEach(x => notify(x, 'Dispute ' + dp.ref + ' was withdrawn', 'dispute', { id: dp.id }));
  chLog(ch, 'Dispute ' + dp.ref + ' withdrawn');
  audit('Dispute withdrawn', dp.id, '');
  toast('Dispute withdrawn.');
  ok();
};

// ---------- PROJECT PAGE: the sponsor agreement, summarised for the team ----------
function chProjCard(p) {
  const ch = p && p.challenge && chById(p.challenge);
  if (!ch) return '';
  if (!chOnTeam(ch))
    return card('Sponsored project', '', '<p class="cap">Formed from an open challenge. Its funding, milestones and payments are visible to the sponsor and the project team only.</p>', '', 'prj-panel');
  const cur = chCur(ch);
  const ms = ch.milestones;
  return card(
    'Sponsor agreement',
    'Formed from the open challenge “' + h(ch.title) + '”',
    dl([
      ['Sponsor', chWho(ch)],
      ['Funding', ch.commit ? money(cur, ch.commit.amount) + ' ' + pill(ch.commit.status) : '<span class="cap">Not committed yet</span>'],
      ['Milestones', ms.length ? ms.filter(m => m.status === 'Approved').length + ' approved · ' + ms.filter(m => !['Proposed', 'Changes requested'].includes(m.status)).length + ' agreed · ' + ms.length + ' in total' : '<span class="cap">None yet</span>'],
      ['Confirmed payments', money(cur, chPaid(ch))],
    ]),
    L('Funding & milestones', 'challenge', { id: ch.id, tab: 'agree' }, 'btn btn-s btn-sm'),
    'prj-panel',
  );
}
const chHiddenView = () =>
  head('Project', '') +
  card('', '', empty('shield', 'Hidden while you are the independent Steward', 'You are deciding a dispute about this project, so its identifying records stay hidden from you until the dispute is decided. Review it from Dispute reviews.', L('Dispute reviews', 'disputes', {}, 'btn btn-s btn-sm')));

// ---------- SEED: one open challenge, and one funded project with milestones, payments and disputes ----------
function chMigrate() {
  S.chrooms = S.chrooms || [];
  S.disputes = S.disputes || [];
  if (S.challenges) return;
  S.challenges = [];
  allLinks();
  const t = (d, h_ = '09:00') => d + 'T' + h_;
  const L_ = (st, sid, tt, tid, type) => S.links.push({ id: 'olc' + sid, source_type: st, source_id: sid, target_type: tt, target_id: tid, link_type: type, context_id: 'c1', created_by: 'p6', byLabel: 'Sponsor · Saffron Kestrel 64', created_at: t('2026-09-12', '10:00'), primary: true });
  // 1 · open, with applications and an active chat room
  S.challenges.push({
    id: 'chl1', ctx: 'c1', sponsor: 'p6', alias: 'Sponsor · Cobalt Heron 27', room: 'chr1', status: 'Open', at: t('2026-10-06'),
    title: 'Rainwater harvesting for community gardens',
    problem: 'Six community gardens in Wards 3 and 7 rely on mains water through the summer, which most volunteers pay for themselves. We want a low-cost rainwater harvesting kit that volunteers can install and maintain without specialist tools.',
    objectives: 'Design and test a rainwater kit on two gardens, then document it so the other four can install it themselves.',
    outcomes: 'Two working installations, a measured reduction in mains water use, and an illustrated install guide.',
    needs: 'Basic plumbing or construction skills, community engagement, and someone comfortable measuring water use over eight weeks.',
    skills: ['Water', 'Food resilience', 'Community engagement'], country: 'United States', area: 'Wards 3 and 7', budget: 8000, currency: 'USD', closes: '2026-11-15',
    apps: [
      { id: 'cap1', pid: 'p9', at: t('2026-10-08', '10:15'), pitch: 'I run the volunteer rota for the Ward 7 cooling survey and know most of the garden leads. I can organise installation days and keep the measurement log going every week.', exp: 'Volunteer coordination for the Ward 7 Cooling Circle; basic carpentry.', avail: '1–2 days a week', share: true, status: 'Submitted', rating: null, note: '', log: [{ at: t('2026-10-08', '10:15'), by: 'p9', t: 'Applied' }] },
      { id: 'cap2', pid: 'p4', at: t('2026-10-09', '14:40'), pitch: 'GreenGrid can model roof catchment and size the tanks for each garden, and lend two flow meters for the measurement period.', exp: 'GIS and sensor projects with community partners; we sized tanks for a school project last year.', avail: 'A few hours a week', share: true, status: 'Shortlisted', rating: 4, note: 'Strong on sizing and measurement. Check who would do the hands-on install.', log: [{ at: t('2026-10-09', '14:40'), by: 'p4', t: 'Applied' }, { at: t('2026-10-12', '09:10'), by: 'p6', t: 'Shortlisted' }] },
      { id: 'cap3', pid: 'p10', at: t('2026-10-11', '18:05'), pitch: 'I grew up with rainwater tanks and can teach volunteers to clean and maintain them. I would like to write the install guide.', exp: 'Led the Ward 3 canopy survey team; writing for the ward newsletter.', avail: '1–2 days a week', share: false, status: 'Submitted', rating: null, note: '', log: [{ at: t('2026-10-11', '18:05'), by: 'p10', t: 'Applied' }] },
    ],
    milestones: [], payments: [], commit: null, team: null, project: null, reveal: false,
    log: [{ at: t('2026-10-06'), by: 'p6', t: 'Posted to the Explore board as Sponsor · Cobalt Heron 27' }, { at: t('2026-10-12', '09:10'), by: 'p6', t: 'Leah Park: shortlisted' }],
  });
  S.chrooms.push({
    id: 'chr1', ctx: 'c1', challenge: 'chl1', sponsor: 'p6', alias: 'Sponsor · Cobalt Heron 27', name: 'Challenge · Rainwater harvesting for community gardens', state: 'Active',
    members: [{ pid: 'p6', role: 'Sponsor', status: 'Active' }, { pid: 'p9', role: 'Applicant', status: 'Active' }, { pid: 'p4', role: 'Applicant', status: 'Active' }, { pid: 'p10', role: 'Applicant', status: 'Active' }],
    chat: [
      { id: 'mc101', sys: true, at: t('2026-10-06'), t: 'Chat room for the open challenge “Rainwater harvesting for community gardens”. Everyone who asks to take part joins here. The sponsor appears as Sponsor · Cobalt Heron 27.' },
      { id: 'mc102', sys: true, at: t('2026-10-08', '10:15'), t: 'Daniel Kim asked to take part and joined the chat room' },
      { id: 'mc103', by: 'p6', at: t('2026-10-08', '11:00'), t: 'Welcome, and thank you for your interest. Please ask anything about the gardens or the budget here so everyone sees the answers.' },
      { id: 'mc104', sys: true, at: t('2026-10-09', '14:40'), t: 'Leah Park asked to take part and joined the chat room' },
      { id: 'mc105', by: 'p4', at: t('2026-10-09', '15:02'), t: 'Do the gardens have roofs or sheds we can collect from, or would the kit need its own catchment?', q: true, ans: true },
      { id: 'mc106', by: 'p6', at: t('2026-10-09', '16:30'), t: 'Four of the six have a shed roof of at least 10 m². The other two would need a small freestanding catchment.', reply: 'mc105' },
      { id: 'mc107', sys: true, at: t('2026-10-11', '18:05'), t: 'Ana Lopez asked to take part and joined the chat room' },
      { id: 'mc108', by: 'p9', at: t('2026-10-12', '08:20'), t: 'Is the indicative budget for both pilot gardens together, including measurement?', q: true },
    ],
  });
  // 2 · team formed: project, Circle, commitment, four milestones, two payments and two disputes
  S.projects.push({ id: 'prc2', owner: 'p1', ctx: 'c1', status: 'Accepted', stage: 'Circle', stewards: ['p2'], clar: [], thread: [], type: 'Opportunity', title: 'Low-cost shade for Ward 4 market stalls', desc: 'Stallholders at the Ward 4 market have no shade in the afternoon. Heat drives customers away and spoils produce. The project designs, tests and rolls out low-cost shades that stallholders can put up and take down themselves.', tags: ['Urban heat', 'Livelihoods'], country: 'United States', area: 'Ward 4 market', challenge: 'chl2', supportPath: 'Start in a Circle', submitted: '2026-09-12', circle: 'cic2', moves: [{ at: t('2026-09-12', '10:00'), by: 'p6', byLabel: 'Sponsor · Saffron Kestrel 64', from: null, to: 'Circle', space: 'cic2', why: 'Starting room chosen by the sponsor' }], history: [{ at: t('2026-09-12', '10:00'), t: 'Formed from the open challenge “Low-cost shade for market stalls” by its sponsor, Sponsor · Saffron Kestrel 64. Faculty/Steward: Dr Asha Rao.' }, { at: t('2026-09-12', '10:00'), t: 'Started in Circle “Low-cost shade for Ward 4 market stalls Circle”' }] });
  S.circles.push({ id: 'cic2', ctx: 'c1', name: 'Low-cost shade for Ward 4 market stalls Circle', purpose: 'Agree scope and plan for “Low-cost shade for Ward 4 market stalls”, formed from an open challenge.', outcome: 'Shades tested with stallholders and a rollout plan they agree.', owner: 'p1', facilitator: 'p2', project: 'prc2', origin: { type: 'Project', id: 'prc2' }, visibility: 'Members only', docs: [], state: 'Active', agreement: 'Circle working agreement v1', members: [{ pid: 'p1', role: 'Project owner', status: 'Active' }, { pid: 'p2', role: 'Facilitator', status: 'Active' }, { pid: 'p9', role: 'Member', status: 'Active' }, { pid: 'p10', role: 'Member', status: 'Active' }], chat: [{ id: 'mc201', sys: true, at: t('2026-09-12', '10:00'), t: 'Circle formed from the open challenge “Low-cost shade for market stalls”. Sponsor: Sponsor · Saffron Kestrel 64.' }, { id: 'mc202', by: 'p1', at: t('2026-09-13', '09:30'), t: 'Welcome all. First job: the stall survey. Daniel, can you take the north row?' }, { id: 'mc203', by: 'p9', at: t('2026-09-13', '09:41'), t: 'Yes, Saturday morning works.' }], sessions: [], reflections: [], commitments: [], concerns: [], decisions: [{ t: 'Prototype with canvas and aluminium poles', at: '2026-09-26', by: 'Circle vote — 3 of 3 eligible voted “Approve” (100%) · threshold 60% · quorum 50% met' }], polls: [], pause: null, createdBy: 'p1' });
  L_('circles', 'cic2', 'projects', 'prc2', 'originated-from');
  const M = (id, n, t_, deliv, outcome, criteria, due, amount, status, extra) => ({ id, n, t: t_, deliv, outcome, criteria, due, amount, status, by: 'p6', ok: { sponsor: t('2026-09-15'), owner: t('2026-09-16') }, agreedAt: t('2026-09-16'), notes: [], subs: [], versions: [], ...extra });
  S.challenges.push({
    id: 'chl2', ctx: 'c1', sponsor: 'p6', alias: 'Sponsor · Saffron Kestrel 64', room: 'chr2', status: 'Requests closed', at: t('2026-08-25'),
    title: 'Low-cost shade for market stalls',
    problem: 'Stallholders at the Ward 4 market have no shade in the afternoon. Heat drives customers away and spoils produce. Existing gazebos are too expensive and too heavy for one person.',
    objectives: 'Design a shade one stallholder can put up in five minutes, test it on five stalls, then roll it out with a maintenance guide.',
    outcomes: 'Shades on at least 20 stalls, measured temperature reduction under the shade, and stallholders able to maintain them.',
    needs: 'Design and making skills, a survey of the stalls, and time with stallholders on market days.',
    skills: ['Urban heat', 'Livelihoods'], country: 'United States', area: 'Ward 4 market', budget: 12000, currency: 'USD', closes: '2026-09-10',
    apps: [
      { id: 'cap4', pid: 'p1', at: t('2026-08-27'), pitch: 'I lead the Ward 7 cooling map and already measure street temperatures. I can run the stall survey and coordinate the testing with stallholders.', exp: 'Heat survey methodology (approved evidence); Ward 7 Cooling Circle.', avail: '1–2 days a week', share: true, status: 'Selected', rating: 5, note: 'Best placed to own it.', log: [{ at: t('2026-08-27'), by: 'p1', t: 'Applied' }, { at: t('2026-09-05'), by: 'p6', t: 'Shortlisted' }, { at: t('2026-09-12', '10:00'), by: 'p6', t: 'Selected as Circle owner' }] },
      { id: 'cap5', pid: 'p9', at: t('2026-08-28'), pitch: 'I can build prototypes and run Saturday installs.', exp: 'Basic carpentry; volunteer coordination.', avail: '1–2 days a week', share: true, status: 'Selected', rating: 4, note: '', log: [{ at: t('2026-08-28'), by: 'p9', t: 'Applied' }, { at: t('2026-09-05'), by: 'p6', t: 'Shortlisted' }, { at: t('2026-09-12', '10:00'), by: 'p6', t: 'Selected for the team' }] },
      { id: 'cap6', pid: 'p10', at: t('2026-08-30'), pitch: 'I can write the maintenance guide and translate it for stallholders.', exp: 'Ward newsletter writing.', avail: 'A few hours a week', share: false, status: 'Selected', rating: 4, note: '', log: [{ at: t('2026-08-30'), by: 'p10', t: 'Applied' }, { at: t('2026-09-05'), by: 'p6', t: 'Shortlisted' }, { at: t('2026-09-12', '10:00'), by: 'p6', t: 'Selected for the team' }] },
    ],
    project: 'prc2', reveal: false,
    team: { owner: 'p1', members: ['p1', 'p9', 'p10'], facilitator: 'p2', entry: 'circles', mentor: null, circle: 'cic2', formedAt: t('2026-09-12', '10:00') },
    commit: { amount: 12000, currency: 'USD', terms: 'USD 2,000 advance when the project starts; each milestone paid within 10 days of the sponsor’s approval.', at: t('2026-09-13'), by: 'p6', own: { amount: 12000, at: t('2026-09-14'), by: 'p1', note: '' }, status: 'Confirmed' },
    milestones: [
      M('chm1', 1, 'Stall survey and design brief', 'Survey of all 34 stalls (size, orientation, afternoon sun) and a one-page design brief agreed with stallholders.', 'A shared understanding of what the shade must do.', 'All 34 stalls surveyed; brief signed off by at least 5 stallholders.', '2026-09-30', 3000, 'Approved', { approvedAt: t('2026-10-02'), subs: [{ id: 'msb1', at: t('2026-09-29'), by: 'p1', note: 'Surveyed all 34 stalls over two Saturdays. Brief agreed with 7 stallholders at the market meeting.', files: [{ n: 'stall-survey-34.xlsx', mb: 0.4 }, { n: 'design-brief-v2.pdf', mb: 1.1 }], evs: [], decision: { v: 'Approved', by: 'p6', at: t('2026-10-02'), note: 'Clear and complete. Thank you.' } }] }),
      M('chm2', 2, 'Prototype shades on five stalls', 'Five prototype shades installed and used for four market days, with temperature readings under and outside each shade.', 'Evidence that the design works and stallholders can handle it alone.', 'Five shades in use for four market days; temperature readings for each day; each stallholder can put up their shade alone in under five minutes.', '2026-10-30', 3000, 'More information requested', { subs: [{ id: 'msb2', at: t('2026-10-14'), by: 'p1', note: 'Five shades installed on stalls 3, 8, 12, 19 and 27 and used on four market days. Average 6 °C cooler under the shade. All five stallholders put them up alone.', files: [{ n: 'temperature-log-oct.csv', mb: 0.2 }, { n: 'prototype-photos.zip', mb: 18.5 }], evs: [], decision: { v: 'More information requested', by: 'p6', at: t('2026-10-16'), note: 'Please add a timed record of each stallholder putting up their shade. The criteria say under five minutes; the photos do not show that.' } }], notes: [{ id: 'mn1', by: 'p1', at: t('2026-10-17'), kind: 'comment', t: 'We timed it on the day but did not write the times down per stallholder. Re-running a timed test would cost another market day and the stallholders’ goodwill. The photos are taken at the start and end of setup.' }, { id: 'mn2', by: 'p6', at: t('2026-10-18'), kind: 'comment', t: 'I understand, but the criterion is explicit. Without a record I cannot approve this milestone.' }] }),
      M('chm3', 3, 'Community workshop on shade care', 'A workshop for stallholders on putting up, storing and repairing the shades, with an attendance sheet.', 'Stallholders confident to look after their shades.', 'Workshop held with at least 12 stallholders; attendance sheet and short feedback form.', '2026-10-18', 2000, 'Submitted', { subs: [{ id: 'msb3', at: t('2026-10-19'), by: 'p1', note: 'Workshop held on 18 October with 15 stallholders. Attendance sheet and 14 feedback forms attached; 13 said they could repair a torn panel.', files: [{ n: 'workshop-attendance.pdf', mb: 0.3 }, { n: 'feedback-summary.pdf', mb: 0.5 }], evs: [], decision: null }] }),
      M('chm4', 4, 'Rollout to 20 stalls and maintenance guide', 'Shades installed on 20 more stalls and an illustrated maintenance guide in English and Spanish.', 'Shade across most of the market, kept in good repair by stallholders.', 'At least 20 more stalls with shades in use; guide printed and shared with every stallholder.', '2026-12-05', 2000, 'Proposed', { ok: { sponsor: t('2026-10-20'), owner: null }, agreedAt: null }),
    ],
    payments: [
      { id: 'cpy1', ref: 'PAY-001', kind: 'Initial funding', ms: null, at: t('2026-09-16'), sp: { made: true, amount: 2000, date: '2026-09-16', ref: 'HWF-TRF-0916', files: [{ n: 'remittance-0916.pdf', mb: 0.1 }], note: 'Advance', at: t('2026-09-16'), by: 'p6' }, ow: { received: true, amount: 2000, date: '2026-09-17', ref: '', files: [], note: '', at: t('2026-09-17'), by: 'p1' }, status: 'Confirmed', final: 2000 },
      { id: 'cpy2', ref: 'PAY-002', kind: 'Milestone payment', ms: 'chm1', at: t('2026-10-06'), sp: { made: true, amount: 3000, date: '2026-10-06', ref: 'HWF-TRF-1006', files: [{ n: 'remittance-1006.pdf', mb: 0.1 }], note: '', at: t('2026-10-06'), by: 'p6' }, ow: { received: true, amount: 2700, date: '2026-10-08', ref: '', files: [{ n: 'bank-statement-oct.pdf', mb: 0.2 }], note: 'USD 2,700 arrived; the rest looks like a transfer fee.', at: t('2026-10-08'), by: 'p1' }, status: 'Flagged for review' },
    ],
    log: [{ at: t('2026-08-25'), by: 'p6', t: 'Posted to the Explore board as Sponsor · Saffron Kestrel 64' }, { at: t('2026-09-12', '10:00'), by: 'p6', t: 'Team formed: Mary Ellis, Daniel Kim, Ana Lopez; Circle owner Mary Ellis; started in Circle' }, { at: t('2026-09-14'), by: 'p1', t: 'Funding commitment confirmed by both sides. Execution can begin.' }],
  });
  S.chrooms.push({
    id: 'chr2', ctx: 'c1', challenge: 'chl2', sponsor: 'p6', alias: 'Sponsor · Saffron Kestrel 64', name: 'Challenge · Low-cost shade for market stalls', state: 'Closed', closedAt: t('2026-09-12', '10:05'),
    members: [{ pid: 'p6', role: 'Sponsor', status: 'Active' }, { pid: 'p1', role: 'Applicant', status: 'Active' }, { pid: 'p9', role: 'Applicant', status: 'Active' }, { pid: 'p10', role: 'Applicant', status: 'Active' }],
    chat: [
      { id: 'mc301', sys: true, at: t('2026-08-25'), t: 'Chat room for the open challenge “Low-cost shade for market stalls”. Everyone who asks to take part joins here. The sponsor appears as Sponsor · Saffron Kestrel 64.' },
      { id: 'mc302', by: 'p1', at: t('2026-08-27', '11:00'), t: 'Would you fund an advance for materials, or is everything paid per milestone?', q: true, ans: true },
      { id: 'mc303', by: 'p6', at: t('2026-08-27', '15:20'), t: 'An advance of USD 2,000 for materials is fine, the rest per approved milestone.', reply: 'mc302' },
      { id: 'mc304', sys: true, at: t('2026-09-12', '10:00'), t: 'The team has been formed. Project work continues in the team’s own Circle.' },
      { id: 'mc305', sys: true, at: t('2026-09-12', '10:05'), t: 'Selection is complete. This chat room is closed for further discussion. It stays readable for the people who took part, under the programme’s data-retention rules.' },
    ],
  });
  // a flagged payment already with an independent Steward (Kofi Mensah has no tie to either side), and a milestone
  // dispute waiting for the Programme Administrator to assign one
  S.disputes.push(
    { id: 'dsp1', ref: 'DSP-0001', ch: 'chl2', ctx: 'c1', subject: { kind: 'pay', id: 'cpy2' }, raisedBy: 'p1', side: 'owner', at: t('2026-10-10'), reason: 'The sponsor recorded USD 3,000 for milestone 1 but USD 2,700 arrived in the project account. We cannot confirm a payment we did not fully receive.', want: 'Record the payment as USD 2,700 received and treat the remaining USD 300 as still owed.', aliases: { sponsor: 'Sponsor side · Linden Otter 38', team: 'Team side · Quartz Wren 52' }, status: 'Awaiting Steward acceptance', steward: 'p13', assignedBy: 'p7', assignedAt: t('2026-10-12'), declined: [], decision: null, thread: [{ id: 'dm1', by: 'p1', at: t('2026-10-10'), kind: 'statement', t: 'The sponsor recorded USD 3,000 for milestone 1 but USD 2,700 arrived in the project account. We cannot confirm a payment we did not fully receive.\n\nOutcome sought: Record the payment as USD 2,700 received and treat the remaining USD 300 as still owed.', files: [{ n: 'bank-statement-oct.pdf', mb: 0.2 }] }, { id: 'dm2', by: 'p6', at: t('2026-10-11'), kind: 'statement', t: 'We sent USD 3,000; the remittance advice is attached to the payment. Any fee was charged by the receiving bank.', files: [{ n: 'remittance-1006.pdf', mb: 0.1 }] }], log: [{ at: t('2026-10-10'), t: 'Raised by the team side (Team side · Quartz Wren 52)' }, { at: t('2026-10-12'), t: 'Steward assigned by the Programme Administrator' }] },
    { id: 'dsp2', ref: 'DSP-0002', ch: 'chl2', ctx: 'c1', subject: { kind: 'ms', id: 'chm2' }, raisedBy: 'p1', side: 'owner', at: t('2026-10-19'), reason: 'All five stallholders put up their shades alone, and the start and end photos show it took under five minutes. Re-running a timed test would cost another market day. We believe the acceptance criteria are met.', want: 'Accept milestone 2 as complete.', aliases: { sponsor: 'Sponsor side · Russet Beacon 19', team: 'Team side · Meadow Fern 71' }, status: 'Awaiting Steward assignment', steward: null, declined: [], decision: null, thread: [{ id: 'dm3', by: 'p1', at: t('2026-10-19'), kind: 'statement', t: 'All five stallholders put up their shades alone, and the start and end photos show it took under five minutes. Re-running a timed test would cost another market day. We believe the acceptance criteria are met.\n\nOutcome sought: Accept milestone 2 as complete.', files: [] }], log: [{ at: t('2026-10-19'), t: 'Raised by the team side (Team side · Meadow Fern 71)' }] },
  );
}
