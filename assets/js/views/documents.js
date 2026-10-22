// ---------- DOCUMENTS: every file of a project, by the space it was shared in ----------
// Folders: Circle Team, Rope Team, Action Room (with Milestones and Tasks) and Evidence. Nothing is copied: each row
// points at the record that holds the file (a space document, chat attachment, contribution, work review, milestone or
// task file, or evidence), so the visibility set here travels with that record.
// Public: everyone in the programme context who can open Documents. Private: the people of the space it was shared in
// (and the project owner, its steward and Programme Administrators, except in a Rope Team).
// A Private project is listed only for its team, and its Public files are shared with that team only.
const DOC_ROLES = ['P', 'M', 'F', 'C', 'A'];
const DOC_VIS = ['Public', 'Private'];
// The folder name the Documents module uses for every pack (the execution space is called Action Room everywhere).
const DOC_ROOM = 'Action Room';
const docFolders = () => [
  ['circle', 'Circle Team', 'users', 't-purple', 'Files shared in the project’s Circle: uploaded documents and chat attachments.'],
  ['rope', 'Rope Team', 'route', 't-teal', 'Files shared in the project’s Rope Team. Open only to its members.'],
  ['room', DOC_ROOM, 'room', 't-navy', 'Files of the ' + DOC_ROOM + ', with a folder for each milestone and each task.'],
  ['evidence', 'Evidence', 'award', 't-soft', 'Evidence linked to the project or to any of its spaces.'],
];
const docFolder = f => docFolders().find(x => x[0] === f);
const DOC_ROPE_LOCK = 'Rope Team content is ROPE_TEAM_ONLY: it stays Private to the Rope Team’s members.';
// Every room of the project: its own, ones created for it, and ones linked to it (the project can move between them).
const docSpaces = p => {
  const ln = new Set(linkedIds(p.id));
  return {
    circles: S.circles.filter(c => c.id === p.circle || c.project === p.id || ln.has(c.id)),
    ropes: S.ropes.filter(x => x.id === p.rope || x.project === p.id || ln.has(x.id)),
    rooms: S.rooms.filter(x => x.id === p.room || roomProject(x) === p || ln.has(x.id)),
  };
};
// The owner, the project's stewards and Programme Administrators manage a project's documents.
const docMgr = p => !!p && (p.owner === myId() || (role() === 'F' && stewardOf(p)) || role() === 'A');
// The project team: its owner, stewards and the active members of any of its spaces.
const docTeam = p => {
  if (!p) return false;
  if (p.owner === myId() || p.stewards.includes(myId())) return true;
  const sp = docSpaces(p);
  return [...sp.circles, ...sp.ropes, ...sp.rooms].some(o => memberOf(o));
};
// A project is Public once its team approved it by vote and its owner published it (views/publish.js).
const projVis = p => (pubPublished(p) ? 'Public' : 'Private');
const docCanOpen = p => !!p && inCtx(p) && p.status !== 'Draft' && DOC_ROLES.includes(role()) && (projVis(p) === 'Public' || docTeam(p) || docMgr(p));
const docProjects = () => S.projects.filter(docCanOpen);
// Evidence keeps its own governance: only approved, programme-level, non-sensitive evidence can be Public.
const evDocLock = e =>
  (e.lifecycle || 'Active') !== 'Active'
    ? (e.lifecycle || 'Withdrawn') + ' evidence stays Private.'
    : e.conf && e.conf !== 'Programme'
      ? 'Evidence confidentiality is “' + e.conf + '”, so it stays Private.'
      : e.sens === 'High'
        ? 'High-sensitivity evidence stays Private.'
        : e.review !== 'Approved'
          ? 'Evidence can be made Public once it is approved (now: ' + e.review + ').'
          : null;
const docVisOf = d => (d.lock ? 'Private' : d.h.docVis || d.def || 'Private');
const SPACE_KIND = { circle: 'circles', rope: 'ropes', room: 'rooms' };

// Every file of a project, as rows: { key, f (folder), sub ('ms' | 'tk'), it (milestone or task id), sp (space),
// n, mb, by, at, src, h (the record holding visibility), ev (evidence id), lock (why it must stay Private) }.
function docIndex(p) {
  const { circles, ropes, rooms } = docSpaces(p);
  const out = [];
  const chat = (f, sp, ab) =>
    (sp.chat || []).forEach(m => {
      if (!m.att || m.hidden) return;
      if (typeof m.att === 'string') m.att = { n: m.att, mb: null };
      out.push({ key: ab + 'a:' + sp.id + ':' + m.id, f, sp, n: m.att.n, mb: m.att.mb, by: m.by, at: m.at, src: 'Chat attachment', h: m.att });
    });
  const docs = (f, sp, ab, list, extra) =>
    (list || []).forEach(x => out.push({ key: ab + ':' + sp.id + ':' + (extra ? extra.it + ':' : '') + x.id, f, sp, n: x.n, mb: x.mb, by: x.by, at: x.at, src: (extra && extra.src) || 'Uploaded document', h: x, file: x, ...(extra || {}) }));
  const evRow = (f, sp, e, extra) => ({ f, sp, n: e.file || e.title, mb: e.sizeMB, by: e.owner, at: (e.history && e.history[0] && e.history[0].at) || '', h: e, ev: e.id, lock: evDocLock(e), def: 'Private', title: e.title, ...extra });
  circles.forEach(c => {
    docs('circle', c, 'cd', c.docs);
    chat('circle', c, 'c');
  });
  ropes.forEach(x => {
    docs('rope', x, 'rd', x.docs);
    chat('rope', x, 'r');
    (x.reviews || []).forEach(v => v.att && out.push({ key: 'rv:' + x.id + ':' + v.id, f: 'rope', sp: x, n: v.att.n, mb: v.att.mb, by: v.by, at: v.at, src: 'Work review', h: v.att }));
  });
  rooms.forEach(x => {
    docs('room', x, 'xd', x.docs);
    chat('room', x, 'x');
    (x.contribs || []).forEach(c => c.att && out.push({ key: 'xc:' + x.id + ':' + c.id, f: 'room', sp: x, n: c.att.n, mb: c.att.mb, by: c.by, at: c.at, src: 'Contribution', h: c.att }));
    (x.milestones || []).forEach(m => {
      docs('room', x, 'md', m.files, { sub: 'ms', it: m.id, src: 'Milestone file' });
      msItems(m).forEach(it => {
        const e = byId('evidence', it.ev);
        if (e) out.push(evRow('room', x, e, { key: 'me:' + x.id + ':' + m.id + ':' + e.id, sub: 'ms', it: m.id, src: 'Milestone evidence', at: it.at || '' }));
      });
    });
    (x.tasks || []).forEach(k => {
      docs('room', x, 'td', k.files, { sub: 'tk', it: k.id, src: 'Task file' });
      (k.evidence || []).forEach(id => {
        const e = byId('evidence', id);
        if (e) out.push(evRow('room', x, e, { key: 'te:' + x.id + ':' + k.id + ':' + e.id, sub: 'tk', it: k.id, src: 'Task evidence' }));
      });
    });
  });
  S.evidence
    .filter(e => evProjects(e).includes(p))
    .forEach(e => {
      const sp = (e.linked || []).map(l => byId('circles', l) || byId('ropes', l) || byId('rooms', l)).find(Boolean) || null;
      out.push(evRow('evidence', sp, e, { key: 'ev:' + e.id, src: 'Evidence · ' + e.review }));
    });
  out.forEach(d => {
    if (d.f === 'rope') d.lock = DOC_ROPE_LOCK;
  });
  return out;
}
const docKind = d => (d.sp ? SPACE_KIND[d.f] || (S.circles.includes(d.sp) ? 'circles' : S.ropes.includes(d.sp) ? 'ropes' : 'rooms') : null);
// Who may see a file: Rope Team files only its members; evidence by its own rules; other files the people of their
// space and the project's managers. Public files are open to everyone who can open the project.
function docSees(p, d) {
  if (d.f === 'rope') return memberOf(d.sp);
  if (d.ev ? evVisible(byId('evidence', d.ev)) : memberOf(d.sp) || docMgr(p) || spaceAdmin(docKind(d), d.sp)) return true;
  return docVisOf(d) === 'Public' && (projVis(p) === 'Public' || docTeam(p));
}
// The person who shared it, or a project manager, changes a file's visibility (never a locked one).
const docCanVis = (p, d) => !!d && !d.lock && docSees(p, d) && (d.by === myId() || docMgr(p));
const docList = p => docIndex(p).filter(d => docSees(p, d));
const docPublic = p => docList(p).filter(d => docVisOf(d) === 'Public');
const docFind = (p, k) => p && docIndex(p).find(d => d.key === k);
const docSize = mb => (mb == null ? '—' : mb < 1 ? Math.max(1, Math.round(mb * 1024)) + ' KB' : (+mb).toFixed(1) + ' MB');
const docIcon = n => (IMG_RE.test(n) ? 'image' : 'file');
const docVisPill = v => `<span class="pill doc-vis ${v === 'Public' ? 'p-green' : 'p-grey'}">${ic(v === 'Public' ? 'globe' : 'lock', 12)}${v}</span>`;
const docItemName = (p, d) => {
  const x = d.sp;
  if (d.sub === 'ms') return ((x.milestones || []).find(m => m.id === d.it) || {}).t || 'Milestone';
  if (d.sub === 'tk') {
    const k = (x.tasks || []).find(t => t.id === d.it);
    return k ? taskKey(x, k) + ' ' + k.t : 'Task';
  }
  return '';
};
// Where the file came from, as a link where the viewer can open it.
function docSrcLink(d) {
  if (d.ev) return L(h(d.title || d.n), 'evidence', { id: d.ev });
  if (!d.sp) return '';
  const r = { circles: 'circle', ropes: 'rope', rooms: 'room' }[docKind(d)];
  return memberOf(d.sp) || spaceAdmin(docKind(d), d.sp) ? L(h(d.sp.name), r, { id: d.sp.id }) : h(d.sp.name);
}

// ---- file contents: files uploaded here are kept in this browser's IndexedDB, keyed by document id. Seeded files
// and files shared elsewhere in the prototype keep only a name and size, and download as a labelled placeholder.
// A production build stores files server-side and serves them through authorised, short-lived links.
const DOC_DB = 'phoenix-document-files';
const docTx = (mode, fn) =>
  new Promise((res, rej) => {
    const r = indexedDB.open(DOC_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('files', mode);
      const out = fn(tx.objectStore('files'));
      tx.oncomplete = () => (db.close(), res(out && out.result));
      tx.onerror = tx.onabort = () => (db.close(), rej(tx.error || new Error('Storage failed')));
    };
  });
const docPlaceholder = (p, d) =>
  new Blob(
    [['PHOENIX prototype placeholder for: ' + d.n, 'Project: ' + p.title, 'Folder: ' + docPath(p, d).join(' / '), 'Shared by: ' + P(d.by).name + (d.at ? ' on ' + fmt(d.at) : ''), 'Visibility: ' + docVisOf(d), '', 'The prototype keeps only this file’s name and size, so no content was stored.', 'Generated ' + now()].join('\r\n')],
    { type: 'text/plain;charset=utf-8' },
  );
// The real file when one was uploaded in Documents, else a placeholder: [blob, file name].
const docBlob = (p, d) =>
  (d.file && d.file.blob ? docTx('readonly', st => st.get(d.file.id)).catch(() => null) : Promise.resolve(null)).then(b => (b ? [b, d.n] : [docPlaceholder(p, d), d.n + '.txt']));
const docSave = (blob, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

// ---- ZIP (stored, no compression), written in the browser so the prototype needs no library
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = b => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
// files: [{ path, data: Uint8Array }] → Blob (application/zip). Names are UTF-8 (general purpose flag bit 11).
function zipBlob(files) {
  const enc = new TextEncoder();
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [];
  const cen = [];
  let off = 0;
  files.forEach(f => {
    const name = enc.encode(f.path);
    const crc = crc32(f.data);
    const sz = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, sz, true);
    lh.setUint32(22, sz, true);
    lh.setUint16(26, name.length, true);
    parts.push(lh, name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, sz, true);
    ch.setUint32(24, sz, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, off, true);
    cen.push(ch, name);
    off += 30 + name.length + sz;
  });
  const cenSize = cen.reduce((s, x) => s + x.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, off, true);
  return new Blob([...parts, ...cen, end], { type: 'application/zip' });
}
const zipSafe = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
// A file's folder path inside the project, as the Documents screens and the ZIP show it.
function docPath(p, d) {
  const sp = docSpaces(p);
  const many = { circle: sp.circles.length > 1, rope: sp.ropes.length > 1, room: sp.rooms.length > 1 }[d.f];
  const path = [docFolder(d.f)[1]];
  if (many && d.sp) path.push(d.sp.name);
  if (d.sub) path.push(d.sub === 'ms' ? 'Milestones' : 'Tasks', docItemName(p, d));
  return path;
}

// ---- screens
const docBack = p => L(ic('chevl', 14) + 'All projects', 'documents', {}, 'btn btn-g btn-sm');
route('documents', 'any', () => {
  if (!DOC_ROLES.includes(role())) return deniedView('documents');
  const p = UI.p.id && byId('projects', UI.p.id);
  if (UI.p.id && !p) return empty('folder', 'Project not found', 'It may have been removed.', docBack());
  if (p && !docCanOpen(p)) {
    audit('Access denied', 'documents ' + p.id, 'Private project; not in the project team', 'denied');
    return `<div class="denied card"><span class="tile t-soft" style="width:56px;height:56px;margin:0 auto">${ic('lock', 24)}</span><h1 class="h2" style="margin-top:12px">This project is Private</h1><p class="muted" style="margin-top:8px">Only its team can open its documents: the project owner, its steward and the members of its Circle, Rope Team and ${DOC_ROOM}.</p><div style="margin-top:16px">${docBack()}</div></div>`;
  }
  return p ? docProjectView(p) : docListView();
});
function docListView() {
  const list = docProjects();
  return (
    head('Documents', 'Every file from every stage of your projects, by the space it was shared in.') +
    card(
      'Projects',
      'Public projects are open to everyone in ' + h(ctxName(ctxId())) + '. Private projects are open to their team only.',
      dataView('docs:projects', {
        label: 'projects',
        items: list,
        search: p => [p.title, p.type, P(p.owner).name, p.area || '', ...(p.tags || [])].join(' '),
        quick: { label: 'Visibility', options: DOC_VIS.map(v => [v, v]), test: (p, v) => projVis(p) === v },
        filters: [
          dvOpts(list, p => p.status).length > 1 && { key: 'status', label: 'Status', options: dvOpts(list, p => p.status), test: (p, v) => p.status === v },
          dvOpts(list, p => p.owner).length > 1 && { key: 'owner', label: 'Owner', options: dvOpts(list, p => p.owner, id => P(id).name), test: (p, v) => p.owner === v },
        ].filter(Boolean),
        sorts: [
          ['title', 'Title', (a, b) => a.title.localeCompare(b.title)],
          ['files', 'Most files', (a, b) => docList(b).length - docList(a).length],
        ],
        defaultSort: 'title',
        row: p => {
          const all = docList(p);
          const pub = all.filter(d => docVisOf(d) === 'Public').length;
          return {
            lead: `<span class="tile t-navy" aria-hidden="true">${ic('folder', 18)}</span>`,
            title: L(h(p.title), 'documents', { id: p.id }, 'dv-link'),
            sub: h(p.type) + (p.area ? ' · ' + h(p.area) : ''),
            meta: ['Owner <b>' + nm(p.owner) + '</b>', '<b>' + all.length + '</b> file' + (all.length === 1 ? '' : 's'), '<b>' + pub + '</b> public'],
            badges: docVisPill(projVis(p)) + pill(p.status),
            primary: L('Open', 'documents', { id: p.id }, 'btn btn-s btn-sm'),
          };
        },
        empty: ['folder', 'No project documents yet', 'Projects you own or work on, and Public projects in this programme, appear here once they are submitted.', can('projects', 'C') && role() === 'P' ? B(ic('plus', 16) + 'Start a project', 'go', { r: 'newproject' }, 'btn-p btn-sm') : ''],
      }),
      '',
      'rec-list',
    )
  );
}
// Header shared by the project and folder screens: visibility, the project switch and the public ZIP.
function docHead(p, title, trail) {
  const pub = docPublic(p);
  const v = projVis(p);
  // Publishing needs a team vote first, so it is done from the project page, not switched here.
  const sw = docMgr(p) && pubEligible(p) ? L(ic('vote', 14) + (v === 'Public' ? 'Publication' : 'Publish project…'), 'project', { id: p.id }, 'btn btn-s btn-sm') : '';
  const zip = pub.length
    ? B(ic('download', 14) + 'Download public files (' + pub.length + ')', 'docZip', { id: p.id }, 'btn-p btn-sm', 'title="One ZIP file with every Public file of this project, in its folders"')
    : `<button type="button" class="btn btn-p btn-sm" disabled title="This project has no Public files yet">${ic('download', 14)}Download public files</button>`;
  return (
    crumbsHtml([['Documents', 'documents', {}], ...trail]) +
    // on a folder the label would read as the folder's own visibility, so the project's goes in the subtitle there
    head(title, (trail.length > 1 ? h(p.title) + ' · ' + v + ' project · ' : '') + h(p.type) + ' · owner ' + nm(p.owner) + ' · ' + h(p.status), (trail.length > 1 ? '' : docVisPill(v)) + sw + zip) +
    (v === 'Private' ? banner('info', 'Private project', 'Only the project team sees this project. Its Public files are shared with the team until the team approves publication by vote and the owner publishes it; then they appear in Public Projects.') : banner('ok', 'Published', 'This project is in ' + L('Public Projects', 'publicproject', { id: p.id }) + '. Only its Public files are shown there.'))
  );
}
function docProjectView(p) {
  const f = UI.p.f;
  if (f && docFolder(f)) return docFolderView(p, f);
  const all = docList(p);
  const sp = docSpaces(p);
  const spaces = { circle: sp.circles, rope: sp.ropes, room: sp.rooms };
  const tiles = docFolders()
    .map(([k, label, icon, tile, desc]) => {
      const fs = all.filter(d => d.f === k);
      const pub = fs.filter(d => docVisOf(d) === 'Public').length;
      const names = k === 'evidence' ? '' : (spaces[k] || []).map(o => h(o.name)).join(', ') || 'Not linked yet';
      const shut = k === 'rope' && spaces.rope.length && !spaces.rope.some(o => memberOf(o));
      return `<button type="button" class="doc-fold" data-a="go" data-r="documents" data-id="${p.id}" data-f="${k}"><span class="tile ${tile}" aria-hidden="true">${ic(icon, 20)}</span><span class="doc-fold-t"><b>${h(label)}</b><span class="cap">${desc}</span>${names ? `<span class="cap doc-fold-sp">${names}</span>` : ''}</span><span class="doc-fold-n">${shut ? `<span class="cap">${ic('lock', 12)} Members only</span>` : `<b>${fs.length}</b><span class="cap">file${fs.length === 1 ? '' : 's'} · ${pub} public</span>`}</span></button>`;
    })
    .join('');
  return docHead(p, h(p.title), [[h(p.title)]]) + `<section class="doc-folds" aria-label="Folders">${tiles}</section>` + card('All files', 'Every file in this project you can open, from every folder.', docFilesView(p, all, 'docs:all:' + p.id, true), '', 'rec-list');
}
// The rows of one folder (or of all of them) as a Data View.
function docFilesView(p, list, k, withFolder) {
  return dataView(k, {
    label: 'files',
    items: list,
    search: d => [d.n, d.src, P(d.by).name, d.sp ? d.sp.name : '', d.title || ''].join(' '),
    quick: { label: 'Visibility', options: DOC_VIS.map(v => [v, v]), test: (d, v) => docVisOf(d) === v },
    filters: [
      withFolder && { key: 'folder', label: 'Folder', options: docFolders().filter(x => list.some(d => d.f === x[0])).map(x => [x[0], x[1]]), test: (d, v) => d.f === v },
      dvOpts(list, d => d.src).length > 1 && { key: 'src', label: 'Source', options: dvOpts(list, d => d.src), test: (d, v) => d.src === v },
      dvOpts(list, d => d.by).length > 1 && { key: 'by', label: 'Shared by', options: dvOpts(list, d => d.by, id => P(id).name), test: (d, v) => d.by === v },
    ].filter(Boolean),
    sorts: [
      ['at', 'Newest', (a, b) => String(b.at || '').localeCompare(String(a.at || ''))],
      ['n', 'Name', (a, b) => a.n.localeCompare(b.n)],
      ['mb', 'Size', (a, b) => (b.mb || 0) - (a.mb || 0)],
    ],
    defaultSort: 'at',
    dense: true,
    row: d => {
      const v = docVisOf(d);
      const sw = docCanVis(p, d)
        ? v === 'Public'
          ? B(ic('lock', 16) + menuT('Make Private', 'Only the people of its space can open it'), 'docVis', { id: p.id, k: d.key, v: 'Private' }, 'menu-i', 'role="menuitem"')
          : CB(ic('globe', 16) + menuT('Make Public', projVis(p) === 'Public' ? 'Everyone in the programme can open it' : 'The whole project team can open it'), 'docVis', { id: p.id, k: d.key, v: 'Public' }, 'Make “' + d.n + '” Public? ' + (projVis(p) === 'Public' ? 'Everyone in ' + ctxName(p.ctx) + ' who can open Documents will be able to see and download it.' : 'Everyone in the project team will be able to see and download it.'), 'menu-i', 'Make Public')
        : '';
      return {
        lead: `<span class="tile t-soft" aria-hidden="true">${ic(docIcon(d.n), 16)}</span>`,
        title: `<b class="doc-n">${h(d.n)}</b>`,
        sub: h(d.src) + (withFolder ? ' · ' + h(docPath(p, d).join(' / ')) : !d.sub && d.sp && docUpSpaces(p, d.f).length > 1 ? ' · ' + h(d.sp.name) : ''),
        meta: [docSize(d.mb), 'Shared by ' + nm(d.by), d.at ? fmt(d.at) : '', d.ev ? 'Record ' + docSrcLink(d) : ''],
        badges: docVisPill(v) + (d.lock ? `<span class="doc-lock" title="${h(d.lock)}" aria-label="${h(d.lock)}">${ic('lock', 14)}</span>` : ''),
        primary: B(ic('download', 14) + '<span class="hide-sm">Download</span>', 'docDl', { id: p.id, k: d.key }, 'btn-s btn-sm', 'aria-label="Download ' + h(d.n) + '"'),
        menu: sw,
      };
    },
    empty: ['file', 'No files here yet', 'Files shared in this space appear here as soon as they are uploaded or attached.', ''],
  });
}
function docFolderView(p, f) {
  const [, label, icon, tile, desc] = docFolder(f);
  const all = docList(p).filter(d => d.f === f);
  const sp = docSpaces(p);
  const spaces = { circle: sp.circles, rope: sp.ropes, room: sp.rooms }[f] || [];
  const trail = [[h(p.title), 'documents', { id: p.id }]];
  const s = UI.p.s;
  const it = UI.p.it;
  if (f === 'rope' && spaces.length && !spaces.some(o => memberOf(o)))
    return docHead(p, h(label), [...trail, [h(label)]]) + card('', '', empty('lock', 'Open to Rope Team members only', DOC_ROPE_LOCK + ' Platform roles and programme administration do not open it.'));
  if (!spaces.length && f !== 'evidence')
    return docHead(p, h(label), [...trail, [h(label)]]) + card('', '', empty(icon, 'No ' + h(label) + ' linked to this project yet', 'Files appear here once the project has a ' + h(label === 'Circle Team' ? 'Circle' : label) + '.', L('Open the project', 'project', { id: p.id }, 'btn btn-s btn-sm')));
  // Action Room: Milestones and Tasks are folders of their own
  if (f === 'room' && (s === 'ms' || s === 'tk')) {
    const isMs = s === 'ms';
    const subL = isMs ? 'Milestones' : 'Tasks';
    const items = spaces.flatMap(x => (isMs ? x.milestones || [] : x.tasks || []).map(o => ({ x, o })));
    const ftrail = [...trail, [h(label), 'documents', { id: p.id, f }]];
    if (it) {
      const hit = items.find(y => y.o.id === it);
      if (!hit) return docHead(p, subL, [...ftrail, [subL]]) + card('', '', empty('folder', 'Not found', 'It may have been removed.'));
      const name = isMs ? hit.o.t : taskKey(hit.x, hit.o) + ' ' + hit.o.t;
      const files = all.filter(d => d.sub === s && d.it === it);
      const info = isMs ? pill(hit.o.status) + `<span class="cap">Due ${fmt(hit.o.due)}</span>` : pill(hit.o.status) + `<span class="cap">Assigned to ${nm(hit.o.owner)}${hit.o.due ? ' · due ' + fmt(hit.o.due) : ''}</span>`;
      return (
        docHead(p, h(name), [...ftrail, [subL, 'documents', { id: p.id, f, s }], [h(name)]]) +
        card(
          h(name),
          `<span class="row wrap doc-info">${info}<span class="cap">${h(hit.x.name)}</span></span>`,
          docFilesView(p, files, 'docs:' + s + ':' + it, false),
          docUpBtn(p, f, hit.x, { s, it }) + L(ic(isMs ? 'flag' : 'checks', 14) + 'Open in ' + DOC_ROOM, 'room', { id: hit.x.id, tab: 'plan' }, 'btn btn-g btn-sm'),
          'rec-list',
        )
      );
    }
    const rows = items
      .map(({ x, o }) => {
        const n = all.filter(d => d.sub === s && d.it === o.id);
        const pub = n.filter(d => docVisOf(d) === 'Public').length;
        const name = isMs ? o.t : taskKey(x, o) + ' ' + o.t;
        return `<li><button type="button" class="doc-sub" data-a="go" data-r="documents" data-id="${p.id}" data-f="${f}" data-s="${s}" data-it="${o.id}"><span class="tile t-soft" aria-hidden="true">${ic('folder', 16)}</span><span class="doc-sub-t"><b>${h(name)}</b><span class="cap">${spaces.length > 1 ? h(x.name) + ' · ' : ''}${isMs ? 'Due ' + fmt(o.due) : nm(o.owner)}</span></span>${pill(o.status)}<span class="cap doc-sub-n">${n.length} file${n.length === 1 ? '' : 's'} · ${pub} public</span>${ic('chevr', 16)}</button></li>`;
      })
      .join('');
    return (
      docHead(p, subL, [...ftrail, [subL]]) +
      card(subL, isMs ? 'A folder for each milestone: its evidence and the files uploaded for it.' : 'A folder for each task: the evidence attached to it and the files uploaded for it.', rows ? `<ul class="doc-subs" role="list">${rows}</ul>` : empty('folder', 'No ' + subL.toLowerCase() + ' yet', 'They appear here once the ' + DOC_ROOM + ' plans them.'), '', 'rec-list')
    );
  }
  let top = '';
  if (f === 'room') {
    const ms = all.filter(d => d.sub === 'ms');
    const tk = all.filter(d => d.sub === 'tk');
    const nMs = spaces.reduce((a, x) => a + (x.milestones || []).length, 0);
    const nTk = spaces.reduce((a, x) => a + (x.tasks || []).length, 0);
    const sub = (k, l, ic_, n, files) => `<li><button type="button" class="doc-sub" data-a="go" data-r="documents" data-id="${p.id}" data-f="room" data-s="${k}"><span class="tile t-navy" aria-hidden="true">${ic(ic_, 16)}</span><span class="doc-sub-t"><b>${l}</b><span class="cap">${n} folder${n === 1 ? '' : 's'}</span></span><span class="cap doc-sub-n">${files.length} file${files.length === 1 ? '' : 's'} · ${files.filter(d => docVisOf(d) === 'Public').length} public</span>${ic('chevr', 16)}</button></li>`;
    top = card('Folders', '', `<ul class="doc-subs" role="list">${sub('ms', 'Milestones', 'flag', nMs, ms)}${sub('tk', 'Tasks', 'checks', nTk, tk)}</ul>`, '', 'rec-list');
  }
  const files = all.filter(d => !d.sub);
  const up =
    f === 'evidence'
      ? (() => {
          const space = p.room || p.rope || p.circle;
          const x = space && (byId('rooms', space) || byId('ropes', space) || byId('circles', space));
          return x && memberOf(x) && can('evidence', 'CRM') ? B(ic('upload', 14) + 'Upload evidence', 'go', { r: 'newevidence', link: space }) : '';
        })()
      : spaces.length
        ? docUpBtn(p, f, spaces.length === 1 ? spaces[0] : null)
        : '';
  return (
    docHead(p, h(label), [...trail, [h(label)]]) +
    top +
    card(f === 'room' ? h(label) + ' files' : h(label), desc + (f === 'evidence' ? ' Evidence is uploaded and reviewed in Evidence; its rules decide whether it can be Public.' : ''), docFilesView(p, files, 'docs:' + f + ':' + p.id, false), up, 'rec-list')
  );
}

// ---- upload: into a Circle, Rope Team or Action Room, or a milestone or task of one
const docUpSpaces = (p, f) => ({ circle: docSpaces(p).circles, rope: docSpaces(p).ropes, room: docSpaces(p).rooms })[f] || [];
const docUpOk = (f, x) => !!x && x.state === 'Active' && (memberOf(x) || (f === 'circle' && isFac(x.id)) || (f === 'room' && role() === 'A'));
function docUpBtn(p, f, x, o = {}) {
  const ok_ = x ? docUpOk(f, x) : docUpSpaces(p, f).some(y => docUpOk(f, y));
  return ok_ ? B(ic('upload', 14) + 'Upload files', 'docUpOpen', { id: p.id, f, x: x ? x.id : '', s: o.s || '', it: o.it || '' }, 'btn-p btn-sm') : '';
}
A.docUpOpen = d => {
  const p = byId('projects', d.id);
  const where = docUpSpaces(p, d.f).filter(y => docUpOk(d.f, y));
  const rope = d.f === 'rope';
  clearF('docup');
  UI.form.docup = { x: d.x || (where[0] || {}).id || '', vis: 'Private' };
  const target = d.it ? (d.s === 'ms' ? 'milestone' : 'task') : docFolder(d.f)[1];
  modal(
    'Upload files',
    () =>
      `<form data-f="docUp" class="col" style="gap:14px" novalidate><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="f" value="${h(d.f)}"><input type="hidden" name="s" value="${h(d.s || '')}"><input type="hidden" name="it" value="${h(d.it || '')}">
  ${!d.x && where.length > 1 ? fi('docup', 'x', 'Space', { type: 'select', opts: where.map(y => [y.id, y.name]), req: true }) : `<input type="hidden" name="x" value="${h(UI.form.docup.x)}">`}
  ${rope ? `<div class="field"><span class="lbl">Visibility</span>${docVisPill('Private')}<span class="help">${DOC_ROPE_LOCK}</span></div><input type="hidden" name="vis" value="Private">` : fi('docup', 'vis', 'Visibility', { type: 'select', opts: [['Private', 'Private — the people of this space'], ['Public', projVis(p) === 'Public' ? 'Public — everyone in the programme' : 'Public — the whole project team']], help: 'You can change it later from the file’s menu.' })}
  <div class="field"><label class="lbl" for="docup_f">Files <span class="req">*</span></label><input id="docup_f" type="file" name="files" class="input${fe('docup', 'files') ? ' err' : ''}" style="padding:8px" multiple aria-invalid="${!!fe('docup', 'files')}">${fe('docup', 'files') ? `<span class="emsg" role="alert">${ic('alert', 14)}${fe('docup', 'files')}</span>` : ''}<span class="help">Up to ${S.settings.maxFileMB} MB each. They go into this ${h(target)} folder and are shown to the people who can open it.</span></div>
  <div class="actions">${B('Cancel', 'closeM')}<button class="btn btn-p" type="submit">${ic('upload', 14)}Upload</button></div></form>`,
  );
};
// The record a new file is added to: the space, or a milestone or task of an Action Room.
const docUpTarget = d => {
  const x = byId(SPACE_KIND[d.f], d.x);
  if (!x) return null;
  if (!d.it) return { x, list: (x.docs = x.docs || []) };
  const o = ((d.s === 'ms' ? x.milestones : x.tasks) || []).find(y => y.id === d.it);
  return o ? { x, o, list: (o.files = o.files || []) } : null;
};
F.docUp = (d, form) => {
  const files = [...(form.querySelector('input[type=file]')?.files || [])];
  const big = files.find(f => f.size > S.settings.maxFileMB * 1048576);
  const bad = !files.length ? 'Choose at least one file.' : big ? big.name + ' is over ' + S.settings.maxFileMB + ' MB.' : files.find(f => !f.size) ? files.find(f => !f.size).name + ' is empty.' : '';
  if (bad) {
    UI.err.docup = { files: bad };
    UI.form.docup = { ...(UI.form.docup || {}), x: d.x, vis: d.vis };
    return render();
  }
  const t = docUpTarget(d);
  if (!t) return toast('That folder is no longer available.', 'err');
  const vis = d.f === 'rope' ? 'Private' : DOC_VIS.includes(d.vis) ? d.vis : 'Private';
  const recs = files.map(f => ({ id: uid('dc'), n: f.name, mb: +(f.size / 1048576).toFixed(2), by: myId(), at: now(), docVis: vis, blob: true }));
  recs.forEach(r => t.list.push(r));
  const where = t.o ? (d.s === 'ms' ? 'milestone “' + t.o.t + '”' : 'task “' + t.o.t + '”') : 'Documents';
  sysMsg(t.x, me().name + ' uploaded ' + files.length + ' file' + (files.length > 1 ? 's' : '') + ' to ' + where);
  if (t.o && d.s === 'tk') (t.o.log = t.o.log || []).push({ at: now(), by: myId(), t: 'Files added: ' + files.map(f => f.name).join(', ') });
  audit('Documents uploaded', t.x.id + (t.o ? ' ' + t.o.id : ''), files.map(f => f.name).join(', ') + ' · ' + vis);
  UI.modal = null;
  clearF('docup');
  docTx('readwrite', st => recs.forEach((r, i) => st.put(files[i], r.id)))
    .catch(() => {
      recs.forEach(r => (r.blob = false));
      toast('Uploaded, but this browser could not store the file contents. Downloads will be placeholders.', 'warn');
      ok();
    });
  toast(files.length === 1 ? 'File uploaded.' : files.length + ' files uploaded.');
  ok();
};

// ---- visibility (a project's own visibility follows its publication: views/publish.js)
A.docVis = d => {
  const p = byId('projects', d.id);
  const x = docFind(p, d.k);
  if (!x || !DOC_VIS.includes(d.v)) return render();
  x.h.docVis = d.v;
  audit('Document visibility changed', d.k, x.n + ' · ' + d.v);
  if (x.by && x.by !== myId()) notify(x.by, me().name + ' made “' + x.n + '” ' + d.v + ' in ' + p.title, 'documents', { id: p.id, f: x.f });
  UI.dvMenu = null;
  toast('“' + x.n + '” is now ' + d.v + '.');
  ok();
};

// ---- downloads
A.docDl = d => {
  const p = byId('projects', d.id);
  const x = docFind(p, d.k);
  if (!x) return;
  docBlob(p, x).then(([b, n]) => {
    docSave(b, n);
    audit('Document downloaded', d.k, x.n);
    save();
    toast('Downloaded ' + x.n + (n !== x.n ? ' (prototype placeholder)' : '') + '.');
    render();
  });
};
A.docZip = d => {
  const p = byId('projects', d.id);
  const pub = docPublic(p);
  if (!pub.length) return toast('This project has no Public files yet.', 'warn');
  docZipSave(p, pub, 'Project visibility: ' + projVis(p), 'Public documents downloaded as ZIP');
};
// One ZIP of the given rows, in their folders, with a manifest. Used by Documents and by Public Projects.
function docZipSave(p, pub, scope, auditLabel) {
  const enc = new TextEncoder();
  const root = zipSafe(p.title);
  const used = new Set();
  const uniq = path => {
    let q = path;
    let i = 2;
    while (used.has(q.toLowerCase())) q = path.replace(/(\.[^./]+)?$/, m => ' (' + i++ + ')' + m);
    used.add(q.toLowerCase());
    return q;
  };
  toast('Preparing the ZIP of ' + pub.length + ' Public file' + (pub.length > 1 ? 's' : '') + '…');
  Promise.all(pub.map(x => docBlob(p, x).then(([b, n]) => b.arrayBuffer().then(buf => ({ x, n, data: new Uint8Array(buf) })))))
    .then(items => {
      const files = items.map(({ x, n, data }) => {
        const path = uniq([root, ...docPath(p, x).map(zipSafe), zipSafe(n)].join('/'));
        return { path, data, x, ph: n !== x.n };
      });
      const ph = files.filter(f => f.ph).length;
      const manifest = [
        'PHOENIX Documents — Public files of “' + p.title + '”',
        'Programme: ' + ctxName(p.ctx) + ' · ' + scope,
        'Downloaded by ' + me().name + ' on ' + fmt(now().slice(0, 16)),
        '',
        ...files.map(f => [f.path.slice(root.length + 1), f.x.src, 'shared by ' + P(f.x.by).name + (f.x.at ? ' on ' + fmt(f.x.at) : ''), docSize(f.x.mb) + (f.ph ? ' (placeholder)' : '')].join(' · ')),
        '',
        ph ? ph + ' file' + (ph > 1 ? 's are' : ' is') + ' a placeholder (.txt): the prototype keeps only their name and size. Files uploaded in Documents are included as uploaded.' : 'Every file is included as uploaded.',
        'Private files are not included.',
      ].join('\r\n');
      files.push({ path: root + '/MANIFEST.txt', data: enc.encode(manifest) });
      docSave(zipBlob(files), root + ' - public files.zip');
      audit(auditLabel, p.id, pub.length + ' files');
      save();
      toast('Downloaded ' + pub.length + ' Public file' + (pub.length > 1 ? 's' : '') + ' as one ZIP.');
      render();
    })
    .catch(() => toast('The ZIP could not be prepared in this browser. Try again, or download the files one by one.', 'err'));
}

// ---- data: project visibility, and the demo files for the seeded project (runs once, from migrate())
function docsMigrate() {
  S.projects.forEach(p => {
    if (!p.docVis) p.docVis = p.id === 'pr1' ? 'Public' : 'Private';
  });
  if (S.docsSeeded) return;
  S.docsSeeded = true;
  const r = id => byId('rooms', id);
  const put = (list, n, mb, by, at, vis) => list && !list.some(x => x.n === n) && list.push({ id: uid('dc'), n, mb, by, at, docVis: vis });
  const ci = byId('circles', 'ci1');
  if (ci) {
    ci.docs = ci.docs || [];
    put(ci.docs, 'Circle-working-agreement-v1.pdf', 0.3, 'p2', '2026-09-15T08:30', 'Public');
    put(ci.docs, 'Priority-streets-shortlist.xlsx', 0.1, 'p10', '2026-10-01T18:00', 'Private');
    const m = (ci.chat || []).find(x => x.id === 'm102');
    if (m && m.att && typeof m.att === 'object') m.att.docVis = 'Public';
  }
  const rt = byId('ropes', 'rt1');
  if (rt) put((rt.docs = rt.docs || []), 'GIS-approach-notes.docx', 0.2, 'p3', '2026-09-28T09:45', 'Private');
  const x = r('ar2');
  if (x) {
    put((x.docs = x.docs || []), 'Elm-Road-audit-method.pdf', 0.4, 'p10', '2026-09-08T10:00', 'Public');
    const ms = (x.milestones || []).find(m => m.id === 'ms21');
    if (ms) {
      put((ms.files = ms.files || []), 'Residents-meeting-agenda.pdf', 0.1, 'p10', '2026-10-03T09:00', 'Public');
      put(ms.files, 'Residents-meeting-sign-in.pdf', 0.2, 'p10', '2026-10-05T19:30', 'Private');
    }
    const tk = id => (x.tasks || []).find(k => k.id === id);
    if (tk('tk21')) put((tk('tk21').files = tk('tk21').files || []), 'Elm-Road-stop-photos.zip', 18.4, 'p1', '2026-09-18T15:40', 'Private');
    if (tk('tk22')) put((tk('tk22').files = tk('tk22').files || []), 'Shade-scores-12-stops.xlsx', 0.1, 'p1', '2026-09-29T10:50', 'Public');
    if (tk('tk23')) put((tk('tk23').files = tk('tk23').files || []), 'Residents-summary-draft.docx', 0.3, 'p10', '2026-10-02T14:55', 'Public');
  }
}
// Files uploaded for a milestone or task, shown with it in its Action Room, and the way to its Documents folder.
function docFilesLine(x, files, o) {
  const p = roomProject(x);
  const open = p && docCanOpen(p);
  const list = (files || []).filter(f => memberOf(x) || role() === 'A' || (open && docVisOf({ h: f }) === 'Public'));
  if (!list.length && !open) return '';
  return `<div class="field doc-line"><span class="lbl">Files</span>${list.length ? `<span class="doc-line-l">${list.map(f => `<span class="att">${ic(docIcon(f.n), 14)}${h(f.n)} ${docVisPill(docVisOf({ h: f }))}</span>`).join('')}</span>` : '<span class="cap">None uploaded yet</span>'}${open ? L(ic('folder', 14) + 'Open folder in Documents', 'documents', { id: p.id, f: 'room', s: o.s, it: o.it }, 'lnk doc-line-a') : ''}</div>`;
}

// ---- documents attached when a Circle, Rope Team or Action Room is created. They are stored on the new room, so
// they appear in the project's Documents folder for that room and stay with the project wherever it moves.
const DOC_BLOCKED = /\.(exe|bat|cmd|sh|msi|js)$/i;
function docCreateField(f, kind) {
  const e = fe(f, 'docs');
  const rope = kind === 'ropes';
  return `<fieldset class="np-fs col doc-create"><legend class="lbl">Project documents <span class="req">*</span></legend><div class="field"><label class="lbl" for="${f}_docs">Files</label><input id="${f}_docs" type="file" name="docs" class="input${e ? ' err' : ''}" multiple aria-invalid="${!!e}" aria-describedby="${f}_docs_h">${e ? `<span class="emsg" role="alert">${ic('alert', 14)}${e}</span>` : ''}<span class="help" id="${f}_docs_h">At least one document that defines the work — a brief, charter, requirements or plan. Up to ${S.settings.maxFileMB} MB each. If the form shows an error, choose the files again.</span></div>${
    rope
      ? `<div class="field"><span class="lbl">Visibility</span><span>${docVisPill('Private')}</span><span class="help">${DOC_ROPE_LOCK}</span></div>`
      : fi(f, 'docVis', 'Visibility', { type: 'select', opts: [['Private', 'Private — the people of this room'], ['Public', 'Public — shared with the project team, and in Public Projects if published']], help: 'You can change each file later in Documents.' })
  }</fieldset>`;
}
// The chosen files, or null with the error shown on the field.
function docTake(f, form) {
  const files = [...(form?.querySelector('input[name="docs"]')?.files || [])];
  const big = files.find(x => x.size > S.settings.maxFileMB * 1048576);
  const bad = files.find(x => DOC_BLOCKED.test(x.name));
  const empty0 = files.find(x => !x.size);
  const err = !files.length ? 'Upload at least one document.' : big ? big.name + ' is over ' + S.settings.maxFileMB + ' MB.' : bad ? bad.name + ' is not a supported file type.' : empty0 ? empty0.name + ' is empty.' : '';
  if (!err) return files;
  UI.err[f] = { ...(UI.err[f] || {}), docs: err };
  return null;
}
// Adds the records to a room's document list and keeps the file contents in this browser for download.
function docAttach(list, files, vis, pid) {
  const v = DOC_VIS.includes(vis) ? vis : 'Private';
  const recs = files.map(x => ({ id: uid('dc'), n: x.name, mb: +(x.size / 1048576).toFixed(2), by: myId(), at: now(), docVis: v, blob: true, ...(pid ? { project: pid } : {}) }));
  recs.forEach(r => list.push(r));
  docTx('readwrite', st => recs.forEach((r, i) => st.put(files[i], r.id))).catch(() => {
    recs.forEach(r => (r.blob = false));
    save();
  });
  return recs;
}
