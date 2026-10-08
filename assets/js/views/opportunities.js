// ---------- OPPORTUNITY CARDS (E05) ----------
// Audience rules. A card created from a Circle defaults to that Circle's members; the creator can widen it
// to the whole programme or to named people.
const cardVisible = c =>
  c.owner === myId() ||
  (c.status !== 'Draft' &&
    inCtx(c) &&
    (c.vis === 'Programme' ||
      (c.vis === 'Circle members' &&
        (c.from && byId('circles', c.from)
          ? memberOf(byId('circles', c.from))
          : S.circles.some(ci => memberOf(ci) && memberOf(ci, c.owner)))) ||
      (c.vis === 'Named users' && (c.named || []).includes(myId()))));
const audienceText = c =>
  c.vis === 'Circle members'
    ? c.from && byId('circles', c.from)
      ? 'Members of ' + cName(c.from)
      : 'Members of Circles shared with the owner'
    : c.vis === 'Named users'
      ? 'Named people: ' + ((c.named || []).map(nm).join(', ') || 'none chosen')
      : c.vis === 'Programme'
        ? 'Everyone in ' + h((S.contexts.find(x => x.id === c.ctx) || {}).name || 'the programme')
        : 'Only the owner (draft)';
// Steward who reviews Match Briefs for a card: the source Circle's facilitator, else a steward in the context.
const cardSteward = card => {
  const ci = card.from && byId('circles', card.from);
  return (ci && ci.facilitator) || (S.assign.find(x => x.ctx === card.ctx && roleBase(x.role) === 'F' && x.status === 'Active') || {}).pid;
};
function expireCards() {
  S.cards.forEach(c => {
    if (c.status === 'Active' && c.expires < today()) {
      c.status = 'Expired';
      S.matches
        .filter(m => m.card === c.id && !['Introduced', 'Closed', 'Rejected'].includes(m.status))
        .forEach(m => {
          m.status = 'Closed';
          m.outcome = 'Closed — card expired';
        });
    }
  });
}
route('opportunities', 'opportunities', () => {
  expireCards();
  const q = UI.q;
  const r = role();
  const list = S.cards.filter(c => inCtx(c) && (cardVisible(c) || r === 'A' || r === 'F'));
  const t = tabs('opps', [
    ['discover', 'Discover'],
    ['mine', 'My cards', S.cards.filter(c => c.owner === myId()).length],
  ]);
  const f = (
    t.cur === 'mine'
      ? S.cards.filter(c => c.owner === myId())
      : list.filter(c => ['Active', 'Paused'].includes(c.status) || r === 'A' || r === 'F')
  ).filter(
    c =>
      (!q.kind || c.kind === q.kind) &&
      (!q.status || c.status === q.status) &&
      (!q.cat || c.cat === q.cat) &&
      (!q.s || (c.title + ' ' + c.desc).toLowerCase().includes(q.s.toLowerCase())),
  );
  const srt =
    q.sort === 'expiry' ? (a, b) => a.expires.localeCompare(b.expires) : (a, b) => a.title.localeCompare(b.title);
  f.sort(srt);
  return (
    head(
      'Opportunities',
      'Needs, assets, offers and opportunities. The owner decides who can discover each card. No paid ranking.',
      ['P', 'C', 'O'].includes(r) ? B(ic('plus', 16) + 'New card', 'go', { r: 'newcard' }, 'btn-p') : '',
    ) +
    t.html +
    `<div class="row wrap" style="margin-bottom:16px"><input class="input" style="max-width:280px" placeholder="Search" value="${h(q.s || '')}" data-ch="qf" data-k="s" aria-label="Search cards">${[
      'kind:Type:Need,Asset,Offer,Opportunity',
      'status:Status:Draft,Active,Paused,Fulfilled/Closed,Withdrawn,Expired',
      'cat:Category:' + [...new Set(S.cards.map(c => c.cat))].join(','),
      'sort:Sort:title,expiry',
    ]
      .map(x => {
        const [k, l, o] = x.split(':');
        return `<select class="input" style="width:auto" data-ch="qf" data-k="${k}" aria-label="${l}"><option value="">${l}: all</option>${o
          .split(',')
          .map(v => `<option ${q[k] === v ? 'selected' : ''}>${v}</option>`)
          .join('')}</select>`;
      })
      .join('')}</div>` +
    table(
      ['Card', 'Type', 'Category', 'Owner', 'Audience', 'Expires', 'Status', ''],
      f.map(c => [
        `<b>${h(c.title)}</b><div class="cap">${h(c.desc)}</div>`,
        pill(c.kind, 'p-navy'),
        h(c.cat),
        nm(c.owner) + (c.ownerOrg ? ' · ' + h(S.orgs.find(o => o.id === c.ownerOrg).name) : ''),
        audienceText(c) + (c.from ? `<div class="cap">From ${L(cName(c.from), 'circle', { id: c.from })}</div>` : ''),
        fmt(c.expires),
        pill(c.status),
        L('Open', 'card', { id: c.id }),
      ]),
      'No cards match these filters.',
    )
  );
});
A.qf = (d, el) => {
  UI.q[d.k] = el.value;
  render();
};
// Projects a person can link a card to: their own, ones they steward, and ones whose spaces they belong to.
const userProjects = () =>
  S.projects.filter(
    p =>
      inCtx(p) &&
      (p.owner === myId() ||
        (p.stewards || []).includes(myId()) ||
        [p.circle, p.rope, p.room].some(id => {
          const o = id && (byId('circles', id) || byId('ropes', id) || byId('rooms', id));
          return o && memberOf(o);
        })),
  );
route('newcard', 'opportunities', () => {
  if (!can('opportunities', 'CM')) return deniedView('opportunities');
  const f = 'card';
  const e = UI.p.edit && byId('cards', UI.p.edit);
  const from = UI.p.from || (e && e.from) || '';
  const src = from && byId('circles', from);
  if (src && !memberOf(src) && !isFac(src.id)) return deniedView('circles');
  if (e && !UI.form.card) UI.form.card = { ...e };
  if (!e && src && !UI.form.card) UI.form.card = { vis: 'Circle members', project: src.project && byId('projects', src.project)?.owner === myId() ? src.project : '' };
  const vis = fv('card', 'vis', src ? 'Circle members' : 'Programme');
  const myP = userProjects();
  if (!UI.form.card) UI.form.card = {};
  if (!UI.form.card.project && myP.length) UI.form.card.project = (src && src.project && myP.some(p => p.id === src.project) ? src.project : myP[0].id);
  return (
    head(
      e ? 'Edit card' : 'New Opportunity Card',
      'Publish a need, asset, offer or opportunity with an audience and expiry.',
      '',
      [['Opportunities', 'opportunities'], [e ? 'Edit' : 'New']],
    ) +
    `<form data-f="card" class="card col" style="gap:16px;max-width:820px" novalidate>${errSum(f)}<input type="hidden" name="id" value="${e ? e.id : ''}"><input type="hidden" name="from" value="${from || ''}">
 <div class="f2">${fi(f, 'kind', 'Card type', { type: 'select', req: true, ph: 'Select', opts: ['Need', 'Asset', 'Offer', 'Opportunity'] })}${fi(f, 'cat', 'Category', { type: 'select', req: true, ph: 'Select', opts: ['Volunteering', 'Expertise', 'Equipment', 'Skills', 'Livelihood', 'Funding', 'Learning', 'Community action'] })}</div>
 ${fi(f, 'title', 'Title', { req: true, max: 100 })}${fi(f, 'desc', 'Description — what is needed or offered, and availability conditions', { type: 'textarea', rows: 4, req: true })}
 <div class="f2">${fi(f, 'expires', 'Expiry date', { type: 'date', req: true })}${myP.length ? fi(f, 'project', 'Link to a project', { type: 'select', req: true, opts: myP.map(p => [p.id, p.title]) }) : ''}</div>
 ${myP.length ? '' : banner('warn', 'No project to link', 'A card is linked to one of your projects. You can create one once you own, steward or belong to a project.')}
 ${src ? banner('info', 'Created from ' + h(src.name), 'The Circle stays intact and the card links back to it. Match Briefs from this card are reviewed by the Circle’s facilitator, ' + nm(src.facilitator) + '.') : ''}
 <div class="actions">${L('Cancel', 'opportunities', {}, 'btn btn-g')}<div class="row"><button class="btn btn-s" type="submit" name="pub" value="no" ${myP.length ? '' : 'disabled'}>Save draft</button><button class="btn btn-p" type="submit" name="pub" value="yes" ${myP.length ? '' : 'disabled'}>Publish</button></div></div></form>`
  );
});
F.card = d => {
  if (
    !validate('card', d, {
      kind: ['req'],
      cat: ['req'],
      title: ['req'],
      desc: ['req', ['min', 20]],
      expires: ['req', 'date'],
      project: [['req', 'Choose the project this card is for.'], ['fn', { f: v => userProjects().some(p => p.id === v), m: 'Choose one of your projects.' }]],
    })
  )
    return render();
  if (d.from && !byId('circles', d.from)) d.from = '';
  let c = d.id && byId('cards', d.id);
  if (!c) {
    c = { id: uid('oc'), owner: myId(), ownerOrg: me().org || null, ctx: ctxId(), interest: [] };
    S.cards.push(c);
  }
  Object.assign(c, {
    kind: d.kind,
    cat: d.cat,
    title: d.title,
    desc: d.desc,
    // the audience is no longer chosen: a card from a Circle reaches that Circle's members, otherwise the programme
    vis: c.vis || (d.from || c.from ? 'Circle members' : 'Programme'),
    expires: d.expires,
    project: d.project,
    from: d.from || c.from || null,
    named: c.named || [],
    status: d.pub === 'yes' ? 'Active' : 'Draft',
  });
  audit('Opportunity Card ' + (c.status === 'Active' ? 'published' : 'saved'), c.id, c.title + ' · audience: ' + c.vis);
  if (c.status === 'Active') {
    const ci = c.from && byId('circles', c.from);
    const aud =
      c.vis === 'Named users'
        ? c.named
        : c.vis === 'Circle members' && ci
          ? ci.members.filter(m => m.status === 'Active').map(m => m.pid)
          : [];
    aud.filter(p => p !== myId()).forEach(p => notify(p, 'New ' + c.kind.toLowerCase() + ' for you: ' + c.title, 'card', { id: c.id }));
    if (ci) sysMsg(ci, me().name + ' published an Opportunity Card from this Circle: ' + c.title);
  }
  clearF('card');
  mselReset('card', 'named');
  save();
  go('card', { id: c.id });
  toast(c.status === 'Active' ? 'Published.' : 'Saved as draft.');
};
route('card', 'opportunities', () => {
  expireCards();
  const c = byId('cards', UI.p.id);
  if (!c) return empty('megaphone', 'Not found', '');
  if (!cardVisible(c) && !['A', 'F'].includes(role())) return deniedView('opportunities');
  const own = c.owner === myId();
  const r = role();
  const st =
    {
      Draft: ['Active'],
      Active: ['Paused', 'Fulfilled/Closed', 'Withdrawn'],
      Paused: ['Active', 'Withdrawn'],
      'Fulfilled/Closed': [],
      Withdrawn: [],
      Expired: [],
    }[c.status] || [];
  return (
    head(h(c.title), h(c.kind) + ' · ' + h(c.cat), pill(c.status), [['Opportunities', 'opportunities'], [h(c.title)]]) +
    (c.from ? `<div class="row wrap" style="gap:8px;margin:-6px 0 14px"><span class="srole">${ic('users', 13)}From Circle: <b>${cName(c.from)}</b></span><span class="srole">${ic('eye', 13)}${audienceText(c)}</span></div>` : '') +
    `<div class="g12">${card('Details', '', dl([['Description', h(c.desc)], ['Owner', nm(c.owner) + (c.ownerOrg ? ' · ' + h(S.orgs.find(o => o.id === c.ownerOrg).name) : '')], ['Audience', audienceText(c)], ['Expires', fmt(c.expires)], ['Linked project', c.project ? cName(c.project) : '—'], ['Created from', c.from ? (memberOf(byId('circles', c.from) || {}) || ['A', 'O', 'F'].includes(r) || byId('circles', c.from)?.visibility === 'Programme' ? L(cName(c.from), 'circle', { id: c.from }) : cName(c.from)) + ' <span class="cap">(Circle)</span>' : '—'], c.from && ['Steward for introductions', nm(cardSteward(c))], own && ['Expressions of interest', c.interest.map(nm).join(', ') || 'None yet']]), '', 'c8')}
 <aside class="c4 col" style="gap:12px">${own ? card('Manage', '', `<div class="col" style="gap:8px">${B(ic('edit', 14) + 'Edit', 'go', { r: 'newcard', edit: c.id })}${st.map(s => (s === 'Withdrawn' ? CB('Withdraw', 'cardState', { id: c.id, v: s }, 'Withdraw this card? It leaves discovery and any pending Match Briefs close.') : B(s === 'Active' ? 'Publish / resume' : s, 'cardState', { id: c.id, v: s }))).join('')}</div>`) : ''}
 ${!own && c.status === 'Active' && r !== 'F' ? card('Interested?', '', c.interest.includes(myId()) ? banner('ok', 'You expressed interest', 'A steward reviews any introduction. Your contact details are not shared.') : B('Express interest', 'interest', { id: c.id }, 'btn-p btn-block') + `<p class="cap" style="margin-top:8px">This does not introduce you. A steward reviews a Match Brief and both sides consent first.</p>`) : ''}
 ${r === 'F' && c.status === 'Active' && (!c.from || cardSteward(c) === myId()) ? card('Steward', c.from ? 'You review introductions for this Circle’s cards.' : '', B('Nominate a match', 'nominate', { id: c.id }, 'btn-p btn-block')) : ''}
 ${(c.proposals || [])
   .filter(pp => pp.to === myId() || pp.from === myId())
   .map(pp =>
     card(
       'Direct collaboration proposal',
       'From ' + nm(pp.from) + ' to ' + nm(pp.to) + ' · ' + h(pp.rel),
       pill(pp.status) +
         (pp.to === myId() && pp.status === 'Awaiting consent'
           ? `<div class="row" style="margin-top:10px">${B('Decline', 'rbDecide', { c: c.id, id: pp.id, v: 'Declined' })}${B('Accept', 'rbDecide', { c: c.id, id: pp.id, v: 'Accepted' }, 'btn-p btn-sm')}</div>`
           : '') +
         (pp.status === 'Accepted' && canCreateRoom()
           ? `<div style="margin-top:10px">${B('Create or link ' + WL(), 'newRoom', { origin: 'Direct invitation between authorised collaborators', oid: c.id }, 'btn-p btn-sm')}</div>`
           : ''),
     ),
   )
   .join('')}
 ${r === 'P' || r === 'C' ? card('Direct collaboration (Route B)', 'Only with an already-known authorised collaborator.', B('Propose direct collaboration', 'routeB', { id: c.id })) : ''}</aside></div>`
  );
});
A.cardState = d => {
  const c = byId('cards', d.id);
  const from = c.status;
  if (d.v === 'Active' && c.expires < today()) return deny('expiry date is in the past — edit the card first');
  c.status = d.v;
  if (['Withdrawn', 'Fulfilled/Closed'].includes(d.v))
    S.matches
      .filter(m => m.card === c.id && !['Introduced', 'Closed', 'Rejected'].includes(m.status))
      .forEach(m => {
        m.status = 'Closed';
        m.outcome = 'Closed — card ' + d.v.toLowerCase();
      });
  audit('Card state', c.id, from + ' → ' + d.v);
  ok();
};
function makeBrief(a, b, card, origin) {
  const ca = S.consents[a] || {},
    cb = S.consents[b] || {};
  const blockers = [];
  if (ca.matching !== 'Granted') blockers.push('No matching consent from ' + P(a).name);
  if (cb.matching !== 'Granted') blockers.push('No matching consent from ' + P(b).name);
  if (card.expires < today()) blockers.push('Opportunity card expired');
  const steward = cardSteward(card);
  const cl = S.claims.filter(c => c.pid === a && c.vis !== 'Only me' && c.state === 'Current');
  const m = {
    id: uid('mb'),
    a,
    b,
    card: card.id,
    other: null,
    status: 'In steward review',
    steward,
    origin,
    fit: {
      'Need–offer complementarity': `${card.kind} “${card.title}” and ${P(a).name}'s interest.`,
      Capability: cl.map(c => c.value).join(', ') || 'No shared capability claims',
      Availability: 'Card active until ' + card.expires,
      'Context relevance': 'Same programme context',
    },
    gaps: cl.length ? [] : ['No shared capability information'],
    uncertainty: cl.length ? 'Moderate' : 'High — little shared information',
    questions: ['What would a first conversation cover?'],
    next: 'Steward to review and decide.',
    ai: consent(a, 'ai') === 'Granted' && S.settings.aiAvailable,
    consentA: null,
    consentB: null,
    outcome: null,
    blockers,
  };
  S.matches.push(m);
  if (steward) notify(steward, 'Match Brief awaiting review: ' + P(a).name + ' ↔ ' + P(b).name, 'match', { id: m.id });
  return m;
}
A.interest = d => {
  const c = byId('cards', d.id);
  c.interest.push(myId());
  notify(c.owner, `${me().name} expressed interest in “${c.title}”`, 'card', { id: c.id });
  const m = makeBrief(myId(), c.owner, c, 'Expression of interest');
  audit('Interest expressed; Match Brief drafted', m.id, '');
  toast('Interest recorded. A steward will review a Match Brief.');
  ok();
};
A.nominate = d => {
  const c = byId('cards', d.id);
  modal(
    'Nominate a match',
    `<form data-f="nom" class="col" style="gap:14px"><input type="hidden" name="id" value="${c.id}">${fi('nom', 'pid', 'Person to match with the card owner', { type: 'select', req: true, opts: S.assign.filter(a => a.ctx === c.ctx && a.status === 'Active' && ['P', 'C', 'M'].includes(roleBase(a.role)) && a.pid !== c.owner).map(a => [a.pid, P(a.pid).name]) })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Draft Match Brief</button></div></form>`,
  );
};
F.nom = d => {
  const c = byId('cards', d.id);
  const m = makeBrief(d.pid, c.owner, c, 'Steward nomination');
  audit('Steward nominated match', m.id, '');
  UI.modal = null;
  save();
  go('match', { id: m.id });
};
A.routeB = d => {
  const c = byId('cards', d.id);
  clearF('rb');
  modal(
    'Direct authorised collaboration (Route B)',
    () =>
      `<form data-f="rb" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${c.id}">${fi('rb', 'pid', 'Known collaborator', { type: 'select', req: true, ph: 'Select', opts: S.assign.filter(a => a.ctx === c.ctx && a.status === 'Active' && a.pid !== myId()).map(a => [a.pid, P(a.pid).name]) })}${fi('rb', 'rel', 'Existing relationship', { type: 'select', req: true, opts: ['Same Circle', 'Same Rope Team', 'Same ' + WL(), 'Same organisation'], ph: 'Select' })}${banner('info', 'Checks', 'Valid membership/context + role/mandate + permission to invite/link + consent of the other party + no restriction conflict.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Run checks</button></div></form>`,
  );
};
F.rb = d => {
  if (!validate('rb', d, { pid: ['req'], rel: ['req'] })) return render();
  const shared =
    S.circles.some(c => memberOf(c) && memberOf(c, d.pid)) ||
    S.rooms.some(c => memberOf(c) && memberOf(c, d.pid)) ||
    S.ropes.some(c => memberOf(c) && memberOf(c, d.pid)) ||
    (me().org && me().org === P(d.pid).org);
  if (!shared) {
    UI.modal = null;
    return deny('no existing valid relationship with this person — use the steward-reviewed match route');
  }
  const cd = byId('cards', d.id);
  (cd.proposals = cd.proposals || []).push({
    id: uid('pp'),
    from: myId(),
    to: d.pid,
    status: 'Awaiting consent',
    rel: d.rel,
  });
  notify(
    d.pid,
    `${me().name} proposes direct collaboration on “${cd.title}”. Accept or decline from the card.`,
    'card',
    { id: d.id },
  );
  audit('Route B proposal', d.id, d.pid);
  UI.modal = null;
  clearF('rb');
  toast(
    'Checks passed. The other party has been asked to consent. An authorised lead then creates or links a ' +
      WL() +
      '.',
  );
  ok();
};
// ---------- MATCH BRIEFS (E06) ----------
route('matches', 'matching', () => {
  const r = role();
  const list = S.matches.filter(m =>
    r === 'F'
      ? m.steward === myId()
      : r === 'A'
        ? true
        : ((m.a === myId() || m.b === myId()) &&
            !['Draft', 'In steward review', 'Clarification requested', 'Rejected'].includes(m.status)) ||
          (m.a === myId() && m.origin === 'Expression of interest'),
  );
  return (
    head(
      'Match Briefs',
      'Potential match → Match Brief → steward approval → mutual consent → introduction. No hidden ranking.',
    ) +
    table(
      ['Parties', 'Origin', 'Status', 'Blockers', ''],
      list.map(m => [
        nm(m.a) + ' ↔ ' + nm(m.b),
        h(m.origin),
        pill(m.status),
        m.blockers.length ? pill(m.blockers.length + ' do-not-introduce', 'p-red') : '—',
        L('Open', 'match', { id: m.id }),
      ]),
      'No Match Briefs.',
    )
  );
});
route('match', 'matching', () => {
  const m = byId('matches', UI.p.id);
  if (!m) return empty('link', 'Not found', '');
  const r = role();
  const party = m.a === myId() || m.b === myId();
  const stw = r === 'F' && m.steward === myId();
  if (!party && !stw && r !== 'A') return deniedView('matching');
  if (party && !stw && ['In steward review', 'Clarification requested', 'Draft'].includes(m.status))
    return (
      head('Match Brief', '') +
      banner(
        'info',
        'Under steward review',
        'You will be asked for consent once a steward approves it. Nothing is shared before then.',
      )
    );
  const myC = m.a === myId() ? 'consentA' : 'consentB';
  return (
    head(nm(m.a) + ' ↔ ' + nm(m.b), 'Match Brief · ' + h(m.origin), pill(m.status), [
      ['Match Briefs', 'matches'],
      ['Brief'],
    ]) +
    (m.blockers.length
      ? banner(
          'err',
          'Do not introduce yet',
          m.blockers.map(h).join('; ') + '. The brief cannot be approved until this clears.',
        )
      : '') +
    (m.project ? banner('info', 'Collaborator invitation for a defined requirement', `Project: <b>${cName(m.project)}</b> · Requirement: <b>${h(m.requirement)}</b> · Expected contribution: ${h(m.contribution)}. The collaborator can accept or decline without obligation.`) : '') +
    `<div class="g12">
 ${card(
   'Why suggested — fit dimensions',
   'Actual rationale and source data, not a score.',
   table(
     ['Dimension', 'Rationale'],
     Object.entries(m.fit).map(([k, v]) => [`<b>${h(k)}</b>`, h(v)]),
   ) + (m.ai ? `<div style="margin-top:10px">${aiTag('Rationale drafted by AI — steward must review')}</div>` : ''),
   '',
   'c8',
 )}
 <aside class="c4 col" style="gap:12px">${card('Readiness', '', dl([['Gaps', m.gaps.map(h).join('<br>') || 'None'], ['Uncertainty', h(m.uncertainty)], ['Suggested questions', m.questions.map(h).join('<br>') || '—'], ['Next human action', h(m.next)], ['Consent', `${nm(m.a)}: ${pill(m.consentA || 'Pending')}<br>${nm(m.b)}: ${pill(m.consentB || 'Pending')}`], m.outcome && ['Outcome', h(m.outcome)]]))}
 ${stw && ['In steward review', 'Clarification requested'].includes(m.status) ? card('Steward decision', '', `<div class="col" style="gap:8px">${B(ic('edit', 14) + 'Edit brief', 'mbEdit', { id: m.id })}${B('Request clarification', 'mbState', { id: m.id, v: 'Clarification requested' })}${B('Reject', 'mbState', { id: m.id, v: 'Rejected' })}${m.blockers.length ? `<button class="btn btn-p btn-sm" disabled>Approve</button>` : B('Approve and request consent', 'mbState', { id: m.id, v: 'Awaiting consent' }, 'btn-p btn-sm')}</div>`) : ''}
 ${party && m.status === 'Awaiting consent' && !m[myC] ? card('Your consent', 'Contact details are released only after both parties consent.', `<div class="row">${B('Decline', 'mbConsent', { id: m.id, v: 'Declined' })}${B('Consent to introduction', 'mbConsent', { id: m.id, v: 'Consented' }, 'btn-p btn-sm')}</div>`) : ''}
 ${party && m.status === 'Introduced' && m.project ? card('Collaborator invitation', '', `<p class="muted">${m.b === myId() ? 'Your invitation to the project ' + WL() + ' explains the requirement and expected contribution. Accept or decline it without obligation.' : nm(m.b) + ' has been invited with a defined responsibility: ' + h(m.requirement) + '.'}</p>${byId('projects', m.project)?.room ? L('Open ' + WL(), 'room', { id: byId('projects', m.project).room }, 'btn btn-s btn-sm') : '<p class="cap">The invitation is sent when the ' + WL() + ' is created.</p>'}`) : ''}
 ${party && m.status === 'Introduced' && !m.next2 && !m.project ? card('What next?', '', `<div class="col" style="gap:8px">${['Close', 'Continue conversation', 'Link existing ' + WL(), 'Create new ' + WL()].map(o => B(o, 'mbNext', { id: m.id, v: o })).join('')}</div>`) : ''}
 ${m.status === 'Introduced' ? card('Introduction', '', `<p>${nm(m.a)} · ${h(P(m.a).email)}</p><p>${nm(m.b)} · ${h(P(m.b).email)}</p><p class="cap" style="margin-top:6px">Released after mutual consent.</p>`) : ''}</aside></div>`
  );
});
A.mbState = d => {
  const m = byId('matches', d.id);
  if (d.v === 'Awaiting consent' && m.blockers.length) return deny('a do-not-introduce condition is present');
  m.status = d.v;
  if (d.v === 'Awaiting consent') {
    [m.a, m.b].forEach(p => notify(p, 'Match Brief approved — your consent is requested', 'match', { id: m.id }));
    const j = S.ai.find(x => x.purpose.includes(m.id));
    if (j) {
      j.status = 'Released';
      j.reviewed = true;
    }
  }
  if (d.v === 'Rejected') {
    m.outcome = 'Closed — rejected by steward';
  }
  audit('Match Brief ' + d.v, m.id, '');
  ok();
};
A.mbEdit = d => {
  const m = byId('matches', d.id);
  UI.form.mbe = { next: m.next, questions: m.questions.join('\n'), gaps: m.gaps.join('\n') };
  modal(
    'Edit Match Brief',
    () =>
      `<form data-f="mbe" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${m.id}">${fi('mbe', 'gaps', 'Readiness gaps (one per line)', { type: 'textarea', rows: 3 })}${fi('mbe', 'questions', 'Suggested questions (one per line)', { type: 'textarea', rows: 3 })}${fi('mbe', 'next', 'Recommended next human action', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.mbe = d => {
  if (!validate('mbe', d, { next: ['req'] })) return render();
  const m = byId('matches', d.id);
  m.next = d.next;
  m.questions = d.questions.split('\n').filter(Boolean);
  m.gaps = d.gaps.split('\n').filter(Boolean);
  audit('Match Brief edited', m.id, '');
  UI.modal = null;
  clearF('mbe');
  ok();
};
A.mbConsent = d => {
  const m = byId('matches', d.id);
  if (m.a === myId()) m.consentA = d.v;
  else m.consentB = d.v;
  if (d.v === 'Declined') {
    m.status = 'Closed';
    m.outcome = 'Declined — no introduction, no contact details released';
    [m.a, m.b, m.steward]
      .filter(p => p !== myId())
      .forEach(p => notify(p, 'Match Brief closed: one party declined', 'match', { id: m.id }));
  } else if (m.consentA === 'Consented' && m.consentB === 'Consented') {
    m.status = 'Introduced';
    m.outcome = 'Accepted';
    if (m.project) collabInvite(m);
    [m.a, m.b, m.steward].forEach(p =>
      notify(p, 'Introduction made: ' + P(m.a).name + ' and ' + P(m.b).name, 'match', { id: m.id }),
    );
  }
  audit('Match consent ' + d.v, m.id, '');
  ok();
};
A.mbNext = d => {
  const m = byId('matches', d.id);
  m.next2 = d.v;
  m.outcome = { Close: 'Closed', 'Continue conversation': 'Follow-up' }[d.v] || 'Opportunity progressed';
  audit('Post-introduction choice', m.id, d.v);
  if (d.v.startsWith('Create')) {
    if (!canCreateRoom()) {
      toast('Your request was sent to an authorised lead to create the ' + WL() + '.');
      S.assign
        .filter(a => a.ctx === ctxId() && roleBase(a.role) === 'F')
        .forEach(a => notify(a.pid, 'Create a ' + WL() + ' for an introduced match', 'match', { id: m.id }));
      return ok();
    }
    return A.newRoom({ origin: 'Approved PHOENIX match', oid: m.card });
  }
  if (d.v.startsWith('Link')) {
    m.next2 = null;
    if (!myRooms().length) {
      toast('You are not a member of any ' + WL() + ' to link.', 'warn');
      return ok();
    }
    return A.linkRoom({ id: m.id });
  }
  ok();
};
// ---------- COLLABORATOR MATCH FOR A PROJECT REQUIREMENT (Section 6.4, F06 Route A, D-05) ----------
// The required skill is part of the project requirements. Rules compare it with collaborator records held in PHOENIX
// (organization profile, published offers, shared claims) and show the actual rationale — never a score.
const words = s =>
  String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'support', 'help'].includes(w));
function collabCandidates(p, req) {
  const need = new Set(words(req));
  return S.assign
    .filter(a => a.ctx === p.ctx && roleBase(a.role) === 'C' && a.status === 'Active' && a.pid !== p.owner)
    .map(a => {
      const per = P(a.pid);
      const org = S.orgs.find(o => o.id === per.org) || {};
      const offers = S.cards.filter(c => c.owner === a.pid && c.kind === 'Offer' && c.status === 'Active');
      const claims = S.claims.filter(c => c.pid === a.pid && c.state === 'Current' && c.vis !== 'Only me');
      const src = [
        ['Organization profile', org.profile || ''],
        ...offers.map(c => ['Offer card “' + c.title + '”', c.title + ' ' + c.desc]),
        ...claims.map(c => ['Profile claim (' + c.prov + ')', c.value]),
      ];
      const hits = src.filter(([, t]) => words(t).some(w => need.has(w)));
      const blockers = [];
      if (consent(a.pid, 'matching') !== 'Granted') blockers.push('No matching consent');
      if (consent(p.owner, 'matching') !== 'Granted') blockers.push('Project owner has not granted matching consent');
      if (!(a.mandate && a.mandate.valid)) blockers.push('No valid mandate to commit organization resources');
      return { a, per, org, hits, blockers };
    })
    .sort((x, y) => y.hits.length - x.hits.length);
}
A.collabFind = d => {
  if (!d.keep) clearF('colf');
  const p = byId('projects', d.project);
  const req = fv('colf', 'req', '');
  const cands = req.trim() ? collabCandidates(p, req) : [];
  modal(
    'Find a collaborator for a requirement',
    () =>
      `<form data-f="colf" class="col" style="gap:14px" novalidate><input type="hidden" name="project" value="${p.id}">${dl([['Project', h(p.title)], ['Stage', pill(stageLabel(p.stage || 'Circle'))]])}${fi('colf', 'req', 'Required skill or expertise', { req: true, ph: 'e.g. GIS mapping, manufacturing experience', help: 'Taken from the project requirements. Press “Find matches” to apply the matching rules.' })}${fi('colf', 'contrib', 'Expected contribution', { type: 'textarea', rows: 2, req: true, ph: 'e.g. Produce the canopy GIS layer for 25 streets over 4 weeks' })}<div class="row">${B(ic('search', 14) + 'Find matches', 'colfFind', { project: p.id })}</div>${
        req.trim()
          ? cands.length
            ? `<fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:8px">Potential collaborators — rule-identified, not ranked by a score</legend><div class="col" style="gap:8px">${cands.map(c => `<label class="choice ${fv('colf', 'pid') === c.a.pid ? 'sel' : ''}"><input type="radio" name="pid" value="${c.a.pid}" ${fv('colf', 'pid') === c.a.pid ? 'checked' : ''} style="position:absolute;opacity:0" data-ch="colfPick"><span class="rad"></span><span class="col" style="gap:4px;min-width:0"><b>${nm(c.a.pid)} · ${h(c.org.name || 'No organization')}</b><span class="cap">${c.hits.length ? 'Why suggested: ' + c.hits.map(([k]) => h(k)).join(', ') : 'No direct match in records held in PHOENIX — include only if you know this partner can help.'}</span>${c.blockers.length ? `<span class="cap" style="color:#8F1A12">Do not introduce yet: ${c.blockers.map(h).join('; ')}</span>` : ''}</span></label>`).join('')}</div></fieldset>`
            : banner('info', 'No collaborators in this programme yet', 'Ask the Programme Administrator or Organization Representative to invite a partner (D-05).')
          : ''
      }<div class="actions"><span></span><button class="btn btn-p" type="submit" ${cands.length ? '' : 'disabled'}>Draft Match Brief</button></div></form>`,
  );
};
A.colfFind = d => {
  const f = document.querySelector('[data-f="colf"]');
  const x = {};
  new FormData(f).forEach((v, k) => (x[k] = v));
  UI.form.colf = x;
  if (!(x.req || '').trim()) {
    UI.err.colf = { req: 'Enter the required skill first.' };
  } else UI.err.colf = {};
  A.collabFind({ project: d.project, keep: 1 });
};
A.colfPick = (d, el) => {
  const f = el.closest('form');
  const x = {};
  new FormData(f).forEach((v, k) => (x[k] = v));
  UI.form.colf = x;
  render();
};
F.colf = d => {
  if (!validate('colf', d, { req: ['req'], contrib: ['req'], pid: [['req', 'Choose a collaborator.']] })) return A.collabFind({ project: d.project, keep: 1 });
  const p = byId('projects', d.project);
  const c = collabCandidates(p, d.req).find(x => x.a.pid === d.pid);
  const m = {
    id: uid('mb'),
    a: p.owner,
    b: d.pid,
    card: null,
    other: null,
    project: p.id,
    requirement: d.req,
    contribution: d.contrib,
    status: 'In steward review',
    steward: myId(),
    origin: 'Collaborator match for a project requirement',
    fit: {
      'Skills / capability': c.hits.length ? c.hits.map(([k, t]) => k + ': ' + t.slice(0, 90)).join(' · ') : 'No direct match in PHOENIX records.',
      'Need–offer complementarity': `Project requires “${d.req}”.`,
      'Context relevance': 'Both in ' + (S.contexts.find(x => x.id === p.ctx) || {}).name,
      'Role / affiliation': c.org.name ? c.org.name + ' (' + (c.org.type || 'Organization') + ')' : '—',
    },
    gaps: [...(c.hits.length ? [] : ['Capability not evidenced in PHOENIX records']), 'Availability for this requirement not yet confirmed'],
    uncertainty: c.hits.length ? 'Moderate — capability is self-declared or organization-stated.' : 'High — no supporting record.',
    questions: ['Can the partner commit the expected contribution in the project timeline?', 'Who owns outputs produced by the partner?'],
    next: 'Steward reviews; both parties consent; the collaborator then accepts the invitation and the defined responsibility.',
    ai: false,
    consentA: null,
    consentB: null,
    outcome: null,
    blockers: c.blockers.filter(b => b !== 'No valid mandate to commit organization resources'),
  };
  if (c.blockers.includes('No valid mandate to commit organization resources')) m.gaps.push('Partner has no valid mandate to commit organization resources — extra approval needed at join time');
  S.matches.push(m);
  p.history.push({ at: today(), t: 'Collaborator match drafted for requirement: ' + d.req });
  audit('Collaborator match drafted', m.id, d.req);
  UI.modal = null;
  clearF('colf');
  save();
  go('match', { id: m.id });
  toast('Match Brief drafted. Review it, then request both parties’ consent.');
};
// When both parties consent to a collaborator brief, the collaborator receives an invitation with the defined responsibility.
function collabInvite(m) {
  const p = byId('projects', m.project);
  const x = byId('rooms', p.room);
  const roleLbl = 'Collaborator — ' + m.requirement;
  if (x) {
    if (!x.members.some(mm => mm.pid === m.b && mm.status !== 'Removed')) x.members.push({ pid: m.b, role: roleLbl, status: 'Invited', req: m.requirement, contrib: m.contribution, match: m.id });
    notify(m.b, 'Collaborator invitation: ' + p.title + ' — ' + m.requirement, 'room', { id: x.id });
  } else {
    (p.pendingCollab = p.pendingCollab || []).push({ pid: m.b, req: m.requirement, contrib: m.contribution, match: m.id });
    notify(m.b, 'Collaborator match accepted for “' + p.title + '”. You will be invited when its ' + WL() + ' is created.', 'match', { id: m.id });
  }
  p.history.push({ at: today(), t: 'Collaborator introduced: ' + P(m.b).name + ' (' + m.requirement + ')' });
}
