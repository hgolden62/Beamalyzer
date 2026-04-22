import jsPDF from 'jspdf'
import type { WShape } from './sections'
import type { Results, LoadCase, Support } from './calc'
import { Fy, E, OMEGA_B, OMEGA_V, toMetric, formatNum } from './calc'

type Units = 'imperial' | 'metric'

type Params = {
  section: WShape
  L_ft: number
  loadCase: LoadCase
  support: Support
  loadMag: number
  deflectionLimit: number
  units: Units
  results: Results
}

// Rasterize an inline <svg> to a PNG data URL with a dark background,
// preserving its viewBox aspect.
async function svgToPng(svgEl: SVGSVGElement, scale = 2): Promise<string> {
  const vb = svgEl.viewBox.baseVal
  const w = vb.width || svgEl.clientWidth || 1100
  const h = vb.height || svgEl.clientHeight || 500
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no 2d ctx'))
      ctx.fillStyle = '#0a0e1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

function querySvg(id: string): SVGSVGElement | null {
  const host = document.getElementById(id)
  return host?.querySelector('svg') ?? null
}

export async function exportReport(p: Params): Promise<void> {
  const { section, L_ft, loadCase, support, loadMag, deflectionLimit, units, results } = p

  const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
  const PW = pdf.internal.pageSize.getWidth()   // 612
  const PH = pdf.internal.pageSize.getHeight()  // 792
  const M = 44 // margin

  const col = {
    primary: [15, 23, 42] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    accent: [14, 116, 144] as [number, number, number],
    rose: [190, 18, 60] as [number, number, number],
    green: [4, 120, 87] as [number, number, number],
    rule: [203, 213, 225] as [number, number, number],
  }
  const setColor = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2])
  const setDraw = (c: [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2])

  // jsPDF's built-in fonts only cover WinANSI/Latin-1. Any character above
  // codepoint 0xFF gets truncated to its low byte and renders as garbage
  // (e.g. σ → Ã, δ → ´, Ω → ©), which also blows out kerning and pushes
  // lines off the page. So we strip everything to ASCII before drawing.
  const ascii = (s: string) =>
    s
      .replace(/·/g, '*')
      .replace(/×/g, 'x')
      .replace(/÷/g, '/')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/⁴/g, '^4')
      .replace(/Ω/g, 'Omega')
      .replace(/σ/g, 'sigma')
      .replace(/δ/g, 'delta')
      .replace(/Δ/g, 'Delta')
      .replace(/β/g, 'beta')
      .replace(/φ/g, 'phi')
      .replace(/→/g, '->')
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/±/g, '+/-')
      .replace(/§/g, 'Sec.')
      .replace(/✓/g, '[PASS]')
      .replace(/✗/g, '[FAIL]')
      // scrub any remaining non-ASCII so nothing gets mangled
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '?')

  const text = (
    s: string,
    x: number,
    y: number,
    opts?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }
  ) => pdf.text(ascii(s), x, y, opts as never)

  // Formatting helpers (display units) — ASCII-only strings for PDF
  const fmt = {
    moment: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} kip-ft` : `${formatNum(toMetric.kipft_to_kNm(v))} kN-m`,
    shear: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} kip` : `${formatNum(toMetric.kip_to_kN(v))} kN`,
    deflect: (v: number) =>
      units === 'imperial' ? `${formatNum(v, 3)} in` : `${formatNum(toMetric.in_to_mm(v), 1)} mm`,
    length: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} ft` : `${formatNum(toMetric.ft_to_m(v))} m`,
    stress: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} ksi` : `${formatNum(toMetric.ksi_to_MPa(v))} MPa`,
  }

  // ────────── Page 1 — Header + Inputs + Results + Fringes ──────────
  let y = M

  // Title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(26)
  setColor(col.primary)
  text('Beamalyzer', M, y + 20)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  setColor(col.muted)
  text(
    `AISC 360-22  -  ASD  -  A992 Steel  -  Generated ${new Date().toLocaleString()}`,
    M,
    y + 36
  )
  y += 54

  // Horizontal rule
  setDraw(col.rule)
  pdf.setLineWidth(0.5)
  pdf.line(M, y, PW - M, y)
  y += 16

  // Inputs table
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  setColor(col.accent)
  text('INPUTS', M, y)
  y += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  setColor(col.primary)

  const loadUnit = loadCase === 'udl' ? (units === 'imperial' ? 'klf' : 'kN/m') : units === 'imperial' ? 'kip' : 'kN'
  const loadVal =
    loadCase === 'udl'
      ? units === 'imperial'
        ? loadMag
        : toMetric.klf_to_kNm(loadMag)
      : units === 'imperial'
      ? loadMag
      : toMetric.kip_to_kN(loadMag)
  const loadTypeName =
    loadCase === 'udl'
      ? 'Uniform Distributed'
      : loadCase === 'point_mid'
      ? 'Point Load @ Midspan'
      : 'Two Point Loads @ Third-Points'

  const supportName = support === 'simple' ? 'Simply Supported' : support === 'fixed' ? 'Fixed-Fixed' : 'Cantilever'

  const inputs: [string, string][] = [
    ['W-Shape', section.designation],
    ['Span (L)', fmt.length(L_ft)],
    ['Support Condition', supportName],
    ['Load Type', loadTypeName],
    ['Load Magnitude', `${formatNum(loadVal)} ${loadUnit}`],
    ['Deflection Limit', `L / ${deflectionLimit}`],
    ['Steel Grade', `A992 - Fy = ${Fy} ksi, E = ${E.toLocaleString()} ksi`],
    ['Safety Factors', `Omega_b = ${OMEGA_B} (flexure) / Omega_v = ${OMEGA_V} (shear)`],
  ]

  inputs.forEach((row, i) => {
    const cy = y + i * 16
    setColor(col.muted)
    text(row[0], M, cy)
    setColor(col.primary)
    text(row[1], M + 180, cy)
  })
  y += inputs.length * 16 + 10

  setDraw(col.rule)
  pdf.line(M, y, PW - M, y)
  y += 16

  // Results summary
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  setColor(col.accent)
  text('RESULTS', M, y)
  y += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)

  const results_rows: [string, string, string][] = [
    ['M_max (demand)', fmt.moment(results.M_max_kipft), ''],
    ['M_a  (allowable)', fmt.moment(results.Ma_kipft), ''],
    ['M_n  (nominal)', fmt.moment(results.Mn_kipft), ''],
    ['V_max (demand)', fmt.shear(results.V_max_kip), ''],
    ['V_a  (allowable)', fmt.shear(results.Va_kip), ''],
    ['V_n  (nominal)', fmt.shear(results.Vn_kip), ''],
    ['sigma_max (extreme fiber)', fmt.stress(results.sigma_max_ksi), ''],
    ['delta_max', fmt.deflect(results.delta_max_in), ''],
    ['delta_allow', fmt.deflect(results.delta_allow_in), ''],
    ['Flexure DCR', results.flexureDCR.toFixed(3), results.flexureDCR <= 1 ? 'PASS' : 'FAIL'],
    ['Shear DCR', results.shearDCR.toFixed(3), results.shearDCR <= 1 ? 'PASS' : 'FAIL'],
    ['Deflection DCR', results.deflectionDCR.toFixed(3), results.deflectionDCR <= 1 ? 'PASS' : 'FAIL'],
  ]

  results_rows.forEach((row, i) => {
    const cy = y + i * 15
    setColor(col.muted)
    text(row[0], M, cy)
    setColor(col.primary)
    text(row[1], M + 200, cy)
    if (row[2]) {
      setColor(row[2] === 'PASS' ? col.green : col.rose)
      pdf.setFont('helvetica', 'bold')
      text(row[2], M + 380, cy)
      pdf.setFont('helvetica', 'normal')
    }
  })
  y += results_rows.length * 15 + 8

  setDraw(col.rule)
  pdf.line(M, y, PW - M, y)
  y += 14

  // Overall verdict
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  setColor(results.passes ? col.green : col.rose)
  text(results.passes ? 'OVERALL: PASSES' : 'OVERALL: FAILS', M, y + 6)
  y += 22

  // Fringe image
  const fringesSvg = querySvg('export-svg-fringes')
  if (fringesSvg) {
    const png = await svgToPng(fringesSvg, 2)
    const imgW = PW - 2 * M
    const imgH = imgW * (500 / 1100)
    if (y + imgH + 20 > PH - M) {
      pdf.addPage()
      y = M
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setColor(col.accent)
    text('STRESS FRINGE VISUALIZATION', M, y)
    y += 10
    pdf.addImage(png, 'PNG', M, y, imgW, imgH)
    y += imgH + 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    setColor(col.muted)
    text(
      `Isochromatic fringe representation of sigma(x,y) = M(x) * y / Ix. Dark band marks the neutral axis; color cycles track increasing stress magnitude toward the extreme fibers.`,
      M,
      y + 8,
      { maxWidth: PW - 2 * M }
    )
  }

  // ────────── Page 2 — Diagrams ──────────
  pdf.addPage()
  y = M

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  setColor(col.primary)
  text('Diagrams', M, y + 14)
  y += 30

  for (const mode of ['moment', 'shear', 'deflection'] as const) {
    const svg = querySvg(`export-svg-${mode}`)
    if (!svg) continue
    const png = await svgToPng(svg, 2)
    const imgW = PW - 2 * M
    const imgH = imgW * (500 / 1100)

    if (y + imgH + 40 > PH - M) {
      pdf.addPage()
      y = M
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setColor(col.accent)
    text(
      mode === 'moment' ? 'BENDING MOMENT DIAGRAM' : mode === 'shear' ? 'SHEAR DIAGRAM' : 'DEFLECTED SHAPE',
      M,
      y
    )
    y += 8
    pdf.addImage(png, 'PNG', M, y, imgW, imgH)
    y += imgH + 22
  }

  // ────────── Page 3 — Calculations ──────────
  pdf.addPage()
  y = M

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  setColor(col.primary)
  text('Calculations', M, y + 14)
  y += 34

  // Section properties
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setColor(col.accent)
  text(`SECTION PROPERTIES - ${section.designation}`, M, y)
  y += 12

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const props: [string, string][] = [
    ['Depth, d', `${section.d} in`],
    ['Flange width, bf', `${section.bf} in`],
    ['Web thickness, tw', `${section.tw} in`],
    ['Flange thickness, tf', `${section.tf} in`],
    ['Area, A', `${section.A} in^2`],
    ['Weight', `${section.weight} lb/ft`],
    ['Ix', `${section.Ix} in^4`],
    ['Sx', `${section.Sx} in^3`],
    ['Zx', `${section.Zx} in^3`],
    ['rx', `${section.rx} in`],
    ['Iy', `${section.Iy} in^4`],
    ['ry', `${section.ry} in`],
  ]
  const propColW = (PW - 2 * M) / 3
  props.forEach((row, i) => {
    const c = i % 3
    const r = Math.floor(i / 3)
    const cx = M + c * propColW
    const cy = y + r * 14
    setColor(col.muted)
    text(row[0], cx, cy)
    setColor(col.primary)
    text(row[1], cx + 85, cy)
  })
  y += Math.ceil(props.length / 3) * 14 + 10
  setDraw(col.rule)
  pdf.line(M, y, PW - M, y)
  y += 14

  // Equation chain
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setColor(col.accent)
  text('EQUATIONS & SUBSTITUTIONS', M, y)
  y += 14

  pdf.setFont('courier', 'normal')
  pdf.setFontSize(9)

  const L_in = L_ft * 12
  const Mn_kipin = Fy * section.Zx
  const Mn_kipft = Mn_kipin / 12
  const lines: { text: string; color?: [number, number, number] }[] = []

  lines.push({ text: 'FLEXURAL STRENGTH  (AISC 360-22 Eq. F2-1, yielding)' })
  lines.push({ text: '  Mn = Fy * Zx' })
  lines.push({ text: `     = ${Fy} ksi * ${section.Zx} in^3 = ${Mn_kipin.toFixed(1)} kip-in` })
  lines.push({ text: `     = ${Mn_kipft.toFixed(1)} kip-ft` })
  lines.push({ text: '  Ma = Mn / Omega_b     (ASD, Sec. B3.2)' })
  lines.push({ text: `     = ${Mn_kipft.toFixed(1)} / ${OMEGA_B} = ${results.Ma_kipft.toFixed(1)} kip-ft` })
  lines.push({ text: '' })

  lines.push({ text: 'SHEAR STRENGTH  (AISC 360-22 Ch. G, rolled I-shape)' })
  lines.push({ text: '  A_w = d * t_w' })
  lines.push({ text: `      = ${section.d} * ${section.tw} = ${(section.d * section.tw).toFixed(3)} in^2` })
  lines.push({ text: '  C_v1 = 1.0     (h/t_w <= 2.24*sqrt(E/Fy))' })
  lines.push({ text: '  Vn = 0.6 * Fy * A_w * C_v1     (Eq. G2-1)' })
  lines.push({ text: `     = 0.6 * ${Fy} * ${(section.d * section.tw).toFixed(3)} = ${results.Vn_kip.toFixed(1)} kip` })
  lines.push({ text: '  Va = Vn / Omega_v' })
  lines.push({ text: `     = ${results.Vn_kip.toFixed(1)} / ${OMEGA_V} = ${results.Va_kip.toFixed(1)} kip` })
  lines.push({ text: '' })

  lines.push({ text: 'DEMAND' })
  if (support === 'simple' && loadCase === 'udl') {
    lines.push({ text: '  M_max = w * L^2 / 8' })
    lines.push({ text: `        = ${loadMag} * ${L_ft}^2 / 8 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = w * L / 2' })
    lines.push({ text: `        = ${loadMag} * ${L_ft} / 2 = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = 5 * w * L^4 / (384 * E * I)' })
    lines.push({ text: `            = 5 * ${(loadMag/12).toFixed(4)} * ${L_in}^4` })
    lines.push({ text: `              / (384 * ${E} * ${section.Ix})` })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'simple' && loadCase === 'point_mid') {
    lines.push({ text: '  M_max = P * L / 4' })
    lines.push({ text: `        = ${loadMag} * ${L_ft} / 4 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = P / 2' })
    lines.push({ text: `        = ${loadMag} / 2 = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = P * L^3 / (48 * E * I)' })
    lines.push({ text: `            = ${loadMag} * ${L_in}^3` })
    lines.push({ text: `              / (48 * ${E} * ${section.Ix})` })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'simple' && loadCase === 'third_points') {
    lines.push({ text: '  M_max = P * L / 3' })
    lines.push({ text: `        = ${loadMag} * ${L_ft} / 3 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = P' })
    lines.push({ text: `        = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = 23 * P * L^3 / (648 * E * I)' })
    lines.push({ text: `            = 23 * ${loadMag} * ${L_in}^3` })
    lines.push({ text: `              / (648 * ${E} * ${section.Ix})` })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'fixed' && loadCase === 'udl') {
    lines.push({ text: '  M_max = w * L^2 / 12        (at supports)' })
    lines.push({ text: `        = ${loadMag} * ${L_ft}^2 / 12 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = w * L / 2' })
    lines.push({ text: `        = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = w * L^4 / (384 * E * I)' })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'fixed' && loadCase === 'point_mid') {
    lines.push({ text: '  M_max = P * L / 8           (at supports and midspan)' })
    lines.push({ text: `        = ${loadMag} * ${L_ft} / 8 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = P / 2' })
    lines.push({ text: `        = ${loadMag} / 2 = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = P * L^3 / (192 * E * I)' })
    lines.push({ text: `            = ${loadMag} * ${L_in}^3` })
    lines.push({ text: `              / (192 * ${E} * ${section.Ix})` })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'fixed' && loadCase === 'third_points') {
    lines.push({ text: '  M_max = 2 * P * L / 9       (hogging at supports)' })
    lines.push({ text: `        = 2 * ${loadMag} * ${L_ft} / 9 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = P' })
    lines.push({ text: `        = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = 5 * P * L^3 / (648 * E * I)     (at midspan)' })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'cantilever' && loadCase === 'udl') {
    lines.push({ text: '  M_max = w * L^2 / 2         (at fixed end)' })
    lines.push({ text: `        = ${loadMag} * ${L_ft}^2 / 2 = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = w * L' })
    lines.push({ text: `        = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = w * L^4 / (8 * E * I)   (at free end)' })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  } else if (support === 'cantilever' && loadCase === 'point_mid') {
    lines.push({ text: '  M_max = P * L                (at fixed end, tip load)' })
    lines.push({ text: `        = ${loadMag} * ${L_ft} = ${results.M_max_kipft.toFixed(1)} kip-ft` })
    lines.push({ text: '  V_max = P' })
    lines.push({ text: `        = ${results.V_max_kip.toFixed(1)} kip` })
    lines.push({ text: '  delta_max = P * L^3 / (3 * E * I)   (at free end)' })
    lines.push({ text: `            = ${loadMag} * ${L_in}^3` })
    lines.push({ text: `              / (3 * ${E} * ${section.Ix})` })
    lines.push({ text: `            = ${results.delta_max_in.toFixed(3)} in` })
  }

  lines.push({ text: '' })
  lines.push({ text: 'EXTREME FIBER STRESS' })
  lines.push({ text: '  sigma_max = M_max * (d/2) / Ix' })
  lines.push({
    text: `            = ${(results.M_max_kipft * 12).toFixed(1)} * ${(section.d/2).toFixed(2)} / ${section.Ix}`,
  })
  lines.push({ text: `            = ${results.sigma_max_ksi.toFixed(2)} ksi` })
  lines.push({ text: '' })

  lines.push({ text: 'DEFLECTION LIMIT' })
  lines.push({ text: `  delta_allow = L / ${deflectionLimit} = ${L_in} / ${deflectionLimit}` })
  lines.push({ text: `              = ${results.delta_allow_in.toFixed(3)} in` })
  lines.push({ text: '' })

  lines.push({ text: 'CHECKS' })
  lines.push({
    text: `  Flexure DCR    = |M_max| / M_a`,
  })
  lines.push({
    text: `                 = ${Math.abs(results.M_max_kipft).toFixed(1)} / ${results.Ma_kipft.toFixed(1)} = ${results.flexureDCR.toFixed(3)}  ->  ${results.flexureDCR <= 1 ? 'PASS' : 'FAIL'}`,
    color: results.flexureDCR <= 1 ? col.green : col.rose,
  })
  lines.push({
    text: `  Shear DCR      = |V_max| / V_a`,
  })
  lines.push({
    text: `                 = ${Math.abs(results.V_max_kip).toFixed(1)} / ${results.Va_kip.toFixed(1)} = ${results.shearDCR.toFixed(3)}  ->  ${results.shearDCR <= 1 ? 'PASS' : 'FAIL'}`,
    color: results.shearDCR <= 1 ? col.green : col.rose,
  })
  lines.push({
    text: `  Deflection DCR = delta_max / delta_allow`,
  })
  lines.push({
    text: `                 = ${results.delta_max_in.toFixed(3)} / ${results.delta_allow_in.toFixed(3)} = ${results.deflectionDCR.toFixed(3)}  ->  ${results.deflectionDCR <= 1 ? 'PASS' : 'FAIL'}`,
    color: results.deflectionDCR <= 1 ? col.green : col.rose,
  })

  const lineH = 12
  lines.forEach((ln) => {
    if (y + lineH > PH - M) {
      pdf.addPage()
      y = M
    }
    if (ln.color) setColor(ln.color)
    else setColor(col.primary)
    text(ln.text, M, y)
    y += lineH
  })

  // Footer with assumptions
  y += 8
  if (y + 40 > PH - M) {
    pdf.addPage()
    y = M
  }
  setDraw(col.rule)
  pdf.line(M, y, PW - M, y)
  y += 14
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  setColor(col.muted)
  text(
    'Assumptions: compact section; full lateral bracing (Lb = 0, no LTB check); A992 steel; ASD. Flexure per Ch. F (Omega_b = 1.67). Shear per Ch. G with C_v1 = 1.0 and Omega_v = 1.5 (all catalog sections satisfy h/t_w <= 2.24*sqrt(E/Fy)). Self-weight of beam not added to applied load. Cantilever "point load" is applied at the free end. Section properties from AISC Steel Construction Manual, 16th Edition, Table 1-1.',
    M,
    y,
    { maxWidth: PW - 2 * M }
  )

  // Save
  const fname = `beamalyzer-${section.designation.toLowerCase()}-${L_ft.toFixed(0)}ft.pdf`
  pdf.save(fname)
}
