// ---------- PROJECT STAGE JOURNEY: Circle → Rope Team → Action Room (Section 5.3, Figure 4, F05, F07) ----------
// Spaces are linked, never converted. Forward movement has a gate; backward movement returns an issue
// to an earlier space and the work moves forward again once it is resolved.
const projOf = (kind, o) =>
  !o
    ? null
    : kind === 'projects'
      ? o
      : kind === 'rooms'
        ? S.projects.find(p => p.room === o.id) || null
        : byId('projects', o.project) || null;
const skipsRope = p => p && p.supportPath === 'Circle → Room';
const circleAgreed = c => !!c && (c.decisions || []).length > 0;
const openReturns = p => (S.returnLog || []).filter(r => r.project === p.id && r.status === 'Open');
function stageSteps(p) {
  const c = byId('circles', p.circle),
    rt = byId('ropes', p.rope),
    rm = byId('rooms', p.room);
  const idx = { Circle: 0, 'Rope Team': 1, Room: 2, 'Final review': 3, Closed: 4 }[p.stage] ?? -1;
  const steps = [
    { key: 'circle', kind: 'circles', label: 'Circle', o: c, i: 0, icon: 'users', tile: 't-purple', what: 'Discuss, decide, weighted vote' },
    !skipsRope(p) && { key: 'rope', kind: 'ropes', label: 'Rope Team', o: rt, i: 1, icon: 'route', tile: 't-teal', what: 'Mentor guidance, reviews, finalise requirements' },
    { key: 'room', kind: 'rooms', label: WL(), o: rm, i: 2, icon: 'room', tile: 't-navy', what: 'Tasks, milestones, evidence, final submission' },
  ].filter(Boolean);
  return steps.map(s => ({ ...s, st: !s.o && idx > s.i ? 'skip' : idx > s.i ? 'done' : idx === s.i ? 'cur' : 'todo' }));
}
const canOpenSpace = (kind, o) =>
  !!o &&
  (memberOf(o) ||
    ['A', 'O'].includes(role()) ||
    (kind === 'circles' && role() === 'F' && o.facilitator === myId()) ||
    (kind === 'circles' && o.visibility === 'Programme'));
function stageTrack(p, hereKind) {
  if (!p || !p.circle) return '';
  const steps = stageSteps(p);
  const rets = openReturns(p);
  const closed = p.stage === 'Closed';
  return `<section class="journey" aria-label="Project stages"><div class="jhead"><span class="jtitle">${ic('steps', 15)}Project journey</span><span class="cap jsum">${L(h(p.title), 'project', { id: p.id }, 'lnk')} · ${closed ? 'approved and closed' : p.stage === 'Final review' ? 'final review with the Faculty/Steward' : 'stage ' + h(stageLabel(p.stage))}</span></div><ol class="jsteps">${steps
    .map((s, n) => {
      const here = s.kind === hereKind;
      const route_ = { circles: 'circle', ropes: 'rope', rooms: 'room' }[s.kind];
      const name = s.o ? h(s.o.name) : s.st === 'skip' ? 'Skipped' : 'Not created yet';
      const link = s.o && canOpenSpace(s.kind, s.o) && !here ? L(name, route_, { id: s.o.id }, 'lnk') : name;
      const back = rets.filter(r => r.to.kind === s.kind).length;
      return `<li class="jstep is-${s.st}${here ? ' is-here' : ''}${back ? ' has-ret' : ''}"${here ? ' aria-current="step"' : ''}><span class="tile ${['todo', 'skip'].includes(s.st) ? 't-soft' : s.tile}">${s.st === 'done' ? ic('check', 16) : ic(s.icon, 16)}</span><div class="jbody"><span class="jlabel">${n + 1}. ${s.label}${here ? ' <span class="jhere">You are here</span>' : ''}</span><span class="jname">${link}</span><span class="cap jmeta">${s.o ? pill(s.o.state) : s.st === 'skip' ? '<span>Not used for this project</span>' + assumed('OI-12') : h(s.what)}${back ? ' ' + pill(back + ' returned issue' + (back > 1 ? 's' : ''), 'p-amber') : ''}</span></div></li>`;
    })
    .join('')}<li class="jstep jfinal is-${closed ? 'done' : p.stage === 'Final review' ? 'cur' : 'todo'}"><span class="tile ${closed ? 't-teal' : p.stage === 'Final review' ? 't-navy' : 't-soft'}">${ic(closed ? 'check' : 'award', 16)}</span><div class="jbody"><span class="jlabel">Final review</span><span class="jname">${closed ? 'Approved' : p.stage === 'Final review' ? 'In review' : 'After execution'}</span><span class="cap jmeta">Faculty/Steward</span></div></li></ol>${rets.length ? `<div class="jret" role="note">${ic('refresh', 16)}<div><b>${rets.length} issue${rets.length > 1 ? 's' : ''} returned to an earlier stage.</b> <span class="cap">${rets.map(r => h(r.toName) + ': ' + h(r.why.slice(0, 70))).join(' · ')}</span></div></div>` : ''}</section>`;
}
// ---- what moves the project forward from here, and who can do it
function stageGate(p, kind, o) {
  if (!p) return '';
  const r = role();
  const fac = (r === 'F' && p.stewards.includes(myId())) || r === 'A';
  const items = [];
  if (kind === 'circles') {
    const agreed = circleAgreed(o);
    items.push([agreed, 'The matter is discussed and agreed — at least one decision is recorded (weighted vote ≥ ' + S.settings.voting.threshold + '% or facilitator record).']);
    if (!skipsRope(p)) {
      items.push([!!p.rope, 'A Rope Team is formed: a mentor accepts a Mentor Request.']);
      const steward = r === 'F' && p.stewards.includes(myId());
      const act = !p.rope && (steward || p.owner === myId()) && o.state === 'Active'
        ? B(ic('route', 14) + 'Raise Mentor Request', 'mentorRequest', { project: p.id }, 'btn-p btn-sm') + (steward ? B(ic('link', 14) + 'Find a collaborator', 'collabFind', { project: p.id }) : '')
        : '';
      return gateCard('Forward: Circle → Rope Team', items, act, p, kind, o);
    }
    items.push([!!p.room, 'The ' + WL() + ' is created or linked.']);
    const act = !p.room && (fac || ownRoomProjects().includes(p)) && o.state === 'Active'
      ? agreed
        ? B(ic('room', 14) + 'Create or link ' + WL(), 'newRoom', { origin: 'Circle decision', oid: o.id, project: p.id }, 'btn-p btn-sm')
        : `<button class="btn btn-p btn-sm" type="button" disabled>${ic('room', 14)}Create ${WL()}</button><span class="cap">Record an approved decision first.</span>`
      : '';
    return gateCard('Forward: Circle → ' + WL() + ' (Rope Team skipped — ' + assumed('OI-12') + ')', items, act, p, kind, o);
  }
  if (kind === 'ropes') {
    items.push([(o.reviews || []).some(v => v.status === 'Looks good'), 'Mentor has reviewed the team’s work.']);
    items.push([!!o.reqFinal, 'Guidance is complete and requirements are finalised (mentor).']);
    items.push([!!p.room, 'The ' + WL() + ' is created or linked (project owner or Faculty/Steward).']);
    let act = '';
    const ownerCan = p.owner === myId() && !p.room && o.state === 'Active' && ownRoomProjects().includes(p);
    if (o.state === 'Active' && o.mentor === myId() && !o.reqFinal) act = B(ic('check', 14) + 'Mark requirements finalised', 'reqFinal', { id: o.id }, 'btn-p btn-sm');
    if (!p.room && ((o.reqFinal && fac) || ownerCan)) act = B(ic('room', 14) + 'Create ' + WL(), 'newRoom', { origin: 'Rope Team recommendation', oid: o.id, project: p.id }, 'btn-p btn-sm') + (ownerCan && !o.reqFinal ? '<span class="cap">Requirements are not finalised yet; you can still start.</span>' : '');
    if (!o.reqFinal && fac && !act) act = '<span class="cap">Waiting for the mentor to finalise requirements.</span>';
    return gateCard('Forward: Rope Team → ' + WL(), items, act, p, kind, o);
  }
  if (kind === 'rooms') {
    const ms = o.milestones || [];
    const done = ms.filter(m => m.status === 'Achieved').length;
    items.push([o.state === 'Active', 'The ' + WL() + ' is active.']);
    items.push([ms.length > 0 && done === ms.length, `Milestones achieved with validated evidence (${done} of ${ms.length}).`]);
    items.push([p.stage === 'Final review' || p.stage === 'Closed', 'Final deliverables submitted to the Faculty/Steward.']);
    const act = p.owner === myId() && p.stage === 'Room' && o.state === 'Active' ? B('Submit final deliverables', 'submitFinal', { id: p.id }, 'btn-p btn-sm') : p.stage === 'Final review' ? '<span class="cap">With the Faculty/Steward for final review.</span>' : '';
    return gateCard('Forward: ' + WL() + ' → final review', items, act, p, kind, o);
  }
  return '';
}
function gateCard(title, items, act, p, kind, o) {
  return card(
    title,
    'Forward movement needs these conditions. Backward movement is always possible when something needs guidance or a new decision.',
    `<ul class="gate">${items.map(([ok_, t]) => `<li class="${ok_ ? 'ok' : ''}"><span class="gate-ic">${ic(ok_ ? 'check' : 'clock', 14)}</span><span>${t}</span></li>`).join('')}</ul>${act ? `<div class="row wrap gate-act">${act}</div>` : ''}${backActions(p, kind, o)}`,
    '',
    'gate-card',
  );
}
function backActions(p, kind, o) {
  if (!o || o.state !== 'Active' || !memberOf(o)) return '';
  const btns = [];
  if (kind === 'rooms') {
    if (p.rope && !skipsRope(p)) btns.push(B(ic('refresh', 14) + 'Return issue to Rope Team', 'returnTo', { from: 'rooms', id: o.id, to: 'rope' }));
    btns.push(B(ic('refresh', 14) + 'Return issue to Circle', 'returnTo', { from: 'rooms', id: o.id, to: 'circle' }));
  }
  if (kind === 'ropes') btns.push(B(ic('refresh', 14) + 'Return matter to Circle', 'returnTo', { from: 'ropes', id: o.id, to: 'circle' }));
  return btns.length ? `<div class="jback"><span class="jback-k">${ic('refresh', 14)}<span>Backward movement</span></span><div class="row wrap">${btns.join('')}</div></div>` : '';
}
// ---- reports along the accountability chain (Section 5.3)
const REPORT_KIND = { circles: 'Circle progress report', ropes: 'Rope Team guidance report' };
function reportsCard(p, kind, o) {
  if (!p) return '';
  const inbound = (S.stageReports || []).filter(r => r.to === o.id);
  const outbound = (S.stageReports || []).filter(r => r.from === o.id);
  const target = kind === 'circles' ? (!skipsRope(p) ? byId('ropes', p.rope) : byId('rooms', p.room)) : kind === 'ropes' ? byId('rooms', p.room) : null;
  const author = kind === 'circles' ? o.owner === myId() || (role() === 'F' && o.facilitator === myId()) : kind === 'ropes' ? o.owner === myId() || o.mentor === myId() : false;
  const can_ = target && author && o.state === 'Active';
  const rows = [...inbound.map(r => ['in', r]), ...outbound.map(r => ['out', r])].sort((a, b) => b[1].at.localeCompare(a[1].at));
  if (!rows.length && !can_ && kind === 'rooms') return '';
  return card(
    'Reports along the chain',
    kind === 'circles' ? 'The Circle Team Owner reports work and progress to the Rope Team Owner.' : kind === 'ropes' ? 'Receives the Circle’s progress report; reports guidance, reviews and work to the ' + WL() + ' Owner.' : 'Guidance, review and work reports from the Rope Team Owner.',
    rows.map(([dir, r]) => lrow(dir === 'in' ? 'inbox' : 'send', h(r.kind) + ' · ' + (dir === 'in' ? 'from ' + cName(r.from) : 'to ' + cName(r.to)), h(r.t) + `<span class="cap lrow-meta">${nm(r.by)} · ${fmt(r.at)}</span>`)).join('') || '<p class="cap">No reports yet.</p>',
    can_ ? B(ic('send', 14) + 'Send report to ' + h(target.name), 'stageReport', { kind, id: o.id }, 'btn-s btn-sm') : '',
  );
}
A.stageReport = d => {
  clearF('srep');
  const o = byId(d.kind, d.id);
  const p = projOf(d.kind, o);
  const target = d.kind === 'circles' ? (!skipsRope(p) ? byId('ropes', p.rope) : byId('rooms', p.room)) : byId('rooms', p.room);
  const hint = d.kind === 'circles' ? 'What the Circle discussed and decided, open questions and responsibilities, so the Rope Team can guide effectively.' : 'Guidance given, work reviewed, requirements finalised and anything the execution team must know.';
  modal(
    'Send ' + REPORT_KIND[d.kind].toLowerCase(),
    () => `<form data-f="srep" class="col" style="gap:14px" novalidate><input type="hidden" name="kind" value="${d.kind}"><input type="hidden" name="id" value="${o.id}"><input type="hidden" name="to" value="${target.id}">${dl([['From', h(o.name)], ['To', h(target.name)]])}${fi('srep', 't', 'Report', { type: 'textarea', rows: 5, req: true, help: hint })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send report</button></div></form>`,
  );
};
F.srep = d => {
  if (!validate('srep', d, { t: ['req', ['min', 20]] })) return render();
  const o = byId(d.kind, d.id);
  const p = projOf(d.kind, o);
  const tgtRope = byId('ropes', d.to);
  const tgt = tgtRope || byId('rooms', d.to);
  S.stageReports = S.stageReports || [];
  S.stageReports.push({ id: uid('sr'), project: p.id, kind: REPORT_KIND[d.kind], from: o.id, to: tgt.id, by: myId(), at: today(), t: d.t });
  p.history.push({ at: today(), t: REPORT_KIND[d.kind] + ' sent to ' + tgt.name });
  (tgt.members || []).filter(m => m.pid !== myId() && (!m.status || m.status === 'Active')).forEach(m => notify(m.pid, REPORT_KIND[d.kind] + ' received from ' + o.name, tgtRope ? 'rope' : 'room', { id: tgt.id }));
  sysMsg(tgt, REPORT_KIND[d.kind] + ' received from ' + o.name);
  audit('Stage report sent', o.id, '→ ' + tgt.name);
  UI.modal = null;
  clearF('srep');
  toast('Report sent to ' + tgt.name + '.');
  ok();
};
// ---- backward movement: return an issue, resolve it, move forward again
A.returnTo = d => {
  clearF('ret');
  const src = byId(d.from, d.id);
  const p = projOf(d.from, src);
  const target = d.to === 'circle' ? byId('circles', (p && p.circle) || src.circle) : byId('ropes', p && p.rope);
  modal(
    'Return ' + (d.to === 'circle' ? 'to the Circle' : 'to the Rope Team'),
    () => `<form data-f="ret" class="col" style="gap:14px" novalidate><input type="hidden" name="from" value="${d.from}"><input type="hidden" name="id" value="${d.id}"><input type="hidden" name="to" value="${d.to}">${target ? dl([['From', h(src.name)], ['To', h(target.name)]]) : banner('warn', 'Nothing to return to', 'There is no linked ' + (d.to === 'circle' ? 'Circle' : 'Rope Team') + ' for this space.')}${fi('ret', 'why', d.to === 'circle' ? 'What needs a new decision from the Circle?' : 'What needs guidance or correction from the Rope Team?', { type: 'textarea', rows: 3, req: true })}${banner('info', '', 'The issue appears in the ' + (d.to === 'circle' ? 'Circle as an open concern for the facilitator' : 'Rope Team as a support request owned by the mentor') + '. When it is resolved, everyone here is notified and the work moves forward again.')}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${target ? '' : 'disabled'}>Return issue</button></div></form>`,
  );
};
F.ret = d => {
  if (!validate('ret', d, { why: ['req', ['min', 10]] })) return render();
  const src = byId(d.from, d.id);
  const p = projOf(d.from, src);
  const target = d.to === 'circle' ? byId('circles', (p && p.circle) || src.circle) : byId('ropes', p && p.rope);
  if (!target) {
    toast('No linked ' + (d.to === 'circle' ? 'Circle' : 'Rope Team') + ' to return to.', 'err');
    return render();
  }
  S.returnLog = S.returnLog || [];
  const ret = { id: uid('ret'), project: p ? p.id : null, from: { kind: d.from, id: src.id }, to: { kind: target.mentor ? 'ropes' : 'circles', id: target.id }, toName: target.name, fromName: src.name, why: d.why, by: myId(), at: today(), status: 'Open' };
  S.returnLog.push(ret);
  if (target.mentor) {
    target.support.push({ id: uid('su'), by: myId(), t: 'Returned from ' + src.name + ': ' + d.why, owner: target.mentor, status: 'Assigned', ret: ret.id });
    notify(target.mentor, 'Issue returned to ' + target.name + ' from ' + src.name, 'rope', { id: target.id, tab: 'support' });
  } else {
    target.concerns.push({ id: uid('x'), by: myId(), t: 'Returned from ' + src.name + ': ' + d.why, at: today(), status: 'Open', ret: ret.id });
    notify(target.facilitator, 'Matter returned to ' + target.name + ' from ' + src.name, 'circle', { id: target.id, tab: 'records' });
  }
  sysMsg(target, 'Issue returned from ' + src.name + ': ' + d.why.slice(0, 80));
  if (src.returns) src.returns.push({ to: target.name, why: d.why, at: today(), ret: ret.id });
  if (p) p.history.push({ at: today(), t: 'Issue returned from ' + src.name + ' to ' + target.name });
  audit('Matter returned', src.id, '→ ' + target.name);
  UI.modal = null;
  clearF('ret');
  toast('Returned to ' + target.name + '. Work moves forward again once it is resolved.');
  ok();
};
function resolveReturn(retId, note) {
  const r = (S.returnLog || []).find(x => x.id === retId);
  if (!r || r.status !== 'Open') return;
  r.status = 'Resolved';
  r.resolvedAt = today();
  r.note = note || '';
  const src = byId(r.from.kind, r.from.id);
  if (src) {
    sysMsg(src, 'Returned issue resolved in ' + r.toName + (note ? ': ' + note : ''));
    (src.members || []).filter(m => !m.status || m.status === 'Active').forEach(m => notify(m.pid, 'Returned issue resolved in ' + r.toName + ' — work can move forward again', r.from.kind === 'rooms' ? 'room' : 'rope', { id: src.id }));
    (src.returns || []).filter(x => x.ret === r.id).forEach(x => (x.status = 'Resolved'));
  }
  const p = byId('projects', r.project);
  if (p) p.history.push({ at: today(), t: 'Returned issue resolved in ' + r.toName });
  audit('Returned issue resolved', r.id, r.toName);
}
function returnsCard(o) {
  const mine = (S.returnLog || []).filter(r => r.from.id === o.id || r.to.id === o.id);
  if (!mine.length) return '';
  return card(
    'Returned issues',
    'Backward movement between stages and its resolution.',
    mine
      .slice()
      .reverse()
      .map(r => lrow('refresh', (r.from.id === o.id ? '→ ' + h(r.toName) : '← from ' + h(r.fromName)), h(r.why) + `<span class="cap lrow-meta">${nm(r.by)} · ${fmt(r.at)}${r.status === 'Resolved' ? ' · resolved ' + fmt(r.resolvedAt) + (r.note ? ': ' + h(r.note) : '') : ''}</span>`, pill(r.status === 'Open' ? 'Open' : 'Resolved')))
      .join(''),
  );
}
// ---- maintenance run before every signed-in render
function tick() {
  if (typeof expireCards === 'function') expireCards();
  const t = today();
  S.assign.forEach(a => {
    if (a.status === 'Active' && a.until && a.until < t) {
      a.status = 'Expired';
      notify(a.pid, 'Your ' + ROLE[a.role] + ' assignment expired on ' + fmt(a.until), 'home');
      audit('Role assignment expired', a.id, ROLE[a.role] + ' · until ' + a.until);
    }
  });
  S.circles.forEach(c =>
    (c.polls || []).forEach(p => {
      if (p.status === 'Open' && (p.closes.length > 10 ? p.closes : p.closes + 'T23:59') < now().slice(0, 16)) closePollCore({ c: c.id, p: p.id }, 'due', true);
    }),
  );
}
