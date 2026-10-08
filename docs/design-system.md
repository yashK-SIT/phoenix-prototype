# PHOENIX design language — "Canopy & Ember" (v1, for review)

Visual reference: open `styleguide.html` in a browser. Every specimen there is rendered by the app's own helpers
(`B`, `fi`, `card`, `table`, `pill`, `banner`, `empty`, `tabs`, `dl`) with `assets/css/phoenix.css`, in light and dark.
The live app (`index.html`) does not load this stylesheet yet.

## 1. Identity

| Element | Rule |
|---|---|
| Canopy (deep spruce) | Structure, primary actions, selection, active navigation. |
| Ember (signal orange) | The current place, the current step, unread, keyboard focus. Nothing else; one use per view. Never a large fill, never body text. |
| Mist (cool green-grey) | All neutrals. Panels separate by tone and hairlines, not shadow. |
| Plume corner | `12px 12px 12px 3px`. Brand mark, active nav item, icon tiles, message bubbles. Never panels, inputs or buttons. |
| Contour lines | Faint topography (the ascent Circle → Rope Team → Action Room). Decoration only: sidebar plate, empty states, auth. Never behind text people must read. |
| Ascent | The read-only stage rail for the project journey; each stage sits one step higher. Used nowhere else. |
| Mark | Ember plume rising from a baseline on a canopy plume-square. |

Deliberately avoided (research §11): indigo/violet gradients, Inter everywhere, glass/translucent headers,
uniform radius + faint shadow on everything, near-black primary (shadcn), #0d6efd (Bootstrap), gradient card
headers (Material Dashboard), cream + clay + serif (Claude), monochrome black CTA (ChatGPT), icon-only rails by default.

## 2. Tokens

Three tiers: **primitives** (`--canopy-600`, `--mist-200` …) → **semantic** (`--text-2`, `--bad-bg`, `--primary` …) →
component rules in CSS. Components use semantic tokens only; dark mode redefines the semantic tier.

| Group | Tokens |
|---|---|
| Surfaces | `--bg` `--surface` `--surface-2` `--sunk` `--raised` `--overlay` `--plate` `--inverse` |
| Lines | `--line` `--line-soft` `--line-strong` `--line-input` (input/checkbox borders, ≥ 3:1) |
| Text | `--text` `--text-2` `--text-3` `--text-dis` |
| Brand | `--primary` `--primary-hover` `--primary-press` `--on-primary` `--primary-soft` `--primary-text` `--link` `--signal` `--signal-text` `--signal-soft` `--focus` |
| Meaning | `--ok` `--warn` `--bad` `--info` `--neutral`, each with `-bg` `-bd` (and `-solid` for ok/warn/bad) |
| Space kinds | `--k-circle` `--k-rope` `--k-room` (+ `-bg`) — wayfinding only, never status |
| Elevation | `--sh-1` (draggable cards, buttons) `--sh-2` (menus, popovers) `--sh-3` (dialogs, drawers, toasts) |

**Dark theme:** `[data-theme="dark"]`, or the system setting when no theme is chosen. Elevation = lighter surface
(`#0c1210` → `#121a17` → `#18221e` → `#1d2924`), never pure black; accents lifted, not neon.

**Contrast:** the style guide measures 19 foreground/background pairs live in each theme (text 4.5:1, UI parts and
focus 3:1). All pass AA in both themes as of v1.

## 3. Typography

| Role | Font | Size / line |
|---|---|---|
| Interface and body | Atkinson Hyperlegible Next | 14/20 (13/18 small, 12/16 caption) |
| Headings, figures | Schibsted Grotesk | display 34/40 · h1 26/32 (22/28 phone) · h2 19/26 · card title 16/22 |
| h3, labels | Atkinson Hyperlegible Next 700 | 16/22 · labels 13/18 |
| IDs, codes | Atkinson Hyperlegible Mono | 13 |

Sentence case everywhere. Tabular figures in body and tables; headings and headline figures use normal spacing.
Inputs are 16px on phones (no iOS zoom). Atkinson's slashed zero (`0`) and distinct `I l 1` are intentional.

## 4. Space, grid, shape

- 4px base: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- 12-column grid, 20px gutters (16px phones); content max 1320px; page gutter 32 / 24 / 16px.
- Breakpoints: phone < 640 · tablet 640–1023 · desktop ≥ 1024 · wide ≥ 1440. One column below 1024.
- Radius grows with size: badges 6 · controls 8 · panels 12 · overlays 16 · plume (signature).
- Controls: 38px default, 32 small, 44 large and on phones. Targets ≥ 24px everywhere, ≥ 44px on phones.

## 5. Shell

- **Sidebar, full (≥ 1024):** 264px. Dark brand plate (mark, product, current programme) above a light rail.
  Plain group headers, two levels at most — deeper levels become tabs on the page. Active item = canopy fill
  (plume corner) + ember notch + `aria-current="page"`. Counts in ember tint.
- **Sidebar, compact (user choice, ≥ 1024):** 72px. Icon + short label under it (icons alone are not reliably
  recognised); full name on hover and focus; counts become an ember dot. Remembered per person on wide screens only.
- **Drawer (< 1024):** opens from the menu button over a scrim; modal — focus moves in and is trapped, Escape or
  scrim tap closes, choosing a destination closes, focus returns to the menu button.
- **Bottom bar (< 640):** four most-used destinations for the role + More (opens the drawer).
- **Top bar:** opaque, 60px (56 phones). Menu (drawer sizes) · name and role switcher (unchanged from today) ·
  Ask PHOENIX · notifications · account. First focus stop is "Skip to content". Sticky bars never cover the focused element.

## 6. Page structure

Breadcrumb (only when > 2 levels deep; never wraps; current page not a link; phones show only the parent as a back
link) → kind eyebrow → title + status badge → meta line → actions (secondary, then the single primary, rightmost;
below the title on phones) → tabs → content.

Tabs: one row, 1–2 word labels, soft counters, switch content in place. Segmented control: one immediate choice
from 2–5 options.

## 7. Components

| Component | Rules |
|---|---|
| Buttons | Primary (canopy), secondary (outlined), ghost (canopy text), danger (red tint → solid on hover). One primary per view. Busy state keeps width and shows a spinner. Never disable submit to signal errors. |
| Inputs | Label above, help below, error below with icon; error summary at the top of long forms; keep what was typed. Readonly = dashed and says why. Never placeholder-as-label. |
| Badges | Tinted, 6px corners, dot + words. Round pills only for counts. Status is never colour alone. |
| Avatars | People are circles; spaces and organizations are squares. Stacks overlap by 8px with a surface ring. |
| Panels | Flat: surface, hairline, 12px, no shadow. `accent` (ember top edge) only on the one panel needing attention. |
| Tables | 44px rows (36 compact), quiet header, first column a readable name with the ID beneath, numbers right-aligned, ≤ 2 visible row actions else an always-present overflow menu. Phones: rows become record cards from `data-label`. No zebra stripes or vertical rules. |
| Dialogs | Decisions and critical input only. 560 / 880px, 16px corners, fixed header and footer. Bottom sheet on phones. Scrim closes only dialogs without unsaved input. |
| Drawers | Details and edits beside a list, 480px from the right, one at a time. |
| Menus | 12px corners, 38px items, destructive item last and separated. |
| Toasts | Inverse surface, bottom-right (above the bottom bar on phones). `role="status"`; errors `role="alert"` and never auto-dismiss; toasts with actions never auto-dismiss. |
| Banners | Inline, tinted, icon + title + text. Errors near their cause. |

## 8. States

- **Empty** — three kinds: first use, no results, no access/error. Each says what is missing and gives the next step.
- **Loading** — nothing under 1s; skeleton for a page, spinner for one panel or button, progress bar for jobs > 10s.
- **Error** — plain language, what happened, what to do; never blame, never humour; work is kept.

## 9. PHOENIX patterns

- **Ascent** — completed / current ("You are here", ember) / next (dashed) / error (danger tint). Read-only.
- **Conversation** — `role="log"`; others' bubbles on surface, own bubbles in canopy; plume-mirrored corners.
- **Board** — columns on `--sunk`, cards on surface with `--sh-1`; every drag has a "Move to…" menu alternative (WCAG 2.5.7).

## 10. Roll-out (next phase, after approval)

1. Load `phoenix.css` in `index.html` in place of the four current stylesheets (`app.css`, `features.css`,
   `design.css`, `theme.css`), and swap the fonts.
2. Rebuild the shell markup in `core.js` (`sidebar()`, `topbar()`, `bottomnav()`): brand plate, compact mode with
   remembered choice, drawer with focus trap, skip link, theme setting in the account menu.
3. Breadcrumbs: `head()` and the detail headers move to the `crumbs` list markup.
4. Restyle feature-specific classes (messages, board, harvest, journey, onboarding, auth, policies …) on the tokens.
5. Replace the 16 hard-coded colours in view code with tokens so dark mode works everywhere.
6. Verify: route audit (all personas × routes × tabs), existing test suites, phone width 360px with no horizontal
   scroll, contrast table in both themes.

## Sources

UX principles came from published design-system documentation and research: IBM Carbon, Atlassian, Microsoft
Fluent 2, GitHub Primer, GitLab Pajamas, PatternFly, Adobe Spectrum, Material dark-theme guidance, NN/g articles
(icon usability, breadcrumbs, sticky headers, tabs, data and mobile tables, skeletons, error messages, modals) and
WCAG 2.2. Mobbin, Dribbble and Behance were not used (login-gated). No reference was copied.
