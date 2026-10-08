// ---------- MESSAGES: real-time group chat for Circles, Rope Teams and Action Rooms (D-04, E04, OI-05) ----------
// One conversation per space. Members only; moderation follows the person's role in that space.
UI.chat = UI.chat || {};
const CHAT_KINDS = {
  circles: 'Circle',
  ropes: 'Rope Team',
  dms: 'Direct message',
  get rooms() {
    return WL();
  },
};
const CHAT_ROUTE = { circles: 'circle', ropes: 'rope', rooms: 'room' };
const CHAT_IC = { circles: 'users', ropes: 'route', rooms: 'room', dms: 'message' };
const IMG_RE = /\.(png|jpe?g|gif|webp|heic)$/i;
const chatSpaces = (pid = myId()) => [
  ...S.circles.filter(c => inCtx(c) && memberOf(c, pid)).map(o => ({ kind: 'circles', o })),
  ...S.ropes.filter(r => inCtx(r) && memberOf(r, pid)).map(o => ({ kind: 'ropes', o })),
  ...S.rooms.filter(r => inCtx(r) && memberOf(r, pid) && r.state !== 'Draft').map(o => ({ kind: 'rooms', o })),
  ...(S.dms || []).filter(r => memberOf(r, pid)).map(o => ({ kind: 'dms', o })),
];
const hasChats = () => !!S && !!S.session && chatSpaces().length > 0;
const readMark = (id, pid = myId()) => ((S.chatRead || {})[pid] || {})[id] || '';
const unreadIn = (o, pid = myId()) => {
  const r = readMark(o.id, pid);
  return (o.chat || []).filter(m => !m.sys && m.by !== pid && m.at > r).length;
};
const unreadTotal = () => chatSpaces().reduce((a, x) => a + unreadIn(x.o), 0);
function markRead(o) {
  const last = (o.chat || []).slice(-1)[0];
  if (!last) return;
  S.chatRead = S.chatRead || {};
  const mine = (S.chatRead[myId()] = S.chatRead[myId()] || {});
  if ((mine[o.id] || '') < last.at) {
    mine[o.id] = last.at;
    S.notifs.filter(n => n.pid === myId() && !n.read && n.chat === o.id).forEach(n => (n.read = true));
    save();
  }
}
function sysMsg(o, t) {
  if (!o || !o.chat) return;
  o.chat.push({ id: uid('m'), sys: true, at: now(), t });
}
// Who may post, and why not when they cannot.
function chatAccess(kind, o) {
  const mem = memberOf(o);
  const mod = sCan(kind, o, 'moderate') || (kind === 'circles' && spaceAdmin('circles', o));
  let ro = '';
  if (!mem) ro = 'View only. You are not a member of this ' + CHAT_KINDS[kind] + '.';
  else if (!sCan(kind, o, 'post')) ro = 'You are an Observer here. You can read the conversation but not post.';
  else if (o.state === 'Paused/Repair') ro = 'This Circle is paused for repair. Members can read but not post.';
  else if (o.state !== 'Active') ro = 'This ' + CHAT_KINDS[kind] + ' is ' + o.state.toLowerCase() + '. The conversation is read-only.';
  return { mem, mod, ro };
}
const tm = s => {
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d) ? '' : d.toTimeString().slice(0, 5);
};
function dayLabel(s) {
  const d = s.slice(0, 10);
  const t = today();
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (d === t) return 'Today';
  if (d === y) return 'Yesterday';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function shortWhen(s) {
  if (!s) return '';
  const d = s.slice(0, 10);
  if (d === today()) return tm(s);
  const diff = (new Date(today()) - new Date(d)) / 864e5;
  if (diff < 7) return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
const attOf = m => (m.att ? (typeof m.att === 'string' ? { n: m.att, mb: null } : m.att) : null);
function attCard(a, mine) {
  const ext = (a.n.split('.').pop() || '').toUpperCase().slice(0, 4);
  const img = IMG_RE.test(a.n);
  return `<button type="button" class="matt ${img ? 'img' : ''} ${mine ? 'mine' : ''}" data-a="fakeDl" data-n="${h(a.n)}" title="Download ${h(a.n)}">${img ? `<span class="mthumb">${ic('image', 22)}</span>` : `<span class="mext">${h(ext || 'FILE')}</span>`}<span class="col" style="min-width:0;align-items:flex-start"><span class="mattn">${h(a.n)}</span><span class="mattm">${a.mb != null ? a.mb + ' MB' : 'File'} · ${img ? 'Image' : 'Document'}</span></span>${ic('download', 16)}</button>`;
}
function chatPreview(o) {
  const m = (o.chat || []).filter(x => !x.hidden).slice(-1)[0];
  if (!m) return 'No messages yet';
  if (m.sys) return h(m.t);
  const who = m.by === myId() ? 'You' : h(P(m.by).display);
  const a = attOf(m);
  return `${who}: ${a && !m.t ? ic(IMG_RE.test(a.n) ? 'image' : 'clip', 12) + ' ' + h(a.n) : h(m.t)}`;
}
// ---- conversation list (left pane)
function convList(sel) {
  const f = UI.chat.filter || 'all';
  const q = (UI.chat.q || '').toLowerCase();
  let list = chatSpaces()
    .map(x => ({ ...x, last: ((x.o.chat || []).slice(-1)[0] || {}).at || '', un: unreadIn(x.o) }))
    .filter(x => f === 'all' || (f === 'unread' ? x.un > 0 : x.kind === f))
    .filter(x => !q || (x.o.name + ' ' + (x.o.chat || []).map(m => m.t).join(' ')).toLowerCase().includes(q));
  list.sort((a, b) => b.last.localeCompare(a.last));
  const chip = (k, l) =>
    `<button type="button" class="fchip ${f === k ? 'on' : ''}" data-a="chatFilter" data-v="${k}">${l}</button>`;
  return `<div class="mlist-h"><h1 class="h2">Messages</h1><p class="cap">Circles, Rope Teams and ${WL()}s you belong to</p><input class="input msearch" placeholder="Search conversations" value="${h(UI.chat.q || '')}" data-ch="chatSearch" aria-label="Search conversations"><div class="row wrap" style="gap:6px">${chip('all', 'All')}${chip('unread', 'Unread')}${chip('circles', 'Circles')}${chip('ropes', 'Rope Teams')}${chip('rooms', WL() + 's')}${(S.dms || []).some(x => memberOf(x)) ? chip('dms', 'Direct') : ''}</div></div><div class="mlist" role="list">${
    list
      .map(({ kind, o, last, un }) => {
        const on = sel && sel.o.id === o.id;
        return `<button type="button" role="listitem" class="mconv ${on ? 'on' : ''} ${un ? 'un' : ''}" data-a="chatOpen" data-id="${o.id}" data-k="${kind}" ${on ? 'aria-current="true"' : ''}><span class="mav ${kind === 'circles' ? 'c' : kind === 'rooms' ? 'a' : kind === 'dms' ? 'd' : 'r'}">${ic(CHAT_IC[kind], 18)}</span><span class="mconv-b"><span class="row" style="gap:8px;justify-content:space-between"><b class="mname">${h(o.name)}</b><span class="mtime">${shortWhen(last)}</span></span><span class="row" style="gap:8px;justify-content:space-between"><span class="mprev">${chatPreview(o)}</span>${un ? `<span class="mbadge" aria-label="${un} unread">${un}</span>` : o.state !== 'Active' ? `<span class="mstate">${h(o.state)}</span>` : ''}</span></span></button>`;
      })
      .join('') || `<div style="padding:24px 8px">${empty('message', f === 'unread' ? 'No unread messages' : 'No conversations', f === 'unread' ? 'You are all caught up.' : 'You join a conversation when you become a member of a Circle, Rope Team or ' + WL() + '.')}</div>`
  }</div>`;
}
// ---- conversation thread (right pane / embedded)
function chatThread(kind, o, opts = {}) {
  const acc = chatAccess(kind, o);
  const qOnly = UI.chat.qOnly === o.id;
  const msgs = (o.chat || []).filter(m => !qOnly || (m.q && !m.ans));
  const openQ = (o.chat || []).filter(m => m.q && !m.ans && !m.hidden).length;
  const members = o.members.filter(m => !m.status || m.status === 'Active');
  const byId_ = Object.fromEntries((o.chat || []).filter(m => m.id).map(m => [m.id, m]));
  if (acc.mem) markRead(o);
  let lastDay = '',
    prev = null;
  const rows = msgs
    .map(m => {
      let out = '';
      const day = m.at.slice(0, 10);
      if (day !== lastDay) {
        out += `<div class="mday"><span>${dayLabel(m.at)}</span></div>`;
        lastDay = day;
        prev = null;
      }
      if (m.sys) {
        prev = null;
        return out + `<div class="msys">${ic('info', 13)}<span>${h(m.t)}</span><span class="mtime">${tm(m.at)}</span></div>`;
      }
      const mine = m.by === myId();
      const grouped = prev && prev.by === m.by && new Date(m.at) - new Date(prev.at) < 10 * 60000;
      prev = m;
      const a = attOf(m);
      const rp = m.reply && byId_[m.reply];
      const seen = mine
        ? members.filter(x => x.pid !== myId() && readMark(o.id, x.pid) >= m.at).map(x => P(x.pid).display)
        : [];
      const allSeen = mine && seen.length && seen.length >= members.filter(x => x.pid !== myId()).length;
      const tools = acc.mem && !acc.ro && !m.hidden;
      return (
        out +
        `<div class="mrow ${mine ? 'mine' : ''} ${grouped ? 'grp' : ''}" id="msg-${m.id}">${!mine ? (grouped ? '<span class="mav-sp"></span>' : `<span class="av" title="${nm(m.by)}">${ini(m.by)}</span>`) : ''}<div class="mcol">${!mine && !grouped ? `<div class="mwho">${nm(m.by)}<span class="cap"> · ${h(roleIn(o, m.by))}</span></div>` : ''}<div class="mbub ${m.hidden ? 'hid' : ''} ${m.q && !m.hidden ? 'q' : ''}">${rp ? `<a href="#msg-${rp.id}" class="mquote"><b>${rp.by ? nm(rp.by) : 'System'}</b><span>${h((rp.t || attOf(rp)?.n || '').slice(0, 90))}</span></a>` : ''}${m.q && !m.hidden ? `<div class="mqtag">${ic('question', 13)}${m.ans ? 'Question · answered' : 'Open question'}</div>` : ''}${m.hidden ? `<i>${h(m.t)}</i>` : m.t ? `<div class="mtext">${h(m.t).replace(/\n/g, '<br>')}</div>` : ''}${a && !m.hidden ? attCard(a, mine) : ''}<div class="mmeta">${tm(m.at)}${mine ? `<span class="mtick ${allSeen ? 'seen' : ''}" title="${seen.length ? 'Seen by ' + h(seen.join(', ')) : 'Sent'}">${ic(seen.length ? 'checks' : 'check', 14)}</span>` : ''}</div></div></div>${tools ? `<div class="mtools">${B(ic('reply', 15), 'msgReply', { c: o.id, k: kind, id: m.id }, 'mtool', 'aria-label="Reply" title="Reply"')}${m.q && !m.ans && (mine || acc.mod) ? B(ic('check', 15), 'msgAns', { c: o.id, k: kind, id: m.id }, 'mtool', 'aria-label="Mark answered" title="Mark answered"') : ''}${acc.mod && !mine ? B(ic('eye', 15), 'msgHide', { c: o.id, k: kind, id: m.id }, 'mtool', 'aria-label="Hide message" title="Hide message (moderation)"') : ''}</div>` : ''}</div>`
      );
    })
    .join('');
  const newest = (o.chat || []).filter(m => !m.sys).slice(-1)[0];
  const lastMine = newest && newest.by === myId() ? newest : null;
  const lastSeen = lastMine
    ? members.filter(x => x.pid !== myId() && readMark(o.id, x.pid) >= lastMine.at).map(x => P(x.pid).display)
    : [];
  const reply = UI.chat.reply && UI.chat.reply.c === o.id ? byId_[UI.chat.reply.id] : null;
  const draft = (UI.chat.drafts || {})[o.id] || '';
  const asQ = UI.chat.asQ === o.id;
  const route_ = CHAT_ROUTE[kind];
  const avatars = members
    .slice(0, 4)
    .map(m => `<span class="av" title="${nm(m.pid)}">${ini(m.pid)}</span>`)
    .join('');
  return `<section class="mthread ${opts.embedded ? 'emb' : ''}" aria-label="Conversation: ${h(o.name)}">
  <header class="mth-h">${!opts.embedded ? `<button type="button" class="iconbtn mback-btn" data-a="chatBack" aria-label="Back to conversations">${ic('chevl')}</button>` : ''}<span class="mav ${kind === 'circles' ? 'c' : kind === 'rooms' ? 'a' : 'r'}">${ic(CHAT_IC[kind], 18)}</span><div class="col" style="min-width:0;flex:1"><button type="button" class="mname mname-btn" data-a="chatMembers" data-c="${o.id}" data-k="${kind}" aria-haspopup="dialog" title="Show members">${h(o.name)}</button><span class="cap">${CHAT_KINDS[kind]} · ${members.length} members${o.state !== 'Active' ? ' · ' + h(o.state) : ''}</span></div><span class="mavs hide-sm">${avatars}</span>${openQ || qOnly ? `<button type="button" class="fchip ${qOnly ? 'on' : ''}" data-a="chatQOnly" data-id="${o.id}" title="Show open questions only">${ic('question', 14)}${openQ} open</button>` : ''}${acc.mem && openQ ? B(ic('sparkle', 14), 'chatQSum', { c: o.id, k: kind }, 'iconbtn mqs', 'aria-label="Summarise unresolved questions with AI" title="Summarise unresolved questions (AI, private)"') : ''}${!opts.embedded && route_ ? L(ic('arrow', 14) + '<span class="hide-sm">Open ' + CHAT_KINDS[kind] + '</span>', route_, { id: o.id }, 'btn btn-s btn-sm') : ''}${!opts.embedded && kind === 'dms' && o.project && byId('projects', o.project) && can('projects') && byId('projects', o.project).owner === myId() ? L(ic('arrow', 14) + '<span class="hide-sm">Open project</span>', 'project', { id: o.project }, 'btn btn-s btn-sm') : ''}</header>
  <div class="msgs" data-scroll="${o.id}" role="log" aria-live="polite">${rows || `<div class="mempty">${empty('message', qOnly ? 'No open questions' : 'No messages yet', qOnly ? 'Every question here has been answered.' : 'Start the conversation. Messages are visible to members of this ' + CHAT_KINDS[kind] + ' only.')}</div>`}${lastMine && lastSeen.length ? `<div class="mseen">Seen by ${h(lastSeen.join(', '))}</div>` : ''}</div>
  ${
    acc.ro
      ? `<div class="mro">${ic('lock', 16)}<span>${h(acc.ro)}</span></div>`
      : `<form data-f="chat" class="composer ${asQ ? 'asq' : ''}" novalidate><input type="hidden" name="c" value="${o.id}"><input type="hidden" name="kind" value="${kind}">${reply ? `<div class="mreplying">${ic('reply', 14)}<div class="col" style="min-width:0;flex:1"><b>Replying to ${reply.by ? nm(reply.by) : 'system'}</b><span class="cap mprev">${h((reply.t || attOf(reply)?.n || '').slice(0, 90))}</span></div>${B(ic('x', 14), 'msgReplyX', {}, 'mtool', 'aria-label="Cancel reply"')}</div>` : ''}<div class="mpend" hidden>${ic('clip', 14)}<span class="fname"></span>${B(ic('x', 14), 'clearFile', {}, 'mtool', 'aria-label="Remove attachment"')}</div>
  <div class="mcomp"><label class="iconbtn mattach" title="Attach a file (up to ${S.settings.maxFileMB} MB)">${ic('clip')}<input type="file" name="f" data-chatfile="1" aria-label="Attach a file" class="sr"></label><textarea name="t" rows="1" class="mta" placeholder="Write a message" aria-label="Message" data-draft="${o.id}">${h(draft)}</textarea><button type="button" class="iconbtn mqbtn ${asQ ? 'on' : ''}" data-a="chatAsQ" data-id="${o.id}" aria-pressed="${asQ}" title="Send as a question">${ic('question')}</button><button class="btn btn-p msend" type="submit" aria-label="Send message" title="Send (Enter)">${ic('send', 18)}</button></div>
  <div class="mhelp">${asQ ? '<b>Sending as a question.</b> ' : ''}Enter to send · Shift+Enter for a new line · files up to ${S.settings.maxFileMB} MB, video by link · members only · ${assumed('OI-05 retention and moderation')}</div></form>`
  }</section>`;
}
const roleIn = (o, pid) => {
  if ((S.dms || []).includes(o)) return roleInRaw(o, pid);
  const kind = S.circles.includes(o) ? 'circles' : S.ropes.includes(o) ? 'ropes' : 'rooms';
  return roleLabel(spaceRole(kind, o, pid) || roleInRaw(o, pid));
};
const roleInRaw = (o, pid) => (o.members.find(m => m.pid === pid) || {}).role || ROLE[(S.assign.find(a => a.pid === pid && a.ctx === o.ctx) || {}).role] || '';
// ---- the Messages hub
route('messages', 'any', () => {
  const sp = chatSpaces();
  if (UI.p.c && UI.p.k) {
    UI.chat.open = { id: UI.p.c, k: UI.p.k };
    delete UI.p.c;
  }
  const sel = UI.chat.open && sp.find(x => x.o.id === UI.chat.open.id);
  if (sel) markRead(sel.o);
  return `<div class="msgshell ${UI.chat.open && sel ? 'has-sel' : ''}"><aside class="mside">${convList(sel)}</aside><div class="mmain">${sel ? chatThread(sel.kind, sel.o) : `<div class="mnone">${empty('message', sp.length ? 'Choose a conversation' : 'No conversations yet', sp.length ? 'Real-time chat with your Circles, Rope Teams and ' + WL() + 's. Messages, files, questions and coordination in one place.' : 'You join a conversation when you become a member of a Circle, Rope Team or ' + WL() + '.')}</div>`}</div></div>`;
});
// Clicking a conversation's name lists everyone in it, with their role in that space.
A.chatMembers = d => {
  const o = byId(d.k, d.c);
  if (!o) return;
  const ms = o.members.filter(m => !m.status || ['Active', 'Invited'].includes(m.status));
  modal(
    h(o.name) + ' · members',
    `<p class="cap" style="margin-bottom:10px">${CHAT_KINDS[d.k]} · ${ms.filter(m => !m.status || m.status === 'Active').length} active member${ms.length === 1 ? '' : 's'}</p><div class="col" style="gap:2px">${ms
      .map(m => `<div class="lrow"><span class="av">${ini(m.pid)}</span><div class="lt"><b>${nm(m.pid)}${m.pid === myId() ? ' <span class="cap">(you)</span>' : ''}</b><p class="cap">${h(roleIn(o, m.pid) || '—')}${m.label ? ' · ' + h(m.label) : ''}</p></div>${m.status && m.status !== 'Active' ? pill(m.status) : ''}</div>`)
      .join('')}</div>`,
  );
};
// A two-person conversation between a sponsor and a project owner, started from either side.
function dmWith(pid, projectId) {
  const ps = [myId(), pid].sort();
  let o = (S.dms || []).find(x => x.members.map(m => m.pid).sort().join() === ps.join() && x.project === projectId);
  if (!o) {
    const pr = byId('projects', projectId);
    const sp = role() === 'S' ? myId() : pid;
    const ow = role() === 'S' ? pid : myId();
    o = {
      id: uid('dm'),
      ctx: (pr && pr.ctx) || ctxId(),
      project: projectId || null,
      name: P(sp).name + ' · ' + (pr ? pr.title : 'project'),
      state: 'Active',
      members: [
        { pid: sp, role: 'Sponsor', status: 'Active', label: (S.orgs.find(x => x.id === P(sp).org) || {}).name || '' },
        { pid: ow, role: 'Project owner', status: 'Active' },
      ],
      chat: [],
    };
    (S.dms = S.dms || []).push(o);
    sysMsg(o, 'Conversation started by ' + me().name);
    audit('Direct conversation started', o.id, (pr ? pr.title : '') + ' · ' + P(pid).name);
  }
  return o;
}
A.dmOpen = d => {
  const o = dmWith(d.pid, d.project);
  save();
  go('messages', { c: o.id, k: 'dms' });
};
A.chatOpen = d => {
  UI.chat.open = { id: d.id, k: d.k };
  UI.chat.reply = null;
  UI.chat.qOnly = null;
  render();
  focusComposer();
};
A.chatBack = () => {
  UI.chat.open = null;
  render();
};
A.chatFilter = d => {
  UI.chat.filter = d.v;
  render();
};
A.chatSearch = (d, el) => {
  UI.chat.q = el.value;
  render();
};
A.chatQOnly = d => {
  UI.chat.qOnly = UI.chat.qOnly === d.id ? null : d.id;
  render();
};
A.chatAsQ = d => {
  saveDraft();
  UI.chat.asQ = UI.chat.asQ === d.id ? null : d.id;
  render();
  focusComposer();
};
A.msgReply = d => {
  saveDraft();
  UI.chat.reply = { c: d.c, id: d.id };
  render();
  focusComposer();
};
A.msgReplyX = () => {
  saveDraft();
  UI.chat.reply = null;
  render();
};
A.msgAns = d => {
  const o = byId(d.k, d.c);
  const m = o.chat.find(x => x.id === d.id);
  m.ans = true;
  audit('Chat question marked answered', o.id, m.id);
  ok();
};
A.msgHide = d => {
  const o = byId(d.k, d.c);
  const m = o.chat.find(x => x.id === d.id);
  m.hidden = true;
  m.t = 'Message hidden by ' + (spaceRole(d.k, o) === 'Facilitator' ? 'the facilitator' : 'a moderator') + '.';
  m.att = null;
  audit('Chat message moderated', o.id, m.id);
  toast('Message hidden. The action is recorded in the audit log.');
  ok();
};
A.chatQSum = d => {
  const o = byId(d.k, d.c);
  if (!S.settings.aiAvailable) return deny('AI is unavailable right now. Everything else keeps working.');
  if (consent(myId(), 'ai') !== 'Granted') return deny('AI processing consent is not granted. Turn it on in Privacy & consent.');
  const qs = o.chat.filter(m => m.q && !m.ans && !m.hidden);
  S.settings.aiUsed++;
  S.ai.push({ id: uid('aj'), by: myId(), cls: 'A', purpose: 'Summarise unresolved questions · ' + o.name, sources: 'Chat in ' + o.id, consent: 'Granted', model: S.providers.ai.name, status: 'Generated', at: today() });
  audit('AI request', myId(), 'Class A · unresolved questions');
  modal(
    'Unresolved questions',
    `<div class="col" style="gap:10px">${aiTag('AI · Class A private assist — visible only to you')}${qs.length ? `<ol class="req-list">${qs.map(m => `<li><b>${nm(m.by)}</b> asked on ${fmt(m.at.slice(0, 10))}: ${h(m.t)}</li>`).join('')}</ol>` : '<p class="muted">No unresolved questions in this conversation.</p>'}<p class="cap">Source: messages in ${h(o.name)} only. Nothing is saved to anyone’s record. Uncertainty: low — questions are those marked by members.</p></div>`,
  );
};
A.clearFile = (d, el) => {
  const f = el.closest('form');
  const i = f && f.querySelector('input[type=file]');
  if (i) i.value = '';
  const p = f && f.querySelector('.mpend');
  if (p) p.hidden = true;
};
function saveDraft() {
  const ta = document.querySelector('textarea[data-draft]');
  if (ta) (UI.chat.drafts = UI.chat.drafts || {})[ta.dataset.draft] = ta.value;
}
function focusComposer() {
  setTimeout(() => {
    const ta = document.querySelector('.composer textarea');
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, 0);
}
F.chat = (d, form) => {
  const file = form.querySelector('input[type=file]')?.files?.[0];
  const text = (d.t || '').trim();
  if (!text && !file) {
    toast('Write a message or attach a file.', 'warn');
    return render();
  }
  if (file && file.size > S.settings.maxFileMB * 1048576) {
    toast(`That file is over ${S.settings.maxFileMB} MB. Link video or large media externally instead.`, 'err');
    return render();
  }
  if (file && /\.(exe|bat|cmd|sh|msi)$/i.test(file.name)) {
    toast('This file type is not supported in chat.', 'err');
    return render();
  }
  const o = byId(d.kind, d.c);
  const m = { id: uid('m'), by: myId(), at: now(), t: text };
  if (file) m.att = { n: file.name, mb: +(file.size / 1048576).toFixed(2) };
  if (UI.chat.reply && UI.chat.reply.c === o.id) m.reply = UI.chat.reply.id;
  if (UI.chat.asQ === o.id) m.q = true;
  o.chat.push(m);
  UI.chat.reply = null;
  UI.chat.asQ = null;
  if (UI.chat.drafts) delete UI.chat.drafts[o.id];
  markRead(o);
  o.members
    .filter(x => x.pid !== myId() && (!x.status || x.status === 'Active'))
    .forEach(x => {
      const ex = S.notifs.find(n => n.pid === x.pid && !n.read && n.chat === o.id);
      if (ex) {
        ex.cnt = (ex.cnt || 1) + 1;
        ex.t = `${ex.cnt} new messages in ${o.name}`;
        ex.at = today();
      } else {
        notify(x.pid, `${me().display} in ${o.name}: ${(text || (m.att && m.att.n) || '').slice(0, 60)}`, 'messages', { c: o.id, k: d.kind });
        S.notifs[0].chat = o.id;
      }
    });
  audit('Chat message', o.id, (m.att ? 'with attachment' : '') + (m.q ? ' · question' : ''));
  ok();
  focusComposer();
};
// Composer behaviour: Enter sends, Shift+Enter adds a line, the box grows with its content.
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t.matches && t.matches('.composer textarea') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    t.form.requestSubmit();
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches && t.matches('textarea.mta')) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
    (UI.chat.drafts = UI.chat.drafts || {})[t.dataset.draft] = t.value;
  }
});
document.addEventListener('change', e => {
  const i = e.target;
  if (i.dataset && i.dataset.chatfile) {
    const f = i.closest('form');
    const p = f.querySelector('.mpend');
    const n = f.querySelector('.mpend .fname');
    if (i.files[0]) {
      n.textContent = i.files[0].name + ' · ' + (i.files[0].size / 1048576).toFixed(2) + ' MB';
      p.hidden = false;
    } else p.hidden = true;
  }
});
// Keep each conversation scrolled to the newest message after every render.
AFTER.push(el => {
  el.querySelectorAll('.msgs[data-scroll]').forEach(box => {
    box.scrollTop = box.scrollHeight;
  });
  el.querySelectorAll('textarea.mta').forEach(t => {
    if (t.value) {
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 160) + 'px';
    }
  });
});
