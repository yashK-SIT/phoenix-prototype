// ---------- PUBLIC PROJECTS: publishing an approved project, after a team vote ----------
// 1. Only an accepted project is eligible. 2. Its owner or steward asks the project team to vote: one eligible
// member = one vote, with the programme's voting threshold, quorum and window (the same rules as Circle votes,
// frozen when the vote opens). 3. If the team approves, the project owner — and only the owner — publishes it.
// A published project is listed in Public Projects for every signed-in user, with only what was made public:
// its details, the parts the owner chose to show (requirements, decisions, evidence) and the files explicitly
// marked Public in Documents. Private files, Rope Team content (ROPE_TEAM_ONLY) and locked evidence never appear.
// Unpublishing takes it out of Public Projects; the approval stands, so the owner can publish it again.
const PUB_ST = { na: 'Not eligible', priv: 'Private', vote: 'Team vote open', ok: 'Approved — ready to publish', no: 'Not approved', pub: 'Published' };
const PUB_PILL = { na: 'p-grey', priv: 'p-grey', vote: 'p-amber', ok: 'p-teal', no: 'p-red', pub: 'p-green' };
const PUB_SHOW = () => [
  ['req', 'Project requirements', 'The project summary and its sections: problem, objectives, requirements and scope, skills, risks, plan.'],
  ['dec', 'Decisions', 'Decisions recorded in its Circles and approved decisions in its ' + WL() + 's. Rope Team content is never shown.'],
  ['ev', 'Evidence', 'Evidence items marked Public in Documents.'],
];
const pubOf = p => (p && p.pub) || { votes: [] };
const pubVote = p => (pubOf(p).votes || []).slice(-1)[0] || null;
const pubOpen = p => {
  const v = pubVote(p);
  return v && v.status === 'Open' ? v : null;
};
const pubEligible = p => !!p && p.status === 'Accepted';
const pubPublished = p => !!p && pubEligible(p) && pubOf(p).state === 'Published';
function pubState(p) {
  if (pubPublished(p)) return 'pub';
  if (!pubEligible(p)) return 'na';
  const v = pubVote(p);
  if (!v) return 'priv';
  if (v.status === 'Open') return 'vote';
  return v.status === POLL_STATUS.pass ? 'ok' : 'no';
}
const pubPill = p => {
  const s = pubState(p);
  return `<span class="pill ${PUB_PILL[s]} pub-pill">${ic(s === 'pub' ? 'globe' : s === 'vote' ? 'vote' : s === 'ok' ? 'check' : 'lock', 12)}${PUB_ST[s]}</span>`;
};
// The project team that votes: the owner and the active members of its Circles, Rope Teams and Action Rooms.
// As in Circle votes, Observers, facilitators and members set as non-voting do not vote.
const pubVoters = p => {
  const sp = docSpaces(p);
  const out = new Set([p.owner]);
  [
    ['circles', sp.circles],
    ['ropes', sp.ropes],
    ['rooms', sp.rooms],
  ].forEach(([k, list]) =>
    list.forEach(o =>
      (o.members || []).forEach(m => {
        const r = spaceRole(k, o, m.pid);
        if (r && !['Observer', 'Facilitator'].includes(r) && !m.nonVoting) out.add(m.pid);
      }),
    ),
  );
  return [...out].filter(pid => byId('people', pid));
};
const PUB_MIN_VOTERS = 2;
const pubOpener = p => pubEligible(p) && inCtx(p) && (p.owner === myId() || (role() === 'F' && p.stewards.includes(myId())));
const pubCanVote = (p, v) => !!v && v.status === 'Open' && v.eligibleSnap.includes(myId());
const pubCanUnpublish = p => pubPublished(p) && inCtx(p) && (p.owner === myId() || (role() === 'F' && p.stewards.includes(myId())) || role() === 'A');
// Only files explicitly marked Public, never locked ones (Rope Team files, unapproved or sensitive evidence).
const pubDocs = p => (pubPublished(p) ? docIndex(p).filter(d => !d.lock && d.h.docVis === 'Public') : []);
const pubShow = (p, k) => (pubOf(p).show || {})[k] !== false;
const pubEvidence = p => S.evidence.filter(e => evProjects(e).includes(p) && e.docVis === 'Public' && !evDocLock(e));
// Decisions from the project's Circles (all recorded decisions) and Action Rooms (approved ones). Never Rope Teams.
const pubDecisions = p => {
  const sp = docSpaces(p);
  return [...sp.circles.flatMap(c => (c.decisions || []).map(x => ({ t: x.t, at: x.at, by: x.by, sp: c }))), ...sp.rooms.flatMap(r => (r.decisions || []).filter(x => x.state === 'Approved').map(x => ({ t: x.t, at: x.at, by: x.owner ? 'Owner ' + P(x.owner).name : '', sp: r })))].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
};
const pubTeamNotify = (p, t, r = 'project', prm) =>
  [...new Set([p.owner, ...p.stewards, ...pubVoters(p)])].filter(x => x !== myId()).forEach(x => notify(x, t, r, prm || { id: p.id }));

// ---- the "Public sharing" card on the project page
function pubCard(p, force) {
  if (!p || p.status === 'Draft' || !(force || projParty(p) || pubVoters(p).includes(myId()))) return '';
  const s = pubState(p);
  const v = pubVote(p);
  const own = p.owner === myId();
  const steps = [
    ['Team vote', s === 'vote' ? 'cur' : ['ok', 'pub'].includes(s) ? 'done' : 'todo'],
    ['Owner publishes', s === 'pub' ? 'done' : s === 'ok' ? 'cur' : 'todo'],
    ['In Public Projects', s === 'pub' ? 'done' : 'todo'],
  ];
  const track = `<ol class="pub-steps">${steps.map(([t, st], i) => `<li class="is-${st}"><span class="n">${st === 'done' ? ic('check', 12) : i + 1}</span>${t}</li>`).join('')}</ol>`;
  let body = '';
  let act = '';
  if (s === 'na') body = '<p class="cap">Public sharing opens once the project is accepted.</p>';
  if (s === 'priv' || s === 'no') {
    const n = pubVoters(p).length;
    body =
      (s === 'no' ? banner('warn', 'The team did not approve publication', h(v.result) + ' You can open a new vote, for example after changing what is marked Public.') : '<p class="cap">Only the project team sees this project. To list it in Public Projects, the team approves it by vote, then the owner publishes it.</p>') +
      (n < PUB_MIN_VOTERS ? banner('info', 'Not enough voters yet', 'A team vote needs at least ' + PUB_MIN_VOTERS + ' eligible members. Invite people to the project’s Circle, Rope Team or ' + WL() + ' first.') : '');
    if (pubOpener(p)) act = `<button type="button" class="btn btn-p btn-sm" data-a="pubVoteNew" data-id="${p.id}" ${n < PUB_MIN_VOTERS ? 'disabled' : ''}>${ic('vote', 14)}${s === 'no' ? 'Open a new vote' : 'Ask the team to vote'}</button>`;
  }
  if (s === 'vote') {
    const tl = tally(null, v);
    const mine = v.votes[myId()];
    body =
      `<div class="pub-vote"><b>${h(v.q)}</b>${v.desc ? `<p class="cap">${h(v.desc)}</p>` : ''}<p class="cap">Opened by ${nm(v.by)} · closes ${fmt(v.closes)} · ${tl.voted} of ${tl.eligible} eligible voted · needs ${tl.threshold}% “${h(v.options[0])}” with ${tl.quorum}% quorum</p>` +
      (pubCanVote(p, v) ? `<div class="pub-opts" role="group" aria-label="Your vote">${v.options.map((o, i) => `<button type="button" class="btn btn-sm ${mine === i ? 'btn-p' : 'btn-s'}" data-a="pubCast" data-id="${p.id}" data-i="${i}" aria-pressed="${mine === i}">${mine === i ? ic('check', 14) : ''}${h(o)}</button>`).join('')}</div><span class="cap">${mine != null ? 'You voted “' + h(v.options[mine]) + '”. You can change it until the vote closes.' : 'You have one vote.'}</span>` : '<span class="cap">You are not an eligible voter on this vote.</span>') +
      `</div>`;
    if (pubOpener(p)) act = CB('Close the vote now', 'pubCloseNow', { id: p.id }, 'Close the vote now? It is decided on the votes cast so far (' + tl.voted + ' of ' + tl.eligible + ').', 'btn-s btn-sm', 'Close vote');
  }
  if (s === 'ok') {
    body = banner('ok', 'The team approved publication', h(v.result)) + (own ? '' : '<p class="cap">Waiting for ' + nm(p.owner) + ', the project owner, to publish it.</p>');
    if (own) act = B(ic('globe', 14) + 'Publish project', 'pubPublish', { id: p.id }, 'btn-p btn-sm');
  }
  if (s === 'pub') {
    const pb = pubOf(p);
    body = `<p class="cap">Published ${fmt(pb.publishedAt)} by ${nm(pb.publishedBy)}. ${pubDocs(p).length} Public file${pubDocs(p).length === 1 ? '' : 's'} shared.</p>`;
    act = L(ic('globe', 14) + 'View public page', 'publicproject', { id: p.id }, 'btn btn-s btn-sm') + (pubCanUnpublish(p) ? CB('Unpublish', 'pubUnpublish', { id: p.id }, 'Take “' + p.title + '” out of Public Projects? The team’s approval stands, so the owner can publish it again later.', 'btn-g btn-sm', 'Unpublish') : '');
  }
  const past = (pubOf(p).votes || []).filter(x => x.status !== 'Open');
  const hist = past.length ? `<details class="pub-hist"><summary>Earlier votes (${past.length})</summary>${past.slice().reverse().map(x => `<p class="cap">${fmt(x.closedAt)} · ${pill(x.status)} ${h(x.result)}</p>`).join('')}</details>` : '';
  return card('Public sharing', pubPill(p), track + body + hist, act ? `<div class="row wrap" style="gap:8px">${act}</div>` : '', 'prj-panel pub-card');
}

// The vote on its own page, for every eligible voter — some team members (a Rope Team mentor, for example) cannot
// open the project page in their role, but they still vote on publication.
route('pubvote', 'any', () => {
  const p = byId('projects', UI.p.id);
  const v = p && pubVote(p);
  if (!p || !(projParty(p) || pubVoters(p).includes(myId()) || (v && v.eligibleSnap.includes(myId()))))
    return empty('lock', 'Not available', 'Only the project team sees its publication vote.', L('Public projects', 'publicprojects', {}, 'btn btn-s btn-sm'));
  const canProj = p.owner === myId() || (role() !== 'P' && can('projects'));
  return (
    head('Publication vote', h(p.title), canProj ? L('Open the project', 'project', { id: p.id }, 'btn btn-s btn-sm') : '') +
    `<div class="g12"><div class="c8 col">${pubCard(p, true)}</div><aside class="c4 col">${card('If it is published', '', dl([['Shown', 'Title, type, country, location, owner, steward; and the requirements, decisions and evidence the owner chooses'], ['Documents', pubDocsPreview(p)], ['Never shown', 'Private files, Rope Team content and evidence that is not approved or is sensitive']]))}</aside></div>`
  );
});
// ---- open a team vote
A.pubVoteNew = d => {
  const p = byId('projects', d.id);
  clearF('pubv');
  UI.form.pubv = { closes: pollDefaultClose() };
  const voters = pubVoters(p);
  const V = voteSettings();
  modal('Ask the team to approve publication', () =>
    `<form data-f="pubv" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}">${dl([
      ['Question', 'Publish “' + h(p.title) + '” in Public Projects?'],
      ['Options', POLL_OPTIONS.map(h).join(' · ')],
      ['Eligible voters (' + voters.length + ')', voters.map(nm).join(', ')],
      ['Will be shared', pubDocsPreview(p)],
    ])}${fi('pubv', 'desc', 'What the team should consider (optional)', { type: 'textarea', rows: 2, max: 600, ph: 'e.g. The report and survey summary are marked Public; resident names are not.' })}${fi('pubv', 'closes', 'Closes on (date and time)', { type: 'datetime-local', req: true, help: 'Defaults to the programme’s ' + (V.windowDays || 7) + '-day voting window.' })}${banner('info', 'How it is decided', 'One eligible member = one vote. “' + h(POLL_OPTIONS[0]) + '” must reach ' + (V.threshold || 0) + '% of eligible voters with a ' + (V.quorum || 0) + '% quorum. The vote closes when everyone has voted or at the closing time. If approved, only the project owner can publish.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Open the vote</button></div></form>`,
  );
};
// What would be public right now, before anyone votes.
const pubDocsPreview = p => {
  const f = docIndex(p).filter(d => !d.lock && d.h.docVis === 'Public');
  return f.length + ' file' + (f.length === 1 ? '' : 's') + ' marked Public' + (docCanOpen(p) && DOC_ROLES.includes(role()) ? ' · ' + L('Review in Documents', 'documents', { id: p.id }) : '');
};
F.pubv = d => {
  const p = byId('projects', d.id);
  if (!validate('pubv', d, { closes: ['req', ['fn', { f: v => v > now().slice(0, 16), m: 'Choose a closing date and time in the future.' }]] })) return render();
  const voters = pubVoters(p);
  if (voters.length < PUB_MIN_VOTERS) {
    toast('A team vote needs at least ' + PUB_MIN_VOTERS + ' eligible members.', 'warn');
    return render();
  }
  if (pubOpen(p)) return deny('a vote is already open on this project');
  p.pub = pubOf(p);
  p.pub.votes = p.pub.votes || [];
  const v = { id: uid('pv'), q: 'Publish “' + p.title + '” in Public Projects?', desc: (d.desc || '').trim(), options: [...POLL_OPTIONS], votes: {}, eligibleSnap: voters, rule: pollRule(null), opened: now(), by: myId(), closes: d.closes, status: 'Open' };
  p.pub.votes.push(v);
  p.history.push({ at: now(), by: myId(), t: 'Team vote on publication opened by ' + me().name + ' · ' + voters.length + ' eligible voters' });
  voters.filter(x => x !== myId()).forEach(x => notify(x, 'Vote: publish “' + p.title + '” in Public Projects? You have one vote.', 'pubvote', { id: p.id }));
  audit('Publication vote opened', p.id, voters.length + ' eligible · threshold ' + v.rule.threshold + '% · quorum ' + v.rule.quorum + '%');
  UI.modal = null;
  clearF('pubv');
  toast('Vote opened. The team has been told.');
  ok();
};
A.pubCast = d => {
  const p = byId('projects', d.id);
  const v = pubOpen(p);
  if (!pubCanVote(p, v)) return deny('not an eligible voter on this vote');
  const i = +d.i;
  if (!(i >= 0 && i < v.options.length)) return render();
  v.votes[myId()] = i;
  audit('Publication vote cast', p.id, 'one vote');
  const tl = tally(null, v);
  if (tl.voted === tl.eligible) return pubClose(p, 'all');
  toast('Vote recorded.');
  ok();
};
A.pubCloseNow = d => pubClose(byId('projects', d.id), '');
// Decided like a Circle vote: only option 1 ("Approve") passing approves; anything else is recorded as not approved.
function pubClose(p, why, silent) {
  const v = pubOpen(p);
  if (!v) return silent ? undefined : ok();
  const tl = tally(null, v);
  const line = voteLine(v, tl);
  v.status = tl.outcome === 'pass' && tl.best === 0 ? POLL_STATUS.pass : tl.outcome === 'pass' ? POLL_STATUS.fail : POLL_STATUS[tl.outcome];
  v.closedAt = now();
  v.result = (v.status === POLL_STATUS.pass ? 'Approved: ' : 'Not approved: ') + line + '.';
  p.history.push({ at: now(), by: myId(), t: 'Publication vote closed' + (why === 'due' ? ' at its closing time' : why === 'all' ? ' (everyone voted)' : '') + ': ' + v.status.replace('Closed — ', '') });
  pubTeamNotify(p, 'Publication vote on “' + p.title + '”: ' + v.status.replace('Closed — ', '') + (v.status === POLL_STATUS.pass ? (p.owner === myId() ? '' : '. The owner can publish it now.') : ''));
  audit('Publication vote closed', p.id, v.status + ' · ' + line);
  if (silent) return save();
  toast(v.status === POLL_STATUS.pass ? 'Approved by the team.' + (p.owner === myId() ? ' You can publish it now.' : '') : v.status);
  ok();
}
// Run before every render (tick() in journey.js): a vote closes at its closing time.
function pubTick() {
  const t = now().slice(0, 16);
  S.projects.forEach(p => {
    const v = pubOpen(p);
    if (v && v.closes && v.closes < t) pubClose(p, 'due', true);
  });
}

// ---- publish and unpublish (owner publishes; owner, steward or Programme Administrator unpublishes)
A.pubPublish = d => {
  const p = byId('projects', d.id);
  clearF('pubp');
  UI.form.pubp = Object.fromEntries(PUB_SHOW().map(([k]) => [k, 'yes']));
  modal(
    'Publish to Public Projects',
    () => {
      const files = docIndex(p).filter(x => !x.lock && x.h.docVis === 'Public');
      return `<form data-f="pubp" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}">${banner('ok', 'Approved by the team', h(pubVote(p).result))}<fieldset class="np-fs col" style="gap:10px"><legend class="lbl">Show on the public page</legend><p class="cap" style="margin:0">Always shown: title, type, country, location, areas, owner, steward and current room.</p>${PUB_SHOW().map(([k, l, help]) => `<label class="row pub-chk"><input class="chk" type="checkbox" name="${k}" value="yes" ${fv('pubp', k) === 'yes' ? 'checked' : ''}><span class="col"><b>${l}</b><span class="cap">${help}</span></span></label>`).join('')}</fieldset><div class="field"><span class="lbl">Documents</span><span>${files.length} file${files.length === 1 ? '' : 's'} marked Public will be listed and downloadable, also as one ZIP. Private files stay private.${docCanOpen(p) ? ' ' + L('Review in Documents', 'documents', { id: p.id }) : ''}</span></div>${fi('pubp', 'ok', 'I confirm that what is marked Public can be shared outside the project team.', { type: 'checkbox', req: true })}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${ic('globe', 14)}Publish</button></div></form>`;
    },
    true,
  );
};
F.pubp = d => {
  const p = byId('projects', d.id);
  if (!validate('pubp', d, { ok: [['req', 'Confirm what may be shared.']] })) return render();
  if (pubState(p) !== 'ok' || p.owner !== myId()) return deny('only the project owner publishes, after the team approves it');
  Object.assign((p.pub = pubOf(p)), { state: 'Published', publishedAt: now(), publishedBy: myId(), show: Object.fromEntries(PUB_SHOW().map(([k]) => [k, d[k] === 'yes'])) });
  p.history.push({ at: now(), by: myId(), t: 'Published to Public Projects by ' + me().name });
  pubTeamNotify(p, '“' + p.title + '” is now in Public Projects', 'publicproject');
  audit('Project published', p.id, pubDocs(p).length + ' public files · show ' + PUB_SHOW().filter(([k]) => d[k] === 'yes').map(([, l]) => l).join(', '));
  UI.modal = null;
  clearF('pubp');
  toast('Published. “' + p.title + '” is in Public Projects.');
  ok();
};
A.pubUnpublish = d => {
  const p = byId('projects', d.id);
  Object.assign(p.pub, { state: null, unpublishedAt: now(), unpublishedBy: myId() });
  p.history.push({ at: now(), by: myId(), t: 'Taken out of Public Projects by ' + me().name });
  pubTeamNotify(p, '“' + p.title + '” was taken out of Public Projects');
  audit('Project unpublished', p.id, '');
  UI.modal = null;
  toast('Unpublished. The team’s approval stands; the owner can publish it again.');
  ok();
};

// ---- Public Projects: every published project, from every programme, for every signed-in user
const pubList = () => S.projects.filter(pubPublished);
route('publicprojects', 'any', () => {
  const list = pubList();
  return (
    head('Public projects', 'Projects their teams approved for public sharing, with the information and documents made public.') +
    card(
      'Published projects',
      list.length + ' project' + (list.length === 1 ? '' : 's') + ' · only Public information and files are shown',
      dataView('pub:list', {
        label: 'projects',
        items: list,
        search: p => [p.title, p.type, p.country || '', p.area || '', P(p.owner).name, ctxName(p.ctx), ...(p.tags || [])].join(' '),
        filters: [
          dvOpts(list, p => p.country).length > 1 && { key: 'country', label: 'Country', options: dvOpts(list, p => p.country), test: (p, v) => p.country === v },
          dvOpts(list, p => p.ctx).length > 1 && { key: 'ctx', label: 'Programme', options: dvOpts(list, p => p.ctx, ctxName), test: (p, v) => p.ctx === v },
          dvOpts(list, p => p.tags || []).length && { key: 'area', label: 'Area of interest', options: dvOpts(list, p => p.tags || []), test: (p, v) => (p.tags || []).includes(v) },
        ].filter(Boolean),
        sorts: [
          ['pub', 'Newest', (a, b) => String(pubOf(b).publishedAt).localeCompare(String(pubOf(a).publishedAt))],
          ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
        ],
        defaultSort: 'pub',
        row: p => ({
          lead: `<span class="tile t-navy" aria-hidden="true">${ic('globe', 18)}</span>`,
          title: L(h(p.title), 'publicproject', { id: p.id }, 'dv-link'),
          sub: [h(p.type), h(p.country || ''), h(p.area || ''), h(ctxName(p.ctx))].filter(Boolean).join(' · '),
          meta: ['Owner <b>' + nm(p.owner) + '</b>', '<b>' + pubDocs(p).length + '</b> public file' + (pubDocs(p).length === 1 ? '' : 's'), 'Published ' + fmt(pubOf(p).publishedAt)],
          badges: pubPill(p) + (p.stage === 'Closed' ? pill('Closed') : ''),
          primary: L('Open', 'publicproject', { id: p.id }, 'btn btn-s btn-sm'),
        }),
        empty: ['globe', 'No public projects yet', 'A project appears here once its team approves publication by vote and its owner publishes it.', ''],
      }),
      '',
      'rec-list',
    )
  );
});
route('publicproject', 'any', () => {
  const p = byId('projects', UI.p.id);
  const back = L(ic('chevl', 14) + 'All public projects', 'publicprojects', {}, 'btn btn-g btn-sm');
  if (!p || !pubPublished(p)) return empty('lock', 'This project is not public', 'It may have been unpublished, or it was never published.', back);
  const pb = pubOf(p);
  const files = pubDocs(p);
  const here = projHere(p);
  const zip = files.length ? B(ic('download', 14) + 'Download all public documents (' + files.length + ')', 'pubZip', { id: p.id }, 'btn-p btn-sm') : `<button type="button" class="btn btn-p btn-sm" disabled>${ic('download', 14)}No public documents</button>`;
  const team = projParty(p) || pubVoters(p).includes(myId());
  const secs = p.sections && p.sections.some(s => (s.text || '').trim()) ? `<ol class="prj-secs">${p.sections.map((s, i) => ((s.text || '').trim() && s.st !== 'Rejected' ? `<li class="prj-sec"><span class="sn" aria-hidden="true">${i + 1}</span><div class="prj-sec-b"><h3 class="h3">${SECTIONS[i]}</h3><p class="prj-sec-x">${h(s.text)}</p></div></li>` : '')).join('')}</ol>` : `<p>${h(p.desc || 'No written requirements were made public.')}</p>`;
  const decs = pubDecisions(p);
  const evs = pubEvidence(p);
  const byFolder = docFolders()
    .map(([k, l, icon, tile]) => [k, l, icon, tile, files.filter(d => d.f === k)])
    .filter(x => x[4].length);
  return (
    crumbsHtml([['Public projects', 'publicprojects'], [h(p.title)]]) +
    head(h(p.title), [h(p.type), h(p.country || ''), h(p.area || ''), h(ctxName(p.ctx))].filter(Boolean).join(' · '), pubPill(p) + zip) +
    (team ? banner('info', 'You are in this project’s team', 'This page shows only what is public. ' + L('Open the project', 'project', { id: p.id }) + ' for everything the team can see.') : '') +
    `<div class="g12 pub-body"><div class="c8 col pub-main">` +
    card('About this project', '', `${p.desc ? `<p class="pub-desc">${h(p.desc)}</p>` : ''}${(p.tags || []).length ? `<div class="rec-tags">${p.tags.map(x => `<span class="rec-tag">${h(x)}</span>`).join('')}</div>` : ''}`) +
    (pubShow(p, 'req') ? card('Project requirements', 'As written and reviewed by the project team.', secs) : '') +
    (pubShow(p, 'dec') ? card('Decisions', decs.length + ' decision' + (decs.length === 1 ? '' : 's') + ' from the project’s Circles and ' + WL() + 's', decs.map(x => lrow('check', h(x.t), [x.at ? fmt(x.at) : '', h(x.by || ''), h(x.sp.name)].filter(Boolean).join(' · '))).join('') || '<p class="cap">No decisions recorded yet.</p>') : '') +
    (pubShow(p, 'ev') ? card('Evidence', evs.length + ' public evidence item' + (evs.length === 1 ? '' : 's'), evs.map(e => lrow('award', h(e.title), h(e.type) + ' · ' + nm(e.owner), pill(e.review))).join('') || '<p class="cap">No evidence has been made public.</p>') : '') +
    card(
      'Documents',
      files.length + ' public file' + (files.length === 1 ? '' : 's') + ' · Private files are not listed or included',
      byFolder.length
        ? byFolder.map(([k, l, icon, tile, fs]) => `<section class="pub-fold"><h3 class="h3 pub-fold-h"><span class="tile ${tile}" aria-hidden="true">${ic(icon, 14)}</span>${h(l)} <span class="cap">${fs.length}</span></h3>${fs.map(d => lrow(docIcon(d.n), `<b class="doc-n">${h(d.n)}</b>`, [h(docPath(p, d).slice(1).join(' / ')), docSize(d.mb), 'Shared by ' + nm(d.by), d.at ? fmt(d.at) : ''].filter(Boolean).join(' · '), B(ic('download', 14) + '<span class="hide-sm">Download</span>', 'pubDl', { id: p.id, k: d.key }, 'btn-s btn-sm', 'aria-label="Download ' + h(d.n) + '"'))).join('')}</section>`).join('')
        : '<p class="cap">No documents have been made public.</p>',
      files.length ? B(ic('download', 14) + 'Download all (ZIP)', 'pubZip', { id: p.id }, 'btn-s btn-sm') : '',
      'rec-list',
    ) +
    `</div><aside class="c4 col pub-side">` +
    card('Project details', '', dl([['Country', h(p.country || '—')], ['Location', h(p.area || '—')], ['Programme', h(ctxName(p.ctx))], ['Owner', nm(p.owner)], ['Steward', p.stewards.map(nm).join(', ') || '—'], ['Now in', p.stage === 'Closed' ? 'Closed' : p.stage === 'Final review' ? 'Final review' : here ? projRoomLabel(here) : '—']])) +
    card('Publication', '', dl([['Status', pubPill(p)], ['Approved', h(pubVote(p) ? pubVote(p).result : '—')], ['Published', fmt(pb.publishedAt) + ' by ' + nm(pb.publishedBy)]])) +
    `</aside></div>`
  );
});
A.pubDl = d => {
  const p = byId('projects', d.id);
  const x = pubDocs(p).find(y => y.key === d.k);
  if (!x) return deny('this file is not public');
  docBlob(p, x).then(([b, n]) => {
    docSave(b, n);
    audit('Public document downloaded', d.k, x.n);
    save();
    toast('Downloaded ' + x.n + (n !== x.n ? ' (prototype placeholder)' : '') + '.');
    render();
  });
};
A.pubZip = d => {
  const p = byId('projects', d.id);
  const files = pubDocs(p);
  if (!files.length) return toast('This project has no public documents.', 'warn');
  docZipSave(p, files, 'Public Projects — only documents explicitly made public', 'Public project documents downloaded as ZIP');
};

// ---- data: the seeded Public project keeps its status, now backed by an approved team vote (runs from migrate())
function pubMigrate() {
  S.projects.forEach(p => {
    if (p.pub) return;
    if (p.docVis !== 'Public' || p.id !== 'pr1' || p.status !== 'Accepted') return;
    const voters = pubVoters(p);
    const votes = Object.fromEntries(voters.map(x => [x, 0]));
    const v = { id: 'pv1', q: 'Publish “' + p.title + '” in Public Projects?', desc: 'Shade scores, the audit method and the residents’ summary draft are marked Public. Sign-in sheets and photos stay Private.', options: [...POLL_OPTIONS], votes, eligibleSnap: voters, rule: pollRule(null), opened: '2026-10-03T09:00', by: p.owner, closes: '2026-10-10T09:00', status: 'Open' };
    const tl = tally(null, v);
    v.status = POLL_STATUS.pass;
    v.closedAt = '2026-10-04T18:20';
    v.result = 'Approved: ' + voteLine(v, tl) + '.';
    p.pub = { votes: [v], state: 'Published', publishedAt: '2026-10-05T09:00', publishedBy: p.owner, show: { req: true, dec: true, ev: true } };
    p.history.push({ at: '2026-10-05T09:00', by: p.owner, t: 'Published to Public Projects after an approved team vote' });
    // the approved, programme-level evidence of the seeded project is explicitly shared
    S.evidence.filter(e => evProjects(e).includes(p) && !evDocLock(e) && e.docVis == null).slice(0, 1).forEach(e => (e.docVis = 'Public'));
  });
}
