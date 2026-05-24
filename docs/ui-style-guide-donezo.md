---
name: Emerald Clarity
colors:
  background: '#f3f6f2'
  shell: '#ffffff'
  card: '#ffffff'
  card-muted: '#f6f8f5'
  card-raised: '#ffffff'
  border: '#e3e9e1'
  border-strong: '#d4ddd2'
  text: '#0b1720'
  text-muted: '#51635a'
  text-subtle: '#7a897f'
  primary: '#14532d'
  primary-hover: '#0f3d24'
  primary-soft: '#e6f6ea'
  primary-text: '#14532d'
  danger: '#dc2626'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: '0'
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: '0'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.35'
    letterSpacing: '0'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: '0'
rounded:
  control: 12px
  card: 18px
  shell: 24px
  full: 9999px
spacing:
  page-padding: 24px
  section-gap: 24px
  card-padding: 24px
  row-gap: 12px
---

## Brand & Style

MockInterview uses a Donezo-inspired dashboard style: calm, polished, operational, and visually layered. Donezo is the reference for **composition, hierarchy, rhythm, spacing, card depth, and component polish**, not a palette to copy one-to-one.

The product must still feel like MockInterview: a focused AI interview practice workspace with technical credibility, clear progress signals, and restrained emerald accents.

The visual narrative is built on:
- **Productive Calm:** Quiet surfaces, clear active states, and low-noise dashboard density.
- **Visual Hierarchy:** Every screen needs a clear first read, usually a feature metric, primary action, or current workflow status.
- **Depth Through Layering:** App background, shell, cards, raised rows, chips, and featured cards must be distinguishable in both light and dark mode.
- **Organic Precision:** Soft geometry with strict alignment. Rounded corners should feel polished, not playful.

## Mode-Agnostic Style Logic

Light and dark mode must share the same style logic. Dark mode is not an inversion pass and light mode is not the only polished target.

Both modes must preserve:
- The same layout rhythm, grid proportions, spacing scale, type scale, radii, and elevation rules.
- The same layer order: app background -> shell surface -> card surface -> raised/muted rows -> featured elements.
- The same visual weight: one primary anchor per dashboard region, secondary cards quieter, list rows compact.
- The same interaction treatment: stable hover states, focus rings, icon button sizing, and chip density.

Only semantic token values change between modes. A card that feels raised in light mode must also feel raised in dark mode through border, tonal contrast, and shadow depth.

## Colors

Emerald remains the brand accent, but it should guide attention rather than dominate the UI.

- **Primary:** Use deep emerald for primary actions, active navigation, featured KPI cards, and progress indicators.
- **Surfaces:** Use semantic surfaces instead of raw gray classes: app background, shell, card, muted card, raised card.
- **Borders:** Borders should be visible enough to define structure, especially in dark mode, but never become high-contrast outlines.
- **Status:** Success and progress may stay in the emerald family. Warning/error states can use amber/red when they communicate real state.

## Typography

Use **Plus Jakarta Sans** for headings, labels, buttons, and body copy. It gives the product a softer, more premium dashboard feel than code-style headings.

- **Headlines:** Strong but not oversized. Page titles anchor the view; card titles stay compact.
- **Numbers:** KPI numbers are the strongest typographic element inside metric cards.
- **Labels:** Small labels should be medium or semibold and never rely on low contrast alone.
- **Monospace:** Reserve monospace for keyboard hints, IDs, code, or technical metadata.

## Layout & Spacing

The protected app uses a contained workspace shell: sidebar, topbar, and content canvas live inside a softly padded viewport.

- **Shell:** Sidebar and topbar are white/raised surfaces in light mode and elevated dark surfaces in dark mode.
- **Content Width:** Dashboard content should not stretch until every chart/card feels empty. Use a max-width container on large screens.
- **Grid:** Prefer 12-column composition for dashboard regions. Mix wide analytical cards, smaller KPI cards, and a right rail/action panel.
- **Rhythm:** Use 8px increments. Page sections should breathe, but dense operational rows should remain compact.

## Elevation & Depth

The app should not be flat. Use a combination of tonal layering, border, and soft shadow.

- **Level 0 App Background:** The outer workspace color.
- **Level 1 Shell:** Sidebar and topbar surfaces with subtle border and shadow.
- **Level 2 Cards:** Dashboard cards with visible but soft border and card shadow.
- **Level 3 Raised Rows/Controls:** Search, row cards, chips, dropdowns, and inputs.
- **Featured Elements:** One dark emerald card or prominent action region can create a visual peak.

Do not globally disable shadows inside the dashboard theme. Shadows must be subtle and mode-aware.

## Shapes

- **Shell Radius:** 24px.
- **Card Radius:** 18px to 22px.
- **Control Radius:** 12px to 14px.
- **Small Pills:** Fully rounded for chips, badges, and counters.
- **No Nested Card Stacks:** Avoid card-inside-card unless the child is a row, modal, repeated item, or actual control.

## Components

### Dashboard Shell
- Sidebar and topbar use the same surface/elevation system in light and dark.
- Active nav uses a soft fill plus a clear left indicator.
- Icon buttons use one stable square size and do not resize on hover.
- Profile, credit, language, notification, and theme controls align to the same vertical rhythm.

### KPI Cards
- The first or most important KPI should be a feature card.
- Secondary KPI cards are quieter: white/dark surface, icon tile, small change badge, large number.
- KPI cards must keep stable min-height and not shift when labels wrap.

### Analytical Cards
- Chart cards should use compact titles and enough inner padding to keep charts framed.
- Avoid large empty gray rectangles. If a chart is sparse, use stronger internal structure or adjacent detail.

### Lists And Rows
- Rows should be compact, raised slightly from the card surface, and separated by gaps instead of heavy dividers.
- Status chips should be small and quiet. They should support scanning without competing with primary actions.

### Inputs And Controls
- Search bars and filters use raised control surfaces with clear focus rings.
- Keyboard hints and metadata chips may use monospace, but should stay visually secondary.

## Dashboard Acceptance Checklist

- A viewer can identify the primary card/action in under one second.
- The page does not look flat in either light or dark mode.
- Cards have consistent padding, radius, title scale, and hover behavior.
- Content does not stretch awkwardly on 1440px or 1920px screens.
- Mobile and tablet layouts stack without overlap or clipped text.
- Dark mode preserves the same hierarchy as light mode.
- Buttons, chips, progress bars, and list rows keep stable dimensions across states.
