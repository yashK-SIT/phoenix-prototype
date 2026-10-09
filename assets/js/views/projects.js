// ---------- PROJECTS (5.1–5.2, 6.2) ----------
const PROJECT_AREAS = ['Urban heat', 'Tree canopy', 'Community energy', 'Water', 'Food waste', 'Food resilience', 'Livelihoods', 'Enterprise', 'Education'];
const SECTIONS = [
  'Problem or need',
  'Objectives and expected outcomes',
  'Requirements, scope and initial research',
  'Skills and resources needed',
  'Issues and risks',
  'Tasks and milestones',
  'Project documentation',
  'Summary for reviewers',
];
function draftSections(t, dsc, type) {
  const s = dsc.split(/[.!?]/)[0];
  return [
    `${type} identified: ${s}. The underlying need is a clearer, shared understanding of the problem among the people affected, so that action can be targeted.`,
    `1. Define the problem with the people affected.\n2. Agree a measurable first outcome for “${t}”.\n3. Share results with the programme and relevant local partners.`,
    `In scope: the activities described in the idea; data collected within PHOENIX.\nOut of scope: anything requiring funding or permissions not yet secured.\nInitial research: review approved programme sources and comparable projects; confirm with your steward which sources are approved.`,
    `Skills: coordination, community engagement, basic data analysis.\nResources: volunteer time, any equipment noted in the description, a shared document space.`,
    `Low participation; scope larger than available time; personal or identifiable data collected without consent; dependency on external partners.`,
    `M1 Plan agreed with steward (week 2)\nM2 First activity completed (week 6)\nM3 Findings shared (week 8)\nTasks: recruit help, prepare materials, run activity, write up.`,
    `Project brief, plan, data management note and stakeholder list, organised for steward review.`,
    `“${t}”: ${s}. Three milestones over about eight weeks. Main risks are participation and scope.`,
  ];
}
// ---- review conversation between the project owner and the Programme Administrator / assigned reviewer
const projParty = p => !!p && (p.owner === myId() || (role() === 'F' && p.stewards.includes(myId())) || role() === 'A');
const ctxAdmins = c => [...new Set(S.assign.filter(a => a.ctx === c && roleBase(a.role) === 'A' && a.status === 'Active').map(a => a.pid))];
// Owner and reviewers always; administrators while no reviewer is assigned, or once they have joined the conversation.
const projParties = p => {
  const adm = ctxAdmins(p.ctx).filter(a => !p.stewards.length || (p.thread || []).some(m => m.by === a));
  return [...new Set([p.owner, ...p.stewards, ...adm])];
};
CONVO.project = {
  get: id => byId('projects', id),
  acts: p => (p.history || []).map(x => ({ at: x.at, by: x.by, t: x.t })),
  role: (p, pid) =>
    pid === p.owner
      ? 'Project owner'
      : p.stewards.includes(pid)
        ? 'Assigned reviewer'
        : ctxAdmins(p.ctx).includes(pid)
          ? 'Programme Administrator'
          : '',
  post: p =>
    !projParty(p)
      ? null
      : p.owner === myId()
        ? p.status === 'Clarification requested'
          ? { kind: 'reply', label: 'Reply to the clarification request' }
          : { kind: 'comment', label: 'Message to your reviewer' }
        : { kind: 'comment', label: 'Message to the project owner' },
  notify: (p, kind) =>
    projParties(p)
      .filter(x => x !== myId())
      .forEach(x => notify(x, `${me().name} ${kind === 'reply' ? 'replied to the clarification on' : 'commented on'} “${p.title}”`, 'project', { id: p.id })),
};
const projLog = (p, t) => p.history.push({ at: now(), by: myId(), t });
// The owner has answered the latest clarification request in the review conversation.
const projAnswered = p => {
  if (!p || p.status !== 'Clarification requested') return false;
  const th = p.thread || [];
  const ask = th.map(m => m.kind).lastIndexOf('clarify');
  return ask >= 0 && th.slice(ask + 1).some(m => m.by === p.owner);
};
// The reviewer can accept, or ask for (further) clarification: on a submitted project, or once the owner has answered.
const projDecidable = p => !!p && (p.status === 'Submitted' || projAnswered(p));
// Project listing, following the Circles listing: one list in a card, phase tabs with counts, search, filters, sort.
const PROJ_PHASES = ['Draft', 'Under review', 'Active', 'Closed', 'Rejected'];
const projPhase = p =>
  p.status === 'Draft' ? 'Draft' : ['Submitted', 'Clarification requested'].includes(p.status) ? 'Under review' : p.status === 'Rejected' ? 'Rejected' : p.stage === 'Closed' ? 'Closed' : 'Active';
route('projects', 'projects', () => {
  const r = role();
  const list = S.projects.filter(
    p =>
      inCtx(p) &&
      (r === 'P'
        ? p.owner === myId()
        : r === 'F'
          ? stewardOf(p) || p.status !== 'Draft'
          : r === 'O'
            ? p.status !== 'Draft'
            : true),
  );
  const phases = PROJ_PHASES.filter(x => list.some(p => projPhase(p) === x));
  return (
    head(
      r === 'P' ? 'My projects' : 'Projects',
      r === 'O'
        ? 'Projects in your organisation’s context (read-only)'
        : r === 'F'
          ? 'Submissions and projects you steward'
          : 'Ideas, needs and opportunities moving from submission to closure.',
      r === 'P' ? B(ic('plus', 16) + 'Start a project', 'go', { r: 'newproject' }, 'btn-p') : '',
    ) +
    card(
      r === 'P' ? 'Your projects' : 'Projects',
      '',
      dataView('projects:list', {
        label: 'projects',
        items: list,
        search: p => [p.title, p.type, P(p.owner).name, p.area || '', ...(p.tags || []), ...p.stewards.map(s => P(s).name)].join(' '),
        quick: { label: 'Phase', options: phases.map(x => [x, x]), test: (p, v) => projPhase(p) === v },
        filters: [
          dvOpts(list, p => p.status).length > 1 && { key: 'status', label: 'Status', options: dvOpts(list, p => p.status), test: (p, v) => p.status === v },
          dvOpts(list, p => p.stage).length && { key: 'stage', label: 'Stage', options: dvOpts(list, p => p.stage, stageLabel), test: (p, v) => p.stage === v },
          dvOpts(list, p => p.tags || []).length && { key: 'area', label: 'Area of interest', options: dvOpts(list, p => p.tags || []), test: (p, v) => (p.tags || []).includes(v) },
          dvOpts(list, p => p.owner).length > 1 && { key: 'owner', label: 'Owner', options: dvOpts(list, p => p.owner, id => P(id).name), test: (p, v) => p.owner === v },
        ].filter(Boolean),
        sorts: [
          ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
          ['submitted', 'Submitted', (a, b) => String(b.submitted || '').localeCompare(String(a.submitted || ''))],
          ['funding', 'Funding need', (a, b) => (b.fundingNeed || 0) - (a.fundingNeed || 0)],
        ],
        defaultSort: 'title',
        row: p => ({
          lead: `<span class="tile t-navy" aria-hidden="true">${ic('folder', 18)}</span>`,
          title: L(h(p.title), 'project', { id: p.id }, 'dv-link'),
          sub: h(p.type) + (p.area ? ' · ' + h(p.area) : ''),
          meta: [
            r !== 'P' ? 'Owner <b>' + nm(p.owner) + '</b>' : '',
            'Steward <b>' + (p.stewards.map(nm).join(', ') || 'not assigned') + '</b>',
            (p.tags || []).length ? `<span class="rec-tags">${p.tags.slice(0, 3).map(x => `<span class="rec-tag">${h(x)}</span>`).join('')}${p.tags.length > 3 ? `<span class="cap">+${p.tags.length - 3}</span>` : ''}</span>` : '',
            p.submitted ? 'Submitted ' + fmt(p.submitted) : '',
            p.fundingNeed ? 'Funding need ' + money('USD', p.fundingNeed) : '',
          ],
          badges: pill(p.status) + (p.stage ? pill(stageLabel(p.stage), SC[p.stage]) : ''),
          primary: L('Open', 'project', { id: p.id }, 'btn btn-s btn-sm'),
        }),
        empty: r === 'P' ? ['folder', 'You have no projects yet', 'Start one from an idea, need or opportunity.', B(ic('plus', 16) + 'Start a project', 'go', { r: 'newproject' }, 'btn-p btn-sm')] : ['folder', 'No projects yet', 'Submitted projects in this programme appear here.', ''],
      }),
    )
  );
});
// Distinct values of a field across a list, as [value, label] options for a Data View filter (sorted by label).
function dvOpts(list, get, label = x => x) {
  return [...new Set(list.flatMap(x => [].concat(get(x) ?? [])).filter(v => v != null && v !== ''))]
    .map(v => [v, label(v)])
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
}
route('newproject', 'aireq', () => {
  const f = 'np';
  const pid = UI.p.id;
  const pr = pid ? byId('projects', pid) : null;
  if (pr && pr.owner !== myId()) return deniedView('aireq');
  const st = pr && pr.sections ? UI.tab.npStage || 'review' : 'intake';
  const okAI = consent(myId(), 'ai') === 'Granted' && S.settings.aiAvailable;
  if (st === 'intake')
    return (
      head(
        pr ? 'Edit project' : 'Define a new project',
        'Start in your own words. PHOENIX can draft each section — you review every part before anything is submitted.',
        '',
        [['My projects', 'projects'], ['New project']],
      ) +
      `<div class="g12 np-wrap"><form data-f="np" class="card c8 col np-form" novalidate>${errSum(f)}<input type="hidden" name="id" value="${pr ? pr.id : ''}">
  <div class="np-sec"><div class="np-sh"><span class="np-n" aria-hidden="true">1</span><h2 class="h3">The idea</h2></div>
  <fieldset class="np-fs col"><legend class="lbl">What are you starting with? <span class="req">*</span></legend><div class="g3 np-choices">${[
    ['Need', 'Something you or a community lacks.'],
    ['Opportunity', 'An opening others could take up.'],
    ['Project idea', 'Something you want to build or test.'],
  ]
    .map(
      ([v, dd]) =>
        `<label class="choice np-choice ${fv(f, 'type', pr?.type || 'Project idea') === v ? 'sel' : ''}"><input type="radio" name="type" value="${v}" ${fv(f, 'type', pr?.type || 'Project idea') === v ? 'checked' : ''} data-ch="npType"><span class="rad" aria-hidden="true"></span><span class="col np-ct"><b>${v}</b><span class="cap">${dd}</span></span></label>`,
    )
    .join('')}</div></fieldset>
  ${fi(f, 'title', 'Working title', { req: true, value: pr?.title, ph: 'e.g. Community cooling map for Ward 7', max: 120 })}
  ${fi(f, 'desc', 'Describe it in your own words', { type: 'textarea', rows: 6, req: true, value: pr?.desc, ph: 'What is the need or idea? Who is affected? What would be different if it worked?', help: 'At least 40 characters.' })}</div>
  <div class="np-sec"><div class="np-sh"><span class="np-n" aria-hidden="true">2</span><h2 class="h3">Who should find it</h2></div>
  <fieldset class="np-fs col"><legend class="lbl">Areas of interest</legend><div class="np-chips">${[...PROJECT_AREAS, ...(pr?.tags || []).filter(t => !PROJECT_AREAS.includes(t))].map(a => `<label class="chipchk np-chip"><input type="checkbox" name="tags" value="${h(a)}" ${[].concat(fv(f, 'tags', pr?.tags || [])).includes(a) ? 'checked' : ''}><span>${h(a)}</span></label>`).join('')}</div><div class="field np-other"><label class="lbl" for="np_areaOther">Add your own</label><input id="np_areaOther" name="areaOther" class="input" value="${h(fv(f, 'areaOther', ''))}" placeholder="Comma-separated, e.g. Air quality, School gardens" maxlength="160"></div><span class="help">Helps stewards and sponsors find relevant projects. Sponsors see only approved sponsor-visible information.</span></fieldset></div>
  <div class="np-sec"><div class="np-sh"><span class="np-n" aria-hidden="true">3</span><h2 class="h3">Place and funding</h2></div>
  <div class="f2">${fi(f, 'area', 'Location or programme area (optional)', { value: pr?.area, ph: 'e.g. Ward 7, Excelsior City' })}${fi(f, 'fundingNeed', 'Funding requirement in USD (optional)', { type: 'number', min: 0, value: pr?.fundingNeed, help: 'Only if the project will seek sponsor funding.' })}</div></div>
  <div class="actions">${L('Cancel', 'projects', {}, 'btn btn-g')}<div class="row wrap"><button class="btn btn-s" type="submit" name="go" value="save">Save draft</button><button class="btn btn-p" type="submit" name="go" value="gen">${okAI ? 'Draft sections with PHOENIX' : 'Continue to sections'}</button></div></div></form>
  <aside class="c4 col np-side">${okAI ? `<div class="card col np-ai">${aiTag('AI-assisted · Class B workflow draft')}<b>PHOENIX will draft 8 sections</b><ol class="np-seclist">${SECTIONS.map(s => `<li>${s}</li>`).join('')}</ol><p class="cap">Each stays a draft until you accept, edit or reject it.</p></div>` : banner('warn', S.settings.aiAvailable ? 'AI processing is off' : 'AI is unavailable', S.settings.aiAvailable ? `You can write each section yourself. To get drafts, turn on AI in ${L('Privacy & consent', 'privacy')}.` : 'You can write each section yourself; drafting will work again when the service is back.')}${card('What happens next', '', '<p class="cap">You submit for Faculty/Steward review. They may ask for clarification, then accept it and set up a Circle.</p>', '', 'quiet')}</aside></div>`
    );
  // review sections
  const secs = pr.sections;
  const act = UI.tab.npSec || 0;
  const done = secs.filter(s => ['Accepted', 'Edited'].includes(s.st)).length;
  return (
    head(h(pr.title), 'Review each section. Accept, edit or reject AI drafts — or write your own.', '', [
      ['My projects', 'projects'],
      [h(pr.title), 'project', { id: pr.id }],
      ['Sections'],
    ]) +
    `<div class="g12 np-review"><aside class="card c4 np-rail"><div class="np-rail-h"><b>Sections</b><span class="cap">${done} of 8 reviewed</span></div><div class="progress np-prog"><span class="bar" style="width:${(done / 8) * 100}%"></span></div><div class="srail np-srail">${secs.map((s, i) => `<button type="button" class="sitem np-sitem ${i === act ? 'on' : ''}" data-a="npSec" data-i="${i}" ${i === act ? 'aria-current="step"' : ''}><span class="sn">${i + 1}</span><span class="np-st">${SECTIONS[i]}</span>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</button>`).join('')}</div></aside>
 <form data-f="sec" class="card c8 col np-secform" novalidate><input type="hidden" name="i" value="${act}"><div class="np-sec-h"><div><span class="cap">Section ${act + 1} of 8</span><h2 class="h2">${act + 1}. ${SECTIONS[act]}</h2></div>${secs[act].ai ? aiTag(secs[act].st === 'To review' ? 'AI draft · not yet accepted' : 'AI-assisted') : pill('Written by you', 'p-grey')}</div>
 ${fi('sec', 'text', 'Section content', { type: 'textarea', rows: 9, value: secs[act].text, req: true })}${secs[act].st === 'Rejected' ? banner('warn', '', 'You rejected this draft. Write your own version and save it, or regenerate.') : ''}
 <div class="actions np-sec-a">${okAI ? `<button class="btn btn-g btn-sm" type="submit" name="d" value="regen">${ic('refresh', 16)}Regenerate</button>` : '<span></span>'}<div class="row wrap"><button class="btn btn-s btn-sm" type="submit" name="d" value="Rejected">Reject</button><button class="btn btn-s btn-sm" type="submit" name="d" value="Edited">Save my edits</button><button class="btn btn-p btn-sm" type="submit" name="d" value="Accepted">${ic('check', 16)}Accept</button></div></div></form></div>
 <div class="actions np-foot">${B(ic('chevl', 16) + 'Back to idea', 'npBack', {}, 'btn-g')}${done === 8 ? B('Continue to review and submit' + ic('arrow', 16), 'go', { r: 'project', id: pr.id }, 'btn-p') : `<div class="row"><span class="help hide-sm">Review all 8 sections to continue</span><button class="btn btn-p" type="button" disabled>Continue to review and submit</button></div>`}</div>`
  );
});
A.npType = (d, el) => {
  const form = el.closest('form');
  const x = {};
  new FormData(form).forEach((v, k) => (x[k] = v));
  UI.form.np = x;
  render();
};
A.npSec = d => {
  UI.tab.npSec = +d.i;
  render();
};
A.npBack = () => {
  UI.tab.npStage = 'intake';
  render();
};
F.np = (d, form) => {
  const sub = d.go || 'gen';
  if (!validate('np', d, { type: ['req'], title: ['req'], desc: ['req', ['min', 40]] })) return render();
  let p = d.id && byId('projects', d.id);
  if (!p) {
    p = {
      id: uid('pr'),
      owner: myId(),
      ctx: ctxId(),
      status: 'Draft',
      stage: null,
      stewards: [],
      clar: [],
      history: [],
    };
    S.projects.push(p);
  }
  const own = (d.areaOther || '').split(',').map(x => x.trim()).filter(Boolean).map(x => x.slice(0, 40));
  const tags = [...new Set([...[].concat(d.tags || []), ...own].map(x => x.trim()).filter(Boolean))];
  Object.assign(p, { type: d.type, title: d.title.trim(), desc: d.desc.trim(), tags, area: (d.area || '').trim(), fundingNeed: +d.fundingNeed || null });
  clearF('np');
  if (sub === 'save') {
    audit('Project draft saved', p.id, '');
    toast('Draft saved.');
    save();
    return go('projects');
  }
  const okAI = consent(myId(), 'ai') === 'Granted' && S.settings.aiAvailable;
  if (!p.sections || p.sections.every(s => s.st === 'To review')) {
    const dr = draftSections(p.title, p.desc, p.type);
    p.sections = SECTIONS.map((s, i) => ({ text: okAI ? dr[i] : '', ai: okAI, st: 'To review' }));
    if (okAI) {
      S.ai.push({
        id: uid('aj'),
        by: myId(),
        cls: 'B',
        purpose: 'Project requirement draft · ' + p.title,
        sources: 'User input',
        consent: 'Granted',
        model: '[Provider model via AI gateway]',
        status: 'Draft',
        at: today(),
      });
      S.settings.aiUsed++;
    }
  }
  audit('Project sections ' + (okAI ? 'drafted with AI' : 'opened for manual entry'), p.id, '');
  UI.tab.npStage = 'review';
  UI.tab.npSec = 0;
  save();
  go('newproject', { id: p.id });
};
F.sec = d => {
  const sub = d.d || 'Edited';
  const p = byId('projects', UI.p.id);
  const s = p.sections[+d.i];
  if (sub === 'regen') {
    s.text = draftSections(p.title, p.desc, p.type)[+d.i] + ' (regenerated)';
    s.ai = true;
    s.st = 'To review';
    S.settings.aiUsed++;
    return ok();
  }
  if (sub === 'Rejected') {
    s.st = 'Rejected';
    s.text = d.text;
    return ok();
  }
  if (!validate('sec', d, { text: [['req', 'This section cannot be empty. Write it yourself or regenerate.']] }))
    return render();
  const edited = d.text.trim() !== (s.text || '').trim();
  s.text = d.text;
  s.st = sub === 'Accepted' ? (edited || !s.ai ? 'Edited' : 'Accepted') : sub;
  clearF('sec');
  UI.tab.npSec = Math.min(7, +d.i + 1);
  ok();
};
route('project', 'projects', () => {
  const p = byId('projects', UI.p.id);
  if (!p) return empty('folder', 'Project not found', '');
  const r = role();
  const own = p.owner === myId();
  if (r === 'P' && !own) return deniedView('projects');
  const steps = [
    'Draft',
    'Submitted',
    p.status === 'Rejected' ? 'Rejected' : 'Under review',
    'Accepted',
    'Circle',
    'Rope Team',
    'Room',
    'Final review',
    'Closed',
  ];
  const ci =
    p.stage === 'Closed'
      ? 8
      : p.stage === 'Final review'
        ? 7
        : p.stage === 'Room'
          ? 6
          : p.stage === 'Rope Team'
            ? 5
            : p.stage === 'Circle'
              ? 4
              : p.status === 'Accepted'
                ? 3
                : ['Clarification requested', 'Rejected'].includes(p.status) || (p.status === 'Submitted' && p.stewards.length)
                  ? 2
                  : p.status === 'Submitted'
                    ? 1
                    : 0;
  const tl = `<section class="card prj-life" aria-label="Project lifecycle"><div class="prj-life-h"><h2 class="h3">Lifecycle</h2><span class="cap">Step ${ci + 1} of ${steps.length}</span></div><ol class="prj-steps">${steps.map((s, i) => `<li class="prj-step ${i < ci ? 'done' : i === ci ? 'cur' : 'todo'}"${i === ci ? ' aria-current="step"' : ''}><span class="td">${i < ci ? ic('check', 14) : i + 1}</span><span class="prj-sl">${s === 'Room' ? WL() : s}</span></li>`).join('')}</ol></section>`;
  let actions = '';
  if (own && p.status === 'Draft') actions = B('Edit sections', 'editAfterClar', { id: p.id });
  if (own && p.status === 'Clarification requested')
    actions = B('Update sections', 'editAfterClar', { id: p.id }, 'btn-s');
  const rev = (r === 'F' && stewardOf(p)) || r === 'A';
  const answered = projAnswered(p);
  if (rev && projDecidable(p))
    actions =
      B(answered ? 'Ask a follow-up' : 'Request clarification', 'clarify', { id: p.id }) +
      B('Reject', 'rejectProj', { id: p.id }) +
      B('Accept project', 'acceptProj', { id: p.id }, 'btn-p btn-sm');
  else if (rev && p.status === 'Clarification requested') actions = B('Reject', 'rejectProj', { id: p.id });
  if (((r === 'F' && stewardOf(p)) || own) && p.status === 'Accepted' && !p.circle && canCreateCircle())
    actions = B(ic('plus', 14) + 'Create Circle', 'newCircle', { project: p.id }, 'btn-p btn-sm');
  if (r === 'F' && stewardOf(p) && p.status === 'Accepted' && p.circle && !['Final review', 'Closed'].includes(p.stage))
    actions = B(ic('link', 14) + 'Find a collaborator', 'collabFind', { project: p.id });
  if (r === 'F' && stewardOf(p) && p.stage === 'Final review')
    actions =
      B('Request changes', 'finalReview', { id: p.id, v: 'changes' }) +
      B('Approve deliverables', 'finalReview', { id: p.id, v: 'approve' }, 'btn-p btn-sm');
  if (own && p.stage === 'Room' && p.room) {
    const rm = byId('rooms', p.room);
    actions = B('Submit final deliverables', 'submitFinal', { id: p.id }, 'btn-p btn-sm');
  }
  // The reviewer is assigned once and is not changed afterwards.
  if (r === 'A' && p.status !== 'Rejected' && !p.stewards.length) actions += B('Assign reviewer', 'assignStewards', { id: p.id }, 'btn-p btn-sm');
  const lastRej = p.status === 'Rejected' && (p.thread || []).filter(m => m.kind === 'reject').slice(-1)[0];
  if (r === 'F' && stewardOf(p) && p.stage === 'Closed') actions = '';
  if (own && ownRoomProjects().includes(p))
    actions += B(ic('room', 14) + 'Create ' + WL(), 'newRoom', { origin: 'Project', project: p.id, oid: p.rope || p.circle || '' }, p.circle ? 'btn-p btn-sm' : 'btn-s btn-sm');
  if (projEditable(p)) actions = B(ic('edit', 14) + 'Edit details', 'projEdit', { id: p.id }) + actions;
  // A project submitted without the 8-section draft can still be resubmitted after a clarification.
  const ready = p.sections ? p.sections.every(s => ['Accepted', 'Edited'].includes(s.st)) : p.status !== 'Draft';
  return (
    crumbsHtml([
      ['Projects', 'projects'],
      [h(p.title)],
    ]) +
    `<div class="shead-main prj-head"><span class="tile" aria-hidden="true">${ic('folder', 20)}</span><div class="shead-t"><div class="shead-kind">Project · ${h(p.stage ? stageLabel(p.stage) : p.status)}</div><div class="row wrap prj-ttl"><h1 class="h1">${h(p.title)}</h1>${pill(p.status)}</div><div class="shead-meta"><span>${h(p.type)}</span><span>Owner · ${nm(p.owner)}</span><span>${p.stewards.length ? 'Steward · ' + p.stewards.map(nm).join(', ') : 'No reviewer yet'}</span>${p.fundingNeed ? `<span>Funding need · ${money('USD', p.fundingNeed)}</span>` : ''}${p.area ? `<span>${h(p.area)}</span>` : ''}</div>${(p.tags || []).length ? `<div class="rec-tags prj-tags">${p.tags.map(x => `<span class="rec-tag">${h(x)}</span>`).join('')}</div>` : ''}</div>${actions.trim() ? `<div class="shead-a">${actions}</div>` : ''}</div>` +
    tl +
    stageTrack(p, 'projects') +
    `<div class="prj-notes">` +
    p.clar
      .filter(c => !c.resolved)
      .map(c => banner('warn', 'Clarification requested by ' + nm(c.by), `“${h(c.text)}” · ${fmt(c.at)}${own ? ' · Reply in the review conversation below, update the sections if needed, then resubmit.' : ''}`, 'message'))
      .join('') +
    (rev && p.status === 'Clarification requested'
      ? answered
        ? banner('info', nm(p.owner) + ' replied', 'Read the reply in the review conversation below, then accept the project, ask a follow-up or reject it.', 'message')
        : banner('info', 'Waiting for ' + nm(p.owner), 'You can accept the project once the owner replies in the review conversation or resubmits it.')
      : '') +
    (lastRej ? banner('err', 'Rejected by ' + nm(lastRej.by), `“${h(lastRej.text)}” · ${fmt(lastRej.at)}`) : '') +
    (p.status === 'Submitted' && !p.stewards.length ? banner('info', 'Waiting for a reviewer', r === 'A' ? 'Assign a Steward, Faculty member or Facilitator to review this project.' : 'The Programme Administrator assigns a Steward, Faculty member or Facilitator to review this project. You are notified when it is assigned.') : '') +
    (p.stage === 'Final review' && p.finalNote ? banner('info', 'Final deliverables submitted', h(p.finalNote)) : '') +
    (p.changesNote ? banner('warn', 'Changes requested', h(p.changesNote)) : '') +
    `</div>` +
    `<div class="g12 prj-body"><div class="c8 col prj-main"><section class="card prj-summary"><div class="card-h"><div><h2 class="h2">Project summary</h2>${p.sections ? `<p class="cap">${p.sections.filter(s => ['Accepted', 'Edited'].includes(s.st)).length} of 8 sections accepted or edited</p>` : ''}</div></div>${p.sections ? `<ol class="prj-secs">${p.sections.map((s, i) => `<li class="prj-sec"><span class="sn" aria-hidden="true">${i + 1}</span><div class="prj-sec-b"><div class="prj-sec-t"><h3 class="h3">${SECTIONS[i]}</h3>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</div><p class="prj-sec-x">${h(s.text) || '<span class="cap">Empty</span>'}</p></div></li>`).join('')}</ol>` : `<p class="muted">${h(p.desc || 'No sections yet.')}</p>`}</section>
 ${projParty(p) && p.status !== 'Draft' ? card('Review conversation and activity', 'Messages between the project owner, the Programme Administrator and the assigned reviewer, with every review step. Oldest first.', convoHtml('project', p), '', 'cv-card') : ''}
 ${projEvidenceCard(p)}
 ${projParty(p) && p.status !== 'Draft'
   ? ''
   : card(
       'History',
       '',
       p.history.length
         ? `<ol class="timeline prj-hist">${p.history
             .slice()
             .reverse()
             .map(x => `<li class="tl"><span class="cap">${fmt(x.at)}</span><p>${h(x.t)}</p></li>`)
             .join('')}</ol>`
         : '<p class="cap">—</p>',
     )}</div>
 <aside class="c4 col prj-side">${own && ['Draft', 'Clarification requested'].includes(p.status) ? card('Before you submit', '', `<form data-f="submitProj" class="col prj-submit" novalidate><input type="hidden" name="id" value="${p.id}">${!ready ? banner('warn', '', 'All 8 sections must be accepted or edited first.') : ''}${fi('sp', 'c1', 'I have reviewed every AI-drafted section and accept responsibility for the content.', { type: 'checkbox', req: true })}${fi('sp', 'c2', 'I understand reviewers in this programme will see this project.', { type: 'checkbox', req: true })}${p.status === 'Clarification requested' ? fi('sp', 'note', 'What you changed (optional)', { type: 'textarea', rows: 3, max: 2000, help: 'Added to the review conversation.' }) : ''}<button class="btn btn-p btn-block" type="submit" ${ready ? '' : 'disabled'}>${p.status === 'Clarification requested' ? 'Resubmit for review' : 'Submit for review'}</button></form>`, '', 'accent') : ''}
 ${card('Linked spaces', '', [p.circle && lrow('users', cName(p.circle), 'Circle', L('Open', 'circle', { id: p.circle }), 't-purple'), p.rope && lrow('route', cName(p.rope), 'Rope Team', L('Open', 'rope', { id: p.rope }), 't-teal'), p.room && lrow('room', cName(p.room), WL(), L('Open', 'room', { id: p.room }), 't-navy'), p.funding && lrow('coin', 'Sponsor funding', 'Stage-wise tranches', L('Open', 'funding', {}))].filter(Boolean).join('') || '<p class="cap">Spaces are linked, not converted. A Circle is created when the project is accepted.</p>', '', 'prj-panel')}
 ${card(
   'Stewards and support path',
   '',
   dl([
     ['Reviewer', p.stewards.map(nm).join(', ') || 'Assigned by the Programme Administrator after submission'],
     ['Support path', h(pathLabel(p.supportPath) || 'Chosen on acceptance')],
   ]),
   '',
   'prj-panel',
 )}
 ${p.owner === myId() ? interestedSponsors(p) : ''}
 ${(S.stageReports || []).some(x => x.project === p.id) ? card('Reports along the chain', 'Circle → Rope Team → ' + WL(), (S.stageReports || []).filter(x => x.project === p.id).slice().reverse().map(x => lrow('send', h(x.kind), h(x.t) + `<span class="cap prj-rep">${cName(x.from)} → ${cName(x.to)} · ${nm(x.by)} · ${fmt(x.at)}</span>`)).join(''), '', 'prj-panel') : ''}</aside></div>`
  );
});
// Sponsors who showed interest in this project (saved it, pitched, funded or messaged). The owner can message them.
function interestedSponsors(p) {
  const ids = new Set([
    ...Object.entries(S.saved || {}).filter(([, l]) => (l || []).includes(p.id)).map(([pid]) => pid),
    ...S.funding.filter(f => f.project === p.id).map(f => f.sponsor),
    ...S.pitches.filter(x => x.project === p.id).map(x => x.to),
    ...(S.dms || []).filter(x => x.project === p.id).flatMap(x => x.members.map(m => m.pid)),
  ]);
  const sp = [...ids].filter(pid => pid !== p.owner && S.assign.some(a => a.pid === pid && roleBase(a.role) === 'S' && a.status === 'Active'));
  return card(
    'Interested sponsors',
    'Sponsors who saved, funded or were pitched this project. Messages are between you and the sponsor only.',
    sp.map(pid => {
      const why = [(S.saved[pid] || []).includes(p.id) && 'saved it', S.funding.some(f => f.project === p.id && f.sponsor === pid) && 'funding', S.pitches.some(x => x.project === p.id && x.to === pid) && 'pitched by you'].filter(Boolean).join(' · ');
      return lrow('coin', nm(pid), h((S.orgs.find(o => o.id === P(pid).org) || {}).name || 'Sponsor') + (why ? ' · ' + why : ''), B(ic('message', 14) + 'Message', 'dmOpen', { pid, project: p.id }));
    }).join('') || '<p class="cap">No sponsor has shown interest yet.</p>',
    '',
    'prj-panel',
  );
}
// Evidence for this project: linked to the project or to its Circle, Rope Team or Action Room.
function projEvidenceCard(p) {
  const own = p.owner === myId();
  const st = (role() === 'F' && stewardOf(p)) || role() === 'A';
  const list = S.evidence.filter(e => evProjects(e).includes(p) && (own || st || evVisible(e)));
  const space = p.room || p.rope || p.circle;
  return card(
    'Evidence',
    list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') + ' from this project and its spaces' : 'Evidence linked to this project or its Circle, Rope Team or ' + WL() + ' appears here.',
    list.map(e => lrow('award', L(h(e.title), 'evidence', { id: e.id }), h(e.type) + ' · ' + (e.linked || []).map(cName).join(', ') + ' · ' + nm(e.owner), `<span class="prj-ev-st">${pill(e.review)} ${evLevel(e.level)}</span>`)).join('') || '<p class="cap">No evidence yet.</p>',
    (own || memberOf(byId('circles', p.circle) || byId('rooms', p.room) || {})) && space && can('evidence', 'CRM') ? B(ic('upload', 14) + 'Upload', 'go', { r: 'newevidence', link: space }) : '',
    'prj-ev',
  );
}
F.submitProj = d => {
  if (
    !validate('sp', d, {
      c1: [['req', 'Confirm you reviewed the content.']],
      c2: [['req', 'Confirm you understand who will see it.']],
    })
  )
    return render();
  const p = byId('projects', d.id);
  const re = p.status === 'Clarification requested';
  p.status = 'Submitted';
  p.submitted = today();
  p.clar.forEach(c => (c.resolved = true));
  if (re && (d.note || '').trim()) convoAdd(p, 'resubmit', d.note.trim());
  else projLog(p, re ? 'Resubmitted after clarification' : 'Submitted for review');
  // The Programme Administrator assigns the reviewer; a resubmission goes straight back to the assigned reviewer.
  if (p.stewards.length) p.stewards.forEach(s => notify(s, `${re ? 'Resubmitted' : 'New'} project for review: “${p.title}”`, 'project', { id: p.id }));
  else
    S.assign
      .filter(a => a.ctx === p.ctx && roleBase(a.role) === 'A' && a.status === 'Active')
      .forEach(a => notify(a.pid, `Assign a reviewer to the new project “${p.title}”`, 'admin', { tab: 'requests' }));
  audit('Project submitted', p.id, p.stewards.length ? 'Reviewers: ' + p.stewards.join(',') : 'Awaiting reviewer assignment');
  clearF('sp');
  toast(p.stewards.length ? 'Resubmitted to your reviewer.' : 'Submitted. The Programme Administrator will assign a Steward, Faculty member or Facilitator to review it.');
  ok();
};
// ---- the project owner edits the project's details until it is closed or rejected (the 8 sections have their own flow)
const projEditable = p => !!p && p.owner === myId() && p.status !== 'Rejected' && p.stage !== 'Closed';
A.projEdit = d => {
  const p = byId('projects', d.id);
  clearF('pje');
  UI.form.pje = { type: p.type, title: p.title, desc: p.desc || '', tags: (p.tags || []).join(', '), area: p.area || '', fundingNeed: p.fundingNeed || '' };
  modal(
    'Edit project details',
    () =>
      `<form data-f="pje" class="col prj-submit" novalidate>${errSum('pje')}<input type="hidden" name="id" value="${p.id}"><div class="f2">${fi('pje', 'title', 'Working title', { req: true, max: 120 })}${fi('pje', 'type', 'Starting point', { type: 'select', req: true, opts: ['Need', 'Opportunity', 'Project idea'] })}</div>${fi('pje', 'desc', 'Description', { type: 'textarea', rows: 5, req: true, help: 'At least 40 characters.' })}${fi('pje', 'tags', 'Areas of interest', { ph: 'e.g. Urban heat, Water', help: 'Comma-separated.' })}<div class="f2">${fi('pje', 'area', 'Location or programme area')}${fi('pje', 'fundingNeed', 'Funding requirement in USD', { type: 'number', min: 0 })}</div>${banner('info', '', p.status === 'Draft' ? 'The 8 sections are edited with Edit sections.' : 'Your reviewer is told what changed. The 8 sections are not changed here.')}<div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">Save changes</button></div></form>`,
    true,
  );
};
F.pje = d => {
  if (!validate('pje', d, { title: ['req'], type: ['req'], desc: ['req', ['min', 40]], fundingNeed: [['fn', { f: v => !v || Number(v) >= 0, m: 'Enter 0 or more.' }]] })) return render();
  const p = byId('projects', d.id);
  const next = {
    type: d.type,
    title: d.title.trim(),
    desc: d.desc.trim(),
    tags: [...new Set((d.tags || '').split(',').map(x => x.trim().slice(0, 40)).filter(Boolean))],
    area: (d.area || '').trim(),
    fundingNeed: +d.fundingNeed || null,
  };
  const ch = changedFields({ ...p, tags: (p.tags || []).join(',') }, { ...next, tags: next.tags.join(',') }, { title: 'title', type: 'starting point', desc: 'description', tags: 'areas', area: 'location', fundingNeed: 'funding need' });
  UI.modal = null;
  clearF('pje');
  if (!ch.length) {
    toast('No changes to save.');
    return ok();
  }
  Object.assign(p, next);
  projLog(p, 'Details edited by the owner: ' + ch.join(', '));
  if (p.status !== 'Draft')
    projParties(p)
      .filter(x => x !== myId())
      .forEach(x => notify(x, me().name + ' edited “' + p.title + '”: ' + ch.join(', '), 'project', { id: p.id }));
  audit('Project edited', p.id, ch.join(', '));
  toast('Project updated.');
  ok();
};
A.editAfterClar = d => {
  const p = byId('projects', d.id);
  UI.tab.npStage = p.sections ? 'review' : 'intake';
  clearF('np');
  go('newproject', { id: d.id });
};
A.clarify = d => {
  clearF('clar');
  modal(
    'Request clarification',
    () =>
      `<form data-f="clar" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${d.id}">${fi('clar', 'text', 'What needs clarifying?', { type: 'textarea', rows: 4, req: true, help: 'Added to the review conversation. The project owner can reply there and resubmit.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send to the project owner</button></div></form>`,
  );
};
F.clar = d => {
  if (!validate('clar', d, { text: ['req', ['min', 10]] })) return render();
  const p = byId('projects', d.id);
  p.status = 'Clarification requested';
  p.clar.push({ at: now(), by: myId(), text: d.text.trim() });
  convoAdd(p, 'clarify', d.text.trim());
  projParties(p)
    .filter(x => x !== myId())
    .forEach(x => notify(x, `${x === p.owner ? 'Clarification requested on' : me().name + ' asked for clarification on'} “${p.title}”`, 'project', { id: p.id }));
  audit('Clarification requested', p.id, d.text);
  UI.modal = null;
  clearF('clar');
  ok();
};
A.rejectProj = d => {
  clearF('prej');
  const p = byId('projects', d.id);
  modal(
    'Reject project',
    () =>
      `<form data-f="prej" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}">${dl([['Project', h(p.title)], ['Owner', nm(p.owner)]])}${fi('prej', 'text', 'Why it is rejected', { type: 'textarea', rows: 4, req: true, help: 'The project owner sees this in the review conversation.' })}<div class="actions"><span></span><button class="btn btn-d" type="submit">Reject project</button></div></form>`,
  );
};
F.prej = d => {
  if (!validate('prej', d, { text: ['req', ['min', 10]] })) return render();
  const p = byId('projects', d.id);
  p.status = 'Rejected';
  p.clar.forEach(c => (c.resolved = true));
  convoAdd(p, 'reject', d.text.trim());
  projParties(p)
    .filter(x => x !== myId())
    .forEach(x => notify(x, `“${p.title}” was rejected by ${me().name}`, 'project', { id: p.id }));
  audit('Project rejected', p.id, d.text);
  UI.modal = null;
  clearF('prej');
  toast('Project rejected. The owner has been told why.');
  ok();
};
A.acceptProj = d => {
  clearF('acc');
  modal(
    'Accept project and choose support path',
    () =>
      `<form data-f="acc" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${d.id}"><div class="field prj-path"><span class="lbl">Support and onboarding path</span><b>Circle → Rope Team → ${WL()}</b><span class="help">The project starts in a Circle, moves to a Rope Team, then to the ${WL()}.</span></div>${fi('acc', 'note', 'Note to the participant', { type: 'textarea', rows: 3 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Accept project</button></div></form>`,
  );
};
F.acc = d => {
  const p = byId('projects', d.id);
  // one support path: the Rope Team is not skipped
  const path = 'Circle → Rope Team → Room';
  p.status = 'Accepted';
  p.supportPath = path;
  p.clar.forEach(c => (c.resolved = true));
  projLog(p, 'Accepted by ' + me().name + '; support path: ' + path);
  if ((d.note || '').trim()) convoAdd(p, 'approve', d.note.trim());
  notify(p.owner, `Your project “${p.title}” was accepted. ${d.note || ''}`, 'project', { id: p.id });
  audit('Project accepted', p.id, path);
  UI.modal = null;
  toast('Project accepted. Next: create the Circle.');
  ok();
};
// Everyone who can review a project: active Stewards, Faculty and Facilitators in its programme (one entry per
// person), never the project owner.
const projReviewers = p => {
  const seen = new Set();
  return S.assign.filter(a => a.ctx === p.ctx && roleBase(a.role) === 'F' && a.status === 'Active' && a.pid !== p.owner && !seen.has(a.pid) && seen.add(a.pid));
};
// One reviewer per project, assigned once; p.stewards stays a list so the rest of the app reads it unchanged.
A.assignStewards = d => {
  clearF('asst');
  const p = byId('projects', d.id);
  const rv = projReviewers(p);
  modal(
    'Assign a reviewer',
    () =>
      `<form data-f="asst" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${p.id}">${dl([['Project', h(p.title)], ['Owner', nm(p.owner)], ['Areas', (p.tags || []).map(h).join(', ') || '—']])}${
        rv.length
          ? fi('asst', 's', 'Steward, Faculty or Facilitator', { type: 'select', req: true, ph: 'Choose a reviewer', opts: rv.map(a => [a.pid, P(a.pid).name + ' · ' + ROLE[a.role]]), help: 'Active Stewards, Faculty and Facilitators in this programme. They review the project, ask for clarification if needed and accept it. The reviewer cannot be changed once assigned.' })
          : banner('warn', 'No reviewer available in this programme', 'Invite a Facilitator / Steward from ' + L('Programme admin → Invitations', 'admin', { tab: 'invites' }) + ', then assign them here.')
      }<div class="actions"><span></span><button class="btn btn-p" type="submit" ${rv.length ? '' : 'disabled'}>Assign</button></div></form>`,
  );
};
F.asst = d => {
  if (!validate('asst', d, { s: [['req', 'Choose a reviewer.']] })) return render();
  const p = byId('projects', d.id);
  if (!projReviewers(p).some(a => a.pid === d.s)) {
    UI.err.asst = { s: 'Choose an active Steward, Faculty member or Facilitator in this programme.' };
    return render();
  }
  p.stewards = [d.s];
  notify(d.s, 'You were assigned to review the project “' + p.title + '”', 'project', { id: p.id });
  notify(p.owner, 'A reviewer was assigned to your project “' + p.title + '”: ' + P(d.s).name, 'project', { id: p.id });
  projLog(p, 'Reviewer assigned by ' + me().name + ': ' + P(d.s).name);
  audit('Project reviewer assigned', p.id, d.s);
  toast('Reviewer assigned.');
  UI.modal = null;
  clearF('asst');
  ok();
};
function finReady(p) {
  const rm = byId('rooms', p.room);
  const ms = rm ? rm.milestones : [];
  const done = ms.filter(m => m.status === 'Achieved').length;
  const ev = S.evidence.filter(e => e.linked.includes(p.room) && e.review === 'Approved').length;
  const open = rm ? rm.tasks.filter(k => !['Done', 'Declined'].includes(k.status)).length : 0;
  return `<ul class="gate prj-gate"><li class="${ms.length && done === ms.length ? 'ok' : ''}">${ic(ms.length && done === ms.length ? 'check' : 'clock', 15)}<span>Milestones achieved: ${done} of ${ms.length}</span></li><li class="${ev ? 'ok' : ''}">${ic(ev ? 'check' : 'clock', 15)}<span>Approved evidence linked: ${ev}</span></li><li class="${open ? '' : 'ok'}">${ic(open ? 'clock' : 'check', 15)}<span>Open tasks: ${open}</span></li></ul>${ms.length && done < ms.length ? banner('warn', 'Not every milestone is achieved yet', 'You can still submit; your Faculty/Steward decides whether milestones and objectives are met and may request changes.') : ''}`;
}
A.submitFinal = d => {
  clearF('fin');
  modal(
    'Submit final deliverables',
    () =>
      `<form data-f="fin" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${d.id}">${finReady(byId('projects', d.id))}${fi('fin', 'note', 'Summary of deliverables and evidence', { type: 'textarea', rows: 4, req: true })}${banner('info', '', 'Your steward reviews the deliverables and approved evidence, may request changes, then approves.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for final review</button></div></form>`,
  );
};
F.fin = d => {
  if (!validate('fin', d, { note: ['req', ['min', 20]] })) return render();
  const p = byId('projects', d.id);
  p.stage = 'Final review';
  p.finalNote = d.note;
  p.changesNote = null;
  p.history.push({ at: today(), t: 'Final deliverables submitted' });
  p.stewards.forEach(s => notify(s, 'Final deliverables submitted: ' + p.title, 'project', { id: p.id }));
  audit('Final deliverables submitted', p.id, '');
  UI.modal = null;
  ok();
};
A.finalReview = d => {
  const p = byId('projects', d.id);
  if (d.v === 'changes') {
    clearF('chg');
    return modal(
      'Request changes',
      () =>
        `<form data-f="chg" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${p.id}">${fi('chg', 'note', 'Changes needed', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
    );
  }
  const rm = byId('rooms', p.room);
  const hv = S.harvests.find(x => x.scope === p.room && ['Approved', 'Released'].includes(x.state));
  p.stage = 'Closed';
  p.history.push({ at: today(), t: 'Deliverables approved; project closed' });
  if (rm) {
    rm.state = 'Closed';
    sysMsg(rm, 'Final deliverables approved; ' + WL() + ' closed');
  }
  const rt = byId('ropes', p.rope);
  if (rt && rt.state === 'Active') {
    rt.state = 'Closed';
    rt.outcome = 'Closed with the project after final approval';
    sysMsg(rt, 'Project approved and closed');
  }
  const c = byId('circles', p.circle);
  if (c && c.state === 'Active') c.state = 'Completed';
  S.candidates.push({
    id: uid('cd'),
    pid: p.owner,
    field: 'Completed project/role participation',
    value: p.title + ' (project owner)',
    source: 'Project closure',
    prov: 'Activity-derived',
    status: 'Pending',
  });
  notify(
    p.owner,
    'Deliverables approved. “' + p.title + '” is closed.' + (hv ? '' : ' A final Learning Harvest is still needed.'),
    'project',
    { id: p.id },
  );
  audit('Project closed', p.id, 'Final deliverables approved');
  toast(hv ? 'Project closed.' : 'Project closed. Start the final Learning Harvest for the ' + WL() + '.');
  ok();
};
F.chg = d => {
  if (!validate('chg', d, { note: ['req'] })) return render();
  const p = byId('projects', d.id);
  p.stage = 'Room';
  p.changesNote = d.note;
  p.history.push({ at: today(), t: 'Changes requested on final deliverables' });
  notify(p.owner, 'Changes requested on final deliverables: ' + p.title, 'project', { id: p.id });
  audit('Final changes requested', p.id, d.note);
  UI.modal = null;
  ok();
};
