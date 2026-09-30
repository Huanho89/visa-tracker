# Design System: US Visa Tracker (Playful Neo-Brutalist / Editorial Light)

## 1. Visual Theme & Atmosphere
A modern, playful editorial interface inspired by neo-brutalism and clean minimal print. The layout is clean and airy, with thin dark borders, high corner rounding, and strong typographic contrast. Colored illustrations on dark backgrounds pop against a light gray canvas.

- **Density:** Balanced & Breathable (4/10) - Generous whitespace to highlight typographic elements and structured cards.
- **Variance:** High Offset Asymmetric (7/10) - Playful placement of decorative asterisks (`*`), offset cards, and inline pill wrappers inside text.
- **Color Mode:** Light Mode
- **Canvas Background:** Pale Slate Gray (#f2f2f3)

## 2. Color Palette & Roles
- **Canvas Gray** (#f2f2f3) — Main body background
- **Pure White** (#ffffff) — Core surface containers, light mode cards
- **Obsidian Black** (#0c0c0d) — Dark contrast surfaces, primary text, buttons, and illustration card backgrounds
- **Muted Charcoal** (#52525b) — Subtext, helper details, non-selected tabs
- **Accent Border** (#18181b) — Strict 1px thin dark borders for containers
- **Electric Accent** (#3b82f6) — Singular blue accent for progress timeline highlights and active states
- **Success Mint** (#10b981) — Completed milestones, "Current" visa bulletin alert status
- **Warning Amber** (#f59e0b) — Urgency indicators (<30 days till priority date becomes current)

## 3. Typography Rules
- **Display & Headlines:** Be Vietnam Pro — Bold, geometric sans-serif with perfect native support for Vietnamese diacritics. Tight letter-spacing (-0.02em), heavy weights (700-800) for visual impact.
- **Body & Labels:** Be Vietnam Pro — Regular, geometric sans-serif. Leading is set to 1.5, maximum line length is 65ch.
- **Mono Data:** JetBrains Mono — For dates, countdown numbers, case IDs, and technical logs.
- **Styling Feature:** Inline pill outlines. Enclose key action words in text within pill outlines (e.g. `(kiểm tra)` or `(thông báo)`) using `border: 1px solid #18181b; border-radius: 999px; padding: 2px 10px; display: inline-block;`.
- **Banned:** Emojis (except specific flags like 🇺🇸 in headers), Inter, Outfit, default system serif fonts.

## 4. Component Stylings
- **Bilingual Terminology:** All English technical terms and abbreviations must have clear Vietnamese explanations or subtitles directly below or next to them (e.g. "Priority Date (Ngày ưu tiên)", "USCIS (Sở Di Trú Mỹ)").
- **Buttons (The Pill):** Highly rounded pill-shape (999px). Primary buttons are solid `Obsidian Black` (#0c0c0d) with white text and an arrow icon (`→`). Hover state translates the button -2px. Secondary buttons are `Pure White` (#ffffff) with a 1px `Accent Border` (#18181b) and black text.
- **Containers & Cards:** Clean, rounded rectangles with `border: 1px solid #18181b` and `border-radius: 2rem (32px)`.
- **Illustration Cards:** Smaller contrast cards with pure black (#0c0c0d) backgrounds. The illustration must contain clear visual metaphors for each stage (e.g., checking off a certificate stamp for USCIS, processing official case number envelopes for NVC, and stamping a visa into a passport for the Interview stage), with Vietnamese characters/motifs.
- **Visa Bulletin Table:** A high-contrast grid/table displaying the current status of all major visa categories (F1, F2A, F2B, F3, F4). No vertical lines, subtle horizontal dividers in Muted Charcoal. Includes a "Last Updated: dd/mm/yyyy" label at the top-right of the card. Monospaced dates (JetBrains Mono) for clarity.
- **Steps Timeline:** Clean vertical line with circular node indicators. Active steps highlight in `Electric Accent`, completed steps in `Success Mint` with a checkmark, and pending steps in `Muted Charcoal`.
- **Trend Chart:** Sleek horizontal history bars showing the progression of the Visa Bulletin over time.
- **Decorative Accents:** Medium-sized line asterisks (`*`) and starbursts (`✦`) scattered as subtle graphic markers in empty spaces.

## 5. Layout Principles
- Landing page uses a large centered hero statement, flanked by playful asterisks.
- Split bento grid or side-by-side card layout below the hero: left side for the registration/Google Auth CTA, right side for the quick sandbox status check form.
- Outer container max-width: 1200px. Responsive collapse to single-column on screens < 768px.

## 6. Motion & Interaction
- Spring physics for transitions (stiffness: 150, damping: 15).
- Micro-movements: Slight rotation (2deg) on illustration cards on hover.
- Staggered mounting animations for the steps timeline to reveal milestones progressively.

## 7. Anti-Patterns (Banned)
- No oversaturated primary gradients.
- No heavy dark drop shadows (use thin borders instead).
- No generic 3-column feature list without structural borders.
- No purple or neon glow effects.
