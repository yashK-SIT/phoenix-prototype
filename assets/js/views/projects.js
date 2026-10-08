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
  <fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:8px">Areas of interest</legend><div class="row wrap" style="gap:8px">${[...PROJECT_AREAS, ...(pr?.tags || []).filter(t => !PROJECT_AREAS.includes(t))].map(a => `<label class="chipchk"><input type="checkbox" name="tags" value="${h(a)}" ${[].concat(fv(f, 'tags', pr?.tags || [])).includes(a) ? 'checked' : ''}><span>${h(a)}</span></label>`).join('')}</div><div class="field" style="margin-top:10px"><label class="lbl" for="np_areaOther">Add your own</label><input id="np_areaOther" name="areaOther" class="input" value="${h(fv(f, 'areaOther', ''))}" placeholder="Comma-separated, e.g. Air quality, School gardens" maxlength="160"></div><span class="help" style="margin-top:6px">Helps stewards and sponsors find relevant projects. Sponsors see only approved sponsor-visible information.</span></fieldset>
  <div class="f2">${fi(f, 'area', 'Location or programme area (optional)', { value: pr?.area, ph: 'e.g. Ward 7, Excelsior City' })}${fi(f, 'fundingNeed', 'Funding requirement in USD (optional)', { type: 'number', min: 0, value: pr?.fundingNeed, help: 'Only if the project will seek sponsor funding.' })}</div>
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
  const tl = `<section class="card" style="margin-bottom:20px;overflow-x:auto"><div class="timeline" style="min-width:720px">${steps.map((s, i) => `<div class="tl ${i < ci ? 'done' : i === ci ? 'cur' : ''}"><span class="td">${i < ci ? ic('check', 14) : i + 1}</span>${s === 'Room' ? WL() : s}</div>`).join('')}</div></section>`;
  let actions = '';
  if (own && p.status === 'Draft') actions = B('Edit sections', 'editAfterClar', { id: p.id });
  if (own && p.status === 'Clarification requested')
    actions = B('Update sections', 'editAfterClar', { id: p.id }, 'btn-s');
  if (((r === 'F' && stewardOf(p)) || r === 'A') && p.status === 'Submitted')
    actions =
      B('Request clarification', 'clarify', { id: p.id }) +
      B('Reject', 'rejectProj', { id: p.id }) +
      B('Accept project', 'acceptProj', { id: p.id }, 'btn-p btn-sm');
  if (((r === 'F' && stewardOf(p)) || r === 'A') && p.status === 'Clarification requested')
    actions = B('Reject', 'rejectProj', { id: p.id });
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
  if (r === 'A' && p.status !== 'Rejected') actions += B(p.stewards.length ? 'Change reviewer' : 'Assign reviewer', 'assignStewards', { id: p.id }, p.stewards.length ? 'btn-s btn-sm' : 'btn-p btn-sm');
  const lastRej = p.status === 'Rejected' && (p.thread || []).filter(m => m.kind === 'reject').slice(-1)[0];
  if (r === 'F' && stewardOf(p) && p.stage === 'Closed') actions = '';
  if (own && ownRoomProjects().includes(p))
    actions += B(ic('room', 14) + 'Create ' + WL(), 'newRoom', { origin: 'Project', project: p.id, oid: p.rope || p.circle || '' }, p.circle ? 'btn-p btn-sm' : 'btn-s btn-sm');
  const ready = p.sections && p.sections.every(s => ['Accepted', 'Edited'].includes(s.st));
  return (
    head(h(p.title), `${h(p.type)} · ${nm(p.owner)}`, pill(p.status) + actions, [
      ['Projects', 'projects'],
      [h(p.title)],
    ]) +
    tl +
    stageTrack(p, 'projects') +
    p.clar
      .filter(c => !c.resolved)
      .map(c => banner('warn', 'Clarification requested by ' + nm(c.by), `“${h(c.text)}” · ${fmt(c.at)}${own ? ' · Reply in the review conversation below, update the sections if needed, then resubmit.' : ''}`, 'message'))
      .join('') +
    (lastRej ? banner('err', 'Rejected by ' + nm(lastRej.by), `“${h(lastRej.text)}” · ${fmt(lastRej.at)}`) : '') +
    (p.status === 'Submitted' && !p.stewards.length ? banner('info', 'Waiting for a reviewer', r === 'A' ? 'Assign a Steward, Faculty member or Facilitator to review this project.' : 'The Programme Administrator assigns a Steward, Faculty member or Facilitator to review this project. You are notified when it is assigned.') : '') +
    (p.stage === 'Final review' && p.finalNote ? banner('info', 'Final deliverables submitted', h(p.finalNote)) : '') +
    (p.changesNote ? banner('warn', 'Changes requested', h(p.changesNote)) : '') +
    `<div class="g12" style="margin-top:16px"><div class="c8 col" style="gap:16px"><section class="card"><div class="card-h"><h2 class="h2">Project summary</h2></div>${p.sections ? p.sections.map((s, i) => `<div class="lrow" style="align-items:flex-start"><span class="sn" style="color:#155E58">${i + 1}</span><div class="lt"><b>${SECTIONS[i]}</b><p class="muted" style="white-space:pre-line;margin-top:4px">${h(s.text) || '<span class="cap">Empty</span>'}</p></div>${pill(s.st, { Accepted: 'p-green', Edited: 'p-teal', Rejected: 'p-red' }[s.st] || 'p-grey')}</div>`).join('') : `<p class="muted">${h(p.desc || 'No sections yet.')}</p>`}</section>
 ${projParty(p) && p.status !== 'Draft' ? card('Review conversation and activity', 'Messages between the project owner, the Programme Administrator and the assigned reviewer, with every review step. Oldest first.', convoHtml('project', p), '', 'cv-card') : ''}</div>
 <aside class="c4 col" style="gap:16px">${own && ['Draft', 'Clarification requested'].includes(p.status) ? card('Before you submit', '', `<form data-f="submitProj" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${p.id}">${!ready ? banner('warn', '', 'All 8 sections must be accepted or edited first.') : ''}${fi('sp', 'c1', 'I have reviewed every AI-drafted section and accept responsibility for the content.', { type: 'checkbox', req: true })}${fi('sp', 'c2', 'I understand reviewers in this programme will see this project.', { type: 'checkbox', req: true })}${p.status === 'Clarification requested' ? fi('sp', 'note', 'What you changed (optional)', { type: 'textarea', rows: 3, max: 2000, help: 'Added to the review conversation.' }) : ''}<button class="btn btn-p btn-block" type="submit" ${ready ? '' : 'disabled'}>${p.status === 'Clarification requested' ? 'Resubmit for review' : 'Submit for review'}</button></form>`) : ''}
 ${(S.stageReports || []).some(x => x.project === p.id) ? card('Reports along the chain', 'Circle → Rope Team → ' + WL(), (S.stageReports || []).filter(x => x.project === p.id).slice().reverse().map(x => lrow('send', h(x.kind), h(x.t) + `<span class="cap" style="display:block;margin-top:4px">${cName(x.from)} → ${cName(x.to)} · ${nm(x.by)} · ${fmt(x.at)}</span>`)).join('')) : ''}
 ${projEvidenceCard(p)}
 ${p.owner === myId() ? interestedSponsors(p) : ''}
 ${card('Linked spaces', '', [p.circle && lrow('users', cName(p.circle), 'Circle', L('Open', 'circle', { id: p.circle }), 't-purple'), p.rope && lrow('route', cName(p.rope), 'Rope Team', L('Open', 'rope', { id: p.rope }), 't-teal'), p.room && lrow('room', cName(p.room), WL(), L('Open', 'room', { id: p.room }), 't-navy'), p.funding && lrow('coin', 'Sponsor funding', 'Stage-wise tranches', L('Open', 'funding', {}))].filter(Boolean).join('') || '<p class="cap">Spaces are linked, not converted. A Circle is created when the project is accepted.</p>')}
 ${card(
   'Stewards and support path',
   '',
   dl([
     ['Reviewer', p.stewards.map(nm).join(', ') || 'Assigned by the Programme Administrator after submission'],
     ['Support path', h(pathLabel(p.supportPath) || 'Chosen on acceptance')],
   ]),
 )}
 ${projParty(p) && p.status !== 'Draft'
   ? ''
   : card(
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
      `<form data-f="clar" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('clar', 'text', 'What needs clarifying?', { type: 'textarea', rows: 4, req: true, help: 'Added to the review conversation. The project owner can reply there and resubmit.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send to the project owner</button></div></form>`,
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
      `<form data-f="acc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}"><div class="field"><span class="lbl">Support and onboarding path</span><b>Circle → Rope Team → ${WL()}</b><span class="help">The project starts in a Circle, moves to a Rope Team, then to the ${WL()}.</span></div>${fi('acc', 'note', 'Note to the participant', { type: 'textarea', rows: 3 })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Accept project</button></div></form>`,
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
A.assignStewards = d => {
  const p = byId('projects', d.id);
  const fs = S.assign.filter(a => a.ctx === p.ctx && roleBase(a.role) === 'F' && a.status === 'Active');
  modal(
    'Assign a reviewer',
    `<form data-f="asst" class="col" style="gap:12px"><input type="hidden" name="id" value="${p.id}">${dl([['Project', h(p.title)], ['Owner', nm(p.owner)], ['Areas', (p.tags || []).map(h).join(', ') || '—']])}<fieldset style="border:0;padding:0;margin:0" class="col"><legend class="lbl" style="margin-bottom:8px">Steward, Faculty or Facilitator <span class="req">*</span></legend><div class="chkgrp">${fs.map(a => `<label class="row"><input class="chk" type="checkbox" name="s" value="${a.pid}" ${p.stewards.includes(a.pid) ? 'checked' : ''}><span>${nm(a.pid)} <span class="cap">· ${h(ROLE[a.role])}</span></span></label>`).join('') || '<p class="cap">No Facilitator / Steward in this programme yet.</p>'}</div></fieldset><span class="help">They review the project, ask for clarification if needed and accept it.</span><div class="actions"><span></span><button class="btn btn-p" type="submit">Assign</button></div></form>`,
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
  projLog(p, 'Reviewer assigned by ' + me().name + ': ' + p.stewards.map(x => P(x).name).join(', '));
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
