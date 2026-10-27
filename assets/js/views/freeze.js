// ---------- BUILD-FREEZE ADDITIONS (WSS Build-Freeze Review v1.0 and Action Pack, Oct 2026) ----------
// Help & support (human, BF-14), Review Inbox (assigned items only), Explore board (Bulletin Board Lite, BF-15),
// My collaborations (Relationship List Lite, BF-16), Collaborator organisation & mandate.
// Everything here composes existing, already-authorised records: no new feed, ranking, score or graph.

// ---- Help & support: a human route, separate from Ask PHOENIX, mentor support and incident reporting.
// A request is seen by the person who sent it and by Organization Admins in the context it was sent in.
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
// Routing (q.to, set from routeTo() when sent): a member's request goes to the Organization Admins of the context it
// was sent in; an Organization Admin's own request goes to the Platform Administrator, never to their own or another
// tenant's admins. The Organization Admin may forward a member's request they cannot solve (q.fwd). The Platform
// Administrator handles Organization Admins' requests and forwarded ones, from every organization, and sends none.
const sqAdmin = q =>
  !!q && q.by !== myId() && ((role() === 'A' && q.ctx === ctxId() && q.to !== 'platform') || (role() === 'T' && (q.to === 'platform' || !!q.fwd)));
const sqPlatform = () => S.supportQueries.filter(q => q.to === 'platform' || q.fwd);
// The people a request goes to, and where their copy of it opens.
const sqDesk = q => S.assign.filter(a => a.status === 'Active' && (q.to === 'platform' ? roleBase(a.role) === 'T' : roleBase(a.role) === 'A' && a.ctx === q.ctx));
const sqDeskLink = q => (q.to === 'platform' ? ['support', { sq: q.id }] : ['admin', { tab: 'support', sq: q.id }]);
const sqDeskName = q => (q.to === 'platform' ? 'Platform support' : 'Programme support');
// Where the support list lives for the current role: the Platform Administrator's own page, or Programme admin.
const sqHome = (p = {}) => (role() === 'T' ? ['support', p] : ['admin', { tab: 'support', ...p }]);
const sqMine = q => !!q && q.by === myId();
const sqSees = q => sqMine(q) || sqAdmin(q);
const sqLast = q => (q.log || []).reduce((m, x) => (x.at > m ? x.at : m), q.at || '');

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
  fwd: ['send', 'Passed to the platform support team'],
};
const sqTimeline = (q, admin) =>
  `<ol class="timeline sq-tl">${(q.log || [])
    .filter(x => admin || x.k !== 'note')
    .slice()
    .reverse()
    .map(x => {
      const [icon, label] = SQ_LOG[x.k] || ['info', 'Update'];
      const who = x.by === myId() ? 'You' : x.k === 'reply' && !admin ? sqDeskName(q) + ' (' + nm(x.by) + ')' : nm(x.by);
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
    ['Sent to', q.to === 'platform' ? 'Platform Administrator' : 'Organization Admins of ' + h(ctxName(q.ctx)) + (q.fwd ? ' · forwarded to the Platform Administrator' : '')],
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
    `<div class="g12 inc-body"><div class="c8 col inc-main">${card('Progress', '', sqSteps(q))}${last ? card('Latest response', 'From ' + sqDeskName(q).toLowerCase() + ' · ' + fmt(last.at), `<p class="sq-msg">${h(last.t)}</p>`, '', 'accent') : ''}${card('Your request', '', `<p class="sq-msg">${h(q.t)}</p>`)}${card('Attachments', '', sqFileList(q, 'You did not attach any files.'))}${card('History', '', sqTimeline(q, false))}</div>
 <div class="c4 col inc-side">${card('Details', '', sqSummary(q, false))}${card('Reply', '', replyBox)}</div></div>`
  );
}

// Platform Administrator: one list of support requests from every organization (they do not send requests).
route('support', 'any', () => {
  if (role() !== 'T') return deniedView('support');
  if (UI.p.sq) return sqAdminDetail(UI.p.sq);
  return head('Support requests', 'Sent by Organization Admins, or forwarded by them when they cannot solve a member’s request. You can respond and change the status.') + sqAdminTable();
});
route('help', 'any', () => {
  if (role() === 'T') return ROUTES.support.view();
  const sel = UI.p.id && byId('supportQueries', UI.p.id);
  if (UI.p.id) {
    if (sel && sqMine(sel)) return sqUserDetail(sel);
    audit('Access denied', UI.p.id, 'support request belongs to someone else', 'denied');
    return head('Help & support', '') + banner('err', 'You cannot open this request', 'Support requests are visible only to the person who sent them and the programme support team.') + `<div class="section-gap"></div>` + B('Back to Help & support', 'go', { r: 'help' }, 'btn-s btn-sm');
  }
  const mine = S.supportQueries.filter(q => q.by === myId());
  const rope = S.ropes.find(r => inCtx(r) && memberOf(r) && r.mentor && r.mentor !== myId());
  const aiOk = purposeOn('ai', myId());
  const f = 'helpq';
  const sending = !!UI.sqSending;
  // An Organization Admin's request and concerns go to the Platform Administrator, not to their own organization.
  const toPlat = routeTo() === 'platform';
  const tile = (icon, t, sub, act) => `<section class="card help-tile"><span class="tile t-soft" aria-hidden="true">${ic(icon, 18)}</span><div class="col" style="gap:4px"><b>${t}</b><p class="cap">${sub}</p></div><div class="row wrap" style="gap:8px">${act}</div></section>`;
  return (
    head('Help & support', `People who can help you in ${h(ctxName(ctxId()))}. Each route below is separate: asking one never sends anything to another.`) +
    `<div class="help-grid">${[
      tile('user', 'Human support desk', (toPlat ? 'The Platform Administrator answers requests from Organization Admins' : 'A person from the programme team answers') + ', usually within two working days. Use it for access, onboarding, records or anything that is not working.', B('Write to support', 'sqFocus', {}, 'btn-p btn-sm')),
      can('ai')
        ? tile('sparkle', 'Ask PHOENIX (AI, advisory)', aiOk ? 'Answers from approved programme sources, with sources and uncertainty. It advises; it never decides, approves or changes your record.' : 'AI processing is off for you, so Ask PHOENIX is unavailable. Everything else keeps working. You can change this in My records & consent.', aiOk ? B('Open Ask PHOENIX', 'askToggle', {}, 'btn-s btn-sm') : B('My records & consent', 'go', { r: 'privacy', tab: 'consent' }, 'btn-s btn-sm'))
        : '',
      rope ? tile('route', 'Your mentor', `${nm(rope.mentor)} supports you in ${h(rope.name)}. Mentoring conversations stay in your Rope Team.`, L('Open Rope Team', 'rope', { id: rope.id }, 'btn btn-s btn-sm')) : '',
      tile('alert', 'Report a concern', `For safety, conduct or misuse. Goes confidentially to ${toPlat ? 'the Platform Administrator' : 'your programme’s Organization Admin'}. You can report anonymously.`, B('Report a concern', toPlat ? 'incNew' : 'go', toPlat ? {} : { r: 'incidents' }, 'btn-s btn-sm')),
    ].join('')}</div>` +
    `<div class="section-gap"></div>` +
    card(
      'Write to the support desk',
      toPlat ? 'Seen by the Platform Administrator only, not by other admins of this organization.' : 'Seen by the programme support team for this context only.',
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
      const q = { id, ref: 'SR-' + id.slice(2).padStart(4, '0'), by: myId(), t: d.t.trim(), cat: d.cat, ctx: ctxId(), to: routeTo(), at: now(), status: 'New', files, log: [{ at: now(), by: myId(), k: 'submitted' }] };
      S.supportQueries.unshift(q);
      const from = q.to === 'platform' ? `${me().name} (Organization Admin, ${ctxName(q.ctx)})` : me().name;
      sqDesk(q).forEach(a => notify(a.pid, `Support request ${q.ref}: ${d.cat} from ${from}`, ...sqDeskLink(q), a.id));
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
  sqDesk(q).forEach(a => notify(a.pid, `New reply on ${q.ref} from ${me().name}`, ...sqDeskLink(q), a.id));
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

// ---- Organization Admin: table of requests in the current context
function sqAdminTable() {
  const all = role() === 'T';
  const qs = S.supportQueries.filter(sqAdmin);
  const topics = [...new Set(qs.map(q => q.cat || 'General'))].sort();
  return card(
    `Support requests <span class="adm-n">${qs.length}</span>`,
    all ? 'Requests Organization Admins sent, and members’ requests they forwarded because they could not solve them. Open a request to review it, respond and change its status.' : `Requests members sent in ${h(ctxName(ctxId()))}. Requests from Organization Admins go to the Platform Administrator. Open a request to review it, respond and change its status.`,
    dataView('adm:support', {
      label: 'support requests',
      items: qs,
      layout: 'table',
      search: q => q.ref + ' ' + P(q.by).name + ' ' + q.t + ' ' + (q.cat || ''),
      searchLabel: 'Search by ID, name or text',
      quick: { label: 'Status', options: SQ_STATES.map(v => [v, v]), test: (q, v) => q.status === v },
      filters: [
        all && { key: 'via', label: 'Received as', options: [['admin', 'From an Organization Admin'], ['fwd', 'Forwarded']], test: (q, v) => (v === 'admin') === (q.to === 'platform') },
        all && { key: 'org', label: 'Organization', options: [...new Set(qs.map(q => q.ctx))].map(c => [c, ctxName(c)]), test: (q, v) => q.ctx === v },
        { key: 'topic', label: 'Topic', options: topics.map(v => [v, v]), test: (q, v) => (q.cat || 'General') === v },
        { key: 'files', label: 'Attachments', options: [['yes', 'With attachments'], ['no', 'Without attachments']], test: (q, v) => (v === 'yes') === !!(q.files || []).length },
        { key: 'reply', label: 'Response', options: [['none', 'No response yet'], ['some', 'Responded']], test: (q, v) => (v === 'some') === !!sqLatestReply(q) },
      ].filter(Boolean),
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
        all && { label: 'Organization', cell: q => h(ctxName(q.ctx)) },
        all && { label: 'Received as', cell: q => (q.to === 'platform' ? pill('From Organization Admin', 'p-navy') : `Forwarded by ${nm(q.fwd.by)}<div class="cap">${fmt(q.fwd.at)}</div>`) },
        { label: 'Subject', cell: q => `<b>${h(q.cat || 'General')}</b><div class="cap sq-sum">${h(q.t)}</div>` },
        { label: 'Submitted', sort: 'at', cell: q => `<span class="sq-nw">${fmt(q.at)}</span>`, hideSm: true },
        { label: 'Status', sort: 'st', cell: q => pill(q.status) },
        { label: 'Files', num: true, cell: q => ((q.files || []).length ? `<span class="sq-nw">${ic('clip', 13)} ${q.files.length}</span>` : '<span class="cap">—</span>'), hideSm: true },
        { label: '', cell: q => B('Details', 'go', { r: sqHome()[0], ...sqHome({ sq: q.id })[1] }, 'btn-s btn-sm') },
      ].filter(Boolean),
      bulk: [{ label: 'Mark in progress', icon: 'refresh', run: ids => ids.forEach(id => byId('supportQueries', id)?.status === 'New' && A.sqProg({ id })) }],
      empty: ['question', 'No support requests', all ? 'Requests Organization Admins send, or forward when they cannot solve them, appear here.' : 'Requests members send from Help & support in this context appear here.', ''],
    }),
    '',
    'adm-panel',
  );
}
// Forwarding is optional and one-way: the Organization Admin keeps the request and can still respond. The requester
// sees that it was passed on, not the reason, which is written for the Platform Administrator.
function sqFwdCard(q) {
  if (q.fwd)
    return card('Forwarded to the Platform Administrator', `${role() === 'T' ? 'By ' + nm(q.fwd.by) + ' · ' : ''}${fmt(q.fwd.at)}`, q.fwd.why ? `<p class="sq-msg">${h(q.fwd.why)}</p>` : '<p class="cap">No reason given.</p>');
  if (role() !== 'A' || q.status === 'Closed') return '';
  const f = 'sqfwd';
  return card(
    'Cannot solve this?',
    'Forward it to the Platform Administrator. You keep it too, and can still respond.',
    `${errSum(f)}<form data-f="sqfwd" class="col fgap" novalidate><input type="hidden" name="id" value="${q.id}">${fi(f, 'why', 'What you tried and what is needed', { type: 'textarea', rows: 3, req: true, max: 1000, vis: 'Platform Administrator only' })}<div class="actions"><span></span><button class="btn btn-s btn-sm" type="submit">${ic('send', 14)}Forward to Platform Administrator</button></div></form>`,
  );
}
F.sqfwd = d => {
  if (!validate('sqfwd', d, { why: ['req'] })) return render();
  const q = byId('supportQueries', d.id);
  q.fwd = { at: now(), by: myId(), why: d.why.trim() };
  q.log.push({ at: q.fwd.at, by: myId(), k: 'fwd' });
  S.assign.filter(a => roleBase(a.role) === 'T' && a.status === 'Active').forEach(a => notify(a.pid, `Support request ${q.ref} forwarded from ${ctxName(q.ctx)} by ${me().name}`, 'support', { sq: q.id }, a.id));
  audit('Support request forwarded to Platform Administrator', q.id, q.ref);
  clearF('sqfwd');
  toast('Forwarded to the Platform Administrator.');
  ok();
};
// ---- Organization Admin: one request
function sqAdminDetail(id) {
  const q = byId('supportQueries', id);
  if (!sqAdmin(q)) {
    audit('Access denied', id, 'support request outside this administrator’s context', 'denied');
    return crumbsHtml([['Support requests', ...sqHome()], ['Request']]) + banner('err', 'This request is not in your scope', 'Organization Admins can open support requests sent in the context they are working in. Switch context if you administer the context it was sent in.');
  }
  const f = 'squ';
  const others = SQ_STATES.filter(s => s !== q.status);
  return (
    sqHead(q, [['Support requests', ...sqHome()], [h(q.ref)]]) +
    `<div class="g12 inc-body"><div class="c8 col inc-main">${card('Request', '', `<p class="sq-msg">${h(q.t)}</p>`)}${card('Attachments', 'Opening or downloading a file is recorded in the audit log.', sqFileList(q, 'The requester did not attach any files.'))}${card('History', 'Status changes, responses and internal notes, newest first.', sqTimeline(q, true))}</div>
 <div class="c4 col inc-side">${card(
   'Update request',
   'The requester sees the status and your response. Internal notes stay with administrators.',
   `${errSum(f)}<form data-f="squ" class="col fgap" novalidate><input type="hidden" name="id" value="${q.id}">${fi(f, 'status', 'Status', { type: 'select', opts: [[q.status, q.status + ' (current)'], ...others.map(s => [s, s])], value: q.status })}${fi(f, 'resp', 'Response to requester', { type: 'textarea', rows: 4, max: 2000, ph: 'What you found, what you did or what you need from them.', help: 'Required when you mark the request Resolved.' })}${fi(f, 'note', 'Internal note (optional)', { type: 'textarea', rows: 2, max: 1000, vis: 'Administrators only' })}<div class="actions"><span></span><button class="btn btn-p btn-sm" type="submit">${ic('check', 14)}Save update</button></div></form>`,
   '',
   'accent',
 )}${sqFwdCard(q)}${card('Details', '', sqSummary(q, true))}</div></div>`
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
    // sent before routing existed: an Organization Admin's own request goes to the Platform Administrator
    if (!q.to) q.to = S.assign.some(a => a.pid === q.by && a.ctx === q.ctx && roleBase(a.role) === 'A' && a.status === 'Active') ? 'platform' : 'tenant';
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

// ---- Explore board (Bulletin Board Lite, BF-15): approved Opportunity Cards, programme announcements, released
// Visible Wins. Sponsors' projects (created under an alias, challenges.js) are listed with the Opportunities and are
// visible to every role in the programme. Every item keeps its source audience; nothing is ranked, liked or commented on.
UI.boardF = UI.boardF || 'all';
// who: the post's source shown as its author line; src: provenance and audience; d: optional body text.
function boardItems() {
  const out = [];
  S.cards
    .filter(c => inCtx(c) && c.status === 'Active' && cardVisible(c))
    .forEach(c => out.push({ k: 'opp', at: c.created || c.expires, t: c.title, d: c.desc || '', s: `${h(c.kind)} · ${h(c.cat || '')} · open until ${fmt(c.expires)}`, who: 'Opportunity Card', src: h(c.vis || 'Programme') + ' audience', act: L('View card', 'card', { id: c.id }) }));
  (S.announcements || [])
    .filter(a => a.ctx === ctxId())
    .forEach(a => out.push({ k: 'ann', at: a.at, t: a.t, s: h(a.kind || 'Programme announcement'), who: 'Organization Admin', src: h(ctxShort(a.ctx)) + ' programme audience', act: '' }));
  S.rooms
    .filter(x => inCtx(x))
    .forEach(x => (x.wins || []).filter(w => w.status === 'Approved' && w.release === 'Programme').forEach(w => out.push({ k: 'win', at: w.at, t: w.t, s: 'Approved win', who: h(x.name), src: 'Released to the programme audience', act: memberOf(x) ? L('Open ' + WL(), 'room', { id: x.id }) : '' })));
  (S.challenges || [])
    .filter(c => inCtx(c) && c.status !== 'Archived')
    .forEach(c => out.push({ k: 'opp', kl: 'Sponsor project', at: c.at, t: c.title, s: chBoardSub(c), who: h(c.alias), src: 'Sponsor’s name not shown', act: L(chAccepting(c) && chCanApply(c) ? 'View and apply' : 'View project', 'challenge', { id: c.id }) }));
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}
const BOARD_KIND = { opp: ['Opportunity', 'megaphone', 't-purple', 'p-purple'], ann: ['Announcement', 'bell', 't-navy', 'p-navy'], win: ['Visible Win', 'flag', 't-teal', 'p-teal'] };
// One feed post. The Sponsor's preview in challenges.js renders through this too, so both read the same.
// Deliberately no reaction or comment bar: the board has no likes, comments or ranking (BF-15).
function boardPost(x) {
  const [kl, ki, kt, kp] = BOARD_KIND[x.k];
  const at = String(x.at || '').slice(0, 10);
  return `<article class="board-post"><header class="bp-h"><span class="tile ${kt}" aria-hidden="true">${ic(ki, 20)}</span><div class="bp-who"><b>${x.who}</b><span class="cap bp-meta">${at ? `<time datetime="${h(at)}">${fmt(at)}</time><span aria-hidden="true">·</span>` : ''}<span class="bp-aud">${ic('lock', 12)}${x.src}</span></span></div>${pill(x.kl || kl, kp)}</header><div class="bp-body"><h3 class="bp-t">${h(x.t)}</h3>${x.d ? `<p class="bp-d">${h(x.d)}</p>` : ''}<p class="cap bp-s">${x.s}</p></div>${x.act ? `<footer class="bp-f">${x.act}</footer>` : ''}</article>`;
}
route('board', 'any', () => {
  const all = boardItems();
  if (!BOARD_KIND[UI.boardF]) UI.boardF = 'all';
  const list = UI.boardF === 'all' ? all : all.filter(x => x.k === UI.boardF);
  const f = (v, l) => `<button type="button" role="tab" aria-selected="${UI.boardF === v}" aria-controls="board-feed" class="tab ${UI.boardF === v ? 'on' : ''}" data-a="boardF" data-v="${v}">${l}<span class="cnt">${v === 'all' ? all.length : all.filter(x => x.k === v).length}</span></button>`;
  const howRows = [
    ['Opportunity', 'Publish an Opportunity Card with status Active and an audience you are allowed to see (usually Programme).', role() === 'P' || role() === 'C' || role() === 'A' ? L('Post a card', 'newcard', {}, 'btn btn-s btn-sm') : ''],
    ['Visible Win', 'In an Action Workspace → record a win → steward/lead Approves it (auto-releases to Programme).', myRooms().length ? L('Open a ' + WL(), 'rooms', {}, 'btn btn-s btn-sm') : ''],
    ['Sponsor project', 'A Sponsor creates a project under an alias. It is listed with the Opportunities for everyone; Participants and Collaborators ask to take part and talk in its chat room.', role() === 'S' ? B(ic('plus', 14) + 'Create project', 'chNew', {}, 'btn-s btn-sm') : ''],
  ];
  const feed =
    `<div class="tabs board-f" role="tablist" aria-label="Show">${f('all', 'All')}${f('opp', 'Opportunities')}${f('ann', 'Announcements')}${f('win', 'Visible Wins')}</div>` +
    `<div class="board-list" id="board-feed" role="tabpanel">${list.map(boardPost).join('') || empty('grid', 'Nothing on the board yet', 'Approved cards, sponsors’ projects, announcements and released wins appear here.')}</div>`;
  const rail =
    card(
      'How items get onto this board',
      'Bulletin Board Lite (BF-15) — no new feed. Items appear only when the source record is approved and released to an audience you can already see.',
      `<ul class="board-how-l">${howRows.map(([a, b, c]) => `<li><b>${a}</b><span class="cap">${b}</span>${c ? `<span class="board-how-a">${c}</span>` : ''}</li>`).join('')}</ul>`,
      '',
      'board-how',
    ) +
    `<p class="cap board-n">${ic('info', 13)} Composed only from records you are already allowed to see. No likes, followers, rankings, reputation or public comments. Private notes and unreleased evidence never appear.</p>`;
  return (
    head('Explore board', `What is happening in ${h(ctxName(ctxId()))}: approved opportunities and sponsors’ projects, programme announcements and released wins.`) +
    `<div class="board-wrap"><div class="board-feed">${feed}</div><aside class="board-rail" aria-label="About this board">${rail}</aside></div>`
  );
});
A.boardF = d => {
  UI.boardF = d.v;
  render();
};

// ---- My collaborations (Relationship List Lite, BF-16): confirmed, authorised relationships only.
// Active rows follow the live permission. A space that closed, or a membership that ended, stays in your own history
// as Past: it records work you took part in. It grants nothing new: the other person's profile always shows only
// the claims they share with you today, for any date.
const REL_CLOSED = ['Completed', 'Closed', 'Archived'];
const REL_ENDED = ['Left', 'Exited'];
const relIn = m => !m.status || m.status === 'Active' || REL_ENDED.includes(m.status);
// Dates: recorded on the space when present, otherwise read from its own dated activity (est: true).
function relSpan(o) {
  const ds = [...(o.chat || []), ...(o.decisions || []), ...(o.checkins || []), ...(o.sessions || []), ...(o.tasks || []).flatMap(t => t.log || [])]
    .map(x => String(x.at || '').slice(0, 10))
    .filter(Boolean)
    .sort();
  const closed = REL_CLOSED.includes(o.state);
  return { from: o.started || ds[0] || '', to: o.ended || (closed ? ds[ds.length - 1] || '' : ''), est: !o.started || (closed && !o.ended) };
}
function relationRows(pid = myId()) {
  const rows = [];
  const add = (other, type, where, r, p, theirRole, status, x) => {
    if (other === pid) return;
    rows.push({ other, type, where, r, p, theirRole, status, past: false, from: '', to: '', ...x });
  };
  S.matches
    .filter(m => m.status === 'Introduced' && (m.a === pid || m.b === pid) && inCtx(m))
    .forEach(m => add(m.a === pid ? m.b : m.a, 'Confirmed introduction', 'Match Brief', 'match', { id: m.id }, '—', m.introState ? INTRO_LABEL[m.introState] : 'Introduced — outcome not recorded yet', { past: m.introState === INTRO.CLOSED, from: String(m.introducedAt || '').slice(0, 10), to: m.introState === INTRO.CLOSED ? String(m.introAt || '').slice(0, 10) : '' }));
  [
    ['circles', 'Circle member', 'circle', 'Circle'],
    ['ropes', 'Rope Team', 'rope', 'Rope Team'],
    ['rooms', 'Collaborator', 'room', WL()],
  ].forEach(([k, type, r, kind]) =>
    S[k]
      .filter(o => inCtx(o) && (o.members || []).some(m => m.pid === pid && relIn(m)))
      .forEach(o => {
        const span = relSpan(o);
        const iLeft = REL_ENDED.includes((memberRec(o, pid) || {}).status);
        o.members.filter(relIn).forEach(m => {
          const ended = iLeft || REL_ENDED.includes(m.status);
          const past = REL_CLOSED.includes(o.state) || ended;
          const status = REL_CLOSED.includes(o.state) ? o.state : ended ? 'Membership ended' : o.state;
          add(m.pid, type, h(o.name), memberOf(o, pid) ? r : null, { id: o.id }, h(spaceRole(k, o, m.pid) || normRole(m.role) || 'Member'), status, { past, k, o, kind, ...span });
        });
      }),
  );
  const org = P(pid).org;
  if (org)
    S.people
      .filter(p => p.org === org && p.id !== pid && S.assign.some(a => a.pid === p.id && a.ctx === ctxId() && a.status === 'Active'))
      .forEach(p => add(p.id, 'Same organisation', h((S.orgs.find(o => o.id === org) || {}).name || ''), null, null, h(ROLE[(S.assign.find(a => a.pid === p.id && a.ctx === ctxId()) || {}).role] || ''), 'Active'));
  return rows;
}
// One entry per person: Active if any relationship is live, Past if any has ended (a person can be both).
function relPeople(pid = myId()) {
  const by = {};
  relationRows(pid).forEach(x => (by[x.other] = by[x.other] || []).push(x));
  return Object.entries(by).map(([id, rows]) => ({
    id,
    rows,
    active: rows.some(x => !x.past),
    past: rows.some(x => x.past),
    last: rows.filter(x => x.past).map(x => x.to).filter(Boolean).sort().pop() || '',
  }));
}
const relRoleHere = pid => ROLE[(S.assign.find(a => a.pid === pid && a.ctx === ctxId() && a.status === 'Active') || {}).role] || '';
const relOrg = pid => (P(pid).org && (S.orgs.find(o => o.id === P(pid).org) || {}).name) || '';
const relDates = x => (x.from || x.to ? (x.from ? fmt(x.from) : 'Start not recorded') + ' – ' + (x.past ? (x.to ? fmt(x.to) : 'end not recorded') : 'now') : '');
const REL_KIND = { circles: ['users', 't-purple'], ropes: ['route', 't-teal'], rooms: ['room', 't-navy'] };
route('relations', 'any', () => {
  const all = relationRows();
  const n = rows => new Set(rows.map(x => x.other)).size;
  const t = tabs('rel', [['all', 'All Collaborations', n(all)], ['active', 'Active', n(all.filter(x => !x.past))], ['past', 'Past', n(all.filter(x => x.past))]], 'all');
  const rows = t.cur === 'all' ? all : all.filter(x => x.past === (t.cur === 'past'));
  const people = n(rows);
  return (
    head('My collaborations', `People you work with, or have worked with, in ${h(ctxName(ctxId()))} through confirmed introductions, shared spaces or your organisation.`) +
    t.html +
    card(
      'Confirmed relationships',
      `${people} ${people === 1 ? 'person' : 'people'} · ${rows.length} relationship${rows.length === 1 ? '' : 's'}`,
      table(
        ['Person', 'Relationship', 'Where', 'Their role there', 'Status', ''],
        rows.map(x => [
          `<span class="row" style="gap:8px"><span class="av">${ini(x.other)}</span>${nm(x.other)}</span>`,
          h(x.type),
          x.r ? L(x.where, x.r, x.p) : x.where,
          x.theirRole,
          pill(x.status),
          B(ic('user', 14) + 'View profile', 'relOpen', { pid: x.other }, 'btn-s btn-sm', `aria-label="View full profile of ${nm(x.other)}"`),
        ]),
        { all: 'No confirmed relationships yet. They appear after an introduction or when you share a space.', active: 'No active collaborations. People you are working with now appear here.', past: 'No past collaborations yet. People appear here when a shared space is completed or archived, or a membership ends.' }[t.cur],
      ),
    ) +
    `<p class="cap board-n">${ic('info', 13)} Active rows follow the original permission and change when it does. Past rows keep a record of work you took part in; they never widen what you can see of the other person. No inferred friendship, relationship strength, influence or trust score.</p>`
  );
});
A.relOpen = d => {
  audit('Profile viewed', d.pid, 'From My collaborations · claims shared with the viewer only');
  save();
  go('collab', { pid: d.pid });
};
A.relSnap = (d, el) => {
  UI.p.snap = el.value;
  render();
};

// ---- Collaborator profile: what they share with you now, your shared history, and then-versus-now.
// Claims carry `at` (added), and `prev` holds earlier values with the time each was replaced, so a claim's value
// on a past date is read from records. A claim without `at` cannot be placed in time and is never assumed to be old.
const REL_FIELDS = ['Skills', 'Skill proficiency', 'Capability', 'Knowledge', 'Experience', 'Contributions', 'Languages', 'Interests', 'Goals', 'Availability', 'Preferences', 'Relationships / resources', 'Constraints'];
const relFieldOrder = (a, b) => (REL_FIELDS.indexOf(a.field) + 1 || 99) - (REL_FIELDS.indexOf(b.field) + 1 || 99);
const claimDay = s => String(s || '').slice(0, 10);
function claimAt(c, day) {
  if (!c.at) return { undated: true, value: c.value };
  if (claimDay(c.at) > day) return null;
  const p = (c.prev || []).find(x => claimDay(x.at) > day);
  return { value: p ? p.value : c.value };
}
// Dated changes to the claims this viewer may see: additions and value updates. Reasons are not shown.
const claimEvents = cl =>
  cl
    .flatMap(c => [
      ...(c.at ? [{ at: claimDay(c.at), t: 'Added ' + c.field.toLowerCase() + ': ' + c.value, c }] : []),
      ...(c.prev || []).map((p, i, a) => ({ at: claimDay(p.at), t: c.field + ' updated: “' + p.value + '” → “' + (a[i + 1] ? a[i + 1].value : c.value) + '”', c })),
    ])
    .sort((a, b) => b.at.localeCompare(a.at));
// Released, already-public work: Visible Wins released to the programme and Public Projects.
function relWork(pid) {
  return [
    ...S.rooms
      .filter(x => inCtx(x) && (x.members || []).some(m => m.pid === pid && relIn(m)))
      .flatMap(x => (x.wins || []).filter(w => w.status === 'Approved' && w.release === 'Programme').map(w => ({ at: claimDay(w.at), t: w.t, s: 'Visible Win · ' + x.name }))),
    ...S.projects.filter(p => inCtx(p) && p.owner === pid && p.pub && p.pub.state === 'Published').map(p => ({ at: claimDay(p.pub.publishedAt), t: p.title, s: 'Public project · owner' })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
// What each of you did in a shared space, from records both of you could already see there.
function relDid(r, pid) {
  const o = r.o;
  if (!o) return '';
  if (r.k === 'ropes') return `<p class="cap">${h(o.charter || '')}</p><p class="cap">Rope Team notes, check-ins and support requests stay private to the Rope Team and are not summarised here.</p>`;
  const lines = [];
  const tasks = who => (o.tasks || []).filter(t => t.owner === who).map(t => h(t.t) + ' <span class="cap">(' + h(t.status) + ')</span>');
  const contribs = who => (o.contribs || []).filter(c => c.by === who).map(c => h(c.t) + ' <span class="cap">(' + h(c.status) + ')</span>');
  const commits = who => (o.commitments || []).filter(c => (c.by || c.pid) === who).map(c => h(c.t || c.text || ''));
  [
    [pid, h(P(pid).display || P(pid).name), r.theirRole],
    [myId(), 'You', h(spaceRole(r.k, o) || normRole((memberRec(o) || {}).role) || 'Member')],
  ].forEach(([who, lbl, rl]) => {
    const did = [...tasks(who), ...contribs(who), ...commits(who)];
    lines.push(['<b>' + lbl + '</b> · ' + rl, did.length ? '<ul class="rel-ul">' + did.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '<span class="cap">No assigned tasks, contributions or commitments recorded.</span>']);
  });
  const ms = o.milestones || [];
  const wins = (o.wins || []).filter(w => w.status === 'Approved');
  const outcome = [
    o.outcome && 'Planned: ' + h(o.outcome),
    ms.length && ms.filter(m => m.status === 'Achieved').length + ' of ' + ms.length + ' milestones achieved',
    ...wins.map(w => 'Win: ' + h(w.t)),
    (o.decisions || []).length && r.k === 'circles' && o.decisions.length + ' decision' + (o.decisions.length === 1 ? '' : 's') + ' recorded',
  ].filter(Boolean);
  return dl([...lines, ['Outcome', outcome.length ? outcome.join('<br>') : '<span class="cap">Not recorded</span>']]);
}
route('collab', 'any', () => {
  const pid = UI.p.pid;
  const rel = relPeople().find(x => x.id === pid);
  const crumbs = [['My collaborations', 'relations', {}], [rel ? nm(pid) : 'Profile']];
  if (!rel)
    return crumbsHtml(crumbs) + card('', '', empty('lock', 'Profile not available', `You can open the full profile of people you work with, or have worked with, in ${h(ctxName(ctxId()))}.`, L('Back to My collaborations', 'relations', {}, 'btn btn-s btn-sm')));
  const cl = sharedClaims(pid).sort(relFieldOrder);
  const pr = S.profiles[pid] || {};
  const shared = rel.rows.filter(r => r.r !== null || r.k).sort((a, b) => String(b.from || b.to).localeCompare(String(a.from || a.to)));
  const t = tabs('collab', [['profile', 'Profile'], ['history', 'Our history', shared.length], ['compare', 'Then & now']], 'profile');
  const ev = claimEvents(cl);
  const work = relWork(pid);
  let body = '';
  if (t.cur === 'profile') {
    const groups = REL_FIELDS.concat([...new Set(cl.map(c => c.field))].filter(f => !REL_FIELDS.includes(f)))
      .map(f => [f, cl.filter(c => c.field === f)])
      .filter(([, xs]) => xs.length);
    body =
      `<div class="pf-cols"><div class="pf-main">` +
      card(
        'About',
        '',
        dl([
          ['Display name', h(P(pid).display || '—')],
          ['Role here', h(relRoleHere(pid) || '—') + ' · ' + h(ctxName(ctxId()))],
          relOrg(pid) && ['Organisation', h(relOrg(pid))],
          ['Biography', h(pr.bio || 'Not shared')],
          ['Email', '<span class="cap">Private — released only for an approved introduction</span>'],
          ['Latest shared update', ev.length ? fmt(ev[0].at) : '<span class="cap">No dated updates</span>'],
        ]),
        '',
        'pf-basic',
      ) +
      card(
        'Skills, expertise and experience',
        'Current claims they share with you, with how each is supported.',
        groups.length
          ? `<div class="rel-groups">${groups
              .map(([f, xs]) => `<div class="rel-g"><span class="over">${h(f)}</span><ul class="rel-cl">${xs.map(c => `<li><span>${h(c.value)}</span><span class="row wrap rel-cm">${pill(c.prov, 'p-grey')}<span class="cap">${c.at ? 'since ' + fmt(claimDay(c.at)) : 'date not recorded'}</span></span></li>`).join('')}</ul></div>`)
              .join('')}</div>`
          : empty('user', 'No shared claims', 'This person has not shared any profile claims with your collaboration contexts.'),
      ) +
      `</div><div class="pf-rail">` +
      card('Recent updates', 'Dated changes to the claims shared with you.', ev.length ? `<ol class="pf-hist">${ev.slice(0, 6).map(e => `<li><div class="lt"><b>${h(e.t)}</b><p class="cap">${fmt(e.at)} · ${h(e.c.prov)}</p></div></li>`).join('')}</ol>` : '<p class="cap">No dated updates shared.</p>') +
      card('Work and achievements', 'Released Visible Wins and Public Projects only.', work.length ? `<ol class="pf-hist">${work.map(w => `<li><div class="lt"><b>${h(w.t)}</b><p class="cap">${w.at ? fmt(w.at) : 'Date not recorded'} · ${h(w.s)}</p></div></li>`).join('')}</ol>` : '<p class="cap">Nothing released yet.</p>') +
      card('Working together', '', dl([['Status', (rel.active ? pill('Active', 'p-teal') + ' ' : '') + (rel.past ? pill('Past', 'p-grey') : '')], ['Shared spaces and introductions', String(shared.length)], ['First worked together', fmt(shared.map(r => r.from).filter(Boolean).sort()[0])]]), B('Our history', 'tab', { k: 'collab', v: 'history' })) +
      `</div></div>`;
  }
  if (t.cur === 'history') {
    body = card(
      'Collaboration timeline',
      'Newest first. Each entry keeps when you worked together, your roles and what was recorded there. Same-organisation links have no shared work and are not listed.',
      shared.length
        ? `<ol class="rel-tl">${shared
            .map(r => {
              const [ri, rt] = REL_KIND[r.k] || ['link', 't-purple'];
              return `<li class="rel-ti${r.past ? ' is-past' : ''}"><span class="tile ${rt}" aria-hidden="true">${ic(ri, 16)}</span><div class="col rel-tb"><div class="row wrap rel-th"><b>${r.r ? L(r.where, r.r, r.p) : r.where}</b>${pill(r.status)}${r.past ? pill('Past', 'p-grey') : ''}</div><span class="cap">${h(r.kind || r.type)} · ${relDates(r) || 'Dates not recorded'}${r.est && (r.from || r.to) ? ' · dates from recorded activity' : ''}</span>${relDid(r, pid)}</div></li>`;
            })
            .join('')}</ol>`
        : empty('users', 'No shared work recorded', 'You are connected through your organisation only.'),
    );
  }
  if (t.cur === 'compare') {
    // Comparison points: the end of each past collaboration, else the start of a current one.
    const pts = shared.map(r => ({ day: r.past ? r.to : r.from, r })).filter(x => x.day);
    const pastPts = pts.filter(x => x.r.past);
    const sel = pts.find(x => x.r.p && x.r.p.id + '|' + x.day === UI.p.snap) || pastPts[0] || pts[pts.length - 1];
    if (!sel) body = card('Then & now', '', empty('clock', 'No dated collaboration to compare against', 'A comparison needs a recorded start or end date for at least one shared space.'));
    else {
      const day = sel.day;
      const cmp = cl.map(c => {
        const then = claimAt(c, day);
        const st = !then ? 'New since' : then.undated ? 'Date not recorded' : then.value !== c.value ? 'Updated' : 'Unchanged';
        return { c, then, st };
      });
      const ST = { 'New since': 'p-teal', Updated: 'p-amber', Unchanged: 'p-grey', 'Date not recorded': 'p-grey' };
      const n = s => cmp.filter(x => x.st === s).length;
      const since = [...ev.filter(e => e.at > day), ...work.filter(w => w.at > day).map(w => ({ at: w.at, t: w.t + ' — ' + w.s }))].sort((a, b) => b.at.localeCompare(a.at));
      body =
        card(
          'Compare their profile over time',
          `Shows the claims ${nm(pid)} shares with you today, as they stood on the date you choose.`,
          `<label class="rel-pick"><span class="lbl">Compare against</span><select class="input" data-ch="relSnap" aria-label="Compare against">${pts.map(x => `<option value="${h(x.r.p.id + '|' + x.day)}" ${x === sel ? 'selected' : ''}>${x.r.past ? 'End of' : 'Start of'} ${h(String(x.r.where).replace(/<[^>]+>/g, ''))} · ${fmt(x.day)}</option>`).join('')}</select></label>` +
            `<div class="vote-rule">${['New since', 'Updated', 'Unchanged', 'Date not recorded'].map(s => `<div><span class="cap">${s}</span><b>${n(s)}</b></div>`).join('')}</div>` +
            table(
              ['Field', 'On ' + fmt(day), 'Now', 'Change'],
              cmp.map(x => [h(x.c.field), !x.then ? '<span class="cap">Not on record yet</span>' : x.then.undated ? '<span class="cap">Unknown — no date on record</span>' : h(x.then.value), h(x.c.value) + ' ' + pill(x.c.prov, 'p-grey'), pill(x.st, ST[x.st])]),
              'No shared claims to compare.',
            ),
        ) +
        '<div class="section-gap"></div>' +
        card(
          'Since ' + fmt(day),
          'Shared claim changes and released work after this date.',
          since.length ? `<ol class="pf-hist">${since.map(e => `<li><div class="lt"><b>${h(e.t)}</b><p class="cap">${fmt(e.at)}</p></div></li>`).join('')}</ol>` : '<p class="cap">Nothing recorded since then.</p>',
        ) +
        `<p class="cap board-n">${ic('info', 13)} Built from dated claim records and recorded corrections, not from memory or inference. Claims they have since removed or no longer share with you are not shown for any date. A claim with no date is listed as unknown rather than assumed to be old.</p>`;
    }
  }
  return (
    crumbsHtml(crumbs) +
    `<header class="shead-main pf-head"><span class="av lg pf-av" aria-hidden="true">${ini(pid)}</span><div class="shead-t"><p class="shead-kind">Collaborator profile</p><div class="row wrap pf-title"><h1 class="h1">${nm(pid)}</h1>${rel.active ? pill('Active', 'p-teal') : ''}${rel.past ? pill('Past', 'p-grey') : ''}</div><div class="shead-meta">${[relRoleHere(pid), relOrg(pid), ctxName(ctxId())].filter(Boolean).map(x => `<span>${h(x)}</span>`).join('')}<span>${cl.length} shared claim${cl.length === 1 ? '' : 's'}</span></div><p class="pf-sub">What ${nm(pid)} shares with you now. Only me and matching-only claims, Purpose Compass answers, private notes and unreleased evidence are never shown.</p></div></header>` +
    t.html +
    body
  );
});

// ---- data: dated profile claims and an archived 2024 workspace, so past collaborations and then-versus-now have
// records to read (runs from migrate(); only adds what is missing).
function relMigrate() {
  const d = (id, pid, field, value, prov, vis, at, prev) => ({ id, pid, field, value, prov, vis, state: 'Current', ver: 1 + (prev ? prev.length : 0), ...(at ? { at } : {}), ...(prev ? { prev } : {}) });
  [
    d('clr1', 'p10', 'Skills', 'Volunteer coordination', 'Self-declared', 'My collaboration contexts', '2025-11-02'),
    d('clr2', 'p10', 'Skills', 'Tree canopy assessment (i-Tree)', 'Evidence-supported', 'My collaboration contexts', '2026-07-25', [{ value: 'Tree canopy assessment (basic)', prov: 'Self-declared', at: '2026-09-30T10:00' }]),
    d('clr3', 'p10', 'Capability', 'Survey data cleaning', 'Evidence-supported', 'My collaboration contexts', '2026-09-28'),
    d('clr4', 'p10', 'Languages', 'English, Polish', 'Self-declared', 'My collaboration contexts', '2024-01-10'),
    d('clr5', 'p10', 'Interests', 'Water, tree canopy', 'Self-declared', 'My collaboration contexts'),
    d('clr6', 'p10', 'Availability', 'Weekends', 'Self-declared', 'Matching/pathway roles only', '2026-07-01'),
    d('clr7', 'p10', 'Constraints', 'Exams in December', 'Self-declared', 'Only me', '2026-09-01'),
    d('clr11', 'p4', 'Skills', 'GIS mapping (QGIS)', 'Self-declared', 'My collaboration contexts', '2022-06-01', [{ value: 'GIS mapping (ArcGIS Online)', prov: 'Self-declared', at: '2025-04-10T09:00' }]),
    d('clr12', 'p4', 'Experience', 'Flood-risk layer for the Riverside flood-risk map pilot', 'Activity-derived', 'My collaboration contexts', '2024-11-29'),
    d('clr13', 'p4', 'Capability', 'Low-cost sensor network deployment', 'Evidence-supported', 'Authorised discovery', '2025-09-12'),
    d('clr14', 'p4', 'Skills', 'Python geospatial analysis (GeoPandas)', 'Self-declared', 'My collaboration contexts', '2026-02-14'),
    d('clr15', 'p4', 'Languages', 'English, Korean', 'Self-declared', 'My collaboration contexts', '2022-06-01'),
    d('clr16', 'p4', 'Interests', 'Urban heat, flood resilience', 'Self-declared', 'My collaboration contexts'),
    d('clr17', 'p4', 'Availability', 'Two days a month for community projects', 'Self-declared', 'Matching/pathway roles only', '2026-01-05'),
    d('clr21', 'p2', 'Skills', 'Participatory facilitation', 'Reviewer-verified', 'My collaboration contexts', '2019-09-01'),
    d('clr22', 'p2', 'Experience', 'Facilitated 14 community Circles', 'Activity-derived', 'My collaboration contexts', '2023-01-15', [{ value: 'Facilitated 6 community Circles', prov: 'Activity-derived', at: '2025-01-20T09:00' }, { value: 'Facilitated 9 community Circles', prov: 'Activity-derived', at: '2026-09-01T09:00' }]),
    d('clr23', 'p2', 'Knowledge', 'Urban climate adaptation', 'Self-declared', 'My collaboration contexts', '2021-03-01'),
    d('clr24', 'p2', 'Capability', 'Evidence review (E0–E4)', 'Reviewer-verified', 'My collaboration contexts', '2025-10-01'),
  ].forEach(c => !byId('claims', c.id) && S.claims.push(c));
  const ci2 = byId('circles', 'ci2');
  if (ci2 && !ci2.started) Object.assign(ci2, { started: '2026-07-03', ended: '2026-08-20' });
  if (byId('rooms', 'ar0')) return;
  const tk = (id, key, t, owner, at) => ({ id, key, t, owner, due: at, status: 'Done', prio: 'Medium', desc: '', by: 'p10', log: [{ at: at + 'T17:00', by: owner, t: 'Moved to Done' }] });
  S.rooms.push({
    id: 'ar0',
    ctx: 'c1',
    name: 'Riverside flood-risk map pilot',
    purpose: 'Map flood-prone streets along the Riverside corridor with residents.',
    charter: 'Walk 30 streets with residents, build a flood-risk layer and share a simple map with the residents’ association.',
    outcome: 'A flood-risk map residents can use when asking the council for drainage work.',
    lead: 'p10',
    origin: { type: 'Institutional project' },
    related: [],
    state: 'Archived',
    started: '2024-03-04',
    ended: '2024-11-29',
    flags: [],
    members: [
      { pid: 'p10', role: 'Project owner', status: 'Active' },
      { pid: 'p4', role: 'Collaborator', status: 'Active', label: 'GreenGrid' },
      { pid: 'p5', role: 'Member', status: 'Active' },
      { pid: 'p2', role: 'Facilitator', status: 'Active' },
    ],
    joinReqs: [],
    tasks: [tk('tk01', 1, 'Build the flood-risk GIS layer', 'p4', '2024-09-30'), tk('tk02', 2, 'Run resident walk-alongs on 30 streets', 'p10', '2024-07-12'), tk('tk03', 3, 'Brief and schedule volunteers', 'p5', '2024-04-20'), tk('tk04', 4, 'Draft the residents’ summary', 'p2', '2024-11-15')],
    milestones: [
      { id: 'ms01', t: 'Street walk-alongs complete', due: '2024-07-15', status: 'Achieved', evs: [] },
      { id: 'ms02', t: 'Flood-risk map shared with residents', due: '2024-11-20', status: 'Achieved', evs: [] },
    ],
    decisions: [],
    risks: [],
    deps: [],
    resources: [],
    wins: [{ t: 'Flood-risk map adopted by the Riverside residents’ association', status: 'Approved', release: 'Programme', at: '2024-11-20' }],
    changes: [],
    contribs: [],
    chat: [],
  });
}

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
