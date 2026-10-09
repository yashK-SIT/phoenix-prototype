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
// [key, question, required, help] — the seeded questions. At run time the questions live in S.compassQs and are
// managed by the Platform Administrator (Purpose Compass screen); answers stay in S.compass[pid] under each question id.
const BL_SEED = [
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
const blVisSeed = k => (COMPASS.find(c => c[0] === k) || [])[3] || BL_VIS[k] || 'Private';
const COMPASS_VIS = ['Private', 'Private · share with chosen support roles', 'Contextual', 'High-restriction · explicit sharing only', 'Only me until I change it in Profile'];
const COMPASS_TYPES = [
  ['textarea', 'Long answer'],
  ['text', 'Short answer'],
  ['hours', 'Hours per week or month'],
];
function seedCompassQs() {
  const out = [];
  BL_SEED.forEach(s =>
    s.q.forEach(([k, q, req, help]) =>
      out.push({ id: k, text: q, set: s.n, setNote: s.d || '', help: help || '', req: !!req, type: k === 'PC4' ? 'hours' : /^c[A-Z]/.test(k) ? 'text' : 'textarea', onb: true, vis: blVisSeed(k) }),
    ),
  );
  COMPASS.filter(([id]) => !out.some(q => q.id === id)).forEach(([id, , q, vis]) =>
    out.push({ id, text: q, set: 'Asked later, in context', setNote: '', help: '', req: false, type: 'textarea', onb: false, vis }),
  );
  return out.map((q, i) => ({ ...q, order: i + 1 }));
}
const compassQs = () => (S.compassQs || []).filter(q => !q.deleted).sort((a, b) => a.order - b.order);
// Questions grouped by their set, in order. onbOnly: only the questions asked at onboarding.
function blSets(onbOnly = true) {
  const groups = [];
  compassQs()
    .filter(q => !onbOnly || q.onb)
    .forEach(q => {
      let g = groups.find(x => x.n === (q.set || 'Questions'));
      if (!g) groups.push((g = { n: q.set || 'Questions', d: '', q: [] }));
      if (!g.d && q.setNote) g.d = q.setNote;
      g.q.push(q);
    });
  return groups;
}
const blVis = k => (compassQs().find(q => q.id === k) || {}).vis || blVisSeed(k);
const blKeys = () => compassQs().filter(q => q.onb).map(q => q.id);
const blAnswered = (a, q) => !!String(a[q.id] || '').replace('|', '').trim();
const blMissing = pid => {
  const a = S.compass[pid] || {};
  return blSets().filter(s => s.q.some(q => q.req && !blAnswered(a, q)));
};
const hoursText = v => (v ? String(v).replace('|', ' ') : '');
const blAnswer = (a, k) => ((compassQs().find(q => q.id === k) || {}).type === 'hours' ? hoursText(a[k]) : a[k] || '');
// One question. "Hours" questions are a number plus a unit.
function blField(f, q, a) {
  const k = q.id;
  if (q.type === 'hours') {
    const [n, u] = String(fv(f, k + 'n', '') || a[k] || '').split('|');
    return `<div class="field"><label class="lbl" for="${f}_${k}n">${h(q.text)}${q.req ? ' <span class="req">*</span>' : ''}</label><div class="row wrap"><input id="${f}_${k}n" name="${k}n" type="number" min="1" class="input pc-hrs-n ${fe(f, k + 'n') ? 'err' : ''}" value="${h(n || '')}"><select name="${k}u" class="input pc-hrs-u" aria-label="Unit"><option ${!u || String(u).includes('week') ? 'selected' : ''}>hours per week</option><option ${String(u || '').includes('month') ? 'selected' : ''}>hours per month</option></select></div>${fe(f, k + 'n') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, k + 'n')}</span>` : ''}${q.help ? `<span class="help">${h(q.help)}</span>` : ''}<span class="vis">${ic('lock', 14)}${h(q.vis || 'Private')}</span></div>`;
  }
  return fi(f, k, h(q.text), { type: q.type === 'text' ? 'text' : 'textarea', rows: 2, req: !!q.req, value: a[k] || '', help: q.help ? h(q.help) : '', vis: h(q.vis || 'Private'), ph: q.type === 'text' ? 'If relevant' : 'Write in your own words' });
}
function blRules(sets) {
  const r = {};
  sets.forEach(s =>
    s.q.forEach(q => {
      if (!q.req) return;
      if (q.type === 'hours') r[q.id + 'n'] = [['req', 'Enter a number of hours.'], 'num'];
      else r[q.id] = [['req', 'Please answer this question. A short answer is fine.']];
    }),
  );
  return r;
}
function blApply(pid, d, sets) {
  const a = (S.compass[pid] = S.compass[pid] || {});
  sets.forEach(s =>
    s.q.forEach(q => {
      if (q.type === 'hours') {
        if (d[q.id + 'n']) a[q.id] = d[q.id + 'n'] + '|' + (d[q.id + 'u'] || 'hours per week');
      } else a[q.id] = (d[q.id] || '').trim();
    }),
  );
  if (sets.some(s => s.q.some(q => q.id === 'skills'))) blSyncSkills(pid, a.skills);
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
// Role assignments with their expiry, as shown in the baseline: one line per role.
function blRoles(pid) {
  const list = roleChoices(pid);
  return list
    .map(a => {
      const exp = a.until ? (a.status === 'Expired' ? pill('Expired ' + fmt(a.until), 'p-red') : pill('Expires ' + fmt(a.until), a.until <= addDays(today(), 30) ? 'p-amber' : 'p-grey')) : '<span class="cap">No expiry set</span>';
      return `<div class="row wrap onb-role"><b>${h(ROLE[a.role] || a.role)}</b><span class="row wrap onb-pills">${a.status !== 'Active' && a.status !== 'Expired' ? pill(a.status) : ''}${exp}</span></div>`;
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
    ['Role assignments', `<div class="col onb-roles">${blRoles(pid) || '—'}</div>`],
  ]);
}
function addDays(d, n) {
  const x = new Date(d + 'T00:00:00');
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}
// ---------- POLICIES: structured agreement text and version comparison ----------
// Text is plain lines; a line starting "## " opens a section with that heading.
function polSections(g) {
  const out = [];
  String((g && g.text) || '')
    .split('\n')
    .forEach(line => {
      const m = /^##\s+(.*)$/.exec(line.trim());
      if (m) out.push({ h: m[1].trim(), t: '' });
      else if (line.trim()) {
        if (!out.length) out.push({ h: '', t: '' });
        const s = out[out.length - 1];
        s.t += (s.t ? '\n' : '') + line.trim();
      }
    });
  return out;
}
const polBody = g =>
  polSections(g)
    .map(s => `${s.h ? `<p class="h3">${h(s.h)}</p>` : ''}<p class="muted pol-t">${h(s.t)}</p>`)
    .join('') || '<p class="cap">No text.</p>';
// Word-level difference: removed words struck through, added words highlighted.
function wordDiff(a, b) {
  const A = String(a).split(/(\s+)/),
    Bw = String(b).split(/(\s+)/);
  const n = A.length,
    m = Bw.length;
  const T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = A[i] === Bw[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  let i = 0,
    j = 0,
    out = '';
  while (i < n && j < m) {
    if (A[i] === Bw[j]) {
      out += h(A[i]);
      i++;
      j++;
    } else if (T[i + 1][j] >= T[i][j + 1]) out += `<del>${h(A[i++])}</del>`;
    else out += `<ins>${h(Bw[j++])}</ins>`;
  }
  while (i < n) out += `<del>${h(A[i++])}</del>`;
  while (j < m) out += `<ins>${h(Bw[j++])}</ins>`;
  // share of the longer text that is unchanged (tokens include spaces, so this is a rough measure)
  wordDiff.same = T[0][0] / Math.max(1, n, m);
  return out.replace(/<\/del><del>/g, '').replace(/<\/ins><ins>/g, '');
}
function polChanges(prev, cur) {
  const Pv = polSections(prev),
    Cv = polSections(cur);
  const rows = [];
  Cv.forEach(s => {
    const o = Pv.find(x => x.h === s.h);
    if (!o) rows.push({ kind: 'Added', h: s.h, html: `<ins>${h(s.t)}</ins>` });
    else if (o.t !== s.t) {
      const w = wordDiff(o.t, s.t);
      // a mostly rewritten section reads better as Before / After than as interleaved word marks
      const html = wordDiff.same < 0.6 ? `<span class="poldiff-ba"><span class="cap">Before</span><del>${h(o.t)}</del></span><span class="poldiff-ba"><span class="cap">After</span><ins>${h(s.t)}</ins></span>` : w;
      rows.push({ kind: 'Changed', h: s.h, html });
    }
  });
  Pv.forEach(s => {
    if (!Cv.some(x => x.h === s.h)) rows.push({ kind: 'Removed', h: s.h, html: `<del>${h(s.t)}</del>` });
  });
  return rows;
}
// The previous published version of the same policy (for comparison).
const polPrev = g => S.agreements.filter(x => x.type === g.type && x.ctx === g.ctx && x.ver < g.ver && x.status !== 'Draft').sort((a, b) => b.ver - a.ver)[0];
function polDiffHtml(prev, cur) {
  if (!prev) return '<p class="cap">This is the first version of this policy.</p>';
  const rows = polChanges(prev, cur);
  const same = polSections(cur).length - rows.filter(r => r.kind !== 'Removed').length;
  return `<div class="poldiff"><p class="cap poldiff-key"><span><del>Removed</del></span><span><ins>Added</ins></span> · comparing v${prev.ver} with v${cur.ver}</p>${
    rows
      .map(
        r =>
          `<section class="poldiff-s"><div class="row wrap poldiff-sh"><b>${h(r.h || 'Introduction')}</b>${pill(r.kind, { Added: 'p-green', Changed: 'p-amber', Removed: 'p-red' }[r.kind])}</div><p class="poldiff-t">${r.html.replace(/\n/g, '<br>')}</p></section>`,
      )
      .join('') || '<p class="cap">The wording is unchanged.</p>'
  }${same > 0 && rows.length ? `<p class="cap">${same} section${same > 1 ? 's' : ''} unchanged.</p>` : ''}</div>`;
}
// Seed wording. Participant Agreement v1/v2 in the first programme kept the separate optional choices; every other
// policy covers how PHOENIX may use information within the agreement itself.
function polSeedText(g) {
  const legacy = g.type === 'Participant Agreement' && g.ctx === 'c1' && g.ver < 3;
  const use = legacy
    ? 'AI processing, matching, research, cross-organisation sharing, public or funder release and external exchange are separate choices you make after accepting. Saying no never blocks the core collaboration features.' +
      (g.ver === 2 ? ' AI processing is one of these optional choices: AI only drafts, and every draft stays a draft until a person accepts it.' : '')
    : 'By accepting this agreement you agree that PHOENIX may use AI to draft summaries and suggestions (every AI output stays a draft until a person accepts it); consider your profile for steward-reviewed matches (each introduction still needs your consent); use de-identified activity to evaluate and improve the programme; share named items with collaborators in other organisations; release approved stories or evidence to funders (each release still needs your approval); and exchange data with connected systems such as a learning platform.';
  const rights = legacy
    ? 'You can correct information, withdraw any optional purpose, export your authorised records and request deletion.'
    : 'You can correct information, export your authorised records and request deletion at any time.';
  return [
    '## About this agreement',
    `This ${g.type} sets out how you take part in PHOENIX and how your information is handled.`,
    '## 1. What is collected and why',
    'Your name, email and sign-in details, your role, and the profile information you choose to add, so that PHOENIX can run the programme.',
    '## 2. Who can see your information',
    'Only people whose role allows it. Nothing is public by default. Each field shows its visibility.',
    '## 3. How PHOENIX may use your information',
    use,
    '## 4. Your rights',
    rights,
    '## 5. Retention',
    'Records are kept for the programme duration plus the period set in the retention policy, then deleted or anonymised.',
  ].join('\n');
}
// Shown over the app when a policy that applies to the signed-in person has a new version they have not accepted.
// The current policy is shown first; the comparison with the previous version opens only on request.
function policyGate(g) {
  const prev = polPrev(g);
  const cmp = UI.tab.agrCmp === g.id;
  return `<div class="pgate" role="presentation"><div class="pgate-m" role="dialog" aria-modal="true" aria-labelledby="pgate-t"><header class="pgate-h"><span class="over">Policy update</span><h2 class="h2" id="pgate-t">${h(g.type)} — version ${g.ver}</h2><p class="cap">Effective ${fmt(g.effective)}. Read the current policy and confirm to continue.</p></header>
  <div class="pgate-b"><div class="col" style="gap:16px"><div class="kv"><div class="col"><span class="cap">Policy</span><b>${h(g.type)}</b></div><div class="col"><span class="cap">Version</span><b>v${g.ver}</b></div><div class="col"><span class="cap">Effective</span><b>${fmt(g.effective)}</b></div></div>
  <div class="row wrap" style="gap:8px">${B(ic('download', 16) + 'Download policy', 'polDownload', { id: g.id })}${prev ? B(ic('eye', 16) + (cmp ? 'Hide differences' : 'Compare with previous policy'), 'agrCmp', { id: g.id }, 'btn-s btn-sm', `aria-expanded="${cmp}"`) : ''}</div>
  ${cmp ? `<section class="col" style="gap:8px"><h3 class="h3">What changed since v${prev.ver}</h3>${g.summary ? `<p class="muted">${h(g.summary)}</p>` : ''}${polDiffHtml(prev, g)}</section>` : ''}
  <section class="col pgate-pol"><h3 class="h3">Current policy</h3>${polBody(g)}</section></div></div>
  <form data-f="agr" class="pgate-f" novalidate><input type="hidden" name="g" value="${g.id}"><input type="hidden" name="mode" value="update">${fi('agr', 'a1', `I have read and accept <b>${h(g.type)} v${g.ver}</b>.`, { type: 'checkbox', req: true })}<div class="actions">${B('Sign out', 'logout', {}, 'btn-s')}<button class="btn btn-p" type="submit">Accept and continue</button></div></form></div></div>`;
}
function onbTop(cur, steps) {
  return `<header class="onb-top"><div class="row onb-brand"><span class="mark">${MARK(20)}</span><span class="wm hide-sm"><b>PHOENIX</b><span>Foundation Alpha</span></span></div><nav class="steps" aria-label="Onboarding progress">${steps.map((l, i) => `${i ? '<span class="sline"></span>' : ''}<div class="step ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><span class="n">${i < cur ? ic('check', 14) : i + 1}</span><span class="st">${l}</span></div>`).join('')}</nav><div class="row">${roleChoices().length > 1 ? B('Switch role', 'switcher', {}, 'btn-g btn-sm') : ''}${B('Save and exit', 'logout', {}, 'btn-g btn-sm hide-sm')}</div></header>`;
}
function ONB() {
  const a = asg();
  // Optional processing purposes are covered by the agreement; there is no separate permissions step.
  a.onb.consents = true;
  const isP = roleBase(a.role) === 'P';
  const steps = ['Account', 'Agreement', 'Profile'].concat(isP ? ['Purpose Compass'] : []);
  const cur = !a.onb.agreement ? 1 : !a.onb.profile ? 2 : 3;
  let body;
  if (cur === 1) {
    const g = S.agreements.find(g => g.ctx === a.ctx && g.status === 'Active' && g.roles.includes(roleBase(a.role)));
    if (!g) {
      a.onb.agreement = true;
      save();
      return ONB();
    }
    const prev = polPrev(g);
    const f = 'agr';
    body = `${UI.p.notnow ? banner('info', 'You can come back to this later', 'Access starts once you accept. Until then this is the only screen available.') : ''}
  <div class="col onb-h"><p class="over">Step 2 of ${steps.length}</p><h1 class="h1">Review your agreement</h1><p class="sub">This agreement applies to your role. It also covers how PHOENIX may process your information.</p></div>
  <section class="card col onb-card"><div class="kv onb-meta"><div class="col"><span class="cap">Agreement</span><b>${h(g.type)}</b></div><div class="col"><span class="cap">Version</span><b>v${g.ver}</b></div><div class="col"><span class="cap">Effective</span><b>${fmt(g.effective)}</b></div></div>
  <div class="scrollbox" tabindex="0" aria-label="Agreement text"><div class="col onb-pol">${polBody(g)}<p class="cap">Approved wording is published by the Platform Administrator after WSS Trust/Data Steward and legal review.</p></div></div>
  <div class="row wrap onb-tools">${B(ic('download', 16) + 'Download policy', 'polDownload', { id: g.id })}${B(ic('eye', 16) + (UI.tab.agrCmp === g.id ? 'Hide comparison' : 'Compare policy with prior'), 'agrCmp', { id: g.id }, 'btn-s btn-sm', `aria-expanded="${UI.tab.agrCmp === g.id}"`)}</div>
  ${UI.tab.agrCmp === g.id ? `<div class="col onb-cmp">${prev ? `<h2 class="h3">What changed since v${prev.ver}</h2>${g.summary ? `<p class="muted">${h(g.summary)}</p>` : ''}` : ''}${polDiffHtml(prev, g)}</div>` : ''}
  <form data-f="agr" class="col onb-agr" id="agrf" novalidate>${fi(f, 'a1', `I have read and accept <b>${h(g.type)} v${g.ver}</b>.`, { type: 'checkbox', req: true })}${fi(f, 'a2', 'I accept the PHOENIX service terms.', { type: 'checkbox', req: true })}<input type="hidden" name="g" value="${g.id}"><span class="help">A dated receipt of your acceptance is stored in Privacy & agreements.</span>
  <div class="actions">${B('Not now', 'agrNotNow', {}, 'btn-s')}<button class="btn btn-p" type="submit">Accept and continue</button></div></form></section>`;
  } else if (cur === 2) {
    const f = 'prof';
    const pr = S.profiles[myId()] || {};
    body = `<div class="col onb-h"><p class="over">Step 3 of ${steps.length}</p><h1 class="h1">Your minimum profile</h1><p class="sub">Just the basics. Each field shows who can see it. Every save creates a version.</p></div>${errSum(f)}
  <form data-f="prof" class="card col onb-card" novalidate><div class="f2">${fi(f, 'name', 'Full name', { value: me().name, ro: true, vis: 'You and authorised administration' })}${fi(f, 'display', 'Display name', { value: me().display, ro: true, vis: 'Your collaboration contexts', help: 'Set when your account was created.' })}</div>
  ${me().org ? fi(f, 'aff', 'Organisation / affiliation', { value: S.orgs.find(o => o.id === me().org).name, ro: true, vis: 'Context-visible' }) : ''}
  ${fi(f, 'bio', 'Short biography', { type: 'textarea', rows: 3, max: 400, value: pr.bio, help: 'Optional · up to 400 characters', vis: 'Your choice — default: your collaboration contexts' })}
  ${fi(f, 'interests', 'Interests', { value: '', ph: 'Comma-separated, e.g. urban heat, food resilience', help: 'Optional' })}
  ${role() === 'S' ? fi(f, 'sponsorInt', 'Funding interests', { req: true, ph: 'e.g. Urban heat, tree canopy', help: 'Used to show you matching projects. Not shared with participants.' }) : ''}
  ${banner('info', '', 'Skills, availability and other details are asked for later, only when a workflow needs them.')}
  <div class="actions">${B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'agreement' }, 'btn-g')}<button class="btn btn-p" type="submit">Save and continue</button></div></form>`;
  } else {
    const f = 'pc';
    const ans = S.compass[myId()] || {};
    const sets = blSets();
    const n = sets.length;
    if (!n) {
      a.onb.compass = true;
      save();
      setTimeout(() => go('home'));
      return '';
    }
    if (UI.tab.pcStep == null) {
      const miss = blMissing(myId());
      UI.tab.pcStep = miss.length ? sets.findIndex(s => s.n === miss[0].n) : n - 1;
    }
    const st = Math.max(0, Math.min(UI.tab.pcStep || 0, n - 1));
    const set = sets[st];
    body = `<div class="col onb-h"><p class="over">Step 4 of 4 · Purpose Compass Baseline</p><h1 class="h1">Set your starting point</h1><p class="sub">A few short question sets. Nothing here is scored, and nothing is used to infer sensitive traits. Your answers become the context for your ${WL()}s and Learning Harvests.</p></div>
  <div class="col onb-prog"><div class="row onb-prog-h"><span class="lbl">Set ${st + 1} of ${n}</span><span class="cap">${Math.round((st / n) * 100)}% complete</span></div><div class="progress"><span class="bar" style="width:${(st / n) * 100}%"></span></div></div>
  ${errSum(f)}<form data-f="pc" class="card col onb-card" novalidate><input type="hidden" name="set" value="${st}"><div class="col onb-h"><span class="over">Question set ${st + 1}</span><h2 class="h2">${h(set.n)}</h2>${set.d ? `<p class="cap">${h(set.d)}</p>` : ''}</div>
  ${set.q.map(q => blField(f, q, ans)).join('')}
  ${st === 0 ? `<div class="col onb-have"><span class="lbl">Already in your profile</span>${dl([['Interests', h(claimVals(myId(), 'Interests') || '—')], ['Role assignments', `<div class="col onb-roles">${blRoles(myId())}</div>`]])}<span class="help">Role assignments and their expiry are set by your administrator.</span></div>` : ''}
  ${st === n - 1 ? banner('ok', '', 'Your North Star appears on My PHOENIX as your self-declared direction. You can review and change the whole baseline any time in Profile → Purpose Compass.') : ''}
  <div class="actions">${st ? B(ic('chevl', 16) + 'Previous', 'pcPrev', {}, 'btn-g') : B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'profile' }, 'btn-g')}<div class="row wrap">${B('Save and finish later', 'logout', {}, 'btn-s')}<button class="btn btn-p" type="submit">${st === n - 1 ? 'Finish and go to My PHOENIX' : 'Next'}</button></div></div></form>`;
  }
  return `<div class="onb">${onbTop(cur, steps)}<main class="onb-body">${body}</main></div>`;
}
// Accepting at onboarding (two ticks) or from the policy update dialog (one tick).
F.agr = d => {
  const upd = d.mode === 'update';
  if (
    !validate('agr', d, {
      a1: [['req', 'Tick to accept the agreement.']],
      ...(upd ? {} : { a2: [['req', 'Tick to accept the service terms.']] }),
    })
  )
    return render();
  const a = asg();
  const g = byId('agreements', d.g);
  S.accepts.push({ pid: myId(), ag: g.id, at: now(), receipt: 'RCPT-' + uid(''), role: a.role });
  a.onb.agreement = true;
  a.onb.consents = true;
  const c = (S.consents[myId()] = S.consents[myId()] || { history: [] });
  (c.history = c.history || []).push({ at: now(), t: `Processing purposes covered by ${g.type} v${g.ver}` });
  audit(upd ? 'Policy update accepted' : 'Agreement accepted', g.id, g.type + ' v' + g.ver);
  clearF('agr');
  UI.p = upd ? UI.p : {};
  toast(upd ? 'Thank you. The updated policy is accepted.' : 'Agreement accepted. Receipt stored.');
  ok();
};
A.agrCmp = d => {
  snapForms();
  UI.tab.agrCmp = UI.tab.agrCmp === d.id ? null : d.id;
  render();
};
// The policy as a plain-text file: title, version and effective date, then each section.
A.polDownload = d => {
  const g = byId('agreements', d.id);
  if (!g) return;
  const lines = [g.type + ' — version ' + g.ver, 'Effective ' + fmt(g.effective), ''];
  polSections(g).forEach(s => lines.push(...(s.h ? [s.h] : []), s.t, ''));
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    a.download = (g.type + ' v' + g.ver).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.txt';
    a.click();
  } catch (e) {}
  audit('Policy downloaded', g.id, g.type + ' v' + g.ver);
  toast('Policy downloaded.');
  ok();
};
A.agrNotNow = () => {
  audit('Agreement not accepted (not now)', asg().id, '');
  UI.p = { notnow: 1 };
  render();
};
A.onbBack = d => {
  const a = asg();
  if (d.s === 'agreement') a.onb.agreement = false;
  if (d.s === 'profile') a.onb.profile = false;
  ok();
};
F.prof = d => {
  if (
    !validate('prof', d, {
      ...(role() === 'S' ? { sponsorInt: ['req'] } : {}),
    })
  )
    return render();
  const p = me();
  const pr = (S.profiles[p.id] = S.profiles[p.id] || { ver: 0, history: [] });
  pr.bio = d.bio;
  pr.lang = 'English';
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
      vis: 'Only me',
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
  const sets = blSets();
  const st = +d.set || 0;
  const set = sets[st];
  if (!set) return render();
  if (!validate('pc', d, blRules([set]))) return render();
  blApply(myId(), d, [set]);
  clearF('pc');
  if (st < sets.length - 1) {
    UI.tab.pcStep = st + 1;
    save();
    return render();
  }
  const miss = blMissing(myId());
  if (miss.length) {
    UI.tab.pcStep = sets.findIndex(x => x.n === miss[0].n);
    toast('Answer the required questions in “' + miss[0].n + '” to finish.', 'warn');
    return render();
  }
  asg().onb.compass = true;
  S.compass[myId()]._at = today();
  UI.tab.pcStep = null;
  audit('Purpose Compass Baseline completed', myId(), sets.length + ' question sets');
  toast('Welcome to PHOENIX. Your baseline and North Star are set.');
  save();
  go('home');
};
