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
function orgMark(o, size = 28) {
  if (!o) return '';
  if (o.logo) return `<span class="orgmark" style="width:${size}px;height:${size}px"><img src="${o.logo}" alt=""></span>`;
  const bg = HEX.test(o.brand || '') ? o.brand : '#004369';
  const fg = lumOf(bg) > 0.4 ? '#102330' : '#ffffff';
  const t = (o.short || o.name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  return `<span class="orgmark" style="width:${size}px;height:${size}px;background:${bg};color:${fg};font-size:${Math.round(size * 0.36)}px" aria-hidden="true">${h(t)}</span>`;
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
    `<div class="row wrap" style="gap:8px;margin-bottom:16px"><input class="input" style="max-width:300px" placeholder="Search name, domain or email" value="${h(q.tq || '')}" data-ch="qf" data-k="tq" aria-label="Search organizations"><select class="input" style="width:auto" data-ch="qf" data-k="tt" aria-label="Type"><option value="">Type: all</option>${ORG_TYPES.map(t => `<option ${q.tt === t ? 'selected' : ''}>${t}</option>`).join('')}</select><select class="input" style="width:auto" data-ch="qf" data-k="ts" aria-label="Status"><option value="">Status: all</option>${['Active', 'Suspended'].map(t => `<option ${q.ts === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` +
    card(
      S.orgs.length + ' organization' + (S.orgs.length === 1 ? '' : 's'),
      list.length !== S.orgs.length ? list.length + ' match the filters' : '',
      table(
        ['Organization', 'Type', 'Domain', 'Primary contact', 'Contexts', 'People', 'Status', ''],
        list.map(o => [
          `<span class="row" style="gap:10px;flex-wrap:nowrap">${orgMark(o, 32)}<span class="col" style="min-width:0"><b>${h(o.name)}</b><span class="cap">${h(o.short || o.id)}</span></span></span>`,
          h(o.type),
          o.domains ? h(o.domains.split(',')[0].trim()) + (o.domains.includes(',') ? ' <span class="cap">+' + (o.domains.split(',').length - 1) + '</span>' : '') : '—',
          o.email ? `${h(o.contact || '')}<div class="cap">${h(o.email)}</div>` : '—',
          ctxCount(o.id),
          ppl(o.id),
          pill(o.status),
          L('Open', 'tenants', { id: o.id }),
        ]),
        'No organizations match these filters.',
      ),
    )
  );
});
function tenantDetail(o) {
  if (!o) return empty('building', 'Organization not found', '', L('All organizations', 'tenants'));
  const cs = S.contexts.filter(c => c.org === o.id);
  const ppl = S.people.filter(p => p.org === o.id);
  return (
    `<header class="shead"><nav class="row cap" aria-label="Breadcrumb" style="gap:6px;margin-bottom:14px">${L('Organizations', 'tenants', {}, 'cap')}${ic('chevr', 14)}<span>${h(o.name)}</span></nav><div class="shead-main">${orgMark(o, 48)}<div class="shead-t"><div class="shead-kind">${h(o.type)} · ${h(o.short || o.id)}</div><div class="row wrap"><h1 class="h1">${h(o.name)}</h1>${pill(o.status)}</div>${o.profile ? `<p class="sub">${h(o.profile)}</p>` : ''}<div class="shead-meta"><span>Created ${fmt(o.created)}</span><span>${cs.length} context${cs.length === 1 ? '' : 's'}</span><span>${ppl.length} ${ppl.length === 1 ? 'person' : 'people'}</span></div></div><div class="shead-a">${B(ic('edit', 16) + 'Edit', 'tenantNew', { id: o.id })}${o.status === 'Active' ? B(ic('plus', 16) + 'Create context', 'ctxNew', { org: o.id }, 'btn-p') : ''}</div></div></header>` +
    (o.status === 'Suspended' ? banner('warn', 'Suspended', 'No new contexts can be created for this organization. Existing contexts and their data are unchanged.') + '<div class="section-gap"></div>' : '') +
    `<div class="g12">${card(
      'Organization details',
      '',
      dl([
        ['Organization name', h(o.name)],
        ['Short name', h(o.short || '—')],
        ['Type', h(o.type)],
        ['Primary contact', h(o.contact || '—')],
        ['Email', o.email ? `<a class="lnk" href="mailto:${h(o.email)}">${h(o.email)}</a>` : '—'],
        ['Phone', h(o.phone || '—')],
        ['Website', o.web ? `<a class="lnk" href="${h(o.web)}" target="_blank" rel="noopener">${h(o.web)}</a>` : '—'],
        ['Email domains', o.domains ? o.domains.split(',').map(d => `<span class="pill p-grey">${h(d.trim())}</span>`).join(' ') : '—'],
        ['Address', h(o.address || '—')],
        ['Country', h(o.country || '—')],
        ['Time zone', h(o.tz || '—')],
        ['Default language', h(o.lang || '—')],
        ['Data residency', h(o.region || '—')],
      ]),
      '',
      'c8',
    )}${card(
      'Branding',
      'Shown wherever this organization’s contexts appear.',
      `<div class="brandbox"><div class="brandlogo">${o.logo ? `<img src="${o.logo}" alt="${h(o.name)} logo">` : orgMark(o, 64)}</div><div class="col" style="gap:4px"><span class="cap">Brand colour</span><span class="row" style="gap:8px"><span class="swatch" style="background:${h(o.brand)}"></span><b>${h(o.brand.toUpperCase())}</b></span><span class="cap" style="margin-top:6px">${o.logo ? 'Logo uploaded' : 'No logo — initials on the brand colour are used'}</span></div></div>`,
      '',
      'c4',
    )}
    <div class="c12">${card(
      'Contexts',
      'Programmes, cohorts and organization spaces owned by this organization.',
      table(
        ['Context', 'Kind', 'Pack', 'Status', 'Members'],
        cs.map(c => [`<b>${h(c.name)}</b><div class="cap">${c.id}</div>`, h(c.kind), h(S.packs.find(p => p.id === c.pack)?.name || '—'), pill(c.status), S.assign.filter(a => a.ctx === c.id).length]),
        'No contexts yet. Create the first one for this organization.',
      ),
      o.status === 'Active' ? B(ic('plus', 14) + 'Create context', 'ctxNew', { org: o.id }, 'btn-s btn-sm') : '',
    )}</div>
    <div class="c12">${card(
      'People',
      'Accounts affiliated with this organization.',
      table(
        ['Person', 'Email', 'Roles'],
        ppl.map(p => [`<b>${h(p.name)}</b>`, h(p.email), S.assign.filter(a => a.pid === p.id).map(a => h(ROLE[a.role] || a.role) + ' <span class="cap">· ' + h(S.contexts.find(c => c.id === a.ctx)?.name || '') + '</span>').join('<br>') || '—']),
        'No people affiliated yet.',
      ),
    )}</div>
    <div class="c12">${card('Lifecycle', '', `<div class="row wrap" style="gap:8px">${o.status === 'Active' ? CB(ic('pause', 14) + 'Suspend organization', 'tenantState', { id: o.id, v: 'Suspended' }, 'Suspend ' + o.name + '? No new contexts can be created for it. Existing contexts and their data are not changed.', 'btn-d btn-sm', 'Suspend') : B('Reactivate organization', 'tenantState', { id: o.id, v: 'Active' }, 'btn-p btn-sm')}<span class="cap">Suspension is recorded in the audit log.</span></div>`)}</div></div>`
  );
}
// Logo choice is held apart from form state: a data URL (new image), '' (removed), 'bad' (rejected) or undefined (unchanged).
const tntLogo = o => (typeof UI._tntLogo === 'string' && UI._tntLogo.startsWith('data:') ? UI._tntLogo : UI._tntLogo === '' ? null : o ? o.logo : null);
A.tenantNew = d => {
  const o = d.id && orgOf(d.id);
  clearF('tnt');
  UI._tntLogo = undefined;
  UI.form.tnt = o
    ? { ...o }
    : { type: 'University', status: 'Active', brand: '#004369', tz: 'Europe/London', lang: 'English', region: 'United Kingdom', country: '' };
  modal(
    o ? 'Edit ' + h(o.name) : 'Create an organization',
    () => {
      const f = 'tnt';
      const cur = { ...(UI.form.tnt || {}), logo: tntLogo(o) };
      return `<form data-f="tnt" class="col tnt-form" style="gap:18px" novalidate><input type="hidden" name="id" value="${o ? o.id : ''}">${errSum(f)}
    <fieldset class="fs"><legend>Identity</legend><div class="f2">${fi(f, 'name', 'Organization name', { req: true, max: 120 })}${fi(f, 'short', 'Short name or code', { max: 12, help: 'Used in lists and as initials when there is no logo.' })}</div><div class="f2">${fi(f, 'type', 'Type', { type: 'select', req: true, opts: ORG_TYPES })}${fi(f, 'status', 'Status', { type: 'select', req: true, opts: ['Active', 'Suspended'] })}</div>${fi(f, 'profile', 'About the organization', { type: 'textarea', rows: 2, max: 400 })}</fieldset>
    <fieldset class="fs"><legend>Contact</legend><div class="f2">${fi(f, 'contact', 'Primary contact name', { req: true })}${fi(f, 'email', 'Primary contact email', { type: 'email', req: true, auto: 'email' })}</div><div class="f2">${fi(f, 'phone', 'Phone', { type: 'tel', auto: 'tel' })}${fi(f, 'web', 'Website', { type: 'url', ph: 'https://' })}</div></fieldset>
    <fieldset class="fs"><legend>Domain and branding</legend>${fi(f, 'domains', 'Email domains', { req: true, ph: 'example.org, mail.example.org', help: 'Comma-separated. People signing up with these domains can be matched to this organization.' })}<div class="f2"><div class="field"><label class="lbl" for="tnt_brand">Brand colour <span class="req">*</span></label><div class="row" style="gap:8px;flex-wrap:nowrap"><input type="color" id="tnt_brandpick" value="${h(HEX.test(cur.brand || '') ? cur.brand : '#004369')}" data-brandpick="1" aria-label="Pick brand colour" class="colorpick"><input id="tnt_brand" name="brand" class="input${fe(f, 'brand') ? ' err' : ''}" value="${h(cur.brand || '')}" placeholder="#004369" maxlength="7" data-brandhex="1"></div>${fe(f, 'brand') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, 'brand')}</span>` : '<span class="help">Hex value, for example #004369.</span>'}</div><div class="field"><span class="lbl">Brand logo</span><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="tnt-prev">${cur.logo ? `<img src="${cur.logo}" alt="">` : orgMark({ ...cur, name: cur.name || '?' }, 40)}</span><label class="btn btn-s btn-sm" style="cursor:pointer">${ic('upload', 14)}${cur.logo ? 'Replace' : 'Upload'}<input type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="sr" data-tntlogo="1"></label>${cur.logo ? B('Remove', 'tntLogoX', {}, 'btn-g btn-sm') : ''}</div>${fe(f, 'logo') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe(f, 'logo')}</span>` : '<span class="help">PNG, JPG, SVG or WebP, up to 300 KB.</span>'}</div></div></fieldset>
    <fieldset class="fs"><legend>Location and data</legend>${fi(f, 'address', 'Address', { type: 'textarea', rows: 2 })}<div class="f2">${fi(f, 'country', 'Country', { req: true })}${fi(f, 'tz', 'Time zone', { type: 'select', req: true, opts: TIMEZONES })}</div><div class="f2">${fi(f, 'lang', 'Default language', { type: 'select', opts: LANGS })}${fi(f, 'region', 'Data residency region', { type: 'select', req: true, opts: REGIONS, help: 'Where this organization’s data is expected to be stored.' })}</div></fieldset>
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
    brand: ['req', ['fn', { f: v => HEX.test(v), m: 'Enter a hex colour such as #004369.' }]],
    web: [['fn', { f: v => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), m: 'Enter a full web address starting with https://' }]],
    country: ['req'],
    tz: ['req'],
    region: ['req'],
  });
  if (UI._tntLogo === 'bad') {
    UI.err.tnt = { ...(UI.err.tnt || {}), logo: 'Logo must be a PNG, JPG, SVG or WebP image up to 300 KB.' };
    UI._tntLogo = undefined;
    return render();
  }
  if (!ok_) return render();
  const logo = tntLogo(o);
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
    brand: d.brand.toLowerCase(),
    logo,
    address: (d.address || '').trim(),
    country: d.country.trim(),
    tz: d.tz,
    lang: d.lang || 'English',
    region: d.region,
  };
  let target = o;
  if (o) {
    const changed = Object.keys(rec).filter(k => (o[k] || '') !== (rec[k] || ''));
    Object.assign(o, rec);
    audit('Organization updated', o.id, changed.join(', ') || 'no changes');
    toast('Organization saved.');
  } else {
    target = { id: uid('o'), created: today(), ...rec };
    S.orgs.push(target);
    audit('Organization created', target.id, target.name);
    toast(target.name + ' created. It is now available when you create a context.');
  }
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
      table(
        ['Role', 'Behaves as', 'Joins by', 'Approval', 'Modules', 'People', 'Status', ''],
        S.roles.map(r => [
          `<b>${h(r.name)}</b> <span class="kb-key">${h(r.id)}</span><div class="cap">${h(r.desc)}</div>`,
          r.base === r.id ? '<span class="cap">Itself</span>' : h(ROLE[r.base] || r.base),
          h(r.joins),
          r.approval ? pill('Approval needed', 'p-amber') : pill('Automatic', 'p-grey'),
          `<span style="white-space:nowrap">${mods(r)} of ${Object.keys(MODULES).length}</span>`,
          people(r.id),
          pill(r.status === 'Active' ? (r.system ? 'Seeded' : 'Custom') : r.status, r.status !== 'Active' ? 'p-grey' : r.system ? 'p-teal' : 'p-purple'),
          L('Manage', 'roles', { id: r.id }),
        ]),
      ),
    ) +
    '<div class="section-gap"></div>' +
    card(
      'Role × module overview',
      'Read-only summary of current permissions. Open a role to change them.',
      `<div class="tblwrap"><table class="tbl rmx"><thead><tr><th>Module</th>${S.roles
        .filter(r => r.status === 'Active')
        .map(r => `<th title="${h(r.name)}">${h(r.id)}</th>`)
        .join('')}</tr></thead><tbody>${Object.entries(MODULES)
        .map(([m, [l]]) => `<tr><td>${h(l)}</td>${S.roles.filter(r => r.status === 'Active').map(r => `<td title="${h(r.name)}: ${h(permText(r.perms[m]))}"><span class="pv ${r.perms[m] === '-' ? 'none' : ''}">${h(r.perms[m] || '-')}</span></td>`).join('')}</tr>`)
        .join('')}</tbody></table></div><p class="cap" style="margin-top:10px">${PERMS.map(([k, , d]) => `<b>${k}</b> ${h(d.toLowerCase())}`).join(' · ')} · <b>-</b> no access</p>`,
    ) +
    '<div class="section-gap"></div>' +
    card('Specialist permission bundles', 'Added to a role assignment for specific responsibilities.', table(['Bundle', 'Responsibility', 'Approval'], S.bundles.map(b => [`<b>${h(b.name)}</b>`, h(b.desc), h(b.approval)])))
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
          `<label class="chipchk" title="${h(desc)}"><input type="checkbox" name="p_${m}" value="${k}" ${v.includes(k) ? 'checked' : ''} ${ro ? 'disabled' : ''}><span>${lab}</span></label>`,
      ).join('')}</div></td><td class="pvcell"><span class="pv ${v === '-' ? 'none' : ''}">${h(v)}</span>${def && def !== v ? `<div class="cap">Default: ${h(def)}</div>` : ''}</td></tr>`;
    })
    .join('');
  return (
    `<header class="shead"><nav class="row cap" aria-label="Breadcrumb" style="gap:6px;margin-bottom:14px">${L('Role management', 'roles', {}, 'cap')}${ic('chevr', 14)}<span>${h(r.name)}</span></nav><div class="shead-main"><span class="shead-ic k-rooms" style="background:var(--ever-800)">${ic('shield', 22)}</span><div class="shead-t"><div class="shead-kind">${r.system ? 'Seeded role' : 'Custom role'} · ${h(r.id)}</div><div class="row wrap"><h1 class="h1">${h(r.name)}</h1>${pill(r.status)}</div><p class="sub">${h(r.desc)}</p><div class="shead-meta"><span>Behaves as: <b>${h(r.base === r.id ? 'itself' : ROLE[r.base])}</b></span><span>Joins by: <b>${h(r.joins)}</b></span><span>${r.approval ? 'Needs approval when requested' : 'Active on joining'}</span><span>${active} active ${active === 1 ? 'person' : 'people'}</span></div></div><div class="shead-a">${B(ic('edit', 16) + 'Edit details', 'roleEdit', { id: r.id })}${!r.system ? (r.status === 'Active' ? CB('Archive', 'roleState', { id: r.id, v: 'Archived' }, 'Archive the role ' + r.name + '? It can no longer be assigned. People who hold it keep it until reassigned.', 'btn-d', 'Archive') : B('Restore', 'roleState', { id: r.id, v: 'Active' }, 'btn-p')) : ''}</div></div></header>` +
    (r.id === 'T' ? banner('info', 'Platform Administrator', 'Platform administration access cannot be removed from this role, so the platform always has someone who can manage it.') + '<div class="section-gap"></div>' : '') +
    `<form data-f="rperm" novalidate><input type="hidden" name="id" value="${r.id}">${card(
      'Module permissions',
      ro ? 'This role is archived. Restore it to change permissions.' : active ? 'Saving applies immediately to the ' + active + ' ' + (active === 1 ? 'person' : 'people') + ' holding this role.' : 'No one holds this role yet.',
      `<div class="tblwrap"><table class="tbl permtbl"><thead><tr><th>Module</th><th>Permissions</th><th>Effective</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      ro
        ? ''
        : `<div class="row wrap" style="gap:8px">${r.system && dirty ? B(ic('refresh', 14) + 'Reset to default', 'roleReset', { id: r.id }) : ''}<button class="btn btn-p btn-sm" type="submit">${ic('check', 14)}Save permissions</button></div>`,
    )}</form>` +
    '<div class="section-gap"></div>' +
    card(
      'People holding this role',
      '',
      table(
        ['Person', 'Context', 'Status', 'Bundles'],
        holders.map(a => [`<b>${nm(a.pid)}</b><div class="cap">${h(P(a.pid).email || '')}</div>`, h(S.contexts.find(c => c.id === a.ctx)?.name || a.ctx), pill(a.status), a.bundles.map(b => pill(b, 'p-grey')).join(' ') || '—']),
        'No one holds this role yet. Invite people to it from Programme administration.',
      ),
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
    `<form data-f="rnew" class="col" style="gap:14px" novalidate>${fi('rnew', 'name', 'Role name', { req: true, max: 60, ph: 'e.g. Teaching Assistant' })}${fi('rnew', 'desc', 'What this role is for', { type: 'textarea', rows: 2, req: true, max: 240 })}<div class="f2">${fi('rnew', 'base', 'Behaves as', { type: 'select', req: true, opts: S.roles.filter(x => x.system && x.id !== 'T').map(x => [x.id, x.name]), help: 'Workflow rules (who can review, approve, steward) follow this role.' })}${fi('rnew', 'copy', 'Start permissions from', { type: 'select', opts: activeRoles().map(x => [x.id, x.name]), help: 'Copied now; edit them after creating.' })}</div><div class="f2">${fi('rnew', 'joins', 'Joins by', { type: 'select', opts: JOIN_ROUTES.filter(j => j !== 'System-provisioned') })}<div class="field" style="justify-content:flex-end">${fi('rnew', 'approval', 'Needs approval before the role becomes active', { type: 'checkbox' })}</div></div><div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}<button class="btn btn-p" type="submit">Create role</button></div></form>`,
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
    `<form data-f="redit" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${r.id}">${fi('redit', 'name', 'Role name', { req: true, max: 60 })}${fi('redit', 'desc', 'What this role is for', { type: 'textarea', rows: 2, req: true, max: 240 })}${r.system ? `<div class="field"><span class="lbl">Behaves as</span><span>Itself (seeded role)</span></div>` : fi('redit', 'base', 'Behaves as', { type: 'select', req: true, opts: S.roles.filter(x => x.system && x.id !== 'T').map(x => [x.id, x.name]), help: 'Changing this changes which workflow rules apply to everyone holding the role.' })}<div class="f2">${fi('redit', 'joins', 'Joins by', { type: 'select', opts: r.id === 'T' ? ['System-provisioned'] : JOIN_ROUTES })}<div class="field" style="justify-content:flex-end">${fi('redit', 'approval', 'Needs approval before the role becomes active', { type: 'checkbox' })}</div></div><div class="actions">${B('Cancel', 'closeM', {}, 'btn-g')}<button class="btn btn-p" type="submit">Save</button></div></form>`,
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
