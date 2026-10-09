// ---------- PLATFORM: ORGANIZATIONS (TENANTS) AND ROLE MANAGEMENT ----------
// Platform Administrator only. Organizations are the tenants that own contexts.
// Roles are data: each has module-by-module permissions and a base role whose workflow rules it follows.

// ---- module catalogue (rows of the permission matrix)
const MODULES = {
  home: ['My PHOENIX', 'Personal home and next action'],
  identity: ['Identity & account', 'Sign-in, verification, account status'],
  agreements: ['Agreements', 'Participation and role agreements'],
  profile: ['Profile', 'Profile, claims and Purpose Compass'],
  pathways: ['Pathways', 'Learning pathways and templates'],
  aireq: ['AI-drafted requirements', 'AI help when defining a project'],
  projects: ['Projects', 'Project definition, review and stages'],
  circles: ['Circles', 'Collaboration spaces'],
  voting: ['Voting', 'Weighted votes in Circles'],
  ropeteams: ['Rope Teams', 'Mentoring and support groups'],
  rooms: ['Action Rooms', 'Execution spaces and task board'],
  opportunities: ['Opportunities', 'Needs, offers and Opportunity Cards'],
  matching: ['Match Briefs', 'Steward-reviewed introductions'],
  repository: ['Repository', 'Records and documents'],
  evidence: ['Evidence', 'Evidence review, levels and release'],
  harvest: ['Learning Harvests', 'Reflection and learning capture'],
  ai: ['Ask PHOENIX (AI)', 'Private AI assistant'],
  payments: ['Access & billing', 'Products, seats and payments'],
  funding: ['Funding', 'Sponsor funding and tranches'],
  metrics: ['Metrics & reports', 'Programme metrics'],
  governance: ['Governance & incidents', 'Concerns and incidents'],
  admin: ['Programme administration', 'Users, agreements, configuration'],
  platform: ['Platform administration', 'Organizations, contexts, roles, integrations'],
};
const PERMS = [
  ['O', 'Own', 'Own records only'],
  ['C', 'Create', 'Create and contribute'],
  ['R', 'Review', 'Review and approve'],
  ['V', 'View', 'View within scope'],
  ['A', 'Aggregate', 'Approved aggregate only'],
  ['M', 'Manage', 'Manage and configure'],
  ['T', 'Technical', 'Technical administration only, no content'],
];
const permOrder = 'OCRVAMT';
const normPerm = letters => {
  const s = [...new Set(String(letters || '').replace(/-/g, ''))].filter(c => permOrder.includes(c));
  return s.length ? s.sort((a, b) => permOrder.indexOf(a) - permOrder.indexOf(b)).join('') : '-';
};
const permText = v => (v === '-' || !v ? 'No access' : v.split('').map(c => (PERMS.find(p => p[0] === c) || [, c])[1]).join(' · '));
const JOIN_ROUTES = ['Direct registration or invitation', 'Invitation', 'Assigned by Platform Administrator', 'System-provisioned'];
const SEED_ROLES = {
  P: ['Participant', 'Learner or practitioner. Sets a purpose, joins Circles and works on projects.', 'Direct registration or invitation'],
  F: ['Facilitator / Steward', 'Reviews projects, facilitates Circles, stewards matches and evidence.', 'Invitation'],
  M: ['Mentor / Advisor', 'Guides Rope Teams, reviews shared work and records mentor contributions.', 'Invitation'],
  C: ['Partner / Collaborator', 'Contributes resources, expertise or opportunities to projects.', 'Invitation'],
  O: ['Organization Representative', 'Represents an organization: cohort, invitations, mandates and seats.', 'Invitation'],
  S: ['Sponsor / Funder', 'Funds projects stage by stage and sees approved aggregates only.', 'Direct registration or invitation'],
  A: ['Programme Administrator', 'Runs the programme: users, agreements, configuration and reviews.', 'Assigned by Platform Administrator'],
  T: ['Platform Administrator', 'Technical administration of the platform. No default access to participant content.', 'System-provisioned'],
};
const seedPerms = code => Object.fromEntries(Object.keys(MX).map(m => [m, normPerm((MX[m] || {})[code])]));
const SEED_ORG_FIELDS = {
  o1: { short: 'EXU', email: 'partnerships@excelsior.example', contact: 'Prof. Helen Ward', domains: 'excelsior.example', brand: '#7a1f2b', country: 'United Kingdom', tz: 'Europe/London', region: 'United Kingdom', web: 'https://excelsior.example' },
  o2: { short: 'RST', email: 'hello@riversideseva.example', contact: 'Meera Iyer', domains: 'riversideseva.example', brand: '#b5651d', country: 'India', tz: 'Asia/Kolkata', region: 'India', web: 'https://riversideseva.example' },
  o3: { short: 'WEN', email: 'team@wen.example', contact: 'Grace Adeyemi', domains: 'wen.example', brand: '#6b3fa0', country: 'United Kingdom', tz: 'Europe/London', region: 'United Kingdom' },
  o4: { short: 'GGL', email: 'contact@greengrid.example', contact: 'Leah Park', domains: 'greengrid.example', brand: '#2e7d32', country: 'United Kingdom', tz: 'Europe/London', region: 'United Kingdom', web: 'https://greengrid.example' },
  o5: { short: 'HWF', email: 'grants@hartwell.example', contact: 'Helen Hartwell', domains: 'hartwell.example', brand: '#1f4e79', country: 'United States', tz: 'America/New_York', region: 'United States' },
};
// Called from migrate(): adds role records and organization fields without resetting anyone's stored data.
function ensurePlatformData() {
  if (!S.roles) {
    S.roles = Object.entries(SEED_ROLES).map(([id, [name, desc, joins]]) => ({
      id,
      name,
      desc,
      base: id,
      joins,
      approval: SENSITIVE_ROLES.includes(id),
      system: true,
      status: 'Active',
      perms: seedPerms(id),
      updated: null,
    }));
  }
  (S.orgs || []).forEach(o => {
    const f = SEED_ORG_FIELDS[o.id] || {};
    o.short = o.short ?? f.short ?? '';
    o.email = o.email ?? f.email ?? '';
    o.contact = o.contact ?? f.contact ?? '';
    o.phone = o.phone ?? '';
    o.web = o.web ?? f.web ?? '';
    o.domains = o.domains ?? f.domains ?? '';
    o.brand = o.brand ?? f.brand ?? '#004369';
    o.logo = o.logo ?? null;
    o.address = o.address ?? '';
    o.country = o.country ?? f.country ?? '';
    o.tz = o.tz ?? f.tz ?? 'Europe/London';
    o.lang = o.lang ?? 'English';
    o.region = o.region ?? f.region ?? '';
    o.status = o.status ?? 'Active';
    o.profile = o.profile ?? '';
    o.created = o.created ?? '2026-09-01';
  });
  syncRoles();
}
const activeRoles = () => (S.roles || []).filter(r => r.status === 'Active');
const invitableRoles = bases => activeRoles().filter(r => bases.includes(r.base));

// ---- organization helpers
const ORG_TYPES = ['University', 'College or school', 'NGO', 'Community group', 'Company', 'Funder', 'Government body', 'Other'];
const TIMEZONES = ['Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Africa/Nairobi', 'Australia/Sydney'];
const REGIONS = ['United Kingdom', 'European Union', 'United States', 'India', 'Singapore', 'Australia', 'Other'];
const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Swahili'];
const HEX = /^#[0-9a-f]{6}$/i;
const DOMAIN = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const orgOf = id => (S.orgs || []).find(o => o.id === id);
const lumOf = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
// Logo, or initials on the brand colour with whichever text colour reads.
// Brand colour and logo are not used: every organization shows its initials on the primary colour.
function orgMark(o, size = 28) {
  if (!o) return '';
  const t = (o.short || o.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return `<span class="orgmark om-${size >= 48 ? 'lg' : size >= 32 ? 'md' : 'sm'}" aria-hidden="true">${h(t)}</span>`;
}
const ctxOrgMark = () => {
  const o = orgOf(ctx()?.org);
  return o ? orgMark(o, 28) : '';
};

// ---------- ORGANIZATIONS ----------
route('tenants', 'platform', () => {
  if (UI.p.id) return tenantDetail(orgOf(UI.p.id));
  const q = UI.q;
  const list = S.orgs.filter(
    o =>
      (!q.tq || (o.name + ' ' + o.short + ' ' + o.domains + ' ' + o.email).toLowerCase().includes(q.tq.toLowerCase())) &&
      (!q.tt || o.type === q.tt) &&
      (!q.ts || o.status === q.ts),
  );
  const ctxCount = id => S.contexts.filter(c => c.org === id).length;
  const ppl = id => S.people.filter(p => p.org === id).length;
  return (
    head('Organizations', 'Tenants on the platform. Each organization owns its contexts; data stays isolated by context.', B(ic('plus', 16) + 'Create organization', 'tenantNew', {}, 'btn-p')) +
    card(
      S.orgs.length + ' organization' + (S.orgs.length === 1 ? '' : 's'),
      list.length !== S.orgs.length ? list.length + ' match the filters' : '',
      dataView('plat:orgs', {
        label: 'organizations',
        searchLabel: 'Search name, domain or email',
        items: list,
        search: o => o.name + ' ' + o.short + ' ' + o.domains + ' ' + o.email + ' ' + (o.contact || ''),
        quick: { label: 'Status', options: ['Active', 'Suspended'].map(v => [v, v]), test: (o, v) => o.status === v },
        filters: [{ key: 'type', label: 'Type', options: ORG_TYPES.map(t => [t, t]), test: (o, v) => o.type === v }],
        sorts: [
          ['name', 'Name', (x, y) => x.name.localeCompare(y.name)],
          ['ctx', 'Contexts', (x, y) => ctxCount(x.id) - ctxCount(y.id)],
          ['ppl', 'People', (x, y) => ppl(x.id) - ppl(y.id)],
          ['created', 'Created', (x, y) => String(x.created || '').localeCompare(String(y.created || ''))],
        ],
        row: o => ({
          lead: orgMark(o, 32),
          title: L(h(o.name), 'tenants', { id: o.id }),
          sub: `<span class="adm-id">${h(o.short || o.id)}</span> · ${h(o.type)}${o.domains ? ' · <span class="adm-mono">' + h(o.domains.split(',')[0].trim()) + '</span>' + (o.domains.includes(',') ? ' <span class="cap">+' + (o.domains.split(',').length - 1) + '</span>' : '') : ''}`,
          meta: [o.email ? `${h(o.contact || '')} · ${h(o.email)}` : '', ctxCount(o.id) + ' context' + (ctxCount(o.id) === 1 ? '' : 's'), ppl(o.id) + ' ' + (ppl(o.id) === 1 ? 'person' : 'people')],
          badges: pill(o.status),
          primary: L('Open', 'tenants', { id: o.id }, 'btn btn-s btn-sm'),
        }),
        empty: ['building', 'No organizations yet', 'Create the first organization to give it a programme and an administrator.', ''],
      }),
      '',
      'adm-panel ops-tenants',
    )
  );
});
// The person named under Admin: their invitation or role in the organization's programme, or whoever holds the role there.
const orgAdminState = ad => {
  const p = S.people.find(x => (x.email || '').toLowerCase() === ad.email.toLowerCase());
  const a = p && S.assign.find(x => x.pid === p.id && x.ctx === ad.ctx && roleBase(x.role) === 'A');
  if (a) return a.status;
  const inv = byId('invites', ad.inv);
  if (!inv) return 'Not invited';
  if (['Pending', 'Resent'].includes(inv.status)) return inv.expires < today() ? 'Expired' : 'Invitation sent';
  return inv.status;
};
function orgAdminCard(o, cs) {
  if (o.admin && o.admin.email)
    return card(
      'Programme Administrator',
      'Named under Admin. They run ' + h(S.contexts.find(c => c.id === o.admin.ctx)?.name || 'the organization’s programme') + '.',
      `<div class="tnt-admin"><span class="av lg" aria-hidden="true">${h((o.admin.name || '?').trim().charAt(0).toUpperCase())}</span><div class="adm-who-t"><b>${h(o.admin.name)}</b><div class="cap">${h(o.admin.email)}</div></div></div>` +
        dl([
          ['Name', h(o.admin.name)],
          ['Email', `<a class="lnk" href="mailto:${h(o.admin.email)}">${h(o.admin.email)}</a>`],
          ['Phone', h(o.admin.phone || '—')],
          ['Status', pill(orgAdminState(o.admin))],
        ]),
      '',
      'tnt-admincard',
    );
  const hs = S.assign.filter(a => roleBase(a.role) === 'A' && cs.some(c => c.id === a.ctx));
  return card(
    'Programme Administrator',
    'Edit the organization to name the admin.',
    hs.length ? `<ul class="tnt-holders">${hs.map(a => `<li class="tnt-admin"><span class="av" aria-hidden="true">${ini(a.pid)}</span><div class="adm-who-t"><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email)}</div><div class="cap">${h(S.contexts.find(c => c.id === a.ctx)?.name || '')}</div></div>${pill(a.status)}</li>`).join('')}</ul>` : '<p class="cap">No Programme Administrator yet.</p>',
    '',
    'tnt-admincard',
  );
}
// Form values for the Admin section when editing: the named admin, or the current role holder.
const orgAdminPrefill = o => {
  if (o.admin) return { aname: o.admin.name, aemail: o.admin.email, aphone: o.admin.phone || '' };
  const a = S.assign.find(x => roleBase(x.role) === 'A' && S.contexts.some(c => c.id === x.ctx && c.org === o.id));
  return a ? { aname: P(a.pid).name, aemail: P(a.pid).email, aphone: '' } : {};
};
// An organization runs one programme on the University pack. A new one starts with copies of the default
// programme's current policies, so its people have agreements to accept.
function orgProgramme(o) {
  const cs = S.contexts.filter(c => c.org === o.id);
  const ex = (o.admin && cs.find(c => c.id === o.admin.ctx)) || cs.find(c => c.kind === 'Programme') || cs[0];
  if (ex) return ex;
  const c = { id: uid('c'), name: o.name + ' Programme', org: o.id, pack: 'uni', kind: 'Programme', status: 'Active' };
  S.contexts.push(c);
  S.agreements
    .filter(g => g.ctx === S.settings.defaultCtx && g.status === 'Active')
    .forEach(g =>
      S.agreements.push({ id: uid('g'), type: g.type, ctx: c.id, ver: 1, status: 'Active', effective: today(), roles: [...g.roles], summary: '', text: g.text || polSeedText(g), ...(g.coversPurposes ? { coversPurposes: true } : {}) }),
    );
  audit('Context created', c.id, c.name + ' · ' + o.name);
  return c;
}
// The person under Admin becomes the Programme Administrator. The Platform Administrator appoints them, so the
// invitation is pre-approved. A changed email withdraws the earlier pending invitation; nobody loses a role.
function orgAdminSet(o, d) {
  const c = orgProgramme(o);
  const email = d.aemail.trim();
  const same = x => (x || '').toLowerCase() === email.toLowerCase();
  const prev = o.admin;
  const p = S.people.find(x => same(x.email));
  const holds = p && S.assign.some(a => a.pid === p.id && a.ctx === c.id && roleBase(a.role) === 'A');
  const live = S.invites.find(i => same(i.email) && i.ctx === c.id && i.role === 'A' && ['Pending', 'Resent'].includes(i.status) && i.expires >= today());
  if (prev && prev.inv && !same(prev.email)) {
    const old = byId('invites', prev.inv);
    if (old && ['Pending', 'Resent'].includes(old.status)) old.status = 'Revoked';
  }
  let sent = null;
  if (!holds && !live) {
    const e = new Date();
    e.setDate(e.getDate() + (+S.settings.inviteValidityDays || 14));
    sent = { id: uid('i'), token: 'TKN-' + uid(''), email, role: 'A', ctx: c.id, org: o.id, status: 'Pending', expires: e.toISOString().slice(0, 10), by: myId(), sent: today(), preApproved: myId() };
    S.invites.push(sent);
    audit('Invitations created', c.id, '1 × ' + ROLE.A + ' (pre-approved)');
  }
  const ad = { name: d.aname.trim(), email, phone: (d.aphone || '').trim(), ctx: c.id, inv: sent ? sent.id : live ? live.id : prev && same(prev.email) ? prev.inv : null };
  if (!prev || prev.email !== ad.email || prev.name !== ad.name || prev.phone !== ad.phone) audit('Organization admin set', o.id, ad.name + ' · ' + ad.email);
  o.admin = ad;
  return sent;
}
function tenantDetail(o) {
  if (!o) return empty('building', 'Organization not found', '', L('All organizations', 'tenants'));
  const cs = S.contexts.filter(c => c.org === o.id);
  const ppl = S.people.filter(p => p.org === o.id);
  return (
    `<header class="shead">${crumbsHtml([['Organizations', 'tenants'], [h(o.name)]])}<div class="shead-main">${orgMark(o, 48)}<div class="shead-t"><div class="shead-kind">${h(o.type)} · ${h(o.short || o.id)}</div><div class="row wrap shead-title"><h1 class="h1">${h(o.name)}</h1>${pill(o.status)}</div>${o.profile ? `<p class="sub">${h(o.profile)}</p>` : ''}<div class="shead-meta"><span>Created ${fmt(o.created)}</span><span>${cs.length} context${cs.length === 1 ? '' : 's'}</span><span>${ppl.length} ${ppl.length === 1 ? 'person' : 'people'}</span></div></div><div class="shead-a">${B(ic('edit', 16) + 'Edit', 'tenantNew', { id: o.id }, 'btn-s')}${o.status === 'Active' ? B(ic('plus', 16) + 'Create context', 'ctxNew', { org: o.id }, 'btn-p') : ''}</div></div></header>` +
    (o.status === 'Suspended' ? banner('warn', 'Suspended', 'No new contexts can be created for this organization. Existing contexts and their data are unchanged.') + '<div class="section-gap"></div>' : '') +
    `<div class="g12 tnt-grid"><div class="c8 adm-stack">${card(
      'Organization details',
      '',
      dl([
        ['Organization name', h(o.name)],
        ['Short name', h(o.short || '—')],
        ['Type', h(o.type)],
        ['Use-case pack', h((S.packs.find(p => p.id === o.pack) || {}).name || '—')],
        ['Primary contact', h(o.contact || '—')],
        ['Email', o.email ? `<a class="lnk" href="mailto:${h(o.email)}">${h(o.email)}</a>` : '—'],
        ['Phone', h(o.phone || '—')],
        ['Website', o.web ? `<a class="lnk" href="${h(o.web)}" target="_blank" rel="noopener">${h(o.web)}</a>` : '—'],
        ['Email domains', o.domains ? `<span class="tnt-doms">${o.domains.split(',').map(d => `<code class="tnt-dom">${h(d.trim())}</code>`).join('')}</span>` : '—'],
        ['Address', h(o.address || '—')],
        ['Country', h(o.country || '—')],
        ['Default language', h(o.lang || '—')],
        ['Data residency', h(o.region || '—')],
      ]),
      '',
      'tnt-details',
    )}${card(
      `Contexts <span class="adm-n">${cs.length}</span>`,
      'Programmes, cohorts and organization spaces owned by this organization.',
      table(
        ['Context', 'Kind', 'Pack', 'Status', 'Members'],
        cs.map(c => [`<b>${h(c.name)}</b><div class="adm-id">${c.id}</div>`, h(c.kind), h(S.packs.find(p => p.id === c.pack)?.name || '—'), pill(c.status), `<span class="ops-num">${S.assign.filter(a => a.ctx === c.id).length}</span>`]),
        'No contexts for this organization.',
      ),
      '',
      'adm-panel',
    )}${card(
      `People <span class="adm-n">${ppl.length}</span>`,
      'Accounts affiliated with this organization.',
      table(
        ['Person', 'Email', 'Roles'],
        ppl.map(p => [`<span class="adm-who"><span class="av sm" aria-hidden="true">${h((p.name || '?').charAt(0))}</span><b>${h(p.name)}</b></span>`, h(p.email), S.assign.filter(a => a.pid === p.id).map(a => h(ROLE[a.role] || a.role) + ' <span class="cap">· ' + h(S.contexts.find(c => c.id === a.ctx)?.name || '') + '</span>').join('<br>') || '—']),
        'No people affiliated yet.',
      ),
      '',
      'adm-panel',
    )}</div><aside class="c4 adm-stack tnt-rail">${orgAdminCard(o, cs)}${card('Lifecycle', '', `<div class="tnt-life">${o.status === 'Active' ? CB(ic('pause', 14) + 'Suspend organization', 'tenantState', { id: o.id, v: 'Suspended' }, 'Suspend ' + o.name + '? No new contexts can be created for it. Existing contexts and their data are not changed.', 'btn-d btn-sm', 'Suspend') : B('Reactivate organization', 'tenantState', { id: o.id, v: 'Active' }, 'btn-p btn-sm')}<span class="cap">Suspension is recorded in the audit log.</span></div>`)}</aside></div>`
  );
}
// Logo choice is held apart from form state: a data URL (new image), '' (removed), 'bad' (rejected) or undefined (unchanged).
const tntLogo = o => (typeof UI._tntLogo === 'string' && UI._tntLogo.startsWith('data:') ? UI._tntLogo : UI._tntLogo === '' ? null : o ? o.logo : null);
A.tenantNew = d => {
  const o = d.id && orgOf(d.id);
  clearF('tnt');
  UI._tntLogo = undefined;
  UI.form.tnt = o ? { ...o, ...orgAdminPrefill(o) } : { type: 'University', status: 'Active', lang: 'English', region: 'United Kingdom', country: '' };
  modal(
    o ? 'Edit ' + h(o.name) : 'Create an organization',
    () => {
      const f = 'tnt';
      const cur = { ...(UI.form.tnt || {}), logo: tntLogo(o) };
      return `<form data-f="tnt" class="col tnt-form" novalidate><input type="hidden" name="id" value="${o ? o.id : ''}">${errSum(f)}
    <fieldset class="fs"><legend>Identity</legend><div class="f2">${fi(f, 'name', 'Organization name', { req: true, max: 120 })}${fi(f, 'short', 'Short name or code', { max: 12, help: 'Used in lists and as initials when there is no logo.' })}</div><div class="f2">${fi(f, 'type', 'Type', { type: 'select', req: true, opts: ORG_TYPES })}${fi(f, 'status', 'Status', { type: 'select', req: true, opts: ['Active', 'Suspended'] })}</div>${fi(f, 'profile', 'About the organization', { type: 'textarea', rows: 2, max: 400 })}</fieldset>
    <fieldset class="fs"><legend>Contact</legend><div class="f2">${fi(f, 'contact', 'Primary contact name', { req: true })}${fi(f, 'email', 'Primary contact email', { type: 'email', req: true, auto: 'email' })}</div><div class="f2">${fi(f, 'phone', 'Phone', { type: 'tel', auto: 'tel' })}${fi(f, 'web', 'Website', { type: 'url', ph: 'https://' })}</div></fieldset>
    <fieldset class="fs"><legend>Admin</legend><p class="cap tnt-note">${o ? 'The Programme Administrator for this organization. Changing the email sends a new invitation and withdraws the earlier one if it is still pending; anyone who already holds the role keeps it.' : 'This person becomes the Programme Administrator for this organization. They get an invitation to set up their account. You are appointing them, so the role needs no further approval.'}</p><div class="f2">${fi(f, 'aname', 'Name', { req: true, auto: 'off' })}${fi(f, 'aemail', 'Email', { type: 'email', req: true, auto: 'off' })}</div><div class="f2">${fi(f, 'aphone', 'Phone number', { type: 'tel', auto: 'off' })}</div></fieldset>
    <fieldset class="fs"><legend>Domain</legend>${fi(f, 'domains', 'Email domains', { req: true, ph: 'example.org, mail.example.org', help: 'Comma-separated. People signing up with these domains can be matched to this organization.' })}</fieldset>
    <fieldset class="fs"><legend>Location and data</legend>${fi(f, 'address', 'Address', { type: 'textarea', rows: 2 })}<div class="f2">${fi(f, 'country', 'Country', { req: true })}${fi(f, 'region', 'Data residency region', { type: 'select', req: true, opts: REGIONS, help: 'Where this organization’s data is expected to be stored.' })}</div></fieldset>
    <div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}<button class="btn btn-p" type="submit">${o ? 'Save changes' : 'Create organization'}</button></div></form>`;
    },
    true,
  );
};
A.tntLogoX = () => {
  snapForms();
  UI._tntLogo = '';
  render();
};
// colour picker and hex field stay in step; logo preview without a re-render
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.dataset) return;
  if (t.dataset.brandpick) {
    const hx = t.form && t.form.querySelector('[data-brandhex]');
    if (hx) hx.value = t.value;
  }
  if (t.dataset.brandhex && HEX.test(t.value)) {
    const pk = t.form && t.form.querySelector('[data-brandpick]');
    if (pk) pk.value = t.value;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (!t.dataset || !t.dataset.tntlogo || !t.files[0]) return;
  const file = t.files[0];
  const prev = t.form.querySelector('.tnt-prev');
  if (file.size > 300 * 1024 || !/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
    UI._tntLogo = 'bad';
    if (prev) prev.innerHTML = `<span class="emsg">${ic('alert', 14)}Not used</span>`;
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    UI._tntLogo = r.result;
    if (prev) prev.innerHTML = `<img src="${r.result}" alt="">`;
  };
  r.readAsDataURL(file);
});
F.tnt = d => {
  const o = d.id && orgOf(d.id);
  const others = S.orgs.filter(x => !o || x.id !== o.id);
  const doms = (d.domains || '')
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
  const taken = doms.find(x => others.some(y => (y.domains || '').toLowerCase().split(',').map(z => z.trim()).includes(x)));
  const ok_ = validate('tnt', d, {
    name: ['req', ['fn', { f: v => !others.some(x => x.name.toLowerCase() === v.toLowerCase()), m: 'Another organization already has this name.' }]],
    type: ['req'],
    contact: ['req'],
    email: ['req', 'email'],
    domains: ['req', ['fn', { f: () => doms.length && doms.every(x => DOMAIN.test(x)), m: 'Enter domains like example.org, separated by commas.' }], ['fn', { f: () => !taken, m: 'Domain ' + taken + ' already belongs to another organization.' }]],
    web: [['fn', { f: v => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), m: 'Enter a full web address starting with https://' }]],
    country: ['req'],
    region: ['req'],
    aname: [['req', 'Enter the admin’s name.']],
    aemail: [['req', 'Enter the admin’s email.'], 'email'],
    aphone: [['fn', { f: v => !v || /^\+?[\d\s()-]{7,20}$/.test(v.trim()), m: 'Enter a phone number using digits, spaces, brackets or a leading +.' }]],
  });
  if (!ok_) return render();
  const rec = {
    name: d.name.trim(),
    short: (d.short || '').trim().toUpperCase(),
    type: d.type,
    status: d.status || 'Active',
    profile: (d.profile || '').trim(),
    contact: d.contact.trim(),
    email: d.email.trim(),
    phone: (d.phone || '').trim(),
    web: (d.web || '').trim(),
    domains: doms.join(', '),
    address: (d.address || '').trim(),
    country: d.country.trim(),
    lang: d.lang || 'English',
    region: d.region,
    pack: o ? o.pack || 'uni' : 'uni',
  };
  let target = o;
  if (o) {
    const changed = Object.keys(rec).filter(k => (o[k] || '') !== (rec[k] || ''));
    Object.assign(o, rec);
    audit('Organization updated', o.id, changed.join(', ') || 'no changes');
  } else {
    target = { id: uid('o'), created: today(), ...rec };
    S.orgs.push(target);
    audit('Organization created', target.id, target.name);
  }
  const sent = orgAdminSet(target, d);
  toast(o ? 'Organization saved.' + (sent ? ' Invitation sent to ' + sent.email + '.' : '') : target.name + ' created with its programme. Invitation sent to ' + target.admin.email + ' as Programme Administrator.');
  UI._tntLogo = undefined;
  UI.modal = null;
  clearF('tnt');
  save();
  go('tenants', { id: target.id });
};
A.tenantState = d => {
  const o = orgOf(d.id);
  o.status = d.v;
  audit('Organization ' + (d.v === 'Active' ? 'reactivated' : 'suspended'), o.id, o.name);
  toast(o.name + (d.v === 'Active' ? ' reactivated.' : ' suspended.'));
  ok();
};

// ---------- ROLE MANAGEMENT ----------
route('roles', 'platform', () => {
  if (UI.p.id) return roleDetail(roleRec(UI.p.id));
  const people = id => S.assign.filter(a => a.role === id && a.status === 'Active').length;
  const mods = r => Object.values(r.perms).filter(v => v && v !== '-').length;
  return (
    head('Role management', 'Primary roles and what each can do, module by module. Changes apply immediately to everyone holding the role.', B(ic('plus', 16) + 'Create role', 'roleNew', {}, 'btn-p')) +
    card(
      'Primary roles',
      'Seeded roles reflect the specification; custom roles follow the workflow rules of the role they behave as.',
      dataView('plat:roles', {
        label: 'roles',
        items: S.roles,
        search: r => r.name + ' ' + r.id + ' ' + r.desc + ' ' + r.joins,
        quick: { label: 'Kind', options: [['seeded', 'Seeded'], ['custom', 'Custom'], ['archived', 'Archived']], test: (r, v) => (v === 'archived' ? r.status !== 'Active' : r.status === 'Active' && (v === 'seeded' ? r.system : !r.system)) },
        filters: [
          { key: 'appr', label: 'Approval', options: [['yes', 'Approval needed'], ['no', 'Automatic']], test: (r, v) => (v === 'yes' ? !!r.approval : !r.approval) },
          { key: 'base', label: 'Behaves as', options: [...new Set(S.roles.map(r => r.base))].map(x => [x, ROLE[x] || x]), test: (r, v) => r.base === v },
          { key: 'joins', label: 'Joins by', options: [...new Set(S.roles.map(r => r.joins))].map(x => [x, x]), test: (r, v) => r.joins === v },
        ],
        sorts: [
          ['name', 'Name', (a, b) => a.name.localeCompare(b.name)],
          ['people', 'People', (a, b) => people(a.id) - people(b.id)],
          ['mods', 'Modules', (a, b) => mods(a) - mods(b)],
        ],
        row: r => ({
          lead: `<span class="rol-code">${h(r.id)}</span>`,
          title: L(h(r.name), 'roles', { id: r.id }),
          sub: h(r.desc),
          meta: ['Behaves as: ' + (r.base === r.id ? 'itself' : h(ROLE[r.base] || r.base)), 'Joins by: ' + h(r.joins), `${mods(r)} of ${Object.keys(MODULES).length} modules`, people(r.id) + ' active ' + (people(r.id) === 1 ? 'person' : 'people')],
          badges: (r.approval ? pill('Approval needed', 'p-amber') : pill('Automatic', 'p-grey')) + pill(r.status === 'Active' ? (r.system ? 'Seeded' : 'Custom') : r.status, r.status !== 'Active' ? 'p-grey' : r.system ? 'p-teal' : 'p-purple'),
          primary: L('Manage', 'roles', { id: r.id }, 'btn btn-s btn-sm'),
        }),
        empty: ['shield', 'No roles yet', 'Use “Create role” to add one.', ''],
      }),
      '',
      'adm-panel rol-list',
    ) +
    '<div class="section-gap"></div>' +
    card(
      'Role × module overview',
      'Read-only summary of current permissions. Open a role to change them.',
      `<div class="tblwrap rmx-wrap"><table class="tbl rmx"><thead><tr><th scope="col">Module</th>${S.roles
        .filter(r => r.status === 'Active')
        .map(r => `<th scope="col" title="${h(r.name)}"><abbr title="${h(r.name)}">${h(r.id)}</abbr></th>`)
        .join('')}</tr></thead><tbody>${Object.entries(MODULES)
        .map(([m, [l]]) => `<tr><td>${h(l)}</td>${S.roles.filter(r => r.status === 'Active').map(r => `<td title="${h(r.name)}: ${h(permText(r.perms[m]))}"><span class="pv ${r.perms[m] === '-' ? 'none' : ''}">${h(r.perms[m] || '-')}</span></td>`).join('')}</tr>`)
        .join('')}</tbody></table></div><p class="cap rmx-key">${PERMS.map(([k, , d]) => `<span><b class="pv">${k}</b> ${h(d.toLowerCase())}</span>`).join('')}<span><b class="pv none">-</b> no access</span></p>`,
      '',
      'adm-panel rmx-card',
    ) +
    '<div class="section-gap"></div>' +
    card(`Specialist permission bundles <span class="adm-n">${S.bundles.length}</span>`, 'Added to a role assignment for specific responsibilities.', table(['Bundle', 'Responsibility', 'Approval'], S.bundles.map(b => [`<b>${h(b.name)}</b>`, h(b.desc), `<span class="cap">${h(b.approval)}</span>`])), '', 'adm-panel')
  );
});
function roleDetail(r) {
  if (!r) return empty('shield', 'Role not found', '', L('All roles', 'roles'));
  const holders = S.assign.filter(a => a.role === r.id);
  const active = holders.filter(a => a.status === 'Active').length;
  const ro = r.status !== 'Active';
  const dirty = r.system && Object.keys(MODULES).some(m => r.perms[m] !== normPerm((MX[m] || {})[r.id]));
  const rows = Object.entries(MODULES)
    .map(([m, [l, d]]) => {
      const v = r.perms[m] || '-';
      const def = r.system ? normPerm((MX[m] || {})[r.id]) : null;
      return `<tr class="${def && def !== v ? 'changed' : ''}"><td><b>${h(l)}</b><div class="cap">${h(d)}</div></td><td><div class="permset" role="group" aria-label="${h(l)} permissions">${PERMS.map(
        ([k, lab, desc]) =>
          `<label class="chipchk perm-chip" title="${h(desc)}"><input type="checkbox" name="p_${m}" value="${k}" ${v.includes(k) ? 'checked' : ''} ${ro ? 'disabled' : ''}><span><b class="perm-k" aria-hidden="true">${k}</b>${lab}</span></label>`,
      ).join('')}</div></td><td class="pvcell"><span class="pv ${v === '-' ? 'none' : ''}">${h(v)}</span>${def && def !== v ? `<div class="cap">Default: ${h(def)}</div>` : ''}</td></tr>`;
    })
    .join('');
  return (
    `<header class="shead">${crumbsHtml([['Role management', 'roles'], [h(r.name)]])}<div class="shead-main"><span class="tile rol-tile" aria-hidden="true">${ic('shield', 22)}</span><div class="shead-t"><div class="shead-kind">${r.system ? 'Seeded role' : 'Custom role'} · ${h(r.id)}</div><div class="row wrap shead-title"><h1 class="h1">${h(r.name)}</h1>${pill(r.status)}</div><p class="sub">${h(r.desc)}</p><div class="shead-meta"><span>Behaves as: <b>${h(r.base === r.id ? 'itself' : ROLE[r.base])}</b></span><span>Joins by: <b>${h(r.joins)}</b></span><span>${r.approval ? 'Needs approval when requested' : 'Active on joining'}</span><span>${active} active ${active === 1 ? 'person' : 'people'}</span></div></div><div class="shead-a">${B(ic('edit', 16) + 'Edit details', 'roleEdit', { id: r.id }, 'btn-s')}${!r.system ? (r.status === 'Active' ? CB('Archive', 'roleState', { id: r.id, v: 'Archived' }, 'Archive the role ' + r.name + '? It can no longer be assigned. People who hold it keep it until reassigned.', 'btn-d', 'Archive') : B('Restore', 'roleState', { id: r.id, v: 'Active' }, 'btn-p')) : ''}</div></div></header>` +
    (r.id === 'T' ? banner('info', 'Platform Administrator', 'Platform administration access cannot be removed from this role, so the platform always has someone who can manage it.') + '<div class="section-gap"></div>' : '') +
    `<form data-f="rperm" class="rol-form" novalidate><input type="hidden" name="id" value="${r.id}">${card(
      'Module permissions',
      ro ? 'This role is archived. Restore it to change permissions.' : active ? 'Saving applies immediately to the ' + active + ' ' + (active === 1 ? 'person' : 'people') + ' holding this role.' : 'No one holds this role yet.',
      `<div class="tblwrap"><table class="tbl permtbl"><thead><tr><th scope="col">Module</th><th scope="col">Permissions</th><th scope="col">Effective</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      ro
        ? ''
        : `${r.system && dirty ? B(ic('refresh', 14) + 'Reset to default', 'roleReset', { id: r.id }) : ''}<button class="btn btn-p btn-sm" type="submit">${ic('check', 14)}Save permissions</button>`,
      'adm-panel',
    )}</form>` +
    '<div class="section-gap"></div>' +
    card(
      `People holding this role <span class="adm-n">${holders.length}</span>`,
      '',
      table(
        ['Person', 'Context', 'Status', 'Bundles'],
        holders.map(a => [`<div class="adm-who"><span class="av">${ini(a.pid)}</span><div class="adm-who-t"><b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email || '')}</div></div></div>`, h(S.contexts.find(c => c.id === a.ctx)?.name || a.ctx), pill(a.status), a.bundles.length ? `<div class="adm-tags">${a.bundles.map(b => pill(b, 'p-grey')).join('')}</div>` : '—']),
        'No one holds this role yet. Invite people to it from Programme administration.',
      ),
      '',
      'adm-panel',
    )
  );
}
F.rperm = d => {
  const r = roleRec(d.id);
  const next = Object.fromEntries(Object.keys(MODULES).map(m => [m, normPerm([].concat(d['p_' + m] || []).join(''))]));
  if (r.id === 'T' && !next.platform.includes('M')) {
    toast('Platform administration access cannot be removed from the Platform Administrator role.', 'err');
    return render();
  }
  if (!Object.values(next).some(v => v !== '-')) {
    toast('A role needs access to at least one module.', 'err');
    return render();
  }
  const changed = Object.keys(next).filter(m => (r.perms[m] || '-') !== next[m]);
  if (!changed.length) {
    toast('No changes to save.', 'warn');
    return render();
  }
  r.perms = { ...r.perms, ...next };
  r.updated = now();
  audit('Role permissions changed', r.id, changed.map(m => MODULES[m][0] + ': ' + next[m]).join('; '));
  toast('Permissions saved for ' + r.name + ' (' + changed.length + ' module' + (changed.length === 1 ? '' : 's') + ').');
  ok();
};
A.roleReset = d => {
  const r = roleRec(d.id);
  r.perms = seedPerms(r.id);
  audit('Role permissions reset to default', r.id, '');
  toast(r.name + ' reset to its default permissions.');
  ok();
};
A.roleNew = () => {
  clearF('rnew');
  UI.form.rnew = { base: 'P', joins: 'Invitation', copy: 'P' };
  modal('Create a role', () =>
    `<form data-f="rnew" class="col adm-form" novalidate>${fi('rnew', 'name', 'Role name', { req: true, max: 60, ph: 'e.g. Teaching Assistant' })}${fi('rnew', 'desc', 'What this role is for', { type: 'textarea', rows: 2, req: true, max: 240 })}<div class="f2">${fi('rnew', 'base', 'Behaves as', { type: 'select', req: true, opts: S.roles.filter(x => x.system && x.id !== 'T').map(x => [x.id, x.name]), help: 'Workflow rules (who can review, approve, steward) follow this role.' })}${fi('rnew', 'copy', 'Start permissions from', { type: 'select', opts: activeRoles().map(x => [x.id, x.name]), help: 'Copied now; edit them after creating.' })}</div><div class="f2">${fi('rnew', 'joins', 'Joins by', { type: 'select', opts: JOIN_ROUTES.filter(j => j !== 'System-provisioned') })}<div class="field adm-chkfield">${fi('rnew', 'approval', 'Needs approval before the role becomes active', { type: 'checkbox' })}</div></div><div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}<button class="btn btn-p" type="submit">Create role</button></div></form>`,
  );
};
F.rnew = d => {
  if (
    !validate('rnew', d, {
      name: ['req', ['fn', { f: v => !S.roles.some(x => x.name.toLowerCase() === v.trim().toLowerCase()), m: 'A role with this name already exists.' }]],
      desc: ['req'],
      base: ['req'],
    })
  )
    return render();
  const src = roleRec(d.copy) || roleRec(d.base);
  const r = { id: uid('R'), name: d.name.trim(), desc: d.desc.trim(), base: d.base, joins: d.joins || 'Invitation', approval: d.approval === 'yes', system: false, status: 'Active', perms: { ...src.perms }, updated: now() };
  S.roles.push(r);
  syncRoles();
  audit('Role created', r.id, r.name + ' · behaves as ' + ROLE[r.base]);
  UI.modal = null;
  clearF('rnew');
  save();
  go('roles', { id: r.id });
  toast(r.name + ' created. Review its module permissions below.');
};
A.roleEdit = d => {
  const r = roleRec(d.id);
  clearF('redit');
  UI.form.redit = { name: r.name, desc: r.desc, joins: r.joins, approval: r.approval ? 'yes' : '', base: r.base };
  modal('Edit ' + h(r.name), () =>
    `<form data-f="redit" class="col adm-form" novalidate><input type="hidden" name="id" value="${r.id}">${fi('redit', 'name', 'Role name', { req: true, max: 60 })}${fi('redit', 'desc', 'What this role is for', { type: 'textarea', rows: 2, req: true, max: 240 })}${r.system ? `<div class="field"><span class="lbl">Behaves as</span><span>Itself (seeded role)</span></div>` : fi('redit', 'base', 'Behaves as', { type: 'select', req: true, opts: S.roles.filter(x => x.system && x.id !== 'T').map(x => [x.id, x.name]), help: 'Changing this changes which workflow rules apply to everyone holding the role.' })}<div class="f2">${fi('redit', 'joins', 'Joins by', { type: 'select', opts: r.id === 'T' ? ['System-provisioned'] : JOIN_ROUTES })}<div class="field adm-chkfield">${fi('redit', 'approval', 'Needs approval before the role becomes active', { type: 'checkbox' })}</div></div><div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}<button class="btn btn-p" type="submit">Save</button></div></form>`,
  );
};
F.redit = d => {
  const r = roleRec(d.id);
  if (!validate('redit', d, { name: ['req', ['fn', { f: v => !S.roles.some(x => x.id !== r.id && x.name.toLowerCase() === v.trim().toLowerCase()), m: 'A role with this name already exists.' }]], desc: ['req'] })) return render();
  const before = JSON.stringify([r.name, r.desc, r.joins, r.approval, r.base]);
  r.name = d.name.trim();
  r.desc = d.desc.trim();
  r.joins = d.joins || r.joins;
  r.approval = d.approval === 'yes';
  if (!r.system && d.base) r.base = d.base;
  r.updated = now();
  syncRoles();
  if (before !== JSON.stringify([r.name, r.desc, r.joins, r.approval, r.base])) audit('Role details changed', r.id, r.name);
  UI.modal = null;
  clearF('redit');
  toast('Role saved.');
  ok();
};
A.roleState = d => {
  const r = roleRec(d.id);
  if (d.v === 'Archived' && S.assign.some(a => a.role === r.id && a.status === 'Active')) {
    toast('Reassign the people holding ' + r.name + ' before archiving it.', 'err');
    return render();
  }
  r.status = d.v;
  audit('Role ' + (d.v === 'Active' ? 'restored' : 'archived'), r.id, r.name);
  ok();
};

// ---------- POLICIES: the Platform Administrator writes, versions and publishes agreement text ----------
// Publishing a new version asks everyone it applies to to review the changes and accept (policy update dialog).
const polKey = g => g.type + '|' + g.ctx;
function polGroups() {
  return [...new Set(S.agreements.map(polKey))].map(k => {
    const vs = S.agreements.filter(g => polKey(g) === k).sort((a, b) => b.ver - a.ver);
    return { k, type: vs[0].type, ctx: vs[0].ctx, vs, act: vs.find(g => g.status === 'Active'), draft: vs.find(g => g.status === 'Draft') };
  });
}
const polAffected = g => S.assign.filter(a => a.ctx === g.ctx && a.status === 'Active' && g.roles.includes(roleBase(a.role)));
const polAccepted = g => polAffected(g).filter(a => S.accepts.some(x => x.pid === a.pid && x.ag === g.id));
const ctxName = id => h((S.contexts.find(c => c.id === id) || {}).name || id);
route('policies', 'platform', () => {
  const g0 = UI.p.id && byId('agreements', UI.p.id);
  if (g0) return policyPage(g0);
  const gs = polGroups();
  return (
    head('Policies & agreements', 'Each policy has versions. Publishing a new version asks everyone it applies to to review the changes and accept them before they continue.') +
    card(
      `Policy groups <span class="adm-n">${gs.length}</span>`,
      '',
      dataView('plat:policies', {
        label: 'policies',
        items: gs,
        search: x => x.type + ' ' + ((S.contexts.find(c => c.id === x.ctx) || {}).name || x.ctx) + ' ' + (x.act || x.vs[0]).roles.map(r => ROLE[r] || r).join(' '),
        quick: { label: 'State', options: [['draft', 'Draft in progress'], ['none', 'Not published']], test: (x, v) => (v === 'draft' ? !!x.draft : !x.act) },
        filters: [
          { key: 'ctx', label: 'Programme', options: [...new Set(gs.map(x => x.ctx))].map(c => [c, (S.contexts.find(y => y.id === c) || {}).name || c]), test: (x, v) => x.ctx === v },
          { key: 'type', label: 'Policy', options: [...new Set(gs.map(x => x.type))].map(t => [t, t]), test: (x, v) => x.type === v },
          { key: 'role', label: 'Applies to', options: [...new Set(gs.flatMap(x => (x.act || x.vs[0]).roles))].map(r => [r, ROLE[r] || r]), test: (x, v) => (x.act || x.vs[0]).roles.includes(v) },
        ],
        sorts: [
          ['type', 'Policy', (a, b) => a.type.localeCompare(b.type)],
          ['ctx', 'Programme', (a, b) => String((S.contexts.find(c => c.id === a.ctx) || {}).name || '').localeCompare(String((S.contexts.find(c => c.id === b.ctx) || {}).name || ''))],
          ['eff', 'Effective date', (a, b) => String(a.act ? a.act.effective : '').localeCompare(String(b.act ? b.act.effective : ''))],
        ],
        row: x => ({
          lead: `<span class="tile t-soft" aria-hidden="true">${ic('file', 18)}</span>`,
          title: L(h(x.type), 'policies', { id: (x.act || x.vs[0]).id }),
          sub: ctxName(x.ctx) + ' · applies to ' + (x.act || x.vs[0]).roles.map(r => h(ROLE[r] || r)).join(', '),
          meta: [
            x.act ? `<span class="pol-ver">v${x.act.ver}</span> effective ${fmt(x.act.effective)}` : 'None published',
            x.act ? (a => `<span class="pol-acc"><span class="ops-num">${a[0]} of ${a[1]} accepted</span><span class="progress" aria-hidden="true"><span class="bar" style="width:${a[1] ? Math.round((100 * a[0]) / a[1]) : 0}%"></span></span></span>`)([polAccepted(x.act).length, polAffected(x.act).length]) : '',
          ],
          badges: x.draft ? pill('Draft v' + x.draft.ver, 'p-amber') : '',
          primary: L('Open', 'policies', { id: (x.act || x.vs[0]).id }, 'btn btn-s btn-sm'),
        }),
        empty: ['file', 'No policies yet.', '', ''],
      }),
      '',
      'adm-panel',
    )
  );
});
function policyPage(g) {
  const grp = polGroups().find(x => x.k === polKey(g));
  const act = grp.act,
    draft = grp.draft;
  const shown = (UI.p.v && byId('agreements', UI.p.v)) || act || g;
  const roles = (act || g).roles.map(r => h(ROLE[r] || r)).join(', ');
  return (
    head(h(grp.type), ctxName(grp.ctx) + ' · applies to ' + roles, draft ? '' : B(ic('plus', 16) + 'New version', 'polNew', { id: (act || g).id }, 'btn-p'), [['Policies & agreements', 'policies'], [h(grp.type)]]) +
    (draft
      ? card(
          'Draft v' + draft.ver + ' — not published',
          'Nobody sees this until you publish it. ' + (draft.summary ? 'Change: ' + h(draft.summary) : ''),
          polDiffHtml(act, draft),
          `${B(ic('edit', 14) + 'Edit draft', 'polEdit', { id: draft.id })}${CB('Delete draft', 'polDel', { id: draft.id }, 'Delete draft v' + draft.ver + '? This cannot be undone.', 'btn-g btn-sm pol-del')}${CB(ic('send', 14) + 'Publish v' + draft.ver, 'polPublish', { id: draft.id }, 'Publish ' + h(grp.type) + ' v' + draft.ver + '? Everyone it applies to (' + polAffected(draft).length + ' people) will see the changes and must accept them before they continue.', 'btn-p btn-sm')}`,
          'accent pol-draft',
        ) + '<div class="section-gap"></div>'
      : '') +
    `<div class="g12 pol-grid">${card((shown.status === 'Active' ? 'Current policy · ' : 'Version ') + 'v' + shown.ver, 'Effective ' + fmt(shown.effective) + ' · ' + h(shown.status), `<div class="pol-doc">${polBody(shown)}</div>`, '', 'c8 pol-read')}
 ${card(
   'Version history',
   act ? polAccepted(act).length + ' of ' + polAffected(act).length + ' people have accepted v' + act.ver + '.' : '',
   `<ol class="pol-vers">${grp.vs
     .filter(v => v.status !== 'Draft')
     .map(
       v =>
         `<li class="pol-v${v.id === shown.id ? ' is-shown' : ''}"><div class="pol-v-h"><span class="pol-ver">v${v.ver}</span>${pill(v.status)}<span class="cap pol-v-d">${fmt(v.effective)}</span></div><p class="pol-v-s">${h(v.summary || '—')}</p><div class="pol-v-a">${v.id !== shown.id ? L('View', 'policies', { id: g.id, v: v.id }, 'btn btn-g btn-sm') : '<span class="cap">Shown</span>'}${polPrev(v) ? B('Compare', 'polCmp', { id: v.id }) : ''}</div></li>`,
     )
     .join('')}</ol>`,
   '',
   'c4 pol-hist',
 )}</div>`
  );
}
function polEditor(base, draft) {
  clearF('poled');
  UI.form.poled = { text: (draft || base).text || '', summary: draft ? draft.summary || '' : '', effective: draft ? draft.effective : today() };
  modal(
    draft ? 'Edit draft v' + draft.ver : 'New version of ' + h(base.type),
    () =>
      `<form data-f="poled" class="col adm-form pol-form" novalidate><input type="hidden" name="base" value="${base.id}"><input type="hidden" name="draft" value="${draft ? draft.id : ''}">${fi('poled', 'summary', 'What changed', { req: true, help: 'One or two sentences, shown to people together with the comparison.' })}${fi('poled', 'effective', 'Effective date', { type: 'date', req: true })}${fi('poled', 'text', 'Policy text', { type: 'textarea', rows: 16, req: true, help: 'Start each section with “## ” and a heading. Sections are compared heading by heading, word by word.' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">Save draft</button></div></form>`,
    true,
  );
}
A.polNew = d => polEditor(byId('agreements', d.id), null);
A.polEdit = d => {
  const g = byId('agreements', d.id);
  polEditor(g, g);
};
F.poled = d => {
  if (!validate('poled', d, { summary: ['req'], effective: ['req', 'date'], text: ['req', ['min', 40]] })) return render();
  const base = byId('agreements', d.base);
  let g = d.draft && byId('agreements', d.draft);
  if (!g) {
    const max = Math.max(...S.agreements.filter(x => polKey(x) === polKey(base)).map(x => x.ver));
    g = { id: uid('g'), type: base.type, ctx: base.ctx, ver: max + 1, status: 'Draft', roles: [...base.roles] };
    S.agreements.push(g);
  }
  Object.assign(g, { summary: d.summary.trim(), effective: d.effective, text: d.text.replace(/\r/g, '').trim(), by: myId(), at: now() });
  audit('Policy draft saved', g.id, g.type + ' v' + g.ver);
  UI.modal = null;
  clearF('poled');
  toast('Draft saved. Check the comparison, then publish.');
  save();
  go('policies', { id: g.id });
};
A.polPublish = d => {
  const g = byId('agreements', d.id);
  S.agreements.filter(x => polKey(x) === polKey(g) && x.status === 'Active').forEach(x => (x.status = 'Superseded'));
  g.status = 'Active';
  g.published = now();
  const aff = polAffected(g);
  aff.forEach(a => notify(a.pid, `Policy updated: ${g.type} v${g.ver}. Review the changes to continue.`, 'home'));
  audit('Policy published', g.id, g.type + ' v' + g.ver + ' · ' + aff.length + ' people must accept');
  toast('Published. ' + aff.length + ' people will be asked to review and accept the changes.');
  ok();
};
A.polDel = d => {
  const g = byId('agreements', d.id);
  const keep = polGroups().find(x => x.k === polKey(g));
  S.agreements = S.agreements.filter(x => x.id !== d.id);
  audit('Policy draft deleted', d.id, g.type + ' v' + g.ver);
  save();
  go('policies', keep && keep.act ? { id: keep.act.id } : {});
};
A.polCmp = d => {
  const g = byId('agreements', d.id);
  modal(h(g.type) + ': v' + polPrev(g).ver + ' → v' + g.ver, polDiffHtml(polPrev(g), g), true);
};

// ---------- PURPOSE COMPASS QUESTIONS: managed by the Platform Administrator ----------
// Add, edit, delete and reorder at any time. Deleting stops the question being asked; existing answers are kept.
route('compassqs', 'platform', () => {
  const qs = compassQs();
  const sets = [...new Set(qs.map(q => q.set))];
  const last = qs.length - 1;
  return (
    head('Purpose Compass questions', 'The questions people answer in the Purpose Compass, in the order they are asked. Changes apply the next time someone opens the Compass; existing answers are kept.', B(ic('plus', 16) + 'Add question', 'cqNew', {}, 'btn-p')) +
    card(
      'Active questions',
      qs.length + ' question' + (qs.length === 1 ? '' : 's') + ' in ' + sets.length + ' set' + (sets.length === 1 ? '' : 's') + '. Questions in the same set appear together on one screen.',
      dataView('plat:compass', {
        label: 'questions',
        items: qs,
        layout: 'table',
        pageSize: 50,
        search: q => q.text + ' ' + (q.help || '') + ' ' + q.set,
        quick: { label: 'Asked', options: [['onb', 'At onboarding'], ['later', 'Later, in Profile']], test: (q, v) => (v === 'onb' ? !!q.onb : !q.onb) },
        filters: [
          { key: 'set', label: 'Set', options: sets.map(x => [x, x]), test: (q, v) => q.set === v },
          { key: 'type', label: 'Answer type', options: [...new Set(qs.map(q => q.type))].map(t => [t, (COMPASS_TYPES.find(x => x[0] === t) || [, t])[1]]), test: (q, v) => q.type === v },
          { key: 'req', label: 'Required', options: [['yes', 'Required'], ['no', 'Optional']], test: (q, v) => (v === 'yes' ? !!q.req : !q.req) },
        ],
        columns: [
          { label: '#', cell: q => `<span class="cq-n">${String(qs.indexOf(q) + 1)}</span>` },
          { label: 'Question', cell: q => `<b>${h(q.text)}</b>${q.help ? `<div class="cap">${h(q.help)}</div>` : ''}` },
          { label: 'Set', cell: q => (i => `<span class="cq-set${i && qs[i - 1].set === q.set ? ' is-same' : ''}">${h(q.set)}</span>`)(qs.indexOf(q)) },
          { label: 'Type', hideSm: true, cell: q => `<span class="cap">${h((COMPASS_TYPES.find(t => t[0] === q.type) || [, q.type])[1])}</span>` },
          { label: 'Required', cell: q => (q.req ? pill('Required', 'p-navy') : '<span class="cap">Optional</span>') },
          { label: 'Asked', hideSm: true, cell: q => `<span class="cap">${q.onb ? 'At onboarding' : 'Later, in Profile'}</span>` },
          { label: '', cell: q => (i => `<div class="cq-acts"><span class="cq-move" role="group" aria-label="Reorder">${B(ic('chev', 16), 'cqMove', { id: q.id, dir: -1 }, 'btn-s btn-sm cq-up' + (i === 0 ? ' is-off' : ''), `aria-label="Move up"${i === 0 ? ' disabled' : ''}`)}${B(ic('chev', 16), 'cqMove', { id: q.id, dir: 1 }, 'btn-s btn-sm cq-dn' + (i === last ? ' is-off' : ''), `aria-label="Move down"${i === last ? ' disabled' : ''}`)}</span>${B('Edit', 'cqEdit', { id: q.id })}${CB('Delete', 'cqDel', { id: q.id }, 'Delete “' + h(q.text.slice(0, 80)) + '”? People will no longer be asked it. Answers already given are kept.', 'btn-g btn-sm cq-del')}</div>`)(qs.indexOf(q)) },
        ],
        empty: ['target', 'No active questions. People skip the Purpose Compass until you add one.', '', ''],
      }),
      '',
      'adm-panel cq-card',
    ) + `<p class="cap cq-note">${ic('info', 14)}<span>Answers to the Purpose (PC1), Outcome (PC2) and First milestone (PC5) questions also show on the person’s North Star card. Deleting those questions leaves the card empty for new people.</span></p>`
  );
});
function cqEditor(q) {
  clearF('cq');
  const sets = [...new Set(compassQs().map(x => x.set))];
  UI.form.cq = q
    ? { text: q.text, set: q.set, setNote: q.setNote || '', help: q.help || '', type: q.type, req: q.req ? 'yes' : '', onb: q.onb ? 'yes' : '', vis: q.vis || 'Private' }
    : { type: 'textarea', onb: 'yes', vis: 'Private', set: sets[sets.length - 1] || '' };
  modal(
    q ? 'Edit question' : 'Add a question',
    () =>
      `<form data-f="cq" class="col adm-form" novalidate><input type="hidden" name="id" value="${q ? q.id : ''}">${fi('cq', 'text', 'Question', { type: 'textarea', rows: 2, req: true })}<div class="f2"><div class="field"><label class="lbl" for="cq_set">Set <span class="req">*</span></label><input id="cq_set" name="set" class="input${fe('cq', 'set') ? ' err' : ''}" list="cq-sets" value="${h(fv('cq', 'set', ''))}" placeholder="e.g. Blockers"><datalist id="cq-sets">${sets.map(x => `<option value="${h(x)}">`).join('')}</datalist>${fe('cq', 'set') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('cq', 'set')}</span>` : ''}<span class="help">Pick an existing set or type a new one.</span></div>${fi('cq', 'type', 'Answer type', { type: 'select', opts: COMPASS_TYPES })}</div>${fi('cq', 'setNote', 'Set description (optional)', { help: 'Shown under the set title.' })}${fi('cq', 'help', 'Help text (optional)')}${fi('cq', 'vis', 'Visibility shown to the person', { type: 'select', opts: COMPASS_VIS })}${fi('cq', 'req', 'Required', { type: 'checkbox' })}${fi('cq', 'onb', 'Ask at onboarding (otherwise asked later, in Profile)', { type: 'checkbox' })}<div class="actions"><span></span><button class="btn btn-p" type="submit">${q ? 'Save changes' : 'Add question'}</button></div></form>`,
  );
}
A.cqNew = () => cqEditor(null);
A.cqEdit = d => cqEditor((S.compassQs || []).find(q => q.id === d.id));
F.cq = d => {
  if (!validate('cq', d, { text: ['req', ['min', 3]], set: ['req'] })) return render();
  const fields = { text: d.text.trim(), set: d.set.trim(), setNote: (d.setNote || '').trim(), help: (d.help || '').trim(), type: COMPASS_TYPES.some(t => t[0] === d.type) ? d.type : 'textarea', req: d.req === 'yes', onb: d.onb === 'yes', vis: d.vis || 'Private' };
  let q = d.id && (S.compassQs || []).find(x => x.id === d.id);
  if (q) Object.assign(q, fields);
  else {
    q = { id: 'q' + uid(''), ...fields, order: Math.max(0, ...compassQs().map(x => x.order)) + 1 };
    (S.compassQs = S.compassQs || []).push(q);
  }
  audit(d.id ? 'Purpose Compass question edited' : 'Purpose Compass question added', q.id, q.text.slice(0, 80));
  UI.modal = null;
  clearF('cq');
  toast(d.id ? 'Question updated.' : 'Question added at the end. Move it up if needed.');
  ok();
};
A.cqMove = d => {
  const qs = compassQs();
  const i = qs.findIndex(q => q.id === d.id);
  const j = i + +d.dir;
  if (i < 0 || j < 0 || j >= qs.length) return;
  [qs[i].order, qs[j].order] = [qs[j].order, qs[i].order];
  audit('Purpose Compass question moved', d.id, +d.dir < 0 ? 'up' : 'down');
  ok();
};
A.cqDel = d => {
  const q = (S.compassQs || []).find(x => x.id === d.id);
  q.deleted = true;
  q.deletedAt = now();
  compassQs().forEach((x, i) => (x.order = i + 1));
  audit('Purpose Compass question deleted', q.id, q.text.slice(0, 80));
  toast('Question deleted. Existing answers are kept.');
  ok();
};
