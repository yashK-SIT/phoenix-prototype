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
// Optional processing purposes are covered by the agreement (product decision): there is no separate opt-in.
// Legal basis to be confirmed by the WSS Trust/Data Steward before any real data is processed.
const consent = () => 'Granted';
const ent = pid => S.ents.filter(e => e.pid === pid && e.ctx === ctxId() && ['Active', 'Grace'].includes(e.state));
const inCtx = o => !o.ctx || o.ctx === ctxId();
const reaccept = () => {
  const a = asg();
  if (!a) return null;
  const g = S.agreements.find(g => g.ctx === a.ctx && g.status === 'Active' && g.roles.includes(roleBase(a.role)));
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
  if (UI.panel === 'notif' || UI.panel === 'user') UI.panel = null;
  if (UI.drawer) UI.drawer = false;
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
  return `${crumbs ? crumbsHtml(crumbs) : ''}<div class="phead"><div class="phead-t"><div class="row wrap" style="gap:10px"><h1 class="h1">${t}</h1>${badges.join('')}</div>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right.trim() ? `<div class="phead-a">${right}</div>` : ''}</div>`;
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
// ---- review conversation: messages between whoever submitted something and the people reviewing it, shown
// with the activity log, oldest first. Each object kind registers in CONVO:
//   get(id) → object · acts(o) → [{at, by, t}] · role(o, pid) → label · post(o) → null or {kind, label}
//   notify(o, kind) → tells the other parties.
const CONVO = {};
const CV_KIND = {
  clarify: ['Clarification requested', 'p-amber'],
  reply: ['Reply', 'p-navy'],
  resubmit: ['Resubmitted', 'p-navy'],
  reject: ['Rejected', 'p-red'],
  approve: ['Approved', 'p-green'],
};
const convoAdd = (o, kind, text) =>
  (o.thread = o.thread || []).push({ id: uid('m'), at: now(), by: myId(), kind, text });
const convoN = o => (o.thread || []).length;
function convoHtml(kind, o) {
  const c = CONVO[kind];
  const items = [...(o.thread || []).map(m => ({ ...m, msg: true })), ...c.acts(o)].sort((a, b) =>
    String(a.at).localeCompare(String(b.at)),
  );
  const pm = c.post(o);
  const list = items.length
    ? `<ol class="cv">${items
        .map(x => {
          if (!x.msg)
            return `<li class="cv-a">${ic('clock', 14)}<span class="cv-at">${h(x.t)}</span><span class="cap">${x.by ? nm(x.by) + ' · ' : ''}<time datetime="${h(x.at)}">${fmt(x.at)}</time></span></li>`;
          const mine = x.by === myId();
          const lab = c.role(o, x.by);
          const k = CV_KIND[x.kind];
          return `<li class="cv-m${mine ? ' mine' : ''}"><span class="av">${ini(x.by)}</span><div class="cv-b"><div class="cv-h"><b>${mine ? 'You' : nm(x.by)}</b>${lab ? `<span class="cap">${h(lab)}</span>` : ''}${k ? pill(k[0], k[1]) : ''}<time class="cap" datetime="${h(x.at)}">${fmt(x.at)}</time></div><p>${h(x.text)}</p></div></li>`;
        })
        .join('')}</ol>`
    : '<p class="cap">No messages or activity yet.</p>';
  const form = pm
    ? `<form data-f="cv" class="cv-f" novalidate><input type="hidden" name="k" value="${kind}"><input type="hidden" name="id" value="${h(o.id)}">${fi('cv', 'text', pm.label, { type: 'textarea', rows: 3, req: true, max: 2000, ph: 'Write a message. Everyone in this review sees it.' })}<div class="actions"><span class="help">Messages are kept with the full history and cannot be edited.</span><button class="btn btn-p btn-sm" type="submit">${ic('send', 14)}Post</button></div></form>`
    : '';
  return `<div class="col" style="gap:14px">${list}${form}</div>`;
}
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
    ctl = `<input id="${id}" name="${n}" class="input${ec}" type="${o.type || 'text'}" value="${h(v)}" placeholder="${h(o.ph || '')}" ${o.ro ? 'readonly' : ''} ${o.min != null ? `min="${o.min}"` : ''} ${o.maxv != null ? `max="${o.maxv}"` : ''} ${o.step ? `step="${o.step}"` : ''} aria-invalid="${!!e}" ${o.auto ? `autocomplete="${o.auto}"` : ''}>`;
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
// ---- date of birth: a real past date, not more than 120 years ago. No minimum age is enforced (policy not set).
const dobOk = v => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  // Parsed as UTC so the round-trip check holds in every time zone.
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === v && v < today() && +v.slice(0, 4) >= new Date().getFullYear() - 120;
};
const dobRules = req => [
  ...(req ? [['req', 'Enter your date of birth.']] : []),
  ['fn', { f: v => !v || dobOk(v), m: 'Enter a valid date of birth in the past.' }],
];
const dobField = (f, value, o = {}) =>
  fi(f, 'dob', 'Date of birth', { type: 'date', req: o.req !== false, value, maxv: today(), auto: 'bday', vis: 'You and authorised administration', ...o });
// Accounts are soft-deleted; a deleted account no longer matches an email address.
const personByEmail = e => S.people.find(p => p.status !== 'Deleted' && (p.email || '').toLowerCase() === String(e || '').trim().toLowerCase());
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
      ['roles', 'Role management', 'shield'],
      ['policies', 'Policies & agreements', 'file'],
      ['compassqs', 'Purpose Compass', 'target'],
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
  add('harvest', 'harvests', 'Learning Harvests', 'sparkle', r !== 'S');
  if (can('funding')) items.push(['funding', r === 'S' ? 'Projects & funding' : 'Funding', 'coin']);
  if (can('payments') && r === 'A')
    items.push([
      'billing',
      r === 'S' ? 'Seats & payments' : r === 'A' ? 'Products & payments' : 'Access & billing',
      'card',
    ]);
  if (r === 'O') items.push(['org', 'Organization workspace', 'building']);
  if (r === 'A') items.push(['admin', 'Programme admin', 'settings']);
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
      const on = rt === act && (rt !== 'platform' || (UI.p.tab || 'integrations') === (tb || 'integrations')) ? ' on' : '';
      const g = role() === 'T' ? '' : rt === 'metrics' && !['A', 'O'].includes(role()) ? 'Insights' : GROUP[rt] || '';
      let sec = '';
      if (g !== last && g) {
        sec = `<div class="navsec"><span>${g}</span></div>`;
      }
      last = g;
      const n = navCount(rt);
      return `${sec}<a href="#" class="nav${on}" data-a="go" data-r="${rt}"${tb ? ` data-tab="${tb}"` : ''} data-tip="${h(l)}"${on ? ' aria-current="page"' : ''}>${ic(i)}<span class="t">${h(l)}</span><span class="ts" aria-hidden="true">${h(SHORT[rt] || l.split(' ')[0])}</span>${n ? `<span class="ncount" aria-label="${n} new">${n}</span>` : ''}</a>`;
    })
    .join('');
  const c = ctx();
  return `<aside class="side" id="side-nav" aria-label="Main navigation"${UI.drawer ? ' role="dialog" aria-modal="true"' : ''}><div class="side-plate"><a href="#" class="brand" data-a="go" data-r="home" aria-label="PHOENIX home"><span class="mark">${MARK()}</span><span class="wm"><b>PHOENIX</b><span>Foundation Alpha</span></span></a>${c && c.kind !== 'Platform' ? `<div class="side-ctx"><small>${h(c.kind || 'Programme')}</small><span title="${h(c.name)}">${h(c.name)}</span></div>` : `<div class="side-ctx"><small>Workspace</small><span>Platform operations</span></div>`}</div><nav class="side-nav" aria-label="Sections">${items}</nav><div class="side-foot"><button type="button" class="nav side-close" data-a="drawerClose">${ic('x')}<span class="t">Close menu</span></button></div></aside>`;
}
// The PHOENIX mark: an ember plume rising from a baseline.
const MARK = (s = 20) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.6 2.8c2.9 3 4.6 6 4.6 8.8a5.2 5.2 0 0 1-10.4.2c0-2 .9-3.8 2.3-5.2.1 1.9 1 3.2 2.4 3.7-.7-2.6-.3-5.1 1.1-7.5z" fill="currentColor"/><path d="M5 20.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`;
// Breadcrumb trail: [[label, route, params], …]; the last item is the current page and is not a link.
const crumbsHtml = list =>
  `<ol class="crumbs" aria-label="Breadcrumb">${list.map(([l, r, p], i) => (i < list.length - 1 && r ? `<li>${L(l, r, p, '')}</li>` : `<li><span aria-current="page">${l}</span></li>`)).join('')}</ol>`;
function topbar() {
  const a = asg(),
    c = ctx();
  const others = roleChoices().length;
  const unread = S.notifs.filter(n => n.pid === myId() && !n.read).length;
  return `<header class="top"><button class="iconbtn menubtn" type="button" data-a="drawerToggle" aria-label="Open navigation" aria-controls="side-nav" aria-expanded="${!!UI.drawer}">${ic('menu', 20)}</button><a href="#" class="mbrand" data-a="go" data-r="home" aria-label="PHOENIX home"><span class="mark">${MARK(16)}</span></a>
 <button class="ctx" type="button" data-a="switcher" aria-label="${h(me().name)}, ${h(ROLE[a.role])}${others > 1 ? '. Switch role' : ''}" title="${h(me().name)} · ${h(ROLE[a.role])}"><span class="ctxt"><b>${h(me().name)}</b><small>${h(ROLE[a.role])}${a.bundles.length ? ' · +' + a.bundles.length + ' bundle' + (a.bundles.length > 1 ? 's' : '') : ''}</small></span>${others > 1 ? ic('chev', 16) : ''}</button>
 <div class="grow"></div>
 ${can('ai') ? `<button type="button" class="btn btn-s btn-sm askbtn ${UI.panel === 'ask' ? 'on' : ''}" data-a="askToggle" aria-label="Ask PHOENIX" aria-expanded="${UI.panel === 'ask'}" aria-controls="assist" title="Ask PHOENIX">${ic('sparkle', 16)}<span class="hide-md">Ask PHOENIX</span></button>` : ''}
 <div class="nwrap"><button class="iconbtn ${UI.panel === 'notif' ? 'on' : ''}" type="button" data-a="notifToggle" aria-haspopup="dialog" aria-expanded="${UI.panel === 'notif'}" aria-label="Notifications, ${unread} unread">${ic('bell')}${unread ? `<span class="badge">${unread}</span>` : ''}</button>${UI.panel === 'notif' ? notifMenu() : ''}</div>
 <div class="uwrap"><button class="who ${UI.panel === 'user' ? 'on' : ''}" type="button" data-a="userToggle" aria-haspopup="menu" aria-expanded="${UI.panel === 'user'}" aria-controls="user-menu" aria-label="Account menu for ${h(me().name)}"><span class="av">${ini(myId())}</span><span class="hide-sm">${h(me().display)}</span><span class="who-chev">${ic('chev', 14)}</span></button>${UI.panel === 'user' ? userMenu() : ''}</div></header>`;
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
  platform: 'Platform',
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
      !a.onb.profile ||
      (!a.onb.compass && roleBase(a.role) === 'P')
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
      const pg = reaccept();
      html = `<div class="ph"${pg ? ' inert' : ''}><a href="#main" class="skip" data-a="skipMain">Skip to content</a><div class="app${UI.compact ? ' is-compact' : ''}${UI.drawer ? ' is-drawer' : ''}" data-route="${h(UI.route)}">${sidebar()}${UI.drawer ? '<div class="scrim" data-a="drawerClose" aria-hidden="true"></div>' : ''}<div class="main">${topbar()}<main class="content${enter ? ' enter' : ''}" id="main" tabindex="-1">${inner}</main>${bottomnav()}</div></div></div>${pg ? policyGate(pg) : ''}`;
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
  else if (e.key === 'Escape' && !UI.modal && UI.drawer) A.drawerClose();
  else if (e.key === 'Escape' && !UI.modal && UI.panel) closePanel();
  else if (e.key === 'Tab' && UI.drawer && !UI.modal) {
    const f = [...document.querySelectorAll('#side-nav a, #side-nav button')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) {
      e.preventDefault();
      f[0].focus();
    }
  }
});
// ---- shell: drawer (phones and tablets), compact sidebar (desktop, remembered), theme (remembered per viewer)
A.drawerToggle = () => (UI.drawer ? A.drawerClose() : A.drawerOpen());
A.drawerOpen = () => {
  UI.drawer = true;
  render();
  setTimeout(() => (document.querySelector('#side-nav .nav.on') || document.querySelector('#side-nav .nav'))?.focus(), 0);
};
A.drawerClose = () => {
  UI.drawer = false;
  render();
  setTimeout(() => document.querySelector('.menubtn')?.focus(), 0);
};
A.sideCompact = () => {
  UI.compact = !UI.compact;
  try {
    localStorage.setItem('phx-compact', UI.compact ? '1' : '');
  } catch (e) {}
  render();
};
A.skipMain = () => document.getElementById('main')?.focus();
const applyTheme = () => {
  const t = UI.theme || 'light';
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
};
A.setTheme = d => {
  UI.theme = d.v;
  try {
    localStorage.setItem('phx-theme', d.v);
  } catch (e) {}
  applyTheme();
  render();
};
try {
  UI.compact = false; // the sidebar is always full width on desktop
  UI.theme = localStorage.getItem('phx-theme') || 'light';
} catch (e) {
  UI.theme = 'light';
}
applyTheme();
A.go = d => {
  const p = { ...d };
  delete p.a;
  delete p.r;
  go(d.r, p);
};
A.tab = d => {
  UI.tab[d.k] = d.v;
  if (UI.snav && UI.snav[d.k]) UI.snav[d.k].mobile = false; // choosing a section folds the phone panel
  delete UI.p.tab;
  render();
};
A.closeM = closeM;
A.mback = closeM;
// Posting in a review conversation keeps any open dialog open, so the new message shows in place.
F.cv = d => {
  const c = CONVO[d.k];
  const o = c && c.get(d.id);
  const pm = o && c.post(o);
  if (!pm) return render();
  if (!validate('cv', d, { text: [['req', 'Write a message first.'], ['min', 2]] })) return render();
  convoAdd(o, pm.kind, d.text.trim());
  c.notify(o, pm.kind);
  audit(pm.kind === 'reply' ? 'Clarification reply posted' : 'Review comment posted', o.id, d.text.trim());
  clearF('cv');
  toast('Message posted.');
  ok();
};
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
// The switcher lists roles, not programmes: one entry per distinct role the person holds.
function roleChoices(pid = myId()) {
  const cur = S.session ? asg() : null;
  const out = [];
  S.assign
    .filter(x => x.pid === pid)
    .forEach(x => {
      const i = out.findIndex(y => y.role === x.role);
      if (i < 0) out.push(x);
      else if ((cur && x.id === cur.id) || (out[i].status !== 'Active' && x.status === 'Active')) out[i] = x;
    });
  return out;
}
A.switcher = () => {
  const list = roleChoices();
  if (list.length < 2) {
    toast('You hold one role.', 'warn');
    render();
    return;
  }
  modal(
    'Switch role',
    `<p class="muted">My PHOENIX changes to the role you choose. What you can see and do follows that role.</p><div class="col" style="gap:8px">${list.map(x => `<button class="demo-acc" type="button" data-a="doSwitch" data-id="${x.id}"><span class="tile t-soft">${ic('user', 18)}</span><span class="col" style="flex:1"><b>${h(ROLE[x.role])}</b><span class="cap">${x.bundles.length ? h(x.bundles.join(', ')) : 'No extra bundles'}</span></span>${x.id === S.session.aid ? pill('Current', 'p-teal') : pill(x.status)}</button>`).join('')}</div>`,
  );
};
// A policy published in another tab reaches this one straight away.
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue || !S || !S.session) return;
  try {
    const n = JSON.parse(e.newValue);
    if (n && n.agreements && JSON.stringify(n.agreements) !== JSON.stringify(S.agreements)) {
      S.agreements = n.agreements;
      render();
    }
  } catch (x) {}
});
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
      )}${can('ai') ? `<a href="#" class="nav" data-a="go" data-r="ask">${ic('sparkle')}<span>Ask PHOENIX</span></a>` : ''}${role() !== 'T' ? `<a href="#" class="nav" data-a="go" data-r="privacy">${ic('shield')}<span>Privacy & agreements</span></a>` : ''}<a href="#" class="nav out" data-a="logout">${ic('logout')}<span>Log out</span></a></div>`,
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

// ---------- Nested workspace navigation (Circles, Rope Teams, Action Rooms) ----------
// Same contract as tabs(): returns { cur, html } and selects through A.tab, so views keep their logic. Sections are
// grouped under expandable parents; on phones the whole panel folds behind one "Sections" toggle.
// opts: { label, groups: [[groupLabel, icon, [ids…]], …], others: [[label, route, params], …] (sibling spaces) }
UI.snav = UI.snav || {};
function subnav(k, items, def, opts = {}) {
  items = items.filter(Boolean);
  const t = tabs(k, items, def);
  const cur = t.cur;
  const byId = Object.fromEntries(items.map(i => [i[0], i]));
  const used = new Set();
  const groups = (opts.groups || [])
    .map(([gl, gi, ids]) => [gl, gi, ids.filter(id => byId[id] && !used.has(id) && used.add(id))])
    .filter(g => g[2].length);
  const rest = items.map(i => i[0]).filter(id => !used.has(id));
  if (rest.length) groups.push([groups.length ? 'More' : '', 'more', rest]);
  const st = (UI.snav[k] = UI.snav[k] || {});
  const sid = String(k).replace(/[^\w-]/g, '_');
  const item = id => {
    const [, l, c] = byId[id];
    const on = id === cur;
    return `<li><button type="button" class="snav-i${on ? ' on' : ''}" data-a="tab" data-k="${h(k)}" data-v="${h(id)}"${on ? ' aria-current="page"' : ''}><span class="snav-l">${l}</span>${c != null ? `<span class="cnt">${c}</span>` : ''}</button></li>`;
  };
  const list = groups
    .map(([gl, gi, ids], n) => {
      if (!gl) return `<ul class="snav-sub" role="list">${ids.map(item).join('')}</ul>`;
      const hasCur = ids.includes(cur);
      const open = st[n] != null ? st[n] : true;
      const gid = `snav-${sid}-${n}`;
      return `<li class="snav-g${hasCur ? ' has-cur' : ''}"><button type="button" class="snav-p" data-a="snavGroup" data-k="${h(k)}" data-v="${n}" aria-expanded="${open}" aria-controls="${gid}">${ic(gi, 16)}<span class="snav-l">${h(gl)}</span>${hasCur && !open ? '<span class="snav-dot" aria-hidden="true"></span>' : ''}<span class="snav-chev">${ic('chev', 14)}</span></button><ul class="snav-sub" id="${gid}" role="list"${open ? '' : ' hidden'}>${ids.map(item).join('')}</ul></li>`;
    })
    .join('');
  const others = (opts.others || []).length
    ? `<div class="snav-others"><span class="snav-h">${h(opts.othersLabel || 'Switch to')}</span><ul role="list">${opts.others.map(([l, r, p]) => `<li>${L(`<span class="snav-l">${l}</span>`, r, p, 'snav-o')}</li>`).join('')}</ul></div>`
    : '';
  const open = !!st.mobile;
  const label = opts.label || 'Sections';
  return {
    cur,
    html: `<nav class="snav" aria-label="${h(label)}"><button type="button" class="snav-toggle" data-a="snavToggle" data-k="${h(k)}" aria-expanded="${open}" aria-controls="snav-${sid}"><span class="cap">${h(label)}</span><b>${byId[cur] ? byId[cur][1] : ''}</b>${ic('chev', 16)}</button><div class="snav-panel${open ? ' open' : ''}" id="snav-${sid}"><ul class="snav-list" role="list">${list}</ul>${others}</div></nav>`,
  };
}
// Lay a section body beside its sub-navigation.
const withSubnav = (t, body) => `<div class="snav-layout">${t.html}<div class="snav-main">${body}</div></div>`;
A.snavGroup = d => {
  const st = (UI.snav[d.k] = UI.snav[d.k] || {});
  st[d.v] = !(st[d.v] != null ? st[d.v] : true);
  render();
  document.querySelector(`.snav-p[data-k="${CSS.escape(d.k)}"][data-v="${d.v}"]`)?.focus();
};
A.snavToggle = d => {
  const st = (UI.snav[d.k] = UI.snav[d.k] || {});
  st.mobile = !st.mobile;
  render();
  document.querySelector(`.snav-toggle[data-k="${CSS.escape(d.k)}"]`)?.focus();
};
// ---------- PHOENIX Data View ----------
// One pattern for every collection: toolbar (search, quick filters, advanced filters, sort, actions), active-filter
// chips, a purpose-built list (or a table where columns earn it), row menus, optional selection with bulk actions,
// pagination with range, page numbers, rows per page and go-to-page, and announced results. View state only —
// it never changes the records it is given.
// o = {
//   label: 'projects' (plural noun), items: [...],
//   search: it => 'text to match', searchLabel?: 'Search projects',
//   quick: { label, options: [[value, label]], test: (it, v) => bool },            // chips / segmented, '' = all
//   filters: [{ key, label, options: [[value, label]], test: (it, v) => bool }],   // advanced (popover / drawer)
//   sorts: [[id, label, (a, b) => number]], defaultSort?: id, defaultDir?: 'asc' | 'desc' (e.g. newest first),
//   layout: 'list' | 'table',
//   row: it => ({ lead, title, sub, meta: [html], badges, primary, menu }),         // list layout
//   columns: [{ label, cell: it => html, sort?: sortId, num?: bool, hideSm?: bool }], // table layout
//   rowId: it => id, bulk: [{ label, icon?, danger?, confirm?: 'question', run: ids => void }],
//   actions: 'toolbar html', empty: [icon, title, text, actionsHtml], pageSize: 10, dense?: bool
// }
const DV = {};
UI.dv = UI.dv || {};
UI.dvOpen = UI.dvOpen || null;
UI.dvMenu = UI.dvMenu || null;
try {
  Object.assign(UI.dv, JSON.parse(sessionStorage.getItem('phx-dv') || '{}'));
} catch (e) {}
const dvSave = () => {
  try {
    const keep = {};
    Object.entries(UI.dv).forEach(([k, v]) => (keep[k] = { ...v, sel: [] }));
    sessionStorage.setItem('phx-dv', JSON.stringify(keep));
  } catch (e) {}
};
const dvState = (k, o) => {
  const st = (UI.dv[k] = UI.dv[k] || {});
  if (st.q == null) st.q = '';
  if (st.quick == null) st.quick = '';
  st.f = st.f || {};
  if (st.sort == null) st.sort = o.defaultSort || '';
  st.dir = st.dir || o.defaultDir || 'asc';
  st.page = st.page || 1;
  st.size = st.size || o.pageSize || 10;
  st.sel = st.sel || [];
  return st;
};
const dvPages = (cur, n) => {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, cur - 1),
    hi = Math.min(n - 1, cur + 1);
  if (lo > 2) out.push('…');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < n - 1) out.push('…');
  out.push(n);
  return out;
};
const dvLive = msg => {
  let el = document.getElementById('phx-live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phx-live';
    el.className = 'sr';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = '';
  setTimeout(() => (el.textContent = msg), 60);
};
function dataView(k, o) {
  DV[k] = o;
  const st = dvState(k, o);
  const noun = o.label || 'items';
  const all = o.items || [];
  const filters = o.filters || [];
  const qn = st.q.trim().toLowerCase();
  const fOn = Object.entries(st.f).filter(([fk, v]) => v && filters.some(x => x.key === fk));
  const quickTest = (it, v) => !v || !o.quick || o.quick.test(it, v);
  const base = all.filter(it => (!qn || String(o.search ? o.search(it) : '').toLowerCase().includes(qn)) && fOn.every(([fk, v]) => filters.find(x => x.key === fk).test(it, v)));
  let rows = base.filter(it => quickTest(it, st.quick));
  const srt = (o.sorts || []).find(x => x[0] === st.sort);
  if (srt) rows = rows.slice().sort((a, b) => srt[2](a, b) * (st.dir === 'desc' ? -1 : 1));
  const n = rows.length;
  const pages = Math.max(1, Math.ceil(n / st.size));
  if (st.page > pages) st.page = pages;
  const from = n ? (st.page - 1) * st.size + 1 : 0;
  const to = Math.min(n, st.page * st.size);
  const pageRows = rows.slice(from ? from - 1 : 0, to);
  const ids = o.rowId ? pageRows.map(o.rowId) : [];
  st.sel = st.sel.filter(id => all.some(it => o.rowId && o.rowId(it) === id));
  const kk = h(k);
  // toolbar
  const search = o.search
    ? `<div class="dv-search">${ic('search', 16)}<input type="search" class="input" data-dvq="${kk}" value="${h(st.q)}" placeholder="${h(o.searchLabel || 'Search ' + noun)}" aria-label="${h(o.searchLabel || 'Search ' + noun)}"></div>`
    : '';
  const quick = o.quick
    ? `<div class="seg dv-quick" role="group" aria-label="${h(o.quick.label)}">${[['', 'All'], ...o.quick.options]
        .map(([v, l]) => `<button type="button" data-a="dvQuick" data-k="${kk}" data-v="${h(v)}" aria-pressed="${st.quick === v}">${h(l)}<span class="cnt">${base.filter(it => quickTest(it, v)).length}</span></button>`)
        .join('')}</div>`
    : '';
  const fOpen = UI.dvOpen === k;
  const fbtn = filters.length
    ? `<div class="dv-fwrap"><button type="button" class="btn btn-s btn-sm${fOn.length ? ' is-on' : ''}" data-a="dvFilters" data-k="${kk}" aria-expanded="${fOpen}" aria-controls="dvf-${kk}">${ic('panel', 16)}Filters${fOn.length ? `<span class="cnt">${fOn.length}</span>` : ''}</button>${
        fOpen
          ? `<div class="dv-fpanel" id="dvf-${kk}" role="dialog" aria-label="Filter ${h(noun)}"><div class="dv-fpanel-h"><b>Filters</b><button type="button" class="iconbtn" data-a="dvFilters" data-k="${kk}" aria-label="Close filters">${ic('x', 16)}</button></div>${filters
              .map(x => `<label class="field"><span class="lbl">${h(x.label)}</span><select class="input" data-ch="dvFilter" data-k="${kk}" data-f="${h(x.key)}"><option value="">Any</option>${x.options.map(([v, l]) => `<option value="${h(v)}"${st.f[x.key] === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select></label>`)
              .join('')}<div class="dv-fpanel-f">${B('Clear all', 'dvClear', { k }, 'btn-g btn-sm')}${B('Show ' + n + ' ' + noun, 'dvFilters', { k }, 'btn-p btn-sm')}</div></div>`
          : ''
      }</div>`
    : '';
  const sorts = (o.sorts || []).length
    ? `<div class="dv-sort"><label class="cap" for="dvs-${kk}">Sort</label><select class="input" id="dvs-${kk}" data-ch="dvSort" data-k="${kk}">${o.defaultSort ? '' : '<option value="">Default order</option>'}${o.sorts.map(([v, l]) => `<option value="${h(v)}"${st.sort === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>${st.sort ? `<button type="button" class="iconbtn" data-a="dvDir" data-k="${kk}" aria-label="${st.dir === 'asc' ? 'Ascending — switch to descending' : 'Descending — switch to ascending'}">${ic('arrow', 16)}</button>` : ''}</div>`
    : '';
  // nothing to search yet: the empty state stands alone (toolbar actions such as 'New …' stay available)
  const bar = !all.length ? (o.actions ? `<div class="dv-bar"><div class="dv-find"></div><div class="dv-tools">${o.actions}</div></div>` : '') : search || quick || fbtn || sorts || o.actions ? `<div class="dv-bar"><div class="dv-find">${search}${quick}${fbtn}</div><div class="dv-tools">${sorts}${o.actions || ''}</div></div>` : '';
  const chipList = [
    ...(st.q.trim() ? [[`“${h(st.q.trim())}”`, 'q']] : []),
    ...fOn.map(([fk, v]) => {
      const x = filters.find(y => y.key === fk);
      return [`${h(x.label)}: ${h((x.options.find(op => op[0] === v) || [v, v])[1])}`, fk];
    }),
  ];
  const chips = chipList.length
    ? `<div class="dv-chips" role="group" aria-label="Active filters"><span class="cap">Filtered by</span>${chipList.map(([l, fk]) => `<button type="button" class="dv-chip" data-a="dvRemove" data-k="${kk}" data-f="${h(fk)}" aria-label="Remove filter ${l.replace(/<[^>]+>/g, '')}">${l}${ic('x', 14)}</button>`).join('')}${B('Clear all', 'dvClear', { k }, 'btn-g btn-sm')}</div>`
    : '';
  const bulkBar =
    o.bulk && st.sel.length
      ? `<div class="dv-bulk" role="region" aria-label="Bulk actions"><b>${st.sel.length} selected</b>${o.bulk.map((b, i) => B((b.icon ? ic(b.icon, 14) : '') + h(b.label), 'dvBulk', { k, i }, b.danger ? 'btn-d btn-sm' : 'btn-s btn-sm')).join('')}${B('Clear selection', 'dvSelNone', { k }, 'btn-g btn-sm')}</div>`
      : '';
  // body
  const selBox = it => {
    if (!o.bulk || !o.rowId) return '';
    const id = o.rowId(it);
    return `<input type="checkbox" class="chk dv-sel" data-ch="dvSel" data-k="${kk}" data-id="${h(id)}"${st.sel.includes(id) ? ' checked' : ''} aria-label="Select">`;
  };
  const menu = (it, m) => {
    if (!m) return '';
    const id = o.rowId ? o.rowId(it) : pageRows.indexOf(it);
    const on = UI.dvMenu === k + '|' + id;
    return `<div class="dv-menuwrap"><button type="button" class="iconbtn" data-a="dvMenu" data-k="${kk}" data-id="${h(id)}" aria-haspopup="menu" aria-expanded="${on}" aria-label="More actions">${ic('more')}</button>${on ? `<div class="menu dv-menu" role="menu">${m}</div>` : ''}</div>`;
  };
  let body;
  if (!all.length) {
    const [ei, et, ex, ea] = o.empty || ['inbox', 'Nothing here yet', '', ''];
    body = empty(ei, et, ex, ea);
  } else if (!n) {
    body = empty('search', `No ${h(noun)} match`, 'Try another search or remove a filter.', B('Clear all', 'dvClear', { k }, 'btn-s btn-sm'));
  } else if (o.layout === 'table') {
    const cols = o.columns || [];
    const sm = cols.filter(c => c.hideSm);
    const th = cols
      .map(c => {
        const sc = c.sort && st.sort === c.sort ? (st.dir === 'asc' ? 'ascending' : 'descending') : null;
        return `<th scope="col"${c.num ? ' class="num"' : ''}${sc ? ` aria-sort="${sc}"` : ''}${c.hideSm ? ' data-sm="hide"' : ''}>${c.sort ? `<button type="button" class="dv-th" data-a="dvColSort" data-k="${kk}" data-v="${h(c.sort)}">${c.label}${ic(sc === 'descending' ? 'chev' : 'chevr', 12)}</button>` : c.label || '<span class="sr">Actions</span>'}</th>`;
      })
      .join('');
    body = `<div class="tblwrap dv-tblwrap"><table class="tbl dv-tbl${o.dense ? ' compact' : ''}"><thead><tr>${o.bulk ? `<th scope="col" class="dv-selc"><input type="checkbox" class="chk" data-ch="dvSelAll" data-k="${kk}" aria-label="Select all on this page"${ids.length && ids.every(id => st.sel.includes(id)) ? ' checked' : ''}></th>` : ''}${th}</tr></thead><tbody>${pageRows
      .map(
        it =>
          `<tr${o.rowId && st.sel.includes(o.rowId(it)) ? ' class="is-sel"' : ''}>${o.bulk ? `<td class="dv-selc">${selBox(it)}</td>` : ''}${cols
            .map((c, i) => {
              const extra = i === 0 && sm.length ? `<details class="dv-more"><summary>More details</summary><dl class="kv2">${sm.map(x => `<dt>${x.label}</dt><dd>${x.cell(it)}</dd>`).join('')}</dl></details>` : '';
              return `<td data-label="${h(String(c.label || '').replace(/<[^>]+>/g, ''))}"${c.num ? ' class="num"' : c.label ? '' : ' class="act"'}${c.hideSm ? ' data-sm="hide"' : ''}>${c.cell(it)}${extra}</td>`;
            })
            .join('')}</tr>`,
      )
      .join('')}</tbody></table></div>`;
  } else {
    body = `<ul class="dv-list${o.dense ? ' dense' : ''}" role="list">${pageRows
      .map(it => {
        const r = o.row(it);
        const sel = o.rowId && st.sel.includes(o.rowId(it));
        return `<li class="dv-row${sel ? ' is-sel' : ''}">${selBox(it)}${r.lead ? `<div class="dv-lead">${r.lead}</div>` : ''}<div class="dv-main"><div class="dv-title">${r.title || ''}</div>${r.sub ? `<div class="dv-sub">${r.sub}</div>` : ''}${(r.meta || []).filter(Boolean).length ? `<div class="dv-meta">${r.meta.filter(Boolean).map(m => `<span>${m}</span>`).join('')}</div>` : ''}</div>${r.badges ? `<div class="dv-badges">${r.badges}</div>` : ''}<div class="dv-act">${r.primary || ''}${menu(it, r.menu)}</div></li>`;
      })
      .join('')}</ul>`;
  }
  // pagination (always visible once there are results)
  const pg = n
    ? `<nav class="dv-pager" aria-label="Pagination for ${h(noun)}"><span class="dv-range">Showing <b>${from}–${to}</b> of <b>${n}</b>${n !== all.length ? ` <span class="cap">(${all.length} in total)</span>` : ''}</span><div class="dv-pages"><button type="button" class="btn btn-s btn-sm" data-a="dvPage" data-k="${kk}" data-v="${st.page - 1}"${st.page <= 1 ? ' disabled' : ''} aria-label="Previous page">${ic('chevl', 16)}<span class="hide-sm">Previous</span></button><span class="dv-nums">${dvPages(st.page, pages)
        .map(p => (p === '…' ? '<span class="dv-gap" aria-hidden="true">…</span>' : `<button type="button" class="dv-num${p === st.page ? ' on' : ''}" data-a="dvPage" data-k="${kk}" data-v="${p}"${p === st.page ? ' aria-current="page"' : ''} aria-label="Page ${p}">${p}</button>`))
        .join('')}</span><span class="dv-pos">Page ${st.page} of ${pages}</span><button type="button" class="btn btn-s btn-sm" data-a="dvPage" data-k="${kk}" data-v="${st.page + 1}"${st.page >= pages ? ' disabled' : ''} aria-label="Next page"><span class="hide-sm">Next</span>${ic('chevr', 16)}</button></div><div class="dv-size"><label class="cap" for="dvz-${kk}">Rows per page</label><select class="input" id="dvz-${kk}" data-ch="dvSize" data-k="${kk}">${[10, 25, 50, 100].map(z => `<option${z === st.size ? ' selected' : ''}>${z}</option>`).join('')}</select>${pages > 7 ? `<form class="dv-go" data-f="dvgo" novalidate><input type="hidden" name="k" value="${kk}"><label class="cap" for="dvg-${kk}">Go to page</label><input class="input" id="dvg-${kk}" name="p" type="number" min="1" max="${pages}" inputmode="numeric"><button type="submit" class="btn btn-s btn-sm">Go</button></form>` : ''}</div></nav>`
    : '';
  st._msg = n ? `Showing ${from} to ${to} of ${n} ${noun}${fOn.length || st.q.trim() || st.quick ? ', filtered' : ''}. Page ${st.page} of ${pages}.` : `No ${noun} match.`;
  return `<section class="dv${fOpen ? ' has-fpanel' : ''}" data-dv="${kk}" aria-label="${h(o.title || noun)}">${bar}${chips}${bulkBar}${body}${pg}</section>`;
}
const dvAfter = (k, focusSel) => {
  dvSave();
  render();
  const st = UI.dv[k];
  if (st && st._msg) dvLive(st._msg);
  if (focusSel) document.querySelector(focusSel)?.focus();
};
const dvq = k => `[data-dv="${CSS.escape(k)}"]`;
A.dvQuick = d => {
  const st = UI.dv[d.k];
  st.quick = d.v;
  st.page = 1;
  dvAfter(d.k, `${dvq(d.k)} [data-a="dvQuick"][data-v="${CSS.escape(d.v)}"]`);
};
A.dvFilters = d => {
  UI.dvOpen = UI.dvOpen === d.k ? null : d.k;
  render();
  document.querySelector(UI.dvOpen ? `#dvf-${CSS.escape(d.k)} select` : `${dvq(d.k)} [data-a="dvFilters"]`)?.focus();
};
A.dvFilter = (d, el) => {
  const st = UI.dv[d.k];
  st.f[d.f] = el.value;
  st.page = 1;
  dvAfter(d.k, `#dvf-${CSS.escape(d.k)} [data-f="${CSS.escape(d.f)}"]`);
};
A.dvRemove = d => {
  const st = UI.dv[d.k];
  if (d.f === 'q') st.q = '';
  else delete st.f[d.f];
  st.page = 1;
  dvAfter(d.k, `${dvq(d.k)} .dv-chip, ${dvq(d.k)} input[data-dvq]`);
};
A.dvClear = d => {
  const st = UI.dv[d.k];
  st.q = '';
  st.f = {};
  st.quick = '';
  st.page = 1;
  dvAfter(d.k, `${dvq(d.k)} input[data-dvq], ${dvq(d.k)} [data-a="dvFilters"]`);
};
A.dvSort = (d, el) => {
  const st = UI.dv[d.k];
  st.sort = el.value;
  st.page = 1;
  dvAfter(d.k, `#dvs-${CSS.escape(d.k)}`);
};
A.dvColSort = d => {
  const st = UI.dv[d.k];
  if (st.sort === d.v) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
  else {
    st.sort = d.v;
    st.dir = 'asc';
  }
  st.page = 1;
  dvAfter(d.k, `${dvq(d.k)} [data-a="dvColSort"][data-v="${CSS.escape(d.v)}"]`);
};
A.dvDir = d => {
  const st = UI.dv[d.k];
  st.dir = st.dir === 'asc' ? 'desc' : 'asc';
  dvAfter(d.k, `${dvq(d.k)} [data-a="dvDir"]`);
};
A.dvPage = d => {
  const st = UI.dv[d.k];
  st.page = Math.max(1, +d.v || 1);
  dvAfter(d.k, `${dvq(d.k)} .dv-num.on`);
  document.querySelector(dvq(d.k))?.scrollIntoView({ block: 'start', behavior: 'smooth' });
};
A.dvSize = (d, el) => {
  const st = UI.dv[d.k];
  st.size = +el.value || 10;
  st.page = 1;
  dvAfter(d.k, `#dvz-${CSS.escape(d.k)}`);
};
F.dvgo = d => {
  const st = UI.dv[d.k];
  if (st) st.page = Math.max(1, Math.floor(+d.p) || 1);
  dvAfter(d.k, `${dvq(d.k)} .dv-num.on`);
};
A.dvMenu = d => {
  const key = d.k + '|' + d.id;
  UI.dvMenu = UI.dvMenu === key ? null : key;
  render();
  if (UI.dvMenu) document.querySelector(`${dvq(d.k)} .dv-menu .menu-i, ${dvq(d.k)} .dv-menu button`)?.focus();
};
A.dvSel = (d, el) => {
  const st = UI.dv[d.k];
  st.sel = el.checked ? [...new Set([...st.sel, d.id])] : st.sel.filter(x => x !== d.id);
  render();
  dvLive(st.sel.length + ' selected');
};
A.dvSelAll = (d, el) => {
  const st = UI.dv[d.k];
  const o = DV[d.k];
  const ids = [...document.querySelectorAll(`${dvq(d.k)} .dv-sel`)].map(x => x.dataset.id);
  st.sel = el.checked ? [...new Set([...st.sel, ...ids])] : st.sel.filter(x => !ids.includes(x));
  render();
  dvLive(st.sel.length + ' selected');
};
A.dvSelNone = d => {
  UI.dv[d.k].sel = [];
  render();
  dvLive('Selection cleared');
};
A.dvBulk = d => {
  const o = DV[d.k],
    b = o && o.bulk && o.bulk[+d.i];
  if (!b) return;
  const ids = UI.dv[d.k].sel.slice();
  if (b.confirm) {
    modal(
      h(b.label),
      `<p>${h(b.confirm)}</p><p class="cap">${ids.length} selected.</p><div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}${B(h(b.label), 'dvBulkYes', { k: d.k, i: d.i }, b.danger ? 'btn-d' : 'btn-p')}</div>`,
    );
    return;
  }
  A.dvBulkYes(d);
};
A.dvBulkYes = d => {
  const o = DV[d.k],
    b = o.bulk[+d.i];
  const ids = UI.dv[d.k].sel.slice();
  UI.modal = null;
  UI.dv[d.k].sel = [];
  b.run(ids);
  render();
};
// search: debounced, focus and caret kept across the re-render
let dvT = null;
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset || !el.dataset.dvq) return;
  const k = el.dataset.dvq;
  clearTimeout(dvT);
  dvT = setTimeout(() => {
    const st = UI.dv[k];
    if (!st) return;
    st.q = el.value;
    st.page = 1;
    dvSave();
    render();
    const n = document.querySelector(`input[data-dvq="${CSS.escape(k)}"]`);
    if (n) {
      n.focus();
      n.setSelectionRange(n.value.length, n.value.length);
    }
    if (st._msg) dvLive(st._msg);
  }, 220);
});
// menus and the filter popover close on outside click and Escape
document.addEventListener('mousedown', e => {
  const t = e.target;
  if (UI.dvMenu && !(t.closest && t.closest('.dv-menuwrap'))) {
    UI.dvMenu = null;
    render();
  }
  if (UI.dvOpen && !(t.closest && t.closest('.dv-fwrap'))) {
    UI.dvOpen = null;
    render();
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || UI.modal) return;
  if (UI.dvMenu) {
    const [k] = UI.dvMenu.split('|');
    UI.dvMenu = null;
    render();
    document.querySelector(`${dvq(k)} [data-a="dvMenu"]`)?.focus();
  } else if (UI.dvOpen) A.dvFilters({ k: UI.dvOpen });
});
// navigating away closes menus and popovers
(() => {
  const g0 = go;
  go = (r, p) => {
    UI.dvMenu = null;
    UI.dvOpen = null;
    return g0(r, p);
  };
})();
// a loading placeholder in the shape of the list it replaces
const dvSkeleton = (n = 4) => `<ul class="dv-list" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => '<li class="dv-row"><span class="skel av"></span><div class="dv-main col" style="gap:6px"><span class="skel" style="width:46%"></span><span class="skel" style="width:28%"></span></div></li>').join('')}</ul>`;
