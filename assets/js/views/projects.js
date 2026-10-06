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
    table(
      ['Project', 'Type', 'Owner', 'Status', 'Stage', 'Stewards', ''],
      f.map(p => [
        `<b>${h(p.title)}</b>`,
        h(p.type),
        nm(p.owner),
        pill(p.status),
        p.stage ? pill(stageLabel(p.stage), SC[p.stage]) : '—',
        p.stewards.map(nm).join(', ') || '—',
        L('Open', 'project', { id: p.id }),
      ]),
      r === 'P' ? 'You have no projects yet. Start one from an idea, need or opportunity.' : 'No projects.',
    )
  );
});
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
      `<div class="g12"><form data-f="np" class="card c8 col" style="gap:18px" novalidate>${errSum(f)}<input type="hidden" name="id" value="${pr ? pr.id : ''}">
  <fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:10px">What are you starting with? <span class="req">*</span></legend><div class="g3">${[
    ['Need', 'Something you or a community lacks.'],
    ['Opportunity', 'An opening others could take up.'],
    ['Project idea', 'Something you want to build or test.'],
  ]
    .map(
      ([v, dd]) =>
        `<label class="choice ${fv(f, 'type', pr?.type || 'Project idea') === v ? 'sel' : ''}"><input type="radio" name="type" value="${v}" ${fv(f, 'type', pr?.type || 'Project idea') === v ? 'checked' : ''} style="position:absolute;opacity:0" data-ch="npType"><span class="rad"></span><span class="col"><b>${v}</b><span class="cap">${dd}</span></span></label>`,
    )
    .join('')}</div></fieldset>
  ${fi(f, 'title', 'Working title', { req: true, value: pr?.title, ph: 'e.g. Community cooling map for Ward 7', max: 120 })}
  ${fi(f, 'desc', 'Describe it in your own words', { type: 'textarea', rows: 6, req: true, value: pr?.desc, ph: 'What is the need or idea? Who is affected? What would be different if it worked?', help: 'At least 40 characters.' })}
  <fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:8px">Areas of interest</legend><div class="row wrap" style="gap:8px">${PROJECT_AREAS.map(a => `<label class="chipchk"><input type="checkbox" name="tags" value="${h(a)}" ${[].concat(fv(f, 'tags', pr?.tags || [])).includes(a) ? 'checked' : ''}><span>${h(a)}</span></label>`).join('')}</div><span class="help" style="margin-top:6px">Helps stewards and sponsors find relevant projects. Sponsors see only approved sponsor-visible information.</span></fieldset>
  <div class="f2">${fi(f, 'area', 'Location or programme area (optional)', { value: pr?.area, ph: 'e.g. Ward 7, Excelsior City' })}${fi(f, 'fundingNeed', 'Funding requirement in USD (optional)', { type: 'number', min: 0, value: pr?.fundingNeed, help: 'Only if the project will seek sponsor funding.' })}</div>
  ${fi(f, 'ctx', 'Context', { value: ctx().name, ro: true, help: 'The project stays inside this context unless you authorise sharing.' })}
  <div class="actions">${L('Cancel', 'projects', {}, 'btn btn-g')}<div class="row wrap"><button class="btn btn-s" type="submit" name="go" value="save">Save draft</button><button class="btn btn-p" type="submit" name="go" value="gen">${okAI ? 'Draft sections with PHOENIX' : 'Continue to sections'}</button></div></div></form>
  <aside class="c4 col" style="gap:16px">${okAI ? `<div class="card col" style="gap:10px;border:1px dashed #6B7585">${aiTag('AI-assisted · Class B workflow draft')}<b>PHOENIX will draft 8 sections</b><p class="cap">${SECTIONS.join(', ')}. Each stays a draft until you accept, edit or reject it.</p></div>` : banner('warn', S.settings.aiAvailable ? 'AI processing is off' : 'AI is unavailable', S.settings.aiAvailable ? `You can write each section yourself. To get drafts, turn on AI in ${L('Privacy & consent', 'privacy')}.` : 'You can write each section yourself; drafting will work again when the service is back.')}${card('What happens next', '', '<p class="cap">You submit for Faculty/Steward review. They may ask for clarification, then accept it and set up a Circle.</p>')}</aside></div>`
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
    `<div class="g12"><aside class="card c4" style="padding:16px"><div class="row" style="justify-content:space-between;padding:4px 8px 10px"><b>Sections</b><span class="cap">${done} of 8 reviewed</span></div><div class="progress" style="margin:0 8px 12px"><span style="width:${(done / 8) * 100}%"></span></div><div class="srail">${secs.map((s, i) => `<button type="button" class="sitem ${i === act ? 'on' : ''}" data-a="npSec" data-i="${i}"><span class="sn">${i + 1}</span><span style="flex:1">${SECTIONS[i]}</span>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</button>`).join('')}</div></aside>
 <form data-f="sec" class="card c8 col" style="gap:14px" novalidate><input type="hidden" name="i" value="${act}"><div class="row wrap" style="justify-content:space-between"><h2 class="h2">${act + 1}. ${SECTIONS[act]}</h2>${secs[act].ai ? aiTag(secs[act].st === 'To review' ? 'AI draft · not yet accepted' : 'AI-assisted') : pill('Written by you', 'p-grey')}</div>
 ${fi('sec', 'text', 'Section content', { type: 'textarea', rows: 9, value: secs[act].text, req: true })}${secs[act].st === 'Rejected' ? banner('warn', '', 'You rejected this draft. Write your own version and save it, or regenerate.') : ''}
 <div class="row wrap" style="justify-content:space-between">${okAI ? `<button class="btn btn-g btn-sm" type="submit" name="d" value="regen">${ic('refresh', 16)}Regenerate</button>` : '<span></span>'}<div class="row wrap"><button class="btn btn-s btn-sm" type="submit" name="d" value="Rejected">Reject</button><button class="btn btn-s btn-sm" type="submit" name="d" value="Edited">Save my edits</button><button class="btn btn-p btn-sm" type="submit" name="d" value="Accepted">${ic('check', 16)}Accept</button></div></div></form></div>
 <div class="actions" style="margin-top:20px">${B(ic('chevl', 16) + 'Back to idea', 'npBack', {}, 'btn-g')}${done === 8 ? B('Continue to review and submit' + ic('arrow', 16), 'go', { r: 'project', id: pr.id }, 'btn-p') : `<div class="row"><span class="help hide-sm">Review all 8 sections to continue</span><button class="btn btn-p" type="button" disabled>Continue to review and submit</button></div>`}</div>`
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
  Object.assign(p, { type: d.type, title: d.title.trim(), desc: d.desc.trim(), tags: [].concat(d.tags || []), area: (d.area || '').trim(), fundingNeed: +d.fundingNeed || null });
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
  const tl = `<section class="card" style="margin-bottom:20px;overflow-x:auto"><div class="timeline" style="min-width:720px">${steps.map((s, i) => `<div class="tl ${i < ci ? 'done' : i === ci ? 'cur' : ''}"><span class="td">${i < ci ? ic('check', 14) : i + 1}</span>${s === 'Room' ? WL() : s}</div>`).join('')}</div></section>`;
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
  if (r === 'A') actions += B('Assign stewards', 'assignStewards', { id: p.id });
  if (r === 'F' && stewardOf(p) && p.stage === 'Closed') actions = '';
  const ready = p.sections && p.sections.every(s => ['Accepted', 'Edited'].includes(s.st));
  return (
    head(h(p.title), `${h(p.type)} · ${nm(p.owner)} · ${h(ctx().name)}`, pill(p.status) + actions, [
      ['Projects', 'projects'],
      [h(p.title)],
    ]) +
    tl +
    stageTrack(p, 'projects') +
    p.clar
      .filter(c => !c.resolved)
      .map(c => banner('warn', 'Clarification requested by ' + nm(c.by), `“${h(c.text)}” · ${fmt(c.at)}`, 'message'))
      .join('') +
    (p.stage === 'Final review' && p.finalNote ? banner('info', 'Final deliverables submitted', h(p.finalNote)) : '') +
    (p.changesNote ? banner('warn', 'Changes requested', h(p.changesNote)) : '') +
    `<div class="g12" style="margin-top:16px"><section class="card c8"><div class="card-h"><h2 class="h2">Project summary</h2></div>${p.sections ? p.sections.map((s, i) => `<div class="lrow" style="align-items:flex-start"><span class="sn" style="color:#155E58">${i + 1}</span><div class="lt"><b>${SECTIONS[i]}</b><p class="muted" style="white-space:pre-line;margin-top:4px">${h(s.text) || '<span class="cap">Empty</span>'}</p></div>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</div>`).join('') : `<p class="muted">${h(p.desc || 'No sections yet.')}</p>`}</section>
 <aside class="c4 col" style="gap:16px">${own && ['Draft', 'Clarification requested'].includes(p.status) ? card('Before you submit', '', `<form data-f="submitProj" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${p.id}">${!ready ? banner('warn', '', 'All 8 sections must be accepted or edited first.') : ''}${fi('sp', 'c1', 'I have reviewed every AI-drafted section and accept responsibility for the content.', { type: 'checkbox', req: true })}${fi('sp', 'c2', 'I understand reviewers in this programme will see this project.', { type: 'checkbox', req: true })}<button class="btn btn-p btn-block" type="submit" ${ready ? '' : 'disabled'}>${p.status === 'Clarification requested' ? 'Resubmit for review' : 'Submit for review'}</button></form>`) : ''}
 ${(S.stageReports || []).some(x => x.project === p.id) ? card('Reports along the chain', 'Circle → Rope Team → ' + WL(), (S.stageReports || []).filter(x => x.project === p.id).slice().reverse().map(x => lrow('send', h(x.kind), h(x.t) + `<span class="cap" style="display:block;margin-top:4px">${cName(x.from)} → ${cName(x.to)} · ${nm(x.by)} · ${fmt(x.at)}</span>`)).join('')) : ''}
 ${projEvidenceCard(p)}
 ${card('Linked spaces', '', [p.circle && lrow('users', cName(p.circle), 'Circle', L('Open', 'circle', { id: p.circle }), 't-purple'), p.rope && lrow('route', cName(p.rope), 'Rope Team', L('Open', 'rope', { id: p.rope }), 't-teal'), p.room && lrow('room', cName(p.room), WL(), L('Open', 'room', { id: p.room }), 't-navy'), p.funding && lrow('coin', 'Sponsor funding', 'Stage-wise tranches', L('Open', 'funding', {}))].filter(Boolean).join('') || '<p class="cap">Spaces are linked, not converted. A Circle is created when the project is accepted.</p>')}
 ${card(
   'Stewards and support path',
   '',
   dl([
     ['Stewards', p.stewards.map(nm).join(', ') || 'Assigned on submission'],
     ['Support path', h(pathLabel(p.supportPath) || 'Chosen on acceptance')],
   ]),
 )}
 ${card(
   'History',
   '',
   p.history
     .slice()
     .reverse()
     .map(x => `<p class="cap" style="margin-bottom:6px">${fmt(x.at)} · ${h(x.t)}</p>`)
     .join('') || '<p class="cap">—</p>',
 )}</aside></div>`
  );
});
// Evidence for this project: linked to the project or to its Circle, Rope Team or Action Room.
function projEvidenceCard(p) {
  const own = p.owner === myId();
  const st = (role() === 'F' && stewardOf(p)) || role() === 'A';
  const list = S.evidence.filter(e => evProjects(e).includes(p) && (own || st || evVisible(e)));
  const space = p.room || p.rope || p.circle;
  return card(
    'Evidence',
    list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') + ' from this project and its spaces' : 'Evidence linked to this project or its Circle, Rope Team or ' + WL() + ' appears here.',
    list.map(e => lrow('award', L(h(e.title), 'evidence', { id: e.id }), h(e.type) + ' · ' + (e.linked || []).map(cName).join(', ') + ' · ' + nm(e.owner), pill(e.review) + ' ' + pill(e.level, 'p-navy'))).join('') || '<p class="cap">No evidence yet.</p>',
    (own || memberOf(byId('circles', p.circle) || byId('rooms', p.room) || {})) && space && can('evidence', 'CRM') ? B(ic('upload', 14) + 'Upload', 'go', { r: 'newevidence', link: space }) : '',
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
  if (!p.stewards.length)
    p.stewards = S.assign.filter(a => a.ctx === p.ctx && roleBase(a.role) === 'F' && a.status === 'Active').map(a => a.pid);
  const re = p.status === 'Clarification requested';
  p.status = 'Submitted';
  p.submitted = today();
  p.clar.forEach(c => (c.resolved = true));
  p.history.push({ at: today(), t: re ? 'Resubmitted after clarification' : 'Submitted for review' });
  p.stewards.forEach(s =>
    notify(s, `${re ? 'Resubmitted' : 'New'} project for review: “${p.title}”`, 'project', { id: p.id }),
  );
  audit('Project submitted', p.id, 'Stewards: ' + p.stewards.join(','));
  clearF('sp');
  toast('Submitted for Faculty/Steward review.');
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
      `<form data-f="clar" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('clar', 'text', 'What needs clarifying?', { type: 'textarea', rows: 4, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send to participant</button></div></form>`,
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
  UI.form.acc = { path: 'Circle → Rope Team → Room' };
  modal(
    'Accept project and choose support path',
    () =>
      `<form data-f="acc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi(
        'acc',
        'path',
        'Support and onboarding path',
        {
          type: 'select',
          req: true,
          opts: [
            ['Circle → Rope Team → Room', 'Standard: Circle → Rope Team → ' + WL()],
            ['Circle → Room', 'Circle → ' + WL() + ' (skip Rope Team)'],
          ],
          help: 'Skipping the Rope Team is open item OI-12; it affects stage-wise funding.',
        },
      )}${fi('acc', 'note', 'Note to the participant', { type: 'textarea', rows: 3 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Accept project</button></div></form>`,
  );
};
F.acc = d => {
  const p = byId('projects', d.id);
  p.status = 'Accepted';
  p.supportPath = d.path;
  p.history.push({ at: today(), t: 'Accepted by ' + me().name + '; support path: ' + d.path });
  notify(p.owner, `Your project “${p.title}” was accepted. ${d.note || ''}`, 'project', { id: p.id });
  audit('Project accepted', p.id, d.path);
  UI.modal = null;
  toast('Project accepted. Next: create the Circle.');
  ok();
};
A.assignStewards = d => {
  const p = byId('projects', d.id);
  const fs = S.assign.filter(a => a.ctx === p.ctx && roleBase(a.role) === 'F');
  modal(
    'Assign Faculty/Stewards',
    `<form data-f="asst" class="col" style="gap:12px"><input type="hidden" name="id" value="${p.id}">${fs.map(a => `<label class="row"><input class="chk" type="checkbox" name="s" value="${a.pid}" ${p.stewards.includes(a.pid) ? 'checked' : ''}>${nm(a.pid)}</label>`).join('')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.asst = d => {
  const p = byId('projects', d.id);
  p.stewards = [].concat(d.s || []);
  if (!p.stewards.length) {
    toast('Assign at least one steward.', 'err');
    return render();
  }
  p.stewards.forEach(s => notify(s, 'You were assigned as steward: ' + p.title, 'project', { id: p.id }));
  audit('Stewards assigned', p.id, p.stewards.join(','));
  UI.modal = null;
  ok();
};
function finReady(p) {
  const rm = byId('rooms', p.room);
  const ms = rm ? rm.milestones : [];
  const done = ms.filter(m => m.status === 'Achieved').length;
  const ev = S.evidence.filter(e => e.linked.includes(p.room) && e.review === 'Approved').length;
  const open = rm ? rm.tasks.filter(k => !['Done', 'Declined'].includes(k.status)).length : 0;
  return `<ul class="gate"><li class="${ms.length && done === ms.length ? 'ok' : ''}">${ic(ms.length && done === ms.length ? 'check' : 'clock', 15)}<span>Milestones achieved: ${done} of ${ms.length}</span></li><li class="${ev ? 'ok' : ''}">${ic(ev ? 'check' : 'clock', 15)}<span>Approved evidence linked: ${ev}</span></li><li class="${open ? '' : 'ok'}">${ic(open ? 'clock' : 'check', 15)}<span>Open tasks: ${open}</span></li></ul>${ms.length && done < ms.length ? banner('warn', 'Not every milestone is achieved yet', 'You can still submit; your Faculty/Steward decides whether milestones and objectives are met and may request changes.') : ''}`;
}
A.submitFinal = d => {
  clearF('fin');
  modal(
    'Submit final deliverables',
    () =>
      `<form data-f="fin" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${finReady(byId('projects', d.id))}${fi('fin', 'note', 'Summary of deliverables and evidence', { type: 'textarea', rows: 4, req: true })}${banner('info', '', 'Your steward reviews the deliverables and approved evidence, may request changes, then approves.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Submit for final review</button></div></form>`,
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
        `<form data-f="chg" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}">${fi('chg', 'note', 'Changes needed', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send</button></div></form>`,
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
