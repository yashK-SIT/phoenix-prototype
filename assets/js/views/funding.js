// ---------- SPONSOR AREA (BF-08 · Doc 1 §6.6) ----------
// Sponsor Alpha: seat pools and utilisation, approved initiatives, approved evidence summaries, funder-safe Harvests,
// aggregate programme signals, invoices and receipts. Staged project funding, pitches, tranches, progress summaries,
// reallocation and sponsor ↔ owner messaging are outside the Alpha (their handlers stay, and guards.js denies them).
// Commercial entitlement never creates workspace membership, participant-level access or authority.
const STAGE_ORDER = ['Circle', 'Rope Team', 'Room', 'Final review', 'Closed'];
const stageReached = (p, stage) => p.stage && STAGE_ORDER.indexOf(p.stage) >= STAGE_ORDER.indexOf(stage);
// ---- small-number suppression: any count or bucket below 5 is shown as "Fewer than 5" (tables, totals, charts)
const SUPP_MIN = 5;
const SUPP = '<span class="suppressed">Fewer than 5</span>';
const isSupp = n => Number(n) < SUPP_MIN;
const sup = n => (isSupp(n) ? SUPP : Number(n).toLocaleString('en-US'));
// A share is suppressed when either the part or the whole is a small number.
const supPct = (n, base) => (isSupp(n) || isSupp(base) ? SUPP : Math.round((n / base) * 100) + '%');
// One bar per bucket; a suppressed bucket shows no bar length.
const supBar = (label, n, max) =>
  `<div class="seat-meter"><div class="seat-meter-h"><b>${label}</b><span class="cap">${sup(n)}</span></div><div class="progress" role="img" aria-label="${h(String(label).replace(/<[^>]+>/g, ''))}: ${isSupp(n) ? 'fewer than 5' : n}"><div class="bar" style="width:${isSupp(n) || !max ? 0 : Math.round((n / max) * 100)}%"></div></div></div>`;
// ---- seat pools: sponsors see aggregates only. `assigned` names the seat holders for administrators.
const poolAssigned = sp => (sp.assignedCount != null ? sp.assignedCount : sp.assigned.length);
const poolActive = sp =>
  sp.activeCount != null
    ? sp.activeCount
    : sp.assigned.filter(pid => {
        const e = S.ents.find(e => e.pid === pid && e.source.includes(sp.id));
        return !e || e.state === 'Active';
      }).length;
const myPools = () => S.seatPools.filter(s => s.sponsor === myId());
const daysLeft = d => Math.round((new Date(d) - new Date(today())) / 864e5);
const ctxNameOf = id => (S.contexts.find(c => c.id === id) || {}).name || '';
// ---- what a sponsor may see
// Approved, active evidence cleared for funder reports (evidence.js owns the release rule when evReleasedTo exists).
function sponsorCleared() {
  const xs =
    typeof evReleasedTo === 'function'
      ? evReleasedTo('Funder report')
      : S.evidence.filter(e => e.review === 'Approved' && /funder/i.test(e.release || ''));
  return xs.filter(e => e.review === 'Approved' && (e.lifecycle || 'Active') === 'Active');
}
// Harvests cleared for funders (never personal Harvests). evidence.js owns the rule when hvReleasedTo exists.
const funderHarvests = () =>
  (typeof hvReleasedTo === 'function' ? hvReleasedTo('Funder report') : S.harvests.filter(x => x.state === 'Approved' && x.release === 'Released')).filter(x => !x.personal);
const HV_FUNDER_SECTIONS = ['What happened', 'Evidence and outcomes', 'Learning', 'Forward movement'];
// Approved projects in the sponsor's programme, as aggregate status only.
const sponsorInitProjects = () =>
  S.projects.filter(p => inCtx(p) && (p.status === 'Accepted' || String(p.status).startsWith('Closed — Approved')));
const PLAIN_STAGE = {
  Circle: 'Forming the team and agreeing scope',
  'Rope Team': 'Planning with mentor support',
  Room: 'Delivering the work',
  'Final review': 'In final review',
  Closed: 'Completed',
};
const plainStage = p => PLAIN_STAGE[p.stage] || 'Getting started';
const projMilestones = p => (byId('rooms', p.room) || { milestones: [] }).milestones || [];
const projSpaces = p => [p.id, p.circle, p.rope, p.room].filter(Boolean);
const evProject = e => S.projects.find(p => projSpaces(p).some(id => (e.linked || []).includes(id)));
const myStoryReqs = () => S.releases.filter(x => x.requester === myId() && x.kind === 'story');
const dueInvoices = () => S.payments.filter(p => p.pid === myId() && p.state === 'Invoice due');
const NEVER_SPONSOR =
  'Private participant profiles, Purpose Compass responses, private reflections and discussions, mentor notes, AI conversations or unapproved evidence. Sponsors are never members of Circles, Rope Teams or Action Workspaces.';

route('funding', 'funding', () => {
  if (role() !== 'S') return sponsorshipOverview();
  const t = tabs(
    'fund',
    [
      ['seats', 'Seat utilisation'],
      ['initiatives', 'Approved initiatives'],
      ['reports', 'Funder-safe reports'],
      ['invoices', 'Invoices & receipts', dueInvoices().length || null],
    ],
    UI.p.tab,
  );
  const body = { seats: sponsorSeats, initiatives: sponsorInitiatives, reports: sponsorReports, invoices: sponsorInvoices }[t.cur]();
  return (
    head(
      'Sponsorship',
      'What your support enabled: seats, approved initiatives, approved evidence and funder-safe reporting. Commercial entitlement never creates authority or access to participants’ work.',
    ) +
    t.html +
    `<div class="fund-stack">${body}</div>`
  );
});
function sponsorSeats() {
  const pools = myPools();
  const live = pools.filter(s => s.status === 'Active');
  const tot = live.reduce((a, s) => a + s.total, 0),
    asg = live.reduce((a, s) => a + poolAssigned(s), 0),
    act = live.reduce((a, s) => a + poolActive(s), 0);
  const kpi = (l, v) => `<div class="kpi"><span class="lt">${l}</span><span class="fig">${v}</span></div>`;
  return (
    (live.length
      ? `<div class="kpis fund-kpis">${kpi('Seats purchased', tot.toLocaleString('en-US'))}${kpi('Assigned', sup(asg))}${kpi('Active', sup(act))}${kpi('Utilisation', supPct(act, tot))}</div>`
      : '') +
    (pools
      .map(sp => {
        const as = poolAssigned(sp),
          ac = poolActive(sp),
          d = daysLeft(sp.until);
        const pending = sp.status !== 'Active';
        return card(
          `Seat pool · ${h(ctxNameOf(sp.ctx))}`,
          `${sp.total} seats · valid until ${fmt(sp.until)}${!pending && d >= 0 ? ' · ' + d + ' days left' : ''}`,
          (pending
            ? banner('info', 'Awaiting invoice payment', 'This pool activates when the Finance Owner confirms the invoice is paid.')
            : `<div class="seat-meter"><div class="seat-meter-h"><span class="fig">${sup(ac)}<span class="fig-of"> / ${sp.total}</span></span><span class="cap">seats active · utilisation ${supPct(ac, sp.total)}</span></div><div class="progress" role="img" aria-label="${isSupp(ac) ? 'Fewer than 5' : ac} of ${sp.total} seats active"><div class="bar" style="width:${isSupp(ac) ? 0 : Math.round((ac / sp.total) * 100)}%"></div></div></div>`) +
            dl([
              ['Purchased', sp.total.toLocaleString('en-US')],
              ['Assigned', pending ? '—' : sup(as)],
              ['Active', pending ? '—' : sup(ac)],
              ['Available', pending ? sp.total.toLocaleString('en-US') : Math.max(0, sp.total - as).toLocaleString('en-US')],
              ['Validity', fmt(sp.until) + (d >= 0 && d <= 60 && !pending ? ' ' + pill('Expiring soon', 'p-amber') : '')],
              ['Status', pill(sp.status)],
              sp.invoice && ['Invoice', `<span class="mono">${h(sp.invoice)}</span>`],
            ]) +
            `<p class="cap bill-note">Seats are assigned by the programme team through invitations. You see counts only, never names, profiles or activity.</p>`,
          pending ? '' : B('Request more seats', 'checkout', { id: 'pd5' }),
          'bill-pool',
        );
      })
      .join('') || empty('card', 'No seat pools yet', 'Buy sponsored seats by invoice. The pool activates when the invoice is paid.', B('Buy seats by invoice', 'checkout', { id: 'pd5' }, 'btn-p btn-sm'))) +
    card(
      'More seats or a donation',
      '',
      `<div class="row wrap">${B('Buy seats by invoice', 'checkout', { id: 'pd5' }, 'btn-p btn-sm')}${B('Donate', 'checkout', { id: 'pd6' })}</div><p class="cap bill-note">A donation grants no entitlement. Sponsors receive approved, aggregate reporting only.</p>`,
    ) +
    banner('info', 'What seat sponsorship never gives', 'Membership of any Circle, Rope Team or ' + WL() + ', access to participants or their records, or any governance power. Paying never restores access that was revoked.')
  );
}
function sponsorInitiatives() {
  const ps = sponsorInitProjects();
  const ev = sponsorCleared();
  const inits = S.initiatives.filter(i => i.status === 'Published');
  return (
    card(
      'Programme initiatives',
      'Published by the Programme Administrator for sponsors.',
      inits.map(i => lrow('megaphone', h(i.title), h(i.summary) + `<span class="cap"> · Published ${fmt(i.at)}</span>`)).join('') ||
        empty('megaphone', 'No initiatives published yet', 'The Programme Administrator publishes initiative summaries for sponsors.'),
      '',
      'hm-list',
    ) +
    card(
      'Approved projects',
      'Aggregate status only: no workspace access, member lists or messaging. Counts below 5 show as “Fewer than 5”.',
      table(
        ['Project', 'Programme', 'Where it is now', 'Milestones achieved', 'Approved evidence'],
        ps.map(p => {
          const ms = projMilestones(p);
          return [
            '<b>' + h(p.title) + '</b>',
            h(ctxNameOf(p.ctx)),
            h(plainStage(p)),
            ms.length ? ms.filter(m => m.status === 'Achieved').length + ' of ' + ms.length : '<span class="cap">None set yet</span>',
            sup(ev.filter(e => projSpaces(p).some(id => (e.linked || []).includes(id))).length),
          ];
        }),
        'No approved projects in this programme yet.',
      ),
      '',
      'sp-tbl',
    )
  );
}
function sponsorReports() {
  const c = ctxId();
  const ev = sponsorCleared();
  const hv = funderHarvests();
  const parts = [...new Set(S.assign.filter(a => a.ctx === c && a.status === 'Active' && roleBase(a.role) === 'P').map(a => a.pid))];
  const inCircle = parts.filter(pid => S.circles.some(ci => ci.ctx === c && ci.state === 'Active' && memberOf(ci, pid))).length;
  const ach = S.rooms.filter(r => r.ctx === c).flatMap(r => r.milestones || []).filter(m => m.status === 'Achieved').length;
  const ps = sponsorInitProjects();
  const buckets = ['Circle', 'Rope Team', 'Room', 'Final review', 'Closed'].map(s => [s === 'Room' ? WL() : s === 'Closed' ? 'Completed' : s, ps.filter(p => (p.stage || 'Circle') === s).length]);
  const max = Math.max(1, ...buckets.map(b => b[1]));
  const reqs = myStoryReqs();
  const mdef = id => h((S.metrics.find(m => m.id === id) || {}).def || '');
  return (
    card(
      'Programme signals',
      'Aggregate only, for ' + h(ctxNameOf(c)) + '. Counts below 5 are shown as “Fewer than 5” in tables, totals and charts.',
      table(
        ['Signal', 'Value', 'How it is counted'],
        [
          ['Participants in the programme', sup(parts.length), 'Active participant roles in this programme'],
          ['Circle participation', supPct(inCircle, parts.length), mdef('m2')],
          ['Milestones achieved', sup(ach), mdef('m6')],
          ['Action-to-evidence coverage', isSupp(ach) ? SUPP : typeof metric === 'function' ? h(String(metric('m7'))) : '—', mdef('m7')],
          ['Approved evidence summaries', sup(ev.length), 'Approved evidence cleared for funder reports'],
          ['Funder-safe Harvests', sup(hv.length), 'Learning Harvests released to funders'],
        ],
      ),
      '',
      'sp-tbl',
    ) +
    card('Approved projects by stage', 'Each bar is a count of approved projects. Small buckets show no bar.', buckets.map(([l, n]) => supBar(h(l), n, max)).join(''), '', 'sp-bars') +
    card(
      'Approved evidence summaries',
      'Cleared for funder reports by the evidence owner and a disclosure review. Summaries only: no names, files or private context.',
      ev
        .map(e => {
          const p = evProject(e);
          const open = reqs.find(x => x.ev === e.id && !['Declined by owner', 'Withheld after disclosure review', 'Released'].includes(x.status));
          return lrow(
            'award',
            h(e.title),
            [h(e.claim || ''), h(e.type || ''), e.level ? 'Support level ' + h(e.level) : '', p ? 'Project: ' + h(p.title) : ''].filter(Boolean).join(' · '),
            open ? pill('Story requested', 'p-grey') : B('Request an identifiable story', 'storyReq', { id: e.id }),
          );
        })
        .join('') || empty('award', 'No approved evidence summaries yet', 'Evidence appears here only after its owner authorises a funder release and the disclosure review clears it.'),
      '',
      'hm-list',
    ) +
    card(
      'Funder-safe Harvests',
      'Learning Harvests the Programme Administrator released to funders. Only the funder-safe sections are shown.',
      hv
        .map(x => `<details class="fdisc-more"><summary>${ic('sparkle', 14)}<b>${h(x.scopeName)}</b> <span class="cap">· ${h(x.trigger || '')}</span></summary>${dl(HV_FUNDER_SECTIONS.filter(k => x.sections && x.sections[k]).map(k => [h(k), h(x.sections[k])]))}</details>`)
        .join('') || empty('sparkle', 'No Harvests released to funders yet', 'A Harvest appears here only after the Programme Administrator approves a funder release.'),
      '',
      'hm-list',
    ) +
    (reqs.length
      ? card(
          'Your story requests',
          'Each request is decided by the participant first, then by the Trust/Data Steward. Sponsorship has no bearing on the decision.',
          table(
            ['Evidence', 'Requested', 'Status'],
            reqs.map(x => [h((byId('evidence', x.ev) || {}).title || '—'), fmt(x.at), pill(x.status)]),
          ),
          '',
          'sp-tbl',
        )
      : '') +
    banner('info', 'What sponsors never receive', NEVER_SPONSOR)
  );
}
function sponsorInvoices() {
  const items = S.payments.filter(p => p.pid === myId() && !p.dup);
  return (
    card(
      'Invoices and receipts',
      'Issued by the payment provider. PHOENIX never sees card details.',
      dataView('fund:invoices', {
        label: 'invoices and receipts',
        items,
        search: p => [p.ref || p.id, (byId('products', p.product) || {}).name || p.product, p.note || '', p.state].join(' '),
        quick: { label: 'Status', options: [...new Set(items.map(p => p.state))].map(v => [v, v]), test: (p, v) => p.state === v },
        sorts: [
          ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
          ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))],
        ],
        defaultSort: 'new',
        layout: 'table',
        dense: true,
        columns: [
          { label: 'Reference', cell: p => `<span class="mono" style="white-space:nowrap">${h(p.ref || p.id)}</span>` },
          { label: 'Item', cell: p => h((byId('products', p.product) || {}).name || p.product) + (p.note ? `<div class="cap">${h(p.note)}</div>` : '') },
          { label: 'Amount', cell: p => h(p.amount || '—') },
          { label: 'Status', cell: p => pill(p.state) + (p.due && p.state === 'Invoice due' ? `<div class="cap">Due ${fmt(p.due)}</div>` : '') },
          { label: 'Date', sort: 'new', cell: p => fmt(p.at) },
          { label: '', cell: p => (p.state === 'Invoice due' ? B('Pay on provider page', 'invPay', { id: p.id }, 'btn-p btn-sm') : '') },
        ],
        empty: ['inbox', 'No invoices or receipts yet', 'Seat-pool invoices and donation receipts appear here once the provider issues them.', ''],
      }),
      B('Buy seats by invoice', 'checkout', { id: 'pd5' }) + B('Donate', 'checkout', { id: 'pd6' }),
      'bill-tx',
    ) + `<p class="cap bill-note">A donation grants no entitlement. Payment never buys authority, visibility, matching priority or access to participants’ work.</p>`
  );
}
// Programme Administrator view of the same boundary (sponsors have their own tabs above).
function sponsorshipOverview() {
  const pools = S.seatPools.filter(s => inCtx(s));
  return (
    head('Sponsorship', 'Sponsors buy seat pools, donate and receive approved, aggregate reporting. Staged project funding, pitches and tranches are outside the Alpha.') +
    `<div class="fund-stack">${card(
      'Seat pools in this programme',
      'Aggregate counts as sponsors see them.',
      table(
        ['Sponsor', 'Seats', 'Assigned', 'Active', 'Valid until', 'Status'],
        pools.map(s => [nm(s.sponsor), s.total, sup(poolAssigned(s)), sup(poolActive(s)), fmt(s.until), pill(s.status)]),
        'No seat pools yet.',
      ),
      can('payments') ? L('Manage seat pools', 'billing', { tab: 'seats' }) : '',
      'sp-tbl',
    )}${card(
      'Sponsor reporting',
      '',
      dl([
        ['Published initiatives', S.initiatives.filter(i => i.status === 'Published').length],
        ['Approved evidence cleared for funders', sponsorCleared().length],
        ['Harvests released to funders', funderHarvests().length],
        ['Identifiable-story requests open', S.releases.filter(x => x.kind === 'story' && !['Declined by owner', 'Withheld after disclosure review', 'Released'].includes(x.status)).length],
      ]),
      role() === 'A' ? L('Sponsor initiatives', 'admin', { tab: 'initiatives' }) : '',
    )}${banner('info', 'Outside the Alpha', 'Project pitches, staged funding tranches, progress summaries, funding reallocation and sponsor ↔ owner messaging.')}</div>`
  );
}
// ---- a sponsor asks for an identifiable story: a separate release request, decided by the participant, then the
// Trust/Data Steward. It never grants direct access.
A.storyReq = d => {
  const e = byId('evidence', d.id);
  clearF('story');
  modal(
    'Request an identifiable story',
    () =>
      `<form data-f="story" class="col fgap" novalidate><input type="hidden" name="id" value="${e.id}"><p class="cap">About: <b>${h(e.title)}</b></p>${fi('story', 'use', 'Where the story would be used', { type: 'select', req: true, ph: 'Select', opts: ['Funder report to our board', 'Annual report', 'Public communication'] })}${fi('story', 'why', 'Why you are asking', { type: 'textarea', rows: 3, req: true, help: 'The participant reads this when deciding.' })}${banner('info', 'How this is decided', 'The participant decides first. If they agree, the Trust/Data Steward reviews disclosure. Nothing identifiable is shared unless both approve, and your sponsorship has no bearing on either decision.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
  );
};
F.story = d => {
  if (!validate('story', d, { use: ['req'], why: ['req', ['min', 20]] })) return render();
  const e = byId('evidence', d.id);
  const org = (S.orgs.find(o => o.id === me().org) || {}).name || 'Sponsor';
  const x = {
    id: uid('rr'),
    ev: e.id,
    requester: myId(),
    kind: 'story',
    aud: 'Funder report',
    audience: 'Identifiable story for ' + org + ' · ' + d.use,
    purpose: d.why,
    status: 'Awaiting owner decision',
    at: today(),
  };
  S.releases.push(x);
  notify(e.owner, 'Release request: ' + org + ' asks to tell an identifiable story about “' + e.title + '”. You decide.', 'evidence', { id: e.id });
  S.assign
    .filter(a => a.ctx === ctxId() && a.status === 'Active' && (a.bundles || []).includes('Trust/Data Steward'))
    .forEach(a => notify(a.pid, 'Story request recorded (owner decides first): ' + e.title, 'evidence', { id: e.id }));
  audit('Identifiable story requested', e.id, x.audience);
  UI.modal = null;
  clearF('story');
  toast('Request sent. The participant decides first, then the Trust/Data Steward.');
  ok();
};
// Simulated provider-hosted invoice payment.
A.invPay = d => {
  const p = S.payments.find(x => x.id === d.id && x.pid === myId());
  if (!p) return deny('invoice not found');
  p.state = 'Paid';
  p.paidAt = today();
  audit('Invoice paid (provider-hosted)', p.ref || p.id, '');
  toast('Invoice paid. A receipt is available from the provider.');
  ok();
};
// ---- Retired for the Alpha (BF-08): staged project funding, pitches, tranches and progress summaries.
// Handlers are kept so older references still resolve; guards.js denies every one of them.
A.fundSave = d => {
  (S.saved[myId()] = S.saved[myId()] || []).push(d.id);
  audit('Project saved by sponsor', d.id, '');
  ok();
};
A.pitchDecide = d => {
  const p = byId('pitches', d.id);
  p.status = d.v;
  notify(p.from, 'Your pitch was ' + d.v.toLowerCase(), 'funding');
  audit('Pitch ' + d.v, p.id, '');
  ok();
};
A.fundInterest = d => {
  clearF('fr');
  UI.form.fr = { amount: d.amount || '', t1: '', t2: '', t3: '' };
  modal(
    'Funding request',
    () =>
      `<form data-f="fr" class="col fgap" novalidate><input type="hidden" name="id" value="${d.id}"><input type="hidden" name="pitch" value="${d.pitch || ''}">${fi('fr', 'amount', 'Total commitment (USD)', { type: 'number', req: true, min: 1 })}<div class="g3">${fi('fr', 't1', 'Tranche 1 · Circle', { type: 'number', req: true, min: 0 })}${fi('fr', 't2', 'Tranche 2 · Rope Team', { type: 'number', req: true, min: 0 })}${fi('fr', 't3', 'Tranche 3 · ' + WL(), { type: 'number', req: true, min: 0 })}</div>${fe('fr', 'sum') ? `<span class="emsg">${ic('alert', 14)}${fe('fr', 'sum')}</span>` : ''}${banner('info', '', 'The request needs Programme Administrator / Finance Owner approval, then you sign the funding agreement. PHOENIX never handles card details.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send funding request</button></div></form>`,
  );
};
F.fr = d => {
  if (!validate('fr', d, { amount: ['req', 'num'], t1: ['req'], t2: ['req'], t3: ['req'] })) return render();
  if (+d.t1 + +d.t2 + +d.t3 !== +d.amount) {
    UI.err.fr = { sum: 'The three tranches must add up to the total.' };
    return render();
  }
  const p = byId('projects', d.id);
  const f = {
    id: uid('fu'),
    sponsor: myId(),
    org: me().org,
    project: p.id,
    total: +d.amount,
    currency: 'USD',
    status: 'Requested',
    agreement: null,
    tranches: [
      ['Circle', d.t1],
      ['Rope Team', d.t2],
      ['Room', d.t3],
    ].map(([stage, a]) => ({ stage, amount: +a, state: 'Committed', summary: '' })),
  };
  S.funding.push(f);
  p.funding = f.id;
  if (d.pitch) byId('pitches', d.pitch).status = 'Accepted — funding requested';
  S.assign
    .filter(a => a.ctx === p.ctx && a.bundles.includes('Finance Owner'))
    .forEach(a => notify(a.pid, 'Funding request needs approval: ' + p.title, 'funding'));
  notify(p.owner, 'A sponsor requested to fund “' + p.title + '”', 'funding');
  audit('Funding requested', f.id, 'USD ' + d.amount);
  UI.modal = null;
  clearF('fr');
  UI.tab.fund = 'funded';
  toast('Funding request sent for approval.');
  ok();
};
A.fundApprove = d => {
  const f = byId('funding', d.id);
  f.status = 'Approved — agreement pending';
  f.approvedBy = myId();
  notify(f.sponsor, 'Funding request approved — please sign the agreement', 'funding', { tab: 'funded' });
  audit('Funding request approved', f.id, '');
  ok();
};
A.fundSign = d => {
  const f = byId('funding', d.id);
  f.status = 'Agreement signed';
  f.agreement = 'FA-' + uid('');
  notify(byId('projects', f.project).owner, 'Funding agreement signed. Tranche 1 can now be released.', 'funding');
  audit('Funding agreement signed', f.id, f.agreement);
  ok();
};
A.tranche = d => {
  const f = byId('funding', d.f);
  const t = f.tranches[d.i];
  const p = byId('projects', f.project);
  if (d.v === 'Released') {
    if (d.i > 0 && f.tranches[d.i - 1].state !== 'Summary accepted')
      return deny('the previous stage summary has not been accepted');
    if (!stageReached(p, t.stage)) return deny('the project has not reached the ' + t.stage + ' stage');
  }
  if (d.v === 'On hold') {
    clearF('hold');
    return modal(
      'Put tranche on hold',
      () =>
        `<form data-f="hold" class="col fgap" novalidate><input type="hidden" name="f" value="${f.id}"><input type="hidden" name="i" value="${d.i}">${fi('hold', 'why', 'What more information do you need?', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Put on hold</button></div></form>`,
    );
  }
  t.state = d.v;
  notify(p.owner, `Tranche ${+d.i + 1} (${t.stage}): ${d.v}`, 'funding');
  audit('Tranche ' + d.v, f.id, t.stage);
  if (d.v === 'Summary accepted' && +d.i === 2) {
    f.status = 'Fully released';
    toast('All tranches released and recorded.');
  }
  ok();
};
F.hold = d => {
  if (!validate('hold', d, { why: ['req'] })) return render();
  const f = byId('funding', d.f);
  const t = f.tranches[d.i];
  t.state = 'On hold';
  t.hold = d.why;
  notify(byId('projects', f.project).owner, 'Next tranche on hold: ' + d.why, 'funding');
  audit('Tranche on hold', f.id, d.why);
  UI.modal = null;
  clearF('hold');
  ok();
};
A.summary = d => {
  const f = byId('funding', d.f);
  const t = f.tranches[d.i];
  clearF('sum');
  UI.form.sum = { t: t.summary };
  modal(
    `${t.stage === 'Room' ? WL() : t.stage} stage progress summary`,
    () =>
      `<form data-f="sum" class="col fgap" novalidate><input type="hidden" name="f" value="${f.id}"><input type="hidden" name="i" value="${d.i}">${t.hold ? banner('warn', 'Sponsor asked for more information', h(t.hold)) : ''}${fi('sum', 't', 'Progress summary for the sponsor', { type: 'textarea', rows: 5, req: true, help: 'Only include information approved for sponsor visibility. Use only evidence you have released to funders.' })}${+d.i === 2 ? banner('info', 'Final summary', 'Include approved outcomes and evidence.') : ''}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit to sponsor</button></div></form>`,
  );
};
F.sum = d => {
  if (!validate('sum', d, { t: ['req', ['min', 30]] })) return render();
  const f = byId('funding', d.f);
  const t = f.tranches[d.i];
  t.summary = d.t;
  t.state = 'Summary submitted';
  t.hold = null;
  notify(f.sponsor, 'Progress summary submitted for ' + byId('projects', f.project).title, 'funding', {
    tab: 'funded',
  });
  audit('Progress summary submitted', f.id, t.stage);
  UI.modal = null;
  clearF('sum');
  ok();
};
A.pitchNew = () => {
  clearF('pit');
  modal(
    'Pitch a sponsor',
    () =>
      `<form data-f="pit" class="col fgap" novalidate>${fi('pit', 'project', 'Project', { type: 'select', req: true, ph: 'Select', opts: S.projects.filter(p => p.owner === myId() && p.status === 'Accepted').map(p => [p.id, p.title]) })}${fi('pit', 'to', 'Sponsor', { type: 'select', req: true, ph: 'Select', opts: S.assign.filter(a => a.ctx === ctxId() && roleBase(a.role) === 'S').map(a => [a.pid, P(a.pid).name]) })}${fi('pit', 'amount', 'Funding needed (USD)', { type: 'number', req: true, min: 1 })}${fi('pit', 'text', 'Pitch: problem, proposed solution, expected impact, requirements', { type: 'textarea', rows: 5, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send pitch</button></div></form>`,
  );
};
F.pit = d => {
  if (!validate('pit', d, { project: ['req'], to: ['req'], amount: ['req', 'num'], text: ['req', ['min', 40]] }))
    return render();
  S.pitches.push({
    id: uid('pi'),
    from: myId(),
    to: d.to,
    project: d.project,
    amount: +d.amount,
    status: 'Sent',
    at: today(),
    text: d.text,
  });
  notify(d.to, 'New pitch from ' + me().name, 'funding', { tab: 'pitches' });
  audit('Pitch sent', d.project, d.to);
  UI.modal = null;
  clearF('pit');
  ok();
};
// ---------- PAYMENTS, ENTITLEMENTS, SEATS (E11, F10) ----------
route('billing', 'payments', () => {
  const r = role();
  const t = tabs(
    'bill',
    [
      ['access', 'My access'],
      r === 'O' && ['org', 'Institution seats'],
      r === 'A' && ['products', 'Products'],
      r === 'A' && ['ents', 'Entitlements'],
      r === 'A' && ['seats', 'Seat pools'],
      r === 'A' && ['events', 'Payment events'],
    ],
    UI.p.tab || (r === 'A' ? 'products' : r === 'O' ? 'org' : 'access'),
  );
  let body = '';
  if (t.cur === 'access') {
    const es = S.ents.filter(e => e.pid === myId());
    const rel = S.products.filter(p => p.status === 'Released' && !['pd5', 'pd1'].includes(p.id));
    body = `<div class="g12">${!es.some(e => e.ctx === ctxId() && ['Active', 'Grace'].includes(e.state)) ? `<div class="c12">${banner('info', 'No access product in this context yet', 'You can still use the core collaboration features while your programme or a sponsor arranges access. Choose an option below if you want individual access.')}</div>` : ''}${card(
      'My entitlements',
      'Paid and sponsored entitlements combine; expiry of one never cancels the other.',
      dataView('bill:mine', {
        label: 'entitlements',
        items: es,
        search: e => byId('products', e.product).name + ' ' + e.source + ' ' + e.state,
        quick: { label: 'State', options: [...new Set(es.map(e => e.state))].map(v => [v, v]), test: (e, v) => e.state === v },
        sorts: [['until', 'Ends soonest', (a, b) => String(a.until).localeCompare(String(b.until))]],
        defaultSort: 'until',
        row: e => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic('card', 18)}</span>`,
          title: h(byId('products', e.product).name),
          sub: h(S.contexts.find(c => c.id === e.ctx).name),
          meta: ['Source <b>' + h(e.source) + '</b>', 'Until ' + fmt(e.until)],
          badges: pill(e.state),
          primary: ['pd2', 'pd3'].includes(e.product) ? B('Billing portal', 'portal', { id: e.id }) : '',
        }),
        empty: ['card', 'No entitlements yet', 'Access you buy, or that a sponsor or your programme grants, appears here.', ''],
      }),
      '',
      'c12 bill-ents',
    )}
  ${card(
    'Receipts and transactions',
    'Read-only. Invoices and receipts are held by the payment provider.',
    dataView('bill:receipts', {
      label: 'transactions',
      items: S.payments.filter(p => p.pid === myId() && !p.dup),
      search: p => p.id + ' ' + (byId('products', p.product)?.name || p.product) + ' ' + p.state,
      quick: { label: 'Status', options: [...new Set(S.payments.filter(p => p.pid === myId() && !p.dup).map(p => p.state))].map(v => [v, v]), test: (p, v) => p.state === v },
      sorts: [['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))], ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))]],
      layout: 'table',
      dense: true,
      columns: [
        { label: 'Reference', cell: p => `<span class="mono">${h(p.id)}</span>` },
        { label: 'Product', cell: p => h(byId('products', p.product)?.name || p.product) },
        { label: 'Status', cell: p => pill(p.state) },
        { label: 'Date', sort: 'new', cell: p => fmt(p.at) },
      ],
      empty: ['inbox', 'No transactions yet', 'Payments, refunds and cancellations appear here once the provider confirms them.', ''],
    }),
    '',
    'c12 bill-tx',
  )}
  ${card(
    'Get access',
    'Checkout happens on the provider-hosted page. PHOENIX never sees card details.',
    dataView('bill:offer', {
      label: 'products',
      items: rel,
      search: p => p.name + ' ' + p.kind + ' ' + p.ent,
      quick: { label: 'Type', options: [...new Set(rel.map(p => p.kind))].map(v => [v, v]), test: (p, v) => p.kind === v },
      sorts: [['name', 'Name', (a, b) => a.name.localeCompare(b.name)]],
      defaultSort: 'name',
      row: p => ({
        lead: `<span class="tile t-soft" aria-hidden="true">${ic('coin', 18)}</span>`,
        title: h(p.name),
        sub: h(p.ent),
        meta: ['Type <b>' + h(p.kind) + '</b>', 'Price <b>' + h(p.price) + '</b>'],
        primary: B(p.kind === 'Donation' ? 'Donate' : 'Choose', 'checkout', { id: p.id }, 'btn-s btn-sm'),
      }),
      empty: ['coin', 'Nothing to choose from yet', 'Released products appear here.', ''],
    }),
    '',
    'c12 bill-price',
  )}
  <div class="c12">${banner('info', 'Never dependent on payment', 'Consent controls, withdrawal, correction, appeal, incident reporting, your own records, permitted export and privacy rights. Payment never buys reviewer status, authority, visibility or matching priority.')}</div></div>`;
  }
  if (r === 'S' && t.cur === 'access')
    body = banner('info', 'Your sponsorship', `Seat pools, utilisation, invoices and receipts are under ${L('Sponsorship', 'funding', { tab: 'seats' })}. Sponsors see seat counts only, never seat holders.`) + body;
  if (t.cur === 'org') {
    const pools = S.seatPools.filter(s => s.sponsor === myId());
    body =
      pools
        .map(sp =>
          card(
            `Seat pool · ${h(S.contexts.find(c => c.id === sp.ctx).name)}`,
            `${sp.assigned.length} of ${sp.total} assigned · until ${fmt(sp.until)} · ${h(sp.status)}`,
            `<div class="seat-meter"><div class="seat-meter-h"><span class="fig">${sp.assigned.length}<span class="fig-of"> / ${sp.total}</span></span><span class="cap">seats assigned · ${sp.total - sp.assigned.length} available</span></div><div class="progress" role="img" aria-label="${sp.assigned.length} of ${sp.total} seats assigned"><div class="bar" style="width:${(sp.assigned.length / sp.total) * 100}%"></div></div></div>${(() => {
              const est = pid => (S.ents.find(e => e.pid === pid && e.source.includes(sp.id)) || { state: 'Active' }).state;
              return dataView('bill:pool:' + sp.id, {
                label: 'seat holders',
                items: sp.assigned,
                search: pid => P(pid).name,
                quick: { label: 'Entitlement', options: [...new Set(sp.assigned.map(est))].map(v => [v, v]), test: (pid, v) => est(pid) === v },
                sorts: [['name', 'Name', (a, b) => P(a).name.localeCompare(P(b).name)]],
                defaultSort: 'name',
                row: pid => {
                  const e = S.ents.find(e => e.pid === pid && e.source.includes(sp.id));
                  return {
                    lead: `<span class="av" aria-hidden="true">${ini(pid)}</span>`,
                    title: nm(pid),
                    sub: h(P(pid).email || ''),
                    badges: pill(est(pid)),
                    primary:
                      (e && e.state === 'Suspended'
                        ? B('Reactivate', 'seat', { sp: sp.id, pid, v: 'Active' })
                        : CB('Suspend', 'seat', { sp: sp.id, pid, v: 'Suspended' }, 'Suspend the sponsored seat for ' + P(pid).name + '? Sponsored access pauses; consent, correction and export rights continue.')) +
                      CB('Release seat', 'seat', { sp: sp.id, pid, v: 'release' }, 'Release this seat? ' + P(pid).name + ' loses the sponsored entitlement and the seat returns to the pool.'),
                  };
                },
                empty: ['users', 'No seats assigned yet', 'Use “Assign seat” to give a participant a sponsored seat.', ''],
              });
            })()}`,
            B(ic('plus', 14) + 'Assign seat', 'seatAssign', { sp: sp.id }, 'btn-p btn-sm'),
            'bill-pool',
          ),
        )
        .join('') +
      (r === 'O'
        ? card(
            'Request an institution-specific package',
            'Products and prices are set by the Finance Owner.',
            `<form data-f="pkg" class="col fgap" novalidate>${fi('pkg', 'seats', 'Seats needed', { type: 'number', req: true, min: 1 })}${fi('pkg', 'note', 'Requirements', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send request</button></div></form>`,
          )
        : card(
            'Sponsor more seats or donate',
            '',
            `<div class="row wrap">${B('Buy a seat pool (invoice)', 'checkout', { id: 'pd5' })}${B('Donate', 'checkout', { id: 'pd6' })}</div><p class="cap bill-note">A donation grants no entitlement. Sponsors receive only authorised aggregate reporting.</p>`,
          )) +
      card(
        'Transactions',
        'Read-only',
        dataView('bill:tx', {
      label: 'transactions',
      items: S.payments.filter(p => p.pid === myId()),
      search: p => p.id + ' ' + (byId('products', p.product)?.name || p.product) + ' ' + p.state,
      quick: { label: 'Status', options: [...new Set(S.payments.filter(p => p.pid === myId()).map(p => p.state))].map(v => [v, v]), test: (p, v) => p.state === v },
      sorts: [['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))], ['old', 'Oldest first', (a, b) => String(a.at).localeCompare(String(b.at))]],
      layout: 'table',
      dense: true,
      columns: [
        { label: 'Reference', cell: p => `<span class="mono">${h(p.id)}</span>` },
        { label: 'Product', cell: p => h(byId('products', p.product)?.name || p.product) },
        { label: 'State', cell: p => pill(p.state) },
        { label: 'Date', sort: 'new', cell: p => fmt(p.at) },
      ],
      empty: ['inbox', 'No transactions yet', 'Payments, refunds and cancellations appear here once the provider confirms them.', ''],
    }),
      );
  }
  if (t.cur === 'products')
    body = card(
      'Product catalogue',
      'Finance Owner approves and releases; Programme Administrator drafts. Pricing policy is set by Finance.',
      dataView('bill:products', {
        label: 'products',
        items: S.products,
        search: p => p.name + ' ' + p.kind + ' ' + p.ent + ' ' + p.price,
        quick: { label: 'Status', options: [...new Set(S.products.map(p => p.status))].map(v => [v, v]), test: (p, v) => p.status === v },
        filters: [
          { key: 'kind', label: 'Type', options: [...new Set(S.products.map(p => p.kind))].map(v => [v, v]), test: (p, v) => p.kind === v },
          { key: 'cycle', label: 'Billing cycle', options: [...new Set(S.products.map(p => p.cycle))].map(v => [v, v]), test: (p, v) => p.cycle === v },
        ],
        sorts: [['name', 'Name', (a, b) => a.name.localeCompare(b.name)], ['kind', 'Type', (a, b) => a.kind.localeCompare(b.kind)]],
        defaultSort: 'name',
        row: p => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic('coin', 18)}</span>`,
          title: h(p.name),
          sub: h(p.ent),
          meta: ['Type <b>' + h(p.kind) + '</b>', 'Price <b>' + h(p.price) + '</b>', 'Cycle ' + h(p.cycle)],
          badges: pill(p.status),
          primary: prodAct(p),
        }),
        empty: ['coin', 'No products yet', 'Draft a product; the Finance Owner approves and releases it.', ''],
      }),
      B(ic('plus', 14) + 'Draft product', 'prodNew', {}, 'btn-p btn-sm'),
      'bill-prod',
    );
  if (t.cur === 'ents')
    body = card(
      'Entitlements',
      'Pending · Active · Grace · Suspended · Cancelled · Expired · Refunded',
      dataView('bill:ents', {
        label: 'entitlements',
        items: S.ents,
        search: e => P(e.pid).name + ' ' + byId('products', e.product).name + ' ' + e.source,
        quick: { label: 'State', options: ['Active', 'Grace', 'Suspended', 'Cancelled', 'Expired', 'Refunded', 'Pending'].filter(v => S.ents.some(e => e.state === v)).map(v => [v, v]), test: (e, v) => e.state === v },
        filters: [
          { key: 'prod', label: 'Product', options: [...new Set(S.ents.map(e => e.product))].map(v => [v, byId('products', v).name]), test: (e, v) => e.product === v },
          { key: 'src', label: 'Source', options: [['Seat pool', 'Seat pool'], ['Card payment', 'Card payment'], ['Admin grant', 'Admin grant']], test: (e, v) => e.source.startsWith(v) },
        ],
        sorts: [
          ['until', 'Ends soonest', (a, b) => String(a.until).localeCompare(String(b.until))],
          ['person', 'Person', (a, b) => P(a.pid).name.localeCompare(P(b.pid).name)],
        ],
        defaultSort: 'until',
        row: e => ({
          lead: `<span class="av" aria-hidden="true">${ini(e.pid)}</span>`,
          title: nm(e.pid),
          sub: h(byId('products', e.product).name),
          meta: ['Source <b>' + h(e.source) + '</b>', 'Until ' + fmt(e.until)],
          badges: pill(e.state),
          primary: B('Revoke', 'entRevoke', { id: e.id }),
        }),
        empty: ['card', 'No entitlements yet', 'Use “Grant access” to give someone access.', ''],
      }),
      B(ic('plus', 14) + 'Grant access', 'entGrant', {}, 'btn-p btn-sm'),
      'bill-ents',
    );
  if (t.cur === 'seats')
    body = card(
      'Seat pools',
      '',
      dataView('bill:seats', {
        label: 'seat pools',
        items: S.seatPools,
        search: s => P(s.sponsor).name + ' ' + S.contexts.find(c => c.id === s.ctx).name,
        quick: { label: 'Status', options: [...new Set(S.seatPools.map(s => s.status))].map(v => [v, v]), test: (s, v) => s.status === v },
        sorts: [
          ['until', 'Ends soonest', (a, b) => String(a.until).localeCompare(String(b.until))],
          ['seats', 'Seats', (a, b) => a.total - b.total],
          ['sponsor', 'Sponsor', (a, b) => P(a.sponsor).name.localeCompare(P(b.sponsor).name)],
        ],
        defaultSort: 'until',
        row: s => ({
          lead: `<span class="av" aria-hidden="true">${ini(s.sponsor)}</span>`,
          title: nm(s.sponsor),
          sub: h(S.contexts.find(c => c.id === s.ctx).name),
          meta: ['Seats <b>' + s.assigned.length + ' / ' + s.total + '</b>', 'Until ' + fmt(s.until)],
          badges: pill(s.status),
          primary:
            s.status === 'Pending'
              ? hasB('Finance Owner')
                ? B('Confirm invoice paid · activate', 'poolActivate', { id: s.id }, 'btn-p btn-sm')
                : '<span class="cap">Needs Finance Owner</span>'
              : '',
        }),
        empty: ['users', 'No seat pools yet', 'Use “Create seat pool” for a sponsor’s seats.', ''],
      }),
      B(ic('plus', 14) + 'Create seat pool', 'poolNew', {}, 'btn-p btn-sm'),
      'bill-seats',
    );
  if (t.cur === 'events')
    body = card(
      'Webhook events',
      'Signature verified; duplicates processed once; out-of-order events reconciled against provider state.',
      dataView('bill:events', {
        label: 'events',
        items: S.payments.map((p, i) => ({ p, i })),
        search: ({ p }) => p.id + ' ' + P(p.pid).name + ' ' + p.type + ' ' + p.state,
        quick: {
          label: 'Processed',
          options: [['pending', 'Pending'], ['done', 'Done'], ['dup', 'Duplicate']],
          test: ({ p }, v) => (v === 'dup' ? !!p.dup : v === 'done' ? !p.dup && !!p.processed : !p.dup && !p.processed),
        },
        filters: [{ key: 'type', label: 'Type', options: [...new Set(S.payments.map(p => p.type))].map(v => [v, v]), test: ({ p }, v) => p.type === v }],
        sorts: [['new', 'Newest first', (a, b) => String(b.p.at).localeCompare(String(a.p.at))]],
        rowId: ({ i }) => String(i),
        layout: 'table',
        dense: true,
        columns: [
          { label: 'Event', cell: ({ p }) => `<span class="mono">${h(p.id)}</span>` },
          { label: 'Person', cell: ({ p }) => nm(p.pid) },
          { label: 'Type', hideSm: true, cell: ({ p }) => h(p.type) },
          { label: 'Resulting state', cell: ({ p }) => pill(p.state) },
          { label: 'Processed', cell: ({ p }) => (p.dup ? pill('Duplicate — ignored', 'p-grey') : p.processed ? pill('Done') : pill('Pending')) },
          { label: '', cell: ({ p, i }) => (!p.processed && !p.dup ? B('Process', 'procEvt', { i }) : '') },
        ],
        empty: ['inbox', 'No payment events yet', 'Provider webhook events appear here.', ''],
      }),
      hasB('Finance Owner')
        ? B('Reconcile with provider', 'reconcile', {}, 'btn-p btn-sm') +
            B('Simulate renewal failure', 'simRenewFail', {})
        : '',
      'bill-evt',
    );
  return (
    head(
      r === 'A' ? 'Products & payments' : r === 'S' ? 'Seats & payments' : 'Access & billing',
      'Commercial entitlement never confers authority, trust, visibility or access to restricted records.',
    ) +
    t.html +
    '<div class="fund-stack bill">' +
    body +
    '</div>'
  );
});
function prodAct(p) {
  return p.status === 'Draft'
    ? hasB('Finance Owner')
      ? B('Approve & release', 'prodRel', { id: p.id }, 'btn-p btn-sm')
      : '<span class="cap">Needs Finance Owner</span>'
    : p.status === 'Released' && hasB('Finance Owner')
      ? CB('Retire', 'prodRetire', { id: p.id }, 'Retire ' + p.name + '? It leaves checkout; existing entitlements are not affected.')
      : '';
}
A.checkout = d => {
  const p = byId('products', d.id);
  modal(
    'Checkout',
    `<div class="card quiet chk-sum">${dl([
      ['Product', h(p.name)],
      ['Price', h(p.price)],
      ['Billing', h(p.cycle)],
    ])}</div>${p.kind === 'Donation' ? fi('don', 'amt', 'Donation amount (USD)', { type: 'number', min: 1, value: '50' }) : ''}<p class="cap">You are on the payment provider’s page. PHOENIX receives only a verified event.</p><div class="row wrap">${B('Payment fails', 'payResult', { id: p.id, v: 'fail' })}${B('Cancel', 'payResult', { id: p.id, v: 'cancel' })}${B('Pay successfully', 'payResult', { id: p.id, v: 'ok' }, 'btn-p btn-sm')}</div>`,
  );
};
A.payResult = d => {
  const p = byId('products', d.id);
  const ev = { id: 'evt_' + uid(''), pid: myId(), product: p.id, at: today(), processed: true };
  if (d.v === 'fail') {
    ev.type = 'payment_failed';
    ev.state = 'Failed';
    S.payments.push(ev);
    audit('Payment failed', ev.id, '');
    UI.modal = null;
    toast('Payment failed. No entitlement was created. You can try again.', 'err');
    return ok();
  }
  if (d.v === 'cancel') {
    ev.type = 'checkout_cancelled';
    ev.state = 'Cancelled';
    S.payments.push(ev);
    UI.modal = null;
    toast('Checkout cancelled.', 'warn');
    return ok();
  }
  ev.type = 'payment_succeeded';
  ev.state = 'Successful';
  S.payments.push(ev);
  S.payments.push({ ...ev, processed: false, dup: true });
  if (p.kind === 'Donation') {
    audit('Donation received', ev.id, 'No entitlement');
    UI.modal = null;
    toast('Thank you. Receipt issued. Donations do not create an entitlement.');
    return ok();
  }
  if (p.id === 'pd5') {
    S.seatPools.push({
      id: uid('sp'),
      sponsor: myId(),
      org: me().org,
      ctx: ctxId(),
      total: 10,
      assigned: [],
      until: '2027-09-30',
      status: 'Pending',
    });
    audit('Invoice requested', ev.id, 'Seat pool pending invoice');
    UI.modal = null;
    toast('Invoice requested. The seat pool activates when an administrator confirms payment.');
    return ok();
  }
  const until = new Date();
  until.setMonth(until.getMonth() + (p.cycle === 'Annual' ? 12 : p.cycle === 'Monthly' ? 1 : 3));
  S.ents.push({
    id: uid('en'),
    pid: myId(),
    ctx: ctxId(),
    product: p.id,
    source: 'Card payment (provider-hosted) ' + ev.id,
    state: 'Active',
    until: until.toISOString().slice(0, 10),
  });
  notify(myId(), 'Receipt: ' + p.name, 'billing');
  audit('Verified webhook → entitlement Active', ev.id, p.name + ' (duplicate event ignored)');
  UI.modal = null;
  toast('Payment verified. Entitlement active.');
  ok();
};
A.portal = d => {
  const e = byId('ents', d.id);
  modal(
    'Billing portal',
    `${dl([
      ['Product', h(byId('products', e.product).name)],
      ['State', pill(e.state)],
      ['Renews', fmt(e.until)],
    ])}<div class="row wrap">${e.state === 'Grace' ? B('Update payment method and retry', 'entSet', { id: e.id, v: 'Active' }, 'btn-p btn-sm') : ''}${B('Cancel subscription', 'entSet', { id: e.id, v: 'Cancelled' })}${B('Request refund', 'entSet', { id: e.id, v: 'Refunded' })}</div><p class="cap">Invoices and receipts are kept by the provider.</p>`,
  );
};
A.entSet = d => {
  const e = byId('ents', d.id);
  e.state = d.v;
  S.payments.push({
    id: 'evt_' + uid(''),
    pid: e.pid,
    product: e.product,
    type: d.v === 'Active' ? 'payment_succeeded' : d.v === 'Refunded' ? 'refund' : 'subscription_cancelled',
    state: d.v === 'Active' ? 'Successful' : d.v,
    at: today(),
    processed: true,
  });
  audit('Entitlement ' + d.v, e.id, '');
  UI.modal = null;
  ok();
};
A.simRenewFail = () => {
  const e =
    S.ents.find(e => e.state === 'Active' && ['pd2', 'pd3'].includes(e.product)) ||
    S.ents.find(e => e.state === 'Grace');
  if (!e) {
    toast('No subscription to fail.', 'warn');
    return render();
  }
  if (e.state === 'Grace') {
    e.state = 'Expired';
    toast('Grace ended → Expired.');
  } else {
    e.state = 'Grace';
    toast('Renewal failed → Grace.');
  }
  notify(e.pid, 'Subscription ' + e.state.toLowerCase(), 'billing');
  audit('Renewal event', e.id, e.state);
  ok();
};
A.procEvt = d => {
  S.payments[d.i].processed = true;
  audit('Webhook processed', S.payments[d.i].id, '');
  ok();
};
A.reconcile = () => {
  let n = 0;
  S.payments.forEach(p => {
    if (!p.processed && !p.dup) {
      p.processed = true;
      n++;
    }
  });
  audit('Payments reconciled with provider', 'Finance', 'corrected ' + n);
  toast('Reconciled. ' + n + ' event(s) corrected.');
  ok();
};
A.prodNew = () => {
  clearF('prod');
  modal(
    'Draft a product',
    () =>
      `<form data-f="prod" class="col fgap" novalidate>${fi('prod', 'name', 'Name', { req: true })}${fi('prod', 'kind', 'Type', { type: 'select', req: true, opts: ['One-time payment', 'Monthly subscription', 'Annual subscription', 'Donation', 'Sponsored access', 'Invoice'] })}<div class="f2">${fi('prod', 'price', 'Price', { req: true, help: 'Set by the Finance Owner' })}${fi('prod', 'cycle', 'Billing cycle', { type: 'select', opts: ['One-time', 'Monthly', 'Annual', '—'] })}</div>${fi('prod', 'ent', 'Entitlement', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save draft</button></div></form>`,
  );
};
F.prod = d => {
  if (!validate('prod', d, { name: ['req'], price: ['req'], ent: ['req'] })) return render();
  S.products.push({ id: uid('pd'), ...d, status: 'Draft' });
  audit('Product drafted', d.name, '');
  UI.modal = null;
  clearF('prod');
  ok();
};
A.prodRel = d => {
  byId('products', d.id).status = 'Released';
  audit('Product approved & released', d.id, 'Finance Owner');
  ok();
};
A.prodRetire = d => {
  byId('products', d.id).status = 'Retired';
  audit('Product retired', d.id, '');
  ok();
};
A.entGrant = () => {
  clearF('eg');
  modal(
    'Grant access',
    () =>
      `<form data-f="eg" class="col fgap" novalidate>${fi('eg', 'pid', 'Person', { type: 'select', req: true, ph: 'Select', opts: S.assign.filter(a => a.ctx === ctxId() && a.status === 'Active').map(a => [a.pid, P(a.pid).name]) })}${fi('eg', 'product', 'Product', { type: 'select', req: true, opts: S.products.filter(p => p.status === 'Released').map(p => [p.id, p.name]) })}${fi('eg', 'until', 'Until', { type: 'date', req: true })}${fi('eg', 'why', 'Reason (recorded)', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Grant</button></div></form>`,
  );
};
F.eg = d => {
  if (!validate('eg', d, { pid: ['req'], product: ['req'], until: ['req', 'date'], why: ['req'] })) return render();
  S.ents.push({
    id: uid('en'),
    pid: d.pid,
    ctx: ctxId(),
    product: d.product,
    source: 'Admin grant: ' + d.why,
    state: 'Active',
    until: d.until,
  });
  notify(d.pid, 'Access granted: ' + byId('products', d.product).name, 'billing');
  audit('Entitlement granted', d.pid, d.why);
  UI.modal = null;
  clearF('eg');
  ok();
};
A.entRevoke = d => {
  const e = byId('ents', d.id);
  clearF('er');
  modal(
    'Revoke entitlement',
    () =>
      `<form data-f="er" class="col fgap" novalidate><input type="hidden" name="id" value="${e.id}">${fi('er', 'why', 'Reason (recorded)', { req: true })}${banner('info', '', 'Consent, correction, appeal and export rights survive revocation.')}<div class="actions"><span></span><button class="btn btn-d" type="submit">Revoke</button></div></form>`,
  );
};
F.er = d => {
  if (!validate('er', d, { why: ['req'] })) return render();
  const e = byId('ents', d.id);
  e.state = 'Cancelled';
  e.source += ' · revoked: ' + d.why;
  notify(e.pid, 'An entitlement was revoked', 'billing');
  audit('Entitlement revoked', e.id, d.why);
  UI.modal = null;
  clearF('er');
  ok();
};
A.poolNew = () => {
  clearF('pool');
  modal(
    'Create seat pool',
    () =>
      `<form data-f="pool" class="col fgap" novalidate>${fi('pool', 'sponsor', 'Sponsor / institution contact', { type: 'select', req: true, opts: S.assign.filter(a => a.ctx === ctxId() && ['S', 'O'].includes(roleBase(a.role))).map(a => [a.pid, P(a.pid).name]) })}${fi('pool', 'total', 'Seats', { type: 'number', req: true, min: 1 })}${fi('pool', 'until', 'Valid until', { type: 'date', req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Create</button></div></form>`,
  );
};
F.pool = d => {
  if (!validate('pool', d, { sponsor: ['req'], total: ['req', 'num'], until: ['req', 'date'] })) return render();
  S.seatPools.push({
    id: uid('sp'),
    sponsor: d.sponsor,
    org: P(d.sponsor).org,
    ctx: ctxId(),
    total: +d.total,
    assigned: [],
    until: d.until,
    status: 'Active',
  });
  audit('Seat pool created', d.sponsor, d.total);
  UI.modal = null;
  clearF('pool');
  ok();
};
A.seatAssign = d => {
  const sp = byId('seatPools', d.sp);
  if (sp.assigned.length >= sp.total) return deny('no seats left in this pool');
  const c = S.assign.filter(
    a => a.ctx === sp.ctx && roleBase(a.role) === 'P' && a.status === 'Active' && !sp.assigned.includes(a.pid),
  );
  modal(
    'Assign a seat',
    `<form data-f="sa" class="col fgap"><input type="hidden" name="sp" value="${sp.id}">${c.length ? fi('sa', 'pid', 'Participant', { type: 'select', opts: c.map(a => [a.pid, P(a.pid).name]) }) : '<p class="cap">No eligible participants without a seat.</p>'}${c.length ? '<div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div>' : ''}</form>`,
  );
};
F.sa = d => {
  const sp = byId('seatPools', d.sp);
  sp.assigned.push(d.pid);
  if (sp.assignedCount != null) sp.assignedCount++;
  if (sp.activeCount != null) sp.activeCount++;
  S.ents.push({
    id: uid('en'),
    pid: d.pid,
    ctx: sp.ctx,
    product: 'pd1',
    source: 'Seat pool ' + sp.id,
    state: 'Active',
    until: sp.until,
  });
  notify(d.pid, 'You were assigned a sponsored seat', 'billing');
  audit('Seat assigned', sp.id, d.pid);
  UI.modal = null;
  ok();
};
A.seat = d => {
  const sp = byId('seatPools', d.sp);
  const e = S.ents.find(e => e.pid === d.pid && e.source.includes(sp.id));
  const wasActive = !e || e.state === 'Active';
  if (d.v === 'release') {
    sp.assigned = sp.assigned.filter(p => p !== d.pid);
    if (e) e.state = 'Cancelled';
    if (sp.assignedCount != null) sp.assignedCount = Math.max(0, sp.assignedCount - 1);
  } else if (e) e.state = d.v;
  // keep the sponsor-facing aggregate in step with the named change
  if (sp.activeCount != null) sp.activeCount = Math.max(0, sp.activeCount + (d.v === 'Active' ? (wasActive ? 0 : 1) : wasActive ? -1 : 0));
  notify(d.pid, 'Your sponsored seat was ' + (d.v === 'release' ? 'released' : d.v === 'Active' ? 'reactivated' : 'suspended'), 'billing');
  audit('Seat ' + d.v, sp.id, d.pid);
  ok();
};
F.pkg = d => {
  if (!validate('pkg', d, { seats: ['req', 'num'], note: ['req'] })) return render();
  S.assign
    .filter(a => a.bundles.includes('Finance Owner'))
    .forEach(a => notify(a.pid, `Package request from ${me().name}: ${d.seats} seats`, 'billing', { tab: 'products' }));
  audit('Institution package requested', me().org, d.seats + ' seats');
  clearF('pkg');
  toast('Request sent to the Finance Owner.');
  ok();
};

A.poolActivate = d => {
  const sp = byId('seatPools', d.id);
  sp.status = 'Active';
  const isSp = S.assign.some(a => a.pid === sp.sponsor && roleBase(a.role) === 'S');
  notify(sp.sponsor, 'Your seat pool is active: ' + sp.total + ' seats until ' + fmt(sp.until), isSp ? 'funding' : 'billing', isSp ? { tab: 'seats' } : {});
  audit('Seat pool activated against invoice', sp.id, 'Finance Owner');
  toast('Seat pool activated.');
  ok();
};
