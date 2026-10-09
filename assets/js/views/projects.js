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
  const t = tabs('projs', [
    ['all', 'All', list.length],
    ['review', 'Under review', list.filter(p => ['Submitted', 'Clarification requested'].includes(p.status)).length],
    ['active', 'Active', list.filter(p => p.status === 'Accepted' && p.stage !== 'Closed').length],
    ['closed', 'Closed', list.filter(p => p.stage === 'Closed').length],
  ]);
  const f = list.filter(
    p =>
      t.cur === 'all' ||
      (t.cur === 'review'
        ? ['Submitted', 'Clarification requested'].includes(p.status)
        : t.cur === 'active'
          ? p.status === 'Accepted' && p.stage !== 'Closed'
          : p.stage === 'Closed'),
  );
  return (
    head(
      r === 'P' ? 'My projects' : 'Projects',
      r === 'O'
        ? 'Projects in your organisation’s context (read-only)'
        : r === 'F'
          ? 'Submissions and projects you steward'
          : '',
      r === 'P' ? B(ic('plus', 16) + 'Start a project', 'go', { r: 'newproject' }, 'btn-p') : '',
    ) +
    t.html +
    dataView('projects:' + t.cur, {
      label: 'projects',
      title: r === 'P' ? 'My projects' : 'Projects',
      items: f,
      search: p => [p.title, p.type, P(p.owner).name, p.area || '', ...(p.tags || []), ...p.stewards.map(s => P(s).name)].join(' '),
      quick: dvOpts(f, p => p.status).length > 1 ? { label: 'Status', options: dvOpts(f, p => p.status), test: (p, v) => p.status === v } : null,
      filters: [
        dvOpts(f, p => p.stage).length && { key: 'stage', label: 'Stage', options: dvOpts(f, p => p.stage, stageLabel), test: (p, v) => p.stage === v },
        dvOpts(f, p => p.tags || []).length && { key: 'area', label: 'Area of interest', options: dvOpts(f, p => p.tags || []), test: (p, v) => (p.tags || []).includes(v) },
        dvOpts(f, p => p.owner).length > 1 && { key: 'owner', label: 'Owner', options: dvOpts(f, p => p.owner, id => P(id).name), test: (p, v) => p.owner === v },
      ].filter(Boolean),
      sorts: [
        ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
        ['submitted', 'Submitted', (a, b) => String(a.submitted || '').localeCompare(String(b.submitted || ''))],
        ['funding', 'Funding need', (a, b) => (a.fundingNeed || 0) - (b.fundingNeed || 0)],
      ],
      layout: 'table',
      columns: [
        { label: 'Project', sort: 'title', cell: p => `<span class="rec-name"><span class="tile t-soft" aria-hidden="true">${ic('folder', 16)}</span><span class="rec-nt"><b>${h(p.title)}</b><span class="cap">${h(p.type)}${p.submitted ? ' · submitted ' + fmt(p.submitted) : ''}</span></span></span>` },
        { label: 'Status', cell: p => pill(p.status) },
        { label: 'Stage', cell: p => (p.stage ? pill(stageLabel(p.stage), SC[p.stage]) : '<span class="cap">—</span>') },
        { label: 'Owner', cell: p => nm(p.owner) },
        { label: 'Stewards', hideSm: true, cell: p => p.stewards.map(nm).join(', ') || '<span class="cap">—</span>' },
        { label: 'Areas', hideSm: true, cell: p => ((p.tags || []).length ? `<span class="rec-tags">${p.tags.slice(0, 3).map(x => `<span class="rec-tag">${h(x)}</span>`).join('')}${p.tags.length > 3 ? `<span class="cap">+${p.tags.length - 3}</span>` : ''}</span>` : '<span class="cap">—</span>') },
        { label: 'Funding need', num: true, sort: 'funding', cell: p => (p.fundingNeed ? `<span class="rec-num">${money('USD', p.fundingNeed)}</span>` : '<span class="cap">—</span>') },
        { label: '', cell: p => L('Open', 'project', { id: p.id }) },
      ],
      empty: r === 'P' ? ['folder', 'You have no projects yet', 'Start one from an idea, need or opportunity.', B(ic('plus', 16) + 'Start a project', 'go', { r: 'newproject' }, 'btn-p btn-sm')] : ['folder', 'No projects.', ''],
    })
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
    'Under review',
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
                : p.status === 'Clarification requested'
                  ? 2
                  : p.status === 'Submitted'
                    ? 1
                    : 0;
  const tl = `<section class="card prj-life" aria-label="Project lifecycle"><div class="prj-life-h"><h2 class="h3">Lifecycle</h2><span class="cap">Step ${ci + 1} of ${steps.length}</span></div><ol class="prj-steps">${steps.map((s, i) => `<li class="prj-step ${i < ci ? 'done' : i === ci ? 'cur' : 'todo'}"${i === ci ? ' aria-current="step"' : ''}><span class="td">${i < ci ? ic('check', 14) : i + 1}</span><span class="prj-sl">${s === 'Room' ? WL() : s}</span></li>`).join('')}</ol></section>`;
  let actions = '';
  if (own && p.status === 'Draft') actions = B('Edit sections', 'editAfterClar', { id: p.id });
  if (own && p.status === 'Clarification requested')
    actions = B('Update sections', 'editAfterClar', { id: p.id }, 'btn-s');
  if (((r === 'F' && stewardOf(p)) || r === 'A') && p.status === 'Submitted')
    actions =
      B('Request clarification', 'clarify', { id: p.id }) +
      B('Accept project', 'acceptProj', { id: p.id }, 'btn-p btn-sm');
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
  if (r === 'A') actions += B(p.stewards.length ? 'Change reviewer' : 'Assign reviewer', 'assignStewards', { id: p.id }, p.stewards.length ? 'btn-s btn-sm' : 'btn-p btn-sm');
  if (r === 'F' && stewardOf(p) && p.stage === 'Closed') actions = '';
  const ready = p.sections && p.sections.every(s => ['Accepted', 'Edited'].includes(s.st));
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
      .map(c => banner('warn', 'Clarification requested by ' + nm(c.by), `“${h(c.text)}” · ${fmt(c.at)}`, 'message'))
      .join('') +
    (p.status === 'Submitted' && !p.stewards.length ? banner('info', 'Waiting for a reviewer', r === 'A' ? 'Assign a Steward, Faculty member or Facilitator to review this project.' : 'The Programme Administrator assigns a Steward, Faculty member or Facilitator to review this project. You are notified when it is assigned.') : '') +
    (p.stage === 'Final review' && p.finalNote ? banner('info', 'Final deliverables submitted', h(p.finalNote)) : '') +
    (p.changesNote ? banner('warn', 'Changes requested', h(p.changesNote)) : '') +
    `</div>` +
    `<div class="g12 prj-body"><div class="c8 col prj-main"><section class="card prj-summary"><div class="card-h"><div><h2 class="h2">Project summary</h2>${p.sections ? `<p class="cap">${p.sections.filter(s => ['Accepted', 'Edited'].includes(s.st)).length} of 8 sections accepted or edited</p>` : ''}</div></div>${p.sections ? `<ol class="prj-secs">${p.sections.map((s, i) => `<li class="prj-sec"><span class="sn" aria-hidden="true">${i + 1}</span><div class="prj-sec-b"><div class="prj-sec-t"><h3 class="h3">${SECTIONS[i]}</h3>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</div><p class="prj-sec-x">${h(s.text) || '<span class="cap">Empty</span>'}</p></div></li>`).join('')}</ol>` : `<p class="muted">${h(p.desc || 'No sections yet.')}</p>`}</section>
 ${projEvidenceCard(p)}
 ${card(
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
 <aside class="c4 col prj-side">${own && ['Draft', 'Clarification requested'].includes(p.status) ? card('Before you submit', '', `<form data-f="submitProj" class="col prj-submit" novalidate><input type="hidden" name="id" value="${p.id}">${!ready ? banner('warn', '', 'All 8 sections must be accepted or edited first.') : ''}${fi('sp', 'c1', 'I have reviewed every AI-drafted section and accept responsibility for the content.', { type: 'checkbox', req: true })}${fi('sp', 'c2', 'I understand reviewers in this programme will see this project.', { type: 'checkbox', req: true })}<button class="btn btn-p btn-block" type="submit" ${ready ? '' : 'disabled'}>${p.status === 'Clarification requested' ? 'Resubmit for review' : 'Submit for review'}</button></form>`, '', 'accent') : ''}
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
  p.history.push({ at: today(), t: re ? 'Resubmitted after clarification' : 'Submitted for review' });
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
      `<form data-f="clar" class="col prj-dlg" novalidate><input type="hidden" name="id" value="${d.id}">${fi('clar', 'text', 'What needs clarifying?', { type: 'textarea', rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send to participant</button></div></form>`,
  );
};
F.clar = d => {
  if (!validate('clar', d, { text: ['req', ['min', 10]] })) return render();
  const p = byId('projects', d.id);
  p.status = 'Clarification requested';
  p.clar.push({ at: today(), by: myId(), text: d.text });
  p.history.push({ at: today(), t: 'Clarification requested' });
  notify(p.owner, `Clarification requested on “${p.title}”`, 'project', { id: p.id });
  audit('Clarification requested', p.id, d.text);
  UI.modal = null;
  clearF('clar');
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
  p.history.push({ at: today(), t: 'Accepted by ' + me().name + '; support path: ' + path });
  notify(p.owner, `Your project “${p.title}” was accepted. ${d.note || ''}`, 'project', { id: p.id });
  audit('Project accepted', p.id, path);
  UI.modal = null;
  toast('Project accepted. Next: create the Circle.');
  ok();
};
A.assignStewards = d => {
  const p = byId('projects', d.id);
  const fs = S.assign.filter(a => a.ctx === p.ctx && roleBase(a.role) === 'F' && a.status === 'Active');
  modal(
    'Assign a reviewer',
    `<form data-f="asst" class="col prj-dlg"><input type="hidden" name="id" value="${p.id}">${dl([['Project', h(p.title)], ['Owner', nm(p.owner)], ['Areas', (p.tags || []).map(h).join(', ') || '—']])}<fieldset class="np-fs col prj-dlg-fs"><legend class="lbl">Steward, Faculty or Facilitator <span class="req">*</span></legend><div class="chkgrp prj-chkgrp">${fs.map(a => `<label class="row prj-chk"><input class="chk" type="checkbox" name="s" value="${a.pid}" ${p.stewards.includes(a.pid) ? 'checked' : ''}><span>${nm(a.pid)} <span class="cap">· ${h(ROLE[a.role])}</span></span></label>`).join('') || '<p class="cap">No Facilitator / Steward in this programme yet.</p>'}</div></fieldset><span class="help">They review the project, ask for clarification if needed and accept it.</span><div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div></form>`,
  );
};
F.asst = d => {
  const p = byId('projects', d.id);
  p.stewards = [].concat(d.s || []);
  if (!p.stewards.length) {
    toast('Assign at least one steward.', 'err');
    return render();
  }
  p.stewards.forEach(s => notify(s, 'You were assigned to review the project “' + p.title + '”', 'project', { id: p.id }));
  notify(p.owner, 'A reviewer was assigned to your project “' + p.title + '”: ' + p.stewards.map(x => P(x).name).join(', '), 'project', { id: p.id });
  p.history.push({ at: today(), t: 'Reviewer assigned by ' + me().name + ': ' + p.stewards.map(x => P(x).name).join(', ') });
  audit('Project reviewer assigned', p.id, p.stewards.join(','));
  toast('Reviewer assigned.');
  UI.modal = null;
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
