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
// Purpose Compass: IKIGAI-inspired reflective questions, not psychometric. PC1–PC6 are the minimum asked at
// onboarding (Build-Freeze review §4.1, BF-10); everything else is asked later, in context. Nothing is scored.
const COMPASS = [
  ['PC1', 'Orientation / meaning', 'What matters most to you right now in this programme, community or stage of your life?', 'Private'],
  ['PC2', 'Goal / current direction', 'What would you like to accomplish, contribute to or become more capable of over the next 3–6 months?', 'Private · share with chosen support roles'],
  ['PC3', 'Main hurdle', 'What is the main hurdle currently making that difficult?', 'High-restriction · private by default'],
  ['PC4', 'Capacity / pathway realism', 'How much time can you realistically commit?', 'Private · matching/pathway roles only if shared'],
  ['PC5', 'First actionable milestone', 'What is one meaningful milestone you could realistically reach in the next 2–4 weeks?', 'Contextual'],
  ['PC6', 'Participant-defined evidence', 'What would help you know you are making meaningful progress?', 'Private'],
  ['PC7', 'Strengths and capabilities', 'What skills, lived experience and relationships do you wish to contribute?', 'Private'],
  ['PC8', 'Learning interest', 'What would you most like to learn or become better at?', 'Private'],
  ['PC9', 'Contribution themes', 'What issues, communities, causes or opportunities are you most interested in contributing to?', 'Private'],
  ['PC10', 'Support needs', 'What people, resources or forms of support would help you progress?', 'Private'],
  ['PC11', 'Opportunity preferences', 'Which opportunities are most relevant now: learning, service, mentoring, leadership, research, project work, livelihood, entrepreneurship, community action?', 'Private'],
  ['PC12', 'Practical constraints', 'Are there working preferences or constraints the platform should respect (schedule, location, language, accessibility, collaboration format)?', 'Private'],
];
// ---- Purpose Compass Baseline: Purpose plus six question sets, the starting point of the journey.
// Answers live in S.compass[pid] beside PC1–PC12; PC keys keep their meaning, the other keys hold the extra sub-questions.
// [key, question, required, help] — the seeded questions. At run time the questions live in S.compassQs and are
// managed by the Platform Administrator (Purpose Compass screen); answers stay in S.compass[pid] under each question id.
const BL_SEED = [
  {
    id: 'B1',
    n: 'What matters and where you are heading',
    d: 'In your own words. You author your direction; PHOENIX only structures it.',
    q: [
      ['PC1', COMPASS[0][2], 1],
      ['PC2', COMPASS[1][2], 1],
      ['PC3', COMPASS[2][2], 1, 'Private by default. Never shown to organisation representatives, sponsors or AI unless you share it.'],
    ],
  },
  {
    id: 'B2',
    n: 'Making it realistic',
    d: 'Turns your direction into a first step you choose.',
    q: [
      ['PC4', COMPASS[3][2], 1],
      ['PC5', COMPASS[4][2], 1],
      ['PC6', COMPASS[5][2], 1],
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
const COMPASS_LATER = 'Asked later, in context (optional)';
const COMPASS_VIS = ['Private', 'Private · share with chosen support roles', 'Contextual', 'High-restriction · private by default', 'High-restriction · explicit sharing only', 'Only me until I change it in Profile'];
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
    out.push({ id, text: q, set: COMPASS_LATER, setNote: 'Optional. Answer when it helps a pathway, opportunity or support conversation.', help: '', req: false, type: 'textarea', onb: false, vis }),
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
      (c.prev = c.prev || []).push({ value: c.value, prov: c.prov, at: now(), why: 'Baseline updated' });
      c.value = v;
      c.ver = (c.ver || 1) + 1;
    }
  } else S.claims.push({ id: uid('cl'), pid, field: 'Skills', value: v, prov: 'Self-declared', vis: 'Only me', state: 'Current', ver: 1, at: now(), src: 'baseline' });
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
      return `<div class="row wrap onb-role"><b>${h(roleName(a.role, a.ctx) || a.role)}</b><span class="row wrap onb-pills">${a.status !== 'Active' && a.status !== 'Expired' ? pill(a.status) : ''}${exp}</span></div>`;
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
// Seed wording. Every agreement keeps the optional purposes OUT of the required terms (BF-02): accepting the
// agreement never grants AI, research, cross-organisation, public/funder or external-exchange use.
function polSeedText(g) {
  const v3 = g.type === 'Participant Agreement' && g.ver >= 3;
  const use =
    'AI processing, research and evaluation, cross-organisation sharing, public or funder release and external-system exchange are five separate optional choices. You make each one yourself, after accepting, and can change it at any time. Saying no never blocks the core collaboration features: your pathway, Circles, Rope Teams, tasks and evidence keep working. Only a pathway step that itself needs a permission waits for it, and it tells you why.' +
    (g.ver === 2 || v3 ? ' AI only drafts, and every draft stays a draft until a person accepts it.' : '') +
    (v3 ? ' New in this version: research use of anonymised reflections is part of the separate Research and evaluation choice. If you have not granted it, your reflections are not used.' : '');
  const rights = 'You can correct information, grant, decline or withdraw any optional purpose, export your authorised records, appeal a decision and request deletion at any time — including while an agreement update is waiting for you.';
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
// Onboarding route E: a material agreement change pauses only participation in the affected context. It is shown in
// place of the work screen; the menu stays usable and own records, consent, correction, appeal, export, Help and
// Report a concern stay open.
function policyGate(g) {
  const prev = polPrev(g);
  const cmp = UI.tab.agrCmp === g.id;
  const links = [['privacy', 'My records & consent'], ['profile', 'Profile'], ['help', 'Help & support'], ['incidents', 'Report a concern']];
  return `${head('Agreement update to review', `${h(g.type)} v${g.ver} took effect on ${fmt(g.effective)} in ${h(ctxName(g.ctx))}.`)}
  ${banner('warn', 'Participation in this context is paused until you review it', 'Only the work areas of this context wait for your answer. Your records, consent choices, correction, appeal, export, Help and Report a concern stay available.')}
  <div class="row wrap pgate-rights">${links.map(([r, l]) => B(ic('chevr', 14) + l, 'go', { r }, 'btn-s btn-sm')).join('')}</div>
  <section class="card col" style="gap:16px"><div class="kv"><div class="col"><span class="cap">Policy</span><b>${h(g.type)}</b></div><div class="col"><span class="cap">Version</span><b>v${g.ver}</b></div><div class="col"><span class="cap">Effective</span><b>${fmt(g.effective)}</b></div></div>
  <div class="row wrap" style="gap:8px">${B(ic('download', 16) + 'Download policy', 'polDownload', { id: g.id })}${prev ? B(ic('eye', 16) + (cmp ? 'Hide differences' : 'Compare with previous policy'), 'agrCmp', { id: g.id }, 'btn-s btn-sm', `aria-expanded="${cmp}"`) : ''}</div>
  ${cmp ? `<section class="col" style="gap:8px"><h3 class="h3">What changed since v${prev.ver}</h3>${g.summary ? `<p class="muted">${h(g.summary)}</p>` : ''}${polDiffHtml(prev, g)}</section>` : ''}
  <section class="col pgate-pol"><h3 class="h3">Current policy</h3>${polBody(g)}</section>
  ${banner('info', 'Your optional permissions are unchanged', 'Accepting this agreement does not switch on AI, research, cross-organisation sharing, public/funder release or external exchange. Change those any time in My records & consent.')}
  <form data-f="agr" class="col" novalidate><input type="hidden" name="g" value="${g.id}"><input type="hidden" name="mode" value="update">${fi('agr', 'a1', `I have read and accept <b>${h(g.type)} v${g.ver}</b>.`, { type: 'checkbox', req: true })}<div class="actions">${B('Not now', 'go', { r: 'privacy' }, 'btn-s')}<button class="btn btn-p" type="submit">Accept and continue</button></div></form></section>`;
}
function onbTop(cur, steps) {
  return `<header class="onb-top"><div class="row onb-brand"><span class="mark">${MARK(20)}</span><span class="wm hide-sm"><b>PHOENIX</b><span>Foundation</span></span></div><nav class="steps" aria-label="Onboarding progress">${steps.map((l, i) => `${i ? '<span class="sline"></span>' : ''}<div class="step ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><span class="n">${i < cur ? ic('check', 14) : i + 1}</span><span class="st">${l}</span></div>`).join('')}</nav><div class="row">${roleChoices().length > 1 ? B('Switch role', 'switcher', {}, 'btn-g btn-sm') : ''}${B('Save and exit', 'logout', {}, 'btn-g btn-sm hide-sm')}</div></header>`;
}
// Onboarding route A: invitation -> verify email -> required agreement -> separate optional permissions ->
// minimum profile -> minimum Purpose Compass (participants) -> role activates -> My PHOENIX with a first next action.
function ONB() {
  const a = asg();
  const isP = roleBase(a.role) === 'P';
  const steps = ['Account', 'Agreement', 'Optional permissions', 'Profile'].concat(isP ? ['Purpose Compass'] : []);
  const cur = !a.onb.agreement ? 1 : !a.onb.consents ? 2 : !a.onb.profile ? 3 : 4;
  let body;
  if (cur === 2) {
    body = consentStep(steps);
  } else if (cur === 1) {
    const g = agrFor(a.ctx, roleBase(a.role));
    if (!g) {
      a.onb.agreement = true;
      save();
      return ONB();
    }
    const f = 'agr';
    body = `<div class="col onb-h"><p class="over">Step 2 of ${steps.length}</p><h1 class="h1">Review your agreement</h1><p class="sub">This agreement applies to your role in ${h(ctxName(a.ctx))}. Optional uses of your information are separate choices on the next step.</p></div>
  <section class="card col onb-card"><div class="kv onb-meta"><div class="col"><span class="cap">Agreement</span><b>${h(g.type)}</b></div><div class="col"><span class="cap">Version</span><b>v${g.ver}</b></div><div class="col"><span class="cap">Effective</span><b>${fmt(g.effective)}</b></div></div>
  <div class="scrollbox" tabindex="0" aria-label="Agreement text"><div class="col onb-pol">${polBody(g)}<p class="cap">Published by the Trust/Data Steward for this programme.</p></div></div>
  <div class="row wrap onb-tools">${B(ic('download', 16) + 'Download policy', 'polDownload', { id: g.id })}</div>
  <form data-f="agr" class="col onb-agr" id="agrf" novalidate>${fi(f, 'a1', `I have read and accept <b>${h(g.type)} v${g.ver}</b>.`, { type: 'checkbox', req: true })}${fi(f, 'a2', 'I accept the PHOENIX service terms.', { type: 'checkbox', req: true })}<input type="hidden" name="g" value="${g.id}"><span class="help">A dated receipt of your acceptance is stored in Privacy & agreements.</span>
  <div class="actions"><button class="btn btn-p" type="submit">Accept and continue</button></div></form></section>`;
  } else if (cur === 3) {
    const f = 'prof';
    const pr = S.profiles[myId()] || {};
    body = `<div class="col onb-h"><p class="over">Step 4 of ${steps.length}</p><h1 class="h1">Your minimum profile</h1><p class="sub">Just the basics. Each field shows who can see it. Every save creates a version.</p></div>${errSum(f)}
  <form data-f="prof" class="card col onb-card" novalidate><div class="f2">${fi(f, 'name', 'Full name', { value: me().name, ro: true, vis: 'You and authorised administration' })}${fi(f, 'display', 'Display name', { value: me().display, ro: true, vis: 'Your collaboration contexts', help: 'Set when your account was created.' })}</div>
  ${me().org ? fi(f, 'aff', 'Organisation / affiliation', { value: S.orgs.find(o => o.id === me().org).name, ro: true, vis: 'Context-visible' }) : ''}
  ${fi(f, 'bio', 'Short biography', { type: 'textarea', rows: 3, max: 400, value: pr.bio, help: 'Optional · up to 400 characters', vis: 'Your choice — default: your collaboration contexts' })}
  ${fi(f, 'interests', 'Interests', { value: '', ph: 'Comma-separated, e.g. urban heat, food resilience', help: 'Optional' })}
  ${role() === 'S' ? fi(f, 'sponsorInt', 'Funding interests', { req: true, ph: 'e.g. Urban heat, tree canopy', help: 'Used to show you matching projects. Not shared with participants.' }) : ''}
  ${banner('info', '', 'Skills, availability and other details are asked for later, only when a workflow needs them.')}
  <div class="actions">${B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'consents' }, 'btn-g')}<button class="btn btn-p" type="submit">Save and continue</button></div></form>`;
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
    body = `<div class="col onb-h"><p class="over">Step 5 of 5 · Purpose Compass</p><h1 class="h1">Set your current direction</h1><p class="sub">Six short questions about what matters to you now. Your answers guide your pathway and opportunities.</p></div>
  <div class="col onb-prog"><div class="row onb-prog-h"><span class="lbl">Set ${st + 1} of ${n}</span><span class="cap">${Math.round((st / n) * 100)}% complete</span></div><div class="progress"><span class="bar" style="width:${(st / n) * 100}%"></span></div></div>
  ${errSum(f)}<form data-f="pc" class="card col onb-card" novalidate><input type="hidden" name="set" value="${st}"><div class="col onb-h"><span class="over">Question set ${st + 1}</span><h2 class="h2">${h(set.n)}</h2>${set.d ? `<p class="cap">${h(set.d)}</p>` : ''}</div>
  ${set.q.map(q => blField(f, q, ans)).join('')}
  ${st === 0 ? `<div class="col onb-have"><span class="lbl">Already in your profile</span>${dl([['Interests', h(claimVals(myId(), 'Interests') || '—')], ['Role assignments', `<div class="col onb-roles">${blRoles(myId())}</div>`]])}<span class="help">Role assignments and their expiry are set by your administrator.</span></div>` : ''}
  ${st === n - 1 ? banner('ok', '', 'Your answers appear on My PHOENIX as “My purpose / current direction”, self-declared. Strengths, learning interests, support needs and opportunity preferences are asked later, only when they help. Change anything in Profile → Purpose Compass.') : ''}
  <div class="actions">${st ? B(ic('chevl', 16) + 'Previous', 'pcPrev', {}, 'btn-g') : B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'profile' }, 'btn-g')}<button class="btn btn-p" type="submit">${st === n - 1 ? 'Finish and go to My PHOENIX' : 'Next'}</button></div></form>`;
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
  const c = (S.consents[myId()] = S.consents[myId()] || { history: [] });
  (c.history = c.history || []).push({ at: now(), t: `Accepted ${g.type} v${g.ver} (required). Optional purposes unchanged.` });
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
      at: now(),
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

// ---- BF-02 optional permissions step: five purposes, each answered on its own; nothing is pre-ticked.
const consentLabel = k => (OPT_PURPOSES.find(x => x[0] === k) || [k, k === 'matching' ? 'Matching visibility' : k])[1];
const consentChoice = (f, k, l, t, cur) =>
  `<fieldset class="cons-row${fe(f, k) ? ' err' : ''}"><legend><b>${h(l)}</b></legend><p class="cap">${h(t)}</p><div class="cons-seg" role="radiogroup" aria-label="${h(l)}">${['Granted', 'Declined']
    .map(v => `<label class="cons-opt"><input type="radio" name="${k}" value="${v}" ${fv(f, k, cur[k] === 'Granted' || cur[k] === 'Declined' ? cur[k] : '') === v ? 'checked' : ''}><span>${v === 'Granted' ? 'Allow' : 'Do not allow'}</span></label>`)
    .join('')}</div>${fe(f, k) ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, k)}</span>` : ''}</fieldset>`;
function consentStep(steps) {
  const f = 'cons';
  const cur = S.consents[myId()] || {};
  return `<div class="col onb-h"><p class="over">Step 3 of ${steps.length}</p><h1 class="h1">Your optional permissions</h1><p class="sub">These are separate from your agreement. Choose each one yourself. Saying no never blocks your pathway, Circles, Rope Teams, tasks or evidence (only a pathway step that itself needs a permission waits for it), and you can change any choice later in My records & consent.</p></div>${errSum(f)}
  <form data-f="cons" class="card col onb-card" novalidate><h2 class="h3">Five optional purposes</h2>${OPT_PURPOSES.map(([k, l, t]) => consentChoice(f, k, l, t, cur)).join('')}
  <h2 class="h3">Matching</h2>${consentChoice(f, 'matching', 'Matching visibility', 'Lets a steward consider the profile fields you allow when suggesting a Match Brief. Contact details are never shared before both sides consent.', cur)}
  <span class="help">Each choice is stored with a date and kept in your consent history.</span>
  <div class="actions">${B(ic('chevl', 16) + 'Back', 'onbBack', { s: 'agreement' }, 'btn-g')}<button class="btn btn-p" type="submit">Save my choices</button></div></form>`;
}
F.cons = d => {
  const keys = [...OPT_PURPOSES.map(x => x[0]), 'matching'];
  const rules = {};
  keys.forEach(k => (rules[k] = [['req', 'Choose Allow or Do not allow.']]));
  if (!validate('cons', d, rules)) return render();
  const c = (S.consents[myId()] = S.consents[myId()] || { history: [] });
  c.history = c.history || [];
  keys.forEach(k => {
    if (c[k] !== d[k]) c.history.push({ at: now(), t: `${consentLabel(k)}: ${c[k] || 'Not asked'} → ${d[k]}` });
    c[k] = d[k];
  });
  asg().onb.consents = true;
  audit('Optional permissions recorded', myId(), keys.map(k => k + '=' + d[k]).join(', '));
  clearF('cons');
  toast('Your choices are saved. You can change them any time.');
  ok();
};
