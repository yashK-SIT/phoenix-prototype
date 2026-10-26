// ---------- OBJECT LINKS: Circle, Rope Team and Action Room as autonomous, linked objects (WSS clarification 6) ----------
// Circle = learning, dialogue, sensemaking, deliberation. Rope Team = support, accountability, close coordination.
// Action Room = execution, tasks, milestones, resources, evidence. None is a stage of another: any of them can be
// entered directly (with a legitimate basis) and any can later link another when the nature of the work changes.
//
// A link is a relationship/reference — never a data copy, never a membership grant, never permission inheritance.
// ObjectLink { id, source_type, source_id, target_type, target_id, link_type, context_id, created_by, created_at, primary }
//   source = the object holding the link (e.g. the Action Room); target = what it refers to (e.g. the Circle).
//   primary = the Primary Origin: what caused the source object to exist. At most one per object.
const OBJ_KINDS = ['circles', 'ropes', 'rooms', 'projects', 'cards', 'matches'];
const OBJ_LABEL = k => ({ circles: 'Circle', ropes: 'Rope Team', rooms: WL(), projects: 'Project', cards: 'Opportunity Card', matches: 'Match Brief' })[k] || k;
const OBJ_ICON = { circles: 'users', ropes: 'route', rooms: 'room', projects: 'folder', cards: 'megaphone', matches: 'link' };
const OBJ_TILE = { circles: 't-purple', ropes: 't-teal', rooms: 't-navy' };
const OBJ_ROUTE = { circles: 'circle', ropes: 'rope', rooms: 'room', projects: 'project', cards: 'card', matches: 'match' };
const SPACE_KINDS = ['circles', 'ropes', 'rooms'];
const LINK_TYPES = [
  ['originated-from', 'Originated from'],
  ['supports', 'Supports'],
  ['reflects-on', 'Reflects on'],
  ['executes', 'Executes'],
  ['related-to', 'Related to'],
];
// How a link reads from the other end ("Ward 7 Circle — gave rise to — Elm Road Action Room").
const LINK_INVERSE = { 'originated-from': 'Gave rise to', supports: 'Supported by', 'reflects-on': 'Reflected on by', executes: 'Executed by', 'related-to': 'Related to' };
const linkTypeLabel = t => (LINK_TYPES.find(([v]) => v === t) || [t, t])[1];
// Protected Rope Team content (private mentor notes, support details, check-ins, indicators, chat) is classified
// ROPE_TEAM_ONLY: it never crosses a link. Only an intentionally released report or reference can.
const ROPE_ONLY = 'ROPE_TEAM_ONLY';

const objKind = id => (id ? OBJ_KINDS.find(k => byId(k, id)) || null : null);
const objOf = id => byId(objKind(id), id) || null;
const objName = id => {
  const o = objOf(id);
  if (o && objKind(id) === 'matches') return 'Introduction · ' + P(o.a).name + ' ↔ ' + P(o.b).name;
  return o ? o.name || o.title || id : id;
};
const objState = (k, o) => (k === 'projects' ? (o.stage === 'Closed' ? 'Closed' : o.status) : o.state || o.status || '');

// Links already held in the seed or earlier browser data are derived once from the older fields (circle.project,
// rope.project/circle, room.origin/related). From then on S.links is the record of every relationship.
function deriveLinks() {
  const out = [];
  const push = (st, sid, tt, tid, type, primary, by) => {
    if (!sid || !tid || sid === tid || out.some(l => (l.source_id === sid && l.target_id === tid) || (l.source_id === tid && l.target_id === sid))) return;
    if (primary && out.some(l => l.source_id === sid && l.primary)) primary = false;
    out.push({ id: 'ol' + (out.length + 1), source_type: st, source_id: sid, target_type: tt, target_id: tid, link_type: type, context_id: (byId(st, sid) || {}).ctx || null, created_by: by || null, created_at: '2026-10-02T09:00', primary: !!primary });
  };
  (S.circles || []).forEach(c => c.project && push('circles', c.id, 'projects', c.project, 'originated-from', true, c.owner));
  (S.ropes || []).forEach(r => {
    if (r.project) push('ropes', r.id, 'projects', r.project, 'originated-from', true, r.owner);
    if (r.circle) push('ropes', r.id, 'circles', r.circle, 'supports', !r.project, r.owner);
  });
  (S.rooms || []).forEach(x => {
    const ok_ = x.origin && objKind(x.origin.id);
    if (ok_) push('rooms', x.id, ok_, x.origin.id, 'originated-from', true, x.lead);
    (x.related || []).forEach(id => {
      const k = objKind(id);
      if (k) push('rooms', x.id, k, id, k === 'projects' ? 'executes' : 'related-to', false, x.lead);
    });
    const pr = (S.projects || []).find(p => p.room === x.id);
    if (pr) {
      push('rooms', x.id, 'projects', pr.id, 'executes', false, x.lead);
      if (pr.rope) push('rooms', x.id, 'ropes', pr.rope, 'related-to', false, x.lead);
    }
  });
  return out;
}
const allLinks = () => (S.links = S.links || deriveLinks());
const linksOf = id => allLinks().filter(l => l.source_id === id || l.target_id === id);
const primaryLink = id => allLinks().find(l => l.source_id === id && l.primary) || null;
const linkOther = (l, id) => (l.source_id === id ? l.target_id : l.source_id);
const linkedIds = (id, kind) => linksOf(id).map(l => linkOther(l, id)).filter(x => !kind || objKind(x) === kind);
const linkedObjs = (id, kind) => linkedIds(id, kind).map(x => byId(kind, x)).filter(Boolean);
function addLink(st, sid, tt, tid, type, primary) {
  if (!sid || !tid || sid === tid) return null;
  if (allLinks().some(l => (l.source_id === sid && l.target_id === tid) || (l.source_id === tid && l.target_id === sid))) return null;
  const l = {
    id: uid('ol'),
    source_type: st,
    source_id: sid,
    target_type: tt,
    target_id: tid,
    link_type: type,
    context_id: (byId(st, sid) || {}).ctx || ctxId(),
    created_by: myId(),
    created_at: now(),
    primary: !!primary && !primaryLink(sid),
  };
  S.links.push(l);
  audit('Object link created', sid, linkTypeLabel(type) + ' → ' + OBJ_LABEL(tt) + ' ' + tid + (l.primary ? ' (Primary Origin)' : '') + ' · no members, roles or content copied');
  return l;
}

// ---- who may do what. Seeing that a link exists (name, kind, state) is allowed to anyone who can see this object;
// opening the linked object needs independent access to it. A Rope Team opens only for its own members.
const objOpenable = (k, o) => {
  if (!o) return false;
  if (k === 'ropes') return memberOf(o);
  if (k === 'circles' || k === 'rooms') return canOpenSpace(k, o);
  if (k === 'projects') return o.owner === myId() || role() !== 'P';
  // a Match Brief opens only for its two parties, its steward and the Organization Admin
  if (k === 'matches') return [o.a, o.b, o.steward].includes(myId()) || role() === 'A';
  return true;
};
// Authority to link or create from this object: its owner/lead/facilitator (or mentor, for a Rope Team).
function linkAuth(k, o) {
  if (!o) return false;
  if (k === 'projects') return o.status === 'Accepted' && !['Final review', 'Closed'].includes(o.stage) && (o.owner === myId() || (role() === 'F' && o.stewards.includes(myId())) || role() === 'A');
  if (o.state !== 'Active') return false;
  if (k === 'circles') return sCan('circles', o, 'facilitate') || spaceAdmin('circles', o);
  if (k === 'ropes') return sCan('ropes', o, 'members') || o.mentor === myId();
  if (k === 'rooms') return sCan('rooms', o, 'lead') || role() === 'A';
  return false;
}
// Creating a linked object. A Rope Team is voluntary and private, so any contributing member may form one (they
// choose who to invite). A Circle or an Action Room needs authority in the source object; anyone else may propose.
function canMake(k, o, make) {
  if (!o || make === k) return false;
  if (k !== 'projects' && o.state !== 'Active') return false;
  if (make === 'ropes') return k === 'projects' ? linkAuth(k, o) : sCan(k, o, 'post') && ['P', 'M', 'F'].includes(role());
  if (make === 'circles') return linkAuth(k, o);
  if (make === 'rooms') return linkAuth(k, o) || (k === 'ropes' && sCan('ropes', o, 'post'));
  return false;
}

// ---- the "Linked objects" panel shown on every Circle, Rope Team, Action Room and Project
function linkRow(o, l) {
  const oid = linkOther(l, o.id);
  const k = objKind(oid);
  const t = byId(k, oid);
  if (!t) return '';
  const out = l.source_id === o.id;
  const rel = out ? linkTypeLabel(l.link_type) : LINK_INVERSE[l.link_type] || linkTypeLabel(l.link_type);
  const open = objOpenable(k, t);
  const name = open ? L(h(objName(oid)), OBJ_ROUTE[k], { id: oid }, 'lnk') : h(objName(oid));
  const lock = !open && SPACE_KINDS.includes(k) ? `<span class="pill p-grey" title="A link does not give access. Open it only if you are independently a member.">${ic('lock', 12)} Link only</span>` : '';
  const unlink = !l.primary && (l.created_by === myId() || linkAuth(objKind(o.id), o)) && o.state !== 'Closed' ? B('Unlink', 'unlinkObj', { id: l.id }, 'btn-g btn-sm') : '';
  return lrow(OBJ_ICON[k] || 'link', name, `${h(rel)} · ${OBJ_LABEL(k)}${objState(k, t) ? ' · ' + h(objState(k, t)) : ''}${l.created_by ? ' · linked by ' + (l.byLabel ? h(l.byLabel) : nm(l.created_by)) : ''}${l.created_at ? ' · ' + fmt(l.created_at) : ''}`, `<span class="row" style="gap:6px">${lock}${unlink}</span>`, OBJ_TILE[k] || 't-soft');
}
function linkCard(k, o) {
  if (!o) return '';
  const ls = linksOf(o.id);
  const prim = ls.find(l => l.source_id === o.id && l.primary);
  const others = ls.filter(l => l !== prim);
  const originNote = !prim && o.origin && o.origin.type ? lrow('flag', h(o.origin.type), (o.origin.basis || o.mandate ? 'Basis: ' + h(o.origin.basis || o.mandate) : 'Direct entry') + (o.origin.by ? ' · ' + nm(o.origin.by) : ''), '', 't-soft') : '';
  const acts = [];
  const make = (m, icon, lbl) => canMake(k, o, m) && acts.push(B(ic(icon, 14) + lbl, 'linkMake', { k, id: o.id, make: m }, 'btn-s btn-sm'));
  make('circles', 'users', 'Create linked Circle');
  make('ropes', 'route', 'Form linked Rope Team');
  make('rooms', 'room', (linkAuth(k, o) || canCreateRoom() ? 'Create' : 'Propose') + ' linked ' + WL());
  if (linkAuth(k, o)) acts.push(B(ic('link', 14) + 'Link existing', 'linkExisting', { k, id: o.id }, 'btn-s btn-sm'));
  const body =
    `<div class="col" style="gap:4px"><span class="over">Primary origin</span>${prim ? linkRow(o, prim) : originNote || '<p class="cap">None recorded — created directly.</p>'}</div>` +
    `<div class="col" style="gap:4px;margin-top:12px"><span class="over">Related objects</span>${others.map(l => linkRow(o, l)).join('') || '<p class="cap">Nothing linked yet.</p>'}</div>` +
    `<p class="cap" style="margin-top:12px">A link is a reference. It never copies content, members, roles or permissions${k === 'ropes' ? '. This Rope Team’s notes, support details, check-ins and chat are <b>' + ROPE_ONLY + '</b> and never appear in linked spaces' : ''}.</p>` +
    (acts.length ? `<div class="row wrap gate-act">${acts.join('')}</div>` : '') +
    (SPACE_KINDS.includes(k) ? backActions(k, o) : '');
  return card('Linked objects', 'Separate collaboration objects, linked in any order. Not stages.', body, '', 'gate-card');
}
// A compact strip on the Overview tab: this object, where it came from and what it is linked to.
function linkStrip(k, o) {
  // a room that belongs to a project shows where the project is now, and lets its owner or steward move it here
  const pj = SPACE_KINDS.includes(k) ? projOf(k, o) || linkedObjs(o.id, 'projects')[0] : null;
  const bar = pj ? projRoomBar(pj, k) : '';
  const ls = linksOf(o.id);
  if (!ls.length && !(o.origin && o.origin.type)) return bar;
  const prim = ls.find(l => l.source_id === o.id && l.primary);
  const step = (kk, t, lbl, here) =>
    `<li class="jstep is-done${here ? ' is-here' : ''}"${here ? ' aria-current="step"' : ''}><span class="tile ${OBJ_TILE[kk] || 't-soft'}">${ic(OBJ_ICON[kk] || 'flag', 16)}</span><div class="jbody"><span class="jlabel">${lbl}${here ? ' <span class="jhere">You are here</span>' : ''}</span><span class="jname">${t}</span></div></li>`;
  const ref = id => {
    const kk = objKind(id);
    const t = byId(kk, id);
    return objOpenable(kk, t) ? L(h(objName(id)), OBJ_ROUTE[kk], { id }, 'lnk') : h(objName(id)) + (kk === 'ropes' ? ' ' + ic('lock', 12) : '');
  };
  const items = [];
  if (prim) items.push(step(objKind(prim.target_id), ref(prim.target_id), 'Primary origin · ' + OBJ_LABEL(objKind(prim.target_id))));
  else if (o.origin && o.origin.type) items.push(step('', h(o.origin.type), 'Primary origin'));
  items.push(step(k, h(o.name || o.title), OBJ_LABEL(k), true));
  ls.filter(l => l !== prim).forEach(l => {
    const id = linkOther(l, o.id);
    const out = l.source_id === o.id;
    items.push(step(objKind(id), ref(id), (out ? linkTypeLabel(l.link_type) : LINK_INVERSE[l.link_type]) + ' · ' + OBJ_LABEL(objKind(id))));
  });
  return bar + `<section class="journey" aria-label="Linked objects"><div class="jhead"><span class="jtitle">${ic('link', 15)}Lineage</span><span class="cap jsum">separate objects · linked by reference · no membership or permission is inherited</span></div><ol class="jsteps jsteps-free">${items.join('')}</ol></section>`;
}

// ---- create a linked object from here
A.linkMake = d => {
  const o = byId(d.k, d.id);
  if (!canMake(d.k, o, d.make)) return deny('you cannot create a linked ' + OBJ_LABEL(d.make) + ' from here');
  if (d.make === 'circles') return A.newCircle({ fromKind: d.k, fromId: d.id });
  if (d.make === 'ropes') return A.newRope({ fromKind: d.k, fromId: d.id });
  const origin = { circles: 'Circle decision', ropes: 'Rope Team recommendation', rooms: WL(), projects: 'Project' }[d.k];
  return A.newRoom(d.k === 'projects' ? { origin, project: d.id } : { origin, oid: d.id });
};
// ---- link an existing object you are authorised in. The link only records the relationship.
const linkCandidates = (k, o) => {
  const have = new Set([o.id, ...linkedIds(o.id)]);
  return [
    ...S.circles.filter(c => inCtx(c) && c.state === 'Active' && (memberOf(c) || c.facilitator === myId())).map(c => ['circles', c]),
    ...S.ropes.filter(r => inCtx(r) && r.state === 'Active' && memberOf(r)).map(r => ['ropes', r]),
    ...S.rooms.filter(r => inCtx(r) && r.state === 'Active' && memberOf(r)).map(r => ['rooms', r]),
    ...S.projects.filter(p => inCtx(p) && p.status === 'Accepted' && (p.owner === myId() || (role() === 'F' && p.stewards.includes(myId())))).map(p => ['projects', p]),
  ].filter(([, t]) => !have.has(t.id));
};
A.linkExisting = d => {
  clearF('lkx');
  const o = byId(d.k, d.id);
  const cands = linkCandidates(d.k, o);
  modal('Link an existing object to ' + h(o.name || o.title), () =>
    `<form data-f="lkx" class="col" style="gap:14px" novalidate><input type="hidden" name="k" value="${d.k}"><input type="hidden" name="id" value="${o.id}">${
      cands.length
        ? fi('lkx', 'to', 'Object to link', { type: 'select', req: true, ph: 'Choose', opts: cands.map(([kk, t]) => [t.id, OBJ_LABEL(kk) + ' · ' + (t.name || t.title)]), help: 'Only objects you are a member of, or are authorised for, in this programme.' })
        : banner('info', 'Nothing to link', 'You are not a member of another active Circle, Rope Team or ' + WL() + ' in this programme.')
    }${fi('lkx', 'type', 'Relationship', { type: 'select', req: true, opts: LINK_TYPES.filter(([v]) => v !== 'originated-from'), value: 'related-to', help: 'How this object relates to the one you link. Primary Origin is set when an object is created and is not changed.' })}${banner('info', 'Reference only', 'Linking does not copy content, add members or grant permissions in either direction. People see the other object’s name; they open it only if they are independently a member.')}<div class="actions"><span></span><button class="btn btn-p" type="submit" ${cands.length ? '' : 'disabled'}>Link</button></div></form>`,
  );
};
F.lkx = d => {
  if (!validate('lkx', d, { to: ['req'], type: ['req'] })) return render();
  const o = byId(d.k, d.id);
  const tk = objKind(d.to);
  if (!linkCandidates(d.k, o).some(([, t]) => t.id === d.to)) return deny('you can link only objects you belong to or are authorised for');
  const l = addLink(d.k, o.id, tk, d.to, d.type, false);
  if (!l) {
    toast('These two are already linked.', 'warn');
    return render();
  }
  const t = byId(tk, d.to);
  [o, t].forEach(x => SPACE_KINDS.includes(objKind(x.id)) && sysMsg(x, 'Linked by reference: ' + (x === o ? t.name || t.title : o.name || o.title) + ' (' + linkTypeLabel(d.type) + '). Nothing was copied.'));
  if (byId('projects', d.to)) byId('projects', d.to).history.push({ at: today(), t: 'Linked by reference to ' + OBJ_LABEL(d.k) + ' ' + (o.name || o.title) });
  UI.modal = null;
  clearF('lkx');
  toast('Linked. No members, roles or content moved.');
  ok();
};
A.unlinkObj = d => {
  const l = allLinks().find(x => x.id === d.id);
  if (!l || l.primary) return deny('the Primary Origin cannot be unlinked');
  S.links = S.links.filter(x => x !== l);
  audit('Object link removed', l.source_id, l.link_type + ' → ' + l.target_id);
  toast('Link removed. Both objects are unchanged.');
  ok();
};
