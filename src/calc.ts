// Structural calculations per AISC 360-22, ASD method.
// All internal math runs in imperial units (kip, ft, in, ksi, in⁴).
// Unit conversion happens at the display layer only.

import type { WShape } from './sections'

export const Fy = 50      // A992 yield stress, ksi
export const E = 29000    // steel modulus of elasticity, ksi
export const OMEGA_B = 1.67

// AISC 360-22 Ch. G shear safety factors (ASD).
// Rolled I-shapes with h/t_w ≤ 2.24·√(E/F_y) get the stocky-web provision:
// C_v1 = 1.0, Ω_v = 1.5. Otherwise Ω_v = 1.67 (C_v1 still = 1.0 as long as
// h/t_w ≤ 1.10·√(5.34·E/F_y) ≈ 61.2, which all sections in this catalog satisfy).
export const OMEGA_V_STOCKY = 1.5
export const OMEGA_V_STD = 1.67
export const H_TW_STOCKY_LIMIT = 2.24 * Math.sqrt(E / Fy) // ≈ 53.95

export type LoadCase = 'udl' | 'point_mid' | 'third_points'
export type Support = 'simple' | 'fixed' | 'cantilever'

export type Inputs = {
  section: WShape
  L_ft: number          // span length, ft
  loadCase: LoadCase
  support: Support
  // For UDL this is w in klf (kip/ft). For point loads this is P in kips.
  loadMag: number
  deflectionLimit: number  // e.g., 360 for L/360
}

export type Results = {
  // Demand
  M_max_kipft: number       // magnitude (sign is carried by momentAt)
  V_max_kip: number         // magnitude
  delta_max_in: number
  // Capacity
  Mn_kipft: number      // nominal flexural strength
  Ma_kipft: number      // allowable flexural strength (ASD)
  Vn_kip: number        // nominal shear strength
  Va_kip: number        // allowable shear strength (ASD)
  omegaV: number        // shear safety factor actually applied (1.5 or 1.67)
  delta_allow_in: number
  // Ratios
  flexureDCR: number
  shearDCR: number
  deflectionDCR: number
  passes: boolean
  // Stress envelope (for viz)
  sigma_max_ksi: number
  // Moment/shear/deflection along the span, normalized x ∈ [0,1]
  momentAt: (xFrac: number) => number       // kip-ft (signed)
  shearAt: (xFrac: number) => number        // kip (signed)
  deflectionAt: (xFrac: number) => number   // in
}

// Helper: convert klf × ft² → kip-ft, etc.
export function analyze(inputs: Inputs): Results {
  const { section, L_ft, loadCase, support, loadMag, deflectionLimit } = inputs
  const { Ix, Zx, d } = section
  const L_in = L_ft * 12

  // Demand: max moment (kip-ft) + max shear (kip)
  let M_max_kipft = 0
  let V_max_kip = 0
  let momentAt: (x: number) => number = () => 0
  let shearAt: (x: number) => number = () => 0
  let deflectionAt: (x: number) => number = () => 0

  if (support === 'simple') {
    if (loadCase === 'udl') {
      const w = loadMag // klf
      M_max_kipft = (w * L_ft * L_ft) / 8
      V_max_kip = (w * L_ft) / 2
      // M(x) = w*L*x/2 - w*x²/2 ; in kip-ft with x in ft
      momentAt = (xf) => {
        const x = xf * L_ft
        return (w * L_ft * x) / 2 - (w * x * x) / 2 // kip-ft
      }
      shearAt = (xf) => w * (L_ft / 2 - xf * L_ft)
      // δ(x) = w*x*(L³ - 2*L*x² + x³) / (24*E*I), using consistent units
      // Convert: w→kip/in, x, L→in, E→ksi (kip/in²), I→in⁴ → δ→in
      const w_kpi = w / 12
      deflectionAt = (xf) => {
        const x = xf * L_in
        return (w_kpi * x * (Math.pow(L_in, 3) - 2 * L_in * x * x + Math.pow(x, 3))) / (24 * E * Ix)
      }
    } else if (loadCase === 'point_mid') {
      const P = loadMag
      M_max_kipft = (P * L_ft) / 4
      V_max_kip = P / 2
      momentAt = (xf) => {
        const x = xf * L_ft
        return x <= L_ft / 2 ? (P * x) / 2 : (P * (L_ft - x)) / 2
      }
      shearAt = (xf) => (xf < 0.5 ? P / 2 : -P / 2)
      // δ(x) for P at midspan, 0 ≤ x ≤ L/2: P*x*(3L² - 4x²)/(48*E*I)
      deflectionAt = (xf) => {
        let x = xf * L_in
        if (x > L_in / 2) x = L_in - x
        return (P * x * (3 * L_in * L_in - 4 * x * x)) / (48 * E * Ix)
      }
    } else {
      // third-points: two equal loads P at L/3 and 2L/3
      const P = loadMag
      M_max_kipft = (P * L_ft) / 3
      V_max_kip = P
      momentAt = (xf) => {
        const x = xf * L_ft
        if (x <= L_ft / 3) return P * x
        if (x <= (2 * L_ft) / 3) return (P * L_ft) / 3
        return P * (L_ft - x)
      }
      shearAt = (xf) => {
        if (xf < 1 / 3) return P
        if (xf < 2 / 3) return 0
        return -P
      }
      // δ_max at midspan: 23*P*L³ / (648*E*I)
      // For continuous curve, approximate a scaled shape
      const deltaMid = (23 * P * Math.pow(L_in, 3)) / (648 * E * Ix)
      deflectionAt = (xf) => {
        // sinusoidal approximation keyed to max at midspan
        return deltaMid * Math.sin(Math.PI * xf)
      }
    }
  } else if (support === 'fixed') {
    if (loadCase === 'udl') {
      const w = loadMag // klf
      M_max_kipft = (w * L_ft * L_ft) / 12 // at supports
      V_max_kip = (w * L_ft) / 2
      momentAt = (xf) => {
        // M(0)=M(L)= -wL²/12, M(L/2)= +wL²/24
        return ((w * L_ft * L_ft) / 12) * (6 * xf - 6 * xf * xf - 1)
      }
      shearAt = (xf) => w * (L_ft / 2 - xf * L_ft)
      const w_kpi = w / 12
      deflectionAt = (xf) => {
        const x = xf * L_in
        return (w_kpi * x * x * Math.pow(L_in - x, 2)) / (24 * E * Ix)
      }
    } else if (loadCase === 'point_mid') {
      const P = loadMag // kip
      M_max_kipft = (P * L_ft) / 8
      V_max_kip = P / 2
      momentAt = (xf) => {
        // M = -PL/8 + Px/2 on [0, L/2]; symmetric on the other half
        const x = (xf <= 0.5 ? xf : 1 - xf) * L_ft
        return -(P * L_ft) / 8 + (P * x) / 2
      }
      shearAt = (xf) => (xf < 0.5 ? P / 2 : -P / 2)
      deflectionAt = (xf) => {
        // δ(x) = P·x²·(3L − 4x)/(48EI) for 0 ≤ x ≤ L/2; mirror for x > L/2
        let x = xf * L_in
        if (x > L_in / 2) x = L_in - x
        return (P * x * x * (3 * L_in - 4 * x)) / (48 * E * Ix)
      }
    } else {
      // third_points: two equal loads P at L/3 and 2L/3
      const P = loadMag
      M_max_kipft = (2 * P * L_ft) / 9 // hogging at supports
      V_max_kip = P
      momentAt = (xf) => {
        const x = xf * L_ft
        if (x <= L_ft / 3) return P * x - (2 * P * L_ft) / 9
        if (x <= (2 * L_ft) / 3) return (P * L_ft) / 9
        const xm = L_ft - x
        return P * xm - (2 * P * L_ft) / 9
      }
      shearAt = (xf) => {
        if (xf < 1 / 3) return P
        if (xf < 2 / 3) return 0
        return -P
      }
      // δ_max = 5PL³/(648EI) at midspan; sinusoidal approximation for shape
      const deltaMid = (5 * P * Math.pow(L_in, 3)) / (648 * E * Ix)
      deflectionAt = (xf) => deltaMid * Math.sin(Math.PI * xf)
    }
  } else {
    // cantilever: fixed end at xf=0, free end at xf=1
    if (loadCase === 'udl') {
      const w = loadMag // klf
      M_max_kipft = (w * L_ft * L_ft) / 2 // magnitude at fixed end
      V_max_kip = w * L_ft
      momentAt = (xf) => {
        const x = xf * L_ft
        return -((w * Math.pow(L_ft - x, 2)) / 2)
      }
      shearAt = (xf) => w * (L_ft - xf * L_ft)
      const w_kpi = w / 12
      deflectionAt = (xf) => {
        const x = xf * L_in
        return (w_kpi * x * x * (6 * L_in * L_in - 4 * L_in * x + x * x)) / (24 * E * Ix)
      }
    } else {
      // Point load P at the free end. For cantilevers, `point_mid` is
      // interpreted as a tip load; `third_points` is not a standard
      // cantilever config and is disabled in the UI — treat any point
      // case as a tip load defensively.
      const P = loadMag
      M_max_kipft = P * L_ft // magnitude at fixed end
      V_max_kip = P
      momentAt = (xf) => {
        const x = xf * L_ft
        return -(P * (L_ft - x))
      }
      shearAt = () => P
      deflectionAt = (xf) => {
        const x = xf * L_in
        return (P * x * x * (3 * L_in - x)) / (6 * E * Ix)
      }
    }
  }

  // Deflection demand
  const delta_max_in = Math.abs(deflectionAt(support === 'cantilever' ? 1 : 0.5))

  // Flexural capacity: M_n = Fy * Zx (kip-in); convert to kip-ft
  const Mn_kipin = Fy * Zx
  const Mn_kipft = Mn_kipin / 12
  const Ma_kipft = Mn_kipft / OMEGA_B

  // Shear capacity — AISC 360-22 Ch. G, rolled I-shape.
  // A_w = d * t_w  (Eq. G2-1). V_n = 0.6·F_y·A_w·C_v1.
  // C_v1 = 1.0 holds for all catalog sections (max h/t_w = 56.8 < 61.2);
  // Ω_v depends on whether the web meets the stocky-web provision.
  const Aw = d * section.tw
  const Vn_kip = 0.6 * Fy * Aw // C_v1 = 1
  const omega_v = section.h_tw <= H_TW_STOCKY_LIMIT ? OMEGA_V_STOCKY : OMEGA_V_STD
  const Va_kip = Vn_kip / omega_v

  // Deflection allowed
  const delta_allow_in = L_in / deflectionLimit

  const flexureDCR = Math.abs(M_max_kipft) / Ma_kipft
  const shearDCR = Math.abs(V_max_kip) / Va_kip
  const deflectionDCR = delta_max_in / delta_allow_in
  const passes = flexureDCR <= 1.0 && shearDCR <= 1.0 && deflectionDCR <= 1.0

  // Max bending stress at extreme fiber (kip-in * in / in⁴ = ksi)
  const sigma_max_ksi = (Math.abs(M_max_kipft) * 12 * (d / 2)) / Ix

  return {
    M_max_kipft,
    V_max_kip,
    delta_max_in,
    Mn_kipft,
    Ma_kipft,
    Vn_kip,
    Va_kip,
    omegaV: omega_v,
    delta_allow_in,
    flexureDCR,
    shearDCR,
    deflectionDCR,
    passes,
    sigma_max_ksi,
    momentAt,
    shearAt,
    deflectionAt,
  }
}

// Unit conversion helpers for the display layer
export const toMetric = {
  kipft_to_kNm: (v: number) => v * 1.3558,
  kip_to_kN: (v: number) => v * 4.4482,
  in_to_mm: (v: number) => v * 25.4,
  ft_to_m: (v: number) => v * 0.3048,
  klf_to_kNm: (v: number) => v * 14.5939, // kip/ft → kN/m
  ksi_to_MPa: (v: number) => v * 6.8948,
  lbft_to_kgm: (v: number) => v * 1.4882,
}

export function formatNum(v: number, digits = 2): string {
  if (!isFinite(v)) return '—'
  if (Math.abs(v) >= 1000) return v.toFixed(0)
  if (Math.abs(v) >= 100) return v.toFixed(1)
  return v.toFixed(digits)
}
