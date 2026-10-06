// ---------- ONBOARDING (F01 steps 5–7, F02, F03) ----------
const PURPOSES = [
  [
    'ai',
    'AI processing',
    'Let PHOENIX AI help with drafts, summaries and suggestions. Every AI output stays a draft until a human accepts it.',
  ],
  [
    'matching',
    'Matching',
    'Allow PHOENIX to consider your profile for steward-reviewed matches. Each introduction still asks for your consent.',
  ],
  [
    'research',
    'Research and evaluation',
    'Allow de-identified activity and reflections to be used to evaluate and improve the programme.',
  ],
  [
    'xorg',
    'Cross-organisation sharing',
    'Allow named items to be shared with people in other organisations you collaborate with.',
  ],
  [
    'public',
    'Public or funder release',
    'Allow approved stories or evidence to be released to funders or the public. Each release still needs your approval.',
  ],
  ['ext', 'External-system exchange', 'Allow exchange with connected external systems, such as a learning platform.'],
];
const COMPASS = [
  [
    'PC1',
    'Orientation and meaning',
    'What matters most to you right now in this programme, community or stage of your life?',
    'Private',
  ],
  [
    'PC2',
    'North Star / outcome',
    'What outcome do you want to achieve in the next 3–12 months?',
    'Private · share with chosen support roles',
  ],
  [
    'PC3',
    'Blockers, without diagnosis',
    'What could prevent or slow you down?',
    'High-restriction · explicit sharing only',
  ],
  [
    'PC4',
    'Capacity / pathway realism',
    'How much time can you realistically commit?',
    'Private · matching/pathway roles only if shared',
  ],
  ['PC5', 'First milestone', 'What is your first meaningful milestone?', 'Contextual'],
  ['PC6', 'Participant-defined success', 'What would success look like?', 'Private'],
  [
    'PC7',
    'What you bring',
    'What skills, knowledge, experience, relationships, resources or strengths do you bring?',
    'Private',
  ],
  ['PC8', 'Learning interest', 'What would you most like to learn or become better at?', 'Private'],
  [
    'PC9',
    'Contribution context',
    'What issues, communities, causes or opportunities are you most interested in contributing to?',
    'Private',
  ],
  [
    'PC10',
    'Support / need',
    'What people, resources, relationships or forms of support would help you progress?',
    'Private',
  ],
  [
    'PC11',
    'Opportunity preference',
    'Which opportunities are most relevant now: learning, service, mentoring, leadership, research, project work, livelihood, entrepreneurship, community action?',
    'Private',
  ],
  [
    'PC12',
    'Practical constraints',
    'Are there working preferences or constraints the platform should respect (schedule, location, language, accessibility, collaboration format)?',
    'Private',
  ],
];
// ---- Purpose Compass Baseline: Purpose plus six question sets, the starting point of the journey.
// Answers live in S.compass[pid] beside PC1–PC12; PC keys keep their meaning, the other keys hold the extra sub-questions.
// [key, question, required, help]
const BL_SETS = [
  { id: 'purpose', n: 'Purpose', d: 'Where your journey starts.', q: [['PC1', 'What matters most to you right now in this programme, community or stage of your life?', 1]] },
  {
    id: 'B1',
    n: 'Outcome — 3–12 months',
    q: [
      ['PC2', 'What outcome do you want to achieve in the next 3–12 months?', 1],
      ['PC6', 'What would success look like?', 1],
    ],
  },
  {
    id: 'B2',
    n: 'What you bring',
    q: [
      ['PC7', 'What skills, knowledge, experience, relationships, resources or strengths do you bring?', 1],
      ['skills', 'What existing skills should be captured?', 0, 'Comma-separated, e.g. survey design, Spanish-language outreach. Saved to your profile as self-declared skills, visible only to you until you change it.'],
    ],
  },
  {
    id: 'B3',
    n: 'Blockers',
    q: [
      ['PC3', 'What could prevent or slow you down?', 1],
      ['risks', 'What risks, dependencies or support gaps do you have?', 0],
    ],
  },
  {
    id: 'B4',
    n: 'How you learn',
    q: [
      ['learnHow', 'How do you learn best?', 1],
      ['learnSupport', 'What kind of guidance, practice, feedback, mentoring or resources help you learn?', 0],
    ],
  },
  {
    id: 'B5',
    n: 'Constraints',
    d: 'What should be considered when planning your journey. Fill in only what is relevant to you.',
    q: [
      ['PC4', 'Availability — how much time can you realistically commit?', 1],
      ['cLoc', 'Location', 0],
      ['cTech', 'Technology / access', 0],
      ['cFin', 'Financial constraints', 0],
      ['cCare', 'Care responsibilities', 0],
      ['cAcc', 'Accessibility requirements', 0],
      ['cOther', 'Other personal or practical constraints', 0],
    ],
  },
  {
    id: 'B6',
    n: 'First milestone & who to involve',
    q: [
      ['PC5', 'What is your first meaningful milestone?', 1],
      ['involve', 'Who needs to be involved, consulted, supported or invited?', 0],
    ],
  },
];
const BL_VIS = {
  skills: 'Only me until I change it in Profile',
  risks: 'High-restriction · explicit sharing only',
  cFin: 'High-restriction · explicit sharing only',
  cCare: 'High-restriction · explicit sharing only',
  cAcc: 'High-restriction · explicit sharing only',
  involve: 'Contextual',
};
const blVis = k => (COMPASS.find(c => c[0] === k) || [])[3] || BL_VIS[k] || 'Private';
const blKeys = () => BL_SETS.flatMap(s => s.q.map(q => q[0]));
const blMissing = pid => {
  const a = S.compass[pid] || {};
  return BL_SETS.filter(s => s.q.some(([k, , req]) => req && !String(a[k] || '').replace('|', '').trim()));
};
const hoursText = v => (v ? String(v).replace('|', ' ') : '');
const blAnswer = (a, k) => (k === 'PC4' ? hoursText(a.PC4) : a[k] || '');
// One field of a set. PC4 (availability) is a number plus a unit, as before.
function blField(f, [k, q, req, help], a) {
  if (k === 'PC4') {
    const [n, u] = String(fv(f, 'PC4n', '') || a.PC4 || '').split('|');
    return `<div class="field"><label class="lbl" for="${f}_PC4n">${q}${req ? ' <span class="req">*</span>' : ''}</label><div class="row wrap"><input id="${f}_PC4n" name="PC4n" type="number" min="1" class="input ${fe(f, 'PC4n') ? 'err' : ''}" style="width:140px" value="${h(n || '')}"><select name="PC4u" class="input" style="width:200px" aria-label="Unit"><option ${!u || String(u).includes('week') ? 'selected' : ''}>hours per week</option><option ${String(u || '').includes('month') ? 'selected' : ''}>hours per month</option></select></div>${fe(f, 'PC4n') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, 'PC4n')}</span>` : ''}<span class="vis">${ic('lock', 14)}${blVis(k)}</span></div>`;
  }
  const short = /^c[A-Z]/.test(k);
  return fi(f, k, q, { type: short ? 'text' : 'textarea', rows: 2, req: !!req, value: a[k] || '', help, vis: blVis(k), ph: short ? 'If relevant' : 'Write in your own words' });
}
function blRules(sets) {
  const r = {};
  sets.forEach(s =>
    s.q.forEach(([k, , req]) => {
      if (!req) return;
      if (k === 'PC4') r.PC4n = [['req', 'Enter a number of hours.'], 'num'];
      else r[k] = [['req', 'Please answer this question. A short answer is fine.']];
    }),
  );
  return r;
}
function blApply(pid, d, sets) {
  const a = (S.compass[pid] = S.compass[pid] || {});
  sets.forEach(s =>
    s.q.forEach(([k]) => {
      if (k === 'PC4') {
        if (d.PC4n) a.PC4 = d.PC4n + '|' + (d.PC4u || 'hours per week');
      } else a[k] = (d[k] || '').trim();
    }),
  );
  if (sets.some(s => s.id === 'B2')) blSyncSkills(pid, a.skills);
}
// The skills the person types are their own statement: kept as one self-declared Skills claim, private by default.
function blSyncSkills(pid, v) {
  const c = S.claims.find(x => x.pid === pid && x.src === 'baseline' && x.state === 'Current');
  if (!v) return;
  if (c) {
    if (c.value !== v) {
      c.value = v;
      c.ver = (c.ver || 1) + 1;
    }
  } else S.claims.push({ id: uid('cl'), pid, field: 'Skills', value: v, prov: 'Self-declared', vis: 'Only me', state: 'Current', ver: 1, src: 'baseline' });
}
const claimVals = (pid, field) =>
  S.claims
    .filter(c => c.pid === pid && c.field === field && c.state === 'Current')
    .map(c => c.value)
    .join(', ');
// Role assignments with their expiry, as shown in the baseline.
function blRoles(pid) {
  const list = S.assign.filter(a => a.pid === pid);
  return list
    .map(a => {
      const c = S.contexts.find(x => x.id === a.ctx);
      const exp = a.until ? (a.status === 'Expired' ? pill('Expired ' + fmt(a.until), 'p-red') : pill('Expires ' + fmt(a.until), a.until <= addDays(today(), 30) ? 'p-amber' : 'p-grey')) : '<span class="cap">No expiry set</span>';
      return `<div class="row wrap" style="gap:8px;justify-content:space-between"><span><b style="font-weight:600">${h(ROLE[a.role] || a.role)}</b> <span class="cap">· ${h(c ? c.name : a.ctx)}</span></span><span class="row wrap" style="gap:6px">${a.status !== 'Active' && a.status !== 'Expired' ? pill(a.status) : ''}${exp}</span></div>`;
    })
    .join('');
}
function blSummary(pid) {
  const a = S.compass[pid] || {};
  return dl([
    ['Purpose', h(a.PC1 || '—')],
    ['Skills', h(claimVals(pid, 'Skills') || a.skills || '—')],
    ['Interests', h(claimVals(pid, 'Interests') || '—')],
    ['Goals', a.PC2 ? h(a.PC2) + (a.PC5 ? `<div class="cap">First milestone: ${h(a.PC5)}</div>` : '') : '—'],
    ['Role assignments', `<div class="col" style="gap:6px">${blRoles(pid) || '—'}</div>`],
  ]);
}
function addDays(d, n) {
  const x = new Date(d + 'T00:00:00');
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}
function onbTop(cur, steps) {
  return `<header class="onb-top"><div class="row" style="gap:10px"><span class="mark">P</span><span class="wm hide-sm"><b>PHOENIX</b><span>Foundation Alpha</span></span></div><nav class="steps" aria-label="Onboarding progress">${steps.map((l, i) => `${i ? '<span class="sline"></span>' : ''}<div class="step ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><span class="n">${i < cur ? ic('check', 14) : i + 1}</span><span class="st">${l}</span></div>`).join('')}</nav><div class="row">${S.assign.filter(x => x.pid === myId()).length > 1 ? B('Switch context', 'switcher', {}, 'btn-g btn-sm') : ''}${B('Save and exit', 'logout', {}, 'btn-g btn-sm hide-sm')}</div></header>`;
}
function ONB() {
  const a = asg();
  const re = a.onb.agreement && reaccept();
  const steps = ['Account', 'Agreement', 'Permissions', 'Profile'].concat(roleBase(a.role) === 'P' ? ['Purpose Compass'] : []);
  const cur = !a.onb.agreement || re ? 1 : !a.onb.consents ? 2 : !a.onb.profile ? 3 : 4;
  let body;
  if (cur === 1) {
    const g = re || S.agreements.find(g => g.ctx === a.ctx && g.status === 'Active' && g.roles.includes(roleBase(a.role)));
    if (!g) {
      a.onb.agreement = true;
      save();
      return ONB();
    }
    const prev = S.agreements.find(x => x.type === g.type && x.ctx === g.ctx && x.ver === g.ver - 1);
    const f = 'agr';
    body = `${re ? banner('warn', 'This agreement has changed — please review and re-accept', `${h(g.summary || 'A material change was made.')} Functions in this context are paused until you re-accept. Your agreements in other contexts are not affected.`) : ''}${UI.p.notnow ? banner('info', 'You can come back to this later', 'Access to this context starts once you accept. Until then this is the only screen available here.') : ''}
  <div class="col" style="gap:4px"><p class="over">Step 2 of ${steps.length}</p><h1 class="h1">Review your agreement</h1><p class="sub">This agreement applies to your role in this context only.</p></div>
  <section class="card col" style="gap:20px"><div class="kv"><div class="col"><span class="cap">Agreement</span><b>${h(g.type)}</b></div><div class="col"><span class="cap">Version</span><b>v${g.ver}</b></div><div class="col"><span class="cap">Context</span><b>${h(ctx().name)}</b></div><div class="col"><span class="cap">Effective</span><b>${fmt(g.effective)}</b></div></div>
  <div class="scrollbox" tabindex="0" aria-label="Agreement text"><div class="col" style="gap:12px"><p class="h3">1. What is collected and why</p><p class="muted">Your name, email and sign-in details, your role and context, and the profile information you choose to add, so that PHOENIX can run this programme.</p><p class="h3">2. Who can see your information</p><p class="muted">Only people whose role and context allow it. Nothing is public by default. Each field shows its visibility.</p><p class="h3">3. Optional purposes</p><p class="muted">AI processing, matching, research, cross-organisation sharing, public/funder release and external exchange are separate choices you make next. Saying no never blocks the core collaboration features.</p><p class="h3">4. Your rights</p><p class="muted">You can correct information, withdraw any optional purpose, export your authorised records and request deletion.</p><p class="h3">5. Retention</p><p class="muted">Records are kept for the programme duration plus the period set in the retention policy, then deleted or anonymised.</p>${g.summary ? `<p class="h3">What changed in v${g.ver}</p><p class="muted">${h(g.summary)}</p>` : ''}<p class="cap">Approved wording is published by the Programme Administrator after WSS Trust/Data Steward and legal review.</p></div></div>
  <div class="row wrap">${B(ic('download', 16) + 'Download PDF', 'fakeDl', { n: g.type + ' v' + g.ver }, 'btn-g btn-sm')}${prev ? B(ic('file', 16) + 'Compare with v' + prev.ver, 'cmpAgr', { a: prev.id, b: g.id }, 'btn-g btn-sm') : ''}</div>
  <form data-f="agr" class="col" style="gap:12px" id="agrf" novalidate>${fi(f, 'a1', `I have read and accept <b>${h(g.type)} v${g.ver}</b> for ${h(ctx().name)}.`, { type: 'checkbox', req: true })}${fi(f, 'a2', 'I accept the PHOENIX service terms.', { type: 'checkbox', req: true })}<input type="hidden" name="g" value="${g.id}"><span class="help">A dated receipt of your acceptance is stored in Privacy & consent.</span>
  <div class="actions">${B('Not now', 'agrNotNow', {}, 'btn-s')}<button class="btn btn-p" type="submit">Accept and continue</button></div></form></section>`;
  } else if (cur === 2) {
    const c = S.consents[myId()];
    const draft = UI.form.cons || { ...c };
    UI.form.cons = draft;
    body = `<div class="col" style="gap:4px"><p class="over">Step 3 of ${steps.length}</p><h1 class="h1">Choose your permissions</h1><p class="sub">Each purpose is separate and optional. Saying no never blocks you from Circles, Rope Teams or ${WL()}s.</p></div>
  ${card('Needed to run the service', 'Covered by your agreement', `<div class="lrow"><span class="tile t-soft">${ic('user')}</span><div class="lt"><b>Name, email and sign-in</b></div>${pill('Required', 'p-grey')}</div><div class="lrow"><span class="tile t-soft">${ic('users')}</span><div class="lt"><b>Your role and context</b></div>${pill('Required', 'p-grey')}</div>`)}
  ${card('Optional purposes', `${PURPOSES.filter(p => draft[p[0]] === 'Granted').length} of ${PURPOSES.length} granted`, PURPOSES.map(([k, t, dsc]) => `<div class="lrow" style="align-items:flex-start"><span class="tile t-soft">${ic('shield')}</span><div class="lt"><b>${t}</b><p class="cap">${dsc}</p><div style="margin-top:6px">${pill(draft[k] === 'Granted' ? 'Granted' : 'Declined')}</div></div><button type="button" class="toggle ${draft[k] === 'Granted' ? 'on' : ''}" role="switch" aria-checked="${draft[k] === 'Granted'}" aria-label="${t}" data-a="consToggle" data-k="${k}"></button></div>`).join(''))}
  <div class="actions">${B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'agreement' }, 'btn-g')}${B('Save and continue' + ic('arrow', 16), 'consSave', {}, 'btn-p')}</div>`;
  } else if (cur === 3) {
    const f = 'prof';
    const pr = S.profiles[myId()] || {};
    body = `<div class="col" style="gap:4px"><p class="over">Step 4 of ${steps.length}</p><h1 class="h1">Your minimum profile</h1><p class="sub">Just the basics. Each field shows who can see it. Every save creates a version.</p></div>${errSum(f)}
  <form data-f="prof" class="card col" style="gap:18px" novalidate><div class="f2">${fi(f, 'name', 'Full name', { value: me().name, ro: true, vis: 'You and authorised administration' })}${fi(f, 'display', 'Display name', { req: true, value: me().display, vis: 'Your collaboration contexts' })}</div>
  <div class="f2">${fi(f, 'aff', 'Organisation / affiliation', { value: me().org ? S.orgs.find(o => o.id === me().org).name : ctx().name, ro: true, vis: 'Context-visible' })}${fi(f, 'lang', 'Preferred language', { type: 'select', req: true, ph: 'Select a language', opts: ['English', 'Spanish', 'Hindi', 'Polish', 'French', 'Arabic'], value: pr.lang, help: 'Stored only; interface translation is Phase 3.' })}</div>
  ${fi(f, 'bio', 'Short biography', { type: 'textarea', rows: 3, max: 400, value: pr.bio, help: 'Optional · up to 400 characters', vis: 'Your choice — default: your collaboration contexts' })}
  ${fi(f, 'interests', 'Interests', { value: '', ph: 'Comma-separated, e.g. urban heat, food resilience', help: 'Optional' })}
  ${role() === 'S' ? fi(f, 'sponsorInt', 'Funding interests', { req: true, ph: 'e.g. Urban heat, tree canopy', help: 'Used to show you matching projects. Not shared with participants.' }) : ''}
  ${banner('info', '', 'Skills, availability and other details are asked for later, only when a workflow needs them.')}
  <div class="actions">${B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'consents' }, 'btn-g')}<button class="btn btn-p" type="submit">Save and continue</button></div></form>`;
  } else {
    const f = 'pc';
    const ans = S.compass[myId()] || {};
    const n = BL_SETS.length;
    if (UI.tab.pcStep == null) {
      const miss = blMissing(myId());
      UI.tab.pcStep = miss.length ? BL_SETS.indexOf(miss[0]) : n - 1;
    }
    const st = Math.min(UI.tab.pcStep || 0, n - 1);
    const set = BL_SETS[st];
    body = `<div class="col" style="gap:4px"><p class="over">Step 5 of 5 · Purpose Compass Baseline</p><h1 class="h1">Set your starting point</h1><p class="sub">Your purpose and six short question sets. Nothing here is scored, and nothing is used to infer sensitive traits. Your answers become the context for your ${WL()}s and Learning Harvests.</p></div>
  <div class="col" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="lbl">${st ? 'Set ' + st + ' of ' + (n - 1) : 'Purpose'}</span><span class="cap">${Math.round((st / n) * 100)}% complete</span></div><div class="progress"><span style="width:${(st / n) * 100}%"></span></div></div>
  ${errSum(f)}<form data-f="pc" class="card col" style="gap:16px" novalidate><input type="hidden" name="set" value="${st}"><div class="col" style="gap:4px"><span class="over">${st ? 'Question set ' + st : 'Starting point'}</span><h2 class="h3" style="font-size:20px">${set.n}</h2>${set.d ? `<p class="cap">${set.d}</p>` : ''}</div>
  ${set.q.map(q => blField(f, q, ans)).join('')}
  ${st === 0 ? `<div class="col" style="gap:10px"><span class="lbl">Already in your profile</span>${dl([['Interests', h(claimVals(myId(), 'Interests') || '—')], ['Role assignments', `<div class="col" style="gap:6px">${blRoles(myId())}</div>`]])}<span class="help">Role assignments and their expiry are set by your administrator. Skills are asked in set 2; goals in sets 1 and 6.</span></div>` : ''}
  ${st === n - 1 ? banner('ok', '', 'Your North Star appears on My PHOENIX as your self-declared direction. You can review and change the whole baseline any time in Profile → Purpose Compass. Questions PC8–PC12 are optional and asked later, in context.') : ''}
  <div class="actions">${st ? B(ic('chevl', 16) + 'Previous', 'pcPrev', {}, 'btn-g') : B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'profile' }, 'btn-g')}<div class="row wrap">${B('Save and finish later', 'logout', {}, 'btn-s')}<button class="btn btn-p" type="submit">${st === n - 1 ? 'Finish and go to My PHOENIX' : 'Next'}</button></div></div></form>`;
  }
  return `<div class="onb">${onbTop(cur, steps)}<main class="onb-body">${body}</main></div>`;
}
F.agr = d => {
  if (
    !validate('agr', d, {
      a1: [['req', 'Tick to accept the agreement.']],
      a2: [['req', 'Tick to accept the service terms.']],
    })
  )
    return render();
  const a = asg();
  const g = byId('agreements', d.g);
  S.accepts.push({ pid: myId(), ag: g.id, at: now(), receipt: 'RCPT-' + uid('') });
  a.onb.agreement = true;
  audit('Agreement accepted', g.id, g.type + ' v' + g.ver);
  clearF('agr');
  UI.p = {};
  toast('Agreement accepted. Receipt stored.');
  ok();
};
A.agrNotNow = () => {
  audit('Agreement not accepted (not now)', asg().id, '');
  UI.p = { notnow: 1 };
  render();
};
A.cmpAgr = d => {
  const a = byId('agreements', d.a),
    b = byId('agreements', d.b);
  modal(
    `Compare v${a.ver} and v${b.ver}`,
    `<div class="g2"><div class="card"><b>v${a.ver} · ${fmt(a.effective)}</b><p class="muted" style="margin-top:8px">${h(a.summary || '—')}</p></div><div class="card"><b>v${b.ver} · ${fmt(b.effective)}</b><p class="muted" style="margin-top:8px">${h(b.summary || '—')}</p></div></div>`,
  );
};
A.fakeDl = d => {
  toast('Downloaded: ' + d.n);
  render();
};
A.consToggle = d => {
  const f = UI.form.cons;
  f[d.k] = f[d.k] === 'Granted' ? 'Declined' : 'Granted';
  render();
};
A.consSave = () => {
  const c = S.consents[myId()];
  const f = UI.form.cons;
  PURPOSES.forEach(([k]) => {
    if (c[k] !== f[k]) {
      c.history.push({ at: now(), t: `${k}: ${c[k]} → ${f[k]}` });
      c[k] = f[k];
    }
  });
  c.history.push({ at: now(), t: 'Choices confirmed at onboarding' });
  asg().onb.consents = true;
  audit('Consent choices recorded', myId(), PURPOSES.map(([k]) => k + '=' + f[k]).join(', '));
  delete UI.form.cons;
  ok();
};
A.onbBack = d => {
  const a = asg();
  if (d.s === 'agreement') a.onb.agreement = false;
  if (d.s === 'consents') a.onb.consents = false;
  if (d.s === 'profile') a.onb.profile = false;
  ok();
};
F.prof = d => {
  if (
    !validate('prof', d, {
      display: ['req'],
      lang: [['req', 'Choose a language.']],
      ...(role() === 'S' ? { sponsorInt: ['req'] } : {}),
    })
  )
    return render();
  const p = me();
  p.display = d.display.trim();
  const pr = (S.profiles[p.id] = S.profiles[p.id] || { ver: 0, history: [] });
  pr.bio = d.bio;
  pr.lang = d.lang;
  pr.ver++;
  pr.history.push({
    ver: pr.ver,
    at: today(),
    what: 'Minimum profile saved',
    by: p.name,
    why: 'Onboarding',
    source: 'Self-declared',
  });
  if (d.interests)
    S.claims.push({
      id: uid('cl'),
      pid: p.id,
      field: 'Interests',
      value: d.interests,
      prov: 'Self-declared',
      vis: 'My collaboration contexts',
      state: 'Current',
      ver: 1,
    });
  if (d.sponsorInt)
    S.interests[p.id] = d.sponsorInt
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  asg().onb.profile = true;
  audit('Profile version created', p.id, 'v' + pr.ver);
  clearF('prof');
  ok();
};
A.pcPrev = () => {
  UI.tab.pcStep = Math.max(0, (UI.tab.pcStep || 0) - 1);
  render();
};
F.pc = d => {
  const st = +d.set || 0;
  const set = BL_SETS[st];
  if (!validate('pc', d, blRules([set]))) return render();
  blApply(myId(), d, [set]);
  clearF('pc');
  if (st < BL_SETS.length - 1) {
    UI.tab.pcStep = st + 1;
    save();
    return render();
  }
  const miss = blMissing(myId());
  if (miss.length) {
    UI.tab.pcStep = BL_SETS.indexOf(miss[0]);
    toast('Answer the required questions in “' + miss[0].n + '” to finish.', 'warn');
    return render();
  }
  asg().onb.compass = true;
  S.compass[myId()]._at = today();
  UI.tab.pcStep = null;
  audit('Purpose Compass Baseline completed', myId(), 'Purpose and six question sets');
  toast('Welcome to PHOENIX. Your baseline and North Star are set.');
  save();
  go('home');
};
