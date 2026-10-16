// ---------- BUILD-FREEZE ADDITIONS (WSS Build-Freeze Review v1.0 and Action Pack, Oct 2026) ----------
// Help & support (human, BF-14), Review Inbox (assigned items only), Explore board (Bulletin Board Lite, BF-15),
// My collaborations (Relationship List Lite, BF-16), Partner organisation & mandate, AI Owner sources (BF-09).
// Everything here composes existing, already-authorised records: no new feed, ranking, score or graph.

// ---- Help & support: a human route, separate from Ask PHOENIX, mentor support and incident reporting.
// A request is seen by the person who sent it and by Programme Administrators in the context it was sent in.
// Lifecycle New → In Progress → Resolved → Closed; every status change, response and note is kept in q.log.
const SQ_STATES = ['New', 'In Progress', 'Resolved', 'Closed'];
const SQ_OPEN = ['New', 'In Progress'];
const SQ_TOPICS = ['Access or sign-in', 'Onboarding or agreement', 'My records or consent', 'Something is not working', 'Other'];
const SQ_MAX_FILES = 5;
const sqMaxMB = () => Math.min(S.settings.maxFileMB, 20);
// Accepted by extension; the browser's MIME type is used only to choose a preview.
const SQ_EXT = { png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', heic: 'image', mp4: 'video', mov: 'video', webm: 'video', mp3: 'audio', m4a: 'audio', wav: 'audio', pdf: 'pdf', txt: 'text', csv: 'text', log: 'text', doc: 'doc', docx: 'doc', xlsx: 'doc', pptx: 'doc' };
const SQ_ACCEPT = Object.keys(SQ_EXT).map(x => '.' + x).join(',');
const sqExt = n => (String(n).split('.').pop() || '').toLowerCase();
const sqMB = b => +(b / 1048576).toFixed(2);
const sqSize = mb => (mb < 1 ? Math.max(1, Math.round(mb * 1024)) + ' KB' : mb.toFixed(1) + ' MB');
const sqIcon = k => ({ image: 'image', video: 'file', audio: 'file', pdf: 'file', text: 'file' })[k] || 'file';
const sqAdmin = q => !!q && role() === 'A' && q.ctx === ctxId();
const sqMine = q => !!q && q.by === myId();
const sqSees = q => sqMine(q) || sqAdmin(q);
const sqLast = q => (q.log || []).reduce((m, x) => (x.at > m ? x.at : m), q.at || '');
const sqAdmins = ctx => S.assign.filter(a => roleBase(a.role) === 'A' && a.ctx === ctx && a.status === 'Active');

// Attachment files live in this browser's IndexedDB, keyed by attachment id; the request keeps only metadata.
// A production build stores them server-side and serves them through authorised, short-lived links.
const SQ_DB = 'phoenix-support-files';
const sqDb = () =>
  new Promise((res, rej) => {
    const r = indexedDB.open(SQ_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
const sqTx = (mode, fn) =>
  sqDb().then(
    db =>
      new Promise((res, rej) => {
        const tx = db.transaction('files', mode);
        const out = fn(tx.objectStore('files'));
        tx.oncomplete = () => (db.close(), res(out && out.result));
        tx.onerror = tx.onabort = () => (db.close(), rej(tx.error || new Error('Storage failed')));
      }),
  );
const sqPut = items => sqTx('readwrite', st => items.forEach(([k, b]) => st.put(b, k)));
// Seeded demo attachments have no stored file; they are drawn on request.
const sqDemo = f =>
  new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#f3f4f1"/><rect x="24" y="24" width="592" height="44" rx="8" fill="#0f2e25"/><text x="44" y="52" font-family="sans-serif" font-size="16" fill="#fff">My records &amp; consent</text><rect x="24" y="92" width="592" height="120" rx="8" fill="#fff" stroke="#d7dbd4"/><text x="44" y="130" font-family="sans-serif" font-size="15" fill="#333">Agreements</text><text x="44" y="166" font-family="sans-serif" font-size="14" fill="#8a8f88">No agreements to show.</text><text x="24" y="380" font-family="sans-serif" font-size="12" fill="#8a8f88">${h(f.n)} · demo attachment</text></svg>`,
    ],
    { type: 'image/svg+xml' },
  );
const sqBlob = f => (f.demo ? Promise.resolve(sqDemo(f)) : sqTx('readonly', st => st.get(f.id)));

// ---- staged attachments: kept in memory until the request is sent; removable one by one
UI.sqFiles = UI.sqFiles || [];
const sqStageErr = m => {
  UI.err.helpq = { ...(UI.err.helpq || {}) };
  if (m) UI.err.helpq.files = m;
  else delete UI.err.helpq.files;
};
A.sqPick = (d, el) => {
  const picked = [...(el.files || [])];
  const bad = [];
  picked.forEach(f => {
    const k = SQ_EXT[sqExt(f.name)];
    if (!k) return bad.push(`“${f.name}” is not a supported file type.`);
    if (!f.size) return bad.push(`“${f.name}” is empty.`);
    if (f.size > sqMaxMB() * 1048576) return bad.push(`“${f.name}” is ${sqSize(sqMB(f.size))}, over the ${sqMaxMB()} MB limit.`);
    if (UI.sqFiles.length >= SQ_MAX_FILES) return bad.push(`“${f.name}” was not added: up to ${SQ_MAX_FILES} files per request.`);
    if (UI.sqFiles.some(x => x.file.name === f.name && x.file.size === f.size)) return;
    UI.sqFiles.push({ key: 'st' + Date.now() + Math.random().toString(36).slice(2, 6), file: f, kind: k, url: k === 'image' ? URL.createObjectURL(f) : null });
  });
  snapForms(); // keep the topic and text typed so far
  sqStageErr(bad.join(' '));
  el.value = '';
  if (!bad.length && picked.length) toast(picked.length === 1 ? 'File added.' : picked.length + ' files added.');
  render();
};
A.sqUnpick = d => {
  const i = UI.sqFiles.findIndex(x => x.key === d.k);
  if (i < 0) return;
  snapForms();
  const [x] = UI.sqFiles.splice(i, 1);
  if (x.url) URL.revokeObjectURL(x.url);
  sqStageErr('');
  render();
};
const sqStaged = () =>
  UI.sqFiles.length
    ? `<ul class="sq-files" aria-label="Files to send">${UI.sqFiles
        .map(
          x =>
            `<li class="sq-file">${x.url ? `<img class="sq-thumb" src="${x.url}" alt="">` : `<span class="sq-thumb tile t-soft" aria-hidden="true">${ic(sqIcon(x.kind), 16)}</span>`}<div class="sq-fn"><b>${h(x.file.name)}</b><span class="cap">${sqSize(sqMB(x.file.size))}</span></div><button type="button" class="iconbtn" data-a="sqUnpick" data-k="${x.key}" aria-label="Remove ${h(x.file.name)}" title="Remove">${ic('trash', 16)}</button></li>`,
        )
        .join('')}</ul>`
    : '';
const sqPicker = () => {
  const e = fe('helpq', 'files');
  const full = UI.sqFiles.length >= SQ_MAX_FILES;
  return `<div class="field"><span class="lbl" id="helpq_files_l">Attachments (optional)</span><label class="dz sq-dz${e ? ' err' : ''}${full ? ' is-off' : ''}" for="helpq_files"><span aria-hidden="true">${ic('upload', 20)}</span><div><b>${full ? 'File limit reached' : 'Add screenshots, video or documents'}</b><div class="cap">Images, video, audio, PDF, text and Office files · up to ${SQ_MAX_FILES} files, ${sqMaxMB()} MB each</div></div><input id="helpq_files" type="file" class="sr" multiple accept="${SQ_ACCEPT}" data-ch="sqPick" aria-labelledby="helpq_files_l" aria-describedby="helpq_files_h" ${full ? 'disabled' : ''}></label>${e ? `<span class="emsg" role="alert">${ic('alert', 14)}${h(e)}</span>` : ''}${sqStaged()}<span class="help" id="helpq_files_h">Only you and the programme support team can open these. Do not attach other people’s private information.</span></div>`;
};

// ---- shared pieces of the request detail (requester and administrator)
const sqFileList = (q, empty = 'No attachments.') =>
  (q.files || []).length
    ? `<ul class="sq-files">${q.files
        .map(f => {
          const pv = ['image', 'video', 'audio', 'pdf', 'text'].includes(f.kind);
          return `<li class="sq-file"><span class="sq-thumb tile t-soft" aria-hidden="true">${ic(sqIcon(f.kind), 16)}</span><div class="sq-fn"><b>${h(f.n)}</b><span class="cap">${sqSize(f.mb)} · ${h(f.kind)}</span></div><div class="row" style="gap:6px">${pv ? B(ic('eye', 14) + '<span class="hide-sm">Preview</span>', 'sqView', { q: q.id, f: f.id }, 'btn-s btn-sm', `aria-label="Preview ${h(f.n)}"`) : ''}${B(ic('download', 14) + '<span class="hide-sm">Download</span>', 'sqDl', { q: q.id, f: f.id }, 'btn-s btn-sm', `aria-label="Download ${h(f.n)}"`)}</div></li>`;
        })
        .join('')}</ul>`
    : `<p class="cap">${empty}</p>`;
const SQ_LOG = {
  submitted: ['send', 'Request submitted'],
  status: ['refresh', 'Status changed'],
  reply: ['reply', 'Response from support'],
  user: ['message', 'Reply from requester'],
  note: ['lock', 'Internal note'],
};
const sqTimeline = (q, admin) =>
  `<ol class="timeline sq-tl">${(q.log || [])
    .filter(x => admin || x.k !== 'note')
    .slice()
    .reverse()
    .map(x => {
      const [icon, label] = SQ_LOG[x.k] || ['info', 'Update'];
      const who = x.by === myId() ? 'You' : x.k === 'reply' && !admin ? 'Programme support (' + nm(x.by) + ')' : nm(x.by);
      const body = x.k === 'status' ? `<span class="sq-move">${pill(x.from)}${ic('arrow', 14)}${pill(x.to)}</span>` : x.t ? `<p class="sq-msg">${h(x.t)}</p>` : '';
      return `<li class="tl sq-tl-i sq-${x.k}"><div class="row wrap" style="gap:6px;align-items:center">${ic(icon, 14)}<b>${label}</b>${x.k === 'note' ? pill('Admins only', 'p-grey') : ''}<span class="cap">${who} · ${fmt(x.at)}</span></div>${body}</li>`;
    })
    .join('')}</ol>`;
// Steps are joined by a line; a step and the line into it fill once reached. Closed is the end of the lifecycle,
// so a closed request shows every step, Closed included, as complete.
const sqSteps = q => {
  const at = SQ_STATES.indexOf(q.status);
  const end = at === SQ_STATES.length - 1;
  return `<ol class="sq-steps" aria-label="Progress">${SQ_STATES.map((s, i) => {
    const done = i < at || (end && i === at);
    const cls = [done && 'done', i === at && 'cur', i <= at && 'reached'].filter(Boolean).join(' ');
    return `<li class="${cls}"${i === at ? ' aria-current="step"' : ''}><span class="sq-dot" aria-hidden="true">${done ? ic('check', 12) : i + 1}</span>${s}<span class="sr">${done ? ' (complete)' : i === at ? ' (current)' : ' (not reached)'}</span></li>`;
  }).join('')}</ol>`;
};
const sqSummary = (q, admin) =>
  dl([
    ['Request ID', `<span class="mono">${h(q.ref)}</span>`],
    ['Submitted by', admin ? `${nm(q.by)}${P(q.by).email ? ` <span class="cap">· ${h(P(q.by).email)}</span>` : ''}` : 'You'],
    ['Topic', h(q.cat || 'General')],
    ['Context', h(ctxName(q.ctx))],
    ['Submitted', fmt(q.at)],
    ['Status', pill(q.status)],
    ['Last updated', fmt(sqLast(q))],
  ]);
const sqHead = (q, crumbs) =>
  crumbsHtml(crumbs) +
  `<div class="shead-main inc-head"><span class="tile" aria-hidden="true">${ic('question', 20)}</span><div class="shead-t"><div class="shead-kind">Support request · <span class="mono">${h(q.ref)}</span></div><div class="row wrap inc-title"><h1 class="h1">${h(q.cat || 'Support request')}</h1>${pill(q.status)}</div><div class="shead-meta"><span>Submitted ${fmt(q.at)}</span><span>${(q.files || []).length} attachment${(q.files || []).length === 1 ? '' : 's'}</span></div></div></div>`;
const sqLatestReply = q => (q.log || []).filter(x => x.k === 'reply').slice(-1)[0];

// ---- requester: one request
function sqUserDetail(q) {
  const f = 'sqr';
  const last = sqLatestReply(q);
  const replyBox =
    q.status === 'Closed'
      ? `<p class="cap">This request is closed. If you still need help, send a new request.</p>${B('New request', 'go', { r: 'help' }, 'btn-s btn-sm')}`
      : `${errSum(f)}<form data-f="sqr" class="col fgap" novalidate><input type="hidden" name="id" value="${q.id}">${fi(f, 't', 'Add a reply', { type: 'textarea', rows: 3, req: true, max: 1000, ph: 'Add detail or answer a question from support.' })}<div class="actions"><span class="help">${q.status === 'Resolved' ? 'Replying reopens this request.' : 'The support team is notified.'}</span><button class="btn btn-p btn-sm" type="submit">${ic('send', 14)}Send reply</button></div></form>`;
  return (
    sqHead(q, [['Help & support', 'help'], [h(q.ref)]]) +
    `<div class="g12 inc-body"><div class="c8 col inc-main">${card('Progress', '', sqSteps(q))}${last ? card('Latest response', 'From the programme support team · ' + fmt(last.at), `<p class="sq-msg">${h(last.t)}</p>`, '', 'accent') : ''}${card('Your request', '', `<p class="sq-msg">${h(q.t)}</p>`)}${card('Attachments', '', sqFileList(q, 'You did not attach any files.'))}${card('History', '', sqTimeline(q, false))}</div>
 <div class="c4 col inc-side">${card('Details', '', sqSummary(q, false))}${card('Reply', '', replyBox)}</div></div>`
  );
}

route('help', 'any', () => {
  const sel = UI.p.id && byId('supportQueries', UI.p.id);
  if (UI.p.id) {
    if (sel && sqMine(sel)) return sqUserDetail(sel);
    audit('Access denied', UI.p.id, 'support request belongs to someone else', 'denied');
    return head('Help & support', '') + banner('err', 'You cannot open this request', 'Support requests are visible only to the person who sent them and the programme support team.') + `<div class="section-gap"></div>` + B('Back to Help & support', 'go', { r: 'help' }, 'btn-s btn-sm');
  }
  const mine = S.supportQueries.filter(q => q.by === myId());
  const rope = S.ropes.find(r => inCtx(r) && memberOf(r) && r.mentor && r.mentor !== myId());
  const aiOk = consent(myId(), 'ai') === 'Granted';
  const f = 'helpq';
  const sending = !!UI.sqSending;
  const tile = (icon, t, sub, act) => `<section class="card help-tile"><span class="tile t-soft" aria-hidden="true">${ic(icon, 18)}</span><div class="col" style="gap:4px"><b>${t}</b><p class="cap">${sub}</p></div><div class="row wrap" style="gap:8px">${act}</div></section>`;
  return (
    head('Help & support', `People who can help you in ${h(ctxName(ctxId()))}. Each route below is separate: asking one never sends anything to another.`) +
    `<div class="help-grid">${[
      tile('user', 'Human support desk', 'A person from the programme team answers, usually within two working days. Use it for access, onboarding, records or anything that is not working.', B('Write to support', 'sqFocus', {}, 'btn-p btn-sm')),
      can('ai')
        ? tile('sparkle', 'Ask PHOENIX (AI, advisory)', aiOk ? 'Answers from approved programme sources, with sources and uncertainty. It advises; it never decides, approves or changes your record.' : 'AI processing is off for you, so Ask PHOENIX is unavailable. Everything else keeps working. You can change this in My records & consent.', aiOk ? B('Open Ask PHOENIX', 'askToggle', {}, 'btn-s btn-sm') : B('My records & consent', 'go', { r: 'privacy', tab: 'consent' }, 'btn-s btn-sm'))
        : '',
      rope ? tile('route', 'Your mentor', `${nm(rope.mentor)} supports you in ${h(rope.name)}. Mentoring conversations stay in your Rope Team.`, L('Open Rope Team', 'rope', { id: rope.id }, 'btn btn-s btn-sm')) : '',
      tile('alert', 'Report a concern', 'For safety, conduct or misuse. Goes to the Incident/Safety Owner, never to the person concerned. You can report anonymously.', B('Report a concern', 'go', { r: 'incidents' }, 'btn-s btn-sm')),
    ].join('')}</div>` +
    `<div class="section-gap"></div>` +
    card(
      'Write to the support desk',
      'Seen by the programme support team for this context only.',
      `${errSum(f)}<form data-f="helpq" id="helpq" class="col fgap" novalidate>${fi(f, 'cat', 'Topic', { type: 'select', req: true, ph: 'Choose a topic', opts: SQ_TOPICS })}${fi(f, 't', 'How can we help?', { type: 'textarea', rows: 3, req: true, max: 1000, ph: 'Describe what you need. Do not include other people’s private information.' })}${sqPicker()}<div class="actions"><span class="help">A person replies. AI is not used to answer support requests.</span><button class="btn btn-p btn-sm" type="submit" ${sending ? 'disabled aria-busy="true"' : ''}>${sending ? ic('refresh', 14) + 'Sending…' : ic('send', 14) + 'Send to support'}</button></div></form>`,
    ) +
    `<div class="section-gap"></div>` +
    card(
      'Your support requests',
      'Open a request to see its progress, responses and attachments.',
      dataView('help:mine', {
        label: 'requests',
        items: mine,
        layout: 'table',
        search: q => q.ref + ' ' + q.t + ' ' + (q.cat || ''),
        quick: { label: 'Status', options: SQ_STATES.map(v => [v, v]), test: (q, v) => q.status === v },
        sorts: [['new', 'Newest first', (a, b) => String(a.at).localeCompare(String(b.at))], ['upd', 'Last updated', (a, b) => sqLast(a).localeCompare(sqLast(b))]],
        defaultSort: 'new',
        defaultDir: 'desc',
        columns: [
          { label: 'Request', cell: q => `<span class="mono">${h(q.ref)}</span>` },
          { label: 'Subject', cell: q => `<b>${h(q.cat || 'General')}</b><div class="cap sq-sum">${h(q.t)}</div>` },
          { label: 'Sent', sort: 'new', cell: q => fmt(q.at), hideSm: true },
          { label: 'Status', cell: q => pill(q.status) + (sqLatestReply(q) ? `<div class="cap">${ic('reply', 12)} Response received</div>` : '') },
          { label: '', cell: q => L('Details', 'help', { id: q.id }, 'btn btn-s btn-sm') },
        ],
        empty: ['inbox', 'You have not sent any support requests.', 'Use the form above. Your requests and their progress appear here.', ''],
      }),
    )
  );
});
A.sqFocus = () => {
  const t = document.getElementById('helpq_cat');
  if (t) {
    t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    t.focus({ preventScroll: true });
  }
};
F.helpq = d => {
  if (UI.sqSending) return;
  if (!validate('helpq', d, { cat: [['req', 'Choose a topic.']], t: [['req', 'Describe what you need.'], ['min', 5]] })) return render();
  const id = uid('sq');
  const staged = UI.sqFiles.slice();
  const files = staged.map(x => ({ id: uid('sqf'), n: x.file.name, type: x.file.type || '', mb: sqMB(x.file.size), kind: x.kind }));
  UI.sqSending = true;
  render();
  (files.length ? sqPut(files.map((f, i) => [f.id, staged[i].file])) : Promise.resolve())
    .then(() => {
      const q = { id, ref: 'SR-' + id.slice(2).padStart(4, '0'), by: myId(), t: d.t.trim(), cat: d.cat, ctx: ctxId(), at: now(), status: 'New', files, log: [{ at: now(), by: myId(), k: 'submitted' }] };
      S.supportQueries.unshift(q);
      sqAdmins(q.ctx).forEach(a => notify(a.pid, `Support request ${q.ref}: ${d.cat} from ${me().name}`, 'admin', { tab: 'support', sq: q.id }, a.id));
      notify(myId(), `We received your support request ${q.ref}`, 'help', { id: q.id });
      audit('Support request sent', q.id, d.cat + (files.length ? ' · ' + files.length + ' attachment' + (files.length > 1 ? 's' : '') : ''));
      staged.forEach(x => x.url && URL.revokeObjectURL(x.url));
      UI.sqFiles = [];
      UI.sqSending = false;
      clearF('helpq');
      toast(`Sent as ${q.ref}. A person from the support team will reply.`);
      ok();
    })
    .catch(() => {
      UI.sqSending = false;
      UI.form.helpq = d;
      UI.err.helpq = { files: 'Your attachments could not be saved in this browser, so nothing was sent. Remove large files or try again.' };
      render();
    });
};
F.sqr = d => {
  if (!validate('sqr', d, { t: [['req', 'Write your reply.'], ['min', 2]] })) return render();
  const q = byId('supportQueries', d.id);
  q.log.push({ at: now(), by: myId(), k: 'user', t: d.t.trim() });
  if (q.status === 'Resolved') {
    q.log.push({ at: now(), by: myId(), k: 'status', from: 'Resolved', to: 'In Progress' });
    q.status = 'In Progress';
  }
  sqAdmins(q.ctx).forEach(a => notify(a.pid, `New reply on ${q.ref} from ${me().name}`, 'admin', { tab: 'support', sq: q.id }, a.id));
  audit('Support request reply', q.id, q.status);
  clearF('sqr');
  toast('Reply sent to the support team.');
  ok();
};

// ---- attachments: opened only after the guard confirms the viewer is the requester or an admin in its context
const sqFile = d => {
  const q = byId('supportQueries', d.q);
  return { q, f: q && (q.files || []).find(x => x.id === d.f) };
};
const sqOpen = (d, then) => {
  const { q, f } = sqFile(d);
  if (!f) return toast('That attachment no longer exists.', 'err');
  sqBlob(f)
    .then(b => {
      if (!b) throw new Error('missing');
      if (UI.sqUrl) URL.revokeObjectURL(UI.sqUrl);
      UI.sqUrl = URL.createObjectURL(b);
      then(q, f, UI.sqUrl, b);
    })
    .catch(() => toast('This file is not stored in this browser, so it cannot be opened here.', 'err'));
};
A.sqView = d =>
  sqOpen(d, (q, f, url, b) => {
    audit('Support attachment viewed', q.id, f.n);
    save();
    const box = 'class="sq-pv"';
    const show =
      f.kind === 'image'
        ? `<img ${box} src="${url}" alt="${h(f.n)}">`
        : f.kind === 'video'
          ? `<video ${box} src="${url}" controls></video>`
          : f.kind === 'audio'
            ? `<audio src="${url}" controls style="width:100%"></audio>`
            : f.kind === 'pdf'
              ? `<iframe ${box} src="${url}" title="${h(f.n)}"></iframe>`
              : '<pre class="sq-pv sq-txt">…</pre>';
    modal(
      h(f.n),
      `${show}<div class="actions"><span class="cap">${h(q.ref)} · ${sqSize(f.mb)}</span>${B(ic('download', 14) + 'Download', 'sqDl', { q: q.id, f: f.id }, 'btn-p btn-sm')}</div>`,
      true,
    );
    if (f.kind === 'text')
      b.text().then(t => {
        const el = document.querySelector('.sq-txt');
        if (el) el.textContent = t.slice(0, 20000);
      });
  });
A.sqDl = d =>
  sqOpen(d, (q, f, url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = f.n;
    document.body.appendChild(a);
    a.click();
    a.remove();
    audit('Support attachment downloaded', q.id, f.n);
    save();
  });

// ---- Programme Administrator: table of requests in the current context
function sqAdminTable() {
  const qs = S.supportQueries.filter(q => q.ctx === ctxId());
  const topics = [...new Set(qs.map(q => q.cat || 'General'))].sort();
  return card(
    `Support requests <span class="adm-n">${qs.length}</span>`,
    `Requests sent in ${h(ctxName(ctxId()))}. Open a request to review it, respond and change its status.`,
    dataView('adm:support', {
      label: 'support requests',
      items: qs,
      layout: 'table',
      search: q => q.ref + ' ' + P(q.by).name + ' ' + q.t + ' ' + (q.cat || ''),
      searchLabel: 'Search by ID, name or text',
      quick: { label: 'Status', options: SQ_STATES.map(v => [v, v]), test: (q, v) => q.status === v },
      filters: [
        { key: 'topic', label: 'Topic', options: topics.map(v => [v, v]), test: (q, v) => (q.cat || 'General') === v },
        { key: 'files', label: 'Attachments', options: [['yes', 'With attachments'], ['no', 'Without attachments']], test: (q, v) => (v === 'yes') === !!(q.files || []).length },
        { key: 'reply', label: 'Response', options: [['none', 'No response yet'], ['some', 'Responded']], test: (q, v) => (v === 'some') === !!sqLatestReply(q) },
      ],
      sorts: [
        ['at', 'Submitted', (a, b) => String(a.at).localeCompare(String(b.at))],
        ['upd', 'Last updated', (a, b) => sqLast(a).localeCompare(sqLast(b))],
        ['ref', 'Request ID', (a, b) => a.ref.localeCompare(b.ref)],
        ['from', 'Submitted by', (a, b) => P(a.by).name.localeCompare(P(b.by).name)],
        ['st', 'Status', (a, b) => SQ_STATES.indexOf(a.status) - SQ_STATES.indexOf(b.status)],
      ],
      defaultSort: 'at',
      defaultDir: 'desc',
      rowId: q => q.id,
      columns: [
        { label: 'Request ID', sort: 'ref', cell: q => `<span class="mono">${h(q.ref)}</span>` },
        { label: 'Submitted by', sort: 'from', cell: q => `<span class="row sq-nw" style="gap:8px"><span class="av">${ini(q.by)}</span>${nm(q.by)}</span>` },
        { label: 'Subject', cell: q => `<b>${h(q.cat || 'General')}</b><div class="cap sq-sum">${h(q.t)}</div>` },
        { label: 'Submitted', sort: 'at', cell: q => `<span class="sq-nw">${fmt(q.at)}</span>`, hideSm: true },
        { label: 'Status', sort: 'st', cell: q => pill(q.status) },
        { label: 'Files', num: true, cell: q => ((q.files || []).length ? `<span class="sq-nw">${ic('clip', 13)} ${q.files.length}</span>` : '<span class="cap">—</span>'), hideSm: true },
        { label: '', cell: q => B('Details', 'go', { r: 'admin', tab: 'support', sq: q.id }, 'btn-s btn-sm') },
      ],
      bulk: [{ label: 'Mark in progress', icon: 'refresh', run: ids => ids.forEach(id => byId('supportQueries', id)?.status === 'New' && A.sqProg({ id })) }],
      empty: ['question', 'No support requests', 'Requests people send from Help & support in this context appear here.', ''],
    }),
    '',
    'adm-panel',
  );
}
// ---- Programme Administrator: one request
function sqAdminDetail(id) {
  const q = byId('supportQueries', id);
  if (!sqAdmin(q)) {
    audit('Access denied', id, 'support request outside this administrator’s context', 'denied');
    return crumbsHtml([['Support requests', 'admin', { tab: 'support' }], ['Request']]) + banner('err', 'This request is not in your scope', 'Programme Administrators can open support requests sent in the context they are working in. Switch context if you administer the context it was sent in.');
  }
  const f = 'squ';
  const others = SQ_STATES.filter(s => s !== q.status);
  return (
    sqHead(q, [['Support requests', 'admin', { tab: 'support' }], [h(q.ref)]]) +
    `<div class="g12 inc-body"><div class="c8 col inc-main">${card('Request', '', `<p class="sq-msg">${h(q.t)}</p>`)}${card('Attachments', 'Opening or downloading a file is recorded in the audit log.', sqFileList(q, 'The requester did not attach any files.'))}${card('History', 'Status changes, responses and internal notes, newest first.', sqTimeline(q, true))}</div>
 <div class="c4 col inc-side">${card(
   'Update request',
   'The requester sees the status and your response. Internal notes stay with administrators.',
   `${errSum(f)}<form data-f="squ" class="col fgap" novalidate><input type="hidden" name="id" value="${q.id}">${fi(f, 'status', 'Status', { type: 'select', opts: [[q.status, q.status + ' (current)'], ...others.map(s => [s, s])], value: q.status })}${fi(f, 'resp', 'Response to requester', { type: 'textarea', rows: 4, max: 2000, ph: 'What you found, what you did or what you need from them.', help: 'Required when you mark the request Resolved.' })}${fi(f, 'note', 'Internal note (optional)', { type: 'textarea', rows: 2, max: 1000, vis: 'Administrators only' })}<div class="actions"><span></span><button class="btn btn-p btn-sm" type="submit">${ic('check', 14)}Save update</button></div></form>`,
   '',
   'accent',
 )}${card('Details', '', sqSummary(q, true))}</div></div>`
  );
}
F.squ = d => {
  const q = byId('supportQueries', d.id);
  const resp = (d.resp || '').trim();
  const note = (d.note || '').trim();
  const to = SQ_STATES.includes(d.status) ? d.status : q.status;
  const moved = to !== q.status;
  if (
    !validate('squ', d, {
      status: [['fn', { f: () => moved || resp || note, m: 'Change the status, write a response or add a note.' }]],
      resp: [['fn', { f: v => !(moved && to === 'Resolved') || v, m: 'Write a response so the requester knows how it was resolved.' }]],
    })
  )
    return render();
  const at = now();
  if (moved) q.log.push({ at, by: myId(), k: 'status', from: q.status, to });
  if (resp) q.log.push({ at, by: myId(), k: 'reply', t: resp });
  if (note) q.log.push({ at, by: myId(), k: 'note', t: note });
  if (moved) q.status = to;
  if (moved || resp) notify(q.by, moved ? `Your support request ${q.ref} is now ${to}` + (resp ? ' — new response' : '') : `New response on your support request ${q.ref}`, 'help', { id: q.id });
  audit('Support request updated', q.id, [moved && 'status → ' + to, resp && 'response', note && 'internal note'].filter(Boolean).join(', '));
  clearF('squ');
  toast(moved ? `${q.ref} is now ${to}.` : 'Update saved.');
  ok();
};
A.sqProg = d => {
  const q = byId('supportQueries', d.id);
  q.log.push({ at: now(), by: myId(), k: 'status', from: q.status, to: 'In Progress' });
  q.status = 'In Progress';
  notify(q.by, `Your support request ${q.ref} is now In Progress`, 'help', { id: q.id });
  audit('Support request updated', q.id, 'status → In Progress');
  ok();
};
// Choosing an admin tab leaves an open request
{
  const tab = A.tab;
  A.tab = d => {
    if (d.k === 'adm') delete UI.p.sq;
    tab(d);
  };
}
// Older stored requests: give them an ID, a context, the new statuses and a history.
function sqMigrate() {
  (S.supportQueries || []).forEach(q => {
    if (!q.ref) q.ref = 'SR-' + String(q.id).replace(/\D/g, '').padStart(4, '0');
    if (!q.ctx) q.ctx = (S.assign.find(a => a.pid === q.by && a.status === 'Active') || {}).ctx || 'c1';
    if (q.status === 'Open') q.status = 'New';
    if (!SQ_STATES.includes(q.status)) q.status = 'New';
    q.files = q.files || [];
    q.at = q.at || today();
    q.log = q.log || [{ at: q.at, by: q.by, k: 'submitted' }];
  });
}

// ---- Review Inbox: only items assigned to this person in this role and context
route('inbox', 'any', () => {
  const items = inboxItems();
  const reviewer = hasB('Reviewer');
  return (
    head('Review inbox', `Items assigned to you as ${h(asgLabel(asg()))}. Nothing here is a general programme queue.`) +
    (role() === 'F' && !reviewer ? banner('info', 'Evidence approval is not part of your role', 'Approving evidence needs the Reviewer bundle. As Facilitator / Steward you review projects, pathways and Match Briefs you are assigned to; you can comment on evidence, not approve it.') : '') +
    card(
      'Assigned to you',
      items.length + ' item' + (items.length === 1 ? '' : 's'),
      table(['Kind', 'Item', 'Detail', ''], items.map(([k, t, s, r, p]) => [pill(k, 'p-navy'), `<b>${h(t)}</b>`, h(s), L('Open', r, p)]), 'Nothing is waiting for you.'),
    )
  );
});

// ---- Explore board (Bulletin Board Lite, BF-15): approved Opportunity Cards, programme announcements and
// released Visible Wins. Every item keeps its source audience; nothing is ranked, liked or commented on.
UI.boardF = UI.boardF || 'all';
function boardItems() {
  const out = [];
  S.cards
    .filter(c => inCtx(c) && c.status === 'Active' && cardVisible(c))
    .forEach(c => out.push({ k: 'opp', at: c.created || c.expires, t: c.title, s: `${h(c.kind)} · ${h(c.cat || '')} · open until ${fmt(c.expires)}`, src: 'Opportunity Card · ' + h(c.vis || 'Programme'), act: L('View card', 'card', { id: c.id }) }));
  (S.announcements || [])
    .filter(a => a.ctx === ctxId())
    .forEach(a => out.push({ k: 'ann', at: a.at, t: a.t, s: a.kind || 'Programme announcement', src: 'Programme Administrator · ' + h(ctxShort(a.ctx)) + ' programme audience', act: '' }));
  S.rooms
    .filter(x => inCtx(x))
    .forEach(x => (x.wins || []).filter(w => w.status === 'Approved' && w.release === 'Programme').forEach(w => out.push({ k: 'win', at: w.at, t: w.t, s: h(x.name), src: 'Visible Win released to the programme audience', act: memberOf(x) ? L('Open ' + WL(), 'room', { id: x.id }) : '' })));
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}
route('board', 'any', () => {
  const all = boardItems();
  const KIND = { opp: ['Opportunity', 'megaphone', 't-purple'], ann: ['Announcement / event', 'bell', 't-navy'], win: ['Visible Win', 'flag', 't-teal'] };
  const list = UI.boardF === 'all' ? all : all.filter(x => x.k === UI.boardF);
  const f = (v, l) => `<button type="button" class="${UI.boardF === v ? 'on' : ''}" data-a="boardF" data-v="${v}" aria-pressed="${UI.boardF === v}">${l}<span class="cnt">${v === 'all' ? all.length : all.filter(x => x.k === v).length}</span></button>`;
  const howRows = [
    ['Opportunity', 'Publish an Opportunity Card with status Active and an audience you are allowed to see (usually Programme).', role() === 'P' || role() === 'C' || role() === 'A' ? L('Post a card', 'newcard', {}, 'btn btn-s btn-sm') : ''],
    ['Announcement', 'Programme Administrator → Notifications → Send an announcement (same context).', role() === 'A' ? L('Send announcement', 'admin', { tab: 'notify' }, 'btn btn-s btn-sm') : ''],
    ['Visible Win', 'In an Action Workspace → record a win → steward/lead Approves it (auto-releases to Programme).', myRooms().length ? L('Open a ' + WL(), 'rooms', {}, 'btn btn-s btn-sm') : ''],
  ];
  return (
    head('Explore board', `What is happening in ${h(ctxName(ctxId()))}: approved opportunities, programme announcements and released wins.`) +
    card(
      'How items get onto this board',
      'Bulletin Board Lite (BF-15) — no new feed. Items appear only when the source record is approved and released to an audience you can already see.',
      table(['Type', 'How to add', ''], howRows.map(([a, b, c]) => [`<b>${a}</b>`, b, c || '—'])),
      '',
      'board-how',
    ) +
    `<div class="section-gap"></div>` +
    `<div class="seg board-f" role="group" aria-label="Show">${f('all', 'All')}${f('opp', 'Opportunities')}${f('ann', 'Announcements')}${f('win', 'Visible Wins')}</div>` +
    `<div class="board-list">${
      list
        .map(x => {
          const [kl, ki, kt] = KIND[x.k];
          return `<article class="card board-i"><span class="tile ${kt}" aria-hidden="true">${ic(ki, 18)}</span><div class="col board-b"><span class="over">${kl}</span><b>${h(x.t)}</b><span class="cap">${x.s}</span><span class="cap board-src">${ic('lock', 12)}${x.src}</span></div>${x.act ? `<div class="board-a">${x.act}</div>` : ''}</article>`;
        })
        .join('') || empty('grid', 'Nothing on the board yet', 'Approved cards, announcements and released wins appear here.')
    }</div>` +
    `<p class="cap board-n">${ic('info', 13)} Composed only from records you are already allowed to see. No likes, followers, rankings, reputation or public comments. Private notes and unreleased evidence never appear.</p>`
  );
});
A.boardF = d => {
  UI.boardF = d.v;
  render();
};

// ---- My collaborations (Relationship List Lite, BF-16): confirmed, authorised relationships only.
function relationRows(pid = myId()) {
  const rows = [];
  const add = (other, type, where, r, p, theirRole, status) => {
    if (other === pid) return;
    rows.push({ other, type, where, r, p, theirRole, status });
  };
  S.matches
    .filter(m => m.status === 'Introduced' && (m.a === pid || m.b === pid) && inCtx(m))
    .forEach(m => add(m.a === pid ? m.b : m.a, 'Confirmed introduction', 'Match Brief', 'match', { id: m.id }, '—', m.outcome || 'Introduced'));
  [
    ['circles', 'Circle member', 'circle'],
    ['ropes', 'Rope Team', 'rope'],
    ['rooms', 'Collaborator', 'room'],
  ].forEach(([k, type, r]) =>
    S[k]
      .filter(o => inCtx(o) && memberOf(o, pid))
      .forEach(o =>
        o.members
          .filter(m => m.status === 'Active' || !m.status)
          .forEach(m => add(m.pid, type, h(o.name), r, { id: o.id }, h(spaceRole(k, o, m.pid) || normRole(m.role) || 'Member'), o.state === 'Active' ? 'Active' : o.state)),
      ),
  );
  const org = P(pid).org;
  if (org)
    S.people
      .filter(p => p.org === org && p.id !== pid && S.assign.some(a => a.pid === p.id && a.ctx === ctxId() && a.status === 'Active'))
      .forEach(p => add(p.id, 'Same organisation', h((S.orgs.find(o => o.id === org) || {}).name || ''), null, null, h(ROLE[(S.assign.find(a => a.pid === p.id && a.ctx === ctxId()) || {}).role] || ''), 'Active'));
  return rows;
}
route('relations', 'any', () => {
  const rows = relationRows();
  const people = new Set(rows.map(x => x.other)).size;
  return (
    head('My collaborations', `People you are connected with in ${h(ctxName(ctxId()))} through confirmed introductions, shared spaces or your organisation.`) +
    card(
      'Confirmed relationships',
      `${people} ${people === 1 ? 'person' : 'people'} · ${rows.length} relationship${rows.length === 1 ? '' : 's'}`,
      table(
        ['Person', 'Relationship', 'Where', 'Their role there', 'Status'],
        rows.map(x => [`<span class="row" style="gap:8px"><span class="av">${ini(x.other)}</span>${nm(x.other)}</span>`, h(x.type), x.r ? L(x.where, x.r, x.p) : x.where, x.theirRole, pill(x.status)]),
        'No confirmed relationships yet. They appear after an introduction or when you share a space.',
      ),
    ) +
    `<p class="cap board-n">${ic('info', 13)} Each row follows the original permission. It changes or disappears when the relationship or your access ends. No inferred friendship, relationship strength, influence or trust score.</p>`
  );
});

// ---- Partner: organisation and mandate (doc 1 §6.4)
route('mandate', 'any', () => {
  const a = asg();
  const org = S.orgs.find(o => o.id === me().org);
  const xo = (S.xorg || []).filter(x => x.by === myId());
  return (
    head('Organisation & mandate', `What you may do for ${h(org ? org.name : 'your organisation')} in ${h(ctxName(a.ctx))}.`) +
    `<div class="hm-cols"><div class="col" style="gap:16px">${card(
      'Mandate in this context',
      'Your contact and work access follow this mandate and mutual consent.',
      a.mandate
        ? dl([
            ['Status', pill(a.mandate.valid && a.mandate.until >= today() ? 'Active' : 'Expired')],
            ['Scope', h(a.mandate.scope)],
            ['Valid until', fmt(a.mandate.until)],
            ['Granted for', h(asgLabel(a))],
          ])
        : `<p class="muted">No mandate on file. You can contribute to work you are invited to; binding commitments need a mandate.</p>`,
    )}${card('Cross-organisation sharing requests', 'Named items only, and only with the participant’s cross-organisation consent.', table(['Request', 'Status', 'Sent'], xo.map(x => [h(x.what), pill(x.status), fmt(x.at)]), 'No requests.'), B('Request cross-organisation sharing', 'xoNew'))}</div><div class="col" style="gap:16px">${card('Organisation profile', '', `<p class="muted">${h((org && org.profile) || 'No profile yet.')}</p>`, B(ic('edit', 14) + 'Edit profile', 'orgEdit'))}${banner('info', 'What a mandate never grants', 'Access to other assignees’ private profiles, Purpose Compass answers, Rope Team notes or another organisation’s workspaces.')}</div></div>`
  );
});

// ---- AI Owner: approved AI use cases, source registry and evaluation. AI advises; it never decides (BF-09).
const AI_USES = [
  ['Ask PHOENIX — private assist (Class A)', 'Answers from approved sources, with sources and uncertainty.', 'Needs the person’s AI processing permission'],
  ['Draft summaries (Circle, project sections, Harvest)', 'Drafts only; a person edits and accepts or rejects every draft.', 'Needs AI processing permission'],
  ['Proposal source check (Circles)', 'Flags claims that lack sources or contradict each other, and suggests questions.', 'Advisory: cannot pass or fail a vote'],
  ['Match Brief draft', 'Drafts “Why suggested” and “What is missing” from fields the person allowed for matching.', 'A steward reviews; both parties consent'],
];
route('aiadmin', 'any', () => {
  if (!hasB('AI Owner')) return deniedView('ai');
  return (
    head('AI Owner: sources & evaluation', 'Approved AI use cases, the source registry and evaluation records for this programme.') +
    banner('ai', 'AI advises, drafts and fact-checks only', 'It never passes or fails a vote, approves evidence, releases content, imposes a sanction or creates authority. Every AI output is labelled “AI draft / advisory”.') +
    card('Approved AI use cases', '', table(['Use case', 'What it does', 'Boundary'], AI_USES.map(([a, b, c]) => [`<b>${h(a)}</b>`, h(b), h(c)]))) +
    '<div class="section-gap"></div>' +
    card('Source registry', 'Only approved sources are used to answer questions.', table(['Source', 'Status', ''], S.aiSources.map(x => [h(x.title), pill(x.status === 'Approved' ? 'Approved' : 'Not approved'), B(x.status === 'Approved' ? 'Withdraw approval' : 'Approve', 'srcToggle', { id: x.id }, x.status === 'Approved' ? 'btn-s btn-sm' : 'btn-p btn-sm')]))) +
    '<div class="section-gap"></div>' +
    card('Evaluation log', 'Recent AI outputs and their human decisions.', table(['Output', 'Requested by', 'Status'], S.ai.slice(0, 8).map(j => [h(j.kind || j.t || j.id), nm(j.by), pill(j.status)]), 'No AI outputs yet.'))
  );
});
A.srcToggle = d => {
  const x = byId('aiSources', d.id);
  if (!x) return;
  x.status = x.status === 'Approved' ? 'Not approved' : 'Approved';
  audit('AI source ' + (x.status === 'Approved' ? 'approved' : 'withdrawn'), x.id, x.title);
  toast(x.title + ': ' + x.status);
  ok();
};
// Attachments and receipts download as a small placeholder file (prototype: no real file storage).
A.fakeDl = d => {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['PHOENIX prototype placeholder for: ' + d.n + '\r\nGenerated ' + now()], { type: 'text/plain;charset=utf-8' }));
    a.download = String(d.n || 'download').replace(/[^\w.-]+/g, '-') + '.txt';
    a.click();
  } catch (e) {}
  audit('Downloaded', d.n, '');
  toast('Downloaded ' + d.n + '.');
  ok();
};
