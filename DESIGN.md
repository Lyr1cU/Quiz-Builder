# Quiz Builder Design System

Product UI for creating, sharing, and practicing quizzes. Refine the existing look — do not invent a new brand.

## Brand

- Name: **Quiz Builder**
- Logo: simple **lightbulb** icon (outline stroke), gold accent next to serif wordmark
- Tone: calm, editorial, focused — not playful cartoon, not purple SaaS defaults

## Color palette (keep close)

| Token | Hex | Use |
|-------|-----|-----|
| Navy | `#10131c` | Top nav, dark end of gradient |
| Navy deep | `#0c0e14` | Header backdrop |
| Cream | `#f4efe6` | Page base / light end of gradient |
| Cream soft | `#faf7f2` | Soft surfaces |
| Ink | `#1a1d27` | Primary text on cream |
| Muted | `#6b6570` | Secondary text |
| Gold from / to | `#b8954a` → `#8a6a32` | Primary CTA gradient |
| Teal | `#1f5c57` | Secondary / success actions |
| Danger | `#9b3a3a` | Destructive |
| Card | `#ffffff` | Content cards |
| Line | `#e8e2d8` | Borders |

## Page shell

- Full-viewport diagonal gradient: navy → mid slate → warm taupe → cream (`135deg`, fixed attachment).
- Content sits in a centered column (~max-width 64rem), cream-readable surfaces on the lighter part of the gradient.
- Do **not** replace with flat purple, flat white-only, or dark-only backgrounds.

## Typography

- Display / headlines: elegant serif (Cormorant Garamond / EB Garamond family), semibold–bold, tight tracking.
- Body / UI: Source Sans 3 (or close humanist sans), regular–semibold.
- Page titles are large and calm; one short supporting line under heroes.

## Shape & controls

- Primary buttons: **pill** (`rounded-full`), gold vertical gradient, white label, soft gold shadow.
- Secondary: teal filled or ghost on dark nav.
- Text fields & selects: **pill** radius, cream/white fill, subtle line border; focus ring soft gold.
- Cards: white, ~1.25rem radius, soft navy-tinted shadow; interactive cards lift slightly on hover.
- Avoid sharp rectangles for CTAs; avoid purple/indigo accents.

## Layout patterns

- Dark translucent nav bar with lightbulb + wordmark left; links right; gold underline on active.
- Page hero: serif title + short subtitle; primary gold CTA when needed.
- Lists: stacked white cards with title, meta, and action row.
- Forms: labeled pill inputs, generous spacing, primary submit as gold pill.
- Quiz play: one question focus, clear option chips/rows, progress hint, gold Continue.

## Motion (subtle)

- Fade-up on page enter (~0.4s).
- Button press: slight lift on hover, settle on active.
- No heavy glow, no confetti, no bouncing mascots.

## Hard constraints

- No purple / indigo default Material look.
- No flat white page without the navy→cream gradient shell.
- Keep lightbulb logo and gold primary CTAs.
- Desktop-first web app chrome (~1280–1440 artboard), usable on mobile.
