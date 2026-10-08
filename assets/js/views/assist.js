// ---------- NOTIFICATIONS DROPDOWN and ASK PHOENIX ASSISTANT ----------
// Both open over the current screen. Notifications anchor to the bell; Ask PHOENIX is a docked assistant
// that stays open while you move around. The AI rules (consent, availability, quota, refusals, audit) live
// in F.ask in profile.js and are unchanged; this file only presents them as a conversation.
UI.panel = UI.panel || null;
UI.notifF = UI.notifF || 'all';

function closePanel() {
  const was = UI.panel;
  UI.panel = null;
  render();
  const t = document.querySelector(was === 'ask' ? '[data-a="askToggle"]' : was === 'user' ? '[data-a="userToggle"]' : '[data-a="notifToggle"]');
  if (t) t.focus();
}
A.closePanel = closePanel;

// ---- notifications
const notifDay = d => (d === today() ? 'Today' : d === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? 'Yesterday' : 'Earlier');
function notifMenu() {
  const ns = S.notifs.filter(n => n.pid === myId());
  const un = ns.filter(n => !n.read).length;
  const list = UI.notifF === 'unread' ? ns.filter(n => !n.read) : ns;
  let lastGroup = '';
  const rows = list
    .map(n => {
      const g = notifDay(n.at);
      const head = g !== lastGroup ? `<div class="ngroup">${g}</div>` : '';
      lastGroup = g;
      return `${head}<button type="button" class="nitem ${n.read ? '' : 'unread'}" data-a="read" data-id="${n.id}"><span class="ndot2" aria-hidden="true"></span><span class="nitem-b"><span class="nt">${h(n.t)}</span><span class="cap">${fmt(n.at)}</span></span>${n.read ? '' : '<span class="sr">Unread</span>'}</button>`;
    })
    .join('');
  const f = (v, l, c) => `<button type="button" class="${UI.notifF === v ? 'on' : ''}" data-a="notifFilter" data-v="${v}" aria-pressed="${UI.notifF === v}">${l}<span class="cnt">${c}</span></button>`;
  return `<div class="nmenu" id="notif-menu" role="dialog" aria-label="Notifications">
  <div class="nmenu-h"><b>Notifications</b>${un ? B(ic('check', 14) + 'Mark all as read', 'readAll', {}, 'btn-g btn-sm') : ''}</div>
  <div class="nmenu-tabs seg" role="group" aria-label="Show">${f('all', 'All', ns.length)}${f('unread', 'Unread', un)}</div>
  <div class="nmenu-list">${rows || `<div class="nmenu-empty">${empty('bell', UI.notifF === 'unread' ? 'You are all caught up' : 'No notifications yet', UI.notifF === 'unread' ? 'Nothing unread.' : 'Activity in your Circles, reviews, approvals and payments appears here.')}</div>`}</div>
  <div class="nmenu-foot">Invitations, approvals and payment changes also go by email.</div></div>`;
}
A.notifToggle = () => {
  UI.panel = UI.panel === 'notif' ? null : 'notif';
  render();
  if (UI.panel === 'notif') setTimeout(() => (document.querySelector('.nmenu .nitem') || document.querySelector('.nmenu button'))?.focus(), 0);
};
A.notifFilter = d => {
  UI.notifF = d.v;
  render();
};
A.readAll = () => {
  S.notifs.filter(n => n.pid === myId()).forEach(n => (n.read = true));
  ok();
};
document.addEventListener('mousedown', e => {
  if (UI.panel === 'notif' && !(e.target.closest && e.target.closest('.nwrap'))) {
    UI.panel = null;
    render();
  }
});

// ---- account dropdown (anchored to the avatar): who is signed in, View profile, Log out
function userMenu() {
  const a = asg(),
    c = ctx();
  return `<div class="umenu" id="user-menu" role="menu" aria-label="Account">
  <div class="umenu-h"><span class="av">${ini(myId())}</span><div class="umenu-id"><b>${h(me().name)}</b><span class="cap umenu-mail">${h(me().email)}</span><span class="cap">${h(ROLE[a.role] || a.role)}${c ? ' · ' + h(c.name) : ''}</span></div></div>
  <div class="umenu-theme"><span class="cap">Theme</span><div class="seg" role="group" aria-label="Theme">${['light', 'dark', 'system'].map(t => `<button type="button" data-a="setTheme" data-v="${t}" aria-pressed="${(UI.theme || 'light') === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
  <div class="umenu-list"><button type="button" role="menuitem" class="umenu-i${UI.route === 'profile' ? ' on' : ''}" data-a="userGo" data-r="profile">${ic('user', 18)}<span>View profile</span></button>${role() !== 'T' ? `<button type="button" role="menuitem" class="umenu-i${UI.route === 'privacy' ? ' on' : ''}" data-a="userGo" data-r="privacy">${ic('shield', 18)}<span>Privacy & agreements</span></button>` : ''}<button type="button" role="menuitem" class="umenu-i out" data-a="logout">${ic('logout', 18)}<span>Log out</span></button></div></div>`;
}
A.userToggle = () => {
  UI.panel = UI.panel === 'user' ? null : 'user';
  render();
  if (UI.panel === 'user') setTimeout(() => document.querySelector('.umenu .umenu-i')?.focus(), 0);
};
A.userGo = d => {
  UI.panel = null;
  go(d.r);
};
document.addEventListener('mousedown', e => {
  if (UI.panel === 'user' && !(e.target.closest && e.target.closest('.uwrap'))) {
    UI.panel = null;
    render();
  }
});
// arrow keys move between the items
document.addEventListener('keydown', e => {
  if (UI.panel !== 'user' || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
  const its = [...document.querySelectorAll('.umenu .umenu-i')];
  if (!its.length) return;
  e.preventDefault();
  const i = its.indexOf(document.activeElement);
  its[(i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus();
});

// ---- Ask PHOENIX
const ASK_SUGGEST = [
  'What should I do next to reach my milestone?',
  'Explain the E0–E4 evidence levels',
  'What evidence is missing for my milestone?',
];
A.askToggle = () => {
  UI.panel = UI.panel === 'ask' ? null : 'ask';
  UI._askFocus = UI.panel === 'ask';
  render();
};
A.askPreset = d => {
  UI.pre = { askQ: d.q };
  UI.panel = 'ask';
  UI._askFocus = true;
  render();
};
// Keep the rules in F.ask; show the question straight away and a short "thinking" state before the answer.
const askCore = F.ask;
F.ask = d => {
  const q = (d.q || '').trim();
  if (!q || UI.askPending) return;
  UI.askPending = q;
  UI.pre = null;
  render();
  setTimeout(() => {
    UI.askPending = null;
    askCore({ ...d, q });
    UI._askFocus = true;
    render();
  }, 650);
};
const uncTag = u => {
  const c = /^low/i.test(u) ? 'p-green' : /^mod/i.test(u) ? 'p-amber' : /^high/i.test(u) ? 'p-red' : 'p-grey';
  return pill('Uncertainty: ' + u, c);
};
function askDrawer() {
  if (UI.panel !== 'ask' || !S.session || !can('ai')) return '';
  const hist = (S.askHist || []).filter(x => x.pid === myId());
  const okAI = consent(myId(), 'ai') === 'Granted';
  const up = S.settings.aiAvailable;
  const live = okAI && up;
  const bubbles = hist
    .map(
      x =>
        `<div class="amsg me"><div class="abub">${h(x.q)}</div></div><div class="amsg ai"><span class="aav" aria-hidden="true">${ic('sparkle', 14)}</span><div class="abub ${x.refused ? 'refused' : ''}">${x.refused ? `<div class="arefuse">${ic('lock', 13)}Request refused</div>` : `<div class="abub-tag">${aiTag()}</div>`}<p>${h(x.a)}</p>${x.src ? `<div class="ameta"><span class="cap">Sources</span>${x.src.split(/;\s*/).map(s => `<span class="asrc">${ic('file', 12)}${h(s)}</span>`).join('')}</div><div class="ameta">${uncTag(x.unc)}</div>` : ''}</div></div>`,
    )
    .join('');
  const pending = UI.askPending
    ? `<div class="amsg me"><div class="abub">${h(UI.askPending)}</div></div><div class="amsg ai"><span class="aav" aria-hidden="true">${ic('sparkle', 14)}</span><div class="abub typing" aria-label="PHOENIX is answering"><i></i><i></i><i></i></div></div>`
    : '';
  const intro = !hist.length && !UI.askPending
    ? `<div class="aintro"><b>Ask about your programme</b><p>Answers come only from approved PHOENIX sources and show where they came from. Questions about other people are refused.</p><div class="asugg">${ASK_SUGGEST.map(q => `<button type="button" class="asg" data-a="askPreset" data-q="${h(q)}" ${live ? '' : 'disabled'}>${h(q)}</button>`).join('')}</div></div>`
    : '';
  const notice = !up
    ? banner('warn', 'AI is temporarily unavailable', 'Your question cannot be processed right now. Everything else in PHOENIX keeps working.')
    : !okAI
      ? banner('info', 'AI processing is off for you', `Turn it on in ${L('Privacy & consent', 'privacy')} to use Ask PHOENIX. Declining never blocks anything else.`)
      : '';
  return `<aside class="assist" id="assist" role="complementary" aria-label="Ask PHOENIX">
  <header class="assist-h"><span class="aav big" aria-hidden="true">${ic('sparkle', 16)}</span><div class="assist-ht"><b>Ask PHOENIX</b><span class="cap">Private to you · nothing changes on your record</span></div><button type="button" class="iconbtn" data-a="closePanel" aria-label="Close Ask PHOENIX">${ic('x')}</button></header>
  <div class="assist-body" role="log" aria-live="polite">${intro}${bubbles}${pending}</div>
  ${notice ? `<div class="assist-note">${notice}</div>` : ''}
  <form data-f="ask" class="assist-comp" novalidate><div class="acomp"><textarea name="q" rows="1" class="ask-ta" placeholder="${live ? 'Ask about your pathway, evidence, Circles…' : 'Ask PHOENIX is unavailable'}" aria-label="Your question" ${live && !UI.askPending ? '' : 'disabled'}>${h(UI.pre?.askQ || '')}</textarea><button class="btn btn-p asend" type="submit" aria-label="Send question" ${live && !UI.askPending ? '' : 'disabled'}>${ic('send', 16)}</button></div><div class="ahelp">Enter to send · Shift+Enter for a new line · ${aiTag('AI · Class A private assist')}</div></form></aside>`;
}
// The assistant lives outside the page container so it stays fixed to the window while the page scrolls.
AFTER.push(() => {
  let root = document.getElementById('assist-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'assist-root';
    document.body.appendChild(root);
  }
  const html = S && S.session ? askDrawer() : '';
  root.innerHTML = html;
  document.body.classList.toggle('assist-open', !!html);
  if (!html) return;
  const body = root.querySelector('.assist-body');
  if (body) body.scrollTop = body.scrollHeight;
  const ta = root.querySelector('.ask-ta');
  if (ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    if (UI._askFocus && !ta.disabled) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }
  UI._askFocus = false;
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('ask-ta') && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    t.form.requestSubmit();
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('ask-ta')) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
    UI.pre = { askQ: t.value };
  }
});
