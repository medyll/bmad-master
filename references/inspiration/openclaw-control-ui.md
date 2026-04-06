# OpenClaw Control UI — Design Reference

**Captured:** 2026-04-06  
**Source:** OpenClaw Control UI (gateway status interface)  
**Image:** `openclaw-control-ui-screenshot.png` (to be added to this folder)

---

## Visual Characteristics

### Overall Impression
- **Perfect balance** — spacing, paddings, margins all feel intentional and calibrated
- **Vertical hierarchy** — alignment is precise, creating clear visual flow
- **Sobriety** — no decorative excess, pure functional elegance

### Typography
- **Font weights:** Multiple levels of bold used for hierarchy
  - Bold for primary labels/titles
  - Regular for body content
  - Light/muted for secondary information
- **Opacity levels:** Different opacity values create depth without color
  - Primary text: 100% opacity
  - Secondary text: ~60-70% opacity
  - Tertiary/muted: ~40-50% opacity

### Spacing & Layout
- **Paddings:** Generous, consistent internal spacing
- **Margins:** Clear separation between sections
- **Vertical rhythm:** Perfect gaps between elements
- **Alignment:** Precise vertical alignment throughout

### Shadows & Depth
- **Shadow philosophy:** Minimal to none
  - Most elements: no shadow
  - Some message types: extremely subtle shadow (barely perceptible)
- **Depth strategy:** Achieved through spacing and typography, not shadows

### Gradient Usage
- **Fade effect:** Subtle gradient at bottom of scrollable areas to indicate content continuation
  - Purpose: visual cue that more content exists below
  - Execution: very light, doesn't distract

### Color Strategy
- **Background:** Clean, neutral (white or near-white)
- **Borders:** Minimal, light gray when present
- **Accent:** Restrained, used only for status indicators

---

## Design Principles Extracted

1. **Whitespace is the primary design tool** — before adding style, add space
2. **Typography carries hierarchy** — weight + opacity, not color or size alone
3. **Shadows are exceptional** — default to none, add only when absolutely necessary
4. **Every pixel serves function** — no decorative elements
5. **Subtle cues over obvious ones** — gradient fade vs. scrollbar, opacity vs. color
6. **Consistency in spacing** — once a rhythm is set, maintain it throughout

---

## Application to BMAD Designer Role

When designing components or reviewing UI:

- **Study this reference** before starting any new component design
- **Match the spacing rhythm** — if existing UI uses 16px/24px/32px scale, continue it
- **Use opacity for hierarchy** — before reaching for color, try opacity variation
- **Question every shadow** — does this element actually need elevation?
- **Test vertical alignment** — are all elements in a row aligned on the same baseline?
- **Check fade indicators** — does scrollable content have a subtle fade cue?

---

## Notes for Implementation

- This aesthetic aligns with the "clean, airy, purposeful" philosophy in `designer.md`
- Reference this document when the user mentions "OpenClaw style" or "Control UI style"
- Screenshot should be saved in this folder for visual reference
