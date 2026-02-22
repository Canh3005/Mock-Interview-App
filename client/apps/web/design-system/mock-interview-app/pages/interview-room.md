# Interview Room Page Overrides

> **PROJECT:** Mock Interview App
> **Generated:** 2026-02-22 20:57:25
> **Page Type:** General

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** 1. Hero with video background, 2. Key features overlay, 3. Benefits section, 4. CTA

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark overlay 60% on video. Brand accent for CTA. White text on dark.

### Component Overrides

- Avoid: Auto-play high-res video loops
- Avoid: Single large bundle
- Avoid: Only test on your device

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: Minimal glow (text-shadow: 0 0 10px), dark-to-light transitions, low white emission, high readability, visible focus
- Sustainability: Click-to-play or pause when off-screen
- Performance: Split code by route/feature
- Responsive: Test at 320 375 414 768 1024 1440
- CTA Placement: Overlay on video (center/bottom) + Bottom section
