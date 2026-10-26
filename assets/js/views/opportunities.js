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
        .filter(m => m.card === c.id && m.status !== 'Introduced' && !MB_ENDED.includes(m.status))
        .forEach(m => {
          m.status = 'Expired';
          m.outcome = 'Proposal ended — card expired before mutual consent';
        });
    }
  });
  // a consent request nobody completed in time ends the proposal (no introduction, nothing released)
  S.matches
    .filter(m => m.status === 'Awaiting consent' && m.consentBy && m.consentBy < today())
    .forEach(m => {
      m.status = 'Expired';
      m.outcome = 'Proposal ended — consent not given by ' + fmt(m.consentBy);
      [m.a, m.b, m.steward].filter(Boolean).forEach(p => notify(p, 'Match proposal expired before both people consented', 'match', { id: m.id }));
      audit('Match proposal expired', m.id, 'consent window ended ' + m.consentBy);
    });
}
// Card type as a typed badge: needs and offers read differently at a glance (icon + words, never colour alone).
const OPP_KIND = { Need: ['target', 'need'], Offer: ['send', 'offer'], Asset: ['layers', 'asset'], Opportunity: ['megaphone', 'opp'] };
const oppKind = k => `<span class="opp-k opp-k-${(OPP_KIND[k] || [])[1] || 'opp'}">${ic((OPP_KIND[k] || [])[0] || 'card', 13)}${h(k)}</span>`;
route('opportunities', 'opportunities', () => {
  expireCards();
  const r = role();
  const list = S.cards.filter(c => inCtx(c) && (cardVisible(c) || r === 'A' || r === 'F'));
  const t = tabs('opps', [
    ['discover', 'Discover'],
    ['mine', 'My cards', S.cards.filter(c => c.owner === myId()).length],
  ]);
  const f =
    t.cur === 'mine'
      ? S.cards.filter(c => c.owner === myId())
      : list.filter(c => ['Active', 'Paused'].includes(c.status) || r === 'A' || r === 'F');
  return (
    head(
      'Opportunities',
      'Needs, assets, offers and opportunities. The owner decides who can discover each card. No paid ranking.',
      ['P', 'C', 'A'].includes(r) ? B(ic('plus', 16) + 'New card', 'go', { r: 'newcard' }, 'btn-p') : '',
    ) +
    t.html +
    card(t.cur === 'mine' ? 'Your cards' : 'Cards you can discover', '', dataView('opps:' + t.cur, {
      label: 'cards',
      items: f,
      search: c => c.title + ' ' + c.desc + ' ' + c.cat + ' ' + (c.country || '') + ' ' + P(c.owner).name,
      searchLabel: 'Search cards',
      quick: { label: 'Type', options: ['Need', 'Offer', 'Asset', 'Opportunity'].map(k => [k, k]), test: (c, v) => c.kind === v },
      filters: [
        ...(dvOpts(S.cards, c => c.country).length > 1 ? [{ key: 'country', label: 'Country', options: dvOpts(S.cards, c => c.country), test: (c, v) => c.country === v }] : []),
        { key: 'cat', label: 'Category', options: dvOpts(S.cards, c => c.cat), test: (c, v) => c.cat === v },
        { key: 'status', label: 'Status', options: ['Draft', 'Active', 'Paused', 'Fulfilled/Closed', 'Withdrawn', 'Expired'].map(s => [s, s]), test: (c, v) => c.status === v },
      ],
      sorts: [
        ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
        ['expiry', 'Expiry date', (a, b) => a.expires.localeCompare(b.expires)],
      ],
      defaultSort: 'title',
      row: c => ({
        lead: `<span class="tile opp-tile-${(OPP_KIND[c.kind] || [])[1] || 'opp'}" aria-hidden="true">${ic((OPP_KIND[c.kind] || [])[0] || 'megaphone', 18)}</span>`,
        title: h(c.title),
        sub: `<span class="opp-desc">${h(c.desc)}</span>`,
        meta: [h(c.cat), c.country ? h(c.country) : '', nm(c.owner) + (c.ownerOrg ? ' · ' + h(S.orgs.find(o => o.id === c.ownerOrg).name) : ''), audienceText(c), c.from ? `From ${L(cName(c.from), 'circle', { id: c.from })}` : '', 'Expires ' + fmt(c.expires)],
        badges: oppKind(c.kind) + pill(c.status),
        primary: L('Open', 'card', { id: c.id }, 'btn btn-s btn-sm'),
      }),
      empty: t.cur === 'mine' ? ['megaphone', 'No cards yet', 'Publish a need, asset, offer or opportunity with an audience and expiry.', ['P', 'C', 'A'].includes(r) ? B(ic('plus', 16) + 'New card', 'go', { r: 'newcard' }, 'btn-p btn-sm') : ''] : ['megaphone', 'No cards match these filters.', ''],
    }))
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
  // only the card owner edits it
  if (e && e.owner !== myId()) return deniedView('opportunities');
  if (e && !UI.form.card) UI.form.card = { ...e };
  if (!e && src && !UI.form.card) UI.form.card = { vis: 'Circle members', project: src.project && byId('projects', src.project)?.owner === myId() ? src.project : '' };
  const vis = fv('card', 'vis', src ? 'Circle members' : 'Programme');
  const myP = userProjects();
  if (!UI.form.card) UI.form.card = {};
  if (!UI.form.card.project && myP.length) UI.form.card.project = (src && src.project && myP.some(p => p.id === src.project) ? src.project : myP[0].id);
  // a new card starts with its project’s country; it stays required and can be changed
  if (!e && UI.form.card.country == null) UI.form.card.country = (byId('projects', UI.form.card.project) || {}).country || '';
  return (
    head(
      e ? 'Edit card' : 'New Opportunity Card',
      'Publish a need, asset, offer or opportunity with an audience and expiry.',
      '',
      [['Opportunities', 'opportunities'], [e ? 'Edit' : 'New']],
    ) +
    `<form data-f="card" class="card col opp-form" novalidate>${errSum(f)}<input type="hidden" name="id" value="${e ? e.id : ''}"><input type="hidden" name="from" value="${from || ''}">
 <div class="np-sh"><span class="np-n" aria-hidden="true">1</span><h2 class="h3">What it is</h2></div>
 <div class="f2">${fi(f, 'kind', 'Card type', { type: 'select', req: true, ph: 'Select', opts: ['Need', 'Asset', 'Offer', 'Opportunity'] })}${fi(f, 'cat', 'Category', { type: 'select', req: true, ph: 'Select', opts: ['Volunteering', 'Expertise', 'Equipment', 'Skills', 'Livelihood', 'Funding', 'Learning', 'Community action'] })}</div>
 ${fi(f, 'title', 'Title', { req: true, max: 100 })}${fi(f, 'desc', 'Description — what is needed or offered, and availability conditions', { type: 'textarea', rows: 4, req: true })}
 <div class="np-sh"><span class="np-n" aria-hidden="true">2</span><h2 class="h3">Timing, place and project</h2></div>
 <div class="f2">${fi(f, 'expires', 'Expiry date', { type: 'date', req: true })}${countryField(f, { help: 'Where it is needed or offered. Filled in from the linked project; change it if it differs.' })}</div>
 ${myP.length ? fi(f, 'project', 'Link to a project', { type: 'select', req: true, opts: myP.map(p => [p.id, p.title]) }) : ''}
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
      country: countryRules(),
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
    country: d.country,
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
    crumbsHtml([['Opportunities', 'opportunities'], [h(c.title)]]) +
    `<div class="shead-main opp-head"><span class="tile opp-tile-${(OPP_KIND[c.kind] || [])[1] || 'opp'}" aria-hidden="true">${ic((OPP_KIND[c.kind] || [])[0] || 'megaphone', 20)}</span><div class="shead-t"><div class="shead-kind">${h(c.kind)} · ${h(c.cat)}</div><div class="row wrap opp-ttl"><h1 class="h1">${h(c.title)}</h1>${pill(c.status)}</div><div class="shead-meta"><span>${nm(c.owner)}</span><span>Expires ${fmt(c.expires)}</span></div>${c.from ? `<div class="row wrap opp-src"><span class="srole opp-srole">${ic('users', 13)}From Circle: <b>${cName(c.from)}</b></span><span class="srole opp-srole">${ic('eye', 13)}${audienceText(c)}</span></div>` : ''}</div></div>` +
    `<div class="g12">${card('Details', '', dl([['Description', h(c.desc)], ['Owner', nm(c.owner) + (c.ownerOrg ? ' · ' + h(S.orgs.find(o => o.id === c.ownerOrg).name) : '')], ['Audience', audienceText(c)], ['Country', h(c.country || '—')], ['Expires', fmt(c.expires)], ['Linked project', c.project ? cName(c.project) : '—'], ['Created from', c.from ? (memberOf(byId('circles', c.from) || {}) || ['A', 'O', 'F'].includes(r) || byId('circles', c.from)?.visibility === 'Programme' ? L(cName(c.from), 'circle', { id: c.from }) : cName(c.from)) + ' <span class="cap">(Circle)</span>' : '—'], c.from && ['Steward for introductions', nm(cardSteward(c))], own && ['Expressions of interest', c.interest.map(nm).join(', ') || 'None yet']]), '', 'c8')}
 <aside class="c4 col opp-side">${own ? card('Manage', '', `<div class="col opp-stack">${B(ic('edit', 14) + 'Edit', 'go', { r: 'newcard', edit: c.id })}${st.map(s => (s === 'Withdrawn' ? CB('Withdraw', 'cardState', { id: c.id, v: s }, 'Withdraw this card? It leaves discovery and any pending Match Briefs close.') : B(s === 'Active' ? 'Publish / resume' : s, 'cardState', { id: c.id, v: s }))).join('')}</div>`) : ''}
 ${!own && c.status === 'Active' && r !== 'F' ? card('Interested?', '', c.interest.includes(myId()) ? banner('ok', 'You expressed interest', 'A steward reviews any introduction. Your contact details are not shared.') : B('Express interest', 'interest', { id: c.id }, 'btn-p btn-block') + `<p class="cap opp-note">This does not introduce you. A steward reviews a Match Brief and both sides consent first.</p>`) : ''}
 ${r === 'F' && c.status === 'Active' && (!c.from || cardSteward(c) === myId()) ? card('Steward', c.from ? 'You review introductions for this Circle’s cards.' : '', B('Nominate a match', 'nominate', { id: c.id }, 'btn-p btn-block')) : ''}
 ${(c.proposals || [])
   .filter(pp => pp.to === myId() || pp.from === myId())
   .map(pp =>
     card(
       'Direct collaboration (Route B)',
       'No Match Brief. Recorded for audit: who, context, authority, consent and the resulting workspace.',
       rbRecord(c, pp) +
         (pp.to === myId() && pp.status === 'Awaiting consent'
           ? `<div class="row opp-dr">${B('Decline', 'rbDecide', { c: c.id, id: pp.id, v: 'Declined' })}${B('Accept', 'rbDecide', { c: c.id, id: pp.id, v: 'Accepted' }, 'btn-p btn-sm')}</div>`
           : ''),
     ) + (pp.status === 'Accepted' ? introCard(viaOf('pp:' + c.id + ':' + pp.id)) : ''),
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
      .filter(m => m.card === c.id && m.status !== 'Introduced' && !MB_ENDED.includes(m.status))
      .forEach(m => {
        m.status = 'Withdrawn';
        m.outcome = 'Proposal ended — card ' + d.v.toLowerCase() + ' before mutual consent';
      });
  audit('Card state', c.id, from + ' → ' + d.v);
  ok();
};
// ---- Match Brief layout (Build-Freeze review §5.1): Why suggested → source fields → missing information →
// readiness gaps → uncertainty → permission/authority status → restrictions → recommended next human action →
// "Do not introduce yet" reason. No single match score; never personality, belief, health, worth or trust.
function mbGates(m) {
  const c = m.card && byId('cards', m.card);
  const active = pid => S.assign.some(x => x.pid === pid && x.ctx === (m.ctx || ctxId()) && x.status === 'Active');
  const mand = pid => {
    const x = S.assign.find(y => y.pid === pid && roleBase(y.role) === 'C' && y.ctx === (m.ctx || ctxId()));
    return !x || (x.mandate && x.mandate.valid && x.mandate.until >= today());
  };
  return [
    ['Matching consent — ' + P(m.a).name, consent(m.a, 'matching') === 'Granted'],
    ['Matching consent — ' + P(m.b).name, consent(m.b, 'matching') === 'Granted'],
    ['Both have an active role in this context', active(m.a) && active(m.b)],
    ['Valid role or mandate', mand(m.a) && mand(m.b)],
    ['Opportunity open and not expired', !c || (c.status === 'Active' && c.expires >= today())],
    ['No unresolved safety or governance flag', !(m.blockers || []).some(b => /safety|governance|flag/i.test(b))],
  ];
}
function mbSources(m) {
  const c = m.card && byId('cards', m.card);
  const shared = pid => S.claims.filter(x => x.pid === pid && x.vis !== 'Only me' && x.state === 'Current').map(x => x.field + ': ' + x.value);
  return [
    c && ['Opportunity Card', `${h(c.kind)} “${h(c.title)}” · ${h(c.cat || '')} · open until ${fmt(c.expires)}`],
    [P(m.a).name + ' — fields allowed for matching', shared(m.a).map(h).join('; ') || '<span class="cap">None shared</span>'],
    [P(m.b).name + ' — fields allowed for matching', shared(m.b).map(h).join('; ') || '<span class="cap">None shared</span>'],
    ['Context', h(ctxName(m.ctx || ctxId()))],
  ].filter(Boolean);
}
function mbBody(m) {
  const gates = mbGates(m);
  const sec = (n, t, body) => `<section class="mb-sec"><h2 class="h3"><span class="mb-n">${n}</span>${t}</h2>${body}</section>`;
  return card(
    'Match Brief',
    'Explains why a connection is suggested, what supports it, what is missing and what a person decides next. Not a score.',
    `<div class="col mb-secs">
    ${sec(1, 'Why suggested', table(['Dimension', 'Rationale'], Object.entries(m.fit).map(([k, v]) => [`<b>${h(k)}</b>`, h(v)])) + (m.ai ? `<div class="mb-ai">${aiTag('AI draft / advisory — the steward reviews it')}</div>` : ''))}
    ${sec(2, 'Source fields', dl(mbSources(m)))}
    ${sec(3, 'What is missing', (m.gaps || []).length ? `<ul class="mb-ul">${m.gaps.map(g => `<li>${h(g)}</li>`).join('')}</ul>` : '<p class="cap">Nothing recorded as missing.</p>')}
    ${sec(4, 'Readiness gaps', `<ul class="gate">${gates.map(([t, ok_]) => `<li class="${ok_ ? 'ok' : ''}"><span class="gate-ic">${ic(ok_ ? 'check' : 'alert', 14)}</span><span>${h(t)}</span></li>`).join('')}</ul>`)}
    ${sec(5, 'Uncertainty', `<p>${h(m.uncertainty)}</p>${(m.questions || []).length ? `<p class="cap">Suggested questions: ${m.questions.map(h).join(' · ')}</p>` : ''}`)}
    ${sec(6, 'Permission and authority', dl([['Reviewed by', m.steward ? nm(m.steward) + ' (Steward)' : 'No steward assigned'], ['Status', pill(m.status)], ['Who decides', 'The steward approves the brief; each party consents for themselves. AI cannot approve.']]))}
    ${sec(7, 'Restrictions', `<p class="cap">No contact details before both parties consent. Only fields each person allowed for matching are used. Never used: personality or psychological state, religion or political belief, health, deservingness, moral worth, trustworthiness, or any universal synergy or coherence score.</p>`)}
    ${sec(8, 'Recommended next human action', `<p><b>${h(m.next)}</b></p><p class="cap">Recommended by the steward review; nothing happens until a person acts.</p>`)}
    ${sec(9, 'Do not introduce yet', m.blockers.length ? banner('err', 'Not ready to introduce', m.blockers.map(h).join('; ') + '.') : '<p class="cap">No reason to hold the introduction.</p>')}
    </div>`,
  );
}
function makeBrief(a, b, card, origin) {
  const blockers = [];
  if (consent(a, 'matching') !== 'Granted') blockers.push('No matching consent from ' + P(a).name);
  if (consent(b, 'matching') !== 'Granted') blockers.push('No matching consent from ' + P(b).name);
  if (card.expires < today()) blockers.push('Opportunity card expired');
  if (crossOrg(a, b, card.ctx || ctxId()))
    [a, b].forEach(pid => !authorizePurpose('xorg', pid, { ctx: card.ctx || ctxId() }, 'Cross-organisation Match Brief').ok && blockers.push('Cross-organisation discovery not allowed for ' + P(pid).name + ' — ' + purposeCheck('xorg', pid, { ctx: card.ctx || ctxId() }).level + ' level'));
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
    ai: purposeOn('ai', a) && adapterUp('ai'),
    ctx: card.ctx || ctxId(),
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
    `<form data-f="nom" class="col prj-dlg"><input type="hidden" name="id" value="${c.id}">${fi('nom', 'pid', 'Person to match with the card owner', { type: 'select', req: true, opts: S.assign.filter(a => a.ctx === c.ctx && a.status === 'Active' && ['P', 'C', 'M'].includes(roleBase(a.role)) && a.pid !== c.owner).map(a => [a.pid, P(a.pid).name]) })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Draft Match Brief</button></div></form>`,
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
  const leads = SPACE_KINDS.flatMap(k => S[k].filter(o => inCtx(o) && linkAuth(k, o)).map(o => [o.id, OBJ_LABEL(k) + ' · ' + o.name]));
  modal(
    'Direct authorised collaboration (Route B)',
    () =>
      `<form data-f="rb" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${c.id}">${fi('rb', 'pid', 'Known collaborator', { type: 'select', req: true, ph: 'Select', opts: S.assign.filter(a => a.ctx === c.ctx && a.status === 'Active' && a.pid !== myId() && roleBase(a.role) !== 'S').map(a => [a.pid, P(a.pid).name]) })}${fi('rb', 'auth', 'Authority source', { type: 'select', req: true, ph: 'Select the basis', opts: rbSources() })}${leads.length ? fi('rb', 'space', 'Existing work you lead (only for the last basis)', { type: 'select', ph: 'Select', opts: leads }) : ''}${banner('info', 'Checked before anything is sent', 'Both of you are active in this programme · the basis you chose is true · cross-organisation sharing is allowed for both if you are in different organizations · the other person must accept. No Match Brief is needed, and nothing private is shared.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Run checks and invite</button></div></form>`,
  );
};
F.rb = d => {
  if (!validate('rb', d, { pid: ['req'], auth: ['req'] })) return render();
  const cd = byId('cards', d.id);
  const c = cd.ctx || ctxId();
  if (d.auth === 'lead' && !d.space) {
    UI.err.rb = { space: 'Choose the work you lead.' };
    return render();
  }
  const auth = rbAuthority(d.auth, myId(), d.pid, c, d.space);
  if (!auth) {
    UI.modal = null;
    return deny('the basis you chose is not true for you and ' + P(d.pid).name + ' — use the steward-reviewed match route');
  }
  if (crossOrg(myId(), d.pid, c))
    for (const pid of [myId(), d.pid]) {
      const r = authorizePurpose('xorg', pid, { ctx: c }, 'Route B direct collaboration');
      if (!r.ok) {
        UI.modal = null;
        return deny('different organizations: ' + r.why);
      }
    }
  const pp = { id: uid('pp'), from: myId(), to: d.pid, ctx: c, at: now(), rel: auth.label, authority: auth, invitation: { at: now(), by: myId() }, status: 'Awaiting consent', consentAt: null, workspace: null };
  (cd.proposals = cd.proposals || []).push(pp);
  notify(d.pid, `${me().name} invites you to collaborate directly on “${cd.title}” (${auth.label}). Accept or decline from the card.`, 'card', { id: d.id });
  audit('Route B proposal', d.id, myId() + '→' + d.pid + ' · ' + auth.label);
  UI.modal = null;
  clearF('rb');
  toast('Checks passed. ' + P(d.pid).name + ' has been asked to accept.');
  ok();
};
// ---------- MATCH BRIEFS (E06) ----------
route('matches', 'matching', () => {
  const r = role();
  // Parties see their briefs at every stage (including steward review / clarification), so Connect is walkable.
  const list = S.matches.filter(m =>
    r === 'F'
      ? m.steward === myId()
      : r === 'A'
        ? true
        : m.a === myId() || m.b === myId() || (m.steward === myId() && ['In steward review', 'Clarification requested'].includes(m.status)),
  );
  return (
    head(
      'Match Briefs',
      'Potential match → Match Brief → steward approval → mutual consent → introduction. No hidden ranking.',
    ) +
    card(
      'Match Briefs',
      '',
      dataView('matches', {
      label: 'Match Briefs',
      items: list,
      search: m => P(m.a).name + ' ' + P(m.b).name + ' ' + m.origin + ' ' + m.status,
      quick: { label: 'Status', options: dvOpts(list, m => m.status), test: (m, v) => m.status === v },
      filters: [
        { key: 'origin', label: 'Origin', options: dvOpts(list, m => m.origin), test: (m, v) => m.origin === v },
        { key: 'blockers', label: 'Blockers', options: [['yes', 'Has do-not-introduce'], ['no', 'None']], test: (m, v) => (v === 'yes' ? m.blockers.length > 0 : !m.blockers.length) },
      ],
      sorts: [
        ['parties', 'Parties', (a, b) => P(a.a).name.localeCompare(P(b.a).name)],
        ['status', 'Status', (a, b) => a.status.localeCompare(b.status)],
      ],
      row: m => ({
        lead: `<span class="avstack" aria-hidden="true"><span class="av sm">${ini(m.a)}</span><span class="av sm">${ini(m.b)}</span></span>`,
        title: nm(m.a) + ' ↔ ' + nm(m.b),
        sub: h(m.origin),
        meta: [m.steward ? 'Steward · ' + nm(m.steward) : ''],
        badges: pill(m.status) + (m.introState ? pill(INTRO_LABEL[m.introState], 'p-teal') : '') + (m.blockers.length ? pill(m.blockers.length + ' do-not-introduce', 'p-red') : ''),
        primary: L('Open', 'match', { id: m.id }, 'btn btn-s btn-sm'),
      }),
      empty: ['link', 'No Match Briefs yet', 'A steward drafts a Match Brief from a potential match; both people consent before any introduction.', ''],
    }),
    ) + rbList()
  );
});
// Route B records the person is part of (all of them for the Organization Admin), for audit and follow-up.
function rbList() {
  const r = role();
  const rows = S.cards.flatMap(c => (c.proposals || []).filter(pp => (pp.ctx || c.ctx) === ctxId() && (r === 'A' || pp.from === myId() || pp.to === myId())).map(pp => [c, pp]));
  if (!rows.length) return '';
  return (
    '<div class="section-gap"></div>' +
    card(
      'Direct collaborations (Route B)',
      'Known collaborators, no Match Brief. Each record keeps who initiated it, the context, the authority source, consent and the resulting workspace.',
      table(
        ['Parties', 'Opportunity', 'Authority source', 'Consent', 'Outcome', ''],
        rows.map(([c, pp]) => [
          nm(pp.from) + ' → ' + nm(pp.to),
          h(c.title),
          h((pp.authority && pp.authority.label) || pp.rel || '—'),
          pill(pp.status),
          pp.introState ? `<code class="cap">${pp.introState}</code>` : '—',
          L('Open', 'card', { id: c.id }, 'btn btn-s btn-sm'),
        ]),
      ),
    )
  );
}
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
  // Consent-based flow, shown read-only: brief → steward approval → mutual consent → introduction.
  const at = { Draft: 0, 'In steward review': 1, 'Clarification requested': 1, 'Awaiting consent': 2, Introduced: 4, Rejected: 1, Withdrawn: 1, Declined: 2, Expired: 2 }[m.status] ?? 1;
  const stop = MB_ENDED.includes(m.status);
  const flow = `<ol class="mb-flow" aria-label="Match Brief progress">${['Match Brief', 'Steward approval', 'Mutual consent', 'Introduction']
    .map((t, i) => `<li class="${i < at ? 'done' : i === at ? (stop ? 'err' : 'cur') : 'todo'}"${i === at && !stop ? ' aria-current="step"' : ''}><span class="td">${i < at ? ic('check', 13) : i === at && stop ? ic('x', 13) : i + 1}</span><span>${t}</span></li>`)
    .join('')}</ol>`;
  return (
    crumbsHtml([
      ['Match Briefs', 'matches'],
      ['Brief'],
    ]) +
    `<div class="shead-main mb-head"><span class="avstack mb-av" aria-hidden="true"><span class="av">${ini(m.a)}</span><span class="av">${ini(m.b)}</span></span><div class="shead-t"><div class="shead-kind">Match Brief · ${h(m.origin)}</div><div class="row wrap mb-ttl"><h1 class="h1">${nm(m.a) + ' ↔ ' + nm(m.b)}</h1>${pill(m.status)}</div><div class="shead-meta">${m.card && byId('cards', m.card) ? `<span>${oppKind(byId('cards', m.card).kind)} ${h(byId('cards', m.card).title)}</span>` : ''}${m.steward ? `<span>Steward · ${nm(m.steward)}</span>` : ''}</div></div></div>` +
    flow +
    (stop ? banner('warn', 'Proposal ended before an introduction', h(m.outcome || m.status) + '. No contact details were released and nothing was created. This is not one of the four post-introduction outcomes.') : '') +
    (m.status === 'Awaiting consent' && m.consentBy ? banner('info', 'Consent requested', 'Both people must consent by ' + fmt(m.consentBy) + '. If either declines, or the time runs out, the proposal ends with no introduction.') : '') +
    (m.blockers.length
      ? banner(
          'err',
          'Do not introduce yet',
          m.blockers.map(h).join('; ') + '. The brief cannot be approved until this clears.',
        )
      : '') +
    (m.project ? banner('info', 'Collaborator invitation for a defined requirement', `Project: <b>${cName(m.project)}</b> · Requirement: <b>${h(m.requirement)}</b> · Expected contribution: ${h(m.contribution)}. The collaborator can accept or decline without obligation.`) : '') +
    `<div class="g12">
 <div class="c8 col" style="gap:16px">${mbBody(m)}</div>
 <aside class="c4 col mb-side">${card('Consent', 'Contact details are released only after both parties consent.', dl([[nm(m.a), pill(m.consentA || 'Pending')], [nm(m.b), pill(m.consentB || 'Pending')], m.outcome && !m.introState && ['Outcome', h(m.outcome)]]))}
 ${stw && ['In steward review', 'Clarification requested'].includes(m.status) ? card('Steward decision', '', `<div class="col opp-stack">${B(ic('edit', 14) + 'Edit brief', 'mbEdit', { id: m.id })}${B('Request clarification', 'mbState', { id: m.id, v: 'Clarification requested' })}${B('Reject', 'mbState', { id: m.id, v: 'Rejected' })}${m.blockers.length ? `<button class="btn btn-p btn-sm" disabled>Approve</button>` : B('Approve and request consent', 'mbState', { id: m.id, v: 'Awaiting consent' }, 'btn-p btn-sm')}</div>`) : ''}
 ${party && m.status === 'Awaiting consent' && !m[myC] ? card('Your consent', 'Contact details are released only after both parties consent.', `<div class="row wrap">${B('Decline', 'mbConsent', { id: m.id, v: 'Declined' })}${B('Consent to introduction', 'mbConsent', { id: m.id, v: 'Consented' }, 'btn-p btn-sm')}</div>`) : ''}
 ${party && m.status === 'Introduced' && m.project ? card('Collaborator invitation', '', `<p class="muted">${m.b === myId() ? 'Your invitation to the project ' + WL() + ' explains the requirement and expected contribution. Accept or decline it without obligation.' : nm(m.b) + ' has been invited with a defined responsibility: ' + h(m.requirement) + '.'}</p>${byId('projects', m.project)?.room ? L('Open ' + WL(), 'room', { id: byId('projects', m.project).room }, 'btn btn-s btn-sm') : '<p class="cap">The invitation is sent when the ' + WL() + ' is created.</p>'}`) : ''}
 ${m.status === 'Introduced' && (party || m.introState) ? (party && !m.project ? introCard(viaOf('mb:' + m.id)) : card('What happened next', '', m.introState ? `<code>${m.introState}</code> · ${h(INTRO_LABEL[m.introState])}` : m.project ? '<p class="cap">Recorded when the project’s ' + WL() + ' is created and the collaborator is invited.</p>' : '<p class="cap">Not recorded yet.</p>')) : ''}
 ${m.status === 'Introduced' ? card('Introduction', '', `<p>${nm(m.a)} · ${h(P(m.a).email)}</p><p>${nm(m.b)} · ${h(P(m.b).email)}</p><p class="cap opp-note">Released after mutual consent.</p>`) : ''}</aside></div>`
  );
});
A.mbState = d => {
  const m = byId('matches', d.id);
  if (d.v === 'Awaiting consent' && m.blockers.length) return deny('a do-not-introduce condition is present');
  m.status = d.v;
  if (d.v === 'Awaiting consent') {
    m.consentBy = new Date(Date.now() + CONSENT_DAYS * 864e5).toISOString().slice(0, 10);
    [m.a, m.b].forEach(p => notify(p, 'Match Brief approved — your consent is requested by ' + fmt(m.consentBy), 'match', { id: m.id }));
    const j = S.ai.find(x => x.purpose.includes(m.id));
    if (j) {
      j.status = 'Released';
      j.reviewed = true;
    }
  }
  if (d.v === 'Rejected') {
    m.outcome = 'Proposal ended — rejected by the steward';
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
      `<form data-f="mbe" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${m.id}">${fi('mbe', 'gaps', 'Readiness gaps (one per line)', { type: 'textarea', rows: 3 })}${fi('mbe', 'questions', 'Suggested questions (one per line)', { type: 'textarea', rows: 3 })}${fi('mbe', 'next', 'Recommended next human action', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
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
    m.status = 'Declined';
    m.outcome = 'Proposal ended — ' + me().name + ' declined; no introduction, no contact details released';
    [m.a, m.b, m.steward]
      .filter(p => p !== myId())
      .forEach(p => notify(p, 'Match proposal ended: one party declined', 'match', { id: m.id }));
  } else if (m.consentA === 'Consented' && m.consentB === 'Consented') {
    m.status = 'Introduced';
    m.outcome = 'Introduction active';
    m.introducedAt = now();
    if (m.project) collabInvite(m);
    [m.a, m.b, m.steward].forEach(p =>
      notify(p, 'Introduction made: ' + P(m.a).name + ' and ' + P(m.b).name, 'match', { id: m.id }),
    );
  }
  audit('Match consent ' + d.v, m.id, '');
  ok();
};
// ---------- AFTER THE INTRODUCTION: exactly four outcomes (WSS clarification 7) ----------
// Only an active introduction (both parties consented) has an outcome. A decline, steward rejection, card withdrawal
// or consent expiry before mutual consent ends the proposal instead — it is not one of the four outcomes.
const INTRO = {
  CLOSED: 'INTRODUCTION_CLOSED',
  OPEN: 'INTRODUCTION_OPEN',
  LINKED: 'INTRODUCTION_LINKED_EXISTING',
  CREATED: 'INTRODUCTION_CREATED_WORKSPACE',
};
const introOutcomes = () => [
  ['close', 'Close', 'No useful next step. Nothing is created.', INTRO.CLOSED],
  ['continue', 'Continue Conversation', 'Useful, not ready for structured action. A private two-person conversation continues.', INTRO.OPEN],
  ['link', 'Link Existing Workspace', 'You already share a Circle, Rope Team or ' + WL() + '. Both of you must be active members of it.', INTRO.LINKED],
  ['create', 'Create New Workspace', 'Move into structured action. Normally an ' + WL() + ', with this introduction as its origin.', INTRO.CREATED],
];
const INTRO_LABEL = { [INTRO.CLOSED]: 'Closed', [INTRO.OPEN]: 'Conversation continuing', [INTRO.LINKED]: 'Linked to an existing workspace', [INTRO.CREATED]: 'New workspace created' };
const INTRO_FINAL = [INTRO.CLOSED, INTRO.LINKED, INTRO.CREATED];
// Consent window after steward approval; an unanswered proposal expires instead of hanging open.
const CONSENT_DAYS = 14;
const MB_ENDED = ['Declined', 'Expired', 'Rejected', 'Withdrawn'];
// Route A (Match Brief) and Route B (direct collaboration proposal) share the post-agreement steps. `via` names one:
// "mb:<match id>" or "pp:<card id>:<proposal id>".
function viaOf(via) {
  const [t, a, b] = String(via || '').split(':');
  if (t === 'mb') {
    const m = byId('matches', a);
    return m && { kind: 'mb', o: m, parties: [m.a, m.b], ctx: m.ctx, card: m.card, label: 'Introduction · ' + P(m.a).name + ' ↔ ' + P(m.b).name };
  }
  if (t === 'pp') {
    const c = byId('cards', a);
    const pp = c && (c.proposals || []).find(x => x.id === b);
    return pp && { kind: 'pp', o: pp, parties: [pp.from, pp.to], ctx: pp.ctx || c.ctx, card: c.id, label: 'Direct collaboration · ' + P(pp.from).name + ' ↔ ' + P(pp.to).name };
  }
  return null;
}
// Workspaces both parties are active members of — the authority PHOENIX validates before linking.
const sharedSpaces = (a, b, c) =>
  SPACE_KINDS.flatMap(k => S[k].filter(o => (!c || o.ctx === c) && o.state === 'Active' && memberOf(o, a) && memberOf(o, b)).map(o => [k, o]));
function introSet(v, state, ws) {
  v.o.introState = state;
  v.o.introAt = now();
  v.o.introBy = myId();
  if (ws) v.o.workspace = ws;
  const other = v.parties.find(p => p !== myId());
  notify(other, me().name + ' recorded what happened next: ' + INTRO_LABEL[state], v.kind === 'mb' ? 'match' : 'card', v.kind === 'mb' ? { id: v.o.id } : { id: v.card });
  if (v.kind === 'mb' && v.o.steward) notify(v.o.steward, 'Introduction outcome: ' + INTRO_LABEL[state] + ' — ' + v.label, 'match', { id: v.o.id });
  audit('Post-introduction outcome', v.o.id, state + (ws ? ' · ' + ws.kind + ' ' + ws.id : ''));
}
// The private two-person conversation for "Continue Conversation".
function introDm(v) {
  v.o.dm = v.o.dm && byId('dms', v.o.dm) ? v.o.dm : null;
  if (v.o.dm) return byId('dms', v.o.dm);
  const o = { id: uid('dm'), ctx: v.ctx || ctxId(), intro: v.o.id, name: v.label, state: 'Active', members: v.parties.map(pid => ({ pid, role: 'Party', status: 'Active' })), chat: [] };
  (S.dms = S.dms || []).push(o);
  v.o.dm = o.id;
  sysMsg(o, 'Introduction conversation opened by ' + me().name + '. Only the two of you can read it.');
  return o;
}
A.mbNext = d => {
  const v = viaOf('mb:' + d.id);
  const k = d.k || (introOutcomes().find(x => x[1] === d.v || x[0] === d.v) || [])[0] || (/^link/i.test(d.v || '') ? 'link' : /^create/i.test(d.v || '') ? 'create' : '');
  return introNext(v, k);
};
function introNext(v, k) {
  if (k === 'close') {
    introSet(v, INTRO.CLOSED);
    if (v.o.dm && byId('dms', v.o.dm)) byId('dms', v.o.dm).state = 'Closed';
    toast('Introduction closed. Nothing was created.');
    return ok();
  }
  if (k === 'continue') {
    introSet(v, INTRO.OPEN);
    const o = introDm(v);
    save();
    return go('messages', { c: o.id, k: 'dms' });
  }
  if (k === 'link') return A.introLink({ via: v.kind === 'mb' ? 'mb:' + v.o.id : 'pp:' + v.card + ':' + v.o.id });
  if (k === 'create') {
    const other = v.parties.find(p => p !== myId());
    A.newRoom({ origin: v.kind === 'mb' ? 'Approved PHOENIX match' : 'Direct authorised collaboration', oid: v.kind === 'mb' ? v.o.id : v.card, via: v.kind === 'mb' ? 'mb:' + v.o.id : 'pp:' + v.card + ':' + v.o.id });
    // the other party is suggested as an invitee; they still have to accept
    UI.msel.nr_inv = [other];
    return render();
  }
  return deny('choose one of the four outcomes');
}
A.introLink = d => {
  const v = viaOf(d.via);
  const [a, b] = v.parties;
  const sp = sharedSpaces(a, b, v.ctx);
  clearF('ilk');
  modal(
    'Link an existing workspace',
    () =>
      `<form data-f="ilk" class="col" style="gap:14px" novalidate><input type="hidden" name="via" value="${h(d.via)}">${
        sp.length
          ? fi('ilk', 'ws', 'Workspace you both belong to', { type: 'select', req: true, ph: 'Choose', opts: sp.map(([k, o]) => [k + ':' + o.id, OBJ_LABEL(k) + ' · ' + o.name]), help: 'Only active Circles, Rope Teams and ' + WL() + 's where ' + nm(a) + ' and ' + nm(b) + ' are both active members.' })
          : banner('warn', 'No shared workspace', nm(a) + ' and ' + nm(b) + ' are not both active members of any Circle, Rope Team or ' + WL() + ' in this programme. Choose Create New Workspace or Continue Conversation instead.')
      }${banner('info', 'Linked by reference', 'The workspace records this introduction as a related object. Nothing from the Match Brief or either person’s records is copied, and no one is added to the workspace.')}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${sp.length ? '' : 'disabled'}>Link</button></div></form>`,
  );
};
F.ilk = d => {
  if (!validate('ilk', d, { ws: ['req'] })) return render();
  const v = viaOf(d.via);
  const [k, id] = d.ws.split(':');
  const o = byId(k, id);
  // re-validated at submit: both parties must still be active members of an active workspace
  if (!o || o.state !== 'Active' || !v.parties.every(pid => memberOf(o, pid))) return deny('both parties must be active members of an active workspace to link it');
  addLink(k, o.id, v.kind === 'mb' ? 'matches' : 'cards', v.kind === 'mb' ? v.o.id : v.card, 'related-to', false);
  sysMsg(o, 'Linked by reference to ' + v.label + '. Nothing was copied and no one was added.');
  introSet(v, INTRO.LINKED, { kind: k, id: o.id });
  UI.modal = null;
  clearF('ilk');
  toast('Linked to ' + o.name + '.');
  ok();
};
// Called by the Action Room form once the room exists, so the outcome is recorded only when a workspace is real.
function introCreated(via, x) {
  const v = viaOf(via);
  if (!v || INTRO_FINAL.includes(v.o.introState)) return;
  if (v.kind === 'pp' && v.card) addLink('rooms', x.id, 'cards', v.card, 'related-to', false);
  introSet(v, INTRO.CREATED, { kind: 'rooms', id: x.id });
}
// What the introduction screen shows: the question, or the recorded outcome.
function introCard(v) {
  const st = v.o.introState;
  const ws = v.o.workspace && byId(v.o.workspace.kind, v.o.workspace.id);
  const done = st ? dl([['State', `<code>${st}</code>`], ['Outcome', h(INTRO_LABEL[st])], ['Recorded by', nm(v.o.introBy) + ' · ' + fmt(v.o.introAt)], ws && ['Workspace', objOpenable(v.o.workspace.kind, ws) ? L(h(ws.name), OBJ_ROUTE[v.o.workspace.kind], { id: ws.id }) : h(ws.name)], v.o.dm && byId('dms', v.o.dm) && st === INTRO.OPEN && ['Conversation', L('Open conversation', 'messages', { c: v.o.dm, k: 'dms' })]]) : '';
  if (INTRO_FINAL.includes(st)) return card('What happened next', '', done);
  const via = v.kind === 'mb' ? { id: v.o.id } : { c: v.card, id: v.o.id };
  const act = v.kind === 'mb' ? 'mbNext' : 'rbNext';
  return card(
    'What happened next?',
    st === INTRO.OPEN ? 'The conversation is continuing. Record the outcome when you know it.' : 'Choose one. Either of you can record it; the other is told.',
    done +
      `<div class="col opp-stack">${introOutcomes().filter(([k]) => !(st === INTRO.OPEN && k === 'continue'))
        .map(([k, l, t]) => (k === 'close' ? CB(l, act, { ...via, k }, 'Close this introduction? Nothing will be created, and the conversation becomes read-only.', 'btn-s btn-sm') : B(l, act, { ...via, k }, k === 'create' ? 'btn-p btn-sm' : 'btn-s btn-sm')) + `<p class="cap" style="margin:0 0 6px">${t}</p>`)
        .join('')}</div>`,
  );
}

// ---------- ROUTE B: direct authorised collaboration (no Match Brief) ----------
// The record keeps who initiated it, the context, the authority source, the invitation and consent, and the resulting
// workspace link. It is never a back door: the other party must consent, both must be active in the programme, and
// cross-organisation proposals still need CROSS_ORG_DISCOVERY for both.
const rbSources = () => [
  ['programme', 'Members of the same approved programme'],
  ['space', 'Already share a Circle, Rope Team or ' + WL()],
  ['org', 'Known institutional collaborators (same organization)'],
  ['lead', 'I lead existing work and am adding a known collaborator to it'],
];
function rbAuthority(type, from, to, c, spaceId) {
  const act = pid => S.assign.some(a => a.pid === pid && a.ctx === c && a.status === 'Active');
  if (!act(from) || !act(to)) return null;
  if (type === 'programme') return { type, ref: c, label: 'Same approved programme · ' + ctxName(c) };
  if (type === 'space') {
    const sp = sharedSpaces(from, to, c)[0];
    return sp && { type, ref: sp[1].id, label: 'Shared ' + OBJ_LABEL(sp[0]) + ' · ' + sp[1].name };
  }
  if (type === 'org') return P(from).org && P(from).org === P(to).org ? { type, ref: P(from).org, label: 'Same organization · ' + orgName(P(from).org) } : null;
  if (type === 'lead') {
    const k = objKind(spaceId);
    const o = byId(k, spaceId);
    return o && SPACE_KINDS.includes(k) && linkAuth(k, o) ? { type, ref: o.id, label: 'Lead of ' + OBJ_LABEL(k) + ' · ' + o.name } : null;
  }
  return null;
}
A.rbNext = d => {
  const v = viaOf('pp:' + d.c + ':' + d.id);
  return introNext(v, d.k);
};
function rbRecord(c, pp) {
  const ws = pp.workspace && byId(pp.workspace.kind, pp.workspace.id);
  return dl([
    ['Initiated by', nm(pp.from) + (pp.at ? ' · ' + fmt(pp.at) : '')],
    ['Invited', nm(pp.to)],
    ['Context', h(ctxName(pp.ctx || c.ctx))],
    ['Authority source', h((pp.authority && pp.authority.label) || pp.rel || '—')],
    ['Consent', pill(pp.status) + (pp.consentAt ? ' <span class="cap">' + fmt(pp.consentAt) + '</span>' : '')],
    ['Resulting workspace', ws ? (objOpenable(pp.workspace.kind, ws) ? L(h(ws.name), OBJ_ROUTE[pp.workspace.kind], { id: ws.id }) : h(ws.name)) : pp.introState ? h(INTRO_LABEL[pp.introState]) : '—'],
  ]);
}
// ---------- COLLABORATOR MATCH FOR A PROJECT REQUIREMENT (Section 6.4, F06 Route A, D-05) ----------
// The required skill is part of the project requirements. Rules compare it with collaborator records held in PHOENIX
// (organization profile, published offers, shared claims) and show the actual rationale — never a score.
const words = s =>
  String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from', 'support', 'help'].includes(w));
// CROSS_ORG_DISCOVERY: a candidate from another organization is proposed only if both organizations and the
// programme allow it; if either person declined, the candidate is shown with that blocker. Same-organization
// matching never needs this purpose.
const xorgScopeOk = (pid, c) => tenantScope(personOrg(pid, c), 'xorg') && progScope(c, 'xorg');
function collabCandidates(p, req) {
  const need = new Set(words(req));
  return S.assign
    .filter(a => a.ctx === p.ctx && roleBase(a.role) === 'C' && a.status === 'Active' && a.pid !== p.owner)
    // records from a tenant (or programme) that disabled cross-organisation discovery are not proposed externally
    .filter(a => !crossOrg(a.pid, p.owner, p.ctx) || (xorgScopeOk(a.pid, p.ctx) && xorgScopeOk(p.owner, p.ctx)))
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
      if (crossOrg(a.pid, p.owner, p.ctx))
        [a.pid, p.owner].forEach(pid => !authorizePurpose('xorg', pid, { ctx: p.ctx }, 'Cross-organisation collaborator match').ok && blockers.push('Cross-organisation discovery not allowed by ' + P(pid).name));
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
      `<form data-f="colf" class="col prj-dlg" novalidate><input type="hidden" name="project" value="${p.id}">${dl([['Project', h(p.title)], ['Stage', pill(stageLabel(p.stage || 'Circle'))]])}${fi('colf', 'req', 'Required skill or expertise', { req: true, ph: 'e.g. GIS mapping, manufacturing experience', help: 'Taken from the project requirements. Press “Find matches” to apply the matching rules.' })}${fi('colf', 'contrib', 'Expected contribution', { type: 'textarea', rows: 2, req: true, ph: 'e.g. Produce the canopy GIS layer for 25 streets over 4 weeks' })}<div class="row">${B(ic('search', 14) + 'Find matches', 'colfFind', { project: p.id })}</div>${
        req.trim()
          ? cands.length
            ? `<fieldset class="np-fs col"><legend class="lbl">Potential collaborators — rule-identified, not ranked by a score</legend><div class="col opp-cands">${cands.map(c => `<label class="choice np-choice opp-cand ${fv('colf', 'pid') === c.a.pid ? 'sel' : ''}"><input type="radio" name="pid" value="${c.a.pid}" ${fv('colf', 'pid') === c.a.pid ? 'checked' : ''} data-ch="colfPick"><span class="rad" aria-hidden="true"></span><span class="col np-ct"><b>${nm(c.a.pid)} · ${h(c.org.name || 'No organization')}</b><span class="cap">${c.hits.length ? 'Why suggested: ' + c.hits.map(([k]) => h(k)).join(', ') : 'No direct match in records held in PHOENIX — include only if you know this partner can help.'}</span>${c.blockers.length ? `<span class="cap opp-block">Do not introduce yet: ${c.blockers.map(h).join('; ')}</span>` : ''}</span></label>`).join('')}</div></fieldset>`
            : banner('info', 'No collaborators in this programme yet', 'Ask the Organization Admin to invite a partner (D-05).')
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
    // the requirement belongs to existing work: recorded as Link Existing Workspace (steward-approved, both consented)
    addLink('rooms', x.id, 'matches', m.id, 'related-to', false);
    Object.assign(m, { introState: INTRO.LINKED, introAt: now(), introBy: m.steward, workspace: { kind: 'rooms', id: x.id } });
  } else {
    (p.pendingCollab = p.pendingCollab || []).push({ pid: m.b, req: m.requirement, contrib: m.contribution, match: m.id });
    notify(m.b, 'Collaborator match accepted for “' + p.title + '”. You will be invited when its ' + WL() + ' is created.', 'match', { id: m.id });
  }
  p.history.push({ at: today(), t: 'Collaborator introduced: ' + P(m.b).name + ' (' + m.requirement + ')' });
}
