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
- **No collapsed mode.** The sidebar is always full width on desktop (decided in review); the content area uses the
  full remaining width (no max-width gutters).
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

## 9a. PHOENIX Data View (`dataView(key, o)` in core.js)

One reusable pattern for every collection; its layout adapts to the content of each screen.

| Part | Rule |
|---|---|
| Toolbar | Find group on the left (search, quick-filter segments with counts, Filters button), tools on the right separated by a rule (Sort with direction toggle, then the screen's own actions). Filtering and sorting never share a control. |
| Advanced filters | Popover under the Filters button on desktop; bottom drawer over a scrim on phones. "Any" resets one filter; Clear all resets everything. The button shows how many are applied. |
| Active filters | Removable chips ("Area: Tree canopy", the search term) with Clear all, directly under the toolbar. |
| Layout | A purpose-built list by default: lead icon/avatar, title, one-line description, meta, badges, the primary action and a row menu. A table only where columns genuinely help (money, audit, metrics); sortable headers carry `aria-sort`; on phones secondary columns move into a "More details" disclosure. |
| Rows | Hover and focus-within tint; selected rows tinted; destructive menu items last, after a separator, and confirmed. |
| Selection & bulk | Only where an existing single-row action can be repeated (through its guard). A dark bulk bar shows the count, the actions and Clear selection; destructive bulk actions confirm. |
| Pagination | "Showing 21–30 of 186" (plus the total when filtered), Previous/Next (disabled, never hidden), page numbers with ellipsis, current page filled with an ember underline and `aria-current`, rows per page 10/25/50/100, Go to page when there are more than 7 pages. Phones: Previous · Page X of Y · Next. |
| States | First use (the screen's own empty copy), no results (with Clear all), loading (`dvSkeleton(n)` in the shape of the list). |
| Accessibility | Every control is a real button/select/input with a label; results, filter and page changes are announced in a persistent polite live region; focus returns to the control you used; Escape closes menus and the filter panel. |
| State | Search, filters, sort, page and page size persist for the session per screen. |

## 9b. Nested workspace navigation (`subnav()` + `withSubnav()`)

Circles, Rope Teams and Action Rooms use a sub-sidebar instead of flat tabs. Sections are grouped under expandable
parents (button with `aria-expanded` + `aria-controls`, chevron, `<ul>` lists); a collapsed group holding the current
section shows an ember dot. The current section has `aria-current="page"`, a canopy tint, bold text and an ember bar
on the guide line. **Overview** is the first item and the default: it holds the space header, its facts strip and the
project journey (and, for Action Rooms, the existing overview). Every other section opens with a one-line context bar
(kind, name, state and the same actions as the header). State banners that carry actions (e.g. an Action Room
awaiting approval) stay above the sections. Embedded chat is a fixed-height panel whose message list scrolls, with the
composer always in view. Under 1280px the panel folds behind a single "Sections" toggle that names the current
section; choosing a section folds it again. It reuses the tab mechanism, so every section id and permission is unchanged.

## 10. Roll-out status (applied)

- `index.html` loads `phoenix.css` plus one sheet per product area in `assets/css/screens/` (home, workspaces,
  conversations, records, admin). The four previous stylesheets (`app.css`, `features.css`, `design.css`,
  `theme.css`) are no longer loaded; they are still on disk.
- Shell rebuilt in `core.js`: brand plate, always-full sidebar on desktop, modal drawer under 1024px, skip link,
  theme choice (Light / Dark / System) in the account menu.
- Every screen restyled; collections use the Data View (§9a); Circles, Rope Teams and Action Rooms use the nested
  sub-navigation (§9b).
- Verified on every persona × route × tab: no render failures or JS errors, no horizontal overflow at 390 / 768 / 1024 /
  1440px, and the functional regression suites unchanged.

## Sources

UX principles came from published design-system documentation and research: IBM Carbon, Atlassian, Microsoft
Fluent 2, GitHub Primer, GitLab Pajamas, PatternFly, Adobe Spectrum, Material dark-theme guidance, NN/g articles
(icon usability, breadcrumbs, sticky headers, tabs, data and mobile tables, skeletons, error messages, modals) and
WCAG 2.2. Mobbin, Dribbble and Behance were not used (login-gated). No reference was copied.
