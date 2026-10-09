// PHOENIX design language — style guide. Specimens use the app's own helpers (B, fi, card, table, pill, banner,
// empty, tabs, dl) so what is shown is the markup the screens produce. Nothing here changes app data or behaviour.
(() => {
  // no app data is needed: the helpers used here read only UI state and the icon set
  const SG = { theme: 'light', side: 'full', seg: 'list' };
  try {
    SG.theme = localStorage.getItem('phx-sg-theme') || 'light';
  } catch (e) {}

  // ---------- identity ----------
  // The mark: an ember plume rising from a baseline, on a canopy plume-square.
  const markSvg = (s = 20) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12.6 2.8c2.9 3 4.6 6 4.6 8.8a5.2 5.2 0 0 1-10.4.2c0-2 .9-3.8 2.3-5.2.1 1.9 1 3.2 2.4 3.7-.7-2.6-.3-5.1 1.1-7.5z" fill="currentColor"/><path d="M5 20.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`;
  const brand = (sub = 'Foundation Alpha') => `<a href="#" class="brand" data-sg="none"><span class="mark">${markSvg(20)}</span><span class="wm"><b>PHOENIX</b><span>${sub}</span></span></a>`;
  const menuIc = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`;

  // ---------- shell specimen ----------
  const NAV = [
    ['', 'home', 'My PHOENIX', 'Home', 'home', 0, 1],
    ['', 'messages', 'Messages', 'Chats', 'message', 4],
    ['', 'pathway', 'Pathway', 'Pathway', 'route'],
    ['Work', 'projects', 'Projects', 'Projects', 'folder'],
    ['Work', 'circles', 'Circles', 'Circles', 'users'],
    ['Work', 'ropes', 'Rope Teams', 'Rope', 'steps'],
    ['Work', 'rooms', 'Action Rooms', 'Rooms', 'room', 2],
    ['Discover', 'opps', 'Opportunities', 'Discover', 'megaphone'],
    ['Discover', 'matches', 'Match Briefs', 'Matches', 'link'],
    ['Records', 'evidence', 'Evidence', 'Evidence', 'award'],
    ['Records', 'repo', 'Repository', 'Records', 'archive'],
    ['Records', 'harvest', 'Learning Harvests', 'Harvests', 'sparkle'],
    ['Access', 'funding', 'Funding', 'Funding', 'coin'],
  ];
  function sidebar(active = 'projects') {
    let last = null;
    const items = NAV.map(([g, id, l, sh, i, n]) => {
      const sec = g && g !== last ? `<div class="navsec"><span>${g}</span></div>` : '';
      last = g;
      const on = id === active;
      return `${sec}<a href="#" class="nav${on ? ' on' : ''}" data-tip="${h(l)}"${on ? ' aria-current="page"' : ''}>${ic(i)}<span class="t">${h(l)}</span><span class="ts">${h(sh)}</span>${n ? `<span class="ncount">${n}</span>` : ''}</a>`;
    }).join('');
    return `<aside class="side" aria-label="Main navigation"><div class="side-plate">${brand()}<div class="side-ctx"><small>Programme</small><span>Excelsior Climate Programme</span></div></div><nav class="side-nav">${items}</nav><div class="side-foot"><a href="#" class="nav" data-tip="Resources">${ic('question')}<span class="t">Resources &amp; guidance</span><span class="ts">Help</span></a><a href="#" class="nav" data-sg="side" data-tip="${SG.side === 'compact' ? 'Expand' : 'Collapse'} sidebar">${ic(SG.side === 'compact' ? 'chevr' : 'chevl')}<span class="t">Collapse sidebar</span><span class="ts">Expand</span></a></div></aside>`;
  }
  const topbar = (phone = false) =>
    `<header class="top">${phone ? `<button class="iconbtn" type="button" aria-label="Open navigation" aria-expanded="true">${menuIc}</button><span class="mbrand"><span class="mark" style="width:30px;height:30px">${markSvg(16)}</span></span>` : ''}<button class="ctx" type="button"><span class="ctxt"><b>Mary Ellis</b><small>Participant · Excelsior Climate Programme</small></span>${ic('chev', 16)}</button><div class="grow"></div>${phone ? '' : `<button type="button" class="btn btn-s btn-sm">${ic('sparkle', 16)}Ask PHOENIX</button>`}<div class="nwrap"><button class="iconbtn" type="button" aria-label="Notifications, 3 unread">${ic('bell')}<span class="badge">3</span></button></div><div class="uwrap"><button class="who" type="button"><span class="av sm">M</span>${phone ? '' : '<span>Mary</span>'}<span class="who-chev">${ic('chev', 14)}</span></button></div></header>`;
  const crumbs = list => `<ol class="crumbs" aria-label="Breadcrumb">${list.map((c, i) => (i === list.length - 1 ? `<li><span aria-current="page">${c}</span></li>` : `<li><a href="#">${c}</a></li>`)).join('')}</ol>`;
  const pageHeader = () =>
    `${crumbs(['Projects', 'Community cooling map for Ward 7'])}<div class="shead-main"><span class="tile">${ic('folder', 20)}</span><div class="shead-t"><div class="shead-kind">Project · Rope Team stage</div><div class="row wrap" style="gap:10px"><h1 class="h1">Community cooling map for Ward 7</h1>${pill('Accepted')}</div><div class="shead-meta"><span>Owner Mary Ellis</span><span>Steward Dr Asha Rao</span><span>Updated 6 Oct 2026</span></div></div><div class="shead-a">${B(ic('edit', 16) + 'Edit', 'x', {}, 'btn-s')}${B(ic('upload', 16) + 'Upload evidence', 'x', {}, 'btn-p')}</div></div>`;
  const tabsHtml = () => {
    UI.p = {};
    UI.tab.sg = UI.tab.sg || 'overview';
    return tabs('sg', [['overview', 'Overview'], ['journey', 'Journey'], ['evidence', 'Evidence', 3], ['people', 'People', 6], ['history', 'History']]).html;
  };
  const ascent = () =>
    `<ol class="ascent" aria-label="Project stages"><li class="done" style="--i:0"><span class="as-k">Circle · done</span><span class="as-n">Ward 7 Cooling Circle</span><span class="cap">Survey plan agreed</span></li><li class="cur" style="--i:1"><span class="as-k">Rope Team · current</span><span class="as-n">Ward 7 Rope Team</span><span class="cap">2 of 3 reviews</span></li><li class="todo" style="--i:2"><span class="as-k">Action Room · next</span><span class="as-n">Not created yet</span><span class="cap">Opens after final review</span></li></ol>`;
  const sampleTable = () =>
    table(
      ['Evidence', 'Type', 'Level', 'Review', 'Size', ''],
      [
        ['<b>Ward 7 heat survey results</b><div class="cap">ev1 · Mary Ellis</div>', 'Action and deliverable', pill('E2', 'p-teal'), pill('Approved'), '<span class="num">2.4 MB</span>', B('Open', 'x')],
        ['<b>Stakeholder interview notes</b><div class="cap">ev2 · Mary Ellis</div>', 'Testimony', pill('E0', 'p-grey'), pill('Submitted'), '<span class="num">0.8 MB</span>', B('Open', 'x')],
        ['<b>Elm Road stop photos</b><div class="cap">ev7 · Mary Ellis</div>', 'Action and deliverable', pill('E0', 'p-grey'), pill('Changes requested'), '<span class="num">12.1 MB</span>', B('Open', 'x')],
      ],
    );
  const kpis = () =>
    `<div class="kpis"><div class="kpi"><span class="lt">Circles</span><span class="statnum">3</span><span class="cap">Spaces you belong to</span></div><div class="kpi"><span class="lt">Open tasks</span><span class="statnum">7</span><span class="cap">2 due this week</span></div><div class="kpi"><span class="lt">Evidence</span><span class="statnum">12</span><span class="delta">+3 since Monday</span></div><div class="kpi"><span class="lt">Funding requested</span><span class="statnum">USD 9,000</span><span class="cap">1 sponsor interested</span></div></div>`;
  const shellContent = () => `<main class="content" id="sg-main-demo">${pageHeader()}${tabsHtml()}<div class="col" style="gap:20px">${ascent()}${kpis()}${card('Evidence', 'Linked to this project and its spaces.', sampleTable(), B('View all', 'x', {}, 'btn-g btn-sm'))}</div></main>`;
  const shell = () => `<div class="app${SG.side === 'compact' ? ' is-compact' : ''}">${sidebar()}<div class="main">${topbar()}${shellContent()}</div></div>`;
  const phoneShell = () =>
    `<div class="app is-drawer">${sidebar('projects')}<div class="scrim" aria-hidden="true"></div><div class="main">${topbar(true)}<main class="content">${pageHeader()}${tabsHtml()}${kpis()}</main><nav class="bnav" aria-label="Primary"><a href="#" class="bn"><span class="bi">${ic('home', 20)}</span>Home</a><a href="#" class="bn"><span class="bi">${ic('message', 20)}</span>Chats</a><a href="#" class="bn on"><span class="bi">${ic('folder', 20)}</span>Projects</a><a href="#" class="bn"><span class="bi">${ic('room', 20)}</span>Rooms</a><a href="#" class="bn"><span class="bi">${ic('more', 20)}</span>More</a></nav></div></div>`;

  // ---------- colour and contrast ----------
  const probe = document.createElement('i');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const rgbOf = v => {
    probe.style.color = '';
    probe.style.color = v;
    const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m[3] == null ? 1 : m[3] };
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = c => ['r', 'g', 'b'].map(k => c[k] / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (fgVar, bgVar, baseVar = '--surface') => {
    const base = rgbOf(`var(${baseVar})`);
    const bg = over(rgbOf(`var(${bgVar})`), base);
    const fg = over(rgbOf(`var(${fgVar})`), bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  };
  const hexOf = v => {
    const c = rgbOf(v);
    return c.a < 1 ? `rgba(${c.r},${c.g},${c.b},${+c.a.toFixed(2)})` : '#' + [c.r, c.g, c.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  };
  const PAIRS = [
    ['Body text', '--text', '--surface', 4.5],
    ['Secondary text', '--text-2', '--surface', 4.5],
    ['Tertiary text (captions)', '--text-3', '--surface', 4.5],
    ['Tertiary text on page background', '--text-3', '--bg', 4.5],
    ['Link', '--link', '--surface', 4.5],
    ['Primary button label', '--on-primary', '--primary', 4.5],
    ['Selected / soft primary', '--primary-text', '--primary-soft', 4.5],
    ['Success badge', '--ok', '--ok-bg', 4.5],
    ['Warning badge', '--warn', '--warn-bg', 4.5],
    ['Danger badge', '--bad', '--bad-bg', 4.5],
    ['Info badge', '--info', '--info-bg', 4.5],
    ['Ember text on ember tint', '--signal-text', '--signal-soft', 4.5],
    ['Sidebar plate text', '--on-plate', '--plate', 4.5],
    ['Sidebar plate secondary', '--on-plate-2', '--plate', 4.5],
    ['Toast (inverse)', '--on-inverse', '--inverse', 4.5],
    ['Focus ring vs surface', '--focus', '--surface', 3],
    ['Input border vs surface', '--line-input', '--surface', 3],
    ['Primary fill vs surface', '--primary', '--surface', 3],
    ['Ember signal vs surface', '--signal', '--surface', 3],
  ];
  const contrastTable = () =>
    table(
      ['Pair', 'Foreground', 'Background', 'Ratio', 'Needs', 'Result'],
      PAIRS.map(([n, f, b, need]) => {
        const r = ratio(f, b);
        return [`<b>${n}</b>`, `<code>${f}</code>`, `<code>${b}</code>`, `<span class="num">${r.toFixed(2)}:1</span>`, need + ':1', r >= need ? `<span class="sg-ok">${ic('check', 14)}Pass</span>` : `<span class="sg-bad">${ic('x', 14)}Fail</span>`];
      }),
    );
  const ramp = (name, steps) => `<div class="sg-ramp">${steps.map(s => {
    const v = `var(--${name}-${s})`;
    const dark = lum(rgbOf(v)) < 0.25;
    return `<div class="sg-sw" style="background:${v};color:${dark ? '#fff' : '#141b17'}">${name} ${s}<code>${hexOf(v)}</code></div>`;
  }).join('')}</div>`;
  const TOKENS = [
    ['--bg', 'Page background'], ['--surface', 'Panels, sidebar, inputs'], ['--surface-2', 'Table header, hover, quiet panels'], ['--sunk', 'Wells, segmented track, board columns'], ['--overlay', 'Dialogs, drawers, menus'], ['--plate', 'Sidebar brand plate'], ['--inverse', 'Toasts, tooltips'],
    ['--line', 'Default hairline'], ['--line-input', 'Input and checkbox borders (3:1)'], ['--text', 'Primary text'], ['--text-2', 'Secondary text'], ['--text-3', 'Captions, metadata'],
    ['--primary', 'Primary action, active nav, selection'], ['--primary-soft', 'Selected rows, soft fills'], ['--signal', 'Ember: active notch, current step, unread'], ['--focus', 'Keyboard focus ring'],
    ['--ok', 'Success'], ['--warn', 'Warning'], ['--bad', 'Danger / error'], ['--info', 'Information'], ['--k-circle', 'Circle (wayfinding)'], ['--k-rope', 'Rope Team (wayfinding)'], ['--k-room', 'Action Room (wayfinding)'],
  ];

  // ---------- section helpers ----------
  const sec = (id, title, sub, body) => `<section class="sg-sec" id="${id}"><h1 class="h1">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}${body}</section>`;
  const rules = (dos, donts) => `<div class="sg-rules"><div class="card quiet do"><b>Do</b><ul>${dos.map(x => `<li>${x}</li>`).join('')}</ul></div><div class="card quiet dont"><b>Don’t</b><ul>${donts.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
  const sh = t => `<h2 class="sg-h">${t}</h2>`;

  function view() {
    UI.form = { sgf: { email: 'mary@', area: 'Ward 7, Excelsior City' } };
    UI.err = { sgf: { email: 'Enter a full email address, like name@example.org.' } };
    const S_ = [
      ['identity', 'Identity'], ['colour', 'Colour'], ['type', 'Typography'], ['space', 'Space, grid, shape'], ['shell', 'App shell'], ['pagehead', 'Page header & tabs'],
      ['actions', 'Buttons & inputs'], ['badges', 'Badges, avatars, icons'], ['containers', 'Panels & data'], ['overlays', 'Overlays & feedback'], ['states', 'Empty, loading, error'], ['domain', 'PHOENIX patterns'], ['rules', 'Rules summary'],
    ];
    const body = [
      sec(
        'identity',
        'PHOENIX design language',
        '“Canopy &amp; Ember” — v1, for review. A calm, dense working surface in deep spruce and cool mist, with one ember signal that always means “here” or “now”. Nothing in the live app has changed yet.',
        `<div class="g12"><div class="c7 sg-box col" style="gap:16px"><span class="over">Principles</span><ol class="col" style="gap:8px;margin:0;padding-left:20px"><li><b>One signal.</b> Ember marks the current place, the current step, unread and keyboard focus — and nothing else.</li><li><b>Tone before shadow.</b> Panels separate by surface tone and hairlines; only things that float (menus, dialogs, drawers, toasts) cast shadows.</li><li><b>Legible first.</b> Atkinson Hyperlegible Next for every word people act on; 14px base on desktop, 16px inputs on phones.</li><li><b>Status is never colour alone.</b> Every badge has a dot and words; every error has an icon and a fix.</li><li><b>Spaces are wayfinding, not status.</b> Circle, Rope Team and Action Room keep their own quiet hues.</li><li><b>Same system, every role.</b> Participants and platform operators share one shell; density and navigation change, the language does not.</li></ol></div><div class="c5 col" style="gap:16px"><div class="side-plate" style="margin:0;padding:24px">${brand('Foundation Alpha')}<div class="side-ctx"><small>Programme</small><span>Excelsior Climate Programme</span></div></div><div class="sg-box row wrap" style="gap:20px"><span class="mark" style="width:56px;height:56px">${markSvg(30)}</span><span class="mark" style="width:36px;height:36px">${markSvg(20)}</span><span class="mark" style="width:24px;height:24px;border-radius:var(--r-plume-sm)">${markSvg(14)}</span><p class="cap" style="flex:1;min-width:180px">The mark: an ember plume rising from a baseline, on a canopy square with one tight corner (the plume shape).</p></div></div></div>
        ${sh('Signature elements')}<div class="g12"><div class="c3 sg-box col"><span class="tile">${ic('folder', 20)}</span><b>Plume corner</b><p class="cap">Three soft corners, one tight. Brand mark, active nav, icon tiles, message bubbles. Never on panels or inputs.</p></div><div class="c3 sg-box col"><div style="position:relative;padding-left:12px"><a href="#" class="nav on" style="width:100%">${ic('folder')}<span class="t">Projects</span></a></div><b>Ember notch</b><p class="cap">The active destination: a filled canopy item plus an ember notch outside it — two cues, not one.</p></div><div class="c3 sg-box col"><div class="empty" style="padding:16px;min-height:72px;border-style:solid"><span class="empty-ic">${ic('route', 18)}</span></div><b>Contour lines</b><p class="cap">Faint topography for the ascent from Circle to Action Room. Decoration only, never behind text people must read.</p></div><div class="c3 sg-box col"><span class="over">Rope Team stage</span><b>Ascent</b><p class="cap">Stages sit one step higher than the last. Used for the project journey and nowhere else.</p></div></div>`,
      ),
      sec(
        'colour',
        'Colour',
        'Three tiers: primitives (ramps below) → semantic tokens (what components use) → component rules. Components never reference a primitive directly, which is what lets dark mode swap cleanly.',
        `${sh('Canopy — structure and action')}${ramp('canopy', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])}${sh('Ember — the signal')}${ramp('ember', [50, 100, 300, 400, 500, 600, 700])}${sh('Mist — neutrals')}${ramp('mist', [0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900])}
        ${sh('Semantic tokens (values shown for the current theme)')}<div class="sg-box">${TOKENS.map(([t, u]) => `<div class="sg-tok"><i style="background:var(${t})"></i><code>${t}</code><span class="cap">${u} · <code>${hexOf(`var(${t})`)}</code></span></div>`).join('')}</div>
        ${sh('Contrast — measured live in this theme (WCAG 2.2 AA)')}<div class="card flush">${contrastTable()}</div><p class="cap" style="margin-top:8px">Ratios are computed from the colours the browser resolves, with translucent tints composited over the panel surface. Switch theme at the top to re-measure.</p>
        ${rules(['Use semantic tokens (<code>--text-2</code>, <code>--bad</code>) in components.', 'Use ember for one thing per view: where you are, what is next, or what is unread.', 'Pair every status colour with words and a dot or icon.', 'Use the Circle, Rope Team and Action Room hues only to say which kind of space something is.'], ['Fill large areas or buttons with ember.', 'Use green to mean “primary” and “success” in the same spot — success badges always carry their label.', 'Hard-code hex values in view code (16 do today; they move to tokens in the roll-out).', 'Use space-kind hues for status.'])}`,
      ),
      sec(
        'type',
        'Typography',
        'Atkinson Hyperlegible Next for the interface (designed for low-vision legibility — distinct letterforms for I, l, 1, 0, O). Schibsted Grotesk for headings and figures. Atkinson Hyperlegible Mono for IDs and codes. Tabular figures everywhere.',
        `<div class="sg-box sg-type"><div><code>display 34/40</code><span class="display">Coherent community intelligence</span></div><div><code>h1 26/32</code><span class="h1">Community cooling map for Ward 7</span></div><div><code>h2 19/26</code><span class="h2">Evidence linked to this project</span></div><div><code>h3 16/22 · 700</code><span class="h3">Survey plan agreed</span></div><div><code>sub 15/22</code><span class="sub" style="margin:0">Programmes, cohorts and organization spaces owned by this organization.</span></div><div><code>body 14/20</code><span>Agree scope and priority streets for the Ward 7 cooling map. Il1 O0 — every glyph distinct.</span></div><div><code>small 13/18</code><span class="cap">Updated 6 Oct 2026 · 3 items</span></div><div><code>eyebrow 12/16 · 700</code><span class="over">Rope Team stage</span></div><div><code>figure · Schibsted</code><span class="statnum">USD 9,000 · 12 · 87%</span></div><div><code>mono 13</code><code>TKN-o1008 · W3C-5 · ev1</code></div></div>
        ${rules(['Sentence case for every label, button and heading.', 'One h1 per page; card titles are h2 at 16px.', 'Right-align numbers in tables; figures are tabular.', '16px minimum for inputs on phones (prevents iOS zoom).'], ['All-caps labels or tabs.', 'More than two weights in one component.', 'Body text below 13px (captions only go to 12px).', 'Mixing Schibsted into body copy.'])}`,
      ),
      sec(
        'space',
        'Space, grid, shape, elevation',
        '4px base unit. 12-column grid, 20px gutters (16px on phones). Corners grow with the size of the thing: controls 8, panels 12, overlays 16. Shadows only on things that float.',
        `<div class="g12"><div class="c5 sg-box col" style="gap:8px">${[['--s-1', 4], ['--s-2', 8], ['--s-3', 12], ['--s-4', 16], ['--s-5', 20], ['--s-6', 24], ['--s-8', 32], ['--s-10', 40], ['--s-12', 48], ['--s-16', 64]].map(([t, v]) => `<div class="sg-space"><code style="width:64px">${t}</code><i style="width:${v * 2}px"></i><span class="cap">${v}px</span></div>`).join('')}</div><div class="c7 col" style="gap:16px"><div class="sg-box"><div class="sg-grid">${'<span></span>'.repeat(12)}</div><p class="cap" style="margin-top:10px">Content max ${'1320'}px · page gutter 32 / 24 / 16px · layouts collapse to one column below 1024px.</p></div><div class="sg-shape"><div style="border-radius:var(--r-sm)">6 · badges</div><div style="border-radius:var(--r-md)">8 · controls</div><div style="border-radius:var(--r-lg)">12 · panels</div><div style="border-radius:var(--r-xl)">16 · overlays</div><div style="border-radius:var(--r-plume)">plume · signature</div></div><div class="sg-shape"><div style="border-radius:var(--r-lg)">Level 0<br><span class="cap">panels: hairline, no shadow</span></div><div style="border-radius:var(--r-lg);box-shadow:var(--sh-1)">Level 1<br><span class="cap">cards you drag, buttons</span></div><div style="border-radius:var(--r-lg);box-shadow:var(--sh-2)">Level 2<br><span class="cap">menus, popovers</span></div><div style="border-radius:var(--r-lg);box-shadow:var(--sh-3)">Level 3<br><span class="cap">dialogs, drawers, toasts</span></div></div></div></div>
        <p class="cap" style="margin-top:12px">Breakpoints: phone &lt; 640 · tablet 640–1023 (sidebar becomes a drawer) · desktop ≥ 1024 · wide ≥ 1440. Touch targets ≥ 44px on phones, ≥ 24px everywhere (WCAG 2.5.8).</p>`,
      ),
      sec(
        'shell',
        'App shell',
        'A light navigation rail under a dark brand plate (brand + current programme). Full mode is the default; compact mode keeps a short label under every icon, because icons alone are not recognised reliably. Below 1024px the rail becomes a drawer.',
        `<div class="row wrap" style="margin-bottom:12px"><div class="seg" role="group" aria-label="Sidebar mode"><button type="button" data-sg="side-full" aria-pressed="${SG.side === 'full'}">Full</button><button type="button" data-sg="side-compact" aria-pressed="${SG.side === 'compact'}">Compact</button></div><span class="cap">Try it: hover or Tab through the compact rail for full names.</span></div><div class="sg-frame">${shell()}</div>
        ${sh('Phone — drawer open, bottom bar')}<div class="row wrap" style="align-items:flex-start;gap:24px"><div class="sg-phone"><iframe title="Phone shell specimen" src="styleguide.html#phone-${SG.theme}" loading="lazy"></iframe></div><div class="col" style="flex:1;min-width:260px;gap:12px"><div class="card quiet col"><b>Full (≥ 1024px)</b><p class="cap">264px. Groups with plain headers, two levels at most (deeper levels become tabs on the page). Active = canopy fill + ember notch + <code>aria-current</code>. Counts in ember tint.</p></div><div class="card quiet col"><b>Compact (user choice, ≥ 1024px)</b><p class="cap">72px. Icon + short label, full name on hover and focus. Count becomes an ember dot. The choice is remembered per person on wide screens only.</p></div><div class="card quiet col"><b>Drawer (&lt; 1024px)</b><p class="cap">Opens from the menu button over a scrim. Modal: focus moves in and is trapped, Escape or a scrim tap closes it, choosing a destination closes it, focus returns to the menu button.</p></div><div class="card quiet col"><b>Bottom bar (&lt; 640px)</b><p class="cap">The four most-used destinations for the role plus More (opens the drawer). Active item gets a canopy tint, not ember.</p></div><div class="card quiet col"><b>Top bar</b><p class="cap">Opaque, 60px (56px on phones). Left: menu (drawer sizes), name and role switcher (kept from today). Right: Ask PHOENIX, notifications, account. First focus stop is “Skip to content”.</p></div></div></div>`,
      ),
      sec(
        'pagehead',
        'Page header, breadcrumbs, tabs',
        'Breadcrumbs only when the page is more than two levels deep; they never wrap, the current page is not a link, and phones show only the parent as a back link. Tabs switch content in place; counts load with the tabs.',
        `<div class="sg-box sunk">${pageHeader()}${tabsHtml()}<p class="cap">Header anatomy: breadcrumb → kind eyebrow → title + status → meta → actions (secondary, then the one primary). On phones actions drop below the title.</p></div>
        ${sh('Segmented control — one immediate choice from 2–5 options')}<div class="seg" role="group" aria-label="View"><button type="button" data-sg="seg-list" aria-pressed="${SG.seg === 'list'}">List</button><button type="button" data-sg="seg-board" aria-pressed="${SG.seg === 'board'}">Board</button><button type="button" data-sg="seg-cal" aria-pressed="${SG.seg === 'cal'}">Calendar</button></div>
        ${rules(['One row of tabs, 1–2 word labels, counts in a soft counter.', 'Use tabs for sections of one object; use the sidebar for destinations.', 'Put the single primary action rightmost in the header.'], ['Wrap breadcrumbs onto two lines.', 'Mix tabs that change the URL with tabs that do not, in one bar.', 'Show more than one primary button in a header.'])}`,
      ),
      sec(
        'actions',
        'Buttons and inputs',
        'Four button roles. Heights 38 (default), 32 (small), 44 (large and all buttons on phones). Labels say what happens: verb + object.',
        `<div class="sg-box col" style="gap:16px"><div class="row wrap">${B(ic('plus', 16) + 'Create project', 'x', {}, 'btn-p')}${B('Save draft', 'x', {}, 'btn-s')}${B('Cancel', 'x', {}, 'btn-g')}${B(ic('trash', 16) + 'Delete', 'x', {}, 'btn-d')}${B('Accepting…', 'x', {}, 'btn-p is-busy')}${B('Unavailable', 'x', {}, 'btn-p', 'disabled')}</div><div class="row wrap">${B('Primary small', 'x', {}, 'btn-p btn-sm')}${B('Secondary small', 'x')}${B('Ghost small', 'x', {}, 'btn-g btn-sm')}${B(ic('upload', 14) + 'Upload', 'x')}<button class="iconbtn" type="button" aria-label="More actions">${ic('more')}</button>${B('Large primary', 'x', {}, 'btn-p btn-lg')}</div></div>
        ${sh('Form fields — rendered by the app’s fi() helper')}<form class="sg-box col" style="gap:16px" data-f="sgf" onsubmit="return false"><div class="f2">${fi('sgf', 'name', 'Project title', { req: true, ph: 'e.g. Shade structures for bus stops', help: 'Short and specific. You can change it later.' })}${fi('sgf', 'email', 'Contact email', { type: 'email', req: true })}</div><div class="f2">${fi('sgf', 'stage', 'Stage', { type: 'select', opts: ['Circle', 'Rope Team', 'Action Room'], ph: 'Choose a stage' })}${fi('sgf', 'area', 'Area', { ro: true, help: 'Set by the programme.' })}</div>${fi('sgf', 'desc', 'What will change, for whom?', { type: 'textarea', rows: 3, max: 400 })}<fieldset class="fs" style="border:0;padding:0"><legend>Areas of interest</legend><div class="row wrap" style="gap:8px">${['Urban heat', 'Tree canopy', 'Water', 'Food resilience'].map((t, i) => `<label class="chip"><input type="checkbox" ${i < 2 ? 'checked' : ''}>${t}</label>`).join('')}</div></fieldset>${fi('sgf', 'agree', 'I have read and accept the <b>Participant Agreement v3</b>.', { type: 'checkbox', req: true })}<div class="actions">${B('Cancel', 'x', {}, 'btn-g')}<button class="btn btn-p" type="button">Submit for review</button></div></form>
        ${rules(['One primary button per form or dialog, rightmost.', 'Validate on submit, show the error under the field and in a summary at the top; keep what the person typed.', 'Readonly fields are dashed and say why.', 'Destructive actions are tinted red and confirmed in a dialog that names what will be lost.'], ['Disable a submit button to signal errors — let people submit and explain.', 'Use placeholder text as the label.', 'Report form errors only in a toast.', 'Use ghost buttons for the main action.'])}`,
      ),
      sec(
        'badges',
        'Badges, avatars, icons',
        'Badges are tinted, 6px corners, with a dot and words — round pills are kept for counts. People are circles; spaces and organizations are squares.',
        `<div class="sg-box col" style="gap:14px"><div class="row wrap" style="gap:8px">${['Active', 'Approved', 'Submitted', 'Pending role approval', 'Changes requested', 'Rejected', 'Draft', 'Expired', 'In review', 'Accepted'].map(t => pill(t)).join('')}</div><div class="row wrap" style="gap:8px">${pill('Circle', 'p-purple')}${pill('Rope Team', 'p-teal')}${pill('Action Room', 'p-navy')}${aiTag('AI draft')}<span class="cnt">12</span><span class="ncount">4</span></div></div>
        ${sh('Avatars and tiles')}<div class="sg-box row wrap" style="gap:16px"><span class="av sm">M</span><span class="av">A</span><span class="av lg">S</span><span class="avstack"><span class="av">M</span><span class="av">A</span><span class="av">P</span><span class="av" style="background:var(--neutral-bg);color:var(--text-2)">+4</span></span><span class="av sq">W7</span><span class="tile">${ic('folder', 20)}</span><span class="tile t-purple">${ic('users', 20)}</span><span class="tile t-teal">${ic('steps', 20)}</span><span class="tile t-navy">${ic('room', 20)}</span><span class="tile t-ember">${ic('bell', 20)}</span><span class="tile t-soft">${ic('archive', 20)}</span></div>
        ${sh('Icons — the existing set, 1.8px stroke, 18px default (16 in buttons, 20 in tiles)')}<div class="sg-box sg-icons">${Object.keys(ICONS).map(k => `<div>${ic(k, 22)}${k}</div>`).join('')}</div>`,
      ),
      sec(
        'containers',
        'Panels and data',
        'Panels are flat: surface, hairline, 12px corners, no shadow. Tables keep a 44px row (36px compact), a quiet header, right-aligned numbers, and become record cards on phones using the labels the table() helper already writes.',
        `<div class="g12"><div class="c8">${card('Evidence', 'Linked to this project and its spaces.', sampleTable(), B('View all', 'x', {}, 'btn-g btn-sm'))}</div><div class="c4 col" style="gap:20px">${card('Organization details', '', dl([['Type', 'University'], ['Use-case pack', 'University / Community'], ['Country', 'United Kingdom'], ['Data residency', 'United Kingdom']]))}${card('Progress', '', `<div class="col" style="gap:10px"><div class="row" style="justify-content:space-between"><b>Deliverables</b><span class="cap">4 of 6</span></div><div class="progress"><div class="bar" style="width:66%"></div></div></div>`, '', 'accent')}</div><div class="c12">${kpis()}</div><div class="c6">${card('Activity', '', `<ol class="timeline"><li class="tl"><b>Accepted by Dr Asha Rao</b><div class="cap">3 Jul 2026 · support path Circle → Rope Team → Action Room</div></li><li class="tl"><b>Circle created</b><div class="cap">10 Jul 2026</div></li><li class="tl"><b>Rope Team review 2 of 3</b><div class="cap">2 Oct 2026</div></li></ol>`)}</div><div class="c6">${card('People', '', ['Mary Ellis · Project owner', 'Dr Asha Rao · Steward', 'Priya Natarajan · Mentor'].map((t, i) => `<div class="lrow"><span class="av">${t[0]}</span><div class="grow"><div class="lt">${t.split(' · ')[0]}</div><div class="cap">${t.split(' · ')[1]}</div></div>${i ? B('Message', 'x') : pill('You', 'p-teal')}</div>`).join(''))}</div></div>
        ${rules(['First column is a readable name with the ID underneath, never the ID alone.', 'Two or fewer row actions: show them; more: an overflow menu that is always in the DOM.', 'Empty table → say what is missing and what to do (table() already does).', 'Use the accent top edge (ember) only on the one panel that needs attention.'], ['Shadows on panels.', 'Zebra stripes and vertical rules.', 'Centre-aligned numbers.', 'A table inside a dialog when a side drawer would keep the list visible.'])}`,
      ),
      sec(
        'overlays',
        'Overlays and feedback',
        'Dialogs are for decisions and critical input; drawers for details and edits next to a list; menus for actions; toasts confirm what just happened. Validation lives next to the field.',
        `<div class="g12"><div class="c7"><div class="sg-overlay-stage"><div class="mback" style="position:absolute"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="sg-mt"><div class="row" style="justify-content:space-between"><h2 class="h2" id="sg-mt">Accept project and choose support path</h2><button class="iconbtn" type="button" aria-label="Close">${ic('x')}</button></div><div class="field"><span class="lbl">Support and onboarding path</span><b>Circle → Rope Team → Action Room</b><span class="help">The project starts in a Circle, moves to a Rope Team, then to the Action Room.</span></div><div class="actions">${B('Cancel', 'x', {}, 'btn-g')}${B('Accept project', 'x', {}, 'btn-p')}</div></div></div></div><p class="cap" style="margin-top:8px">Dialog: 560px (880 wide), 16px corners, header and footer fixed, body scrolls. On phones it becomes a bottom sheet. Clicking the scrim closes only dialogs without unsaved input.</p></div>
        <div class="c5 col" style="gap:16px"><div class="sg-overlay-stage" style="min-height:300px;padding:16px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap"><div class="menu" role="menu" aria-label="Project actions"><button class="menu-i" role="menuitem">${ic('edit', 16)}Edit details</button><button class="menu-i" role="menuitem">${ic('users', 16)}Assign steward</button><button class="menu-i" role="menuitem">${ic('download', 16)}Export</button><div class="menu-sep"></div><button class="menu-i danger" role="menuitem">${ic('trash', 16)}Withdraw project</button></div></div><p class="cap">Menu: 12px corners, 38px items, destructive item last and separated.</p></div>
        <div class="c7"><div class="sg-overlay-stage" style="min-height:420px"><div class="drawer" style="width:min(420px,100%)" role="dialog" aria-label="Evidence details"><div class="drawer-h"><span class="tile t-ember">${ic('award', 20)}</span><div class="grow"><b>Elm Road stop photos</b><div class="cap">Evidence · ev7</div></div><button class="iconbtn" type="button" aria-label="Close">${ic('x')}</button></div><div class="drawer-b">${dl([['Project', 'Community cooling map for Ward 7'], ['Linked to', 'Elm Road shade audit'], ['Review', pill('Submitted')], ['Level', pill('E0', 'p-grey')]])}</div><div class="drawer-f">${B('Request changes', 'x', {}, 'btn-s btn-sm')}${B('Approve', 'x', {}, 'btn-p btn-sm')}</div></div></div><p class="cap" style="margin-top:8px">Drawer: 480px from the right, for details and edits beside a list. One at a time. (Today the app uses dialogs for these; moving them is a roll-out decision for you.)</p></div>
        <div class="c5 col" style="gap:12px">${banner('info', 'Approved in advance', 'The Platform Administrator appointed you to this role.')}${banner('ok', 'Evidence submitted', 'A reviewer will check it. You can keep working.')}${banner('warn', 'This role needs approval', 'An authorised approver must approve it before it becomes active.')}${banner('err', 'Something went wrong on this screen', 'Your work is saved. Try again, or go back.')}${banner('ai', 'AI draft', 'Stays a draft until a person accepts it.')}<div class="sg-overlay-stage" style="min-height:96px"><div class="toast" role="status" style="position:absolute;right:12px;bottom:12px;animation:none"><div class="banner b-ok">${ic('check')}<div style="flex:1"><p>Project accepted. Next: create the Circle.</p></div><button class="iconbtn" style="width:28px;height:28px" type="button" aria-label="Dismiss">${ic('x', 16)}</button></div></div></div><p class="cap">Toast: inverse surface, bottom-right (above the bottom bar on phones), <code>role="status"</code>; errors use <code>role="alert"</code> and never auto-dismiss.</p></div></div>`,
      ),
      sec(
        'states',
        'Empty, loading and error',
        'Three kinds of empty: first use, no results, and no access or error — each says what is missing and offers the next step. Nothing for waits under a second; skeletons for a page, a spinner for one panel, progress for long jobs.',
        `<div class="g12"><div class="c4">${empty('folder', 'No projects yet', 'Share an idea and a steward reviews it. Most reviews take a few days.', B(ic('plus', 16) + 'Create project', 'x', {}, 'btn-p btn-sm'))}</div><div class="c4">${empty('search', 'No evidence matches these filters', 'Try a different project or clear the filters.', B('Clear filters', 'x'))}</div><div class="c4"><div class="empty err"><span class="empty-ic">${ic('lock', 18)}</span><div><b>You don’t have access to this space</b><p>Ask the facilitator to invite you. Nothing was changed.</p><div class="row wrap" style="gap:8px">${B('Back to Circles', 'x')}</div></div></div></div>
        <div class="c6 card col" style="gap:12px" aria-busy="true" aria-label="Loading"><span class="skel h"></span><div class="row"><span class="skel av"></span><div class="col grow" style="gap:6px"><span class="skel" style="width:70%"></span><span class="skel" style="width:45%"></span></div></div><div class="row"><span class="skel av"></span><div class="col grow" style="gap:6px"><span class="skel" style="width:60%"></span><span class="skel" style="width:35%"></span></div></div></div><div class="c6 card col" style="gap:14px"><div class="row"><span class="spin" role="status" aria-label="Loading"></span><span class="cap">Loading this panel…</span></div><div class="progress" role="progressbar" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" aria-label="Export"><div class="bar" style="width:62%"></div></div><span class="cap">Export 62% — long jobs show progress, not a spinner.</span>${B('Generating harvest…', 'x', {}, 'btn-p is-busy')}</div></div>`,
      ),
      sec(
        'domain',
        'PHOENIX patterns',
        'The patterns only PHOENIX has: the ascent stage rail, conversations and the Action Room board.',
        `${sh('Ascent — read-only stage rail (completed, current, next; error uses the danger tint)')}<div class="sg-box sunk" style="padding-top:28px">${ascent()}</div>
        <div class="g12" style="margin-top:20px"><div class="c6">${card('Conversation', 'Mary Ellis ↔ Dr Asha Rao', `<div class="col" role="log" aria-label="Messages" style="gap:10px"><div class="bubble">Could you check the survey plan before Friday?<span class="mtime">Asha · 09:12</span></div><div class="bubble me">Yes — I’ve added the 12 Elm Road stops.<span class="mtime">You · 09:20</span></div><div class="bubble">Great, that covers the hottest locations.<span class="mtime">Asha · 09:31</span></div></div><div class="row" style="margin-top:14px"><input class="input" aria-label="Message" placeholder="Write a message"><button class="btn btn-p" type="button">${ic('send', 16)}Send</button></div>`)}</div>
        <div class="c6">${card('Action Room board', 'Drag, or use “Move to…” in each card’s menu', `<div class="row" style="align-items:flex-start;overflow-x:auto;gap:12px"><div class="kcol"><b class="cap">To do · 2</b><div class="kcard"><span class="kid">W3C-5</span><b>Draft planting-site shortlist</b><div class="row" style="justify-content:space-between">${pill('Low', 'p-grey')}<span class="av sm">A</span></div></div><div class="kcard"><span class="kid">W3C-6</span><b>Book the school hall</b><div class="row" style="justify-content:space-between">${pill('Overdue', 'p-red')}<span class="av sm">M</span></div></div></div><div class="kcol"><b class="cap">In review · 1</b><div class="kcard"><span class="kid">W3C-3</span><b>Survey 12 bus stops</b><div class="row" style="justify-content:space-between">${pill('In review')}<span class="av sm">P</span></div></div></div></div>`)}</div></div>`,
      ),
      sec(
        'rules',
        'Rules summary',
        'What every screen follows once the language is rolled out.',
        `<div class="g12"><div class="c6 card col"><b>Layout</b><ul class="muted" style="margin:0;padding-left:18px"><li>12-column grid, 20px gutters; one column below 1024px.</li><li>Page = breadcrumb (when deep) → header → tabs → content.</li><li>Panels flat; shadows only on things that float.</li><li>No horizontal page scroll at 360px width.</li></ul></div><div class="c6 card col"><b>Colour</b><ul class="muted" style="margin:0;padding-left:18px"><li>Components use semantic tokens only.</li><li>Ember: current place, current step, unread, focus — one per view.</li><li>Status = colour + dot/icon + words.</li><li>Every pair in the contrast table passes AA in both themes.</li></ul></div><div class="c6 card col"><b>Interaction</b><ul class="muted" style="margin:0;padding-left:18px"><li>One primary action per view, rightmost.</li><li>Dialogs for decisions; drawers for details beside a list.</li><li>Errors next to the field, never only in a toast; errors never auto-dismiss.</li><li>Every drag has a menu alternative (WCAG 2.5.7).</li></ul></div><div class="c6 card col"><b>Accessibility</b><ul class="muted" style="margin:0;padding-left:18px"><li>Visible ember focus ring, 2px, offset 2px, ≥ 3:1.</li><li>Skip link first; sticky bars never cover the focused element.</li><li>Drawer and dialog trap focus and restore it on close.</li><li>Reduced motion respected; nothing essential is animated.</li></ul></div></div>`,
      ),
    ].join('');
    const themeSeg = `<div class="seg" role="group" aria-label="Theme">${['light', 'dark', 'system'].map(t => `<button type="button" data-sg="theme-${t}" aria-pressed="${SG.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>`;
    return `<a class="skip" href="#identity">Skip to content</a><div class="sg"><nav class="sg-toc" aria-label="Sections">${brand('Design language')}${S_.map(([id, l]) => `<a href="#${id}">${l}</a>`).join('')}</nav><main class="sg-main"><div class="sg-bar"><b class="grow">Canopy &amp; Ember · v1 for review</b>${themeSeg}<a class="btn btn-s btn-sm" href="index.html">Open the live app</a></div>${body}</main></div>`;
  }

  function applyTheme() {
    if (SG.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', SG.theme);
  }
  function draw() {
    applyTheme();
    const root = document.getElementById('sg');
    const y = window.scrollY;
    const ph = /^#phone-?(\w*)/.exec(location.hash);
    if (ph) {
      document.body.classList.add('sg-phone-body');
      if (ph[1]) document.documentElement.setAttribute('data-theme', ph[1] === 'system' ? 'light' : ph[1]);
      root.innerHTML = phoneShell();
      return;
    }
    root.innerHTML = view();
    window.scrollTo(0, y);
  }
  // Specimens are inert: app handlers (data-a) never run here; only the guide's own controls (data-sg) do.
  document.addEventListener(
    'click',
    e => {
      const sg = e.target.closest('[data-sg]');
      const appAct = e.target.closest('[data-a], a[href="#"]');
      if (!sg && !appAct) return;
      e.preventDefault();
      e.stopPropagation();
      if (!sg) return;
      const v = sg.dataset.sg;
      if (v.startsWith('theme-')) {
        SG.theme = v.slice(6);
        try {
          localStorage.setItem('phx-sg-theme', SG.theme);
        } catch (er) {}
      } else if (v === 'side') SG.side = SG.side === 'compact' ? 'full' : 'compact';
      else if (v.startsWith('side-')) SG.side = v.slice(5);
      else if (v.startsWith('seg-')) SG.seg = v.slice(4);
      else return;
      draw();
    },
    true,
  );
  document.addEventListener('submit', e => e.preventDefault(), true);
  window.addEventListener('hashchange', () => /^#phone/.test(location.hash) && draw());
  draw();
})();
