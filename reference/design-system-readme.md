# Classical design system

Classical is an editorial, book-like system on a soft near-white ground: Cormorant Garamond headings over Lora body, justified columns, hairline rules, and color applied as stroke rather than fill. Surfaces stay quiet — cards are bordered, buttons are outlined — and photographs sit matted on the page like tipped-in plates.

## How to use this

- Link the one stylesheet from every page — `<link rel="stylesheet" href="styles.css">` (adjust the relative path) — and take every color, font, spacing, radius and shadow from its variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Never hard-code a hex, a font name or a px value the tokens already carry.
- Build with the classes below rather than inventing parallel ones; the component pages are plain HTML, so view source and copy the markup.
- The whole system was derived from `theme.json`. To change the look, edit the tokens at the top of `styles.css`.

## Direction

Editorial, justified body copy in columns. Tight leading; headlines flush-left over justified text blocks. Use hairline dividers (`var(--color-divider)`) between major sections. Apply color as borders, rules and underlines — not as filled blocks. Buttons are outlined (1px accent border on transparent), not solid-filled. Wrap hero and inline images in the `.plate` class — a warm archival grade inside a thin surface-colored mat, like a tipped-in book plate.

## Color

A light ground (`--color-bg` #f3f2f2) with `--color-text` #201f1d and a single accent #b68235 (this is a mono scheme: no second accent was chosen — the `--color-accent-2-*` variables carry a machine-derived stand-in kept only so both sets resolve; treat them as one role). Each role carries a 100–900 tonal ramp (`--color-neutral-100` … `--color-accent-2-900`) generated in OKLCH on a shared perceptual lightness scale, so the same step of any ramp has the same visual weight. Use the light steps (100–300) for tinted fills, hovers and subtle borders, 500 as the role's base, and the dark steps (700–900) for text on tinted fills and for pressed states; prefer ramp steps over ad-hoc `color-mix()`. For elevation use `--shadow-sm/md/lg` (already tuned to the ground) rather than ad-hoc box-shadows.

## Type

Cormorant Garamond for headings over Lora for body text, loaded as `--font-heading` / `--font-body`. Bold is avoided: interface headings cap at semibold (the `--font-heading-weight` token), and the bigger the text, the lighter it sets. Numbers set tabular wherever they stand as figures or columns (`"tnum"`) while running prose keeps its text figures.

## Icons

Use Lucide icons (https://lucide.dev) throughout.

## Interaction states

Interactive states are themed, never browser defaults: give every interactive element a `:hover` tint and a pressed state from the accent ramp (one step past the base — `--color-accent-600` on a light ground, `--color-accent-400` on a dark one, or a `color-mix()` tint for outlined/ghost variants), and style keyboard focus with `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never leave the default blue focus ring.

## Components

| Class | What it is |
| --- | --- |
| `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Actions — the primary is an accent outline, never a fill |
| `.tag` with `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Small labels tinted from the ramps (mono palette: accent-2 reads the same as accent) |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Form fields and choices on native elements — no script |
| `.card` with `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Bordered, unfilled content surfaces; elevation utilities |
| `.nav` + `.nav-brand` | The header bar |
| `.table` | Data tables with themed header and row rules |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | A modal at the top elevation |
| `.hr` | A hairline horizontal rule |
| `.plate` | The image wrapper |

States are built in: hovers and pressed states come from the accent ramp, keyboard focus is the 2px accent `:focus-visible` ring, `::selection` is an accent tint, and disabled controls drop to 45% opacity. Don't restyle them per page.

## Do

- Justify body copy at a comfortable measure and let the hairlines carry the structure.
- Draw with borders, rules and underlines; keep large fills off the page.
- Give text room — the spacing scale is airy (density 1.15×) by design.
- Mat photographs with the `.plate` wrapper so they read as plates, not banners.

## Don't

- Do not fill cards or buttons with solid accent color.
- Do not use heavy drop shadows — elevation here is a whisper.
- Do not tighten the leading or crowd the margins.
- Do not swap in a sans-serif for emphasis; weight and italics do that job.
