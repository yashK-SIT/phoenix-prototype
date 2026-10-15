// ---------- EVIDENCE (E09, F08) ----------
const EV_TYPES = [
  'A · Participation',
  'B · Learning and capability',
  'C · Action and deliverable',
  'D · Outcome',
  'E · Economic / resource',
  'F · Ecological / regenerative',
  'G · Social / community',
  'H · Governance / decision',
  'I · Testimony / lived experience',
  'J · External verification',
];
const LEVELS = [
  ['E0', 'Not evidenced / missing'],
  ['E1', 'Self-report / single source'],
  ['E2', 'Documented trace'],
  ['E3', 'Corroborated'],
  ['E4', 'Independently verified'],
];
// ---- five independent dimensions (BF-04). Review status is quality only; confidentiality, lifecycle and release are
// separate fields and are never stored as a review status.
const REVIEW = ['Submitted', 'In review', 'Needs Revision', 'Approved', 'Rejected', 'Insufficient'];
// What a Reviewer can record. Submitted is set by the owner (upload or resubmit).
const REVIEW_OUTCOMES = [
  ['In review', 'In review — still assessing'],
  ['Needs Revision', 'Needs revision — the owner revises and resubmits'],
  ['Approved', 'Approved — it supports the claim at the level below'],
  ['Rejected', 'Rejected — it does not support the claim'],
  ['Insufficient', 'Insufficient — not enough to assess'],
];
const CONF = [
  ['Programme', 'Seen by members of the linked spaces and programme staff.'],
  ['Restricted', 'Seen only by the owner, Reviewers, facilitators of the linked space and the Trust/Data Steward. Left out of funder and public use unless a release explicitly covers it.'],
  ['Confidential', 'Seen only by the owner, Reviewers and the Trust/Data Steward. Left out of every aggregate unless a release explicitly covers it.'],
];
const CONF_PILL = { Programme: 'p-teal', Restricted: 'p-amber', Confidential: 'p-red' };
const CONF_SHORT = { Programme: 'Linked-space members and programme staff', Restricted: 'Owner, Reviewers, space facilitators, Trust/Data Steward', Confidential: 'Owner, Reviewers, Trust/Data Steward' };
const confRank = c => Math.max(0, CONF.findIndex(x => x[0] === c));
const confMeaning = c => (CONF.find(x => x[0] === c) || [])[1] || '';
const LIFECYCLE = ['Active', 'Superseded', 'Withdrawn', 'Archived'];
// Release is a separate decision per audience; these are the audiences other screens ask about.
const REL_AUD = ['Funder report', 'Public showcase', 'Organisation report'];
const REL_AUD_LABEL = { 'Funder report': 'Funder report (Hartwell Foundation)', 'Public showcase': 'Public programme showcase', 'Organisation report': 'Organisation report' };
const relAudOf = s => (REL_AUD.includes(s) ? s : /funder|sponsor/i.test(s || '') ? 'Funder report' : /public/i.test(s || '') ? 'Public showcase' : /organi[sz]ation/i.test(s || '') ? 'Organisation report' : 'Funder report');
// A clearance covers the confidentiality the record had when the Trust/Data Steward cleared it; raising it later
// takes the record back out of that audience.
const evClear = (e, aud) => (e.cleared || []).find(c => c.aud === aud && confRank(e.conf) <= confRank(c.conf));
const evRelStr = e => ((e.cleared || []).length ? 'Cleared: ' + e.cleared.map(c => c.aud).join('; ') : 'Not cleared');
// Records that may appear in a report for `audience` ('Funder report' | 'Public showcase' | 'Organisation report'):
// approved, active, cleared for that audience at (or above) the record's current confidentiality, and the owner has
// not withdrawn public/funder consent. Other screens (sponsor reports, metrics) use this; nothing else counts as released.
function evReleasedTo(audience, list = S.evidence) {
  return (list || []).filter(e => e.review === 'Approved' && e.lifecycle === 'Active' && !!evClear(e, audience) && consent(e.owner, 'public') !== 'Withdrawn');
}
// One history entry per dimension that changed.
const evHist = (e, dim, from, to, note) => {
  (e.history = e.history || []).push({ at: today(), dim, by: myId(), t: `${dim}: ${from || '—'} → ${to}${note ? ' — ' + note : ''}` });
};
const evStewards = () => [...new Set(S.assign.filter(a => (a.bundles || []).includes('Trust/Data Steward') && a.status !== 'Revoked').map(a => a.pid))];
const evMember = e =>
  (e.linked || []).some(l => {
    const o = byId('circles', l) || byId('rooms', l) || byId('ropes', l);
    return o && memberOf(o);
  });
// Who can see a record depends on its confidentiality, not on its review status.
const evVisible = e => {
  if (!e) return false;
  if (e.owner === myId() || hasB('Reviewer') || hasB('Trust/Data Steward')) return true;
  if (e.conf === 'Confidential') return false;
  if (e.conf === 'Restricted') return role() === 'F' && evMember(e);
  if (role() === 'F' || role() === 'A') return true;
  // members see approved evidence in their spaces; mentors also see shared evidence still in review, to comment on it
  return e.lifecycle !== 'Withdrawn' && evMember(e) && (e.review === 'Approved' || role() === 'M');
};
// Older records stored confidentiality ('Restricted') and lifecycle ('Withdrawn') as review statuses, and one
// release string. Runs from migrate().
function evMigrate() {
  const priorReview = e =>
    [...(e.history || [])]
      .reverse()
      .map(x => REVIEW.find(r => String(x.t || '').toLowerCase().startsWith(r.toLowerCase())))
      .find(Boolean) || 'Submitted';
  (S.evidence || []).forEach(e => {
    e.history = e.history || [];
    if (!CONF.some(c => c[0] === e.conf)) e.conf = e.sens === 'High' || /only me/i.test(e.vis || '') ? 'Restricted' : 'Programme';
    if (e.review === 'Restricted' || e.review === 'Confidential') {
      const was = e.review;
      e.review = priorReview(e);
      evHist(e, 'Review', was, e.review, '“' + was + '” is a confidentiality setting, not a review outcome');
      if (confRank(was) > confRank(e.conf)) {
        evHist(e, 'Confidentiality', e.conf, was, 'moved out of the review status');
        e.conf = was;
      }
    }
    if (e.review === 'Withdrawn') {
      e.review = priorReview(e);
      evHist(e, 'Review', 'Withdrawn', e.review, '“Withdrawn” is a lifecycle state, not a review outcome');
      if (e.lifecycle !== 'Withdrawn') evHist(e, 'Lifecycle', e.lifecycle || 'Active', 'Withdrawn', 'moved out of the review status');
      e.lifecycle = 'Withdrawn';
    }
    if (!REVIEW.includes(e.review)) e.review = 'Submitted';
    if (!LIFECYCLE.includes(e.lifecycle)) e.lifecycle = 'Active';
    if (!Array.isArray(e.cleared)) e.cleared = /approved for funder|^released/i.test(e.release || '') ? [{ aud: 'Funder report', at: (e.history.find(x => /release/i.test(x.t)) || {}).at || today(), by: null, conf: e.conf }] : [];
    e.release = evRelStr(e);
    e.comments = e.comments || [];
  });
  (S.releases || []).forEach(x => (x.aud = x.aud || relAudOf(x.audience)));
  (S.harvests || []).forEach(x => {
    x.dissent = x.dissent || (x.contrib || []).filter(c => /^(Dissent|Missing voice):/.test(c.t)).map(c => ({ by: c.by, at: c.at || today(), kind: c.t.split(':')[0], t: c.t.replace(/^[^:]+:\s*/, '') }));
    if (!Array.isArray(x.cleared)) {
      x.cleared = x.release === 'Released' ? [{ aud: 'Funder report', at: today(), by: null }] : [];
      if (x.release === 'Funder release requested') x.relReq = 'Funder report';
    }
    x.release = hvRelStr(x);
  });
}
// An Action Room belongs to the project that names it, the project it was created from, the project of the Circle or
// Rope Team whose decision created it, or a related project.
const roomProject = x =>
  !x
    ? null
    : S.projects.find(p => p.room === x.id) ||
      (x.origin && x.origin.id && (byId('projects', x.origin.id) || S.projects.find(p => [p.circle, p.rope].includes(x.origin.id)))) ||
      S.projects.find(p => (x.related || []).includes(p.id)) ||
      null;
// Evidence belongs to a project when it is linked to the project itself, its Circle or Rope Team, or an Action Room of it.
const evProjects = e =>
  S.projects.filter(p => e.project === p.id || (e.linked || []).some(l => l && ([p.id, p.circle, p.rope, p.room].includes(l) || roomProject(byId('rooms', l)) === p)));
const evProjectName = e => evProjects(e).map(p => h(p.title)).join(', ');
const spaceProject = id => S.projects.find(p => [p.circle, p.rope, p.room].includes(id)) || roomProject(byId('rooms', id)) || undefined;
route('evidence', 'evidence', () => {
  const r = role();
  if (UI.p.id) {
    const e = byId('evidence', UI.p.id);
    if (!e) return empty('award', 'Not found', '');
    if (['S', 'O'].includes(r)) return deniedView('evidence');
    if (!evVisible(e)) return deniedView('evidence');
    return evDetail(e);
  }
  if (['S', 'O'].includes(r)) {
    // Only evidence cleared for this audience by a separate release decision; never every approved record.
    const aud = r === 'S' ? 'Funder report' : 'Organisation report';
    const ap = evReleasedTo(aud);
    return (
      head(
        'Cleared evidence',
        `Approved, active evidence that a Trust/Data Steward has cleared for the ${aud.toLowerCase()} audience. Approval alone never releases evidence. Groups smaller than 2 are suppressed.`,
      ) +
      table(
        ['Type', 'Cleared items', 'Highest support level'],
        Object.entries(ap.reduce((a, e) => ((a[e.type] = a[e.type] || []).push(e), a), {})).map(([k, v]) =>
          v.length < 2
            ? [h(k), '<span class="suppressed">Suppressed (fewer than 2)</span>', '<span class="suppressed">Suppressed</span>']
            : [
                h(k),
                v.length,
                v
                  .map(x => x.level)
                  .sort()
                  .pop(),
              ],
        ),
        'No evidence has been cleared for this audience.',
      )
    );
  }
  const inQueue = e => ['Submitted', 'In review'].includes(e.review) && e.lifecycle === 'Active' && e.owner !== myId();
  const t = tabs('ev', [
    ['mine', 'My evidence', S.evidence.filter(e => e.owner === myId()).length],
    hasB('Reviewer') && ['queue', 'Review queue', S.evidence.filter(inQueue).length],
    ['all', r === 'M' ? 'Shared with me' : 'Visible to me'],
  ]);
  const base =
    t.cur === 'mine'
      ? S.evidence.filter(e => e.owner === myId())
      : t.cur === 'queue'
        ? S.evidence.filter(inQueue)
        : S.evidence.filter(evVisible);
  return (
    head(
      r === 'M' ? 'Evidence comments' : 'Evidence',
      r === 'M'
        ? 'Comment on evidence shared in your spaces. Mentors comment; only a Reviewer approves.'
        : 'Review status, support level, confidentiality, lifecycle and release are separate. Approval never implies release.',
      can('evidence', 'CRM') ? B(ic('upload', 16) + 'Upload evidence', 'go', { r: 'newevidence' }, 'btn-p') : '',
    ) +
    t.html +
    (t.cur === 'queue' ? msQueueCard() : '') +
    card(t.cur === 'queue' ? 'Evidence to review' : t.cur === 'all' ? 'Evidence you can see' : 'Your evidence', '', evTable(base, true, 'evidence:' + t.cur))
  );
});
// Evidence Support Level: the code as text, with a four-step meter (E0 = none lit, E4 = all lit).
function evLevel(l) {
  const n = +String(l || 'E0').slice(1) || 0;
  return `<span class="ev-lvl" title="${h((LEVELS.find(x => x[0] === l) || [])[1] || '')}"><span class="ev-lvl-m" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><b>${h(l)}</b></span>`;
}
// File-type glyph for an evidence row, from how it was provided.
const evGlyph = e => ({ Link: 'link', 'Reflection or written output': 'edit', 'Repository record': 'archive' })[e.format] || 'file';
// One evidence collection as a Data View in the Circles listing style (one per Evidence tab).
// `key` keeps each list's search, tabs and filters apart.
function evTable(list, withProject, key = 'evidence') {
  const lvl = e => +String(e.level || 'E0').slice(1) || 0;
  return dataView(key, {
    label: 'evidence items',
    items: list,
    search: e => [e.title, e.type, e.claim, P(e.owner).name, ...(e.linked || []).map(l => String(cName(l)).replace(/<[^>]+>/g, '')), withProject ? evProjects(e).map(p => p.title).join(' ') : ''].join(' '),
    quick: { label: 'Review status', options: REVIEW.filter(s => list.some(e => e.review === s)).map(s => [s, s]), test: (e, v) => e.review === v },
    filters: [
      withProject && { key: 'project', label: 'Project', options: [...dvOpts(list, e => evProjects(e).map(p => p.id), id => byId('projects', id).title), ...(list.some(e => !evProjects(e).length) ? [['none', 'Not linked to a project']] : [])], test: (e, v) => (v === 'none' ? !evProjects(e).length : evProjects(e).some(p => p.id === v)) },
      { key: 'type', label: 'Evidence type', options: EV_TYPES.filter(x => list.some(e => e.type === x)).map(x => [x, x]), test: (e, v) => e.type === v },
      { key: 'level', label: 'Evidence Support Level', options: LEVELS.map(([k, v]) => [k, k + ' — ' + v]), test: (e, v) => e.level === v },
      { key: 'conf', label: 'Confidentiality', options: CONF.map(([k]) => [k, k]), test: (e, v) => e.conf === v },
      { key: 'life', label: 'Lifecycle', options: LIFECYCLE.map(k => [k, k]), test: (e, v) => e.lifecycle === v },
      { key: 'release', label: 'Release', options: [['none', 'Not cleared'], ...REL_AUD.map(a => [a, 'Cleared: ' + a])], test: (e, v) => (v === 'none' ? !(e.cleared || []).length : (e.cleared || []).some(c => c.aud === v)) },
    ].filter(Boolean),
    sorts: [
      ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
      ['level', 'Support level', (a, b) => lvl(b) - lvl(a)],
      ['review', 'Review status', (a, b) => REVIEW.indexOf(a.review) - REVIEW.indexOf(b.review)],
    ],
    defaultSort: 'title',
    row: e => ({
      lead: `<span class="tile t-soft" aria-hidden="true">${ic(evGlyph(e), 18)}</span>`,
      title: L(h(e.title), 'evidence', { id: e.id }, 'dv-link'),
      sub: h(e.claim),
      meta: [
        `<span class="ev-type">${h(e.type)}</span>`,
        'Owner <b>' + nm(e.owner) + '</b>',
        withProject && evProjectName(e) ? 'Project <b>' + evProjectName(e) + '</b>' : '',
        (e.linked || []).length ? 'Linked to ' + (e.linked || []).map(cName).join(', ') : '',
        evLevel(e.level),
        `<span class="ev-rel ${(e.cleared || []).length ? '' : 'is-no'}">${h(e.release)}</span>`,
      ],
      badges: pill(e.review) + (e.conf && e.conf !== 'Programme' ? pill(e.conf, CONF_PILL[e.conf]) : '') + (e.lifecycle && e.lifecycle !== 'Active' ? pill(e.lifecycle) : ''),
      primary: L('Open', 'evidence', { id: e.id }, 'btn btn-s btn-sm'),
    }),
    empty: ['award', 'No evidence here yet', 'Evidence you upload, or can see, appears here.', ''],
  });
}
// How the evidence was provided. Older records are files.
function evFormatRow(e) {
  if (e.format === 'Link')
    return ['Link', `<a class="lnk" href="${h(e.url)}" target="_blank" rel="noopener noreferrer">${ic('link', 14)} ${h(e.url)}</a>`];
  if (e.format === 'Reflection or written output')
    return ['Reflection or written output', `<p style="white-space:pre-line">${h(e.text)}</p>`];
  if (e.format === 'Repository record') {
    const r = byId('records', e.record);
    return ['Repository record', r ? L(h(r.title), 'repository', { rec: r.id }) + ` <span class="cap">· ${h(r.kind)}</span>` : '<span class="cap">Record no longer available</span>'];
  }
  return ['File', `<span class="att">${ic('file', 14)}${h(e.file)} · ${e.sizeMB} MB</span>`];
}
function evDelivRow(e) {
  const ks = S.rooms.flatMap(x => x.tasks.filter(k => (k.evidence || []).includes(e.id)).map(k => [x, k]));
  return ks.length && ['Supports deliverable', ks.map(([x, k]) => L(h(k.t), 'room', { id: x.id, tab: 'plan' }) + ` <span class="cap">· ${h(x.name)}</span>`).join('<br>')];
}
// The five dimensions, side by side. None of them implies another.
function evDims(e) {
  const life = e.lifecycle || 'Active';
  const live = e.review === 'Approved' && life === 'Active';
  const rel = (e.cleared || []).length
    ? e.cleared.map(c => `<span class="ev-rel">Cleared: ${h(c.aud)}</span>${evClear(e, c.aud) ? '' : `<span class="cap">Covers ${h(c.conf)} only — not in effect while ${h(e.conf)}</span>`}`).join('') + (live ? '' : '<span class="cap">Not in effect: only approved, active evidence is released</span>')
    : '<span class="ev-rel is-no">Not cleared</span><span class="cap">No audience outside the programme</span>';
  return `<div class="ev-dims" aria-label="Evidence status">${[
    ['Review status', pill(e.review) + '<span class="cap">Quality review</span>'],
    ['Evidence Support', evLevel(e.level) + `<span class="cap">${h((LEVELS.find(l => l[0] === e.level) || [])[1] || '')}</span>`],
    ['Confidentiality', pill(e.conf, CONF_PILL[e.conf]) + `<span class="cap" title="${h(confMeaning(e.conf))}">${h(CONF_SHORT[e.conf] || '')}</span>`],
    ['Lifecycle', pill(life) + `<span class="cap">${life === 'Active' ? 'In use' : life === 'Withdrawn' ? 'Withdrawn by the owner; history kept' : life === 'Superseded' ? 'Replaced by a newer item' : 'Kept for the record only'}</span>`],
    ['Release', rel],
  ]
    .map(([k, v]) => `<div><span class="lbl">${k}</span>${v}</div>`)
    .join('')}</div>`;
}
// Release is decided per audience: the owner authorises, then the Trust/Data Steward completes disclosure review.
function evReleaseCard(e, rr) {
  const live = e.review === 'Approved' && e.lifecycle === 'Active';
  const rows = REL_AUD.map(a => {
    const c = (e.cleared || []).find(x => x.aud === a);
    const xs = rr.filter(x => (x.aud || relAudOf(x.audience)) === a);
    const ask = xs.find(x => x.status === 'Awaiting owner decision');
    const inRev = xs.find(x => x.status === 'Owner authorised — disclosure review');
    const last = xs[xs.length - 1];
    const covered = !!evClear(e, a);
    const st = c ? `Cleared ${fmt(c.at)}${c.conf && c.conf !== 'Programme' ? ' · covers ' + h(c.conf) + ' content' : ''}${covered ? '' : ' · not in effect while ' + h(e.conf)}` : ask ? 'Requested by ' + nm(ask.requester) + ' — awaiting your decision' : inRev ? 'Authorised by you — in disclosure review' : last ? h(last.status) : 'Not cleared';
    const act = ask
      ? B('Decline', 'relDecide', { id: ask.id, v: 'Declined by owner' }) + B('Authorise', 'relDecide', { id: ask.id, v: 'Owner authorised — disclosure review' }, 'btn-p btn-sm')
      : !covered && !inRev && live
        ? B('Request clearance', 'relNew', { id: e.id, aud: a })
        : '';
    return `<div class="lrow ev-rr"><div class="lt"><b>${h(a)}</b><p class="cap">${st}</p></div>${act}</div>`;
  }).join('');
  return card(
    'Release',
    'A separate decision for each audience. Approval never releases evidence.',
    rows +
      (live ? '' : '<p class="cap">Only approved, active evidence can be cleared for an audience.</p>') +
      (consent(myId(), 'public') !== 'Granted' ? banner('warn', '', `Your public/funder release permission is ${h(consent(myId(), 'public').toLowerCase())}. Turn it on in ${L('Privacy & consent', 'privacy')} before you authorise a release.`) : '') +
      (e.conf !== 'Programme' ? banner('info', '', `This record is ${h(e.conf)}. It stays out of funder and public reports unless the Trust/Data Steward's clearance explicitly covers ${h(e.conf)} content.`) : ''),
  );
}
function evCommentsCard(e) {
  const can_ = evVisible(e) && !['S', 'O'].includes(role()) && e.lifecycle === 'Active';
  const list = (e.comments || []).map(c => `<li class="tl"><span class="cap">${nm(c.by)} · ${fmt(c.at)}</span><p style="white-space:pre-line">${h(c.t)}</p></li>`).join('');
  return card(
    'Evidence comments',
    'Feedback from mentors, facilitators and project members. A comment never changes the review status.',
    (list ? `<ol class="timeline ev-hist">${list}</ol>` : '<p class="cap">No comments yet.</p>') +
      (can_ ? `<form data-f="evc" class="col ev-form" novalidate style="margin-top:12px"><input type="hidden" name="id" value="${e.id}">${fi('evc', 't', 'Add a comment', { type: 'textarea', rows: 2, req: true, max: 1000 })}<div class="actions"><span class="cap">Seen by everyone who can see this evidence.</span><button class="btn btn-s" type="submit">Post comment</button></div></form>` : ''),
  );
}
function evDetail(e) {
  const own = e.owner === myId();
  const reviewable = e.lifecycle === 'Active' && ['Submitted', 'In review', 'Needs Revision'].includes(e.review);
  const rev = hasB('Reviewer') && !own;
  const rr = S.releases.filter(x => x.ev === e.id);
  const confBtn = (own || rev) && e.lifecycle === 'Active' && (own || e.conf !== 'Confidential') ? B(own ? 'Change confidentiality' : 'Raise confidentiality', 'evConf', { id: e.id }) : '';
  return (
    crumbsHtml([
      ['Evidence', 'evidence'],
      [h(e.title)],
    ]) +
    `<div class="shead-main ev-head"><span class="tile" aria-hidden="true">${ic(evGlyph(e), 20)}</span><div class="shead-t"><div class="shead-kind">Evidence · ${h(e.type)}</div><div class="row wrap ev-ttl"><h1 class="h1">${h(e.title)}</h1></div><div class="shead-meta"><span>Project · ${evProjects(e).map(p => h(p.title)).join(', ') || 'Not linked to a project'}</span><span>${nm(e.owner)}</span><span>${h(e.format || 'File upload')}</span></div></div>${evEditable(e) ? `<div class="shead-a">${B(ic('edit', 14) + 'Edit', 'evEdit', { id: e.id })}</div>` : ''}</div>` +
    evDims(e) +
    `<div class="g12 ev-body" style="margin-top:16px"><div class="c8 col ev-main">${card(
      'Evidence record',
      '',
      `<p class="ev-claim-lead"><span class="ev-fk">Claim</span>${h(e.claim)}</p>` +
        dl([evFormatRow(e), evDelivRow(e)]),
      '',
      'ev-doc',
    )}${card(
      'Record details',
      '',
      dl([
        ['Project', evProjects(e).map(p => (can('projects') && (p.owner === myId() || role() !== 'P') ? L(h(p.title), 'project', { id: p.id }) : h(p.title))).join(', ') || '<span class="cap">Not linked to a project</span>'],
        ['Owner', nm(e.owner)],
        ['Source', h(e.source)],
        ['Purpose', h(e.purpose)],
        ['Confidentiality', h(e.conf) + ' — ' + h(confMeaning(e.conf))],
        ['Retention', h(e.retention)],
        ['Linked to', e.linked.map(cName).join(', ')],
        ['Reviewer', e.reviewer ? nm(e.reviewer) : '—'],
        ['Limitations / uncertainty', h(e.limits || '—')],
      ]),
      confBtn,
      'ev-meta',
    )}${evCommentsCard(e)}</div>
 <aside class="c4 col ev-side">${evMilestonesCard(e)}${rev && reviewable ? card('Review', 'Quality review only. Confidentiality and release are separate decisions; approval does not release it.', evReviewForm(e), '', 'accent') : ''}
 ${!rev && !own && role() === 'F' && reviewable ? card('Review', '', '<p class="cap">Approving or rejecting evidence needs the Reviewer bundle. You can comment on it.</p>') : ''}
 ${own && e.review === 'Needs Revision' && e.lifecycle === 'Active' ? card('Revise and resubmit', 'History is kept.', B('Resubmit', 'evResub', { id: e.id }, 'btn-p btn-block')) : ''}
 ${own ? evReleaseCard(e, rr) : ''}
 ${own && e.lifecycle === 'Active' ? CB('Withdraw evidence', 'evWithdraw', { id: e.id }, 'Withdraw this evidence? Its lifecycle becomes Withdrawn: it leaves review and stops counting in any release. Its review status and history are kept.') : ''}
 ${
   hasB('Trust/Data Steward')
     ? rr
         .filter(x => x.status === 'Owner authorised — disclosure review')
         .map(x => {
           const aud = x.aud || relAudOf(x.audience);
           const covers = e.conf !== 'Programme';
           return card(
             'Disclosure review — Trust/Data Steward',
             'Small or distinctive groups and sensitive narratives are suppressed, combined or withheld before release.',
             `<b>${h(REL_AUD_LABEL[aud] || aud)}</b><p class="cap">Requested ${fmt(x.at)} · ${h(e.review)} · ${h(e.lifecycle)} · ${h(e.conf)}</p>${covers ? banner('warn', '', `This record is ${h(e.conf)}. Releasing it means your clearance explicitly covers ${h(e.conf)} content for this audience.`) : ''}<div class="row ev-dr">${B('Withhold', 'relDecide', { id: x.id, v: 'Withheld after disclosure review' })}${e.review === 'Approved' && e.lifecycle === 'Active' ? B(covers ? 'Release — covers ' + h(e.conf) + ' content' : 'Release', 'relDecide', { id: x.id, v: 'Released', cover: e.conf }, 'btn-p btn-sm') : '<span class="cap">Only approved, active evidence can be released.</span>'}</div>`,
           );
         })
         .join('')
     : ''
 }
 ${card('History', 'Each entry names the dimension that changed, newest last', `<ol class="timeline ev-hist">${e.history.map(x => `<li class="tl"><span class="cap">${fmt(x.at)}${x.by ? ' · ' + nm(x.by) : ''}</span><p>${h(x.t)}</p></li>`).join('')}</ol>`)}</aside></div>`
  );
}
// The Steward's queue of milestone evidence, across the Action Rooms they steward.
function msQueueCard() {
  const rows = S.rooms
    .filter(x => inCtx(x) && msIsSteward(x))
    .flatMap(x => msPending(x).map(([m, it]) => [x, m, it, msItems(m).indexOf(it)]))
    .filter(([, , it]) => byId('evidence', it.ev)?.owner !== myId());
  return (
    card(
      'Milestone evidence awaiting your review',
      'Evidence added to milestones in the ' + WL() + 's you steward. Approve every piece before you validate the milestone.',
      table(
        ['Evidence', 'Milestone', WL(), 'Added by', 'Added', ''],
        rows.map(([x, m, it, i]) => {
          const e = byId('evidence', it.ev);
          return [L(h(e.title), 'evidence', { id: e.id }), h(m.t), L(h(x.name), 'room', { id: x.id, tab: 'plan' }), nm(it.by), fmt(it.at), B('Review', 'msRev', { r: x.id, id: m.id, i }, 'btn-p btn-sm')];
        }),
        'No milestone evidence is waiting for you.',
      ),
    ) + '<div class="section-gap"></div>'
  );
}
// Milestones this evidence supports, with the Steward's review for each; the Steward reviews from here too.
function evMilestonesCard(e) {
  const rows = S.rooms.flatMap(x =>
    (x.milestones || []).flatMap(m =>
      msItems(m)
        .map((it, i) => [x, m, it, i])
        .filter(([, , it]) => it.ev === e.id),
    ),
  );
  if (!rows.length) return '';
  return card(
    'Milestones',
    'The Steward approves this evidence for each milestone before it can be validated.',
    rows
      .map(([x, m, it, i]) => {
        const st = msToReview(it) ? MS_PEND : it.st;
        const act = msIsSteward(x) && m.status !== 'Achieved' && e.owner !== myId() && msToReview(it) ? B('Review for this milestone', 'msRev', { r: x.id, id: m.id, i }, 'btn-p btn-sm') : '';
        return `<div class="lrow" style="align-items:flex-start"><div class="lt"><b>${h(m.t)}</b><p class="cap">${L(h(x.name), 'room', { id: x.id, tab: 'plan' })} · milestone ${h(m.status.toLowerCase())}${it.rv ? ' · reviewed by ' + nm(it.rv) : ''}</p>${act ? `<div style="margin-top:8px">${act}</div>` : ''}</div>${pill(st, MS_PILL[st])}</div>`;
      })
      .join(''),
  );
}
// Used on the evidence page. Quality outcomes only; confidentiality can be raised here as a separate decision.
const evReviewForm = e =>
  `<form data-f="evr" class="col ev-form" novalidate><input type="hidden" name="id" value="${e.id}">${fi('evr', 'review', 'Review status', { type: 'select', req: true, opts: REVIEW_OUTCOMES, ph: 'Select', help: 'Quality only. Approved lets a linked milestone be validated as achieved; it does not release the evidence.' })}${fi('evr', 'level', 'Evidence Support Level', { type: 'select', req: true, opts: LEVELS.map(([k, v]) => [k, k + ' — ' + v]), value: e.level })}${fi('evr', 'limits', 'Limitations or uncertainty', { type: 'textarea', rows: 3, req: true, value: e.limits })}${fi('evr', 'comment', 'Comment to submitter', { type: 'textarea', rows: 2 })}${
    e.conf !== 'Confidential'
      ? `<p style="margin-top:6px"><b>Confidentiality — a separate decision</b></p><p class="cap">Now ${h(e.conf)}: ${h(CONF_SHORT[e.conf] || '')}.</p>${fi('evr', 'conf', 'Raise confidentiality (optional)', { type: 'select', ph: 'No change', opts: CONF.filter(([k]) => confRank(k) > confRank(e.conf)).map(([k, m]) => [k, k + ' — ' + m]) })}${fi('evr', 'confWhy', 'Reason for raising it', { type: 'textarea', rows: 2, help: 'Required if you raise it. The owner is told; it is recorded as its own history entry.' })}`
      : ''
  }<button class="btn btn-p" type="submit">Save review</button></form>`;
// Freeze proof (BF-04): only quality outcomes can be stored as a review status. Anything else is refused and audited.
function evReviewRefused(e, v) {
  const why = CONF.some(c => c[0] === v)
    ? `“${v}” is a confidentiality setting, not a review status. Set confidentiality separately.`
    : v === 'Withdrawn'
      ? '“Withdrawn” is a lifecycle state the owner sets, not a review status.'
      : `“${v}” is not a review status. Use one of: ${REVIEW_OUTCOMES.map(o => o[0]).join(', ')}.`;
  audit('Evidence review refused', e ? e.id : '—', why, 'denied');
  toast('Not saved: ' + why, 'err');
  render();
  return false;
}
// Records a review on the evidence itself. Used by the evidence page and by the Steward's milestone review.
function evApplyReview(e, review, level, limits, comment) {
  if (!e || !REVIEW_OUTCOMES.some(o => o[0] === review)) return evReviewRefused(e, review);
  if (e.lifecycle !== 'Active') {
    audit('Evidence review refused', e.id, 'lifecycle is ' + e.lifecycle, 'denied');
    toast('Not saved: this evidence is ' + e.lifecycle.toLowerCase() + ', so it is not under review.', 'err');
    render();
    return false;
  }
  const was = e.review;
  const wasLvl = e.level;
  e.review = review;
  e.level = level;
  e.limits = limits;
  e.reviewer = myId();
  if (was !== review) evHist(e, 'Review', was, review, comment);
  if (wasLvl !== level) evHist(e, 'Evidence Support', wasLvl, level);
  if (was === review && wasLvl === level && comment) evHist(e, 'Review', was, review, comment);
  // Approval suggests a profile change; the participant decides. One pending suggestion per evidence item.
  if (review === 'Approved' && !S.candidates.some(c => c.ev === e.id && c.status === 'Pending')) {
    const verified = hasB('Reviewer') && +String(level).slice(1) >= 3;
    S.candidates.push({
      id: uid('cd'),
      pid: e.owner,
      ev: e.id,
      field: 'Capability',
      value: e.claim,
      source: `Evidence “${e.title}” approved at ${level} by ${me().name}`,
      prov: verified ? 'Reviewer-verified' : 'Evidence-supported',
      status: 'Pending',
    });
    notify(e.owner, 'A profile change suggested by your approved evidence is waiting for your decision', 'profile', { tab: 'cand' });
  }
  if (/negative|harm|unintended/i.test(limits))
    S.assign
      .filter(a => a.bundles.includes('Incident/Safety Owner'))
      .forEach(a =>
        notify(a.pid, 'Material negative finding recorded on evidence ' + e.title, 'evidence', { id: e.id }),
      );
  notify(e.owner, `Evidence review: “${e.title}” — ${review} (${level})${comment ? ': ' + comment : ''}`, 'evidence', { id: e.id });
  audit('Evidence reviewed', e.id, 'Review ' + review + ' · Support ' + level);
  return true;
}
// Changes confidentiality and records it as its own decision. Reviewers may only raise it.
function evSetConf(e, to, why) {
  const from = e.conf;
  if (from === to) return false;
  e.conf = to;
  evHist(e, 'Confidentiality', from, to, why);
  if (e.owner !== myId()) notify(e.owner, `${me().name} raised the confidentiality of “${e.title}” to ${to}: ${why}`, 'evidence', { id: e.id });
  (e.cleared || []).filter(c => confRank(to) > confRank(c.conf)).forEach(c => notify(e.owner, `“${e.title}” is now ${to}; its ${c.aud} clearance no longer covers it`, 'evidence', { id: e.id }));
  audit('Evidence confidentiality changed', e.id, from + ' → ' + to);
  return true;
}
F.evr = d => {
  const e = byId('evidence', d.id);
  if (d.review && !REVIEW_OUTCOMES.some(o => o[0] === d.review)) return evReviewRefused(e, d.review);
  const raise = d.conf && CONF.some(c => c[0] === d.conf) && confRank(d.conf) > confRank(e.conf);
  if (!validate('evr', d, { review: ['req'], level: ['req'], limits: ['req'], ...(raise ? { confWhy: [['req', 'Say why you are raising it.']] } : {}) })) return render();
  if (d.conf && !raise) {
    UI.err.evr = { conf: 'A Reviewer can only raise confidentiality.' };
    return render();
  }
  if (!evApplyReview(e, d.review, d.level, d.limits, d.comment || '')) return;
  if (raise) evSetConf(e, d.conf, d.confWhy.trim());
  msEvidenceReviewed(e);
  clearF('evr');
  UI.modal = null;
  toast('Review saved.' + (raise ? ' Confidentiality raised to ' + d.conf + '.' : ''));
  ok();
};
// ---- confidentiality: the owner sets it; a Reviewer may raise it with a reason. Never a review status.
A.evConf = d => {
  const e = byId('evidence', d.id);
  const own = e.owner === myId();
  clearF('evcf');
  modal(
    own ? 'Change confidentiality' : 'Raise confidentiality',
    () =>
      `<form data-f="evcf" class="col ev-form" novalidate>${errSum('evcf')}<input type="hidden" name="id" value="${e.id}"><p class="cap">Now ${h(e.conf)}. This does not change the review status, support level or release decisions.</p>${fi('evcf', 'conf', 'Confidentiality', { type: 'select', req: true, value: own ? e.conf : '', ph: own ? '' : 'Select', opts: CONF.filter(([k]) => own || confRank(k) > confRank(e.conf)).map(([k, m]) => [k, k + ' — ' + m]) })}${fi('evcf', 'why', 'Reason', { type: 'textarea', rows: 2, req: !own, help: own ? 'Optional. Recorded in the history.' : 'Required. The owner is told.' })}${(e.cleared || []).length ? banner('info', '', 'Raising it takes the record out of any audience whose clearance does not cover the new level.') : ''}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.evcf = d => {
  const e = byId('evidence', d.id);
  const own = e.owner === myId();
  if (!validate('evcf', d, { conf: ['req'], ...(own ? {} : { why: [['req', 'Say why you are raising it.']] }) })) return render();
  if (!CONF.some(c => c[0] === d.conf)) return evReviewRefused(e, d.conf);
  if (!own && confRank(d.conf) <= confRank(e.conf)) {
    audit('Evidence confidentiality refused', e.id, 'a Reviewer can only raise confidentiality', 'denied');
    UI.err.evcf = { conf: 'A Reviewer can only raise confidentiality.' };
    return render();
  }
  UI.modal = null;
  clearF('evcf');
  toast(evSetConf(e, d.conf, (d.why || '').trim()) ? 'Confidentiality set to ' + d.conf + '.' : 'No change.');
  ok();
};
// ---- comments: mentors, facilitators and members who can see the evidence; no state change
F.evc = d => {
  if (!validate('evc', d, { t: ['req'] })) return render();
  const e = byId('evidence', d.id);
  (e.comments = e.comments || []).push({ id: uid('ec'), by: myId(), at: today(), t: d.t.trim() });
  [e.owner, e.reviewer].filter(p => p && p !== myId()).forEach(p => notify(p, `${me().name} commented on the evidence “${e.title}”`, 'evidence', { id: e.id }));
  audit('Evidence comment', e.id, 'comment added');
  clearF('evc');
  toast('Comment posted.');
  ok();
};
// ---- the evidence owner edits its description while it is under review; approved evidence is not edited
// (upload a new item instead), so a review never silently stops matching what was reviewed
const evEditable = e => !!e && e.owner === myId() && e.lifecycle === 'Active' && ['Submitted', 'In review', 'Needs Revision'].includes(e.review);
A.evEdit = d => {
  const e = byId('evidence', d.id);
  clearF('eve');
  UI.form.eve = { title: e.title, type: e.type, claim: e.claim || '', source: e.source || '', conf: e.conf };
  modal(
    'Edit evidence',
    () =>
      `<form data-f="eve" class="col ev-form" novalidate>${errSum('eve')}<input type="hidden" name="id" value="${e.id}">${fi('eve', 'title', 'Title', { req: true, max: 120 })}<div class="f2">${fi('eve', 'type', 'Evidence type', { type: 'select', req: true, opts: EV_TYPES })}${fi('eve', 'source', 'Source', { req: true })}</div>${fi('eve', 'claim', 'Claim or metric it supports', { req: true })}${fi('eve', 'conf', 'Confidentiality', { type: 'select', req: true, opts: CONF.map(([k, m]) => [k, k + ' — ' + m]), help: 'Who can see it. Separate from the review status.' })}${banner('info', '', 'The file, link or text itself is not changed here. Your reviewer is told what changed.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Save changes</button></div></form>`,
  );
};
F.eve = d => {
  if (!validate('eve', d, { title: ['req'], type: ['req'], claim: ['req'], source: ['req'] })) return render();
  const e = byId('evidence', d.id);
  const next = { title: d.title.trim(), type: d.type, claim: d.claim.trim(), source: d.source.trim() };
  const ch = changedFields(e, next, { title: 'title', type: 'type', claim: 'claim', source: 'source' });
  const confCh = d.conf && CONF.some(c => c[0] === d.conf) && d.conf !== e.conf;
  UI.modal = null;
  clearF('eve');
  if (!ch.length && !confCh) {
    toast('No changes to save.');
    return ok();
  }
  if (ch.length) {
    Object.assign(e, next);
    e.history.push({ at: today(), by: myId(), t: 'Edited by the owner: ' + ch.join(', ') });
    audit('Evidence edited', e.id, ch.join(', '));
  }
  if (confCh) evSetConf(e, d.conf, 'set by the owner');
  if (e.reviewer && e.reviewer !== myId()) notify(e.reviewer, 'Evidence edited by ' + me().name + ': ' + e.title, 'evidence', { id: e.id });
  toast('Evidence updated.');
  ok();
};
A.evResub = d => {
  const e = byId('evidence', d.id);
  if (e.lifecycle !== 'Active' || e.review !== 'Needs Revision') return deny('only active evidence that needs revision can be resubmitted', e.id);
  evHist(e, 'Review', e.review, 'Submitted', 'resubmitted after revision');
  e.review = 'Submitted';
  if (e.reviewer) notify(e.reviewer, 'Evidence resubmitted: ' + e.title, 'evidence', { id: e.id });
  msEvidenceResubmitted(e);
  audit('Evidence resubmitted', e.id, '');
  ok();
};
// Withdrawing changes the lifecycle only. The review status and the clearances stay on record; nothing withdrawn is
// released (evReleasedTo needs an active record).
A.evWithdraw = d => {
  const e = byId('evidence', d.id);
  if (e.lifecycle === 'Withdrawn') return ok();
  evHist(e, 'Lifecycle', e.lifecycle, 'Withdrawn', 'withdrawn by the owner');
  e.lifecycle = 'Withdrawn';
  S.releases.filter(x => x.ev === e.id && ['Awaiting owner decision', 'Owner authorised — disclosure review'].includes(x.status)).forEach(x => (x.status = 'Stopped — evidence withdrawn'));
  audit('Evidence withdrawn', e.id, 'lifecycle only');
  toast('Withdrawn. It no longer counts in any release; its history is kept.');
  ok();
};
const evReleasable = e => e && e.review === 'Approved' && e.lifecycle === 'Active';
A.relNew = d => {
  const e = byId('evidence', d.id);
  clearF('rel');
  const noC = consent(myId(), 'public') !== 'Granted';
  modal(
    'Authorise a release',
    () =>
      `<form data-f="rel" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('rel', 'aud', 'Audience and purpose', { type: 'select', req: true, value: d.aud || '', opts: REL_AUD.map(a => [a, REL_AUD_LABEL[a]]), ph: 'Select' })}${noC ? banner('warn', 'Public/funder release permission is off', `You can change this in ${L('My records & consent', 'privacy', { tab: 'consent' })} first.`) : ''}${e && e.conf !== 'Programme' ? banner('info', '', `This record is ${h(e.conf)}. The Trust/Data Steward must explicitly cover ${h(e.conf)} content, or it stays out of this audience.`) : ''}${banner('info', '', 'A Trust/Data Steward completes disclosure review before anything is released. This decision covers this audience only.')}${fi('rel', 'ok', 'I authorise this specific release', { type: 'checkbox', req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${noC ? 'disabled' : ''}>Authorise</button></div></form>`,
  );
};
F.rel = d => {
  if (!validate('rel', d, { aud: ['req'], ok: [['req', 'Tick to authorise.']] })) return render();
  const e = byId('evidence', d.id);
  const why = !e || e.owner !== myId()
    ? 'only the owner can authorise a release'
    : !REL_AUD.includes(d.aud)
    ? 'choose one of the listed audiences'
    : !evReleasable(e)
      ? 'only approved, active evidence can be released'
      : consent(e.owner, 'public') !== 'Granted'
        ? 'public/funder release permission is not granted — change it in My records & consent first'
        : evClear(e, d.aud) || S.releases.some(x => x.ev === e.id && (x.aud || relAudOf(x.audience)) === d.aud && x.status === 'Owner authorised — disclosure review')
          ? 'this audience is already cleared or in disclosure review'
          : '';
  if (why) {
    UI.modal = null;
    return deny(why, d.id);
  }
  S.releases.push({ id: uid('rr'), ev: d.id, requester: myId(), audience: REL_AUD_LABEL[d.aud], aud: d.aud, status: 'Owner authorised — disclosure review', at: today() });
  e.history.push({ at: today(), by: myId(), t: 'Release: owner authorised ' + d.aud + ' — awaiting Trust/Data Steward disclosure review' });
  evStewards().forEach(p => notify(p, 'Disclosure review needed: ' + e.title + ' (' + d.aud + ')', 'evidence', { id: d.id }));
  audit('Release authorised by owner', d.id, d.aud);
  UI.modal = null;
  clearF('rel');
  ok();
};
A.relDecide = d => {
  const x = byId('releases', d.id);
  const e = byId('evidence', x.ev);
  const aud = (x.aud = x.aud || relAudOf(x.audience));
  if (d.v.startsWith('Owner authorised')) {
    if (consent(e.owner, 'public') !== 'Granted') return deny('public/funder release permission is not granted — change it in My records & consent first');
    if (!evReleasable(e)) return deny('only approved, active evidence can be released', e.id);
  }
  if (['Released', 'Withheld after disclosure review'].includes(d.v) && x.status !== 'Owner authorised — disclosure review') return deny('the owner has not authorised this release', x.id);
  if (d.v === 'Released' && !evReleasable(e)) return deny('only approved, active evidence can be released', e.id);
  x.status = d.v;
  if (d.v === 'Released') {
    const before = e.release;
    const cover = CONF.some(c => c[0] === d.cover) ? d.cover : 'Programme';
    e.cleared = (e.cleared || []).filter(c => c.aud !== aud);
    e.cleared.push({ aud, at: today(), by: myId(), rr: x.id, conf: cover });
    e.release = evRelStr(e);
    evHist(e, 'Release', before, 'Cleared: ' + aud, 'disclosure review by ' + me().name + (cover !== 'Programme' ? '; covers ' + cover + ' content' : ''));
  } else e.history.push({ at: today(), by: myId(), t: 'Release (' + aud + '): ' + d.v });
  if (d.v.startsWith('Owner authorised')) evStewards().forEach(p => notify(p, 'Disclosure review needed: ' + e.title + ' (' + aud + ')', 'evidence', { id: e.id }));
  notify(e.owner, 'Release decision (' + aud + '): ' + d.v, 'evidence', { id: e.id });
  audit('Release decision', x.id, aud + ' · ' + d.v);
  ok();
};
// ---- evidence formats: a file, a link, a written reflection or output, or a reference to a repository record
const EV_FMTS = ['File upload', 'Link', 'Reflection or written output', 'Repository record'];
const evRecordsFor = spaces =>
  S.records.filter(r => r.state === 'Active' && (r.owner === myId() || r.linked.some(l => spaces.some(s => s.id === l))));
function neFmtFields(f, fmt, spaces) {
  if (fmt === 'Link')
    return fi(f, 'url', 'Link', { req: true, type: 'url', ph: 'https://', help: 'A document, dataset, output, published result or video hosted elsewhere.' });
  if (fmt === 'Reflection or written output')
    return fi(f, 'text', 'Reflection or written output', { type: 'textarea', rows: 6, req: true, ph: 'What you did, what it produced, and what it shows' });
  if (fmt === 'Repository record') {
    const recs = evRecordsFor(spaces);
    return recs.length
      ? fi(f, 'rec', 'Record', { type: 'select', req: true, ph: 'Select a record', opts: recs.map(r => [r.id, r.title + ' · ' + r.kind]), help: 'Linked by reference. The record keeps its own permissions.' })
      : banner('info', 'No records available', 'Only active records you own or that belong to your spaces can be referenced.');
  }
  return `<div class="field"><span class="lbl">File <span class="req">*</span></span><label class="dz ev-dz ${fe(f, 'file') ? 'err' : ''}"><span class="ev-dz-ic" aria-hidden="true">${ic('upload', 22)}</span><div><b>Choose a file</b></div><div class="cap">Up to ${S.settings.maxFileMB} MB. Video must be linked externally. Files are scanned; failures are quarantined.</div><input type="file" name="file" class="sr"><span class="fname">No file chosen</span></label>${fe(f, 'file') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, 'file')}</span>` : ''}</div>`;
}
// Which deliverable the evidence supports (optional). Value "roomId|taskId".
function neTaskField(f, spaces) {
  const opts = spaces
    .filter(s => byId('rooms', s.id))
    .flatMap(x => x.tasks.filter(k => !['Proposed', 'Declined'].includes(k.status)).map(k => [x.id + '|' + k.id, x.name + ' · ' + k.t + ' (' + k.status + ')']));
  if (!opts.length) return '';
  const def = UI.p.task && UI.p.link ? UI.p.link + '|' + UI.p.task : '';
  return fi(f, 'task', 'Supports deliverable', { type: 'select', ph: 'Not tied to one deliverable', opts, value: def, help: 'Optional. The evidence is attached to that deliverable as supporting evidence.' });
}
A.neFmt = (d, el) => {
  snapForms();
  UI.form.ne = { ...(UI.form.ne || {}), fmt: el.value };
  if (UI.err.ne) delete UI.err.ne.file;
  render();
};
// Uploading from a milestone: the new evidence is added to it and sent to the Steward.
const neMs = ms => {
  const [r, id] = String(ms || '').split('|');
  const x = byId('rooms', r);
  const m = x && x.milestones.find(y => y.id === id);
  return m && memberOf(x) && m.status !== 'Achieved' ? [x, m] : [];
};
const neMsBanner = () => {
  const [x, m] = neMs(UI.p.ms);
  return m ? '<div class="ev-up-note">' + banner('info', 'Evidence for the milestone “' + h(m.t) + '”', 'After you submit it, it is added to this milestone in ' + h(x.name) + ' and sent to the Steward for review. You return to the ' + WL() + '.') + '</div>' : '';
};
route('newevidence', 'evidence', () => {
  if (!can('evidence', 'CRM')) return deniedView('evidence');
  const f = 'ne';
  const spaces = [...myCircles(), ...myRopes(), ...myRooms()];
  return (
    head(
      'Upload evidence',
      'Add the evidence, say what it supports, and link it to the space it belongs to. A reviewer checks it.',
      '',
      [['Evidence', 'evidence'], ['Upload']],
    ) +
    `${neMsBanner()}${!UI.p.ms && UI.p.from && byId('rooms', UI.p.from) ? '<div class="ev-up-note">' + banner('info', 'Evidence for ' + h(byId('rooms', UI.p.from).name), 'This evidence supports the completed deliverables. After you submit it you return to the ' + WL() + ', where you can generate the Learning Harvest.') + '</div>' : ''}<div class="g12 ev-up"><form data-f="ne" class="card c12 col ev-upform" novalidate>${errSum(f)}<input type="hidden" name="from" value="${h(UI.p.from || '')}"><input type="hidden" name="ms" value="${h(UI.p.ms || '')}">
 <div class="np-sh"><span class="np-n" aria-hidden="true">1</span><h2 class="h3">The evidence</h2></div>
 ${fi(f, 'fmt', 'Evidence format', { type: 'select', req: true, opts: EV_FMTS, value: 'File upload', ch: 'neFmt', help: 'Documents, files, outputs and results can be uploaded or linked. Reflections are written here.' })}
 ${neFmtFields(f, fv(f, 'fmt', 'File upload'), spaces)}
 ${neTaskField(f, spaces)}
 <div class="np-sh"><span class="np-n" aria-hidden="true">2</span><h2 class="h3">What it shows</h2></div>
 ${fi(f, 'title', 'Title', { req: true })}<div class="f2">${fi(f, 'type', 'Evidence type', { type: 'select', req: true, ph: 'Select', opts: EV_TYPES })}${fi(f, 'claim', 'Claim or metric it supports', { req: true })}</div>
 <div class="np-sh"><span class="np-n" aria-hidden="true">3</span><h2 class="h3">Where it belongs</h2></div>
 ${spaces.length ? fi(f, 'link', 'Link to', { type: 'select', req: true, ph: 'Select a Circle, Rope Team or ' + WL(), value: UI.p.link || '', opts: spaces.map(s => [s.id, (byId('circles', s.id) ? 'Circle' : byId('ropes', s.id) ? 'Rope Team' : WL()) + ' · ' + s.name + (spaceProject(s.id) ? ' — ' + spaceProject(s.id).title : '')]), help: 'Linked by reference, not copied.' }) : banner('info', '', 'Join a Circle, Rope Team or ' + WL() + ' to link evidence.')}
 <div class="f2">${fi(f, 'source', 'Source', { req: true, ph: 'e.g. Field survey' })}${fi(f, 'purpose', 'Purpose', { type: 'select', req: true, opts: ['Project evidence', 'Milestone evidence', 'Learning evidence', 'Personal learning record (not public)'], ph: 'Select', help: 'There is no public portfolio. Any audience outside the programme is a separate release decision.' })}</div>
 ${fi(f, 'conf', 'Confidentiality', { type: 'select', req: true, value: 'Programme', opts: CONF.map(([k, m]) => [k, k + ' — ' + m]), help: 'Who can see it. Separate from the review status; you can change it later.' })}
 <div class="actions">${L('Cancel', 'evidence', {}, 'btn btn-g')}<button class="btn btn-p" type="submit">Submit for review</button></div></form></div>`
  );
});
F.ne = (d, form) => {
  const fmt = EV_FMTS.includes(d.fmt) ? d.fmt : 'File upload';
  const file = fmt === 'File upload' ? form.querySelector('input[type=file]')?.files?.[0] : null;
  d.link = [].concat(d.link || []).filter(Boolean);
  // visibility follows the space it is linked to; the other governance fields are not asked any more
  const sp0 = d.link[0];
  d.vis = byId('circles', sp0) ? 'Circle' : byId('ropes', sp0) ? 'Rope Team' : 'Room';
  d.consent = 'Not recorded';
  d.sens = 'Not recorded';
  d.retention = 'Programme duration';
  d.conf = CONF.some(c => c[0] === d.conf) ? d.conf : 'Programme';
  const [tRoom, tId] = (d.task || '').split('|');
  if (tRoom && !d.link.includes(tRoom)) d.link.push(tRoom);
  const okv = validate(
    'ne',
    { ...d, fileName: file?.name },
    {
      title: ['req'],
      type: ['req'],
      claim: ['req'],
      source: ['req'],
      purpose: ['req'],
    },
  );
  const e = UI.err.ne;
  if (fmt === 'File upload') {
    if (!file) e.file = 'Choose a file to upload.';
    else if (file.size > S.settings.maxFileMB * 1048576)
      e.file = `File is ${(file.size / 1048576).toFixed(1)} MB — over the ${S.settings.maxFileMB} MB limit.`;
    else if (/\.(mp4|mov|avi|mkv)$/i.test(file.name))
      e.file = 'Video is linked externally, not uploaded. Choose “Link” as the format instead.';
    else if (/\.(exe|bat|cmd|sh|js)$/i.test(file.name)) e.file = 'This file type is not supported.';
  }
  if (fmt === 'Link' && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test((d.url || '').trim())) e.url = 'Enter a full link starting with http:// or https://.';
  if (fmt === 'Reflection or written output' && (d.text || '').trim().length < 20) e.text = 'Write at least a couple of sentences (20 characters or more).';
  if (fmt === 'Repository record' && !byId('records', d.rec)) e.rec = 'Choose the record this evidence refers to.';
  if (!d.link.length) e.link = 'Choose the Circle, Rope Team or ' + WL() + ' this evidence belongs to.';
  if (Object.keys(e).length) return render();
  if (file && /eicar|virus/i.test(file.name)) {
    S.records.push({
      id: uid('rc'),
      title: file.name,
      kind: 'Evidence upload',
      owner: myId(),
      linked: [],
      date: today(),
      sens: d.sens,
      vis: d.vis,
      consent: d.consent,
      retention: d.retention,
      review: 'Pending',
      state: 'Quarantined',
      ver: 1,
      tags: '',
      sizeMB: +(file.size / 1048576).toFixed(1),
      note: 'Failed malware check — quarantined, not linked',
    });
    audit('File quarantined', file.name, 'Malware check failed', 'denied');
    clearF('ne');
    toast('File failed the malware check and was quarantined. It was not linked.', 'err');
    return ok();
  }
  const ev = {
    id: uid('ev'),
    owner: myId(),
    title: d.title,
    type: d.type,
    claim: d.claim,
    linked: d.link,
    project: (d.link.map(spaceProject).find(Boolean) || {}).id || null,
    format: fmt,
    file: file ? file.name : null,
    sizeMB: file ? +(file.size / 1048576).toFixed(2) : 0,
    ...(fmt === 'Link' ? { url: d.url.trim() } : {}),
    ...(fmt === 'Reflection or written output' ? { text: d.text.trim() } : {}),
    ...(fmt === 'Repository record' ? { record: d.rec } : {}),
    source: d.source,
    purpose: d.purpose,
    consent: d.consent,
    sens: d.sens,
    vis: d.vis,
    retention: d.retention,
    review: 'Submitted',
    level: 'E0',
    conf: d.conf,
    reviewer: null,
    limits: '',
    lifecycle: 'Active',
    release: 'Not cleared',
    cleared: [],
    comments: [],
    history: [{ at: today(), by: myId(), t: 'Submitted · Support E0 · Confidentiality ' + d.conf + ' · Lifecycle Active · Release not cleared' }],
  };
  S.evidence.push(ev);
  S.assign
    .filter(a => a.ctx === ctxId() && a.bundles.includes('Reviewer') && a.pid !== myId())
    .forEach(a => notify(a.pid, 'Evidence submitted for review: ' + ev.title, 'evidence', { id: ev.id }));
  const tx = tRoom && byId('rooms', tRoom);
  const tk = tx && tx.tasks.find(k => k.id === tId);
  if (tk) {
    (tk.evidence = tk.evidence || []).push(ev.id);
    (tk.log = tk.log || []).push({ at: now(), by: myId(), t: 'Supporting evidence added: ' + ev.title });
    ev.history.push({ at: today(), t: 'Attached to deliverable: ' + tk.t });
  }
  audit('Evidence submitted', ev.id, ev.type + ' · ' + fmt + (tk ? ' · supports ' + tk.t : ''));
  clearF('ne');
  const [mx, mm] = neMs(d.ms);
  if (mm) {
    if (!ev.linked.includes(mx.id)) ev.linked.push(mx.id);
    msLink(mx, mm, ev);
    save();
    go('room', { id: mx.id, tab: 'plan' });
    return toast('Evidence added to “' + mm.t + '” and sent to the Steward for review.');
  }
  save();
  const back = d.from && byId('rooms', d.from);
  if (back && memberOf(back)) {
    go('room', { id: back.id });
    return toast('Evidence submitted for review. Next step: generate the Learning Harvest.');
  }
  go('evidence', { id: ev.id });
  toast('Submitted for review.');
};
// ---------- REPOSITORY (E08) ----------
route('repository', 'repository', () => {
  const r = role();
  // arriving from a link to one record (e.g. from a Learning Harvest) searches the library for it
  if (UI.p.rec && byId('records', UI.p.rec)) {
    const st = (UI.dv.repository = UI.dv.repository || {});
    st.q = byId('records', UI.p.rec).title;
    st.page = 1;
    delete UI.p.rec;
  }
  const vis = S.records.filter(
    x =>
      r === 'A' ||
      x.owner === myId() ||
      x.linked.some(l => {
        const o = byId('circles', l) || byId('rooms', l) || byId('ropes', l);
        return o && (memberOf(o) || r === 'O');
      }),
  );
  const plain = s => String(s).replace(/<[^>]+>/g, '');
  const used = S.records.reduce((a, x) => a + x.sizeMB, 0);
  return (
    head(
      'Records repository',
      'Meeting notes, transcripts, approved chat exports, decisions and documents — with consent, sensitivity, visibility and retention.',
      r !== 'O' ? B(ic('upload', 16) + 'Upload record', 'repoUp', {}, 'btn-p') : '',
    ) +
    (r === 'A'
      ? `<div class="repo-store" role="status">${ic('archive', 18)}<div class="grow"><div class="bt">Storage</div><p class="cap">${used.toFixed(1)} MB used of the 50 GB quota (${((used / 51200) * 100).toFixed(2)}%). Warning at 80%.</p></div><div class="progress repo-meter" aria-hidden="true"><span class="bar" style="width:${Math.max(1, Math.min(100, (used / 51200) * 100))}%"></span></div></div>`
      : '') +
    card('Records', '', dataView('repository', {
      label: 'records',
      items: vis,
      search: x => x.title + ' ' + x.kind + ' ' + x.tags + ' ' + x.linked.map(l => plain(cName(l))).join(' ') + ' ' + P(x.owner).name,
      searchLabel: 'Search by title, type, people or space',
      quick: { label: 'State', options: dvOpts(vis, x => x.state), test: (x, v) => x.state === v },
      filters: [
        { key: 'kind', label: 'Type', options: dvOpts(vis, x => x.kind), test: (x, v) => x.kind === v },
        { key: 'space', label: 'Linked to', options: dvOpts(vis, x => x.linked, l => plain(cName(l))), test: (x, v) => x.linked.includes(v) },
      ],
      sorts: [
        ['date', 'Date', (a, b) => String(a.date || '').localeCompare(String(b.date || ''))],
        ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
      ],
      row: x => ({
        lead: `<span class="tile t-soft" aria-hidden="true">${ic(/link/i.test(x.kind) ? 'link' : /decision|commitment/i.test(x.kind) ? 'checks' : /chat|transcript/i.test(x.kind) ? 'message' : 'file', 18)}</span>`,
        title: h(x.title),
        sub: `v${x.ver}${x.note ? ' · ' + h(x.note) : ''}`,
        meta: [h(x.kind), x.linked.map(cName).join(', ') || '—', nm(x.owner), x.date ? fmt(x.date) : ''],
        badges: pill(x.state),
        primary: x.state !== 'Quarantined' ? B('Details', 'repoView', { id: x.id }) : '',
      }),
      empty: ['archive', 'No records.', ''],
    }))
  );
});
A.repoQ = (d, el) => {
  UI.q.repo = el.value;
  render();
};
A.repoView = d => {
  const x = byId('records', d.id);
  const can_ = x.owner === myId() || role() === 'A';
  const aiBlock = /missing/i.test(x.consent);
  modal(
    h(x.title),
    () =>
      `${dl([
        ['Type', h(x.kind)],
        ['Date', fmt(x.date)],
        ['Owner', nm(x.owner)],
        ['Linked to', x.linked.map(cName).join(', ')],
        ['Visibility', h(x.vis)],
        ['Retention', h(x.retention)],
        ['Review', pill(x.review)],
        [
          'Versions',
          (x.versions || [{ ver: 1, note: 'Original' }]).map(v => 'v' + v.ver + ' ' + h(v.note)).join(' · '),
        ],
      ])}${aiBlock ? banner('warn', 'AI extraction and broader sharing blocked', 'Recording consent is missing for at least one participant.') : ''}<div class="row wrap repo-acts">${B(ic('download', 14) + 'Export with metadata', 'repoExport', { id: x.id })}${can_ ? B('Upload corrected version', 'repoCorrect', { id: x.id }) : ''}${can_ && x.state !== 'Deletion requested' ? CB(ic('trash', 14) + 'Request deletion', 'repoDel', { id: x.id }, 'Request deletion of this record? A Programme Administrator approves it; the audit entry is preserved.') : ''}${role() === 'A' && x.state === 'Deletion requested' ? B('Approve deletion', 'repoDelOk', { id: x.id }, 'btn-d btn-sm') : ''}</div>`,
  );
};
A.repoExport = d => {
  audit('Record exported', d.id, 'with metadata and audit summary');
  toast('Export prepared with metadata and audit summary.');
  UI.modal = null;
  ok();
};
A.repoCorrect = d => {
  const x = byId('records', d.id);
  x.versions = x.versions || [{ ver: 1, note: 'Original' }];
  x.ver++;
  x.versions.push({ ver: x.ver, note: 'Corrected by ' + me().name });
  audit('Record corrected', x.id, 'v' + x.ver);
  UI.modal = null;
  toast('Corrected version saved; previous version and audit trail kept.');
  ok();
};
A.repoDel = d => {
  const x = byId('records', d.id);
  x.state = 'Deletion requested';
  S.assign.filter(a => roleBase(a.role) === 'A').forEach(a => notify(a.pid, 'Deletion requested: ' + x.title, 'repository'));
  audit('Deletion requested', x.id, '');
  UI.modal = null;
  ok();
};
A.repoDelOk = d => {
  const x = byId('records', d.id);
  S.records = S.records.filter(r => r !== x);
  audit('Record deleted (authorised)', x.id, 'Audit entry preserved');
  UI.modal = null;
  toast('Deleted. The audit entry is preserved.');
  ok();
};
A.repoUp = () => {
  clearF('ru');
  const sp = [...myCircles(), ...myRopes(), ...myRooms()];
  modal(
    'Upload a record',
    () =>
      `<form data-f="ru" class="col prj-dlg" novalidate>${fi('ru', 'title', 'Title', { req: true })}${fi('ru', 'kind', 'Type', { type: 'select', req: true, ph: 'Select', opts: ['Meeting notes', 'Transcript', 'Approved chat export', 'Decision', 'Commitment', 'Document', 'Recording (external link)'] })}<div class="field"><label class="lbl" for="ru_file">File</label><input id="ru_file" type="file" name="file" class="input repo-file"></div>${fi('ru', 'link', 'Link to', { type: 'select', req: true, ph: 'Select', opts: sp.map(s => [s.id, s.name]) })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Upload</button></div></form>`,
  );
};
F.ru = (d, form) => {
  if (!validate('ru', d, { title: ['req'], kind: ['req'], link: ['req'] })) return render();
  const file = form.querySelector('input[type=file]').files[0];
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    UI.err.ru = { title: 'File over ' + S.settings.maxFileMB + ' MB.' };
    return render();
  }
  S.records.push({
    id: uid('rc'),
    title: d.title,
    kind: d.kind,
    owner: myId(),
    linked: [d.link],
    date: today(),
    vis: 'Linked space members',
    consent: 'Not recorded',
    retention: 'Programme',
    review: 'Approved',
    state: 'Active',
    ver: 1,
    tags: '',
    sizeMB: file ? +(file.size / 1048576).toFixed(2) : 0.1,
  });
  audit('Record uploaded', d.title, d.kind);
  UI.modal = null;
  clearF('ru');
  ok();
};
// ---------- LEARNING HARVEST (F08) ----------
const HV_SECTIONS = [
  'Context',
  'What happened',
  'Evidence and outcomes',
  'Learning',
  'Human perspective',
  'Governance',
  'Forward movement',
  'AI transparency',
];
const canComplete = () => role() === 'F' || hasB('Reviewer') || hasB('Project Lead');
// Release of an approved Harvest is a separate, later decision per audience, made by the Trust/Data Steward.
const HV_AUD = ['Funder report', 'Public showcase', 'Organisation report'];
const hvRelStr = x => [(x.cleared || []).length ? 'Cleared: ' + x.cleared.map(c => c.aud).join('; ') : 'Not cleared', x.relReq ? 'Release requested: ' + x.relReq : ''].filter(Boolean).join(' · ');
// Approved Harvests cleared for `audience` — for sponsor and public reports.
const hvReleasedTo = audience => S.harvests.filter(x => ['Approved', 'Released'].includes(x.state) && (x.cleared || []).some(c => c.aud === audience));
// Dissent and minority views are kept as their own entries: later edits and approval never remove them.
function hvDissentSection(x, f, edit) {
  const ds = x.dissent || [];
  const body =
    (ds.length ? `<ul class="hv-dis">${ds.map(v => `<li><p class="hv-x">${h(v.t)}</p><span class="cap">${h(v.kind || 'Dissent')} · ${nm(v.by)} · ${fmt(v.at)}</span></li>`).join('')}</ul>` : '<p class="cap">None recorded.</p>') +
    (edit ? fi(f, 'dissentAdd', 'Add a dissenting or minority view', { type: 'textarea', rows: 2, help: 'Kept as written and attributed. Later edits and approval cannot remove it.' }) : '');
  return `<section class="hv-s hv2-sec" id="${f === 'hv2' ? 'hv2-' : 'hv-'}dissent"><header class="hv2-sh"><h2 class="h3">Dissent and minority views</h2><p class="cap">Disagreement, minority positions and missing voices are preserved, including after approval.</p></header>${body}</section>`;
}
const hvAddDissent = (x, t, kind = 'Dissent') => {
  if (!String(t || '').trim()) return;
  (x.dissent = x.dissent || []).push({ by: myId(), at: today(), kind, t: String(t).trim() });
};
function hvReleaseCard(x, comp) {
  const pend = x.relReq;
  const open = HV_AUD.filter(a => !(x.cleared || []).some(c => c.aud === a));
  return card(
    'Release',
    'A separate decision after approval, for one audience at a time. The Trust/Data Steward decides.',
    `<p class="hv-rel">${h(hvRelStr(x))}</p>` +
      (x.state === 'Approved' && comp && !pend && open.length ? `<div class="row wrap" style="gap:6px">${open.map(a => B('Request release: ' + a, 'hvRel', { id: x.id, v: 'Release requested', aud: a })).join('')}</div>` : '') +
      (x.state !== 'Approved' ? '<p class="cap">Available after a person approves the Harvest.</p>' : '') +
      (pend && hasB('Trust/Data Steward') ? `<div class="row wrap" style="gap:6px;margin-top:8px">${B('Withhold', 'hvRelNo', { id: x.id })}${B('Release to ' + h(pend), 'hvRel', { id: x.id, v: 'Released', aud: pend }, 'btn-p btn-sm')}</div>` : pend ? '<p class="cap">Waiting for the Trust/Data Steward.</p>' : ''),
  );
}
route('harvests', 'harvest', () => {
  const r = role();
  if (r === 'S') return deniedView('harvest');
  const list = S.harvests.filter(x => {
    const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
    return (
      r === 'A' ||
      (o && (memberOf(o) || r === 'F')) ||
      x.personal === myId() ||
      (r === 'O' && (x.cleared || []).some(c => c.aud === 'Organisation report'))
    );
  });
  return (
    head(
      'Learning Harvests',
      'Source records → optional AI draft / advisory → human review and edits → a person approves or rejects → a separate release decision. Previous versions are kept.',
      r !== 'S' && r !== 'O' ? B(ic('plus', 16) + 'Start a Harvest', 'newHarvest', {}, 'btn-p') : '',
    ) +
    card('Your Learning Harvests', '', dataView('harvests', {
      label: 'Harvests',
      items: list,
      search: x => x.scopeName + ' ' + x.trigger + ' ' + x.state + ' ' + x.release,
      quick: { label: 'State', options: ['Draft', 'Review', 'Approved', 'Rejected'].filter(s => list.some(x => x.state === s)).map(s => [s, s]), test: (x, v) => x.state === v },
      filters: [
        { key: 'trigger', label: 'Trigger', options: dvOpts(list, x => x.trigger), test: (x, v) => x.trigger === v },
        { key: 'release', label: 'Release', options: dvOpts(list, x => x.release), test: (x, v) => x.release === v },
        { key: 'ai', label: 'AI', options: [['yes', 'AI draft / advisory'], ['no', 'Written by people']], test: (x, v) => (v === 'yes' ? !!x.ai : !x.ai) },
      ],
      sorts: [
        ['title', 'Title', (a, b) => a.scopeName.localeCompare(b.scopeName)],
        ['state', 'State', (a, b) => a.state.localeCompare(b.state)],
        ['version', 'Version', (a, b) => (a.ver || 0) - (b.ver || 0)],
      ],
      row: x => ({
        lead: `<span class="tile t-soft" aria-hidden="true">${ic('sparkle', 18)}</span>`,
        title: h(x.scopeName),
        sub: h(x.trigger),
        meta: [`${x.tpl === 2 ? WL() + ' template' : 'Template v1.0'} · v${x.ver}`, h(x.release)],
        badges: pill(x.state) + (x.ai ? aiTag('AI draft / advisory') : ''),
        primary: L('Open', 'harvest', { id: x.id }, 'btn btn-s btn-sm'),
      }),
      empty: ['sparkle', 'No Harvests yet.', ''],
    }))
  );
});
A.newHarvest = d => {
  clearF('hv');
  const sp = [...myCircles(), ...myRopes(), ...myRooms()];
  const pids = ['A'].includes(role()) ? [...S.circles, ...S.rooms].filter(inCtx) : sp;
  modal(
    'Start a Learning Harvest',
    () =>
      `<form data-f="hv" class="col prj-dlg" novalidate>${fi('hv', 'scope', 'For', { type: 'select', req: true, ph: 'Select', opts: [...pids.map(s => [s.id, s.name]), ['personal', 'My personal Harvest (pathway)']], value: d.scope })}${fi('hv', 'trigger', 'Trigger', { type: 'select', req: true, opts: ['Session completion', 'Milestone', 'Visible win', 'Periodic review', 'Workspace closure', 'Pathway completion'] })}${consent(myId(), 'ai') === 'Granted' && S.settings.aiAvailable ? fi('hv', 'ai', 'Let PHOENIX draft it from authorised source records (Class B)', { type: 'checkbox' }) : banner('info', '', consent(myId(), 'ai') !== 'Granted' ? `AI processing is off for you, so PHOENIX will not draft the Harvest; you write it yourself. You can change this in ${L('My records & consent', 'privacy', { tab: 'consent' })}.` : 'AI drafting unavailable — you will write the Harvest manually.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Start</button></div></form>`,
  );
};
F.hv = d => {
  if (!validate('hv', d, { scope: ['req'], trigger: ['req'] })) return render();
  const o =
    d.scope === 'personal' ? null : byId('circles', d.scope) || byId('rooms', d.scope) || byId('ropes', d.scope);
  const ai = d.ai === 'yes';
  const src = o ? S.records.filter(r => r.linked.includes(o.id) && !/missing/i.test(r.consent)) : [];
  const blocked = o ? S.records.filter(r => r.linked.includes(o.id) && /missing/i.test(r.consent)) : [];
  const sec = {};
  HV_SECTIONS.forEach(s => (sec[s] = ''));
  if (ai) {
    sec.Context = `${o ? o.name : 'Personal pathway'} · ${d.trigger} · ${today()}`;
    sec['What happened'] = o && o.decisions ? o.decisions.map(x => x.t).join('; ') : '';
    sec['Evidence and outcomes'] = S.evidence
      .filter(e => o && e.linked.includes(o.id) && e.review === 'Approved' && e.lifecycle === 'Active' && e.conf === 'Programme')
      .map(e => e.title + ' (' + e.level + ')')
      .join('; ');
    sec.Learning = '[Draft] Themes from source records — review and edit.';
    sec['Forward movement'] =
      o && o.commitments
        ? o.commitments
            .filter(x => x.status === 'Open')
            .map(x => x.t)
            .join('; ')
        : '';
    // Only shared decisions, open commitments, approved evidence and consented records; private Rope Team notes are never read.
    sec['AI transparency'] =
      `AI draft / advisory, from ${src.map(r => r.title).join(', ') || 'approved records'}.${blocked.length ? ' Excluded (missing recording consent): ' + blocked.map(r => r.title).join(', ') + '.' : ''} Private Rope Team notes are never used. A person reviews, edits and decides; AI does not approve.`;
    S.ai.push({
      id: uid('aj'),
      by: myId(),
      cls: 'B',
      purpose: 'Harvest draft',
      sources: src.map(r => r.id).join(', '),
      consent: 'Granted',
      model: '[Provider model via AI gateway]',
      status: 'Draft',
      at: today(),
    });
  }
  const x = {
    id: uid('hv'),
    scope: o ? o.id : 'personal',
    personal: o ? null : myId(),
    scopeName: (o ? o.name : 'Personal Harvest — ' + me().name) + ' — ' + d.trigger,
    trigger: d.trigger,
    state: 'Draft',
    ai,
    ver: 1,
    by: myId(),
    sections: sec,
    contrib: [],
    dissent: [],
    cleared: [],
    release: 'Not cleared',
    versions: [],
  };
  S.harvests.push(x);
  if (o)
    (o.members || [])
      .filter(m => m.status === 'Active' && m.pid !== myId())
      .forEach(m => notify(m.pid, 'Contribute to a Learning Harvest: ' + x.scopeName, 'harvest', { id: x.id }));
  audit('Harvest initiated', x.id, ai ? 'AI draft' : 'manual');
  UI.modal = null;
  clearF('hv');
  save();
  go('harvest', { id: x.id });
};
route('harvest', 'harvest', () => {
  const x = byId('harvests', UI.p.id);
  if (!x) return empty('sparkle', 'Not found', '');
  const r = role();
  const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
  const mem = o ? memberOf(o) : x.personal === myId();
  if (r === 'S' || (r === 'O' && !(x.cleared || []).some(c => c.aud === 'Organisation report'))) return deniedView('harvest');
  const comp = canComplete() && (mem || r === 'F');
  const edit = ['Draft', 'Review'].includes(x.state) && (x.by === myId() || comp);
  if (x.tpl === 2) return hv2View(x, mem, comp, edit);
  return (
    crumbsHtml([['Learning Harvests', 'harvests'], ['Harvest']]) +
    `<div class="shead-main hv-head"><span class="tile" aria-hidden="true">${ic('sparkle', 20)}</span><div class="shead-t"><div class="shead-kind">Learning Harvest · ${h(x.trigger)}</div><div class="row wrap hv-ttl"><h1 class="h1">${h(x.scopeName)}</h1>${pill(x.state)}${x.ai ? aiTag('AI draft / advisory') : ''}</div><div class="shead-meta"><span>Learning Harvest Template v1.0 · version ${x.ver}</span><span>${h(hvRelStr(x))}</span></div></div></div>` +
    (x.state === 'Approved' ? banner('ok', 'Completed by a person (human decision)', (x.approvedBy ? 'Approved by ' + nm(x.approvedBy) + (x.approvedAt ? ' on ' + fmt(x.approvedAt) : '') + '.' : 'Approved by an authorised reviewer.') + (x.ai ? ' The AI draft was advisory only.' : '') + ' Release is a separate decision.') : '') +
    `<div class="g12"><form data-f="hve" class="card c8 col hv-doc" novalidate><input type="hidden" name="id" value="${x.id}">${HV_SECTIONS.map(s => (edit ? fi('hve', s, s, { type: 'textarea', rows: 2, value: x.sections[s] }) : `<section class="hv-s"><h2 class="h3">${s}</h2><p class="hv-x">${h(x.sections[s] || '—')}</p></section>`)).join('')}${hvDissentSection(x, 'hve', edit)}${edit ? `<div class="actions"><span class="cap">Approval is a human decision; AI never approves.</span><div class="row wrap"><button class="btn btn-s" type="submit" name="act" value="save">Save edits</button>${x.state === 'Draft' ? `<button class="btn btn-s" type="submit" name="act" value="review">Send for review</button>` : ''}${comp ? `<button class="btn btn-s" type="submit" name="act" value="reject">Reject</button><button class="btn btn-p" type="submit" name="act" value="approve">Approve (human decision)</button>` : ''}</div></div>` : ''}</form>
 <aside class="c4 col hv-side">${card('Contributions', 'Reflections, lessons, dissent and questions. Dissent is also kept in its own section.', x.contrib.map(c => lrow('message', h(c.t), nm(c.by))).join('') || '<p class="cap">None yet.</p>', mem && ['Draft', 'Review'].includes(x.state) ? B(ic('plus', 14) + 'Contribute', 'hvContrib', { id: x.id }) : '')}
 ${hvReleaseCard(x, comp)}
 ${card('Profile candidates', 'A Harvest never writes to a profile. Each participant who was a member is offered one candidate to accept, edit or reject.', x.state === 'Approved' && comp ? B('Offer profile candidates to participants', 'hvCand', { id: x.id }) : '<p class="cap">Available after approval.</p>')}
 ${x.state === 'Rejected' && (x.by === myId() || comp) ? card('Rejected', 'Revise contributions and redraft. The rejected version is kept.', B(ic('refresh', 14) + 'Revise and redraft', 'hvRedraft', { id: x.id }, 'btn-p btn-sm')) : ''}
 ${x.versions.length ? card('Previous versions', '', `<ol class="hv-vers">${x.versions.map(v => `<li class="cap">v${v.ver} · ${fmt(v.at)} · ${h(v.state)}</li>`).join('')}</ol>`) : ''}</aside></div>`
  );
});
F.hve = d => {
  const x = byId('harvests', d.id);
  const act = d.act || 'save';
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections }, dissent: (x.dissent || []).length });
  x.ver++;
  HV_SECTIONS.forEach(s => (x.sections[s] = d[s] || ''));
  if (act === 'approve') {
    const miss = ['Context', 'What happened', 'Learning', 'Forward movement'].filter(s => !x.sections[s].trim());
    if (miss.length) {
      x.ver--;
      x.versions.pop();
      toast('Complete required sections first: ' + miss.join(', '), 'err');
      return render();
    }
  }
  hvAddDissent(x, d.dissentAdd);
  if (act === 'approve') {
    x.state = 'Approved';
    x.approvedBy = myId();
    x.approvedAt = today();
    const j = S.ai.find(a => a.purpose === 'Harvest draft' && a.status === 'In review');
    if (j) {
      j.status = 'Released';
      j.reviewed = true;
    }
  }
  if (act === 'reject') x.state = 'Rejected';
  if (act === 'review') {
    x.state = 'Review';
    S.ai.filter(a => a.purpose === 'Harvest draft' && a.status === 'Draft').forEach(a => (a.status = 'In review'));
    S.assign
      .filter(a => a.ctx === ctxId() && roleBase(a.role) === 'F')
      .forEach(a => notify(a.pid, 'Harvest ready for review: ' + x.scopeName, 'harvest', { id: x.id }));
  }
  audit('Harvest ' + act, x.id, 'v' + x.ver + (act === 'approve' ? ' · completed by a person (human decision)' : ''));
  if (act === 'approve') toast('Harvest approved — completed by a person (human decision). Release is a separate step.');
  ok();
};
A.hvContrib = d => {
  clearF('hc');
  modal(
    'Contribute',
    () =>
      `<form data-f="hc" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${d.id}">${fi('hc', 'kind', 'Type', { type: 'select', opts: ['Reflection', 'Lesson', 'Dissent', 'Question', 'Missing voice'] })}${fi('hc', 't', 'Your contribution', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Add</button></div></form>`,
  );
};
F.hc = d => {
  if (!validate('hc', d, { t: ['req'] })) return render();
  const x = byId('harvests', d.id);
  x.contrib.push({ by: myId(), at: today(), t: d.kind + ': ' + d.t });
  if (['Dissent', 'Missing voice'].includes(d.kind)) hvAddDissent(x, d.t, d.kind);
  UI.modal = null;
  clearF('hc');
  ok();
};
// Request (Facilitator, Reviewer or Project Lead) and release (Trust/Data Steward), one audience at a time.
A.hvRel = d => {
  const x = byId('harvests', d.id);
  if (x.state !== 'Approved') return deny('a Learning Harvest is released only after a person approves it', x.id);
  if (!HV_AUD.includes(d.aud)) return deny('choose one of the listed audiences', x.id);
  if (d.v === 'Release requested') {
    if (x.relReq) return deny('a release request is already waiting for the Trust/Data Steward', x.id);
    x.relReq = d.aud;
    evStewards().forEach(p => notify(p, 'Harvest release requested (' + d.aud + '): ' + x.scopeName, 'harvest', { id: x.id }));
  } else if (d.v === 'Released') {
    if (x.relReq !== d.aud) return deny('there is no release request for this audience', x.id);
    x.cleared = (x.cleared || []).filter(c => c.aud !== d.aud);
    x.cleared.push({ aud: d.aud, at: today(), by: myId() });
    x.relReq = null;
    if (x.by) notify(x.by, 'Learning Harvest released to ' + d.aud + ': ' + x.scopeName, 'harvest', { id: x.id });
  } else return deny('unknown release decision', x.id);
  x.release = hvRelStr(x);
  audit('Harvest release', x.id, d.v + ' · ' + d.aud);
  ok();
};
A.hvRelNo = d => {
  const x = byId('harvests', d.id);
  if (!x.relReq) return ok();
  audit('Harvest release', x.id, 'Withheld · ' + x.relReq);
  if (x.by) notify(x.by, 'Learning Harvest release withheld (' + x.relReq + '): ' + x.scopeName, 'harvest', { id: x.id });
  x.relReq = null;
  x.release = hvRelStr(x);
  ok();
};
// Offers each participant who was a member one candidate. Never writes the profile; never repeats an offer;
// draws on nothing private (no Rope Team private notes, no Purpose Compass).
A.hvCand = d => {
  const x = byId('harvests', d.id);
  if (x.state !== 'Approved') return deny('candidates are offered only from an approved Learning Harvest', x.id);
  const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
  const ps = o
    ? (o.members || [])
        .filter(m => m.status === 'Active')
        .map(m => m.pid)
        .filter(p => S.assign.some(a => a.pid === p && a.ctx === ctxId() && roleBase(a.role) === 'P'))
    : [x.personal].filter(Boolean);
  const fresh = [...new Set(ps)].filter(p => !S.candidates.some(c => c.hv === x.id && c.pid === p));
  fresh.forEach(p => {
    S.candidates.push({
      id: uid('cd'),
      pid: p,
      hv: x.id,
      field: 'Completed learning activity',
      value: 'Took part in ' + x.scopeName,
      source: 'Approved Learning Harvest “' + x.scopeName + '”',
      prov: 'Activity-derived',
      status: 'Pending',
    });
    notify(p, 'A profile candidate from a Learning Harvest is waiting for your decision', 'profile', { tab: 'cand' });
  });
  audit('Harvest profile candidates offered', x.id, fresh.length + ' new · ' + (ps.length - fresh.length) + ' already offered');
  toast(fresh.length ? fresh.length + ' participant(s) were offered a candidate to accept, edit or reject.' + (ps.length > fresh.length ? ' ' + (ps.length - fresh.length) + ' had already been offered one.' : '') : 'Every participant has already been offered a candidate from this Harvest.');
  ok();
};

A.rbDecide = d => {
  const c = byId('cards', d.c);
  const pp = c.proposals.find(x => x.id === d.id);
  pp.status = d.v;
  notify(pp.from, `${me().name} ${d.v.toLowerCase()} your direct collaboration proposal`, 'card', { id: c.id });
  if (
    d.v === 'Accepted' &&
    !canCreateRoom() &&
    !['F', 'C', 'O', 'A'].includes((S.assign.find(a => a.pid === pp.from && a.ctx === c.ctx) || {}).role)
  )
    S.assign
      .filter(a => a.ctx === c.ctx && roleBase(a.role) === 'F')
      .forEach(a =>
        notify(a.pid, 'Create or link a ' + WL() + ' for an accepted direct collaboration', 'card', { id: c.id }),
      );
  audit('Route B ' + d.v, c.id, pp.from + '→' + pp.to);
  ok();
};
A.linkRoom = d => {
  const m = byId('matches', d.id);
  const rooms = myRooms();
  modal(
    'Link an existing ' + WL(),
    `<form data-f="lnk" class="col" style="gap:14px"><input type="hidden" name="id" value="${m.id}">${fi('lnk', 'room', WL(), { type: 'select', req: true, opts: rooms.map(x => [x.id, x.name]) })}${banner('info', 'Linked by reference', 'Only authorised shared context carries forward: title and purpose, agreed participants and roles, next milestone and approved evidence references. Private discussions and restricted records stay where they are.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Link</button></div></form>`,
  );
};
F.lnk = d => {
  const x = byId('rooms', d.room);
  const m = byId('matches', d.id);
  if (!x.related.includes(m.card)) x.related.push(m.card);
  m.next2 = 'Link existing ' + WL();
  m.outcome = 'Opportunity progressed';
  audit('Linked by reference', x.id, m.id);
  UI.modal = null;
  toast('Linked to ' + x.name + ' by reference.');
  ok();
};

A.hvRedraft = d => {
  const x = byId('harvests', d.id);
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections } });
  x.ver++;
  x.state = 'Draft';
  audit('Harvest reopened as draft after rejection', x.id, 'v' + x.ver);
  toast('Reopened as a new draft. The rejected version is kept.');
  ok();
};

// ---------- LEARNING HARVEST for an Action Room ----------
// Deliverables completed → evidence submitted → Harvest (A–G) → human review → approval → profile evolution suggestions.
// Facts are compiled from the source records; learning, negative findings and the four decisions are written by people.
const HV2 = [
  ['what', 'A. What happened', 'What was completed, the outcomes achieved, the evidence that supports completion, and relevant records.'],
  ['learning', 'B. Learning', 'What was learned: new knowledge, skills demonstrated and developed, new interests, and changes in understanding, confidence or capability.'],
  ['negative', 'C. Negative findings', 'Required. What did not work, failed approaches, incorrect assumptions, blockers, unexpected results and approaches that should not be repeated — even when the overall outcome was a success.'],
  ['resources', 'D. Resource contributions', 'The resources used, which of them contributed to the outcome, and how.'],
  ['partners', 'E. Partner contributions', 'The people, organizations and partners who contributed, what they contributed, and how it affected the outcome.'],
];
const HV2_LEARN = [
  ['knowledge', 'New knowledge'],
  ['skillsDem', 'Skills demonstrated'],
  ['skillsDev', 'Skills developed'],
  ['interests', 'New interests'],
  ['understanding', 'Changes in understanding'],
  ['confidence', 'Changes in confidence or capability'],
];
const HV2_DEC = [
  ['continue', 'Continue', 'What should continue?'],
  ['change', 'Change', 'What should change?'],
  ['stop', 'Stop', 'What should stop?'],
  ['test', 'Test', 'What should be tested next?'],
];
const HV2_KEYS = [...HV2.map(s => s[0]), ...HV2_LEARN.map(s => s[0]), ...HV2_DEC.map(s => s[0])];
const HV2_REQ = ['what', 'learning', 'negative', 'resources', 'partners', 'continue', 'change', 'stop', 'test'];
const HV2_LABEL = Object.fromEntries([...HV2.map(s => [s[0], s[1]]), ['learning', 'B. Learning — what was learned'], ...HV2_DEC.map(s => [s[0], 'F. ' + s[1]])]);
const LINK_IC = { Deliverable: 'check', Evidence: 'award', Milestone: 'flag', Resource: 'layers', Partner: 'users', Contribution: 'upload', Record: 'file', Baseline: 'target' };
const dOnly = s => (s ? String(s).slice(0, 10) : '');
const bullets = a => a.map(s => '• ' + s).join('\n');
// Draft the Harvest from the room's records. Nothing private from the Purpose Compass is copied into shared sections.
function hvCompile(x, pid) {
  const live = (x.tasks || []).filter(k => !['Proposed', 'Declined'].includes(k.status));
  const done = live.filter(k => k.status === 'Done');
  // a shared Harvest names only Programme-level, active evidence; restricted items are counted, not named
  const evAll = roomEvidence(x).filter(e => e.lifecycle !== 'Withdrawn');
  const ev = evAll.filter(e => e.conf === 'Programme');
  const evOf = k => (k.evidence || []).map(id => byId('evidence', id)).filter(e => e && e.conf === 'Programme');
  const ms = (x.milestones || []).filter(m => m.status === 'Achieved');
  const wins = (x.wins || []).filter(w => w.status === 'Approved');
  const recs = S.records.filter(r => r.state === 'Active' && r.linked.includes(x.id) && !/missing/i.test(r.consent));
  const linkedRecs = (x.links || []).filter(l => l.type === 'Repository record');
  const lib = (x.links || []).filter(l => ['Learning resource', 'Learning pathway'].includes(l.type));
  const what = [
    `Completed deliverables (${done.length}):`,
    bullets(done.map(k => `${k.t} — ${P(k.owner).name}${k.doneAt ? ', completed ' + fmt(dOnly(k.doneAt)) : ''}${evOf(k).length ? ' · evidence: ' + evOf(k).map(e => e.title).join('; ') : ''}${k.doneNote ? ' · ' + k.doneNote : ''}`)),
    (x.outcome ? 'Intended outcome: ' + x.outcome : 'Charter: ' + x.charter),
    ms.length ? 'Milestones achieved: ' + ms.map(m => m.t).join('; ') : '',
    `Evidence submitted (${ev.length}): ` + ev.map(e => `${e.title} (${e.review}, ${e.level})`).join('; ') + (evAll.length > ev.length ? ` · ${evAll.length - ev.length} restricted or confidential item(s) not named` : ''),
    recs.length + linkedRecs.length ? 'Records: ' + [...recs.map(r => r.title), ...linkedRecs.map(l => l.label)].join('; ') : '',
  ]
    .filter(Boolean)
    .join('\n');
  const neg = [
    ...(x.risks || []).filter(k => ['Open', 'Escalated', 'Accepted'].includes(k.state)).map(k => `Risk still ${k.state.toLowerCase()} at completion: ${k.t}`),
    ...(x.deps || []).filter(k => k.state === 'Blocked').map(k => `Blocked dependency: ${k.t} (on ${k.on})`),
    ...done.filter(k => k.due && k.doneAt && dOnly(k.doneAt) > k.due).map(k => `Completed late: ${k.t} (due ${fmt(k.due)}, done ${fmt(dOnly(k.doneAt))})`),
    ...(x.tasks || []).filter(k => k.status === 'Declined').map(k => `Proposed but not pursued: ${k.t}`),
    ...(x.contribs || []).filter(c => (c.history || []).some(e => /Changes requested|More evidence requested/.test(e.t))).map(c => `Contribution needed rework before acceptance: ${c.t}`),
    ...S.evidence.filter(e => e.linked.includes(x.id) && e.conf === 'Programme' && ['Rejected', 'Insufficient', 'Needs Revision'].includes(e.review)).map(e => `Evidence ${e.review.toLowerCase()}: ${e.title}`),
    ...(x.returns || []).map(r => `Work returned to ${r.to}: ${r.why}`),
  ];
  const resources = lib.map(l => `${l.label} (${l.type.toLowerCase()}) · how it contributed: `);
  const ppl = new Map();
  const add = (p, t) => p && p !== pid && ppl.set(p, [...(ppl.get(p) || []), t]);
  done.forEach(k => add(k.owner, `delivered “${k.t}”`));
  live.forEach(k => (k.partners || []).forEach(p => add(p, `contributed to “${k.t}”`)));
  (x.contribs || []).filter(c => c.status === 'Accepted').forEach(c => add(c.by, `contribution accepted: “${c.t}”${c.used ? ' — used in ' + c.used : ''}`));
  x.members.filter(m => m.status === 'Active' && m.label && !ppl.has(m.pid) && m.pid !== pid).forEach(m => add(m.pid, 'partner in this ' + WL()));
  const partners = [...ppl].map(([p, a]) => {
    const m = x.members.find(y => y.pid === p);
    return `${P(p).name}${m && m.label ? ' (' + m.label + ')' : ''}: ${a.join('; ')} · effect on the outcome: `;
  });
  const L2 = (type, id, label, r, p) => ({ type, id, label, r, p });
  const links = [
    ...done.map(k => L2('Deliverable', k.id, k.t, 'room', { id: x.id, tab: 'plan' })),
    ...ev.map(e => L2('Evidence', e.id, e.title, 'evidence', { id: e.id })),
    ...ms.map(m => L2('Milestone', m.id, m.t, 'room', { id: x.id, tab: 'plan' })),
    ...lib.map(l => L2('Resource', l.id, l.label, l.type === 'Learning resource' ? 'resources' : 'room', l.type === 'Learning resource' ? {} : { id: x.id, tab: 'about' })),
    ...[...ppl.keys()].map(p => L2('Partner', p, P(p).name, 'room', { id: x.id, tab: 'members' })),
    ...(x.contribs || []).filter(c => c.status === 'Accepted').map(c => L2('Contribution', c.id, c.t, 'room', { id: x.id, tab: 'contribs' })),
    ...recs.map(r => L2('Record', r.id, r.title, 'repository', { rec: r.id })),
    ...linkedRecs.filter(l => !recs.some(r => r.id === l.id)).map(l => L2('Record', l.id, l.label, 'repository', { rec: l.id })),
    L2('Baseline', pid, 'Purpose Compass Baseline', 'profile', { tab: 'compass' }),
  ];
  const sec = Object.fromEntries(HV2_KEYS.map(k => [k, '']));
  return {
    sections: { ...sec, what, negative: bullets(neg), resources: bullets(resources), partners: bullets(partners) },
    links,
    detected: neg.length,
  };
}
A.hvGen = d => {
  const x = byId('rooms', d.r);
  const ex = S.harvests.find(v => v.tpl === 2 && v.scope === x.id && v.subject === myId());
  if (ex) return go('harvest', { id: ex.id });
  const st = roomFlowState(x);
  if (!st.allDone) return deny('every required deliverable must be done before the Learning Harvest');
  if (!st.ev.length) return deny('upload evidence that supports the completed work before the Learning Harvest');
  const c = hvCompile(x, myId());
  const v = {
    id: uid('hv'),
    tpl: 2,
    scope: x.id,
    subject: myId(),
    personal: null,
    scopeName: x.name + ' — ' + me().name,
    trigger: 'Deliverables completed',
    state: 'Draft',
    ai: false,
    ver: 1,
    by: myId(),
    at: today(),
    sections: c.sections,
    detected: c.detected,
    links: c.links,
    contrib: [],
    dissent: [],
    cleared: [],
    release: 'Not cleared',
    versions: [],
  };
  S.harvests.push(v);
  x.members
    .filter(m => m.status === 'Active' && m.pid !== myId())
    .forEach(m => notify(m.pid, 'Contribute to a Learning Harvest: ' + v.scopeName, 'harvest', { id: v.id }));
  audit('Learning Harvest generated', v.id, x.name + ' · ' + c.links.length + ' linked records');
  save();
  go('harvest', { id: v.id });
  toast('Harvest drafted from your records. Write the learning, confirm the negative findings and record the four decisions.');
};
function hv2View(x, mem, comp, edit) {
  const f = 'hv2';
  const s = x.sections;
  const subj = x.subject === myId();
  const o = byId('rooms', x.scope);
  const sec = (k, title, help, body) =>
    `<section class="hv2-sec" id="hv2-${k}"><header class="hv2-sh"><h2 class="h3">${title}</h2>${help ? `<p class="cap">${help}</p>` : ''}</header>${body}</section>`;
  const ta = (k, label, o2 = {}) =>
    edit
      ? fi(f, k, label, { type: 'textarea', rows: o2.rows || 3, value: s[k], req: o2.req, help: o2.help, ph: o2.ph })
      : `<div class="hv2-ro">${label ? `<span class="lbl">${label}</span>` : ''}<p class="hv2-x">${h(s[k] || '—')}</p></div>`;
  const chip = l => L(ic(LINK_IC[l.type] || 'link', 13) + `<span>${h(l.label)}</span>`, l.r, l.p, 'hv2-chip');
  const links = (x.links || []).filter(l => l.type !== 'Baseline' || subj);
  const refs = types => {
    const ls = links.filter(l => types.includes(l.type));
    return ls.length ? `<div class="hv2-refs"><span class="cap">Source records</span>${ls.map(chip).join('')}</div>` : '';
  };
  const groups = [...new Set(links.map(l => l.type))];
  const pend = S.evolution.filter(e => e.hv === x.id && e.status === 'Pending');
  const mineEvo = S.evolution.filter(e => e.hv === x.id && e.pid === myId());
  const allEvo = S.evolution.filter(e => e.hv === x.id);
  const cp = S.compass[x.subject] || {};
  const main = `<form data-f="hv2" class="card c8 col hv2" novalidate>${errSum(f)}<input type="hidden" name="id" value="${x.id}">
  ${sec('what', HV2[0][1], HV2[0][2], ta('what', '<span class="sr">' + HV2[0][1] + '</span>', { rows: 8, req: true, help: edit ? 'Compiled from the completed deliverables, evidence, milestones, wins and records. Edit freely.' : '' }) + refs(['Deliverable', 'Evidence', 'Milestone', 'Record']))}
  ${sec('learning', HV2[1][1], HV2[1][2], ta('learning', 'What was learned', { rows: 3, req: true }) + `<div class="g2 hv2-learn">${HV2_LEARN.map(([k, l]) => ta(k, l, { rows: 2, help: edit && ['skillsDem', 'skillsDev', 'interests'].includes(k) ? 'Comma-separated. Used to suggest profile changes, which the person reviews.' : '' })).join('')}</div>`)}
  ${sec('negative', HV2[2][1] + ' <span class="req">*</span>', HV2[2][2], ta('negative', '<span class="sr">' + HV2[2][1] + '</span>', { rows: 6, req: true, help: edit ? (x.detected ? `Pre-filled with ${x.detected} item${x.detected > 1 ? 's' : ''} found in the records (open risks, blocked dependencies, late or declined deliverables, reworked contributions, evidence not approved). Confirm, edit and add what did not work.` : 'Nothing was flagged in the records. Record what did not work as expected, or explain why there was nothing.') : '' }))}
  ${hvDissentSection(x, f, edit)}
  ${sec('resources', HV2[3][1], HV2[3][2], ta('resources', '<span class="sr">' + HV2[3][1] + '</span>', { rows: 5, req: true, help: edit ? 'Add how each resource contributed, or remove ones that did not.' : '' }) + refs(['Resource']))}
  ${sec('partners', HV2[4][1], HV2[4][2], ta('partners', '<span class="sr">' + HV2[4][1] + '</span>', { rows: 5, req: true, help: edit ? 'Add how each contribution affected the outcome.' : '' }) + refs(['Partner', 'Contribution']))}
  ${sec('decisions', 'F. Continue / Change / Stop / Test', 'The Harvest concludes with four decisions. All four are required.', `<div class="hv2-dec">${HV2_DEC.map(([k, l, q]) => `<div class="hv2-d hv2-d-${k}${fe(f, k) ? ' err' : ''}"><label class="hv2-dl" for="hv2_${k}"><b>${l}</b><span class="cap">${q}</span></label>${edit ? `<textarea id="hv2_${k}" name="${k}" class="input${fe(f, k) ? ' err' : ''}" rows="4" aria-invalid="${!!fe(f, k)}">${h(fv(f, k, s[k] || ''))}</textarea>${fe(f, k) ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, k)}</span>` : ''}` : `<p class="hv2-x">${h(s[k] || '—')}</p>`}</div>`).join('')}</div>`)}
  ${sec('links', 'G. Links to records', 'Every source record this Harvest draws on. Each link opens the underlying record, which keeps its own permissions.', groups.length ? `<div class="hv2-links">${groups.map(g => `<div class="hv2-lg"><span class="lbl">${g === 'Baseline' ? 'Purpose Compass Baseline (only you)' : g + 's'}</span><div class="hv2-refs">${links.filter(l => l.type === g).map(chip).join('')}</div></div>`).join('')}</div>` : '<p class="cap">No linked records.</p>')}
  ${edit ? `<div class="actions"><span class="cap">Every save keeps the previous version.</span><div class="row wrap"><button class="btn btn-s" type="submit" name="act" value="save">Save edits</button>${x.state === 'Draft' ? '<button class="btn btn-s" type="submit" name="act" value="review">Send for review</button>' : ''}${comp && !subj ? '<button class="btn btn-s" type="submit" name="act" value="reject">Reject</button><button class="btn btn-p" type="submit" name="act" value="approve">Approve (human decision)</button>' : ''}</div></div>` : ''}</form>`;
  const side = `<aside class="c4 col" style="gap:12px">${card(
    'Status',
    '',
    dl([
      ['State', pill(x.state)],
      ['For', nm(x.subject)],
      [WL(), o ? L(h(o.name), 'room', { id: o.id }) : '—'],
      ['Version', 'v' + x.ver],
      x.approvedBy && ['Completed by a person (human decision)', nm(x.approvedBy) + (x.approvedAt ? ' · ' + fmt(x.approvedAt) : '')],
      ['Release', h(hvRelStr(x))],
    ]) + (x.state === 'Draft' ? `<p class="cap hv2-note">Not complete until it is sent for review and a person — a Faculty/Steward, Reviewer or Project Lead — approves it.</p>` : x.state === 'Review' ? '<p class="cap hv2-note">Waiting for review and a human approval decision.</p>' : ''),
    '',
    'hv2-status',
  )}
 <nav class="card quiet hv2-toc hide-md" aria-label="Harvest sections"><span class="lbl">In this Harvest</span><ol>${[...HV2.slice(0, 3).map(([k, t]) => [k, t]), ['dissent', 'Dissent and minority views'], ...HV2.slice(3).map(([k, t]) => [k, t]), ['decisions', 'F. Continue / Change / Stop / Test'], ['links', 'G. Links to records']].map(([k, t]) => `<li><a href="#hv2-${k}">${t}</a></li>`).join('')}</ol></nav>
 ${subj ? card('Your baseline', 'Context from your Purpose Compass. Only you see this panel; nothing here is copied into the Harvest unless you write it in.', dl([['Purpose', h(cp.PC1 || '—')], ['Outcome', h(cp.PC2 || '—')], ['Success looks like', h(cp.PC6 || '—')], ['You bring', h(cp.PC7 || '—')], ['Blockers you expected', h(cp.PC3 || '—')], ['How you learn', h(cp.learnHow || '—')], ['First milestone', h(cp.PC5 || '—')]]) + '<p class="cap hv2-note">Did an expected blocker happen? Add it to Negative findings if you want to share it.</p>', L('Open baseline', 'profile', { tab: 'compass' })) : ''}
 ${card('Profile evolution', 'Suggested from the approved Harvest. Never applied automatically.', !hvDone(x) ? '<p class="cap">Identified when the Harvest is approved. The person reviews each suggestion and approves or rejects it.</p>' : subj ? (mineEvo.length ? `<p>${pend.length ? `<b>${pend.length}</b> waiting for your review` : 'All reviewed'} · ${mineEvo.filter(e => e.status === 'Approved').length} approved · ${mineEvo.filter(e => e.status === 'Rejected').length} rejected</p>` : '<p class="cap">No profile changes were identified.</p>') : `<p class="cap">${allEvo.length} suggestion${allEvo.length === 1 ? '' : 's'} offered to ${nm(x.subject)} · ${pend.length} awaiting their decision. Only they can approve.</p>`, subj && mineEvo.length ? L(pend.length ? 'Review profile changes' : 'See decisions', 'profile', { tab: 'evo' }, 'btn btn-p btn-sm') : '')}
 ${card('Contributions', 'Reflections, lessons, dissent and questions. Dissent is also kept in its own section.', x.contrib.map(c => lrow('message', h(c.t), nm(c.by))).join('') || '<p class="cap">None yet.</p>', mem && ['Draft', 'Review'].includes(x.state) ? B(ic('plus', 14) + 'Contribute', 'hvContrib', { id: x.id }) : '')}
 ${hvReleaseCard(x, comp)}
 ${x.state === 'Rejected' && (x.by === myId() || comp) ? card('Rejected', 'Revise and redraft. The rejected version is kept.', B(ic('refresh', 14) + 'Revise and redraft', 'hvRedraft', { id: x.id }, 'btn-p btn-sm')) : ''}
 ${x.versions.length ? card('Previous versions', '', `<ol class="hv-vers">${x.versions.map(v => `<li class="cap">v${v.ver} · ${fmt(v.at)} · ${h(v.state)}</li>`).join('')}</ol>`) : ''}</aside>`;
  const evoMine = hvDone(x) && subj && pend.length ? `<div class="c12">${banner('warn', pend.length + ' suggested profile change' + (pend.length > 1 ? 's are' : ' is') + ' waiting for your review', 'Identified from this approved Harvest. Nothing has been applied: review each one and approve or reject it.<span class="row wrap hv2-evo-a">' + L('Review profile changes', 'profile', { tab: 'evo' }, 'btn btn-p btn-sm') + '</span>')}</div>` : '';
  return (
    crumbsHtml([['Learning Harvests', 'harvests'], ['Harvest']]) +
    `<div class="shead-main hv-head"><span class="tile" aria-hidden="true">${ic('sparkle', 20)}</span><div class="shead-t"><div class="shead-kind">Learning Harvest · ${h(x.trigger)}</div><div class="row wrap hv-ttl"><h1 class="h1">${h(x.scopeName)}</h1>${pill(x.state)}</div><div class="shead-meta"><span>Learning Harvest · ${WL()} template · version ${x.ver}</span>${o ? `<span>${L(h(o.name), 'room', { id: o.id })}</span>` : ''}<span>${h(x.release)}</span></div></div></div>` +
    (o ? `<nav class="hv2-flow" aria-label="Progress">${['Deliverables completed', 'Evidence submitted', 'Learning Harvest', 'Profile evolution'].map((t, i) => `<span class="${i < 2 || (i === 2 && hvDone(x)) || (i === 3 && hvDone(x) && !pend.length) ? 'done' : (i === 2 && !hvDone(x)) || (i === 3 && hvDone(x)) ? 'cur' : ''}">${i < 2 || (i === 2 && hvDone(x)) || (i === 3 && hvDone(x) && !pend.length) ? ic('check', 13) : i + 1} ${t}</span>`).join('')}</nav>` : '') +
    `<div class="g12">${evoMine}${main}${side}</div>`
  );
}
F.hv2 = d => {
  const x = byId('harvests', d.id);
  const act = d.act || 'save';
  const next = {};
  HV2_KEYS.forEach(k => (next[k] = String(d[k] ?? x.sections[k] ?? '').trim()));
  if (act === 'review' || act === 'approve') {
    const miss = HV2_REQ.filter(k => !next[k]);
    if (miss.length) {
      UI.form.hv2 = { ...d };
      UI.err.hv2 = Object.fromEntries(miss.map(k => [k, k === 'negative' ? 'Negative findings are required. Record what did not work, even if the overall outcome was a success.' : 'Complete this section.']));
      toast('Complete the required sections first: ' + miss.map(k => HV2_LABEL[k] || k).join(', '), 'err');
      return render();
    }
  }
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections }, dissent: (x.dissent || []).length });
  x.ver++;
  x.sections = { ...x.sections, ...next };
  hvAddDissent(x, d.dissentAdd);
  if (act === 'review') {
    x.state = 'Review';
    const o = byId('rooms', x.scope);
    [...new Set([...S.assign.filter(a => a.ctx === ctxId() && roleBase(a.role) === 'F').map(a => a.pid), ...(o ? o.members.filter(m => m.status === 'Active' && ['Project owner', 'Facilitator'].includes(spaceRole('rooms', o, m.pid))).map(m => m.pid) : [])])]
      .filter(p => p !== myId())
      .forEach(p => notify(p, 'Learning Harvest ready for review: ' + x.scopeName, 'harvest', { id: x.id }));
  }
  let found = [];
  if (act === 'approve') {
    x.state = 'Approved';
    x.approvedBy = myId();
    x.approvedAt = today();
    found = evoGenerate(x);
  }
  if (act === 'reject') x.state = 'Rejected';
  audit('Harvest ' + act, x.id, 'v' + x.ver);
  clearF('hv2');
  toast(
    act === 'approve'
      ? 'Harvest approved — completed by a person (human decision). ' + (found.length ? found.length + ' suggested profile change' + (found.length > 1 ? 's were' : ' was') + ' sent to ' + P(x.subject).name + ' for review — nothing was applied.' : 'No profile changes were identified.')
      : act === 'review'
        ? 'Sent for review.'
        : act === 'reject'
          ? 'Harvest rejected. The version is kept.'
          : 'Saved. The previous version is kept.',
  );
  ok();
};
