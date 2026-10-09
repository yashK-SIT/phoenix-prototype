// ---------- ACTION ROOM TASK BOARD (Kanban) and MY TASKS ----------
// Board columns follow the task lifecycle. Cards are dragged between columns (HTML5 drag and drop) or moved from the
// task detail, which is also the keyboard and touch route. Every move passes the guard layer (A.taskMove).
const TASK_COLS = ['To do', 'In progress', 'Review', 'Done'];
const TASK_PRIOS = ['Urgent', 'High', 'Medium', 'Low'];
const PRIO_IC = { Urgent: 'alert', High: 'arrow', Medium: 'more', Low: 'chev' };
UI.kb = UI.kb || {};
const roomKey = x =>
  (x.name.match(/[A-Za-z0-9]+/g) || ['AR'])
    .filter(w => !/^(the|and|of|for|a)$/i.test(w))
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase();
const taskKey = (x, k) => roomKey(x) + '-' + (k.key || '?');
function nextTaskKey(x) {
  x.tkSeq = Math.max(x.tkSeq || 0, ...x.tasks.map(k => k.key || 0)) + 1;
  return x.tkSeq;
}
const taskOverdue = k => k.status !== 'Done' && k.due && k.due < today();
const roomActive = x => x.members.filter(m => m.status === 'Active');
// ---- a task is an agreed deliverable: resources, partners, supporting evidence and completion
const roomEvidence = x => S.evidence.filter(e => e.linked.includes(x.id) && !['Withdrawn', 'Rejected'].includes(e.review));
const resLabel = (x, id) => {
  const r = (x.resources || []).find(r => r.id === id);
  return r ? r.t + (r.from ? ' — ' + r.from : '') : id;
};
function chkGroup(name, opts, sel) {
  if (!opts.length) return '<p class="cap">None yet.</p>';
  return `<div class="chkgrp">${opts.map(([v, l]) => `<label class="row"><input class="chk" type="checkbox" name="${name}" value="${h(v)}" ${sel.includes(v) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
}
function delivBlock(x, k, edit, lead) {
  const kev = (k.evidence || []).map(id => byId('evidence', id)).filter(Boolean);
  const people = roomActive(x)
    .filter(m => m.pid !== k.owner)
    .map(m => ({ pid: m.pid, sub: spaceRole('rooms', x, m.pid) || '' }));
  const none = '<span class="cap">None</span>';
  return `<section class="tk-deliv"><h3 class="h3">Deliverable</h3>
  ${edit && lead ? fi('tke', 'req', 'Required deliverable — must be done before evidence upload and the Learning Harvest', { type: 'checkbox', value: k.opt ? '' : 'yes' }) : `<div><span class="lbl">Requirement</span>${pill(k.opt ? 'Optional' : 'Required', k.opt ? 'p-grey' : 'p-navy')}</div>`}
  ${edit ? msel('tke', 'partners', 'Partners / contributors', people, k.partners || [], { none: 'No other active members.' }) : `<div><span class="lbl">Partners / contributors</span>${(k.partners || []).map(nm).join(', ') || none}</div>`}
  <div class="field"><span class="lbl">Supporting records and evidence</span>${edit ? chkGroup('evidence', roomEvidence(x).map(e => [e.id, h(e.title) + ` <span class="cap">· ${h(e.review)}</span>`]), k.evidence || []) : kev.map(e => L(h(e.title), 'evidence', { id: e.id })).join(', ') || '<span class="cap">None attached</span>'}${x.state === 'Active' && memberOf(x) ? `<div class="tk-up">${B(ic('upload', 14) + 'Upload evidence for this deliverable', 'go', { r: 'newevidence', link: x.id, task: k.id })}</div>` : ''}</div>
  ${k.status === 'Done' ? `<div class="field"><span class="lbl">Completion</span><div class="row wrap" style="gap:8px">${pill('Completed', 'p-green')}<span class="cap">${k.doneAt ? fmt(k.doneAt) : ''}</span></div>${edit ? fi('tke', 'doneNote', 'Completion note', { type: 'textarea', rows: 2, ph: 'What was delivered, and anything others should know' }) : k.doneNote ? `<p class="muted tk-note">${h(k.doneNote)}</p>` : ''}</div>` : ''}
  </section>`;
}
// Who may move a card, and where.
// Who may review finished work in this room: its Reviewer or Facilitator, or a Faculty/Steward (member or project steward).
function taskReviewer(x) {
  const pr = S.projects.find(p => p.room === x.id);
  return sCan('rooms', x, 'review') || (role() === 'F' && (memberOf(x) || (pr && pr.stewards.includes(myId()))));
}
// The assignee, project owner or facilitator moves work between To do, In progress and Review.
// Only a reviewer moves Review → Done (or sends it back), and only a reviewer reopens Done work.
const taskWorker = (x, k) => isLead(x) || role() === 'A' || (k.owner === myId() && k.status !== 'Proposed');
function taskTargets(x, k) {
  if (x.state !== 'Active' || k.status === 'Declined') return [];
  if (k.status === 'Proposed') return isLead(x) || role() === 'A' ? ['Proposed', 'To do', 'In progress'] : [];
  const t = new Set([k.status]);
  if (k.status !== 'Done' && taskWorker(x, k)) ['To do', 'In progress', 'Review'].forEach(v => t.add(v));
  if (taskReviewer(x) && ['Review', 'Done'].includes(k.status)) ['In progress', 'Review', 'Done'].forEach(v => t.add(v));
  return TASK_COLS.filter(c => t.has(c));
}
const taskCanMove = (x, k) => taskTargets(x, k).some(s => s !== k.status);
const kbState = x => (UI.kb[x.id] = UI.kb[x.id] || { view: 'board', who: '', prio: '', q: '', only: '' });
function kbFilter(x, list) {
  const f = kbState(x);
  return list.filter(
    k =>
      (!f.who || k.owner === f.who) &&
      (!f.prio || (k.prio || 'Medium') === f.prio) &&
      (f.only !== 'overdue' || taskOverdue(k)) &&
      (!f.q || (k.t + ' ' + (k.desc || '') + ' ' + taskKey(x, k) + ' ' + P(k.owner).name).toLowerCase().includes(f.q.toLowerCase())),
  );
}
const prioTag = p => `<span class="kb-prio pr-${(p || 'Medium').toLowerCase()}" title="Priority: ${h(p || 'Medium')}">${ic(PRIO_IC[p || 'Medium'], 13)}<span>${h(p || 'Medium')}</span></span>`;
const dueChip = k =>
  k.due ? `<span class="kb-due ${taskOverdue(k) ? 'late' : k.status === 'Done' ? 'done' : ''}" title="${taskOverdue(k) ? 'Overdue' : 'Due'} ${fmt(k.due)}">${ic('calendar', 12)}${new Date(k.due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>` : '';
function kbCard(x, k) {
  const drag = taskCanMove(x, k);
  return `<article class="kb-card pr-${(k.prio || 'Medium').toLowerCase()} ${k.status === 'Done' ? 'is-done' : ''}" data-a="taskView" data-r="${x.id}" data-id="${k.id}" data-s="${h((k.t + ' ' + (k.desc || '') + ' ' + taskKey(x, k) + ' ' + P(k.owner).name).toLowerCase())}" ${drag ? 'draggable="true"' : ''} tabindex="0" role="button" aria-label="${h(taskKey(x, k) + ': ' + k.t + ', ' + k.status + ', assigned to ' + P(k.owner).name)}">
  <div class="kb-top">${drag ? '<span class="kb-grip" aria-hidden="true" title="Drag to move, or open the card to change its status"></span>' : ''}<div class="kb-title">${h(k.t)}</div></div>${k.status === 'Proposed' && k.by ? `<div class="cap">Proposed by ${nm(k.by)}</div>` : ''}
  <div class="kb-meta">${prioTag(k.prio)}<span class="kb-key">${h(taskKey(x, k))}</span>${dueChip(k)}${(k.log || []).length > 1 ? `<span class="kb-c" title="${k.log.length} updates">${ic('message', 12)}${k.log.length}</span>` : ''}${(k.evidence || []).length ? `<span class="kb-c" title="${k.evidence.length} supporting evidence">${ic('award', 12)}${k.evidence.length}</span>` : ''}${k.opt ? '<span class="kb-c" title="Optional deliverable">Optional</span>' : ''}<span class="grow"></span><span class="av kb-av" title="Assignee: ${nm(k.owner)}">${ini(k.owner)}</span></div></article>`;
}
function taskBoard(x, lead, ro) {
  const f = kbState(x);
  const all = x.tasks.filter(k => k.status !== 'Declined');
  const vis = kbFilter(x, all);
  const showProp = all.some(k => k.status === 'Proposed');
  const cols = [...(showProp ? ['Proposed'] : []), ...TASK_COLS];
  const canAdd = !ro && (sCan('rooms', x, 'propose') || role() === 'A');
  const sorted = st =>
    vis.filter(k => k.status === st).sort((a, b) => (a.ord ?? 999) - (b.ord ?? 999) || (a.key || 0) - (b.key || 0));
  const avs = roomActive(x)
    .map(m => `<button type="button" class="kb-avf ${f.who === m.pid ? 'on' : ''}" data-a="kbSet" data-r="${x.id}" data-k="who" data-v="${f.who === m.pid ? '' : m.pid}" title="${f.who === m.pid ? 'Show everyone' : 'Only ' + nm(m.pid)}" aria-pressed="${f.who === m.pid}"><span class="av">${ini(m.pid)}</span></button>`)
    .join('');
  const chip = (k, v, l) => `<button type="button" class="fchip ${f[k] === v ? 'on' : ''}" data-a="kbSet" data-r="${x.id}" data-k="${k}" data-v="${f[k] === v ? '' : v}" aria-pressed="${f[k] === v}">${l}</button>`;
  const tools = `<div class="kb-tools"><label class="kb-search">${ic('search', 15)}<input class="input" type="search" placeholder="Search this board" value="${h(f.q)}" data-kbq="${x.id}" aria-label="Search tasks"></label><div class="kb-avs" role="group" aria-label="Filter by assignee">${avs}</div>${chip('who', myId(), 'Only my tasks')}${chip('only', 'overdue', 'Overdue')}<select class="input kb-sel" data-ch="kbPrio" data-r="${x.id}" aria-label="Priority filter"><option value="">Priority: all</option>${TASK_PRIOS.map(p => `<option ${f.prio === p ? 'selected' : ''}>${p}</option>`).join('')}</select><span class="grow"></span><div class="seg" role="group" aria-label="View">${['board', 'list'].map(v => `<button type="button" class="${f.view === v ? 'on' : ''}" data-a="kbSet" data-r="${x.id}" data-k="view" data-v="${v}" aria-pressed="${f.view === v}">${ic(v === 'board' ? 'grid' : 'file', 14)}${v === 'board' ? 'Board' : 'List'}</button>`).join('')}</div>${canAdd ? B(ic('plus', 14) + (lead || role() === 'A' ? 'Create task' : 'Propose task'), 'roomItem', { r: x.id, k: 'tasks' }, 'btn-p btn-sm') : ''}</div>`;
  const filtered = vis.length !== all.length;
  const body =
    f.view === 'list'
      ? table(
          ['Key', 'Task', 'Assignee', 'Priority', 'Due', 'Status', ''],
          vis
            .slice()
            .sort((a, b) => (a.due || '9').localeCompare(b.due || '9'))
            .map(k => [`<span class="kb-key">${h(taskKey(x, k))}</span>`, `<b>${h(k.t)}</b>`, `<span class="row" style="gap:6px"><span class="av kb-av">${ini(k.owner)}</span>${nm(k.owner)}</span>`, prioTag(k.prio), fmt(k.due) + dueTag(k.due, k.status === 'Done'), pill(k.status), B('Open', 'taskView', { r: x.id, id: k.id })]),
          filtered ? 'No tasks match these filters.' : 'No tasks yet.',
        )
      : `<div class="kb" data-room="${x.id}">${cols
          .map(st => {
            const list = sorted(st);
            const total = all.filter(k => k.status === st).length;
            return `<section class="kb-col" data-status="${h(st)}" aria-label="${h(st)}"><header class="kb-ch"><span class="kb-dot st-${st.replace(/\s/g, '').toLowerCase()}"></span><b>${h(st)}</b><span class="kb-n">${filtered ? list.length + '/' + total : total}</span></header><div class="kb-list">${list.map(k => kbCard(x, k)).join('') || `<div class="kb-empty">${st === 'Proposed' ? 'Proposals from members wait here for approval.' : filtered ? 'Nothing matches.' : 'Drop tasks here'}</div>`}</div>${canAdd && st !== 'Done' && st !== 'Proposed' ? `<button type="button" class="kb-add" data-a="roomItem" data-r="${x.id}" data-k="tasks" data-st="${h(st)}">${ic('plus', 14)}${lead || role() === 'A' ? 'Create' : 'Propose'} task</button>` : ''}</section>`;
          })
          .join('')}</div>`;
  return `<section class="card kb-wrap"><div class="card-h"><div><h2 class="h2">Tasks</h2><p class="cap">${lead ? 'Drag cards to change status or order. Drop a proposal into a column to approve it. Assign any task to any member.' : 'Drag your own tasks between columns. Proposed tasks wait for the project owner or facilitator.'}${ro ? ' This ' + WL() + ' is not active, so the board is read-only.' : ''}</p></div></div>${tools}${body}<p class="cap kb-hint">${ic('info', 13)} Keyboard or touch: open a card and change its status there.</p></section>`;
}
A.kbSet = d => {
  const f = kbState(byId('rooms', d.r));
  f[d.k] = d.v;
  render();
};
A.kbPrio = (d, el) => {
  kbState(byId('rooms', d.r)).prio = el.value;
  render();
};
// Search filters cards in place so typing keeps focus.
document.addEventListener('input', e => {
  const q = e.target;
  if (!q.dataset || !q.dataset.kbq) return;
  const x = byId('rooms', q.dataset.kbq);
  kbState(x).q = q.value;
  const v = q.value.trim().toLowerCase();
  document.querySelectorAll('.kb-card').forEach(c => (c.hidden = !!v && !c.dataset.s.includes(v)));
});
// ---- drag and drop
let KB_DRAG = null;
document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('.kb-card[draggable="true"]');
  if (!c) return;
  const x = byId('rooms', c.dataset.r);
  const k = x && x.tasks.find(t => t.id === c.dataset.id);
  if (!k) return;
  KB_DRAG = { r: x.id, id: k.id, ok: taskTargets(x, k) };
  e.dataTransfer.effectAllowed = 'move';
  try {
    e.dataTransfer.setData('text/plain', k.id);
  } catch (err) {}
  requestAnimationFrame(() => c.classList.add('dragging'));
  document.querySelectorAll('.kb-col').forEach(col => col.classList.toggle('kb-no', !KB_DRAG.ok.includes(col.dataset.status)));
});
const kbPh = () => document.querySelector('.kb-ph') || Object.assign(document.createElement('div'), { className: 'kb-ph' });
document.addEventListener('dragover', e => {
  if (!KB_DRAG) return;
  const col = e.target.closest && e.target.closest('.kb-col');
  if (!col || !KB_DRAG.ok.includes(col.dataset.status)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kb-col.over').forEach(c => c !== col && c.classList.remove('over'));
  col.classList.add('over');
  const list = col.querySelector('.kb-list');
  const after = [...list.querySelectorAll('.kb-card:not(.dragging)')].find(c => {
    const b = c.getBoundingClientRect();
    return e.clientY < b.top + b.height / 2;
  });
  const ph = kbPh();
  if (after) list.insertBefore(ph, after);
  else list.appendChild(ph);
});
document.addEventListener('drop', e => {
  if (!KB_DRAG) return;
  const col = e.target.closest && e.target.closest('.kb-col');
  if (!col || !KB_DRAG.ok.includes(col.dataset.status)) return;
  e.preventDefault();
  const list = col.querySelector('.kb-list');
  const ph = list.querySelector('.kb-ph');
  const idx = ph ? [...list.children].filter(c => c.classList.contains('kb-card') && !c.classList.contains('dragging') || c === ph).indexOf(ph) : -1;
  const d = { r: KB_DRAG.r, id: KB_DRAG.id, v: col.dataset.status, idx: String(idx) };
  KB_DRAG = null;
  A.taskMove(d);
});
document.addEventListener('dragend', () => {
  KB_DRAG = null;
  document.querySelectorAll('.kb-ph').forEach(p => p.remove());
  document.querySelectorAll('.kb-col').forEach(c => c.classList.remove('over', 'kb-no'));
  document.querySelectorAll('.kb-card.dragging').forEach(c => c.classList.remove('dragging'));
});
// Keyboard: Enter or Space on a focused card opens it.
document.addEventListener('keydown', e => {
  const c = e.target;
  if (c.classList && c.classList.contains('kb-card') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    A.taskView(c.dataset);
  }
});
const taskNotify = (x, k, t) =>
  [...new Set([k.owner, k.by, ...x.members.filter(m => ['Project owner', 'Facilitator'].includes(spaceRole('rooms', x, m.pid))).map(m => m.pid)])]
    .filter(p => p && p !== myId())
    .forEach(p => notify(p, t, 'room', { id: x.id, tab: 'plan' }));
A.taskMove = d => {
  const x = byId('rooms', d.r);
  const k = x.tasks.find(t => t.id === d.id);
  const from = k.status;
  const to = d.v;
  const col = x.tasks.filter(t => t.status === to && t.id !== k.id).sort((a, b) => (a.ord ?? 999) - (b.ord ?? 999) || (a.key || 0) - (b.key || 0));
  const i = d.idx != null && +d.idx >= 0 ? Math.min(+d.idx, col.length) : col.length;
  col.splice(i, 0, k);
  col.forEach((t, n) => (t.ord = n));
  k.status = to;
  if (from !== to) {
    (k.log = k.log || []).push({ at: now(), by: myId(), t: from === 'Proposed' ? 'Approved and moved to ' + to : 'Moved from ' + from + ' to ' + to });
    if (to === 'Done') {
      k.doneAt = now();
      k.reviewedBy = myId();
    }
    if (to === 'Review') {
      k.reviewAt = now();
      const pr = S.projects.find(p => p.room === x.id);
      [...new Set([...x.members.filter(m => m.status === 'Active' && ['Reviewer', 'Facilitator'].includes(spaceRole('rooms', x, m.pid))).map(m => m.pid), ...(pr ? pr.stewards : [])])]
        .filter(p => p && p !== myId())
        .forEach(p => notify(p, `Ready for review in ${x.name}: ${taskKey(x, k)} “${k.t}”`, 'room', { id: x.id, tab: 'plan' }));
    }
    sysMsg(x, `${me().name} moved ${taskKey(x, k)} “${k.t}” to ${to}`);
    taskNotify(x, k, `${taskKey(x, k)} “${k.t}” moved to ${to} in ${x.name}`);
    audit('Task moved', x.id, taskKey(x, k) + ': ' + from + ' → ' + to);
    toast(from === 'Proposed' ? 'Task approved and scheduled.' : 'Moved to ' + to + '.');
  }
  ok();
};
// ---- task detail
A.taskView = d => {
  const x = byId('rooms', d.r);
  const k = x && x.tasks.find(t => t.id === d.id);
  if (!k) return;
  const lead = isLead(x) || role() === 'A';
  const mine = k.owner === myId();
  const act = x.state === 'Active' && k.status !== 'Declined';
  const edit = act && (lead || mine);
  clearF('tke');
  mselReset('tke', 'partners');
  UI.form.tke = { t: k.t, desc: k.desc || '', owner: k.owner, due: k.due || '', prio: k.prio || 'Medium', status: k.status, doneNote: k.doneNote || '' };
  const mem = roomActive(x).map(m => [m.pid, P(m.pid).name + ' · ' + (spaceRole('rooms', x, m.pid) || '')]);
  const stOpts = taskTargets(x, k).length ? taskTargets(x, k) : [k.status];
  modal(
    `<span class="kb-key tk-key">${h(taskKey(x, k))}</span>${h(k.t)}`,
    () =>
      `<form data-f="tke" class="tk-detail" novalidate><input type="hidden" name="r" value="${x.id}"><input type="hidden" name="id" value="${k.id}">
  <div class="tk-main">${k.status === 'Proposed' ? banner('info', 'Proposed by ' + nm(k.by), lead ? 'Approve it into a column, or decline it.' : 'The project owner or facilitator approves it before it is scheduled.') : ''}${edit && lead ? fi('tke', 't', 'Title', { req: true }) : ''}${edit ? fi('tke', 'desc', 'Description', { type: 'textarea', rows: 5, ph: 'Add detail, acceptance criteria or links' }) : `<div><span class="lbl">Description</span><p class="muted tk-desc">${h(k.desc) || '<span class="cap">No description.</span>'}</p></div>`}
  ${delivBlock(x, k, edit, lead)}
  <div class="tk-act"><h3 class="h3">Activity</h3>${(k.log || []).length ? `<ol class="mtl ws-tl">${k.log.slice().reverse().map(l => `<li class="done"><span class="mtl-dot">${ic('check', 12)}</span><div class="col"><b>${h(l.t)}</b><span class="cap">${nm(l.by)} · ${fmt(l.at)}</span></div></li>`).join('')}</ol>` : '<p class="cap">No activity recorded yet.</p>'}</div></div>
  <aside class="tk-side">${edit ? fi('tke', 'status', 'Status', { type: 'select', opts: stOpts }) : `<div><span class="lbl">Status</span>${pill(k.status)}</div>`}${edit && lead ? fi('tke', 'owner', 'Assignee', { type: 'select', opts: mem }) : `<div><span class="lbl">Assignee</span><span class="row" style="gap:6px"><span class="av kb-av">${ini(k.owner)}</span>${nm(k.owner)}</span></div>`}${edit && lead ? fi('tke', 'prio', 'Priority', { type: 'select', opts: TASK_PRIOS }) + fi('tke', 'due', 'Due date', { type: 'date' }) : `<div><span class="lbl">Priority</span>${prioTag(k.prio)}</div><div><span class="lbl">Due</span>${fmt(k.due)}${dueTag(k.due, k.status === 'Done')}</div>`}<div><span class="lbl">${k.status === 'Proposed' ? 'Proposed by' : 'Created by'}</span>${k.by ? nm(k.by) : '—'}</div><div><span class="lbl">${WL()}</span>${h(x.name)}</div>
  <div class="tk-acts">${edit ? '<button class="btn btn-p btn-sm" type="submit">Save changes</button>' : ''}${act && lead && k.status === 'Proposed' ? B('Decline proposal', 'taskDecide', { r: x.id, id: k.id, v: 'Declined' }) : ''}</div></aside></form>`,
    true,
  );
};
F.tke = d => {
  const x = byId('rooms', d.r);
  const k = x.tasks.find(t => t.id === d.id);
  const lead = isLead(x) || role() === 'A';
  if (lead && !validate('tke', d, { t: ['req'] })) return render();
  const ch = [];
  const set = (f, v, label) => {
    if (v != null && v !== (k[f] || '')) {
      ch.push(label(v));
      k[f] = v;
    }
  };
  if (lead) {
    set('t', d.t.trim(), () => 'Renamed');
    set('owner', d.owner, v => 'Assigned to ' + P(v).name);
    set('prio', d.prio, v => 'Priority set to ' + v);
    set('due', d.due, v => 'Due date set to ' + fmt(v));
  }
  set('desc', (d.desc || '').trim(), () => 'Description updated');
  // deliverable details
  const arr = v => [].concat(v || []);
  const same = (a, b) => a.length === b.length && a.every(v => b.includes(v));
  const pts = arr(d.partners),
    evs = arr(d.evidence);
  if (!same(pts, k.partners || [])) {
    ch.push('Partners: ' + (pts.map(p => P(p).name).join(', ') || 'none'));
    k.partners = pts;
  }
  if (!same(evs, k.evidence || [])) {
    ch.push('Supporting evidence: ' + (evs.map(id => byId('evidence', id)?.title || id).join(', ') || 'none'));
    k.evidence = evs;
  }
  if (lead && !!k.opt !== (d.req !== 'yes')) {
    k.opt = d.req !== 'yes';
    ch.push(k.opt ? 'Marked optional' : 'Marked required');
  }
  if (k.status === 'Done' && d.doneNote != null) set('doneNote', d.doneNote.trim(), () => 'Completion note updated');
  const from = k.status;
  if (d.status && d.status !== from) {
    UI.modal = null;
    if (ch.length) (k.log = k.log || []).push({ at: now(), by: myId(), t: ch.join(' · ') });
    if (ch.some(c => c.startsWith('Assigned'))) notify(k.owner, 'Assigned to you in ' + x.name + ': ' + k.t, 'room', { id: x.id, tab: 'plan' });
    return A.taskMove({ r: x.id, id: k.id, v: d.status });
  }
  if (ch.length) {
    (k.log = k.log || []).push({ at: now(), by: myId(), t: ch.join(' · ') });
    if (ch.some(c => c.startsWith('Assigned'))) {
      notify(k.owner, 'Assigned to you in ' + x.name + ': ' + k.t, 'room', { id: x.id, tab: 'plan' });
      sysMsg(x, `${taskKey(x, k)} “${k.t}” assigned to ${P(k.owner).name}`);
    }
    audit('Task updated', x.id, taskKey(x, k) + ': ' + ch.join(', '));
    toast('Task updated.');
  }
  UI.modal = null;
  clearF('tke');
  ok();
};
// ---- My tasks across every Action Room
function myTasks(pid = myId()) {
  return S.rooms
    .filter(x => inCtx(x) && memberOf(x, pid))
    .flatMap(x => x.tasks.filter(k => k.owner === pid && !['Declined'].includes(k.status)).map(k => ({ x, k })))
    .sort((a, b) => (a.k.status === 'Done') - (b.k.status === 'Done') || taskOverdue(b.k) - taskOverdue(a.k) || (a.k.due || '9').localeCompare(b.k.due || '9'));
}
function myTasksCard(cls = 'c12') {
  const all = myTasks();
  if (!all.length && !myRooms().length) return '';
  const open = all.filter(t => t.k.status !== 'Done');
  const done = all.filter(t => t.k.status === 'Done');
  const late = open.filter(t => taskOverdue(t.k)).length;
  const row = ({ x, k }) => [
    `<b>${h(k.t)}</b><div class="cap"><span class="kb-key">${h(taskKey(x, k))}</span> · ${prioTag(k.prio)}</div>`,
    L(h(x.name), 'room', { id: x.id, tab: 'plan' }),
    fmt(k.due) + dueTag(k.due, k.status === 'Done'),
    pill(k.status),
    B('Open task', 'myTaskOpen', { r: x.id, id: k.id }),
  ];
  return card(
    'My tasks',
    `Assigned to you across all your ${WL()}s · ${open.length} open${late ? ' · <b class="ws-late">' + late + ' overdue</b>' : ''}`,
    table(['Task', WL(), 'Due', 'Status', ''], open.map(row), 'No open tasks assigned to you.') +
      (done.length ? `<details class="ws-done"><summary class="cap">${done.length} completed</summary>${table(['Task', WL(), 'Due', 'Status', ''], done.map(row))}</details>` : ''),
    '',
    cls,
  );
}
A.myTaskOpen = d => {
  UI.route = 'room';
  UI.p = { id: d.r, tab: 'plan' };
  UI.tab['ar_' + d.r] = 'plan';
  window.scrollTo(0, 0);
  A.taskView(d);
};
