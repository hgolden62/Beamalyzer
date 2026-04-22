# Beamalyzer

### ▶︎ [Try the live demo — hgolden62.github.io/Beamalyzer](https://hgolden62.github.io/Beamalyzer/)

Interactive steel W-shape analyzer per **AISC 360-22**, ASD method. Pick a section, set span, load, and support condition, and see live flexural and deflection demand/capacity ratios, smart sizing suggestions, and a photoelastic isochromatic stress field alongside moment, shear, and deflection diagrams. Exports a full calculation PDF.

## Features

- **35 W-shapes** from AISC *Steel Construction Manual*, 16th Edition, Table 1-1 (W8×10 through W24×103)
- **Loading cases**: uniform distributed load, point load at midspan (or free end for cantilevers), two equal point loads at third-points
- **Support conditions**: simply supported, fixed-fixed, cantilever
- **Live calculations**: M<sub>max</sub>, V<sub>max</sub>, δ<sub>max</sub>, σ<sub>max</sub> (extreme fiber), M<sub>n</sub> = F<sub>y</sub>·Z<sub>x</sub>, M<sub>a</sub> = M<sub>n</sub>/Ω<sub>b</sub> (Ω<sub>b</sub> = 1.67), V<sub>n</sub> = 0.6·F<sub>y</sub>·A<sub>w</sub>, V<sub>a</sub> = V<sub>n</sub>/Ω<sub>v</sub> (Ω<sub>v</sub> = 1.5)
- **Four visualizations** from the same underlying stress state:
  - Bending moment diagram with peak callout
  - Shear diagram with peak callout
  - Exaggerated deflected-shape overlay
  - Photoelastic isochromatic fringe field (σ = M·y/I mapped to cyclic HSL hue)
- **Pass/fail checks** for flexure (Ch. F), shear (Ch. G), and deflection, with demand/capacity ratios, overall verdict, and an efficiency meter
- **Smart suggestions**: recommends the next-larger section when the current one fails, or a lighter one when overdesigned (DCR < 0.4)
- **Unit toggle**: Imperial (kip, ft, in, ksi) ↔ Metric (kN, m, mm, MPa)
- **PDF export**: 3-page engineering report with inputs, results table, all four diagrams, full section properties, and the equation chain with substituted values

## Tech Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Motion (animations)
- jsPDF (PDF export)
- SVG-based stress visualization (no canvas / no shaders)

## Getting Started

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default).

## Build

```bash
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build locally
```

## Project Structure

```
src/
  App.tsx                 Main UI, two-column liquid-glass layout
  PhotoelasticBeam.tsx    SVG beam visualization (all four views)
  calc.ts                 AISC 360-22 ASD calculations + unit conversion
  sections.ts             W-shape section properties from AISC Table 1-1
  export.ts               jsPDF report generator
  index.css               Tailwind + custom glass styling
```

## Design Assumptions

The calculations use standard simplifying assumptions that are documented in the UI footer:

- **Compact section** — no flange or web local-buckling checks
- **Full lateral bracing** (L<sub>b</sub> = 0) — no lateral-torsional buckling check
- **A992 steel** only — F<sub>y</sub> = 50 ksi, F<sub>u</sub> = 65 ksi, E = 29,000 ksi
- **ASD** — no LRFD load factors
- **Shear check** per AISC 360-22 Ch. G (Eq. G2-1) with A<sub>w</sub> = d·t<sub>w</sub>, C<sub>v1</sub> = 1.0, and Ω<sub>v</sub> = 1.5. All catalog W-shapes satisfy h/t<sub>w</sub> ≤ 2.24·√(E/F<sub>y</sub>) ≈ 53.9.
- **Self-weight of the beam is not added** to the applied load
- For cantilevers, the "point load" case is applied at the **free end** (not midspan)

### Supported support / load combinations

| Support | UDL | Point @ mid / tip | Two loads @ third-points |
| --- | :-: | :-: | :-: |
| Simply supported | ✓ | ✓ (midspan) | ✓ |
| Fixed-fixed | ✓ | ✓ (midspan, exact PL/8) | ✓ (exact 2PL/9) |
| Cantilever | ✓ | ✓ (free end) | — (disabled; not a standard config) |

Closed-form solutions are taken from Roark / AISC *Beam Formulas*; all cases are exact (no UDL approximation of point loads).

## References

- AISC 360-22, *Specification for Structural Steel Buildings*
- AISC *Steel Construction Manual*, 16th Edition, Table 1-1 (W-Shapes)

## License

MIT
