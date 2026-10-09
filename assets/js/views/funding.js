// ---------- SPONSOR PROJECT FUNDING (5.5, D-02, F10) ----------
const STAGE_ORDER = ['Circle', 'Rope Team', 'Room', 'Final review', 'Closed'];
const stageReached = (p, stage) => p.stage && STAGE_ORDER.indexOf(p.stage) >= STAGE_ORDER.indexOf(stage);
const sponsorMatch = (p, ints) => (p.tags || []).filter(t => ints.includes(t.toLowerCase()));
function sponsorProgress(p) {
  const rm = byId('rooms', p.room);
  const ms = rm ? rm.milestones : [];
  return h(stageLabel(p.stage || 'Accepted')) + ' stage' + (ms.length ? ' · ' + ms.filter(m => m.status === 'Achieved').length + ' of ' + ms.length + ' milestones achieved' : '');
}
function sponsorProjects(all) {
  const ints = (S.interests[myId()] || []).map(x => x.toLowerCase());
  return S.projects.filter(p => inCtx(p) && p.status === 'Accepted' && p.stage !== 'Closed' && (all || sponsorMatch(p, ints).length));
}
function sponsorBrief(p) {
  const ev = S.evidence
    .filter(e => e.linked.includes(p.id) || e.linked.includes(p.room) || e.linked.includes(p.circle))
    .filter(e => e.release === 'Approved for funder release');
  return (
    dl([
      ['Overview', h(p.title) + ' · ' + h(p.type)],
      ['Problem / need', h(p.sections ? p.sections[0].text : p.desc || '—')],
      ['Objectives and expected outcomes', `<span class="pre-line">${h(p.sections ? p.sections[1].text : '—')}</span>`],
      ['Requirements', h(p.sections ? p.sections[2].text.split('\n')[0] : '—')],
      ['Areas', (p.tags || []).map(t => pill(t, 'p-grey')).join(' ') || '—'],
      ['Funding requirement', p.fundingNeed ? money('USD', p.fundingNeed) : 'Not stated'],
      ['Progress', sponsorProgress(p)],
      ['Status', pill(p.status) + ' ' + (p.stage ? pill(p.stage === 'Room' ? WL() : p.stage, SC[p.stage]) : '')],
      [
        'Team',
        'Project owner + ' +
          (byId('circles', p.circle) || { members: [] }).members.length +
          ' Circle members (names not shared)',
      ],
      ['Skills involved', h(p.sections ? p.sections[3].text.split('\n')[0] : '—')],
      ['Approved evidence', ev.map(e => h(e.title) + ' (' + e.level + ')').join(', ') || 'None released to funders'],
    ]) +
    banner(
      'info',
      '',
      'Sponsor-visible information only. Private profiles, Purpose Compass, conversations and unapproved evidence are never shown.',
    )
  );
}
route('funding', 'funding', () => {
  const r = role();
  if (r === 'S') {
    const t = tabs(
      'fund',
      [
        ['discover', 'Discover projects'],
        ['pitches', 'Pitches', S.pitches.filter(p => p.to === myId() && p.status === 'Sent').length],
        ['funded', 'My funding'],
        ['initiatives', 'Initiatives', S.initiatives.filter(i => i.status === 'Published').length],
      ],
      UI.p.tab,
    );
    const ints = (S.interests[myId()] || []).map(x => x.toLowerCase());
    let body = '';
    if (t.cur === 'discover') {
      // all eligible projects not yet funded by me; "Matching my interests" is a standard filter, on by default
      const ps = sponsorProjects(true).filter(p => !S.funding.some(f => f.project === p.id && f.sponsor === myId()));
      if (!UI.dv['fund:discover']) UI.dv['fund:discover'] = { f: { show: 'match' } };
      body =
        card('Projects you can fund', 'Your interests: ' + (ints.map(h).join(', ') || 'none set') + '. Matching is by stated interest only. No automated funding decisions.', dataView('fund:discover', {
          label: 'projects',
          items: ps,
          search: p => p.title + ' ' + (p.type || '') + ' ' + (p.tags || []).join(' '),
          quick: { label: 'Stage', options: ['Circle', 'Rope Team', 'Room'].filter(x => ps.some(p => p.stage === x)).map(x => [x, stageLabel(x)]), test: (p, v) => p.stage === v },
          filters: [
            { key: 'show', label: 'Show', options: [['match', 'Matching my interests']], test: p => sponsorMatch(p, ints).length > 0 },
            { key: 'area', label: 'Area', options: PROJECT_AREAS.map(a => [a, a]), test: (p, v) => (p.tags || []).includes(v) },
            { key: 'need', label: 'Funding requirement', options: [['yes', 'States a funding requirement'], ['no', 'No amount stated']], test: (p, v) => (v === 'yes' ? !!p.fundingNeed : !p.fundingNeed) },
          ],
          sorts: [
            ['need', 'Funding requirement, highest first', (a, b) => (b.fundingNeed || 0) - (a.fundingNeed || 0)],
            ['match', 'Best interest match', (a, b) => sponsorMatch(b, ints).length - sponsorMatch(a, ints).length],
            ['stage', 'Furthest stage', (a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage)],
            ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
          ],
          row: p => {
            const saved = (S.saved[myId()] || []).includes(p.id);
            return {
              lead: `<span class="tile t-soft" aria-hidden="true">${ic('folder', 18)}</span>`,
              title: h(p.title),
              sub: 'Stage: ' + stageLabel(p.stage || '—') + (sponsorMatch(p, ints).length ? ' · matches your interest in ' + sponsorMatch(p, ints).map(h).join(', ') : ''),
              meta: [sponsorProgress(p), (p.tags || []).map(t => pill(t, 'p-grey')).join(' '), `<details class="fdisc-more"><summary>${ic('file', 14)}Sponsor brief</summary><div class="fdisc-brief">${sponsorBrief(p)}</div></details>`],
              badges: `<span class="fdv-need"><span class="fig-l">Funding requirement</span><span class="fig">${p.fundingNeed ? money('USD', p.fundingNeed) : 'Not stated'}</span></span>`,
              primary: saved ? pill('Saved', 'p-teal') : B('Express interest', 'fundInterest', { id: p.id }, 'btn-p btn-sm'),
              menu: (saved ? '' : B(ic('check', 16) + 'Save', 'fundSave', { id: p.id }, 'menu-i')) + B(ic('message', 16) + 'Message project owner', 'dmOpen', { pid: p.owner, project: p.id }, 'menu-i'),
            };
          },
          empty: ['folder', 'No projects match these filters', 'Remove a filter (for example “Show: Matching my interests”), or update your funding interests.', ''],
        }));
    }
    if (t.cur === 'pitches')
      body = (() => {
        const pis = S.pitches.filter(p => p.to === myId());
        return card('Pitches received', '', dataView('fund:pitches', {
          label: 'pitches',
          items: pis,
          search: pi => byId('projects', pi.project).title + ' ' + P(pi.from).name + ' ' + pi.text,
          quick: { label: 'Status', options: [...new Set(pis.map(pi => pi.status))].map(v => [v, v]), test: (pi, v) => pi.status === v },
          sorts: [
            ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
            ['amt', 'Amount, highest first', (a, b) => b.amount - a.amount],
          ],
          row: pi => {
            const p = byId('projects', pi.project);
            return {
              lead: `<span class="tile t-soft" aria-hidden="true">${ic('send', 18)}</span>`,
              title: 'Pitch: ' + h(p.title),
              sub: 'From ' + nm(pi.from) + ' · ' + fmt(pi.at) + ' · requested ' + money('USD', pi.amount),
              meta: [`<span class="fpitch-q">${h(pi.text)}</span>`, `<details class="fdisc-more"><summary>${ic('file', 14)}Sponsor brief</summary><div class="fdisc-brief">${sponsorBrief(p)}</div></details>`],
              badges: pill(pi.status) + `<span class="fdv-need"><span class="fig-l">Requested</span><span class="fig">${money('USD', pi.amount)}</span></span>`,
              primary:
                pi.status === 'Sent'
                  ? B('Fund this project', 'fundInterest', { id: p.id, pitch: pi.id, amount: pi.amount }, 'btn-p btn-sm')
                  : B(ic('message', 14) + 'Message', 'dmOpen', { pid: pi.from, project: p.id }),
              menu:
                pi.status === 'Sent'
                  ? B(ic('message', 16) + 'Message', 'dmOpen', { pid: pi.from, project: p.id }, 'menu-i') +
                    B(ic('check', 16) + 'Save', 'pitchDecide', { id: pi.id, v: 'Saved' }, 'menu-i') +
                    '<div class="menu-sep"></div>' +
                    B(ic('x', 16) + 'Decline', 'pitchDecide', { id: pi.id, v: 'Declined' }, 'menu-i danger')
                  : '',
            };
          },
          empty: ['send', 'No pitches', '', ''],
        }));
      })();
    if (t.cur === 'initiatives') body = initiativesView();
    if (t.cur === 'funded')
      body =
        S.funding
          .filter(f => f.sponsor === myId())
          .map(f => fundCard(f))
          .join('') || empty('coin', 'No funding yet', '');
    body = `<div class="fund-stack">${body}</div>`;
    return (
      head('Projects & funding', 'Funds are released stage by stage, each against the owner’s progress summary.') +
      t.html +
      body
    );
  }
  const fs = S.funding.filter(f => {
    const p = byId('projects', f.project);
    return p && inCtx(p) && (r === 'A' || (r === 'F' && stewardOf(p)) || p.owner === myId());
  });
  const mine = S.projects.filter(p => p.owner === myId() && p.status === 'Accepted' && inCtx(p));
  return (
    head(
      'Funding',
      r === 'P'
        ? 'Pitch sponsors and submit a progress summary at each funded stage.'
        : 'Stage-wise sponsor funding in this context.',
      r === 'P' && mine.length ? B(ic('send', 16) + 'Pitch a sponsor', 'pitchNew', {}, 'btn-p') : '',
    ) +
    `<div class="fund-stack">${fundTotals(fs)}${
      fs.map(f => fundCard(f)).join('') ||
      empty('coin', 'No funding', 'When a sponsor agrees to fund a project, the three tranches appear here.')
    }${
      r === 'P'
        ? card(
            'Pitches sent',
            '',
            dataView('fund:sent', {
              label: 'pitches',
              items: S.pitches.filter(p => p.from === myId()),
              search: p => [String(cName(p.project)).replace(/<[^>]+>/g, ''), P(p.to).name, p.status].join(' '),
              quick: { label: 'Status', options: [...new Set(S.pitches.filter(p => p.from === myId()).map(p => p.status))].map(v => [v, v]), test: (p, v) => p.status === v },
              sorts: [
                ['new', 'Newest first', (a, b) => String(b.at).localeCompare(String(a.at))],
                ['amt', 'Amount', (a, b) => b.amount - a.amount],
              ],
              defaultSort: 'new',
              row: p => ({
                lead: `<span class="tile t-soft" aria-hidden="true">${ic('send', 18)}</span>`,
                title: cName(p.project),
                sub: 'To ' + nm(p.to),
                meta: ['Amount <b>' + money('USD', p.amount) + '</b>', p.at ? 'Sent ' + fmt(p.at) : ''],
                badges: pill(p.status),
              }),
              empty: ['send', 'No pitches sent yet', 'Use “Pitch a sponsor” to send one.', ''],
            }),
            '',
            'fund-pitches',
          )
        : ''
    }</div>`
  );
});
function fundCard(f) {
  const p = byId('projects', f.project);
  const r = role();
  const isS = f.sponsor === myId(),
    isO = p.owner === myId();
  return card(
    h(p.title),
    `${nm(f.sponsor)} · ${h(S.orgs.find(o => o.id === f.org)?.name || '')} · ${money(f.currency, f.total)} · ${h(f.status)}`,
    (() => {
      const rel = f.tranches
        .filter(t => ['Released', 'Summary submitted', 'Summary accepted', 'On hold'].includes(t.state))
        .reduce((a, t) => a + t.amount, 0);
      const seg = { Committed: 'is-c', Released: 'is-r', 'Summary submitted': 'is-r', 'Summary accepted': 'is-a', 'On hold': 'is-h' };
      return `<div class="fsum"><div class="fsum-i"><span class="fig-l">Committed</span><span class="fig">${money(f.currency, f.total)}</span></div><div class="fsum-i"><span class="fig-l">Released</span><span class="fig">${money(f.currency, rel)}</span></div><div class="fsum-i"><span class="fig-l">Still to release</span><span class="fig">${money(f.currency, f.total - rel)}</span></div></div><div class="ftr-w"><div class="ftr-h"><span class="lbl">Released</span><span class="cap">${money(f.currency, rel)} of ${money(f.currency, f.total)}</span></div><div class="ftr" role="img" aria-label="Released ${h(f.currency)} ${rel} of ${h(f.currency)} ${f.total}">${f.tranches.map((t, i) => `<span class="ftr-s ${seg[t.state] || 'is-c'}" style="flex-grow:${t.amount || 1}"><i></i><span class="ftr-l">${i + 1} · ${h(stageLabel(t.stage))}</span></span>`).join('')}</div></div>`;
    })() +
      (f.status !== 'Agreement signed' && f.status !== 'Fully released'
        ? `<div class="col fsetup">${banner('info', 'Funding set-up', 'Funding request → required approval → funding agreement.')}${dl(
            [
              ['Request', pill(f.status)],
              ['Approval', f.approvedBy ? nm(f.approvedBy) : 'Programme Administrator (Finance Owner)'],
            ],
          )}${r === 'A' && hasB('Finance Owner') && f.status === 'Requested' ? B('Approve funding request', 'fundApprove', { id: f.id }, 'btn-p btn-sm') : ''}${isS && f.status === 'Approved — agreement pending' ? B('Sign funding agreement', 'fundSign', { id: f.id }, 'btn-p btn-sm') : ''}</div>`
        : '') +
      table(
        ['Tranche', 'Stage', 'Amount', 'State', 'Owner progress summary', ''],
        f.tranches.map((t, i) => {
          const prevOk = i === 0 || f.tranches[i - 1].state === 'Summary accepted';
          const reached = stageReached(p, t.stage);
          let act = '';
          if (['Agreement signed', 'Fully released'].includes(f.status)) {
            if (isS && t.state === 'Committed')
              act =
                prevOk && reached
                  ? B('Release tranche', 'tranche', { f: f.id, i, v: 'Released' }, 'btn-p btn-sm')
                  : `<span class="cap">${!prevOk ? 'Waiting for previous summary' : 'Project not yet at this stage'}</span>`;
            if (isO && ['Released', 'On hold'].includes(t.state))
              act = B(
                t.state === 'On hold' ? 'Add information' : 'Submit progress summary',
                'summary',
                { f: f.id, i },
                'btn-p btn-sm',
              );
            if (isS && t.state === 'Summary submitted')
              act =
                B('Put on hold', 'tranche', { f: f.id, i, v: 'On hold' }) +
                B('Accept summary', 'tranche', { f: f.id, i, v: 'Summary accepted' }, 'btn-p btn-sm');
          }
          return [
            `<b>Tranche ${i + 1}</b>`,
            stageLabel(t.stage),
            money(f.currency, t.amount),
            pill(t.state),
            h(t.summary || '—') + (t.hold ? `<div class="cap">On hold: ${h(t.hold)}</div>` : ''),
            act,
          ];
        }),
      ) +
      `<p class="cap fund-note">Funding decisions are always made by humans.</p>`,
    '',
    'fund-card',
  );
}
// Totals across the funding agreements shown on this page (single currency only; mixed currencies are not summed).
function fundTotals(fs) {
  if (fs.length < 2 || fs.some(f => f.currency !== fs[0].currency)) return '';
  const c = fs[0].currency;
  const rel = fs.reduce((a, f) => a + f.tranches.filter(t => ['Released', 'Summary submitted', 'Summary accepted', 'On hold'].includes(t.state)).reduce((b, t) => b + t.amount, 0), 0);
  const tot = fs.reduce((a, f) => a + f.total, 0);
  return `<div class="kpis fund-kpis"><div class="kpi"><span class="lt">Funding agreements</span><span class="fig">${fs.length}</span></div><div class="kpi"><span class="lt">Committed</span><span class="fig">${money(c, tot)}</span></div><div class="kpi"><span class="lt">Released</span><span class="fig">${money(c, rel)}</span></div></div>`;
}
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
      r === 'S' && ['sponsor', 'Seat pools & donations'],
      r === 'O' && ['org', 'Institution seats'],
      r === 'A' && ['products', 'Products'],
      r === 'A' && ['ents', 'Entitlements'],
      r === 'A' && ['seats', 'Seat pools'],
      r === 'A' && ['events', 'Payment events'],
    ],
    UI.p.tab || (r === 'A' ? 'products' : r === 'O' ? 'org' : r === 'S' ? 'sponsor' : 'access'),
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
  if (t.cur === 'sponsor' || t.cur === 'org') {
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
            'Products and prices are set by the WSS Finance Owner.',
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
      'Finance Owner approves and releases; Programme Administrator drafts. Pricing policy is WSS’s.',
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
    'Provider-hosted checkout (simulated)',
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
    'Billing portal (provider-hosted, simulated)',
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
      `<form data-f="prod" class="col fgap" novalidate>${fi('prod', 'name', 'Name', { req: true })}${fi('prod', 'kind', 'Type', { type: 'select', req: true, opts: ['One-time payment', 'Monthly subscription', 'Annual subscription', 'Donation', 'Sponsored access', 'Invoice'] })}<div class="f2">${fi('prod', 'price', 'Price', { req: true, help: 'Set by the WSS commercial owner' })}${fi('prod', 'cycle', 'Billing cycle', { type: 'select', opts: ['One-time', 'Monthly', 'Annual', '—'] })}</div>${fi('prod', 'ent', 'Entitlement', { req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save draft</button></div></form>`,
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
  if (d.v === 'release') {
    sp.assigned = sp.assigned.filter(p => p !== d.pid);
    if (e) e.state = 'Cancelled';
  } else if (e) e.state = d.v;
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
  notify(sp.sponsor, 'Your seat pool is active: ' + sp.total + ' seats until ' + fmt(sp.until), 'billing');
  audit('Seat pool activated against invoice', sp.id, 'Finance Owner');
  toast('Seat pool activated.');
  ok();
};
