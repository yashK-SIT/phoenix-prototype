// ---------- LINKED SPACES: Circle, Rope Team and Action Workspace (F05, F07; Build-Freeze BF-07) ----------
// Spaces are linked, never converted, and can be entered in any valid order. An issue can be sent to any linked
// space that can help; the work continues once it is resolved.
const projOf = (kind, o) =>
  !o
    ? null
    : kind === 'projects'
      ? o
      : kind === 'rooms'
        ? S.projects.find(p => p.room === o.id) || null
        : byId('projects', o.project) || null;
// No mandatory sequence: a Rope Team can always be linked (kept as a function for existing callers).
const skipsRope = () => false;
const circleAgreed = c => !!c && (c.decisions || []).length > 0;
const openReturns = p => (S.returnLog || []).filter(r => r.project === p.id && r.status === 'Open');
function stageSteps(p) {
  // BF-07: drive status from which spaces are actually linked — never imply Circle → Rope → Room is required.
  const c = byId('circles', p.circle),
    rt = byId('ropes', p.rope),
    rm = byId('rooms', p.room);
  const closing = ['Final review', 'Closed'].includes(p.stage);
  const steps = [
    { key: 'circle', kind: 'circles', label: 'Circle', o: c, icon: 'users', tile: 't-purple', what: 'Shared learning, sensemaking, equal-vote decisions' },
    !skipsRope(p) && { key: 'rope', kind: 'ropes', label: 'Rope Team', o: rt, icon: 'route', tile: 't-teal', what: 'Mentor support and accountability' },
    { key: 'room', kind: 'rooms', label: WL(), o: rm, icon: 'room', tile: 't-navy', what: 'Tasks, milestones, risks, resources and evidence' },
  ].filter(Boolean);
  return steps.map(s => ({
    ...s,
    st: s.o ? (closing ? 'done' : 'cur') : 'todo',
  }));
}
// Opening a linked space needs independent access to it. A Rope Team opens only for its own members — a link,
// a platform role or programme administration never opens its protected content (ROPE_TEAM_ONLY).
const canOpenSpace = (kind, o) =>
  !!o &&
  (memberOf(o) ||
    (kind !== 'ropes' && ['A', 'O'].includes(role())) ||
    (kind === 'circles' && role() === 'F' && o.facilitator === myId()) ||
    (kind === 'circles' && o.visibility === 'Programme'));
// BF-07: Circle = shared learning and sensemaking; Rope Team = protected support and accountability; Action
// Workspace = execution. They are separate, linked objects that can be entered or linked in any valid order —
// no mandatory sequence, and no space is ever converted into another.
function stageTrack(p, hereKind) {
  if (!p) return '';
  const steps = stageSteps(p);
  const rets = openReturns(p);
  const closed = p.stage === 'Closed';
  return `<section class="journey" aria-label="Linked spaces"><div class="jhead"><span class="jtitle">${ic('link', 15)}Linked spaces</span><span class="cap jsum">${L(h(p.title), 'project', { id: p.id }, 'lnk')} · separate spaces, linked in any order · never converted</span></div><ol class="jsteps jsteps-free">${steps
    .map(s => {
      const here = s.kind === hereKind;
      const route_ = { circles: 'circle', ropes: 'rope', rooms: 'room' }[s.kind];
      const name = s.o ? h(s.o.name) : 'Not linked';
      const link = s.o && canOpenSpace(s.kind, s.o) && !here ? L(name, route_, { id: s.o.id }, 'lnk') : name;
      const back = rets.filter(r => r.to.kind === s.kind).length;
      return `<li class="jstep is-${s.o ? 'done' : 'todo'}${here ? ' is-here' : ''}${back ? ' has-ret' : ''}"${here ? ' aria-current="step"' : ''}><span class="tile ${s.o ? s.tile : 't-soft'}">${ic(s.icon, 16)}</span><div class="jbody"><span class="jlabel">${s.label}${here ? ' <span class="jhere">You are here</span>' : ''}</span><span class="jname">${link}</span><span class="cap jmeta">${s.o ? pill(s.o.state) : h(s.what)}${back ? ' ' + pill(back + ' issue' + (back > 1 ? 's' : '') + ' sent here', 'p-amber') : ''}</span></div></li>`;
    })
    .join('')}<li class="jstep jfinal is-${closed ? 'done' : p.stage === 'Final review' ? 'cur' : 'todo'}"><span class="tile ${closed ? 't-teal' : p.stage === 'Final review' ? 't-navy' : 't-soft'}">${ic(closed ? 'check' : 'award', 16)}</span><div class="jbody"><span class="jlabel">Project close</span><span class="jname">${closed ? 'Approved and closed' : p.stage === 'Final review' ? 'Final review' : 'When the work is done'}</span><span class="cap jmeta">Faculty/Steward · Learning Harvest</span></div></li></ol>${rets.length ? `<div class="jret" role="note">${ic('refresh', 16)}<div><b>${rets.length} issue${rets.length > 1 ? 's' : ''} sent to a linked space.</b> <span class="cap">${rets.map(r => h(r.toName) + ': ' + h(r.why.slice(0, 70))).join(' · ')}</span></div></div>` : ''}</section>`;
}
// ---- what is left to do in this space (linking itself lives in the Linked objects panel, links.js)
function stageGate(p, kind, o) {
  if (!o) return '';
  const r = role();
  const steward = !!p && r === 'F' && p.stewards.includes(myId());
  const owner = !!p && p.owner === myId();
  const active = o.state === 'Active';
  const items = [];
  const acts = [];
  if (active && kind === 'ropes' && o.mentor === myId() && !o.reqFinal) acts.push(B(ic('check', 14) + 'Record support recommendation', 'reqFinal', { id: o.id }, 'btn-s btn-sm'));
  if (active && steward && kind === 'circles') acts.push(B(ic('link', 14) + 'Find a collaborator', 'collabFind', { project: p.id }));
  if (active && p && !p.rope && kind !== 'ropes' && (steward || owner)) acts.push(B(ic('route', 14) + 'Ask for a mentor', 'mentorRequest', { project: p.id }, 'btn-s btn-sm'));
  if (kind === 'rooms' && p && p.room === o.id) {
    const ms = o.milestones || [];
    const done = ms.filter(m => m.status === 'Achieved').length;
    items.push([ms.length > 0 && done === ms.length, `Milestones achieved with validated evidence (${done} of ${ms.length}).`]);
    if (owner && p.stage === 'Room' && active) acts.push(B('Submit final deliverables', 'submitFinal', { id: p.id }, 'btn-p btn-sm'));
    if (p.stage === 'Final review') acts.push('<span class="cap">With the Faculty/Steward for final review.</span>');
  }
  if (!items.length && !acts.length) return '';
  return card(
    kind === 'rooms' && items.length ? 'Project deliverables' : 'Next steps',
    '',
    `${items.length ? `<ul class="gate">${items.map(([ok_, t]) => `<li class="${ok_ ? 'ok' : ''}"><span class="gate-ic">${ic(ok_ ? 'check' : 'clock', 14)}</span><span>${t}</span></li>`).join('')}</ul>` : ''}${acts.length ? `<div class="row wrap gate-act">${acts.join('')}</div>` : ''}`,
    '',
    'gate-card',
  );
}
// Send an issue to a linked Circle or Rope Team. Only the issue text crosses; the target keeps its own privacy.
function backActions(kind, o) {
  if (!o || o.state !== 'Active' || !memberOf(o)) return '';
  const tg = [...linkedObjs(o.id, 'circles'), ...linkedObjs(o.id, 'ropes')].filter(t => t.state === 'Active');
  const btns = tg.map(t => B(ic('refresh', 14) + 'Send an issue to ' + h(t.name), 'returnTo', { from: kind, id: o.id, to: t.id }));
  return btns.length ? `<div class="jback"><span class="jback-k">${ic('refresh', 14)}<span>Needs guidance or a new decision?</span></span><div class="row wrap">${btns.join('')}</div></div>` : '';
}
// ---- reports to linked spaces: an intentional release. Only what the author writes crosses the boundary.
const REPORT_KIND = { circles: 'Circle progress report', ropes: 'Rope Team guidance report', rooms: 'Execution update' };
const reportAuthor = (kind, o) => (kind === 'circles' ? o.owner === myId() || (role() === 'F' && o.facilitator === myId()) : kind === 'ropes' ? o.owner === myId() || o.mentor === myId() : sCan('rooms', o, 'lead'));
const reportTargets = o => SPACE_KINDS.flatMap(k => linkedObjs(o.id, k)).filter(t => t.state === 'Active');
function reportsCard(p, kind, o) {
  if (!o) return '';
  const inbound = (S.stageReports || []).filter(r => r.to === o.id);
  const outbound = (S.stageReports || []).filter(r => r.from === o.id);
  const can_ = reportTargets(o).length && reportAuthor(kind, o) && o.state === 'Active';
  const rows = [...inbound.map(r => ['in', r]), ...outbound.map(r => ['out', r])].sort((a, b) => b[1].at.localeCompare(a[1].at));
  if (!rows.length && !can_) return '';
  return card(
    'Reports to linked spaces',
    'A report is the only thing that crosses a link: the author writes it on purpose. Notes, chat and private records stay where they are.',
    rows.map(([dir, r]) => lrow(dir === 'in' ? 'inbox' : 'send', h(r.kind) + ' · ' + (dir === 'in' ? 'from ' + cName(r.from) : 'to ' + cName(r.to)), h(r.t) + `<span class="cap lrow-meta">${nm(r.by)} · ${fmt(r.at)}</span>`)).join('') || '<p class="cap">No reports yet.</p>',
    can_ ? B(ic('send', 14) + 'Send a report', 'stageReport', { kind, id: o.id }, 'btn-s btn-sm') : '',
  );
}
A.stageReport = d => {
  clearF('srep');
  const o = byId(d.kind, d.id);
  const tg = reportTargets(o);
  const hint = d.kind === 'ropes' ? 'Only what you write here is shared. Private mentor notes, support details and check-ins are ' + ROPE_ONLY + ' and are never attached.' : 'What was discussed or decided, open questions and responsibilities the linked space needs.';
  modal(
    'Send ' + REPORT_KIND[d.kind].toLowerCase(),
    () => `<form data-f="srep" class="col" style="gap:14px" novalidate><input type="hidden" name="kind" value="${d.kind}"><input type="hidden" name="id" value="${o.id}">${dl([['From', h(o.name)]])}${fi('srep', 'to', 'To linked space', { type: 'select', req: true, opts: tg.map(t => [t.id, OBJ_LABEL(objKind(t.id)) + ' · ' + t.name]) })}${fi('srep', 't', 'Report', { type: 'textarea', rows: 5, req: true, help: hint })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Send report</button></div></form>`,
  );
};
F.srep = d => {
  if (!validate('srep', d, { to: ['req'], t: ['req', ['min', 20]] })) return render();
  const o = byId(d.kind, d.id);
  const tgt = reportTargets(o).find(t => t.id === d.to);
  if (!tgt) return deny('you can report only to an active linked space');
  const tk = objKind(tgt.id);
  const p = projOf(d.kind, o);
  S.stageReports = S.stageReports || [];
  S.stageReports.push({ id: uid('sr'), project: p ? p.id : null, kind: REPORT_KIND[d.kind], from: o.id, to: tgt.id, by: myId(), at: today(), t: d.t });
  if (p) p.history.push({ at: today(), t: REPORT_KIND[d.kind] + ' sent to ' + tgt.name });
  (tgt.members || []).filter(m => m.pid !== myId() && (!m.status || m.status === 'Active')).forEach(m => notify(m.pid, REPORT_KIND[d.kind] + ' received from ' + o.name, OBJ_ROUTE[tk], { id: tgt.id }));
  sysMsg(tgt, REPORT_KIND[d.kind] + ' received from ' + o.name);
  audit('Report released to linked space', o.id, '→ ' + tgt.name);
  UI.modal = null;
  clearF('srep');
  toast('Report sent to ' + tgt.name + '.');
  ok();
};
// ---- send an issue to a linked Circle or Rope Team; the work continues once it is resolved
const retTarget = (src, id) => [...linkedObjs(src.id, 'circles'), ...linkedObjs(src.id, 'ropes')].find(t => t.id === id && t.state === 'Active') || null;
A.returnTo = d => {
  clearF('ret');
  const src = byId(d.from, d.id);
  const target = retTarget(src, d.to);
  const isRope = target && !!byId('ropes', target.id);
  modal(
    'Send an issue to ' + (target ? h(target.name) : 'a linked space'),
    () => `<form data-f="ret" class="col" style="gap:14px" novalidate><input type="hidden" name="from" value="${d.from}"><input type="hidden" name="id" value="${d.id}"><input type="hidden" name="to" value="${h(d.to)}">${target ? dl([['From', h(src.name)], ['To', h(target.name)]]) : banner('warn', 'Nothing to send to', 'That space is not linked to this one, or is no longer active.')}${fi('ret', 'why', isRope ? 'What needs guidance or support from the Rope Team?' : 'What needs a new decision from the Circle?', { type: 'textarea', rows: 3, req: true })}${banner('info', '', 'Only this text is sent. It appears ' + (isRope ? 'in the Rope Team as a support request owned by the mentor' : 'in the Circle as an open concern for the facilitator') + '. You do not gain access to that space; you are told when it is resolved.')}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${target ? '' : 'disabled'}>Send issue</button></div></form>`,
  );
};
F.ret = d => {
  if (!validate('ret', d, { why: ['req', ['min', 10]] })) return render();
  const src = byId(d.from, d.id);
  const p = projOf(d.from, src);
  const target = retTarget(src, d.to);
  if (!target) {
    toast('That space is not linked to this one.', 'err');
    return render();
  }
  const isRope = !!byId('ropes', target.id);
  S.returnLog = S.returnLog || [];
  const ret = { id: uid('ret'), project: p ? p.id : null, from: { kind: d.from, id: src.id }, to: { kind: isRope ? 'ropes' : 'circles', id: target.id }, toName: target.name, fromName: src.name, why: d.why, by: myId(), at: today(), status: 'Open' };
  S.returnLog.push(ret);
  if (isRope) {
    target.support.push({ id: uid('su'), by: myId(), t: 'Sent from ' + src.name + ': ' + d.why, owner: target.mentor, status: 'Assigned', ret: ret.id });
    notify(target.mentor, 'Issue sent to ' + target.name + ' from ' + src.name, 'rope', { id: target.id, tab: 'support' });
  } else {
    target.concerns.push({ id: uid('x'), by: myId(), t: 'Sent from ' + src.name + ': ' + d.why, at: today(), status: 'Open', ret: ret.id });
    notify(target.facilitator, 'Matter sent to ' + target.name + ' from ' + src.name, 'circle', { id: target.id, tab: 'records' });
  }
  sysMsg(target, 'Issue sent from ' + src.name + ': ' + d.why.slice(0, 80));
  if (src.returns) src.returns.push({ to: target.name, why: d.why, at: today(), ret: ret.id });
  if (p) p.history.push({ at: today(), t: 'Issue sent from ' + src.name + ' to ' + target.name });
  audit('Matter sent to linked space', src.id, '→ ' + target.name);
  UI.modal = null;
  clearF('ret');
  toast('Sent to ' + target.name + '. You will be told when it is resolved.');
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
      if (p.status === 'Open') pollTick(c, p); // closes at the closing time; sends the configured reminder (circles.js)
    }),
  );
}
