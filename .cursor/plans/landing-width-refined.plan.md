# Refined plan: Public landing shell (1536px) — no dashboard changes

## Goal

Replace the **1280px** (`max-w-7xl`) boxed shell on the **public landing page only** with a **single, wider, capped shell** so wide laptops see **smaller gutters at initial load**, without browser zoom. Navbar and all listed sections use the **same** shell and **same** horizontal padding so edges stay aligned.

## Non-goals

- Do **not** change UFP/UB admin dashboards, tables, modals, Login, or `tailwind.config.js` (unless you later prefer a named token; arbitrary `max-w-[1536px]` is enough).
- Do **not** change unrelated visual design (colors, typography, animations).

## Shared shell (exact classes)

Use this **repeated string** on every listed component’s primary width wrapper (see per-file notes for edge cases):

```text
w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10
```

`1536px` equals Tailwind’s `screen-2xl` / `max-w-screen-2xl`; using `max-w-[1536px]` matches the product owner’s explicit spec.

## Padding strategy (avoid double gutters)

Many sections today use **`px-4 sm:px-6 lg:px-8` on `<section>`** and **`max-w-7xl mx-auto` on an inner `<div>`** (padding only on section). If the inner shell **also** adds `px-4 … xl:px-10`, you must **remove horizontal padding from the outer `<section>`** (and equivalent outer wrappers) for that component, so padding lives **only once** on the shell div.

**Exception — Navbar:** Today padding is on the same div as `max-w-7xl`. Replace that one div’s classes so the shell includes `w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10` (no separate outer padding needed if the structure is a single inner content row).

## Files to edit (9 only)

| File | Role |
|------|------|
| [frontend/src/components/Navbar.jsx](frontend/src/components/Navbar.jsx) | Nav inner shell |
| [frontend/src/components/Hero.jsx](frontend/src/components/Hero.jsx) | Hero main wrapper |
| [frontend/src/components/StatsSection.jsx](frontend/src/components/StatsSection.jsx) | Stats inner shell |
| [frontend/src/components/PortalCovers.jsx](frontend/src/components/PortalCovers.jsx) | About/portal inner shell |
| [frontend/src/components/UniversitiesByDiscipline.jsx](frontend/src/components/UniversitiesByDiscipline.jsx) | Discipline section inner shell |
| [frontend/src/components/Institutions.jsx](frontend/src/components/Institutions.jsx) | Institutions inner shell |
| [frontend/src/components/NewsSection.jsx](frontend/src/components/NewsSection.jsx) | News inner shell |
| [frontend/src/components/HowItWorks.jsx](frontend/src/components/HowItWorks.jsx) | Outer section shell only |
| [frontend/src/components/Footer.jsx](frontend/src/components/Footer.jsx) | Both footer width wrappers |

**Not in scope:** [CTASection.jsx](frontend/src/components/CTASection.jsx), [LandingPage.jsx](frontend/src/pages/LandingPage.jsx) (unless adding `overflow-x-hidden` after verification — see below).

## Exact className replacements (mechanical)

### Constant A — shell (inner content column)

- **Find:** `max-w-7xl mx-auto` (when it is the main landing column; always add `w-full` if missing).
- **Replace with:** `w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10`

### Constant B — section outer horizontal padding (remove duplication)

Where the parent `<section>` (or equivalent) currently includes **`px-4 sm:px-6 lg:px-8`** and the child now uses Constant A:

- **Find on section:** `px-4 sm:px-6 lg:px-8`
- **Replace with:** remove those classes from the section (keep `py-*`, `bg-*`, `ref`, etc.). If removing leaves awkward spacing, use `px-0` only if needed — usually omitting horizontal padding is enough.

**Hero.jsx** — section line ~36:

- **Find:** `className="relative min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-8 pb-16"`
- **Replace with:** `className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-16"` (drop `px-4 sm:px-6 lg:px-8`; shell carries padding)

- **Find:** `className="relative z-10 max-w-7xl mx-auto w-full pt-4 pb-16"`
- **Replace with:** `className="relative z-10 w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-4 pb-16"`

**Navbar.jsx** — inner ~75:

- **Find:** `className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"`
- **Replace with:** `className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10"`

**StatsSection.jsx** — section ~22 has `px-4 sm:px-6 lg:px-8`; inner ~50:

- Strip section horizontal padding per Constant B.
- **Find:** `max-w-7xl mx-auto w-full`
- **Replace with:** `w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10` (drop duplicate `w-full` if result is `w-full w-full` — keep single `w-full`).

**PortalCovers.jsx**, **UniversitiesByDiscipline.jsx**, **Institutions.jsx**, **NewsSection.jsx** — same pattern: strip `px-4 sm:px-6 lg:px-8` from `<section>`, inner `max-w-7xl mx-auto` → Constant A (with any existing inner `w-full` merged).

**HowItWorks.jsx**

- Section ~35: `px-4 sm:px-6 lg:px-8` → remove (shell on child).
- **Find:** `className="max-w-7xl mx-auto"`
- **Replace with:** `className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10"`
- **Inner timeline** `max-w-6xl mx-auto` (~53): **leave unchanged** in the minimal patch (timeline readability); optional later widen to e.g. `max-w-[72rem]` if desired.

**Footer.jsx** — two blocks (~6 and ~112):

- **Find:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Replace with:** `w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10`

## `overflow-x-hidden` (conditional)

1. Implement shell + padding changes and test at **1920px** width with DevTools responsive mode.
2. If horizontal scrollbar appears (likely from **Hero** SVG / `foreignObject` / `overflow: visible` nodes), add **`overflow-x-hidden`** to **one** place only, preferably [frontend/src/pages/LandingPage.jsx](frontend/src/pages/LandingPage.jsx) root: `className="min-h-screen bg-slate-950 overflow-x-hidden"`.
3. If no scrollbar, **do not** add it (avoids clipping focus outlines or sticky subtleties).

## Hero SVG / network — risk notes

- The hero network uses a **large SVG `viewBox`**, fixed **hub coordinates**, and **`overflow: visible`** on parts of the tree. Widening the shell gives **more horizontal room** and usually **reduces** clipping risk; overflow issues more often appear on **narrow** widths.
- Risk is **horizontal scroll** or **1–2px bleed** at certain breakpoints if a node escapes the SVG box model.
- Mitigation order: (1) verify with responsive width sweep; (2) `overflow-x-hidden` on landing root only if needed; (3) only then consider narrowing `viewBox` or scaling — **out of scope** for minimal patch.

## Minimal patch strategy (order of work)

1. **Navbar** — single div replacement (fast visual check: nav aligns with hero below).
2. **Hero** — section padding strip + inner shell (critical path).
3. **Remaining sections** — same mechanical replace + strip section `px-*` in one pass per file.
4. **Footer** — both `max-w-7xl` rows.
5. **Build + manual test** — 1280, 1536, 1920; confirm no double padding (content should not look “extra inset”).
6. **Overflow** — add `overflow-x-hidden` on `LandingPage` only if step 5 shows horizontal scroll.

## Verification checklist

- [ ] Navbar left edge aligns with Hero text column left edge at `xl`.
- [ ] No horizontal scrollbar at common widths (unless pre-existing).
- [ ] No unintended changes under `frontend/src/pages/` except optional `LandingPage.jsx` overflow guard.
