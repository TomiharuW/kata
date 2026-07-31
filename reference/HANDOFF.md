# Handoff: Kata — music practice tracker

## Overview
Kata is a single-user, mobile-first practice tracker for a multi-instrumentalist composer.
It answers four questions: *what do I practise today*, *what did I actually do*, *what am I
working toward*, and *what should I study next*. Six screens, one 480 px column, offline-first,
no backend except an optional Google Sheet connection for the study list.

The domain is specific and the data model should not be genericised. The user plays piano,
shakuhachi, shinobue, trumpet and taiko, composes, runs a brass band, studies Japanese, and
lifts. Instruments rotate through a weekly plan because there are more instruments than
mornings — that scarcity is the core mechanic of the app.

## About the design files
`Kata.dc.html` in this bundle is a **design reference created in HTML**. It is a working
prototype — every interaction in it runs — but it is **not production code to port line by
line**. It is written in a bespoke streaming-template runtime (`<x-dc>` markup plus a
`Component extends DCLogic` class) that exists only in the authoring environment. The
`support.js` runtime is deliberately **not** included in the shipped app — it is provided here
only so the prototype's logic can be read.

Your task is to **recreate these screens in the target codebase's own environment**. This
machine has no Node.js/npm/bun/deno installed and no network-based package manager access —
so the target codebase is a **dependency-free, no-build static PWA**: plain HTML/CSS/JS (ES
modules), hand-authored, deployable as-is to GitHub Pages or any static host with zero build
step. Do not introduce a bundler or anything requiring `npm install` — it cannot run here.

Read the prototype (`Kata.dc.html`) as the specification of *look and behaviour* — it is the
authoritative, working spec; every interaction, computed value and piece of seed data in it is
real and should be ported faithfully. Read this README as the specification of *structure and
rules*, but where the two disagree on a screen's scope (this happened at least once — see the
Study screen note below), trust what `Kata.dc.html` actually renders, since that's the
executable spec.

## Fidelity
**High fidelity.** Colours, type, spacing and interaction states are final and come from a
design system (see *Design tokens*, `reference/design-system.css`, `reference/design-system-readme.md`).
Recreate the UI faithfully using CSS custom properties, never hard-coded hex/px values.

Two caveats on fidelity:
- Type sizes below 11 px appear only in the week-strip grid, which is intentionally dense
  (modelled on a Hobonichi Techo weekly page). Everywhere else, body text is 12.5–14 px and
  tap targets are ≥ 30 px.
- The prototype is fixed at 480 px. It has no tablet or desktop breakpoint; keep the app
  centred at max-width 480px on larger viewports (matches the prototype's own outer wrapper).

**Study screen note:** the design_handoff README this file is adapted from describes a much
richer Study screen (search, filters, item cards, inline goal/instrument rebinding, a Google
Sheet pull/push panel). The actual prototype (`Kata.dc.html`, `isStudy` block) renders something
simpler: two link-cards (to a Google Form and a Google Sheet, opened in a new tab) plus an
embedded `<iframe>` of the Google Form, with a toggle to show/hide the embed. **Implement what
the prototype actually shows** (the simpler version) since it is the executable spec — the
richer version can be treated as a documented future enhancement, not something to build now.
The underlying state module should still keep the full study-item data shape and CRUD methods
from the class (`addStudy`, `patchStudy`, `cycleStudyStatus`, `pullSheet`/CSV parsing,
`pushSheet`, `flushPush`) since they're harmless to keep and cheap insurance if the richer UI
is wanted later — just don't spend effort building UI for them beyond what's in the prototype.

---

## Design system: Classical

Editorial, book-like, on a warm near-white ground. Cormorant Garamond headings over Lora body.
**Colour is applied as stroke, never as fill.** Buttons are outlined, cards are bordered and
unfilled, hairline rules carry the structure. No heavy shadows — elevation is a whisper.

Rules that matter when recreating:
- Never fill a card or button with solid accent.
- Bold is avoided. Headings cap at semibold (600); the larger the text, the lighter it sets.
- Numbers that stand as figures are tabular (`font-variant-numeric: tabular-nums`). Running
  prose keeps its text figures.
- Section labels are 10–11 px uppercase with ~0.09 em letter-spacing, at ~55% text opacity.
- Focus is a 2 px accent outline at 2 px offset. Never the browser default.

### Design tokens

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f3f2f2` | page ground |
| `--color-text` | `#201f1d` | body text |
| `--color-accent` | `#b68235` | the only accent; strokes, rules, active states |
| `--color-accent-100` | light gold tint | selected chip fill, quote panel, "stuck" callout |
| `--color-accent-700` | deep gold | accent text at paragraph size (accent itself fails contrast) |
| `--color-accent-800` | deeper gold | text on gold tints |
| `--color-divider` | hairline | all rules and card borders |
| `--radius` | 4 px | everything except pills (999 px) |
| `--shadow-sm/md/lg` | tuned to the ground | `elev-sm` on forms, `lg` on the bottom sheet |
| `--font-heading` | Cormorant Garamond | headings, figures, Japanese quotes |
| `--font-body` | Lora | body, labels, buttons |

Type scale in use: h1 26–30 px, h2 19–23 px, card title 15–16 px, body 13–13.5 px,
meta 11–12 px, section label 10–11 px uppercase.

Opacity ladder for secondary text — the prototype leans on this heavily:
`color-mix(in srgb, var(--color-text) N%, transparent)` with N = 80 (body secondary),
72, 62, 55 (section labels), 50, 48, 45, 42 (faintest meta).

### Per-activity colours
Each activity carries its own stroke, used for the left border of cards, chip outlines, dots,
and the ensō rings. Generated in OKLCH at fixed lightness/chroma so they sit at equal weight:

```
ear       #3a2f28  (anchor — warm near-black)
jpn       #3a2f28  (anchor)
strength  #3a2f28  (anchor)
piano     oklch(54% 0.10 75)
shakuhachi oklch(54% 0.10 150)
shinobue  oklch(54% 0.10 195)
trumpet   oklch(54% 0.10 28)
taiko     oklch(54% 0.10 345)
composition oklch(54% 0.10 258)
other     #7d7979
```

Keep the formula, not just the outputs — new instruments get a hue and inherit the weight.
NOTE: `Kata.dc.html`'s own `ACT_DEFS`/color values are the ground truth for exact hex/oklch —
read them directly from the source rather than retyping from this table.

### Icons
Lucide, 1.7 stroke width at 20 px in navigation, 1.8–2.4 at smaller sizes. The prototype inlines
every icon as raw SVG path data directly in the markup — copy those paths verbatim rather than
pulling in an icon library/dependency (this build has no package manager). Two custom marks:
- **Brand / ensō**: a circle, `stroke-dasharray="60 9"`, rotated `-95deg` — an almost-closed
  zen circle. 22 px in the header.
- **Checkable ensō** (rotation and anchor rows): 30 px circle. Unchecked is a 1.5 px stroke
  with `dasharray 62 12`; checked is a 3 px stroke, no dash, filled at 12% of the activity
  colour. This is the app's signature control — do not substitute a checkbox.

---

## Screens

Bottom tab bar, seven tabs (six from the README plus Setup, which the prototype has and this
doc's older revision didn't mention), fixed, 480 px max width centred:
**Today · Log · Routine · Goals · Study · Library · Setup**. Active tab is accent; inactive is
`text` at 60%. Icon above a 10 px label.

A persistent header sits above the content: ensō mark, "Kata" at 19 px semibold, and today's
date right-aligned in 11 px uppercase at 50% opacity.

Content area: `padding: 6px 20px 112px` — the bottom padding clears the fixed tab bar.

See `Kata.dc.html` directly for the exact markup/behaviour of every screen — it is complete and
literal. The high-level shape of each screen (for orientation before reading the source):

1. **Today** — daily check-in. Default/Project segmented mode. Today's rotation (ensō toggles),
   add-one-more-for-today chips, goal-check bottom sheet, daily anchors (ear/Japanese/strength)
   with the word-of-the-day panel nested in Japanese, today's tasks checklist, "Log a session".
2. **Log** — new-entry form (date, activity, minutes, working-toward link, optional shakuhachi
   routine + licks sub-form, what-worked/where-stuck), weekly summary strip, sort/filter, session
   cards (quick-log fill-in, delete, disclosure for "where stuck"), JSON/CSV export.
3. **Routine** — Current-week/Thursdays-blocked segmented variant, Week-strips/Day-list view
   toggle, the 7-column grid (tap to quick-log, ± slot stepper), coverage panel, morning-block
   minute fields, strength-day toggles, rotation settings + repeating-task list.
4. **Goals** — area filter chips, new-goal form, project cards (progress bar, steps), long-term
   goals grouped under instrument subheadings, archived section.
5. **Study** — see the fidelity note above: two link-cards + an embeddable Google Form iframe.
6. **Library** — character search across everything; with no query, per-instrument detail:
   stats grid, 8-week sparkline, and six collapsible sections (goals, projects, tasks, words,
   stuck notes, finished-and-when).
7. **Setup** — instrument list (rename/delete/add, hue swatch picker, rotate toggle), routine
   step editor per instrument, goal editor (area, instruments, steps), and a reset-to-defaults
   control.

---

## Interactions & behaviour

**Ensō toggle.** Tapping marks the activity done for today without creating a session. An
activity also reads as done if a session exists for it today — the check is
`explicit tick OR session logged`.

**Step cycling.** `not started → in progress → done → not started`. Entering *done* writes
`stepDates[stepId] = today`; leaving it deletes the stamp. Visual states: dashed 3-3 stroke at
32% (not started), solid accent stroke (in progress), accent fill (done, label drops to 42%).

**Goal check sheet.** Opens from Today. A backdrop at 42% `#201f1d` and a bottom sheet
(`max-height: 76vh`, scrollable, `shadow-lg`) listing goals and projects whose instruments
intersect today's rotation. Each shows a dot, name, "Goal · instruments", progress, and its
steps as tappable rows. Steps written here are the same writes as the Goals screen — a tick
stamps the date and surfaces in Library. Backdrop tap and close button both dismiss. Rows with
no steps are omitted.

**Time-band quotation.** The featured quotation is chosen by date *and* hour. Notable dates
pin a specific quote; otherwise the current time band narrows the pool and the day of year
picks within it. Crossing a band boundary therefore brings up a *different* quotation, not a
reworded one. A 60-second interval re-renders so the band changes live.

**Rotation slot padding.** When a day's slot count exceeds its stored plan, the extra slots
fill from the staleness order, **skipping any instrument already on that day**. Falls back to
the modulo pick only if the pool is exhausted.

**Sheet pull.** `GET` the published CSV, find the header row by looking for "Work / Piece"
within the first six rows (the sheet has two banner rows above its headers), map columns by
name, then merge on `Ref ID` falling back to lower-cased title. Sheet values win for the
columns it carries; local-only fields (instrument, goal binding) survive; items not in the
sheet are kept. Failure shows the publish instructions rather than a raw error.

**Sheet push.** Optional. `POST` to an Apps Script endpoint with `mode: 'no-cors'`. Items
queue in local state and the count is shown; a manual flush retries.

**Transitions.** There are none beyond the chevron rotations and the disclosure expansions.
The design is deliberately still. `prefers-reduced-motion` disables what little exists.

**Empty states.** Every list has one, written specifically — "Nothing marked done for this one
yet. Finish a step in Goals and it lands here with the date." Carry these over verbatim; they
teach the model of the app.

---

## State

All of it is client-side, persisted to one `localStorage` key (`kata_state_v2`) written on
every mutation. Nothing is fetched except the study sheet CSV / the optional push endpoint.

Read `Kata.dc.html`'s `state = {...}` block and every method on `class Component extends
DCLogic` — that is the literal, complete state shape and mutation set to port. Do not
genericise or simplify field names; keep them identical so behaviour stays traceable to spec.

**Migration note.** The prototype has no schema versioning beyond the key name. A real
migration strategy is out of scope for this pass, but keep the key name (`kata_state_v2`) and
leave a version field / migration hook so one can be added later without breaking existing
users' data.

---

## Content

**Japanese quotations.** 35 entries, each a real, attributed passage from a **public-domain**
work — Bashō, Sei Shōnagon, Kamo no Chōmei, Yoshida Kenkō, Zeami, Dōgen, Musashi, Ki no
Tsurayuki, the Man'yōshū, Ryōkan, Issa, Buson, Sōseki, Ōgai, Shiki, Takuboku, Yosano Akiko,
Higuchi Ichiyō, Miyazawa Kenji, Akutagawa, Takamura Kōtarō, Nakahara Chūya, Dazai, Shimazaki
Tōson, Ii Naosuke. Each carries the original, romaji, an English translation, author, work,
year, theme, a featured word drawn from the passage, and the time bands it suits.

**This content is the app's voice — carry it across verbatim, copied directly out of
`Kata.dc.html`'s `QUOTES` array (and `SEKKI`, `NOTABLE`, `TIME_CHUNKS`).** Do not paraphrase or
invent replacements.

**Seed data.** Six goals, five projects, six repeating tasks, four study items, and a generated
8-week session history — all defined as constants near the top of the `<script type="text/x-dc">`
block in `Kata.dc.html` (before the `class Component` definition). Copy them verbatim into the
new app's data module. Keep them for development; gate them behind a first-run flag in
production (only seed `localStorage` on first run, same as the prototype's `componentDidMount`).

---

## Assets
None. No images, no bitmaps, no fonts to bundle beyond the two Google Fonts
(Cormorant Garamond, Lora), loaded the same way the design system does
(`@import url('https://fonts.googleapis.com/...')` in the stylesheet — acceptable to load from
Google Fonts CDN at runtime; the service worker should cache it after first load for offline).
Every mark is inline SVG — Lucide icon paths (copied from the prototype) plus the two ensō
variants described above. The sparkline and progress bars are hand-drawn SVG/CSS, not a chart
library.

---

## Deployment — the stated goal

The user wants this on an Android phone as a personal app, and wants the study list to reflect
edits made on a PC. The agreed path — updated for "no Node.js on this machine":

1. Build as an installable **PWA** with hand-written `manifest.json` (`display: standalone`,
   portrait, `theme_color: #f3f2f2`, 192/512 px + maskable icons — already generated at
   `public/icons/`) plus a hand-written cache-first `sw.js` service worker so it opens with no
   signal. No bundler: plain `<script type="module">` entry points, native ES module imports
   between files (works in all modern browsers with no build step).
2. Host on **GitHub Pages** or any static host. No server needed, no `npm run build` step —
   the repo IS the deployable artifact.
3. Install via Chrome → *Add to Home screen*.
4. Study list syncs by reading the **published CSV** of the Study Queue tab (per the fidelity
   note above, wire the fetch/parse logic in the state module even though the UI for showing
   parsed items isn't built yet — future-proofing, not extra UI work).

Data lives in device storage and is per-device until the sheet connection is used. Clearing
site data destroys it. The JSON export in the Log screen is the only backup path — keep it
working.

## Files in this reference bundle
- `Kata.dc.html` — the complete prototype: all six/seven screens, all logic, all content
  (seed data, quotations, sekki, notable dates). This is the literal executable spec.
- `support.js` — the authoring-environment runtime that made the prototype interactive
  (parses `<x-dc>`/`{{ }}`/`sc-if`/`sc-for` and mounts a React component). Reference-only,
  to help decode the template semantics — do not ship this file or its runtime.
- `design-system.css` — the Classical design system's tokens + component classes (verbatim).
- `design-system-readme.md` — the Classical design system's own usage guide (verbatim).

## Open work
- Apps Script write endpoint (two-way study sync) — stub, don't build a UI for it yet.
- No tablet or desktop breakpoint (keep centered 480px column).
- No schema migrations; no backup beyond manual JSON export.
