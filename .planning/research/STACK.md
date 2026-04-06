# Stack Research

**Domain:** Design system implementation — font loading, CSS animations, Tailwind v4 token migration
**Researched:** 2026-04-06
**Confidence:** HIGH

---

## Context

This research covers ONLY the new capabilities required for the v2.0 Glyph Finance implementation milestone. The existing stack (Next.js 16.2.2, React 19.2.4, Tailwind CSS 4.2.2, Prisma 7, Recharts, Zod v4, Vitest, npm) is validated and working in v1.0.

**No new npm packages are needed.** The three capability areas — font loading, CSS animations, and @theme token swap — are all handled by tools already installed.

---

## Recommended Stack

### Core Technologies (unchanged)

| Technology | Installed Version | Role in Glyph Finance |
|------------|------------------|-----------------------|
| Next.js | 16.2.2 | `next/font/local` for Satoshi, `next/font/google` for IBM Plex Mono |
| Tailwind CSS | 4.2.2 | `@theme` block replacement, `@keyframes` inside `@theme` for animate-* utilities |
| React | 19.2.4 | `key` prop re-mount trick for animation re-triggers |

---

## Capability 1: Font Loading

### Satoshi (body + headings)

Satoshi is NOT on Google Fonts. It is an Indian Type Foundry (ITF) exclusive distributed via [Fontshare](https://www.fontshare.com/fonts/satoshi), free for personal and commercial use.

**Load method:** `next/font/local` with variable font file.

Satoshi ships as a variable font (`Satoshi-Variable.woff2`) covering weights 300–900 in a single file. Use this rather than individual weight files — one network request, smaller total bytes.

**File placement:** `src/app/fonts/` — co-located with `layout.tsx`. Next.js automatically serves files from `src/app/` with optimal cache headers and preloads the font.

```typescript
// src/app/layout.tsx
import localFont from 'next/font/local'

const satoshi = localFont({
  src: [
    {
      path: './fonts/Satoshi-Variable.woff2',
      weight: '300 900',
      style: 'normal',
    },
    {
      path: './fonts/Satoshi-VariableItalic.woff2',
      weight: '300 900',
      style: 'italic',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})
```

**Manual download step (not npm):**
1. Go to https://www.fontshare.com/fonts/satoshi
2. Download the font package
3. Copy `Satoshi-Variable.woff2` (and optionally `Satoshi-VariableItalic.woff2`) to `src/app/fonts/`

### IBM Plex Mono (financial numbers)

IBM Plex Mono IS on Google Fonts. `next/font/google` handles download, self-hosting, and preloading automatically at build time.

IBM Plex Mono does not have a variable font on Google Fonts — load specific weights (400, 600, 700) as declared in the STYLE_GUIDE.

```typescript
// src/app/layout.tsx
import { IBM_Plex_Mono } from 'next/font/google'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})
```

### Applying Both Fonts in RootLayout

```tsx
// src/app/layout.tsx — html tag
<html
  lang="es"
  className={`${satoshi.variable} ${ibmPlexMono.variable} h-full antialiased`}
>
```

This injects `--font-satoshi` and `--font-ibm-plex-mono` as CSS custom properties on the `<html>` element at runtime.

---

## Capability 2: Tailwind v4 @theme Font Variable Integration

Tailwind v4 has two `@theme` variants with different behaviors:

| Directive | When to Use | Why |
|-----------|-------------|-----|
| `@theme { }` | Static tokens (colors, radii, shadows) | Tailwind resolves values at build time, generates all utility classes |
| `@theme inline { }` | Tokens that reference CSS variables set at runtime | Emits `var(--x)` as-is instead of resolving; required for next/font |

next/font injects `--font-satoshi` onto `<html>` at JavaScript runtime. Tailwind's build-time `@theme` cannot see runtime values, so fonts MUST go in `@theme inline`.

**Pattern:**

```css
/* globals.css */

/* Static design tokens — Tailwind resolves these at build time */
@theme {
  --color-bg: #000000;
  /* ... all colors, radii, etc. */
}

/* Font references — next/font injects these at runtime */
@theme inline {
  --font-sans: var(--font-satoshi);
  --font-mono: var(--font-ibm-plex-mono);
}
```

This generates `font-sans` and `font-mono` utility classes that resolve to the correct font families at runtime.

---

## Capability 3: Replacing the @theme Block

The existing `@theme` block in `globals.css` uses v1.0 tokens (cyan accent, slate palette). The entire block must be swapped to Glyph Finance tokens (OLED black, chartreuse, desaturated category colors).

### Complete Token Rename Map

| Old Token | New Token | Old Value | New Value |
|-----------|-----------|-----------|-----------|
| `--color-bg-primary` | `--color-bg` | `#0a0f1a` | `#000000` |
| `--color-bg-card` | `--color-surface-elevated` | `#111827` | `#141414` |
| `--color-bg-card-hover` | `--color-surface-hover` | `#1a2332` | `#1A1A1A` |
| `--color-bg-elevated` | `--color-surface` | `#1e293b` | `#0A0A0A` |
| `--color-bg-input` | *(removed — underline inputs use transparent bg)* | `#0f172a` | — |
| `--color-border` | `--color-border-divider` | `#1e293b` | `#222222` |
| `--color-border-light` | *(removed)* | `#334155` | — |
| `--color-border-focus` | *(removed — focus uses --color-accent directly)* | `#22d3ee` | — |
| `--color-text-primary` | `--color-text-primary` | `#e2e8f0` | `#E8E8E8` |
| `--color-text-secondary` | `--color-text-secondary` | `#94a3b8` | `#999999` |
| `--color-text-muted` | `--color-text-tertiary` | `#64748b` | `#666666` |
| `--color-text-disabled` | `--color-text-disabled` | `#475569` | `#444444` |
| `--color-accent` | `--color-accent` | `#22d3ee` | `#CCFF00` |
| `--color-accent-hover` | `--color-accent-hover` | `#06b6d4` | `#B8E600` |
| *(new)* | `--color-accent-subtle` | — | `rgba(204,255,0,0.12)` |
| `--color-positive` | `--color-positive` | `#34d399` | `#00E676` |
| *(new)* | `--color-positive-subtle` | — | `rgba(0,230,118,0.12)` |
| `--color-negative` | `--color-negative` | `#f87171` | `#FF3333` |
| *(new)* | `--color-negative-subtle` | — | `rgba(255,51,51,0.12)` |
| `--color-warning` | `--color-warning` | `#fb923c` | `#FF9100` |
| *(new)* | `--color-warning-subtle` | — | `rgba(255,145,0,0.12)` |
| `--color-info` | `--color-info` | `#60a5fa` | `#448AFF` |
| *(new)* | `--color-info-subtle` | — | `rgba(68,138,255,0.12)` |
| `--color-cat-food` | `--color-cat-food` | `#fb923c` | `#C88A5A` |
| `--color-cat-services` | `--color-cat-services` | `#60a5fa` | `#7A9EC4` |
| `--color-cat-entertainment` | `--color-cat-entertainment` | `#a78bfa` | `#9B89C4` |
| `--color-cat-subscriptions` | `--color-cat-subscriptions` | `#f472b6` | `#C48AA3` |
| `--color-cat-transport` | `--color-cat-transport` | `#fbbf24` | `#C4A84E` |
| `--color-cat-other` | `--color-cat-other` | `#94a3b8` | `#8A9099` |
| *(new)* | `--color-dot-matrix` | — | `#1E1E1E` |
| `--radius-sm` | `--radius-sm` | `6px` | `8px` |
| `--radius-md` | `--radius-md` | `8px` | `12px` |
| `--radius-lg` | `--radius-lg` | `12px` | `16px` |
| `--radius-xl` | `--radius-xl` | `16px` | `24px` |
| *(new)* | `--radius-full` | — | `9999px` |
| `--shadow-sm` | *(removed — elevation via background-shift only)* | box-shadow | — |
| `--shadow-md` | *(removed)* | box-shadow | — |
| `--shadow-lg` | *(removed)* | box-shadow | — |
| `--shadow-glow` | *(removed)* | box-shadow | — |

### Component Impact of Token Renames

After swapping the `@theme` block, a grep-and-replace pass across all component files is required for these class name changes:

| Old Tailwind Class | New Tailwind Class |
|--------------------|--------------------|
| `bg-bg-primary` | `bg-bg` |
| `bg-bg-card` | `bg-surface-elevated` |
| `bg-bg-card-hover` | `bg-surface-hover` |
| `bg-bg-elevated` | `bg-surface` |
| `bg-bg-input` | `bg-transparent` |
| `border-border` | `border-border-divider` |
| `text-text-muted` | `text-text-tertiary` |
| `text-text-secondary` | `text-text-secondary` *(unchanged)* |
| `text-accent` | `text-accent` *(unchanged, value changes)* |
| `text-positive` | `text-positive` *(unchanged, value changes)* |
| `text-negative` | `text-negative` *(unchanged, value changes)* |
| `rounded-sm` → uses `--radius-sm` | *(value changes from 6px to 8px — visual only)* |
| `shadow-glow`, `shadow-md`, etc. | Remove — no shadows in Glyph Finance |

---

## Capability 4: CSS Animations

All three Glyph Finance signature animations are pure CSS. No animation library needed.

### Tailwind v4 @theme + @keyframes Pattern

Animations defined in `@theme` generate `animate-*` utility classes. The keyframe name and duration MUST be on the same line (a v4 formatting requirement — newlines between keyframe name and duration silently prevent generation).

```css
/* globals.css — inside @theme block */
@theme {
  /* Status dot: calm pulse, 2.5s cycle */
  --animate-status-pulse: status-pulse 2.5s ease-in-out infinite;
  @keyframes status-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }

  /* Pixel-dissolve: mechanical scanline reveal, 500ms */
  --animate-scanline-reveal: scanline-reveal 500ms steps(12, end) forwards;
  @keyframes scanline-reveal {
    0% { clip-path: inset(0 0 100% 0); }
    100% { clip-path: inset(0 0 0% 0); }
  }
}
```

This generates `animate-status-pulse` and `animate-scanline-reveal` utility classes for use in JSX.

### Dot-Matrix Texture (not an animation — CSS background-image)

The dot-matrix texture is a static SVG data URI background, applied via a CSS class defined outside `@theme`:

```css
/* globals.css — outside @theme */
.dot-matrix-bg {
  background-image: url("data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='0.75' fill='%231E1E1E' fill-opacity='0.4'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 8px 8px;
}
```

Apply via pseudo-element (`::before` with `position: absolute; inset: 0; pointer-events: none`) so it doesn't interfere with card content.

### Reduced Motion Override (accessibility — required)

```css
/* globals.css — outside @theme */
@media (prefers-reduced-motion: reduce) {
  .animate-scanline-reveal,
  .animate-status-pulse {
    animation: none;
    clip-path: none;
  }
}
```

### Re-triggering Scanline on Data Refresh

The pixel-dissolve animation must re-trigger when KPI data updates. CSS animations only replay on element mount. Use React's `key` prop — changing `key` forces unmount + remount, replaying the animation:

```tsx
// The key changes when data updates, forcing animation replay
<div key={dataRevision} className="animate-scanline-reveal">
  {formattedAmount}
</div>
```

`dataRevision` is an integer incremented with each data fetch. No animation library, no imperative DOM manipulation.

---

## Installation

**No new packages.** All capabilities use already-installed tools.

**Font files to download manually (not npm):**

```bash
# 1. Download Satoshi from https://www.fontshare.com/fonts/satoshi
# 2. Create the fonts directory
mkdir -p src/app/fonts
# 3. Copy these files into src/app/fonts/:
#    Satoshi-Variable.woff2
#    Satoshi-VariableItalic.woff2  (optional)
```

IBM Plex Mono: `next/font/google` downloads and self-hosts it automatically at build time — no manual step.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `next/font/local` for Satoshi | CDN `<link>` to fontshare.com | next/font self-hosts the font, adds preload hints, zero layout shift. CDN link adds third-party request and has no cache guarantees |
| `next/font/local` for Satoshi | `@font-face` in globals.css | Loses next/font automatic preloading, optimal font display, and build-time subsets |
| Variable font file for Satoshi | Individual weight .woff2 files (Regular, Bold, etc.) | Variable font = one HTTP request for all weights; individual files = multiple requests |
| `next/font/google` for IBM Plex Mono | Self-hosted IBM Plex Mono woff2 | No reason to self-host when Google Fonts has it and next/font handles the download automatically at build time |
| CSS `@keyframes` in `@theme` | `framer-motion` | framer-motion is 70KB+; all three required animations (pulse, scanline, dot-matrix) are trivially pure CSS |
| CSS `@keyframes` in `@theme` | `react-spring` | Same rationale — no animation library justified for three simple CSS animations |
| CSS `@keyframes` in `@theme` | `tailwind-animate` npm package | The package adds predefined animations; project needs specifically named custom animations. No value added |
| React `key` for animation re-trigger | JS class toggle via `ref` | Imperative DOM manipulation; the `key` approach is idiomatic React and avoids refs entirely |
| SVG data URI for dot-matrix | PNG file in `public/` | Data URI = no HTTP request, no public/ path concerns, works in SSR context without base URL issues |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `framer-motion` | 70KB bundle cost; not justified for three CSS animations | Native CSS `@keyframes` |
| `react-spring` | Same as framer-motion | Native CSS `@keyframes` |
| `tailwind-animate` | Predefined animations, not what the project needs | Custom `@keyframes` in `@theme` |
| Google Fonts `<link>` tag for Satoshi | Satoshi is NOT on Google Fonts — the link would 404 | `next/font/local` with downloaded woff2 |
| `@font-face` in globals.css for either font | Bypasses next/font optimization | `next/font/local` and `next/font/google` |
| Any CSS-in-JS library | Contradicts Tailwind v4 CSS-first approach | Tailwind utilities + globals.css |

---

## Version Compatibility

| Package | Installed | Notes |
|---------|-----------|-------|
| tailwindcss | 4.2.2 | `@theme` with `@keyframes` supported since v4.0. The keyframe-name-and-duration-on-same-line requirement is a v4 quirk — see PITFALLS.md |
| next | 16.2.2 | `next/font/local` variable fonts fully supported. `IBM_Plex_Mono` is available in `next/font/google` export |
| @tailwindcss/postcss | ^4 | Matches tailwindcss 4.x |
| react | 19.2.4 | `key` prop re-mount behavior unchanged from React 18 |

---

## Sources

- [Tailwind CSS v4 Animation Docs](https://tailwindcss.com/docs/animation) — `@theme` + `@keyframes` inside theme block, `--animate-*` naming convention. HIGH confidence (official docs, verified during research).
- [Next.js Font Optimization Docs](https://nextjs.org/docs/app/getting-started/fonts) — `next/font/local` array src, variable font weight range, CSS variable pattern. HIGH confidence (official docs).
- [Google Fonts — IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — Confirmed available; weights 400/600/700 exist; no variable font variant. HIGH confidence (direct source).
- [Fontshare — Satoshi](https://www.fontshare.com/fonts/satoshi) — Confirmed NOT on Google Fonts; free commercial license via ITF. HIGH confidence (direct source).
- [Tailwind v4 @theme vs @theme inline discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18560) — Explains why next/font variables require `@theme inline`. MEDIUM confidence (community discussion, aligns with observed behavior in existing globals.css).
- [Tailwind v4 keyframe formatting issue](https://github.com/tailwindlabs/tailwindcss/issues/16227) — Documents the same-line requirement for `--animate-*` + keyframe name in v4. MEDIUM confidence (GitHub issue, behavior seen in v4.2.x).
- WebSearch: Satoshi npm package — not available on npm; Fontshare direct download is the only legitimate source. HIGH confidence.

---

*Stack research for: Glyph Finance design system implementation (v2.0 milestone)*
*Researched: 2026-04-06*
