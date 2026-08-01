---
name: Vibrant Enterprise
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3b4b37'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6b7c65'
  outline-variant: '#b9ccb2'
  surface-tint: '#006e16'
  primary: '#006e16'
  on-primary: '#ffffff'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#00e639'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffd6a8'
  on-tertiary-container: '#895600'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stats-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

This design system balances the high-performance utility of business management with a lush, energetic aesthetic. It targets modern entrepreneurs who value both efficiency and visual delight. The style is **Modern Corporate with a Vibrant Edge**, blending a "pro-tool" foundation with high-chroma accents and soft, organic depth.

The UI evokes an emotional response of optimism and control. It uses **Glassmorphism-lite** for surface depth, allowing colorful background gradients to bleed through semi-transparent containers. The result is a "sundar" (beautiful) interface that feels premium, clean, and physically tactile without being overwhelming.

## Colors

The color strategy uses a high-contrast **Terminal Green (#00FF41)** as the primary functional driver. This color is reserved strictly for primary actions, success states, and critical growth indicators to maintain its visual "punch."

- **Primary:** Terminal Green is used for CTA buttons, toggle "on" states, and positive trend lines.
- **Backgrounds:** Use a clean, off-white (#F8FAFC) for the base layer to allow colorful components to pop.
- **Gradients:** Stat blocks and feature cards utilize soft, multi-stop gradients (Oceanic and Sunset) to categorize data visually and reduce cognitive load through color-association.
- **Glass Surfaces:** Transparent layers use a white tint (rgba(255, 255, 255, 0.7)) with a 20px background blur.

## Typography

The typography system relies on **Inter** to provide a highly legible, systematic foundation that anchors the more expressive color palette. 

- **Hierarchy:** Use heavy weights (700-800) for headlines and financial figures to ensure they remain the focal point.
- **Labels:** Small labels use uppercase with increased letter spacing to provide a professional, organized feel for metadata.
- **Numeric Data:** For financial tables and dashboards, ensure tabular lining is enabled to keep columns of numbers perfectly aligned.

## Layout & Spacing

The layout utilizes a **Fluid Grid** model optimized for high-density business information. 

- **Mobile:** A 4-column grid with 20px side margins and 16px gutters. Elements should primarily use full-width or 2-column spans.
- **Rhythm:** An 8px linear scale governs all padding and margins to maintain a tight, professional structure.
- **Density:** Group related inputs and data points with `sm` (8px) spacing, while separating distinct content sections with `xl` (32px) spacing to prevent visual clutter.

## Elevation & Depth

Hierarchy is established through **Glassmorphism-lite** and soft, tinted shadows rather than traditional grey drop shadows.

- **Level 1 (Base):** Flat surface, light grey border (#E2E8F0).
- **Level 2 (Cards):** 12% opacity shadow using the primary brand color or the dominant gradient color (e.g., a purple shadow for an Oceanic card).
- **Level 3 (Modals/Popovers):** High background blur (32px) and a subtle 1px white inner stroke to simulate a glass edge.
- **Interactions:** Upon press, cards should physically "lift" by increasing shadow spread and scaling by 1-2%.

## Shapes

The shape language is extremely approachable and friendly. We use **extra-large corner radii** to soften the "industrial" nature of business software.

- **Standard Containers:** Use `rounded-2xl` (1.5rem / 24px) for cards, modals, and main containers.
- **Action Elements:** Buttons and input fields use the same 24px radius to ensure a consistent silhouette.
- **Small Elements:** Chips and badges use a full "pill" radius for distinct categorization.

## Components

- **Buttons:** Primary buttons use the Terminal Green background with high-contrast Neutral (#0F172A) text. Shadow should match the green tint.
- **Stat Blocks:** These are the centerpiece. Use full-bleed color gradients with white text and `headline-lg` figures. Apply a `glass-lite` overlay for secondary information within the block.
- **Input Fields:** Thick 2px borders that turn Terminal Green on focus. Backgrounds are solid white or very light grey to ensure text clarity.
- **Chips:** Used for status tags. "Success" uses Terminal Green with 10% opacity background and 100% opacity text.
- **Cards:** Must have 24px rounded corners. Include a subtle "glass" shimmer effect on cards containing high-value financial data.
- **Icons:** Use multi-color, filled icons with a 2px stroke. Ensure icons used in "Terminal Green" areas are inverted to white or the neutral dark color.