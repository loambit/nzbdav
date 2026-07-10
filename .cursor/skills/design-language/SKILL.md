---
name: design-language
description: NzbDav frontend design language and styling guidelines, derived from the dmbdb (Debrid Media Bridge Dashboard) project. Use when refactoring, restyling, or building any frontend UI — pages, components, buttons, cards, badges, forms, tabs, themes, colors, spacing, or typography in frontend/app.
---

# NzbDav Design Language

Visual and styling guidelines for the NzbDav frontend, modeled on the design language of [dmbdb](https://github.com/nicocapalbo/dmbdb). Apply these when refactoring or building UI in `frontend/app`.

## Core principles

1. **Dark-first.** Base canvas is `bg-gray-900` with `text-white`. Light and alternate themes are layered on top via CSS variables, never by rewriting components.
2. **Utility-first Tailwind.** Style with Tailwind utilities directly in markup. Extract shared component classes (buttons, dropdowns) into a global stylesheet with `@apply` only when reused in 3+ places.
3. **Semantic theme tokens.** All themeable colors flow through `--app-*` CSS custom properties set on `[data-appearance-theme='<name>']`. Components reference Tailwind utilities; the theme layer remaps them.
4. **Subtle depth via transparency.** Layering uses alpha-modified utilities (`bg-slate-700/40`, `border-slate-600/60`, `bg-white/10`) rather than new solid colors.
5. **Density with breathing room.** Compact controls (`text-xs`, `py-1`, `px-2`) inside generously spaced pages (`gap-8`, `p-4 md:px-8`).

## Theme token vocabulary

Every theme defines this exact set of variables (see [themes.css](themes.css) for all ~28 palettes):

| Token | Role |
|-------|------|
| `--app-bg` | Page background |
| `--app-bg-soft` | Slightly raised background |
| `--app-surface` | Cards, panels |
| `--app-surface-muted` | Hover states, secondary surfaces |
| `--app-panel-deep` | Inputs, insets, recessed panels |
| `--app-border` / `--app-border-soft` | Strong / subtle borders |
| `--app-text` / `--app-text-muted` / `--app-text-faint` | Text hierarchy (3 levels) |
| `--app-accent` / `--app-accent-hover` / `--app-accent-soft` / `--app-accent-contrast` | Primary action color, hover, translucent tint, text-on-accent |
| `--app-success` / `--app-warning` / `--app-danger` | Status colors |

Default dark palette: bg `#111827`, surface `#1e293b`, border `#475569`, text `#f8fafc`, muted `#cbd5e1`, faint `#94a3b8`, accent `#2563eb` (blue-600).

## Color semantics

- **Accent / interactive:** blue (`blue-400` text and links, `blue-500/600` fills, `focus:border-blue-500`). Active tab = `text-blue-400 border-blue-400`.
- **Status dots** (small `rounded-full` circles, `h-2 w-2` in lists, `w-3 h-3 md:w-4 md:h-4` on cards):
  - running/healthy → `bg-green-400` or `bg-emerald-400`
  - stopped/error → `bg-red-400` or `bg-rose-400`
  - degraded/unknown → `bg-yellow-400` or `bg-amber-400`
  - inactive → `bg-slate-500`
- **Action button intents:** start/save = green (`bg-green-500 hover:bg-green-600`), stop/delete = red (`bg-red-500 hover:bg-red-600`), restart = yellow (`bg-yellow-400 hover:bg-yellow-500`), apply/download = blue (`bg-blue-500 hover:bg-blue-600`).
- **Alerts:** tinted translucent panels, e.g. warning = `rounded border border-amber-600/50 bg-amber-500/10 text-amber-200 px-3 py-2 text-xs`.

## Surfaces and structure

- **Card:** `bg-gray-800 rounded-lg shadow-md p-2.5 md:p-3`, hover `hover:bg-gray-800/70`. Whole card may be clickable.
- **Panel / grouped section:** `rounded border border-slate-700/70` with an internal header row and `border-t` divider.
- **Sidebar:** fixed-width (`max-w-[250px]`), `bg-gray-900 border-r border-slate-800`, collapsible on mobile (overlays as `absolute`, toggle pinned bottom-left as a `rounded-full` tab).
- **Modal / overlay:** backdrop `fixed inset-0 z-50 bg-slate-900/80`; dialog `rounded border border-slate-700 bg-slate-900 shadow-xl max-w-xl`.
- **Ghost icon button:** `px-2 py-1.5 rounded bg-white/10 hover:bg-white/20`.
- **Badge / pill:** `text-[10px] px-1.5 py-0.5 rounded-full border border-slate-600/60 bg-slate-700/40 text-slate-200`; use `font-mono` for numeric metrics.

## Typography

- Page title: `text-4xl font-bold`, with optional subtitle `text-xs text-slate-400 mt-1`.
- Section heading: `text-xl font-semibold`. Sidebar/nav group: `text-lg font-bold`.
- Group micro-label: `text-[11px] uppercase tracking-wide text-slate-500`.
- Body/meta hierarchy: `text-white` → `text-slate-300` → `text-slate-400` → `text-slate-500`.
- Metrics and numbers: `font-mono`.

## Buttons

Reusable size classes (define once globally):

```css
.button-xsmall { @apply rounded-md py-1 px-2 text-xs; }
.button-small  { @apply rounded-md py-2 px-3 text-sm; }
.button-medium { @apply py-3 px-4 rounded-lg text-sm; }
.button-large  { @apply p-4 rounded-lg text-sm; }
.button-rounded{ @apply py-3 px-4 rounded-full text-sm; }
button:disabled { @apply opacity-60 cursor-not-allowed; }
```

- All buttons lay out as `flex items-center justify-center gap-2` (icon + label).
- Secondary/outline button: `button-small border border-slate-50/20` that fills accent-blue on hover.
- Icons inside buttons at explicit sizes: `!text-[18px]` (or 14–22px depending on density).

## Icons

Use **Material Symbols Rounded** (variable font, weight 300, `FILL 0` default; `FILL 1` for emphasized/filled states like play/stop). Size icons explicitly with `!text-[Npx]` rather than relying on the inherited font size. Icon names as text content, e.g. `play_arrow`, `refresh`, `expand_more`, `save`, `close`.

## Forms

- Input: `text-sm bg-transparent text-slate-200 rounded px-2 py-1 border border-slate-600 focus:border-blue-500 outline-none`.
- Select: `bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200` (or the `--app-panel-deep` token under themes).
- Checkbox rows: label left (`text-sm text-gray-400`), control right, `flex items-center justify-between py-1`.

## Tabs

Underline style: container `border-b border-gray-200/10`; each tab `flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 border-b-2 border-transparent rounded-t-lg text-slate-300 hover:text-blue-400 hover:border-blue-400 cursor-pointer`; active tab `!text-blue-400 !border-blue-400`; disabled `!text-slate-600 !cursor-not-allowed`. Tabs pair an icon with a label.

## Layout

- App shell: full-height (`h-dvh`) flex row — sidebar + `flex-1 min-h-0 overflow-y-auto` main pane. Guard flex children with `min-w-0`.
- Page container: `px-4 py-4 md:px-8` with `flex flex-col gap-8` between page-level blocks.
- Card grids: `grid grid-cols-1 lg:grid-cols-2 gap-4`.
- Mobile-first with `sm:`/`md:`/`lg:` steps; card internals stack on mobile (`flex-col`) and go horizontal at `sm:` (`sm:flex-row sm:items-center sm:justify-between`).

## Motion

- Standard transition: `transition-all ease-in-out duration-200`.
- Loading: `animate-spin` on a refresh/`cached` icon.
- Chevron rotation for expand/collapse: `rotate-180` toggle with `transform transition ease-in-out`.
- Hover micro-scale on grouped icons: `group-hover:scale-105`.
- Drag feedback: `opacity-75 scale-[0.99]`, `cursor-grab active:cursor-grabbing`.

## Scrollbars

Hide by default in dense panes (`.no-scrollbar`), or show a thin styled one (`.yes-scrollbar`: 6px wide, rounded accent-colored thumb).

## Applying themes

Set `data-appearance-theme="<name>"` on the document root. The theme layer in [themes.css](themes.css) remaps the standard utility classes (`bg-gray-900`, `bg-gray-800`, `text-slate-400`, `border-slate-700`, etc.) onto the `--app-*` variables with `!important`, so components written for the default dark palette automatically adapt. When adding new components, prefer the utility classes already covered by that mapping.

## NzbDav-specific notes

- The frontend is React Router 7 with Tailwind + CSS modules (not Vue/Nuxt). Express these patterns as Tailwind classes in JSX or as typed CSS modules — do not port Vue code.
- Prefer replacing Bootstrap-styled elements with these Tailwind patterns as screens are refactored; avoid mixing Bootstrap and this design language within one component.
- Run `npm run typecheck` in `frontend/` after styling refactors.
