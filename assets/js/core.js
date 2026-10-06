// ---------- CORE ----------
const KEY = 'phoenix-alpha-proto-v5';
let S = null;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}
const UI = { route: 'login', p: {}, tab: {}, form: {}, err: {}, modal: null, toast: null, q: {}, pre: null };
const h = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const uid = p => p + ++S.seq;
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const fmt = s => {
  if (!s) return '—';
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  if (isNaN(d)) return h(s);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    (s.length > 10 ? ' ' + d.toTimeString().slice(0, 5) : '')
  );
};
const byId = (arr, id) => (S[arr] || []).find(x => x.id === id);
const P = id => S.people.find(p => p.id === id) || { name: 'Unknown', display: '?' };
const nm = id => h(P(id).name);
const ini = id => h((P(id).display || P(id).name || '?')[0]);
const ROLE = {
  P: 'Participant',
  F: 'Facilitator / Steward',
  M: 'Mentor / Advisor',
  C: 'Partner / Collaborator',
  O: 'Organization Representative',
  S: 'Sponsor / Funder',
  A: 'Programme Administrator',
  T: 'Platform Administrator',
};
// Seeded defaults only. At run time roles live in S.roles (managed in Role management) and ROLE mirrors their names.
const SENSITIVE_ROLES = ['F', 'M', 'C', 'O', 'A'];
// Default role × module matrix (Section 10, Table 30), used to seed S.roles and to reset a seeded role.
const MX = {
  home: { P: 'O', F: 'O', M: 'O', C: 'O', O: 'O', S: 'O', A: 'O', T: 'O' },
  identity: { P: 'O', F: 'C', M: '-', C: 'C', O: 'M', S: 'O', A: 'M', T: 'M' },
  agreements: { P: 'O', F: 'O', M: 'O', C: 'O', O: 'O', S: 'O', A: 'M', T: 'T' },
  profile: { P: 'O', F: 'V', M: 'V', C: 'O', O: 'A', S: '-', A: 'M', T: '-' },
  pathways: { P: 'OC', F: 'CR', M: 'C', C: 'C', O: 'R', S: '-', A: 'M', T: '-' },
  aireq: { P: 'C', F: 'V', M: '-', C: '-', O: '-', S: '-', A: '-', T: '-' },
  projects: { P: 'C', F: 'R', M: '-', C: '-', O: 'V', S: '-', A: 'M', T: '-' },
  circles: { P: 'C', F: 'M', M: 'C', C: 'C', O: 'M', S: '-', A: 'VM', T: '-' },
  voting: { P: 'C', F: 'C', M: '-', C: '-', O: '-', S: '-', A: '-', T: '-' },
  ropeteams: { P: 'C', F: 'C', M: 'C', C: '-', O: 'M', S: '-', A: 'VM', T: '-' },
  rooms: { P: 'C', F: 'M', M: 'C', C: 'M', O: 'M', S: '-', A: 'M', T: '-' },
  opportunities: { P: 'C', F: 'R', M: 'V', C: 'C', O: 'C', S: '-', A: 'M', T: '-' },
  matching: { P: 'C', F: 'R', M: 'V', C: 'C', O: '-', S: '-', A: 'V', T: '-' },
  repository: { P: 'C', F: 'C', M: 'C', C: 'C', O: 'V', S: '-', A: 'M', T: 'T' },
  evidence: { P: 'C', F: 'R', M: 'V', C: 'C', O: 'A', S: 'A', A: 'M', T: 'T' },
  harvest: { P: 'C', F: 'R', M: 'C', C: 'C', O: 'A', S: 'A', A: 'C', T: '-' },
  ai: { P: 'C', F: 'C', M: 'C', C: 'C', O: 'C', S: 'C', A: 'M', T: 'T' },
  payments: { P: 'O', F: '-', M: '-', C: '-', O: 'C', S: 'C', A: 'M', T: 'T' },
  funding: { P: 'C', F: 'V', M: '-', C: '-', O: '-', S: 'M', A: 'V', T: '-' },
  metrics: { P: 'O', F: 'V', M: 'V', C: 'V', O: 'A', S: 'A', A: 'M', T: 'T' },
  governance: { P: 'C', F: 'R', M: 'C', C: 'C', O: 'C', S: 'C', A: 'M', T: 'T' },
  admin: { P: '-', F: '-', M: '-', C: '-', O: 'M', S: '-', A: 'M', T: 'M' },
  platform: { P: '-', F: '-', M: '-', C: '-', O: '-', S: '-', A: '-', T: 'M' },
};
const LV = {
  O: 'own records only',
  C: 'create / contribute',
  R: 'review / approve',
  V: 'view within scope',
  A: 'approved aggregate only',
  M: 'manage / configure',
  T: 'technical administration only (no content)',
  '-': 'no access',
};
const me = () => S.people.find(p => p.id === S.session?.pid);
const asg = () => S.assign.find(a => a.id === S.session?.aid);
// Each role record has a base: the predefined role whose workflow rules it follows.
// role() returns that base, so every workflow rule works for seeded and custom roles alike;
// roleId() is the role actually assigned, and its own module permissions decide what can be opened.
const roleRec = id => (S && S.roles ? S.roles.find(r => r.id === id) : null);
const roleBase = id => (roleRec(id) || {}).base || id;
const roleId = () => asg()?.role;
const role = () => roleBase(roleId());
const roleNeedsApproval = id => (roleRec(id) ? !!roleRec(id).approval : SENSITIVE_ROLES.includes(id));
function syncRoles() {
  (S.roles || []).forEach(r => (ROLE[r.id] = r.name));
}
const ctxId = () => asg()?.ctx;
const ctx = () => S.contexts.find(c => c.id === ctxId());
const pack = () => S.packs.find(p => p.id === ctx()?.pack) || S.packs[0];
// Execution spaces are called Action Rooms everywhere, in every pack.
const WL = () => 'Action Room';
const lvl = m => {
  const r = roleRec(roleId());
  return (r && r.perms ? r.perms[m] : (MX[m] || {})[roleId()]) || '-';
};
const can = (m, need) => {
  const l = lvl(m);
  if (l === '-' || l === 'T') return false;
  if (!need) return true;
  return need.split('').some(n => l.includes(n));
};
const tech = m => lvl(m).includes('T') || (lvl(m).includes('M') && role() === 'T');
const hasB = b => (asg()?.bundles || []).includes(b);
const mine = pid => pid === S.session?.pid;
const myId = () => S.session?.pid;
const consent = (pid, k) => (S.consents[pid] || {})[k] || 'Declined';
const ent = pid => S.ents.filter(e => e.pid === pid && e.ctx === ctxId() && ['Active', 'Grace'].includes(e.state));
const inCtx = o => !o.ctx || o.ctx === ctxId();
const reaccept = () => {
  const a = asg();
  if (!a) return null;
  const g = S.agreements.find(g => g.ctx === a.ctx && g.status === 'Active' && g.roles.includes(a.role));
  if (!g) return null;
  return S.accepts.some(x => x.pid === a.pid && x.ag === g.id) ? null : g;
};
function audit(a, o, d, r = 'ok') {
  S.audit.unshift({ at: now(), by: myId() || 'anonymous', ctx: ctxId(), a, o, d, r });
}
function notify(pid, t, r, p) {
  S.notifs.unshift({ id: uid('n'), pid, t, r, p: p || {}, read: false, at: today() });
}
function toast(t, k = 'ok') {
  UI.toast = { t, k };
  clearTimeout(UI._tt);
  UI._tt = setTimeout(() => {
    UI.toast = null;
    render();
  }, 4200);
}
function deny(why, obj) {
  audit('Access denied', obj || UI.route, why, 'denied');
  toast('Not permitted: ' + why, 'err');
  render();
  return false;
}
function go(r, p = {}) {
  // Notifications and Ask PHOENIX are panels over the current screen, not pages.
  if (r === 'notifications' || r === 'ask') {
    UI.modal = null;
    UI.panel = r === 'ask' ? 'ask' : 'notif';
    render();
    return;
  }
  if (UI.panel === 'notif') UI.panel = null;
  UI.route = r;
  UI.p = p;
  UI.modal = null;
  render();
  window.scrollTo(0, 0);
}
const ok = () => {
  save();
  render();
};
// ---- icons
const ic = (n, s = 18) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.info}</svg>`;
// ---- small components
const SC = {
  Active: 'p-teal',
  Current: 'p-teal',
  Approved: 'p-green',
  Accepted: 'p-green',
  Granted: 'p-teal',
  Released: 'p-navy',
  'Summary accepted': 'p-green',
  Achieved: 'p-green',
  Done: 'p-green',
  Completed: 'p-green',
  Introduced: 'p-green',
  Healthy: 'p-green',
  Successful: 'p-green',
  Resolved: 'p-green',
  Mitigated: 'p-teal',
  Confirmed: 'p-teal',
  Committed: 'p-navy',
  Draft: 'p-grey',
  Declined: 'p-grey',
  Closed: 'p-grey',
  Archived: 'p-grey',
  Superseded: 'p-grey',
  Expired: 'p-grey',
  Withdrawn: 'p-red',
  Revoked: 'p-red',
  Rejected: 'p-red',
  Quarantined: 'p-red',
  Escalated: 'p-red',
  Suspended: 'p-red',
  Failed: 'p-red',
  Refunded: 'p-grey',
  Cancelled: 'p-grey',
  Insufficient: 'p-red',
  Restricted: 'p-red',
  Submitted: 'p-navy',
  'In review': 'p-amber',
  'In steward review': 'p-amber',
  'Under review': 'p-amber',
  'Clarification requested': 'p-amber',
  'Needs Revision': 'p-amber',
  'Awaiting consent': 'p-amber',
  Pending: 'p-amber',
  'Pending role approval': 'p-amber',
  'Re-acceptance required': 'p-amber',
  Grace: 'p-amber',
  'On hold': 'p-red',
  'Summary submitted': 'p-amber',
  'Proposed to participant': 'p-amber',
  'Change requested': 'p-amber',
  Proposed: 'p-amber',
  Open: 'p-amber',
  Assigned: 'p-navy',
  Resent: 'p-navy',
  'In progress': 'p-amber',
  'To do': 'p-grey',
  'Not started': 'p-grey',
  Paused: 'p-red',
  'Paused/Repair': 'p-red',
  'Pending approval': 'p-amber',
  Reported: 'p-amber',
  Triaged: 'p-amber',
  'Decision recorded': 'p-navy',
  Appealed: 'p-amber',
  Reopened: 'p-amber',
  Reviewed: 'p-navy',
  'In Implementation': 'p-navy',
  'Pending Review': 'p-amber',
  'Final review': 'p-amber',
  'Changes requested': 'p-amber',
  Room: 'p-navy',
  Circle: 'p-purple',
  'Rope Team': 'p-teal',
  Invited: 'p-amber',
  Configured: 'p-teal',
  Degraded: 'p-red',
  Unavailable: 'p-red',
  'Not approved': 'p-grey',
};
const pill = (t, c) =>
  `<span class="pill ${c || SC[t] || (String(t).startsWith('Closed — Approved') ? 'p-green' : String(t).startsWith('Closed') ? 'p-grey' : 'p-grey')}">${h(t)}</span>`;
const attr = o =>
  Object.entries(o || {})
    .map(([k, v]) => ` data-${k}="${h(v)}"`)
    .join('');
const B = (label, a, data, cls = 'btn-s btn-sm', extra = '') =>
  `<button type="button" class="btn ${cls}" data-a="${a}"${attr(data)} ${extra}>${label}</button>`;
const L = (label, r, p, cls = 'lnk') => `<a href="#" class="${cls}" data-a="go" data-r="${r}"${attr(p)}>${label}</a>`;
const card = (title, sub, body, right = '', cls = '') =>
  `<section class="card ${cls}">${title || sub || right ? `<div class="card-h"><div>${title ? `<h2 class="h2">${title}</h2>` : ''}${sub ? `<p class="cap">${sub}</p>` : ''}</div><div class="row wrap">${right}</div></div>` : ''}${body}</section>`;
// Empty state: says what is missing and what to do next, aligned with the content it replaces.
const empty = (icon, title, text, act = '') =>
  `<div class="empty"><span class="empty-ic" aria-hidden="true">${ic(icon, 18)}</span><div><b>${title}</b>${text ? `<p>${text}</p>` : ''}${act ? `<div class="row wrap" style="gap:8px">${act}</div>` : ''}</div></div>`;
const banner = (k, title, text, icon) =>
  `<div class="banner b-${k}" ${k === 'err' ? 'role="alert"' : 'role="status"'}>${ic(icon || { err: 'alert', warn: 'alert', ok: 'check', info: 'info', ai: 'sparkle' }[k])}<div>${title ? `<div class="bt">${title}</div>` : ''}${text ? `<p>${text}</p>` : ''}</div></div>`;
const table = (cols, rows, emptyMsg = 'Nothing to show.') =>
  rows.length
    ? `<div class="tblwrap"><table class="tbl"><thead><tr>${cols.map(c => `<th scope="col"${c === '' ? ' class="act"' : ''}>${c || '<span class="sr">Actions</span>'}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td data-label="${h(String(cols[i]).replace(/<[^>]+>/g, ''))}"${cols[i] === '' ? (c === '' || c == null ? ' class="act act-empty"' : ' class="act"') : ''}>${c === '' || c == null ? '<span class="cap">—</span>' : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : `<div class="tbl-empty">${ic('inbox', 20)}<span>${emptyMsg}</span></div>`;
const tabs = (k, items, def) => {
  items = items.filter(Boolean);
  const ids = items.map(i => i[0]);
  let cur =
    UI.p.tab && ids.includes(UI.p.tab)
      ? UI.p.tab
      : UI.tab[k] && ids.includes(UI.tab[k])
        ? UI.tab[k]
        : def && ids.includes(def)
          ? def
          : ids[0];
  return {
    cur,
    html: `<div class="tabs" role="tablist" aria-label="Sections">${items
      .filter(Boolean)
      .map(
        ([id, l, c]) =>
          `<button type="button" role="tab" aria-selected="${cur === id}" class="tab ${cur === id ? 'on' : ''}" data-a="tab" data-k="${k}" data-v="${id}">${l}${c != null ? `<span class="cnt">${c}</span>` : ''}</button>`,
      )
      .join('')}</div>`,
  };
};
const head = (t, sub, right = '', crumbs) => {
  const badges = [];
  right = (right || '').replace(/<span class="(?:pill|ai-tag)[^"]*">[\s\S]*?<\/span>/g, m => {
    badges.push(m);
    return '';
  });
  return `${crumbs ? `<nav class="row cap" aria-label="Breadcrumb" style="gap:6px;margin-bottom:10px">${crumbs.map(([l, r, p], i) => (r ? L(l, r, p, 'cap') + ic('chevr', 14) : `<span>${l}</span>`)).join('')}</nav>` : ''}<div class="phead"><div class="phead-t"><div class="row wrap" style="gap:10px"><h1 class="h1">${t}</h1>${badges.join('')}</div>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right.trim() ? `<div class="phead-a">${right}</div>` : ''}</div>`;
};
const aiTag = t => `<span class="ai-tag">${ic('sparkle', 12)}${t || 'AI draft'}</span>`;
const assumed = t => `<span class="flag">${ic('flag', 12)}Assumed rule · ${t}</span>`;
const money = (c, n) =>
  `<span style="white-space:nowrap">${h(c || 'USD')} ${Number(n || 0).toLocaleString('en-US')}</span>`;
const dueTag = (due, done) => (!done && due && due < today() ? ' ' + pill('Overdue', 'p-red') : '');
const dl = pairs =>
  `<dl class="kv2">${pairs
    .filter(Boolean)
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join('')}</dl>`;
// ---- forms
function fv(f, n, def) {
  return UI.form[f] && UI.form[f][n] != null ? UI.form[f][n] : (def ?? '');
}
function fe(f, n) {
  return UI.err[f] && UI.err[f][n];
}
function fi(f, n, label, o = {}) {
  const id = f + '_' + n,
    e = fe(f, n),
    v = fv(f, n, o.value);
  const req = o.req ? ' <span class="req">*</span>' : '';
  const ec = e ? ' err' : '';
  let ctl;
  if (o.type === 'textarea')
    ctl = `<textarea id="${id}" name="${n}" class="input${ec}" ${o.rows ? `style="min-height:${o.rows * 24}px"` : ''} placeholder="${h(o.ph || '')}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.ro ? 'readonly' : ''} aria-invalid="${!!e}">${h(v)}</textarea>`;
  else if (o.type === 'select')
    ctl = `<select id="${id}" name="${n}" class="input${ec}" aria-invalid="${!!e}" ${o.ro ? 'disabled' : ''} ${o.ch ? `data-ch="${o.ch}"` : ''}>${o.ph ? `<option value="">${h(o.ph)}</option>` : ''}${o.opts
      .map(x => {
        const [val, l] = Array.isArray(x) ? x : [x, x];
        return `<option value="${h(val)}" ${String(v) === String(val) ? 'selected' : ''}>${h(l)}</option>`;
      })
      .join('')}</select>`;
  else if (o.type === 'checkbox')
    return `<label class="row" style="align-items:flex-start;gap:10px"><input class="chk" type="checkbox" name="${n}" value="yes" ${v === 'yes' || v === true ? 'checked' : ''} aria-invalid="${!!e}"><span>${label}${req}</span></label>${e ? `<span class="emsg" role="alert">${ic('alert', 14)}${e}</span>` : ''}`;
  else
    ctl = `<input id="${id}" name="${n}" class="input${ec}" type="${o.type || 'text'}" value="${h(v)}" placeholder="${h(o.ph || '')}" ${o.ro ? 'readonly' : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} aria-invalid="${!!e}" ${o.auto ? `autocomplete="${o.auto}"` : ''}>`;
  return `<div class="field ${o.cls || ''}"><label class="lbl" for="${id}">${label}${req}</label>${ctl}${e ? `<span class="emsg" role="alert">${ic('alert', 14)}${e}</span>` : ''}${o.help ? `<span class="help">${o.help}</span>` : ''}${o.vis ? `<span class="vis">${ic('lock', 14)}${o.vis}</span>` : ''}</div>`;
}
function validate(f, d, rules) {
  const e = {};
  for (const [n, rs] of Object.entries(rules)) {
    const v = (d[n] ?? '').toString().trim();
    for (const r of rs) {
      const [k, a] = Array.isArray(r) ? r : [r];
      if (k === 'req' && !v) {
        e[n] = a || 'This field is required.';
        break;
      }
      if (k === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        e[n] = 'Enter a valid email address, like name@example.org.';
        break;
      }
      if (k === 'min' && v && v.length < a) {
        e[n] = `Enter at least ${a} characters.`;
        break;
      }
      if (k === 'num' && v && !(Number(v) > 0)) {
        e[n] = 'Enter a number greater than 0.';
        break;
      }
      if (k === 'date' && v && v < today()) {
        e[n] = 'Choose a date that is today or later.';
        break;
      }
      if (k === 'fn' && !a.f(v, d)) {
        e[n] = a.m;
        break;
      }
    }
  }
  UI.form[f] = d;
  UI.err[f] = e;
  return Object.keys(e).length === 0;
}
function clearF(f) {
  delete UI.form[f];
  delete UI.err[f];
  (UI._cleared = UI._cleared || new Set()).add(f);
}
const errSum = f => {
  const e = UI.err[f];
  if (!e || !Object.keys(e).length) return '';
  return banner(
    'err',
    `Check ${Object.keys(e).length} field${Object.keys(e).length > 1 ? 's' : ''}`,
    Object.values(e).join(' '),
  );
};
// ---- modal
function modal(title, body, wide) {
  UI.modal = { title, body, wide };
  render();
}
const closeM = () => {
  UI.modal = null;
  render();
};
// ---- nav model per role
function navItems() {
  const r = role();
  const W = WL();
  const items = [];
  const add = (m, route, label, icon, cond = true) => {
    if (cond && can(m)) items.push([route, label, icon]);
  };
  if (r === 'T') {
    return [
      ['home', 'Platform health', 'grid'],
      ['tenants', 'Organizations', 'building'],
      ['platform', 'Contexts', 'layers'],
      ['roles', 'Role management', 'shield'],
      ['platform:integrations', 'Integrations', 'link'],
      ['platform:security', 'Security & access', 'lock'],
      ['platform:health', 'Health & alerts', 'chart'],
      ['platform:storage', 'Storage & backups', 'archive'],
      ['audit', 'Audit & logs', 'file'],
    ];
  }
  items.push(['home', 'My PHOENIX', 'home']);
  if (hasChats()) items.push(['messages', 'Messages', 'message']);
  add('pathways', 'pathway', 'Pathway', 'route', r !== 'C' && r !== 'O');
  add('projects', 'projects', r === 'F' ? 'Project reviews' : 'Projects', 'folder');
  add('circles', 'circles', 'Circles', 'users');
  add('ropeteams', 'ropeteams', 'Rope Teams', 'route');
  add('rooms', 'rooms', W + 's', 'room');
  add('opportunities', 'opportunities', 'Opportunities', 'megaphone');
  add('matching', 'matches', 'Match Briefs', 'link');
  add('evidence', 'evidence', r === 'S' || r === 'O' ? 'Approved evidence' : 'Evidence', 'award');
  add('repository', 'repository', 'Repository', 'archive');
  add('harvest', 'harvests', 'Learning Harvests', 'sparkle');
  if (can('funding')) items.push(['funding', r === 'S' ? 'Projects & funding' : 'Funding', 'coin']);
  if (can('payments'))
    items.push([
      'billing',
      r === 'S' ? 'Seats & payments' : r === 'A' ? 'Products & payments' : 'Access & billing',
      'card',
    ]);
  if (r === 'O') items.push(['org', 'Organization workspace', 'building']);
  if (r === 'A') items.push(['admin', 'Programme admin', 'settings']);
  if (r === 'F' || r === 'A' || hasB('Reviewer') || hasB('Incident/Safety Owner'))
    items.push(['inbox', 'Review inbox', 'inbox']);
  items.push(['resources', 'Resources & guidance', 'file']);
  items.push([
    'incidents',
    r === 'A' && hasB('Incident/Safety Owner') ? 'Incidents & concerns' : 'Report a concern',
    'alert',
  ]);
  if (can('metrics') && r !== 'P') items.push(['metrics', 'Metrics & reports', 'chart']);
  if (r === 'A' || r === 'O') items.push(['audit', 'Audit log', 'file']);
  return items;
}
const PARENT = {
  project: 'projects',
  newproject: 'projects',
  circle: 'circles',
  rope: 'ropeteams',
  room: 'rooms',
  card: 'opportunities',
  newcard: 'opportunities',
  match: 'matches',
  newevidence: 'evidence',
  harvest: 'harvests',
};
const GROUP = {
  home: '',
  messages: '',
  pathway: '',
  projects: 'Work',
  circles: 'Work',
  ropeteams: 'Work',
  rooms: 'Work',
  opportunities: 'Discover',
  matches: 'Discover',
  evidence: 'Records',
  repository: 'Records',
  harvests: 'Records',
  funding: 'Access',
  billing: 'Access',
  org: 'Administration',
  admin: 'Administration',
  inbox: 'Administration',
  metrics: 'Administration',
  audit: 'Administration',
  incidents: 'Support',
  resources: 'Support',
  platform: 'Platform',
  tenants: 'Platform',
  roles: 'Platform',
  notifications: 'Platform',
};
function navCount(r) {
  const pid = myId();
  if (r === 'messages') return unreadTotal();
  if (r === 'inbox') return inboxItems().length;
  if (r === 'projects' && role() === 'F')
    return S.projects.filter(p => inCtx(p) && p.status === 'Submitted' && stewardOf(p)).length;
  if (r === 'matches')
    return S.matches.filter(
      m => m.status === 'Awaiting consent' && ((m.a === pid && !m.consentA) || (m.b === pid && !m.consentB)),
    ).length;
  if (r === 'ropeteams' && role() === 'M')
    return S.mentorReqs.filter(m => m.to === pid && m.status === 'Pending').length;
  return 0;
}
function sidebar() {
  const act = PARENT[UI.route] || UI.route;
  let last = null;
  const items = navItems()
    .map(([r, l, i]) => {
      const [rt, tb] = r.split(':');
      const on = rt === act && (rt !== 'platform' || (UI.p.tab || 'contexts') === (tb || 'contexts')) ? ' on' : '';
      const g = role() === 'T' ? '' : rt === 'metrics' && !['A', 'O'].includes(role()) ? 'Insights' : GROUP[rt] || '';
      let sec = '';
      if (g !== last && g) {
        sec = `<div class="navsec">${g}</div>`;
      }
      last = g;
      const n = navCount(rt);
      return `${sec}<a href="#" class="nav${on}" data-a="go" data-r="${rt}"${tb ? ` data-tab="${tb}"` : ''} title="${h(l)}"${on ? ' aria-current="page"' : ''}>${ic(i)}<span class="t">${h(l)}</span>${n ? `<span class="ncount">${n}</span>` : ''}</a>`;
    })
    .join('');
  return `<aside class="side" aria-label="Main navigation"><a href="#" class="brand" data-a="go" data-r="home"><span class="mark">P</span><span class="wm"><b>PHOENIX</b><span>Foundation Alpha</span></span></a><nav class="col" style="gap:2px">${items}<div class="sep"></div>${role() !== 'T' ? `<div class="navsec">Account</div><a href="#" class="nav${UI.route === 'privacy' ? ' on' : ''}" data-a="go" data-r="privacy" title="Privacy & consent">${ic('shield')}<span class="t">Privacy & consent</span></a>` : ''}<a href="#" class="nav${UI.route === 'profile' ? ' on' : ''}" data-a="go" data-r="profile" title="Profile">${ic('user')}<span class="t">Profile</span></a><a href="#" class="nav out" data-a="logout" title="Log out">${ic('logout')}<span class="t">Log out</span></a></nav></aside>`;
}
function topbar() {
  const a = asg(),
    c = ctx();
  const others = S.assign.filter(x => x.pid === myId()).length;
  const unread = S.notifs.filter(n => n.pid === myId() && !n.read).length;
  return `<header class="top"><div class="mbrand" style="align-items:center"><span class="mark" style="width:32px;height:32px;font-size:14px">P</span></div>
 <button class="ctx" type="button" data-a="switcher" aria-label="Switch role or context. Current: ${h(c?.name)}, ${ROLE[a.role]}" title="${h(c?.name)} · ${ROLE[a.role]}">${ctxOrgMark()}<span class="ctxt"><b>${h(c?.name)}</b><small>${ROLE[a.role]}${a.bundles.length ? ' · +' + a.bundles.length + ' bundle' + (a.bundles.length > 1 ? 's' : '') : ''}</small></span>${others > 1 ? ic('chev', 16) : ''}</button>
 <div class="grow"></div>
 ${can('ai') ? `<button type="button" class="btn btn-s btn-sm askbtn ${UI.panel === 'ask' ? 'on' : ''}" data-a="askToggle" aria-expanded="${UI.panel === 'ask'}" aria-controls="assist" title="Ask PHOENIX">${ic('sparkle', 16)}<span class="hide-md">Ask PHOENIX</span></button>` : ''}
 <div class="nwrap"><button class="iconbtn ${UI.panel === 'notif' ? 'on' : ''}" type="button" data-a="notifToggle" aria-haspopup="dialog" aria-expanded="${UI.panel === 'notif'}" aria-label="Notifications, ${unread} unread">${ic('bell')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>${UI.panel === 'notif' ? notifMenu() : ''}</div>
 <button class="who" type="button" data-a="go" data-r="profile" aria-label="Your profile"><span class="av">${ini(myId())}</span><span class="hide-sm">${h(me().display)}</span></button></header>`;
}
const SHORT = {
  home: 'Home',
  messages: 'Chats',
  pathway: 'Pathway',
  projects: 'Projects',
  circles: 'Circles',
  ropeteams: 'Rope',
  rooms: 'Rooms',
  opportunities: 'Discover',
  matches: 'Matches',
  evidence: 'Evidence',
  funding: 'Funding',
  billing: 'Billing',
  platform: 'Contexts',
  tenants: 'Orgs',
  roles: 'Roles',
  audit: 'Audit',
  org: 'Org',
  admin: 'Admin',
  inbox: 'Inbox',
  resources: 'Guides',
};
function bottomnav() {
  const act = PARENT[UI.route] || UI.route;
  const it = navItems()
    .filter((x, i, a) => a.findIndex(y => y[0].split(':')[0] === x[0].split(':')[0]) === i)
    .slice(0, 4);
  return `<nav class="bnav" aria-label="Primary">${it
    .map(([r, l, i]) => {
      const rt = r.split(':')[0];
      return `<a href="#" class="bn${act === rt ? ' on' : ''}" data-a="go" data-r="${rt}"><span class="bi">${ic(i, 20)}</span>${SHORT[rt] || h(l.split(' ')[0])}</a>`;
    })
    .join('')}<a href="#" class="bn" data-a="moreNav"><span class="bi">${ic('more', 20)}</span>More</a></nav>`;
}
function deniedView(m) {
  return `<div class="denied card"><span class="tile t-soft" style="width:56px;height:56px;margin:0 auto">${ic('lock', 24)}</span><h1 class="h2" style="margin-top:12px">You do not have access to this area</h1><p class="muted" style="margin-top:8px">Your effective permission for <b>${h(m)}</b> as ${ROLE[role()]} in ${h(ctx()?.name)} is: <b>${LV[lvl(m)] || 'no access'}</b>.</p><p class="cap" style="margin-top:8px">Effective permission = identity + scoped role + context + mandate + object permission + consent + lifecycle state + entitlement. This attempt has been recorded.</p><div style="margin-top:16px">${B('Back to My PHOENIX', 'go', { r: 'home' }, 'btn-p')}</div></div>`;
}
// ---- routes
const ROUTES = {}; // name:{mod, view}
function route(name, mod, view) {
  ROUTES[name] = { mod, view };
}
function render() {
  const el = document.getElementById('app');
  let html;
  // Entrance motion only when the screen or the modal actually changes, never on in-place re-renders.
  const rk = UI.route + '|' + (UI.p.id || '');
  const enter = UI._rk !== rk;
  UI._rk = rk;
  const menter = UI.modal && UI._sig !== UI.route + '|' + UI.modal.title;
  const pub = ['login', 'register', 'invite', 'verify', 'pending', 'forgot', 'lms', 'mfa'];
  if (!S.session) {
    html = (PUB[UI.route] || PUB.login)();
  } else {
    const a = asg();
    tick();
    if (a.status !== 'Active') {
      html = PUB.pending();
    } else if (
      !a.onb.agreement ||
      (reaccept() && !['privacy'].includes(UI.route)) ||
      !a.onb.consents ||
      !a.onb.profile ||
      (!a.onb.compass && a.role === 'P')
    ) {
      html = ONB();
    } else {
      const R = ROUTES[UI.route] || ROUTES.home;
      let inner;
      if (R.mod && R.mod !== 'any' && !(can(R.mod) || (R.tech && lvl(R.mod).match(/[TM]/)))) {
        audit('Access denied', UI.route, 'Route guard: ' + LV[lvl(R.mod)], 'denied');
        inner = deniedView(R.mod);
      } else {
        try {
          inner = R.view();
        } catch (e) {
          console.error(e);
          inner = banner('err', 'Something went wrong on this screen', h(e.message));
        }
      }
      html = `<div class="ph"><div class="app">${sidebar()}<div class="main">${topbar()}<main class="content${enter ? ' enter' : ''}" id="main">${inner}</main>${bottomnav()}</div></div></div>`;
    }
  }
  if (UI.modal)
    html += `<div class="mback${menter ? ' enter' : ''}" data-a="mback"><div class="modal ${UI.modal.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="row" style="justify-content:space-between"><h2 class="h2" id="mt">${UI.modal.title}</h2><button class="iconbtn" type="button" data-a="closeM" aria-label="Close">${ic('x')}</button></div>${typeof UI.modal.body === 'function' ? UI.modal.body() : UI.modal.body}</div></div>`;
  if (UI.toast)
    html += `<div class="toast" role="${UI.toast.k === 'err' ? 'alert' : 'status'}"><div class="banner b-${UI.toast.k === 'err' ? 'err' : UI.toast.k === 'warn' ? 'warn' : 'ok'}">${ic(UI.toast.k === 'ok' ? 'check' : 'alert')}<div style="flex:1"><p>${h(UI.toast.t)}</p></div><button class="iconbtn" style="width:28px;height:28px;margin:-4px -6px 0 0" type="button" data-a="toastX" aria-label="Dismiss">${ic('x', 16)}</button></div></div>`;
  if (UI.busy)
    html += `<div class="busy" role="status" aria-live="polite"><div class="busy-box"><span class="spin"></span><b>${h(UI.busy)}</b></div></div>`;
  snapForms();
  const sig = UI.route + '|' + (UI.modal ? UI.modal.title : '');
  const fm = UI.modal && UI._sig !== sig;
  UI._sig = sig;
  UI._cleared = new Set();
  el.innerHTML = `<div class="ph" style="min-height:100vh">${html}</div>`;
  document.body.style.overflow = UI.modal ? 'hidden' : '';
  el.querySelectorAll('.tabs').forEach(t => {
    const on = t.querySelector('.tab.on');
    if (on && on.offsetLeft - t.offsetLeft + on.offsetWidth > t.clientWidth)
      t.scrollLeft = on.offsetLeft - t.offsetLeft - 16;
  });
  if (fm) {
    const f =
      el.querySelector(
        '.modal form input:not([type=hidden]):not([readonly]):not([type=checkbox]),.modal form select,.modal form textarea',
      ) || el.querySelector('.modal .btn');
    if (f) f.focus();
  }
  AFTER.forEach(fn => {
    try {
      fn(el);
    } catch (e) {
      console.error(e);
    }
  });
}
// Post-render hooks (scroll positions, focus) registered by view modules.
const AFTER = [];
function snapForms() {
  const el = document.getElementById('app');
  if (!el) return;
  const sig = UI.route + '|' + (UI.modal ? UI.modal.title : '');
  if (UI._sig !== sig) return;
  el.querySelectorAll('form[data-f]').forEach(f => {
    const n = f.dataset.f;
    if (UI._cleared && UI._cleared.has(n)) return;
    const d = { ...(UI.form[n] || {}) };
    f.querySelectorAll('input,select,textarea').forEach(i => {
      if (!i.name || i.type === 'password' || i.type === 'file' || i.type === 'hidden') return;
      if (i.type === 'checkbox') {
        if (f.querySelectorAll(`[name="${i.name}"]`).length === 1) d[i.name] = i.checked ? 'yes' : '';
      } else if (i.type === 'radio') {
        if (i.checked) d[i.name] = i.value;
      } else d[i.name] = i.value;
    });
    UI.form[n] = d;
  });
}
function busy(t, fn, ms = 700) {
  UI.busy = t;
  render();
  setTimeout(() => {
    UI.busy = null;
    fn();
  }, ms);
}
// ---- events
const A = {},
  F = {};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const a = el.dataset.a;
  if (a === 'mback' && e.target !== el) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault();
  if (A[a]) A[a](el.dataset, el, e);
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (!f.dataset.f) return;
  e.preventDefault();
  const d = {};
  new FormData(f).forEach((v, k) => {
    if (d[k] != null) {
      d[k] = [].concat(d[k], v);
    } else d[k] = v;
  });
  const sb = e.submitter;
  if (sb && sb.name) d[sb.name] = sb.value;
  if (F[f.dataset.f]) F[f.dataset.f](d, f);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]');
  if (!el) return;
  if (A[el.dataset.ch]) A[el.dataset.ch](el.dataset, el);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && UI.modal && !(e.target.classList && e.target.classList.contains('msel-q'))) closeM();
  else if (e.key === 'Escape' && !UI.modal && UI.panel) closePanel();
});
A.go = d => {
  const p = { ...d };
  delete p.a;
  delete p.r;
  go(d.r, p);
};
A.tab = d => {
  UI.tab[d.k] = d.v;
  delete UI.p.tab;
  render();
};
A.closeM = closeM;
A.mback = closeM;
// Confirmation step for destructive or hard-to-reverse actions. The confirmed action still passes the guard layer.
const CB = (label, act, data, msg, cls = 'btn-s btn-sm', yes) =>
  B(label, 'confirmAct', { ...data, act, msg, yes: yes || String(label).replace(/<[^>]+>/g, '') }, cls);
A.confirmAct = d => {
  const { act, msg, yes, a, ...rest } = d;
  modal(
    'Please confirm',
    `<p class="muted">${h(msg)}</p><div class="actions">${B('Cancel', 'closeM')}${B(h(yes), 'confirmYes', { ...rest, act }, 'btn-d btn-sm')}</div>`,
  );
};
A.confirmYes = d => {
  const { act, a, ...rest } = d;
  UI.modal = null;
  if (A[act]) A[act](rest);
};
A.toastX = () => {
  UI.toast = null;
  render();
};
document.addEventListener('change', e => {
  const i = e.target;
  if (i.type === 'file') {
    const l = i.closest('.field,.dz,label,form');
    const t = l && l.querySelector('.fname');
    if (t)
      t.textContent = i.files[0]
        ? i.files[0].name + ' · ' + (i.files[0].size / 1048576).toFixed(2) + ' MB'
        : 'No file chosen';
  }
});
const resetUI = () => {
  UI.tab = {};
  UI.form = {};
  UI.err = {};
  UI.q = {};
  UI.p = {};
  UI.modal = null;
  UI.chat = {};
  UI.panel = null;
};
A.logout = () => {
  audit('Signed out', 'session', '');
  S.session = null;
  save();
  resetUI();
  UI.route = 'login';
  render();
};
A.switcher = () => {
  const list = S.assign.filter(x => x.pid === myId());
  if (list.length < 2) {
    toast('You hold one role in one context.', 'warn');
    render();
    return;
  }
  modal(
    'Switch role or context',
    `<p class="muted">My PHOENIX changes to the role and context you choose. Permissions always come from that context-scoped assignment.</p><div class="col" style="gap:8px">${list.map(x => `<button class="demo-acc" type="button" data-a="doSwitch" data-id="${x.id}"><span class="tile t-soft">${ic('users', 18)}</span><span class="col" style="flex:1"><b>${h(S.contexts.find(c => c.id === x.ctx).name)}</b><span class="cap">${ROLE[x.role]}${x.bundles.length ? ' · ' + x.bundles.join(', ') : ''}</span></span>${x.id === S.session.aid ? pill('Current', 'p-teal') : pill(x.status)}</button>`).join('')}</div>`,
  );
};
A.doSwitch = d => {
  resetUI();
  S.session.aid = d.id;
  audit('Context switched', 'session', d.id);
  save();
  go('home');
};
A.moreNav = () =>
  modal(
    'Menu',
    `<div class="col" style="gap:4px">${navItems()
      .filter((x, i, a) => a.findIndex(y => y[0].split(':')[0] === x[0].split(':')[0]) === i)
      .slice(4)
      .map(([r, l, i]) => {
        const [rt, tb] = r.split(':');
        return `<a href="#" class="nav" data-a="go" data-r="${rt}"${tb ? ` data-tab="${tb}"` : ''}>${ic(i)}<span>${h(l)}</span></a>`;
      })
      .join(
        '',
      )}${can('ai') ? `<a href="#" class="nav" data-a="go" data-r="ask">${ic('sparkle')}<span>Ask PHOENIX</span></a>` : ''}${role() !== 'T' ? `<a href="#" class="nav" data-a="go" data-r="privacy">${ic('shield')}<span>Privacy & consent</span></a>` : ''}<a href="#" class="nav out" data-a="logout">${ic('logout')}<span>Log out</span></a></div>`,
  );
A.read = d => {
  const n = S.notifs.find(x => x.id === d.id);
  if (n) {
    n.read = true;
    save();
    go(n.r, n.p);
  }
};
A.resetDemo = () =>
  modal(
    'Reset demo data?',
    '<p class="muted">All changes made in this browser are discarded and the sample data is restored.</p><div class="actions">' +
      B('Cancel', 'closeM') +
      B('Reset', 'doReset', {}, 'btn-d btn-sm') +
      '</div>',
  );
A.doReset = () => {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  S = freshData();
  migrate();
  UI.form = {};
  UI.err = {};
  UI.tab = {};
  UI.chat = {};
  save();
  go('login');
  toast('Demo data reset.');
};
// Seed plus the derived records that boot needs (project sections, migrations).
function freshData() {
  const d = seed();
  d.projects.forEach(p => {
    if (!p.sections && p.status !== 'Draft') {
      const dr = draftSections(p.title, p.desc || p.title + '.', p.type);
      p.desc = p.desc || dr[0];
      p.sections = SECTIONS.map((x, i) => ({ text: dr[i], ai: true, st: i % 3 === 1 ? 'Edited' : 'Accepted' }));
    }
  });
  return d;
}

function boot() {
  try {
    S = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    S = null;
  }
  if (!S || S.v !== 5) {
    S = freshData();
    save();
  }
  migrate();
  save();
  if (S.session && !S.assign.find(a => a.id === S.session.aid)) S.session = null;
  UI.route = S.session ? 'home' : 'login';
  render();
}
