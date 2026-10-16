// ---------- BUILD-FREEZE ADDITIONS (WSS Build-Freeze Review v1.0 and Action Pack, Oct 2026) ----------
// Help & support (human, BF-14), Review Inbox (assigned items only), Explore board (Bulletin Board Lite, BF-15),
// My collaborations (Relationship List Lite, BF-16), Partner organisation & mandate, AI Owner sources (BF-09).
// Everything here composes existing, already-authorised records: no new feed, ranking, score or graph.

// ---- Help & support: a human route, separate from Ask PHOENIX, mentor support and incident reporting
route('help', 'any', () => {
  const mine = S.supportQueries.filter(q => q.by === myId());
  const rope = S.ropes.find(r => inCtx(r) && memberOf(r) && r.mentor && r.mentor !== myId());
  const aiOk = consent(myId(), 'ai') === 'Granted';
  const f = 'helpq';
  const tile = (icon, t, sub, act) => `<section class="card help-tile"><span class="tile t-soft" aria-hidden="true">${ic(icon, 18)}</span><div class="col" style="gap:4px"><b>${t}</b><p class="cap">${sub}</p></div><div class="row wrap" style="gap:8px">${act}</div></section>`;
  return (
    head('Help & support', `People who can help you in ${h(ctxName(ctxId()))}. Each route below is separate: asking one never sends anything to another.`) +
    `<div class="help-grid">${[
      tile('user', 'Human support desk', 'A person from the programme team answers, usually within two working days. Use it for access, onboarding, records or anything that is not working.', B('Write to support', 'go', { r: 'help', tab: 'ask' }, 'btn-p btn-sm')),
      can('ai')
        ? tile('sparkle', 'Ask PHOENIX (AI, advisory)', aiOk ? 'Answers from approved programme sources, with sources and uncertainty. It advises; it never decides, approves or changes your record.' : 'AI processing is off for you, so Ask PHOENIX is unavailable. Everything else keeps working. You can change this in My records & consent.', aiOk ? B('Open Ask PHOENIX', 'askToggle', {}, 'btn-s btn-sm') : B('My records & consent', 'go', { r: 'privacy', tab: 'consent' }, 'btn-s btn-sm'))
        : '',
      rope ? tile('route', 'Your mentor', `${nm(rope.mentor)} supports you in ${h(rope.name)}. Mentoring conversations stay in your Rope Team.`, L('Open Rope Team', 'rope', { id: rope.id }, 'btn btn-s btn-sm')) : '',
      tile('alert', 'Report a concern', 'For safety, conduct or misuse. Goes to the Incident/Safety Owner, never to the person concerned. You can report anonymously.', B('Report a concern', 'go', { r: 'incidents' }, 'btn-s btn-sm')),
    ].join('')}</div>` +
    `<div class="section-gap"></div>` +
    card(
      'Write to the support desk',
      'Seen by the programme support team for this context only.',
      `${errSum(f)}<form data-f="helpq" class="col" novalidate>${fi(f, 'cat', 'Topic', { type: 'select', req: true, ph: 'Choose a topic', opts: ['Access or sign-in', 'Onboarding or agreement', 'My records or consent', 'Something is not working', 'Other'] })}${fi(f, 't', 'How can we help?', { type: 'textarea', rows: 3, req: true, max: 1000, ph: 'Describe what you need. Do not include other people’s private information.' })}<div class="actions"><span class="help">A person replies. AI is not used to answer support requests.</span><button class="btn btn-p btn-sm" type="submit">${ic('send', 14)}Send to support</button></div></form>`,
    ) +
    `<div class="section-gap"></div>` +
    card('Your support requests', '', table(['Request', 'Topic', 'Sent', 'Status'], mine.map(q => [h(q.t), h(q.cat || 'General'), fmt(q.at), pill(q.status)]), 'You have not sent any support requests.'))
  );
});
F.helpq = d => {
  if (!validate('helpq', d, { cat: [['req', 'Choose a topic.']], t: [['req', 'Describe what you need.'], ['min', 5]] })) return render();
  S.supportQueries.unshift({ id: uid('sq'), by: myId(), t: d.t.trim(), cat: d.cat, ctx: ctxId(), at: today(), status: 'Open' });
  S.assign.filter(a => roleBase(a.role) === 'A' && a.ctx === ctxId() && a.status === 'Active').forEach(a => notify(a.pid, 'Support request: ' + d.cat + ' from ' + me().name, 'admin', { tab: 'support' }, a.id));
  audit('Support request sent', myId(), d.cat);
  clearF('helpq');
  toast('Sent. A person from the support team will reply.');
  ok();
};

// ---- Review Inbox: only items assigned to this person in this role and context
route('inbox', 'any', () => {
  const items = inboxItems();
  const reviewer = hasB('Reviewer');
  return (
    head('Review inbox', `Items assigned to you as ${h(asgLabel(asg()))}. Nothing here is a general programme queue.`) +
    (role() === 'F' && !reviewer ? banner('info', 'Evidence approval is not part of your role', 'Approving evidence needs the Reviewer bundle. As Facilitator / Steward you review projects, pathways and Match Briefs you are assigned to; you can comment on evidence, not approve it.') : '') +
    card(
      'Assigned to you',
      items.length + ' item' + (items.length === 1 ? '' : 's'),
      table(['Kind', 'Item', 'Detail', ''], items.map(([k, t, s, r, p]) => [pill(k, 'p-navy'), `<b>${h(t)}</b>`, h(s), L('Open', r, p)]), 'Nothing is waiting for you.'),
    )
  );
});

// ---- Explore board (Bulletin Board Lite, BF-15): approved Opportunity Cards, programme announcements and
// released Visible Wins. Every item keeps its source audience; nothing is ranked, liked or commented on.
UI.boardF = UI.boardF || 'all';
function boardItems() {
  const out = [];
  S.cards
    .filter(c => inCtx(c) && c.status === 'Active' && cardVisible(c))
    .forEach(c => out.push({ k: 'opp', at: c.created || c.expires, t: c.title, s: `${h(c.kind)} · ${h(c.cat || '')} · open until ${fmt(c.expires)}`, src: 'Opportunity Card · ' + h(c.vis || 'Programme'), act: L('View card', 'card', { id: c.id }) }));
  (S.announcements || [])
    .filter(a => a.ctx === ctxId())
    .forEach(a => out.push({ k: 'ann', at: a.at, t: a.t, s: a.kind || 'Programme announcement', src: 'Programme Administrator · ' + h(ctxShort(a.ctx)) + ' programme audience', act: '' }));
  S.rooms
    .filter(x => inCtx(x))
    .forEach(x => (x.wins || []).filter(w => w.status === 'Approved' && w.release === 'Programme').forEach(w => out.push({ k: 'win', at: w.at, t: w.t, s: h(x.name), src: 'Visible Win released to the programme audience', act: memberOf(x) ? L('Open ' + WL(), 'room', { id: x.id }) : '' })));
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}
route('board', 'any', () => {
  const all = boardItems();
  const KIND = { opp: ['Opportunity', 'megaphone', 't-purple'], ann: ['Announcement / event', 'bell', 't-navy'], win: ['Visible Win', 'flag', 't-teal'] };
  const list = UI.boardF === 'all' ? all : all.filter(x => x.k === UI.boardF);
  const f = (v, l) => `<button type="button" class="${UI.boardF === v ? 'on' : ''}" data-a="boardF" data-v="${v}" aria-pressed="${UI.boardF === v}">${l}<span class="cnt">${v === 'all' ? all.length : all.filter(x => x.k === v).length}</span></button>`;
  const howRows = [
    ['Opportunity', 'Publish an Opportunity Card with status Active and an audience you are allowed to see (usually Programme).', role() === 'P' || role() === 'C' || role() === 'A' ? L('Post a card', 'newcard', {}, 'btn btn-s btn-sm') : ''],
    ['Announcement', 'Programme Administrator → Notifications → Send an announcement (same context).', role() === 'A' ? L('Send announcement', 'admin', { tab: 'notify' }, 'btn btn-s btn-sm') : ''],
    ['Visible Win', 'In an Action Workspace → record a win → steward/lead Approves it (auto-releases to Programme).', myRooms().length ? L('Open a ' + WL(), 'rooms', {}, 'btn btn-s btn-sm') : ''],
  ];
  return (
    head('Explore board', `What is happening in ${h(ctxName(ctxId()))}: approved opportunities, programme announcements and released wins.`) +
    card(
      'How items get onto this board',
      'Bulletin Board Lite (BF-15) — no new feed. Items appear only when the source record is approved and released to an audience you can already see.',
      table(['Type', 'How to add', ''], howRows.map(([a, b, c]) => [`<b>${a}</b>`, b, c || '—'])),
      '',
      'board-how',
    ) +
    `<div class="section-gap"></div>` +
    `<div class="seg board-f" role="group" aria-label="Show">${f('all', 'All')}${f('opp', 'Opportunities')}${f('ann', 'Announcements')}${f('win', 'Visible Wins')}</div>` +
    `<div class="board-list">${
      list
        .map(x => {
          const [kl, ki, kt] = KIND[x.k];
          return `<article class="card board-i"><span class="tile ${kt}" aria-hidden="true">${ic(ki, 18)}</span><div class="col board-b"><span class="over">${kl}</span><b>${h(x.t)}</b><span class="cap">${x.s}</span><span class="cap board-src">${ic('lock', 12)}${x.src}</span></div>${x.act ? `<div class="board-a">${x.act}</div>` : ''}</article>`;
        })
        .join('') || empty('grid', 'Nothing on the board yet', 'Approved cards, announcements and released wins appear here.')
    }</div>` +
    `<p class="cap board-n">${ic('info', 13)} Composed only from records you are already allowed to see. No likes, followers, rankings, reputation or public comments. Private notes and unreleased evidence never appear.</p>`
  );
});
A.boardF = d => {
  UI.boardF = d.v;
  render();
};

// ---- My collaborations (Relationship List Lite, BF-16): confirmed, authorised relationships only.
function relationRows(pid = myId()) {
  const rows = [];
  const add = (other, type, where, r, p, theirRole, status) => {
    if (other === pid) return;
    rows.push({ other, type, where, r, p, theirRole, status });
  };
  S.matches
    .filter(m => m.status === 'Introduced' && (m.a === pid || m.b === pid) && inCtx(m))
    .forEach(m => add(m.a === pid ? m.b : m.a, 'Confirmed introduction', 'Match Brief', 'match', { id: m.id }, '—', m.outcome || 'Introduced'));
  [
    ['circles', 'Circle member', 'circle'],
    ['ropes', 'Rope Team', 'rope'],
    ['rooms', 'Collaborator', 'room'],
  ].forEach(([k, type, r]) =>
    S[k]
      .filter(o => inCtx(o) && memberOf(o, pid))
      .forEach(o =>
        o.members
          .filter(m => m.status === 'Active' || !m.status)
          .forEach(m => add(m.pid, type, h(o.name), r, { id: o.id }, h(spaceRole(k, o, m.pid) || normRole(m.role) || 'Member'), o.state === 'Active' ? 'Active' : o.state)),
      ),
  );
  const org = P(pid).org;
  if (org)
    S.people
      .filter(p => p.org === org && p.id !== pid && S.assign.some(a => a.pid === p.id && a.ctx === ctxId() && a.status === 'Active'))
      .forEach(p => add(p.id, 'Same organisation', h((S.orgs.find(o => o.id === org) || {}).name || ''), null, null, h(ROLE[(S.assign.find(a => a.pid === p.id && a.ctx === ctxId()) || {}).role] || ''), 'Active'));
  return rows;
}
route('relations', 'any', () => {
  const rows = relationRows();
  const people = new Set(rows.map(x => x.other)).size;
  return (
    head('My collaborations', `People you are connected with in ${h(ctxName(ctxId()))} through confirmed introductions, shared spaces or your organisation.`) +
    card(
      'Confirmed relationships',
      `${people} ${people === 1 ? 'person' : 'people'} · ${rows.length} relationship${rows.length === 1 ? '' : 's'}`,
      table(
        ['Person', 'Relationship', 'Where', 'Their role there', 'Status'],
        rows.map(x => [`<span class="row" style="gap:8px"><span class="av">${ini(x.other)}</span>${nm(x.other)}</span>`, h(x.type), x.r ? L(x.where, x.r, x.p) : x.where, x.theirRole, pill(x.status)]),
        'No confirmed relationships yet. They appear after an introduction or when you share a space.',
      ),
    ) +
    `<p class="cap board-n">${ic('info', 13)} Each row follows the original permission. It changes or disappears when the relationship or your access ends. No inferred friendship, relationship strength, influence or trust score.</p>`
  );
});

// ---- Partner: organisation and mandate (doc 1 §6.4)
route('mandate', 'any', () => {
  const a = asg();
  const org = S.orgs.find(o => o.id === me().org);
  const xo = (S.xorg || []).filter(x => x.by === myId());
  return (
    head('Organisation & mandate', `What you may do for ${h(org ? org.name : 'your organisation')} in ${h(ctxName(a.ctx))}.`) +
    `<div class="hm-cols"><div class="col" style="gap:16px">${card(
      'Mandate in this context',
      'Your contact and work access follow this mandate and mutual consent.',
      a.mandate
        ? dl([
            ['Status', pill(a.mandate.valid && a.mandate.until >= today() ? 'Active' : 'Expired')],
            ['Scope', h(a.mandate.scope)],
            ['Valid until', fmt(a.mandate.until)],
            ['Granted for', h(asgLabel(a))],
          ])
        : `<p class="muted">No mandate on file. You can contribute to work you are invited to; binding commitments need a mandate.</p>`,
    )}${card('Cross-organisation sharing requests', 'Named items only, and only with the participant’s cross-organisation consent.', table(['Request', 'Status', 'Sent'], xo.map(x => [h(x.what), pill(x.status), fmt(x.at)]), 'No requests.'), B('Request cross-organisation sharing', 'xoNew'))}</div><div class="col" style="gap:16px">${card('Organisation profile', '', `<p class="muted">${h((org && org.profile) || 'No profile yet.')}</p>`, B(ic('edit', 14) + 'Edit profile', 'orgEdit'))}${banner('info', 'What a mandate never grants', 'Access to other assignees’ private profiles, Purpose Compass answers, Rope Team notes or another organisation’s workspaces.')}</div></div>`
  );
});

// ---- AI Owner: approved AI use cases, source registry and evaluation. AI advises; it never decides (BF-09).
const AI_USES = [
  ['Ask PHOENIX — private assist (Class A)', 'Answers from approved sources, with sources and uncertainty.', 'Needs the person’s AI processing permission'],
  ['Draft summaries (Circle, project sections, Harvest)', 'Drafts only; a person edits and accepts or rejects every draft.', 'Needs AI processing permission'],
  ['Proposal source check (Circles)', 'Flags claims that lack sources or contradict each other, and suggests questions.', 'Advisory: cannot pass or fail a vote'],
  ['Match Brief draft', 'Drafts “Why suggested” and “What is missing” from fields the person allowed for matching.', 'A steward reviews; both parties consent'],
];
route('aiadmin', 'any', () => {
  if (!hasB('AI Owner')) return deniedView('ai');
  return (
    head('AI Owner: sources & evaluation', 'Approved AI use cases, the source registry and evaluation records for this programme.') +
    banner('ai', 'AI advises, drafts and fact-checks only', 'It never passes or fails a vote, approves evidence, releases content, imposes a sanction or creates authority. Every AI output is labelled “AI draft / advisory”.') +
    card('Approved AI use cases', '', table(['Use case', 'What it does', 'Boundary'], AI_USES.map(([a, b, c]) => [`<b>${h(a)}</b>`, h(b), h(c)]))) +
    '<div class="section-gap"></div>' +
    card('Source registry', 'Only approved sources are used to answer questions.', table(['Source', 'Status', ''], S.aiSources.map(x => [h(x.title), pill(x.status === 'Approved' ? 'Approved' : 'Not approved'), B(x.status === 'Approved' ? 'Withdraw approval' : 'Approve', 'srcToggle', { id: x.id }, x.status === 'Approved' ? 'btn-s btn-sm' : 'btn-p btn-sm')]))) +
    '<div class="section-gap"></div>' +
    card('Evaluation log', 'Recent AI outputs and their human decisions.', table(['Output', 'Requested by', 'Status'], S.ai.slice(0, 8).map(j => [h(j.kind || j.t || j.id), nm(j.by), pill(j.status)]), 'No AI outputs yet.'))
  );
});
A.srcToggle = d => {
  const x = byId('aiSources', d.id);
  if (!x) return;
  x.status = x.status === 'Approved' ? 'Not approved' : 'Approved';
  audit('AI source ' + (x.status === 'Approved' ? 'approved' : 'withdrawn'), x.id, x.title);
  toast(x.title + ': ' + x.status);
  ok();
};
// Attachments and receipts download as a small placeholder file (prototype: no real file storage).
A.fakeDl = d => {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['PHOENIX prototype placeholder for: ' + d.n + '\r\nGenerated ' + now()], { type: 'text/plain;charset=utf-8' }));
    a.download = String(d.n || 'download').replace(/[^\w.-]+/g, '-') + '.txt';
    a.click();
  } catch (e) {}
  audit('Downloaded', d.n, '');
  toast('Downloaded ' + d.n + '.');
  ok();
};
