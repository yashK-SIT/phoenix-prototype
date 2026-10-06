// ---------- EVIDENCE (E09, F08) ----------
const EV_TYPES = [
  'A · Participation',
  'B · Learning and capability',
  'C · Action and deliverable',
  'D · Outcome',
  'E · Economic / resource',
  'F · Ecological / regenerative',
  'G · Social / community',
  'H · Governance / decision',
  'I · Testimony / lived experience',
  'J · External verification',
];
const LEVELS = [
  ['E0', 'Not evidenced / missing'],
  ['E1', 'Self-report / single source'],
  ['E2', 'Documented trace'],
  ['E3', 'Corroborated'],
  ['E4', 'Independently verified'],
];
const REVIEW = ['Submitted', 'Needs Revision', 'Approved', 'Rejected', 'Insufficient', 'Restricted', 'Withdrawn'];
const evVisible = e =>
  e.owner === myId() ||
  role() === 'F' ||
  hasB('Reviewer') ||
  role() === 'A' ||
  (e.review === 'Approved' &&
    e.linked.some(l => {
      const o = byId('circles', l) || byId('rooms', l) || byId('ropes', l);
      return o && memberOf(o);
    }));
// Evidence belongs to a project when it is linked to the project itself or to its Circle, Rope Team or Action Room.
const evProjects = e =>
  S.projects.filter(p => e.project === p.id || (e.linked || []).some(l => l && [p.id, p.circle, p.rope, p.room].includes(l)));
const evProjectName = e => evProjects(e).map(p => h(p.title)).join(', ');
const spaceProject = id => S.projects.find(p => [p.circle, p.rope, p.room].includes(id));
route('evidence', 'evidence', () => {
  const r = role();
  if (UI.p.id) {
    const e = byId('evidence', UI.p.id);
    if (!e) return empty('award', 'Not found', '');
    if (['S', 'O'].includes(r)) return deniedView('evidence');
    if (!evVisible(e)) return deniedView('evidence');
    return evDetail(e);
  }
  if (['S', 'O'].includes(r)) {
    const ap = S.evidence.filter(e => e.review === 'Approved' && (r === 'O' || e.release.includes('funder')));
    return (
      head(
        'Approved evidence',
        r === 'S'
          ? 'Approved for funder release only. Small or distinctive groups are suppressed.'
          : 'Aggregate view of approved evidence.',
      ) +
      table(
        ['Type', 'Approved items', 'Highest level'],
        Object.entries(ap.reduce((a, e) => ((a[e.type] = a[e.type] || []).push(e), a), {})).map(([k, v]) => [
          h(k),
          v.length < 2 && r === 'S' ? '<span class="cap">Suppressed (fewer than 2)</span>' : v.length,
          v
            .map(x => x.level)
            .sort()
            .pop(),
        ]),
        'No approved evidence to show.',
      )
    );
  }
  const t = tabs('ev', [
    ['mine', 'My evidence', S.evidence.filter(e => e.owner === myId()).length],
    (r === 'F' || hasB('Reviewer')) && [
      'queue',
      'Review queue',
      S.evidence.filter(e => e.review === 'Submitted' && e.owner !== myId()).length,
    ],
    ['all', 'Visible to me'],
  ]);
  const base =
    t.cur === 'mine'
      ? S.evidence.filter(e => e.owner === myId())
      : t.cur === 'queue'
        ? S.evidence.filter(e => e.review === 'Submitted' && e.owner !== myId())
        : S.evidence.filter(evVisible);
  const pf = UI.q.evp || '';
  const projs = [...new Set(base.flatMap(e => evProjects(e).map(p => p.id)))].map(id => byId('projects', id));
  const list = base.filter(e => !pf || (pf === 'none' ? !evProjects(e).length : evProjects(e).some(p => p.id === pf)));
  const groups = [...projs.filter(p => !pf || p.id === pf).map(p => [p, list.filter(e => evProjects(e).includes(p))]), ...(!pf || pf === 'none' ? [[null, list.filter(e => !evProjects(e).length)]] : [])].filter(([, l]) => l.length);
  const grouped = (UI.q.evg || 'project') === 'project';
  return (
    head(
      'Evidence',
      'Review status, support level, confidentiality, lifecycle and release are separate. Approval never implies release.',
      can('evidence', 'CRM') ? B(ic('upload', 16) + 'Upload evidence', 'go', { r: 'newevidence' }, 'btn-p') : '',
    ) +
    t.html +
    `<div class="row wrap" style="margin-bottom:16px"><select class="input" style="width:auto" data-ch="qf" data-k="evp" aria-label="Project"><option value="">Project: all</option>${projs.map(p => `<option value="${p.id}" ${pf === p.id ? 'selected' : ''}>${h(p.title)}</option>`).join('')}<option value="none" ${pf === 'none' ? 'selected' : ''}>Not linked to a project</option></select><select class="input" style="width:auto" data-ch="qf" data-k="evg" aria-label="Layout"><option value="project" ${grouped ? 'selected' : ''}>Group by project</option><option value="flat" ${!grouped ? 'selected' : ''}>Single list</option></select></div>` +
    (grouped
      ? groups
          .map(([p, l]) =>
            card(
              p ? h(p.title) : 'Not linked to a project',
              p ? l.length + ' item' + (l.length > 1 ? 's' : '') + ' · ' + pill(stageLabel(p.stage || p.status)) : 'Personal or portfolio evidence',
              evTable(l, false),
              p && can('projects') ? L('Open project', 'project', { id: p.id }) : '',
            ),
          )
          .join('<div class="section-gap"></div>') || table([], [], 'No evidence here yet.')
      : evTable(list, true))
  );
});
function evTable(list, withProject) {
  return table(
    ['Evidence', withProject && 'Project', 'Type', 'Claim', 'Owner', 'Linked to', 'Level', 'Review', 'Release', ''].filter(c => c !== false),
    list.map(e =>
      [
        `<b>${h(e.title)}</b>`,
        withProject && (evProjectName(e) || '<span class="cap">—</span>'),
        h(e.type),
        h(e.claim),
        nm(e.owner),
        (e.linked || []).map(cName).join(', ') || '—',
        pill(e.level, 'p-navy'),
        pill(e.review),
        h(e.release),
        L('Open', 'evidence', { id: e.id }),
      ].filter(c => c !== false),
    ),
    'No evidence here yet.',
  );
}
// How the evidence was provided. Older records are files.
function evFormatRow(e) {
  if (e.format === 'Link')
    return ['Link', `<a class="lnk" href="${h(e.url)}" target="_blank" rel="noopener noreferrer">${ic('link', 14)} ${h(e.url)}</a>`];
  if (e.format === 'Reflection or written output')
    return ['Reflection or written output', `<p style="white-space:pre-line">${h(e.text)}</p>`];
  if (e.format === 'Repository record') {
    const r = byId('records', e.record);
    return ['Repository record', r ? L(h(r.title), 'repository', { rec: r.id }) + ` <span class="cap">· ${h(r.kind)}</span>` : '<span class="cap">Record no longer available</span>'];
  }
  return ['File', `<span class="att">${ic('file', 14)}${h(e.file)} · ${e.sizeMB} MB</span>`];
}
function evDelivRow(e) {
  const ks = S.rooms.flatMap(x => x.tasks.filter(k => (k.evidence || []).includes(e.id)).map(k => [x, k]));
  return ks.length && ['Supports deliverable', ks.map(([x, k]) => L(h(k.t), 'room', { id: x.id, tab: 'plan' }) + ` <span class="cap">· ${h(x.name)}</span>`).join('<br>')];
}
function evDetail(e) {
  const own = e.owner === myId();
  const rev = (role() === 'F' || hasB('Reviewer')) && !own;
  const rr = S.releases.filter(x => x.ev === e.id);
  return (
    head(h(e.title), h(e.type), pill(e.review) + ' ' + pill(e.level, 'p-navy'), [
      ['Evidence', 'evidence'],
      [h(e.title)],
    ]) +
    `<div class="g12">${card(
      'Evidence record',
      '',
      dl([
        ['Claim', h(e.claim)],
        evFormatRow(e),
        evDelivRow(e),
        ['Project', evProjects(e).map(p => (can('projects') && (p.owner === myId() || role() !== 'P') ? L(h(p.title), 'project', { id: p.id }) : h(p.title))).join(', ') || '<span class="cap">Not linked to a project</span>'],
        ['Owner', nm(e.owner)],
        ['Source', h(e.source)],
        ['Purpose', h(e.purpose)],
        ['Consent / personal content', h(e.consent)],
        ['Sensitivity', h(e.sens)],
        ['Visibility', h(e.vis)],
        ['Retention', h(e.retention)],
        ['Linked to', e.linked.map(cName).join(', ')],
        ['Review status', pill(e.review)],
        [
          'Evidence Support Level',
          pill(e.level, 'p-navy') + ' ' + h((LEVELS.find(l => l[0] === e.level) || [])[1] || ''),
        ],
        ['Reviewer', e.reviewer ? nm(e.reviewer) : '—'],
        ['Limitations / uncertainty', h(e.limits || '—')],
        ['Lifecycle', pill(e.lifecycle)],
        ['Release permission', h(e.release)],
      ]),
      '',
      'c8',
    )}
 <aside class="c4 col" style="gap:12px">${rev && ['Submitted', 'Needs Revision'].includes(e.review) ? card('Review', 'You set the status and level. Approval does not release it.', `<form data-f="evr" class="col" style="gap:12px" novalidate><input type="hidden" name="id" value="${e.id}">${fi('evr', 'review', 'Review status', { type: 'select', req: true, opts: REVIEW.filter(x => x !== 'Submitted' && x !== 'Withdrawn'), ph: 'Select' })}${fi('evr', 'level', 'Evidence Support Level', { type: 'select', req: true, opts: LEVELS.map(([k, v]) => [k, k + ' — ' + v]), value: e.level })}${fi('evr', 'limits', 'Limitations or uncertainty', { type: 'textarea', rows: 3, req: true, value: e.limits })}${fi('evr', 'comment', 'Comment to submitter', { type: 'textarea', rows: 2 })}<button class="btn btn-p" type="submit">Save review</button></form>`) : ''}
 ${own && e.review === 'Needs Revision' ? card('Revise and resubmit', 'History is kept.', B('Resubmit', 'evResub', { id: e.id }, 'btn-p btn-block')) : ''}
 ${own && !['Withdrawn'].includes(e.review) ? card('Release to a new audience', 'Moving evidence to a new audience or purpose is a new release decision.', (rr.length ? rr.map(x => `<div class="lrow"><div class="lt"><b>${h(x.audience)}</b><p class="cap">${h(x.status)}</p></div>${x.status === 'Awaiting owner decision' ? B('Decline', 'relDecide', { id: x.id, v: 'Declined by owner' }) + B('Authorise', 'relDecide', { id: x.id, v: 'Owner authorised — disclosure review' }, 'btn-p btn-sm') : ''}</div>`).join('') : '') + (e.review === 'Approved' ? B('Authorise funder / public release', 'relNew', { id: e.id }, 'btn-s btn-block') : '<p class="cap">Only approved evidence can be released.</p>') + (e.sens === 'High' ? banner('warn', '', 'Contains identifiable or sensitive content. Explicit authorisation is required, and a human disclosure review follows.') : '')) : ''}
 ${own && e.review !== 'Withdrawn' ? CB('Withdraw evidence', 'evWithdraw', { id: e.id }, 'Withdraw this evidence? It leaves review and any release stops. History is kept.') : ''}
 ${
   role() === 'A'
     ? rr
         .filter(x => x.status === 'Owner authorised — disclosure review')
         .map(x =>
           card(
             'Disclosure review',
             'Small or distinctive groups and sensitive narratives are suppressed, combined or withheld.',
             `<b>${h(x.audience)}</b><div class="row" style="margin-top:10px">${B('Withhold', 'relDecide', { id: x.id, v: 'Withheld after disclosure review' })}${B('Release', 'relDecide', { id: x.id, v: 'Released' }, 'btn-p btn-sm')}</div>`,
           ),
         )
         .join('')
     : ''
 }
 ${card('History', '', e.history.map(x => `<p class="cap" style="margin-bottom:6px">${fmt(x.at)} · ${h(x.t)}</p>`).join(''))}</aside></div>`
  );
}
F.evr = d => {
  if (!validate('evr', d, { review: ['req'], level: ['req'], limits: ['req'] })) return render();
  const e = byId('evidence', d.id);
  e.review = d.review;
  e.level = d.level;
  e.limits = d.limits;
  e.reviewer = myId();
  e.history.push({ at: today(), t: `${d.review} at ${d.level} by ${me().name}${d.comment ? ': ' + d.comment : ''}` });
  if (d.review === 'Approved') {
    S.candidates.push({
      id: uid('cd'),
      pid: e.owner,
      field: 'Capability',
      value: e.claim,
      source: 'Approved evidence ' + e.title,
      prov: 'Evidence-supported',
      status: 'Pending',
    });
    const pw = S.pathways.find(p => p.pid === e.owner && p.state === 'Current');
  }
  if (/negative|harm|unintended/i.test(d.limits))
    S.assign
      .filter(a => a.bundles.includes('Incident/Safety Owner'))
      .forEach(a =>
        notify(a.pid, 'Material negative finding recorded on evidence ' + e.title, 'evidence', { id: e.id }),
      );
  notify(e.owner, `Evidence review: “${e.title}” — ${d.review} (${d.level})`, 'evidence', { id: e.id });
  audit('Evidence reviewed', e.id, d.review + ' ' + d.level);
  clearF('evr');
  ok();
};
A.evResub = d => {
  const e = byId('evidence', d.id);
  e.review = 'Submitted';
  e.history.push({ at: today(), t: 'Resubmitted after revision' });
  if (e.reviewer) notify(e.reviewer, 'Evidence resubmitted: ' + e.title, 'evidence', { id: e.id });
  audit('Evidence resubmitted', e.id, '');
  ok();
};
A.evWithdraw = d => {
  const e = byId('evidence', d.id);
  e.review = 'Withdrawn';
  e.lifecycle = 'Withdrawn';
  e.release = 'Not released';
  e.history.push({ at: today(), t: 'Withdrawn by owner' });
  audit('Evidence withdrawn', e.id, '');
  ok();
};
A.relNew = d => {
  clearF('rel');
  modal(
    'Authorise a release',
    () =>
      `<form data-f="rel" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('rel', 'aud', 'Audience and purpose', { type: 'select', req: true, opts: ['Funder report (Hartwell Foundation)', 'Public programme showcase', 'Organisation report'], ph: 'Select' })}${consent(myId(), 'public') !== 'Granted' ? banner('warn', 'Public/funder release permission is off', `Turn it on in ${L('Privacy & consent', 'privacy')} first.`) : ''}${fi('rel', 'ok', 'I authorise this specific release', { type: 'checkbox', req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${consent(myId(), 'public') !== 'Granted' ? 'disabled' : ''}>Authorise</button></div></form>`,
  );
};
F.rel = d => {
  if (!validate('rel', d, { aud: ['req'], ok: [['req', 'Tick to authorise.']] })) return render();
  S.releases.push({
    id: uid('rr'),
    ev: d.id,
    requester: myId(),
    audience: d.aud,
    status: 'Owner authorised — disclosure review',
    at: today(),
  });
  S.assign
    .filter(a => roleBase(a.role) === 'A')
    .forEach(a => notify(a.pid, 'Disclosure review needed: ' + byId('evidence', d.id).title, 'evidence', { id: d.id }));
  audit('Release authorised by owner', d.id, d.aud);
  UI.modal = null;
  clearF('rel');
  ok();
};
A.relDecide = d => {
  const x = byId('releases', d.id);
  const e = byId('evidence', x.ev);
  if (d.v.startsWith('Owner authorised') && consent(e.owner, 'public') !== 'Granted') {
    return deny('public/funder release permission is not granted — turn it on in Privacy & consent first');
  }
  x.status = d.v;
  if (d.v === 'Released') e.release = 'Approved for funder release';
  e.history.push({ at: today(), t: 'Release: ' + d.v + ' (' + x.audience + ')' });
  if (d.v.startsWith('Owner authorised'))
    S.assign
      .filter(a => roleBase(a.role) === 'A')
      .forEach(a => notify(a.pid, 'Disclosure review needed: ' + e.title, 'evidence', { id: e.id }));
  notify(e.owner, 'Release decision: ' + d.v, 'evidence', { id: e.id });
  audit('Release decision', x.id, d.v);
  ok();
};
// ---- evidence formats: a file, a link, a written reflection or output, or a reference to a repository record
const EV_FMTS = ['File upload', 'Link', 'Reflection or written output', 'Repository record'];
const evRecordsFor = spaces =>
  S.records.filter(r => r.state === 'Active' && (r.owner === myId() || r.linked.some(l => spaces.some(s => s.id === l))));
function neFmtFields(f, fmt, spaces) {
  if (fmt === 'Link')
    return fi(f, 'url', 'Link', { req: true, type: 'url', ph: 'https://', help: 'A document, dataset, output, published result or video hosted elsewhere.' });
  if (fmt === 'Reflection or written output')
    return fi(f, 'text', 'Reflection or written output', { type: 'textarea', rows: 6, req: true, ph: 'What you did, what it produced, and what it shows' });
  if (fmt === 'Repository record') {
    const recs = evRecordsFor(spaces);
    return recs.length
      ? fi(f, 'rec', 'Record', { type: 'select', req: true, ph: 'Select a record', opts: recs.map(r => [r.id, r.title + ' · ' + r.kind]), help: 'Linked by reference. The record keeps its own permissions.' })
      : banner('info', 'No records available', 'Only active records you own or that belong to your spaces can be referenced.');
  }
  return `<div class="field"><span class="lbl">File <span class="req">*</span></span><label class="dz ${fe(f, 'file') ? 'err' : ''}" style="cursor:pointer;display:block">${ic('upload', 22)}<div><b>Choose a file</b></div><div class="cap">Up to ${S.settings.maxFileMB} MB. Video must be linked externally. Files are scanned; failures are quarantined.</div><input type="file" name="file" class="sr"><span class="fname">No file chosen</span></label>${fe(f, 'file') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, 'file')}</span>` : ''}</div>`;
}
// Which deliverable the evidence supports (optional). Value "roomId|taskId".
function neTaskField(f, spaces) {
  const opts = spaces
    .filter(s => byId('rooms', s.id))
    .flatMap(x => x.tasks.filter(k => !['Proposed', 'Declined'].includes(k.status)).map(k => [x.id + '|' + k.id, x.name + ' · ' + k.t + ' (' + k.status + ')']));
  if (!opts.length) return '';
  const def = UI.p.task && UI.p.link ? UI.p.link + '|' + UI.p.task : '';
  return fi(f, 'task', 'Supports deliverable', { type: 'select', ph: 'Not tied to one deliverable', opts, value: def, help: 'Optional. The evidence is attached to that deliverable as supporting evidence.' });
}
A.neFmt = (d, el) => {
  snapForms();
  UI.form.ne = { ...(UI.form.ne || {}), fmt: el.value };
  if (UI.err.ne) delete UI.err.ne.file;
  render();
};
route('newevidence', 'evidence', () => {
  if (!can('evidence', 'CRM')) return deniedView('evidence');
  const f = 'ne';
  const spaces = [...myCircles(), ...myRopes(), ...myRooms()];
  return (
    head(
      'Upload evidence',
      'Required metadata first. Sensitivity and consent record whether it contains personal or identifiable content.',
      '',
      [['Evidence', 'evidence'], ['Upload']],
    ) +
    `${UI.p.from && byId('rooms', UI.p.from) ? '<div style="max-width:880px;margin-bottom:16px">' + banner('info', 'Evidence for ' + h(byId('rooms', UI.p.from).name), 'This evidence supports the completed deliverables. After you submit it you return to the ' + WL() + ', where you can generate the Learning Harvest.') + '</div>' : ''}<form data-f="ne" class="card col" style="gap:16px;max-width:880px" novalidate>${errSum(f)}<input type="hidden" name="from" value="${h(UI.p.from || '')}">
 ${fi(f, 'fmt', 'Evidence format', { type: 'select', req: true, opts: EV_FMTS, value: 'File upload', ch: 'neFmt', help: 'Documents, files, outputs and results can be uploaded or linked. Reflections are written here.' })}
 ${neFmtFields(f, fv(f, 'fmt', 'File upload'), spaces)}
 ${neTaskField(f, spaces)}
 ${fi(f, 'title', 'Title', { req: true })}<div class="f2">${fi(f, 'type', 'Evidence type', { type: 'select', req: true, ph: 'Select', opts: EV_TYPES })}${fi(f, 'claim', 'Claim or metric it supports', { req: true })}</div>
 <fieldset style="border:0;padding:0;margin:0"><legend class="lbl" style="margin-bottom:8px">Link to (no duplication) <span class="req">*</span></legend><div class="g2">${spaces.map(s => `<label class="row"><input class="chk" type="checkbox" name="link" value="${s.id}" ${UI.p.link === s.id ? 'checked' : ''}><span>${h(s.name)}${spaceProject(s.id) ? `<span class="cap" style="display:block">Project: ${h(spaceProject(s.id).title)}</span>` : ''}</span></label>`).join('') || '<p class="cap">Join a Circle or ' + WL() + ' to link evidence.</p>'}</div>${fe(f, 'link') ? `<span class="emsg">${ic('alert', 14)}${fe(f, 'link')}</span>` : ''}</fieldset>
 <div class="f2">${fi(f, 'source', 'Source', { req: true, ph: 'e.g. Field survey' })}${fi(f, 'purpose', 'Purpose', { type: 'select', req: true, opts: ['Project evidence', 'Milestone evidence', 'Learning evidence', 'Portfolio'], ph: 'Select' })}</div>
 <div class="f2">${fi(f, 'consent', 'Personal or identifiable content?', { type: 'select', req: true, ph: 'Select', opts: ['Contains no personal data', 'Contains identifiable people — consent recorded', 'Contains testimony — participant consent recorded', 'Contains third-party personal information'] })}${fi(f, 'sens', 'Sensitivity', { type: 'select', req: true, opts: ['Low', 'Medium', 'High'], ph: 'Select' })}</div>
 <div class="f2">${fi(f, 'vis', 'Visibility', { type: 'select', req: true, opts: ['Only me + reviewer', 'Circle', 'Room', 'Rope Team'], ph: 'Select' })}${fi(f, 'retention', 'Retention', { type: 'select', req: true, opts: ['Programme duration', 'Programme duration + 2 years'], ph: 'Select' })}</div>
 <div class="actions">${L('Cancel', 'evidence', {}, 'btn btn-g')}<button class="btn btn-p" type="submit">Submit for review</button></div></form>`
  );
});
F.ne = (d, form) => {
  const fmt = EV_FMTS.includes(d.fmt) ? d.fmt : 'File upload';
  const file = fmt === 'File upload' ? form.querySelector('input[type=file]')?.files?.[0] : null;
  d.link = [].concat(d.link || []);
  const [tRoom, tId] = (d.task || '').split('|');
  if (tRoom && !d.link.includes(tRoom)) d.link.push(tRoom);
  const okv = validate(
    'ne',
    { ...d, fileName: file?.name },
    {
      title: ['req'],
      type: ['req'],
      claim: ['req'],
      source: ['req'],
      purpose: ['req'],
      consent: ['req'],
      sens: ['req'],
      vis: ['req'],
      retention: ['req'],
    },
  );
  const e = UI.err.ne;
  if (fmt === 'File upload') {
    if (!file) e.file = 'Choose a file to upload.';
    else if (file.size > S.settings.maxFileMB * 1048576)
      e.file = `File is ${(file.size / 1048576).toFixed(1)} MB — over the ${S.settings.maxFileMB} MB limit.`;
    else if (/\.(mp4|mov|avi|mkv)$/i.test(file.name))
      e.file = 'Video is linked externally, not uploaded. Choose “Link” as the format instead.';
    else if (/\.(exe|bat|cmd|sh|js)$/i.test(file.name)) e.file = 'This file type is not supported.';
  }
  if (fmt === 'Link' && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test((d.url || '').trim())) e.url = 'Enter a full link starting with http:// or https://.';
  if (fmt === 'Reflection or written output' && (d.text || '').trim().length < 20) e.text = 'Write at least a couple of sentences (20 characters or more).';
  if (fmt === 'Repository record' && !byId('records', d.rec)) e.rec = 'Choose the record this evidence refers to.';
  if (!d.link.length) e.link = 'Link the evidence to at least one Circle, Rope Team or ' + WL() + '.';
  if (Object.keys(e).length) return render();
  if (file && /eicar|virus/i.test(file.name)) {
    S.records.push({
      id: uid('rc'),
      title: file.name,
      kind: 'Evidence upload',
      owner: myId(),
      linked: [],
      date: today(),
      sens: d.sens,
      vis: d.vis,
      consent: d.consent,
      retention: d.retention,
      review: 'Pending',
      state: 'Quarantined',
      ver: 1,
      tags: '',
      sizeMB: +(file.size / 1048576).toFixed(1),
      note: 'Failed malware check — quarantined, not linked',
    });
    audit('File quarantined', file.name, 'Malware check failed', 'denied');
    clearF('ne');
    toast('File failed the malware check and was quarantined. It was not linked.', 'err');
    return ok();
  }
  const ev = {
    id: uid('ev'),
    owner: myId(),
    title: d.title,
    type: d.type,
    claim: d.claim,
    linked: d.link,
    project: (d.link.map(spaceProject).find(Boolean) || {}).id || null,
    format: fmt,
    file: file ? file.name : null,
    sizeMB: file ? +(file.size / 1048576).toFixed(2) : 0,
    ...(fmt === 'Link' ? { url: d.url.trim() } : {}),
    ...(fmt === 'Reflection or written output' ? { text: d.text.trim() } : {}),
    ...(fmt === 'Repository record' ? { record: d.rec } : {}),
    source: d.source,
    purpose: d.purpose,
    consent: d.consent,
    sens: d.sens,
    vis: d.vis,
    retention: d.retention,
    review: 'Submitted',
    level: 'E0',
    reviewer: null,
    limits: '',
    lifecycle: 'Active',
    release: 'Not released',
    history: [{ at: today(), t: 'Submitted' }],
  };
  S.evidence.push(ev);
  S.assign
    .filter(a => a.ctx === ctxId() && (roleBase(a.role) === 'F' || a.bundles.includes('Reviewer')) && a.pid !== myId())
    .forEach(a => notify(a.pid, 'Evidence submitted for review: ' + ev.title, 'evidence', { id: ev.id }));
  const tx = tRoom && byId('rooms', tRoom);
  const tk = tx && tx.tasks.find(k => k.id === tId);
  if (tk) {
    (tk.evidence = tk.evidence || []).push(ev.id);
    (tk.log = tk.log || []).push({ at: now(), by: myId(), t: 'Supporting evidence added: ' + ev.title });
    ev.history.push({ at: today(), t: 'Attached to deliverable: ' + tk.t });
  }
  audit('Evidence submitted', ev.id, ev.type + ' · ' + fmt + (tk ? ' · supports ' + tk.t : ''));
  clearF('ne');
  save();
  const back = d.from && byId('rooms', d.from);
  if (back && memberOf(back)) {
    go('room', { id: back.id });
    return toast('Evidence submitted for review. Next step: generate the Learning Harvest.');
  }
  go('evidence', { id: ev.id });
  toast('Submitted for review.');
};
// ---------- REPOSITORY (E08) ----------
route('repository', 'repository', () => {
  const r = role();
  // arriving from a link to one record (e.g. from a Learning Harvest) filters to it
  if (UI.p.rec && byId('records', UI.p.rec)) {
    UI.q.repo = byId('records', UI.p.rec).title;
    delete UI.p.rec;
  }
  const q = UI.q.repo || '';
  const vis = S.records.filter(
    x =>
      r === 'A' ||
      x.owner === myId() ||
      x.linked.some(l => {
        const o = byId('circles', l) || byId('rooms', l) || byId('ropes', l);
        return o && (memberOf(o) || r === 'O');
      }),
  );
  const list = vis.filter(
    x =>
      !q ||
      (x.title + ' ' + x.kind + ' ' + x.tags + ' ' + x.linked.map(cName).join(' '))
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const used = S.records.reduce((a, x) => a + x.sizeMB, 0);
  return (
    head(
      'Records repository',
      'Meeting notes, transcripts, approved chat exports, decisions and documents — with consent, sensitivity, visibility and retention.',
      r !== 'O' ? B(ic('upload', 16) + 'Upload record', 'repoUp', {}, 'btn-p') : '',
    ) +
    (r === 'A'
      ? banner(
          'info',
          'Storage',
          `${used.toFixed(1)} MB used of the 50 GB quota (${((used / 51200) * 100).toFixed(2)}%). Warning at 80%.`,
        )
      : '') +
    `<div class="row" style="margin-bottom:16px"><input class="input" style="max-width:360px" placeholder="Search by title, type, people, Circle, tags" value="${h(q)}" data-ch="repoQ" aria-label="Search records"></div>` +
    table(
      ['Record', 'Type', 'Linked to', 'Owner', 'Sensitivity', 'Consent', 'State', ''],
      list.map(x => [
        `<b>${h(x.title)}</b><div class="cap">v${x.ver}${x.note ? ' · ' + h(x.note) : ''}</div>`,
        h(x.kind),
        x.linked.map(cName).join(', ') || '—',
        nm(x.owner),
        h(x.sens),
        h(x.consent),
        pill(x.state),
        x.state !== 'Quarantined' ? B('Details', 'repoView', { id: x.id }) : '',
      ]),
      'No records.',
    )
  );
});
A.repoQ = (d, el) => {
  UI.q.repo = el.value;
  render();
};
A.repoView = d => {
  const x = byId('records', d.id);
  const can_ = x.owner === myId() || role() === 'A';
  const aiBlock = /missing/i.test(x.consent);
  modal(
    h(x.title),
    () =>
      `${dl([
        ['Type', h(x.kind)],
        ['Date', fmt(x.date)],
        ['Owner', nm(x.owner)],
        ['Linked to', x.linked.map(cName).join(', ')],
        ['Sensitivity', h(x.sens)],
        ['Visibility', h(x.vis)],
        ['Consent', h(x.consent)],
        ['Retention', h(x.retention)],
        ['Review', pill(x.review)],
        [
          'Versions',
          (x.versions || [{ ver: 1, note: 'Original' }]).map(v => 'v' + v.ver + ' ' + h(v.note)).join(' · '),
        ],
      ])}${aiBlock ? banner('warn', 'AI extraction and broader sharing blocked', 'Recording consent is missing for at least one participant.') : ''}<div class="row wrap">${B(ic('download', 14) + 'Export with metadata', 'repoExport', { id: x.id })}${can_ ? B('Upload corrected version', 'repoCorrect', { id: x.id }) : ''}${can_ && x.state !== 'Deletion requested' ? CB(ic('trash', 14) + 'Request deletion', 'repoDel', { id: x.id }, 'Request deletion of this record? A Programme Administrator approves it; the audit entry is preserved.') : ''}${role() === 'A' && x.state === 'Deletion requested' ? B('Approve deletion', 'repoDelOk', { id: x.id }, 'btn-d btn-sm') : ''}</div>`,
  );
};
A.repoExport = d => {
  audit('Record exported', d.id, 'with metadata and audit summary');
  toast('Export prepared with metadata and audit summary.');
  UI.modal = null;
  ok();
};
A.repoCorrect = d => {
  const x = byId('records', d.id);
  x.versions = x.versions || [{ ver: 1, note: 'Original' }];
  x.ver++;
  x.versions.push({ ver: x.ver, note: 'Corrected by ' + me().name });
  audit('Record corrected', x.id, 'v' + x.ver);
  UI.modal = null;
  toast('Corrected version saved; previous version and audit trail kept.');
  ok();
};
A.repoDel = d => {
  const x = byId('records', d.id);
  x.state = 'Deletion requested';
  S.assign.filter(a => roleBase(a.role) === 'A').forEach(a => notify(a.pid, 'Deletion requested: ' + x.title, 'repository'));
  audit('Deletion requested', x.id, '');
  UI.modal = null;
  ok();
};
A.repoDelOk = d => {
  const x = byId('records', d.id);
  S.records = S.records.filter(r => r !== x);
  audit('Record deleted (authorised)', x.id, 'Audit entry preserved');
  UI.modal = null;
  toast('Deleted. The audit entry is preserved.');
  ok();
};
A.repoUp = () => {
  clearF('ru');
  const sp = [...myCircles(), ...myRopes(), ...myRooms()];
  modal(
    'Upload a record',
    () =>
      `<form data-f="ru" class="col" style="gap:12px" novalidate>${fi('ru', 'title', 'Title', { req: true })}${fi('ru', 'kind', 'Type', { type: 'select', req: true, ph: 'Select', opts: ['Meeting notes', 'Transcript', 'Approved chat export', 'Decision', 'Commitment', 'Document', 'Recording (external link)'] })}<div class="field"><label class="lbl">File</label><input type="file" name="file" class="input" style="padding:8px"></div>${fi('ru', 'link', 'Link to', { type: 'select', req: true, ph: 'Select', opts: sp.map(s => [s.id, s.name]) })}<div class="f2">${fi('ru', 'sens', 'Sensitivity', { type: 'select', req: true, opts: ['Low', 'Medium', 'High'] })}${fi('ru', 'consent', 'Recording / processing consent', { type: 'select', req: true, opts: ['n/a (notes)', 'All participants consented', 'Recording consent missing for 1+ member'] })}</div>${fi('ru', 'tags', 'Tags')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Upload</button></div></form>`,
  );
};
F.ru = (d, form) => {
  if (!validate('ru', d, { title: ['req'], kind: ['req'], link: ['req'] })) return render();
  const file = form.querySelector('input[type=file]').files[0];
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    UI.err.ru = { title: 'File over ' + S.settings.maxFileMB + ' MB.' };
    return render();
  }
  S.records.push({
    id: uid('rc'),
    title: d.title,
    kind: d.kind,
    owner: myId(),
    linked: [d.link],
    date: today(),
    sens: d.sens,
    vis: 'Linked space members',
    consent: d.consent,
    retention: 'Programme',
    review: 'Approved',
    state: 'Active',
    ver: 1,
    tags: d.tags,
    sizeMB: file ? +(file.size / 1048576).toFixed(2) : 0.1,
  });
  audit('Record uploaded', d.title, d.kind);
  UI.modal = null;
  clearF('ru');
  ok();
};
// ---------- LEARNING HARVEST (F08) ----------
const HV_SECTIONS = [
  'Context',
  'What happened',
  'Evidence and outcomes',
  'Learning',
  'Human perspective',
  'Governance',
  'Forward movement',
  'AI transparency',
];
const canComplete = () => role() === 'F' || hasB('Reviewer') || hasB('Project Lead');
route('harvests', 'harvest', () => {
  const r = role();
  const list = S.harvests.filter(x => {
    const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
    return (
      r === 'A' ||
      (o && (memberOf(o) || r === 'F')) ||
      x.personal === myId() ||
      ((r === 'S' || r === 'O') && x.release === 'Released')
    );
  });
  return (
    head(
      'Learning Harvests',
      'Source records → AI draft → human review → edit → approve/reject → release. Previous versions are kept.',
      r !== 'S' && r !== 'O' ? B(ic('plus', 16) + 'Start a Harvest', 'newHarvest', {}, 'btn-p') : '',
    ) +
    table(
      ['Harvest', 'Trigger', 'State', 'AI', 'Release', ''],
      list.map(x => [
        `<b>${h(x.scopeName)}</b>`,
        h(x.trigger),
        pill(x.state),
        x.ai ? aiTag('AI-assisted') : '—',
        h(x.release),
        L('Open', 'harvest', { id: x.id }),
      ]),
      'No Harvests yet.',
    )
  );
});
A.newHarvest = d => {
  clearF('hv');
  const sp = [...myCircles(), ...myRopes(), ...myRooms()];
  const pids = ['A'].includes(role()) ? [...S.circles, ...S.rooms].filter(inCtx) : sp;
  modal(
    'Start a Learning Harvest',
    () =>
      `<form data-f="hv" class="col" style="gap:14px" novalidate>${fi('hv', 'scope', 'For', { type: 'select', req: true, ph: 'Select', opts: [...pids.map(s => [s.id, s.name]), ['personal', 'My personal Harvest (pathway)']], value: d.scope })}${fi('hv', 'trigger', 'Trigger', { type: 'select', req: true, opts: ['Session completion', 'Milestone', 'Visible win', 'Periodic review', 'Workspace closure', 'Pathway completion'] })}${consent(myId(), 'ai') === 'Granted' && S.settings.aiAvailable ? fi('hv', 'ai', 'Let PHOENIX draft it from authorised source records (Class B)', { type: 'checkbox' }) : banner('info', '', 'AI drafting unavailable — you will write the Harvest manually.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Start</button></div></form>`,
  );
};
F.hv = d => {
  if (!validate('hv', d, { scope: ['req'], trigger: ['req'] })) return render();
  const o =
    d.scope === 'personal' ? null : byId('circles', d.scope) || byId('rooms', d.scope) || byId('ropes', d.scope);
  const ai = d.ai === 'yes';
  const src = o ? S.records.filter(r => r.linked.includes(o.id) && !/missing/i.test(r.consent)) : [];
  const blocked = o ? S.records.filter(r => r.linked.includes(o.id) && /missing/i.test(r.consent)) : [];
  const sec = {};
  HV_SECTIONS.forEach(s => (sec[s] = ''));
  if (ai) {
    sec.Context = `${o ? o.name : 'Personal pathway'} · ${d.trigger} · ${today()}`;
    sec['What happened'] = o && o.decisions ? o.decisions.map(x => x.t).join('; ') : '';
    sec['Evidence and outcomes'] = S.evidence
      .filter(e => o && e.linked.includes(o.id) && e.review === 'Approved')
      .map(e => e.title + ' (' + e.level + ')')
      .join('; ');
    sec.Learning = '[Draft] Themes from source records — review and edit.';
    sec['Forward movement'] =
      o && o.commitments
        ? o.commitments
            .filter(x => x.status === 'Open')
            .map(x => x.t)
            .join('; ')
        : '';
    sec['AI transparency'] =
      `AI drafted from ${src.map(r => r.title).join(', ') || 'approved records'}.${blocked.length ? ' Excluded (missing recording consent): ' + blocked.map(r => r.title).join(', ') + '.' : ''} Not yet reviewed.`;
    S.ai.push({
      id: uid('aj'),
      by: myId(),
      cls: 'B',
      purpose: 'Harvest draft',
      sources: src.map(r => r.id).join(', '),
      consent: 'Granted',
      model: '[Provider model via AI gateway]',
      status: 'Draft',
      at: today(),
    });
  }
  const x = {
    id: uid('hv'),
    scope: o ? o.id : 'personal',
    personal: o ? null : myId(),
    scopeName: (o ? o.name : 'Personal Harvest — ' + me().name) + ' — ' + d.trigger,
    trigger: d.trigger,
    state: 'Draft',
    ai,
    ver: 1,
    by: myId(),
    sections: sec,
    contrib: [],
    release: 'Not released',
    versions: [],
  };
  S.harvests.push(x);
  if (o)
    (o.members || [])
      .filter(m => m.status === 'Active' && m.pid !== myId())
      .forEach(m => notify(m.pid, 'Contribute to a Learning Harvest: ' + x.scopeName, 'harvest', { id: x.id }));
  audit('Harvest initiated', x.id, ai ? 'AI draft' : 'manual');
  UI.modal = null;
  clearF('hv');
  save();
  go('harvest', { id: x.id });
};
route('harvest', 'harvest', () => {
  const x = byId('harvests', UI.p.id);
  if (!x) return empty('sparkle', 'Not found', '');
  const r = role();
  const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
  const mem = o ? memberOf(o) : x.personal === myId();
  if (['S', 'O'].includes(r) && x.release !== 'Released') return deniedView('harvest');
  const comp = canComplete() && (mem || r === 'F');
  const edit = ['Draft', 'Review'].includes(x.state) && (x.by === myId() || comp);
  if (x.tpl === 2) return hv2View(x, mem, comp, edit);
  return (
    head(
      h(x.scopeName),
      'Learning Harvest Template v1.0 · version ' + x.ver,
      pill(x.state) + (x.ai ? aiTag('AI-assisted') : ''),
      [['Learning Harvests', 'harvests'], ['Harvest']],
    ) +
    `<div class="g12"><form data-f="hve" class="card c8 col" style="gap:14px" novalidate><input type="hidden" name="id" value="${x.id}">${HV_SECTIONS.map(s => (edit ? fi('hve', s, s, { type: 'textarea', rows: 2, value: x.sections[s] }) : `<div><b>${s}</b><p class="muted" style="white-space:pre-line">${h(x.sections[s] || '—')}</p></div>`)).join('')}${edit ? `<div class="actions"><span></span><div class="row wrap"><button class="btn btn-s" type="submit" name="act" value="save">Save edits</button>${x.state === 'Draft' ? `<button class="btn btn-s" type="submit" name="act" value="review">Send for review</button>` : ''}${comp ? `<button class="btn btn-s" type="submit" name="act" value="reject">Reject</button><button class="btn btn-p" type="submit" name="act" value="approve">Approve</button>` : ''}</div></div>` : ''}</form>
 <aside class="c4 col" style="gap:12px">${card('Contributions', 'Reflections, lessons, dissent and questions.', x.contrib.map(c => lrow('message', h(c.t), nm(c.by))).join('') || '<p class="cap">None yet.</p>', mem && ['Draft', 'Review'].includes(x.state) ? B(ic('plus', 14) + 'Contribute', 'hvContrib', { id: x.id }) : '')}
 ${card('Release', 'Separate approval for public or funder release.', `<p>${h(x.release)}</p>${x.state === 'Approved' && comp && x.release === 'Not released' ? B('Request funder release', 'hvRel', { id: x.id, v: 'Funder release requested' }) : ''}${r === 'A' && x.release === 'Funder release requested' ? B('Approve release', 'hvRel', { id: x.id, v: 'Released' }, 'btn-p btn-sm') : ''}`)}
 ${card('Profile candidates', 'A Harvest cannot write to a profile. Only individual, attributable items are offered.', x.state === 'Approved' && comp ? B('Offer profile candidates to participants', 'hvCand', { id: x.id }) : '<p class="cap">Available after approval.</p>')}
 ${x.state === 'Rejected' && (x.by === myId() || comp) ? card('Rejected', 'Revise contributions and redraft. The rejected version is kept.', B(ic('refresh', 14) + 'Revise and redraft', 'hvRedraft', { id: x.id }, 'btn-p btn-sm')) : ''}
 ${x.versions.length ? card('Previous versions', '', x.versions.map(v => `<p class="cap">v${v.ver} · ${fmt(v.at)} · ${h(v.state)}</p>`).join('')) : ''}</aside></div>`
  );
});
F.hve = d => {
  const x = byId('harvests', d.id);
  const act = d.act || 'save';
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections } });
  x.ver++;
  HV_SECTIONS.forEach(s => (x.sections[s] = d[s] || ''));
  if (act === 'approve') {
    const miss = ['Context', 'What happened', 'Learning', 'Forward movement'].filter(s => !x.sections[s].trim());
    if (miss.length) {
      x.ver--;
      x.versions.pop();
      toast('Complete required sections first: ' + miss.join(', '), 'err');
      return render();
    }
    x.state = 'Approved';
    x.approvedBy = myId();
    const j = S.ai.find(a => a.purpose === 'Harvest draft' && a.status === 'In review');
    if (j) {
      j.status = 'Released';
      j.reviewed = true;
    }
  }
  if (act === 'reject') x.state = 'Rejected';
  if (act === 'review') {
    x.state = 'Review';
    S.ai.filter(a => a.purpose === 'Harvest draft' && a.status === 'Draft').forEach(a => (a.status = 'In review'));
    S.assign
      .filter(a => a.ctx === ctxId() && roleBase(a.role) === 'F')
      .forEach(a => notify(a.pid, 'Harvest ready for review: ' + x.scopeName, 'harvest', { id: x.id }));
  }
  audit('Harvest ' + act, x.id, 'v' + x.ver);
  if (act === 'approve') toast('Harvest approved.');
  ok();
};
A.hvContrib = d => {
  clearF('hc');
  modal(
    'Contribute',
    () =>
      `<form data-f="hc" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${d.id}">${fi('hc', 'kind', 'Type', { type: 'select', opts: ['Reflection', 'Lesson', 'Dissent', 'Question', 'Missing voice'] })}${fi('hc', 't', 'Your contribution', { type: 'textarea', rows: 3, req: true })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Add</button></div></form>`,
  );
};
F.hc = d => {
  if (!validate('hc', d, { t: ['req'] })) return render();
  byId('harvests', d.id).contrib.push({ by: myId(), t: d.kind + ': ' + d.t });
  UI.modal = null;
  clearF('hc');
  ok();
};
A.hvRel = d => {
  const x = byId('harvests', d.id);
  x.release = d.v;
  if (d.v === 'Funder release requested')
    S.assign
      .filter(a => roleBase(a.role) === 'A')
      .forEach(a => notify(a.pid, 'Harvest release requested: ' + x.scopeName, 'harvest', { id: x.id }));
  audit('Harvest release', x.id, d.v);
  ok();
};
A.hvCand = d => {
  const x = byId('harvests', d.id);
  const o = byId('circles', x.scope) || byId('rooms', x.scope) || byId('ropes', x.scope);
  const ps = o
    ? o.members
        .filter(m => m.status === 'Active')
        .map(m => m.pid)
        .filter(p => (S.assign.find(a => a.pid === p && a.ctx === ctxId()) || {}).role === 'P')
    : [x.personal];
  ps.forEach(p => {
    S.candidates.push({
      id: uid('cd'),
      pid: p,
      field: 'Completed learning activity',
      value: 'Contributed to ' + x.scopeName,
      source: 'Learning Harvest ' + x.id,
      prov: 'Activity-derived',
      status: 'Pending',
    });
    notify(p, 'A profile candidate from a Learning Harvest is waiting for your decision', 'profile', { tab: 'cand' });
  });
  audit('Harvest profile candidates offered', x.id, ps.length + ' participants');
  toast(ps.length + ' participant(s) were offered a candidate to accept, edit or reject.');
  ok();
};

A.rbDecide = d => {
  const c = byId('cards', d.c);
  const pp = c.proposals.find(x => x.id === d.id);
  pp.status = d.v;
  notify(pp.from, `${me().name} ${d.v.toLowerCase()} your direct collaboration proposal`, 'card', { id: c.id });
  if (
    d.v === 'Accepted' &&
    !canCreateRoom() &&
    !['F', 'C', 'O', 'A'].includes((S.assign.find(a => a.pid === pp.from && a.ctx === c.ctx) || {}).role)
  )
    S.assign
      .filter(a => a.ctx === c.ctx && roleBase(a.role) === 'F')
      .forEach(a =>
        notify(a.pid, 'Create or link a ' + WL() + ' for an accepted direct collaboration', 'card', { id: c.id }),
      );
  audit('Route B ' + d.v, c.id, pp.from + '→' + pp.to);
  ok();
};
A.linkRoom = d => {
  const m = byId('matches', d.id);
  const rooms = myRooms();
  modal(
    'Link an existing ' + WL(),
    `<form data-f="lnk" class="col" style="gap:14px"><input type="hidden" name="id" value="${m.id}">${fi('lnk', 'room', WL(), { type: 'select', req: true, opts: rooms.map(x => [x.id, x.name]) })}${banner('info', 'Linked by reference', 'Only authorised shared context carries forward: title and purpose, agreed participants and roles, next milestone and approved evidence references. Private discussions and restricted records stay where they are.')}<div class="actions"><span></span><button class="btn btn-p" type="submit">Link</button></div></form>`,
  );
};
F.lnk = d => {
  const x = byId('rooms', d.room);
  const m = byId('matches', d.id);
  if (!x.related.includes(m.card)) x.related.push(m.card);
  m.next2 = 'Link existing ' + WL();
  m.outcome = 'Opportunity progressed';
  audit('Linked by reference', x.id, m.id);
  UI.modal = null;
  toast('Linked to ' + x.name + ' by reference.');
  ok();
};

A.hvRedraft = d => {
  const x = byId('harvests', d.id);
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections } });
  x.ver++;
  x.state = 'Draft';
  audit('Harvest reopened as draft after rejection', x.id, 'v' + x.ver);
  toast('Reopened as a new draft. The rejected version is kept.');
  ok();
};

// ---------- LEARNING HARVEST for an Action Room ----------
// Deliverables completed → evidence submitted → Harvest (A–G) → human review → approval → profile evolution suggestions.
// Facts are compiled from the source records; learning, negative findings and the four decisions are written by people.
const HV2 = [
  ['what', 'A. What happened', 'What was completed, the outcomes achieved, the evidence that supports completion, and relevant records.'],
  ['learning', 'B. Learning', 'What was learned: new knowledge, skills demonstrated and developed, new interests, and changes in understanding, confidence or capability.'],
  ['negative', 'C. Negative findings', 'Required. What did not work, failed approaches, incorrect assumptions, blockers, unexpected results and approaches that should not be repeated — even when the overall outcome was a success.'],
  ['resources', 'D. Resource contributions', 'The resources used, which of them contributed to the outcome, and how.'],
  ['partners', 'E. Partner contributions', 'The people, organizations and partners who contributed, what they contributed, and how it affected the outcome.'],
];
const HV2_LEARN = [
  ['knowledge', 'New knowledge'],
  ['skillsDem', 'Skills demonstrated'],
  ['skillsDev', 'Skills developed'],
  ['interests', 'New interests'],
  ['understanding', 'Changes in understanding'],
  ['confidence', 'Changes in confidence or capability'],
];
const HV2_DEC = [
  ['continue', 'Continue', 'What should continue?'],
  ['change', 'Change', 'What should change?'],
  ['stop', 'Stop', 'What should stop?'],
  ['test', 'Test', 'What should be tested next?'],
];
const HV2_KEYS = [...HV2.map(s => s[0]), ...HV2_LEARN.map(s => s[0]), ...HV2_DEC.map(s => s[0])];
const HV2_REQ = ['what', 'learning', 'negative', 'resources', 'partners', 'continue', 'change', 'stop', 'test'];
const HV2_LABEL = Object.fromEntries([...HV2.map(s => [s[0], s[1]]), ['learning', 'B. Learning — what was learned'], ...HV2_DEC.map(s => [s[0], 'F. ' + s[1]])]);
const LINK_IC = { Deliverable: 'check', Evidence: 'award', Milestone: 'flag', Resource: 'layers', Partner: 'users', Contribution: 'upload', Record: 'file', Baseline: 'target' };
const dOnly = s => (s ? String(s).slice(0, 10) : '');
const bullets = a => a.map(s => '• ' + s).join('\n');
// Draft the Harvest from the room's records. Nothing private from the Purpose Compass is copied into shared sections.
function hvCompile(x, pid) {
  const live = (x.tasks || []).filter(k => !['Proposed', 'Declined'].includes(k.status));
  const done = live.filter(k => k.status === 'Done');
  const ev = roomEvidence(x);
  const evOf = k => (k.evidence || []).map(id => byId('evidence', id)).filter(Boolean);
  const ms = (x.milestones || []).filter(m => m.status === 'Achieved');
  const wins = (x.wins || []).filter(w => w.status === 'Approved');
  const recs = S.records.filter(r => r.state === 'Active' && r.linked.includes(x.id) && !/missing/i.test(r.consent));
  const linkedRecs = (x.links || []).filter(l => l.type === 'Repository record');
  const lib = (x.links || []).filter(l => ['Learning resource', 'Learning pathway'].includes(l.type));
  const what = [
    `Completed deliverables (${done.length}):`,
    bullets(done.map(k => `${k.t} — ${P(k.owner).name}${k.doneAt ? ', completed ' + fmt(dOnly(k.doneAt)) : ''}${evOf(k).length ? ' · evidence: ' + evOf(k).map(e => e.title).join('; ') : ''}${k.doneNote ? ' · ' + k.doneNote : ''}`)),
    (x.outcome ? 'Intended outcome: ' + x.outcome : 'Charter: ' + x.charter),
    ms.length ? 'Milestones achieved: ' + ms.map(m => m.t).join('; ') : '',
    wins.length ? 'Approved visible wins: ' + wins.map(w => w.t).join('; ') : '',
    `Evidence submitted (${ev.length}): ` + ev.map(e => `${e.title} (${e.review}, ${e.level})`).join('; '),
    recs.length + linkedRecs.length ? 'Records: ' + [...recs.map(r => r.title), ...linkedRecs.map(l => l.label)].join('; ') : '',
  ]
    .filter(Boolean)
    .join('\n');
  const neg = [
    ...(x.risks || []).filter(k => ['Open', 'Escalated', 'Accepted'].includes(k.state)).map(k => `Risk still ${k.state.toLowerCase()} at completion: ${k.t}`),
    ...(x.deps || []).filter(k => k.state === 'Blocked').map(k => `Blocked dependency: ${k.t} (on ${k.on})`),
    ...done.filter(k => k.due && k.doneAt && dOnly(k.doneAt) > k.due).map(k => `Completed late: ${k.t} (due ${fmt(k.due)}, done ${fmt(dOnly(k.doneAt))})`),
    ...(x.tasks || []).filter(k => k.status === 'Declined').map(k => `Proposed but not pursued: ${k.t}`),
    ...(x.contribs || []).filter(c => (c.history || []).some(e => /Changes requested|More evidence requested/.test(e.t))).map(c => `Contribution needed rework before acceptance: ${c.t}`),
    ...S.evidence.filter(e => e.linked.includes(x.id) && ['Rejected', 'Insufficient', 'Needs Revision'].includes(e.review)).map(e => `Evidence ${e.review.toLowerCase()}: ${e.title}`),
    ...(x.returns || []).map(r => `Work returned to ${r.to}: ${r.why}`),
  ];
  const resources = [
    ...(x.resources || []).map(r => {
      const used = live.filter(k => (k.res || []).includes(r.id));
      return `${r.t}${r.from ? ' — ' + r.from : ''} (${r.status})${used.length ? ' · used in: ' + used.map(k => k.t).join('; ') : ' · not linked to a deliverable'} · how it contributed: `;
    }),
    ...lib.map(l => `${l.label} (${l.type.toLowerCase()}) · how it contributed: `),
  ];
  const ppl = new Map();
  const add = (p, t) => p && p !== pid && ppl.set(p, [...(ppl.get(p) || []), t]);
  done.forEach(k => add(k.owner, `delivered “${k.t}”`));
  live.forEach(k => (k.partners || []).forEach(p => add(p, `contributed to “${k.t}”`)));
  (x.contribs || []).filter(c => c.status === 'Accepted').forEach(c => add(c.by, `contribution accepted: “${c.t}”${c.used ? ' — used in ' + c.used : ''}`));
  x.members.filter(m => m.status === 'Active' && m.label && !ppl.has(m.pid) && m.pid !== pid).forEach(m => add(m.pid, 'partner in this ' + WL()));
  const partners = [...ppl].map(([p, a]) => {
    const m = x.members.find(y => y.pid === p);
    return `${P(p).name}${m && m.label ? ' (' + m.label + ')' : ''}: ${a.join('; ')} · effect on the outcome: `;
  });
  const L2 = (type, id, label, r, p) => ({ type, id, label, r, p });
  const links = [
    ...done.map(k => L2('Deliverable', k.id, k.t, 'room', { id: x.id, tab: 'plan' })),
    ...ev.map(e => L2('Evidence', e.id, e.title, 'evidence', { id: e.id })),
    ...ms.map(m => L2('Milestone', m.id, m.t, 'room', { id: x.id, tab: 'plan' })),
    ...(x.resources || []).map(r => L2('Resource', r.id, r.t, 'room', { id: x.id, tab: 'res' })),
    ...lib.map(l => L2('Resource', l.id, l.label, l.type === 'Learning resource' ? 'resources' : 'room', l.type === 'Learning resource' ? {} : { id: x.id, tab: 'about' })),
    ...[...ppl.keys()].map(p => L2('Partner', p, P(p).name, 'room', { id: x.id, tab: 'members' })),
    ...(x.contribs || []).filter(c => c.status === 'Accepted').map(c => L2('Contribution', c.id, c.t, 'room', { id: x.id, tab: 'contribs' })),
    ...recs.map(r => L2('Record', r.id, r.title, 'repository', { rec: r.id })),
    ...linkedRecs.filter(l => !recs.some(r => r.id === l.id)).map(l => L2('Record', l.id, l.label, 'repository', { rec: l.id })),
    L2('Baseline', pid, 'Purpose Compass Baseline', 'profile', { tab: 'compass' }),
  ];
  const sec = Object.fromEntries(HV2_KEYS.map(k => [k, '']));
  return {
    sections: { ...sec, what, negative: bullets(neg), resources: bullets(resources), partners: bullets(partners) },
    links,
    detected: neg.length,
  };
}
A.hvGen = d => {
  const x = byId('rooms', d.r);
  const ex = S.harvests.find(v => v.tpl === 2 && v.scope === x.id && v.subject === myId());
  if (ex) return go('harvest', { id: ex.id });
  const st = roomFlowState(x);
  if (!st.allDone) return deny('every required deliverable must be done before the Learning Harvest');
  if (!st.ev.length) return deny('upload evidence that supports the completed work before the Learning Harvest');
  const c = hvCompile(x, myId());
  const v = {
    id: uid('hv'),
    tpl: 2,
    scope: x.id,
    subject: myId(),
    personal: null,
    scopeName: x.name + ' — ' + me().name,
    trigger: 'Deliverables completed',
    state: 'Draft',
    ai: false,
    ver: 1,
    by: myId(),
    at: today(),
    sections: c.sections,
    detected: c.detected,
    links: c.links,
    contrib: [],
    release: 'Not released',
    versions: [],
  };
  S.harvests.push(v);
  x.members
    .filter(m => m.status === 'Active' && m.pid !== myId())
    .forEach(m => notify(m.pid, 'Contribute to a Learning Harvest: ' + v.scopeName, 'harvest', { id: v.id }));
  audit('Learning Harvest generated', v.id, x.name + ' · ' + c.links.length + ' linked records');
  save();
  go('harvest', { id: v.id });
  toast('Harvest drafted from your records. Write the learning, confirm the negative findings and record the four decisions.');
};
function hv2View(x, mem, comp, edit) {
  const f = 'hv2';
  const s = x.sections;
  const subj = x.subject === myId();
  const o = byId('rooms', x.scope);
  const sec = (k, title, help, body) =>
    `<section class="hv2-sec" id="hv2-${k}"><header class="hv2-sh"><h2 class="h3">${title}</h2>${help ? `<p class="cap">${help}</p>` : ''}</header>${body}</section>`;
  const ta = (k, label, o2 = {}) =>
    edit
      ? fi(f, k, label, { type: 'textarea', rows: o2.rows || 3, value: s[k], req: o2.req, help: o2.help, ph: o2.ph })
      : `<div class="hv2-ro">${label ? `<span class="lbl">${label}</span>` : ''}<p style="white-space:pre-line">${h(s[k] || '—')}</p></div>`;
  const chip = l => L(ic(LINK_IC[l.type] || 'link', 13) + `<span>${h(l.label)}</span>`, l.r, l.p, 'hv2-chip');
  const links = (x.links || []).filter(l => l.type !== 'Baseline' || subj);
  const refs = types => {
    const ls = links.filter(l => types.includes(l.type));
    return ls.length ? `<div class="hv2-refs"><span class="cap">Source records</span>${ls.map(chip).join('')}</div>` : '';
  };
  const groups = [...new Set(links.map(l => l.type))];
  const pend = S.evolution.filter(e => e.hv === x.id && e.status === 'Pending');
  const mineEvo = S.evolution.filter(e => e.hv === x.id && e.pid === myId());
  const allEvo = S.evolution.filter(e => e.hv === x.id);
  const cp = S.compass[x.subject] || {};
  const main = `<form data-f="hv2" class="card c8 col hv2" style="gap:22px" novalidate>${errSum(f)}<input type="hidden" name="id" value="${x.id}">
  ${sec('what', HV2[0][1], HV2[0][2], ta('what', '', { rows: 8, req: true, help: edit ? 'Compiled from the completed deliverables, evidence, milestones, wins and records. Edit freely.' : '' }) + refs(['Deliverable', 'Evidence', 'Milestone', 'Record']))}
  ${sec('learning', HV2[1][1], HV2[1][2], ta('learning', 'What was learned', { rows: 3, req: true }) + `<div class="g2 hv2-learn">${HV2_LEARN.map(([k, l]) => ta(k, l, { rows: 2, help: edit && ['skillsDem', 'skillsDev', 'interests'].includes(k) ? 'Comma-separated. Used to suggest profile changes, which the person reviews.' : '' })).join('')}</div>`)}
  ${sec('negative', HV2[2][1] + ' <span class="req">*</span>', HV2[2][2], ta('negative', '', { rows: 6, req: true, help: edit ? (x.detected ? `Pre-filled with ${x.detected} item${x.detected > 1 ? 's' : ''} found in the records (open risks, blocked dependencies, late or declined deliverables, reworked contributions, evidence not approved). Confirm, edit and add what did not work.` : 'Nothing was flagged in the records. Record what did not work as expected, or explain why there was nothing.') : '' }))}
  ${sec('resources', HV2[3][1], HV2[3][2], ta('resources', '', { rows: 5, req: true, help: edit ? 'Add how each resource contributed, or remove ones that did not.' : '' }) + refs(['Resource']))}
  ${sec('partners', HV2[4][1], HV2[4][2], ta('partners', '', { rows: 5, req: true, help: edit ? 'Add how each contribution affected the outcome.' : '' }) + refs(['Partner', 'Contribution']))}
  ${sec('decisions', 'F. Continue / Change / Stop / Test', 'The Harvest concludes with four decisions. All four are required.', `<div class="hv2-dec">${HV2_DEC.map(([k, l, q]) => `<div class="hv2-d hv2-d-${k}${fe(f, k) ? ' err' : ''}"><label class="hv2-dl" for="hv2_${k}"><b>${l}</b><span class="cap">${q}</span></label>${edit ? `<textarea id="hv2_${k}" name="${k}" class="input${fe(f, k) ? ' err' : ''}" rows="4" aria-invalid="${!!fe(f, k)}">${h(fv(f, k, s[k] || ''))}</textarea>${fe(f, k) ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, k)}</span>` : ''}` : `<p style="white-space:pre-line">${h(s[k] || '—')}</p>`}</div>`).join('')}</div>`)}
  ${sec('links', 'G. Links to records', 'Every source record this Harvest draws on. Each link opens the underlying record, which keeps its own permissions.', groups.length ? `<div class="hv2-links">${groups.map(g => `<div class="hv2-lg"><span class="lbl">${g === 'Baseline' ? 'Purpose Compass Baseline (only you)' : g + 's'}</span><div class="hv2-refs">${links.filter(l => l.type === g).map(chip).join('')}</div></div>`).join('')}</div>` : '<p class="cap">No linked records.</p>')}
  ${edit ? `<div class="actions"><span class="cap">Every save keeps the previous version.</span><div class="row wrap"><button class="btn btn-s" type="submit" name="act" value="save">Save edits</button>${x.state === 'Draft' ? '<button class="btn btn-s" type="submit" name="act" value="review">Send for review</button>' : ''}${comp && !subj ? '<button class="btn btn-s" type="submit" name="act" value="reject">Reject</button><button class="btn btn-p" type="submit" name="act" value="approve">Approve</button>' : ''}</div></div>` : ''}</form>`;
  const side = `<aside class="c4 col" style="gap:12px">${card(
    'Status',
    '',
    dl([
      ['State', pill(x.state)],
      ['For', nm(x.subject)],
      [WL(), o ? L(h(o.name), 'room', { id: o.id }) : '—'],
      ['Version', 'v' + x.ver],
      x.approvedBy && ['Approved by', nm(x.approvedBy)],
    ]) + (x.state === 'Draft' ? `<p class="cap" style="margin-top:10px">Not complete until it is sent for review and approved by a Faculty/Steward, Reviewer or Project Lead.</p>` : x.state === 'Review' ? '<p class="cap" style="margin-top:10px">Waiting for review and approval.</p>' : ''),
  )}
 ${subj ? card('Your baseline', 'Context from your Purpose Compass. Only you see this panel; nothing here is copied into the Harvest unless you write it in.', dl([['Purpose', h(cp.PC1 || '—')], ['Outcome', h(cp.PC2 || '—')], ['Success looks like', h(cp.PC6 || '—')], ['You bring', h(cp.PC7 || '—')], ['Blockers you expected', h(cp.PC3 || '—')], ['How you learn', h(cp.learnHow || '—')], ['First milestone', h(cp.PC5 || '—')]]) + '<p class="cap" style="margin-top:10px">Did an expected blocker happen? Add it to Negative findings if you want to share it.</p>', L('Open baseline', 'profile', { tab: 'compass' })) : ''}
 ${card('Profile evolution', 'Suggested from the approved Harvest. Never applied automatically.', !hvDone(x) ? '<p class="cap">Identified when the Harvest is approved. The person reviews each suggestion and approves or rejects it.</p>' : subj ? (mineEvo.length ? `<p>${pend.length ? `<b>${pend.length}</b> waiting for your review` : 'All reviewed'} · ${mineEvo.filter(e => e.status === 'Approved').length} approved · ${mineEvo.filter(e => e.status === 'Rejected').length} rejected</p>` : '<p class="cap">No profile changes were identified.</p>') : `<p class="cap">${allEvo.length} suggestion${allEvo.length === 1 ? '' : 's'} offered to ${nm(x.subject)} · ${pend.length} awaiting their decision. Only they can approve.</p>`, subj && mineEvo.length ? L(pend.length ? 'Review profile changes' : 'See decisions', 'profile', { tab: 'evo' }, 'btn btn-p btn-sm') : '')}
 ${card('Contributions', 'Reflections, lessons, dissent and questions.', x.contrib.map(c => lrow('message', h(c.t), nm(c.by))).join('') || '<p class="cap">None yet.</p>', mem && ['Draft', 'Review'].includes(x.state) ? B(ic('plus', 14) + 'Contribute', 'hvContrib', { id: x.id }) : '')}
 ${card('Release', 'Separate approval for public or funder release.', `<p>${h(x.release)}</p>${x.state === 'Approved' && comp && x.release === 'Not released' ? B('Request funder release', 'hvRel', { id: x.id, v: 'Funder release requested' }) : ''}${role() === 'A' && x.release === 'Funder release requested' ? B('Approve release', 'hvRel', { id: x.id, v: 'Released' }, 'btn-p btn-sm') : ''}`)}
 ${x.state === 'Rejected' && (x.by === myId() || comp) ? card('Rejected', 'Revise and redraft. The rejected version is kept.', B(ic('refresh', 14) + 'Revise and redraft', 'hvRedraft', { id: x.id }, 'btn-p btn-sm')) : ''}
 ${x.versions.length ? card('Previous versions', '', x.versions.map(v => `<p class="cap">v${v.ver} · ${fmt(v.at)} · ${h(v.state)}</p>`).join('')) : ''}</aside>`;
  const evoMine = hvDone(x) && subj && pend.length ? `<div class="c12">${banner('warn', pend.length + ' suggested profile change' + (pend.length > 1 ? 's are' : ' is') + ' waiting for your review', 'Identified from this approved Harvest. Nothing has been applied: review each one and approve or reject it.<span class="row wrap" style="display:flex;gap:8px;margin-top:10px">' + L('Review profile changes', 'profile', { tab: 'evo' }, 'btn btn-p btn-sm') + '</span>')}</div>` : '';
  return (
    head(h(x.scopeName), 'Learning Harvest · ' + WL() + ' template · version ' + x.ver, pill(x.state), [['Learning Harvests', 'harvests'], ['Harvest']]) +
    (o ? `<nav class="hv2-flow" aria-label="Progress">${['Deliverables completed', 'Evidence submitted', 'Learning Harvest', 'Profile evolution'].map((t, i) => `<span class="${i < 2 || (i === 2 && hvDone(x)) || (i === 3 && hvDone(x) && !pend.length) ? 'done' : (i === 2 && !hvDone(x)) || (i === 3 && hvDone(x)) ? 'cur' : ''}">${i < 2 || (i === 2 && hvDone(x)) || (i === 3 && hvDone(x) && !pend.length) ? ic('check', 13) : i + 1} ${t}</span>`).join('')}</nav>` : '') +
    `<div class="g12">${evoMine}${main}${side}</div>`
  );
}
F.hv2 = d => {
  const x = byId('harvests', d.id);
  const act = d.act || 'save';
  const next = {};
  HV2_KEYS.forEach(k => (next[k] = String(d[k] ?? x.sections[k] ?? '').trim()));
  if (act === 'review' || act === 'approve') {
    const miss = HV2_REQ.filter(k => !next[k]);
    if (miss.length) {
      UI.form.hv2 = { ...d };
      UI.err.hv2 = Object.fromEntries(miss.map(k => [k, k === 'negative' ? 'Negative findings are required. Record what did not work, even if the overall outcome was a success.' : 'Complete this section.']));
      toast('Complete the required sections first: ' + miss.map(k => HV2_LABEL[k] || k).join(', '), 'err');
      return render();
    }
  }
  x.versions.push({ ver: x.ver, at: today(), state: x.state, sections: { ...x.sections } });
  x.ver++;
  x.sections = { ...x.sections, ...next };
  if (act === 'review') {
    x.state = 'Review';
    const o = byId('rooms', x.scope);
    [...new Set([...S.assign.filter(a => a.ctx === ctxId() && roleBase(a.role) === 'F').map(a => a.pid), ...(o ? o.members.filter(m => m.status === 'Active' && ['Project owner', 'Facilitator'].includes(spaceRole('rooms', o, m.pid))).map(m => m.pid) : [])])]
      .filter(p => p !== myId())
      .forEach(p => notify(p, 'Learning Harvest ready for review: ' + x.scopeName, 'harvest', { id: x.id }));
  }
  let found = [];
  if (act === 'approve') {
    x.state = 'Approved';
    x.approvedBy = myId();
    found = evoGenerate(x);
  }
  if (act === 'reject') x.state = 'Rejected';
  audit('Harvest ' + act, x.id, 'v' + x.ver);
  clearF('hv2');
  toast(
    act === 'approve'
      ? 'Harvest approved. ' + (found.length ? found.length + ' suggested profile change' + (found.length > 1 ? 's were' : ' was') + ' sent to ' + P(x.subject).name + ' for review — nothing was applied.' : 'No profile changes were identified.')
      : act === 'review'
        ? 'Sent for review.'
        : act === 'reject'
          ? 'Harvest rejected. The version is kept.'
          : 'Saved. The previous version is kept.',
  );
  ok();
};
