import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { Results, LoadCase, Support } from './calc'
import type { WShape } from './sections'

type ViewMode = 'fringes' | 'moment' | 'shear' | 'deflection'

type Props = {
  section: WShape
  L_ft: number
  loadCase: LoadCase
  support: Support
  results: Results
  viewMode: ViewMode
  fringeCycles: number
  loadLabel: string         // e.g. "w = 2 klf" or "P = 20 kip"
  momentLabel: string       // e.g. "100 kip-ft"
  shearLabel: string        // e.g. "20 kip"
  deflectionLabel: string   // e.g. "0.82 in"
  stressLabel: string       // e.g. "17.9 ksi"
}

// Softer photoelastic palette — desaturated pastel fringes.
// Hue still cycles through the visible spectrum for isochromatic reading,
// but saturation and lightness are moderated so the image doesn't neon-burn.
function fringeColor(sigmaNorm: number, cycles: number): string {
  const mag = Math.min(Math.abs(sigmaNorm), 1)
  // Soft neutral-axis band — deep blue-grey, not black
  if (mag < 0.015) return 'rgb(18,22,36)'
  const N = mag * cycles
  let hue = (N * 300) % 360 // 0..300° avoids the harshest magenta swing
  if (sigmaNorm < 0) hue = (hue + 180) % 360
  // gentle edge darkening near integer fringe boundaries
  const frac = N - Math.floor(N)
  const edge = 1 - Math.min(frac, 1 - frac) * 2 // 1 at boundary, 0 at center
  const light = 48 + 18 * mag - 10 * edge
  const sat = 45 + 20 * mag
  return `hsl(${hue.toFixed(1)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`
}

export function PhotoelasticBeam({
  section,
  L_ft,
  loadCase,
  support,
  results,
  viewMode,
  fringeCycles,
  loadLabel,
  momentLabel,
  shearLabel,
  deflectionLabel,
  stressLabel,
}: Props) {
  // Canvas geometry
  const width = 1100
  const height = 500
  const padX = 70
  const beamW = width - padX * 2
  const beamH = Math.min(80, Math.max(40, section.d * 4.5))
  const beamX = padX
  const beamY = 150              // beam top
  const baseY = beamY + beamH    // beam bottom

  // Diagram region: dedicated band below the dimension line
  const diagTop = 295
  const diagBot = 445
  const diagBase = (diagTop + diagBot) / 2  // 370 — zero line for bidirectional diagrams
  const diagHalfH = (diagBot - diagTop) / 2 // 75 each side

  // Fringe field grid
  const GX = 180
  const GY = 34

  const { momentAt, shearAt, deflectionAt, sigma_max_ksi, delta_max_in } = results

  const cells = useMemo(() => {
    if (viewMode !== 'fringes') return []
    const halfD = section.d / 2
    const out: { x: number; y: number; w: number; h: number; fill: string }[] = []
    const cw = beamW / GX
    const ch = beamH / GY
    for (let i = 0; i < GX; i++) {
      const xf = (i + 0.5) / GX
      const M_kipin = momentAt(xf) * 12
      for (let j = 0; j < GY; j++) {
        const y_in = halfD - ((j + 0.5) / GY) * section.d
        const sigma = (M_kipin * y_in) / section.Ix
        const sigmaNorm = sigma_max_ksi > 0 ? sigma / sigma_max_ksi : 0
        out.push({
          x: beamX + i * cw,
          y: beamY + j * ch,
          w: cw + 0.6,
          h: ch + 0.6,
          fill: fringeColor(sigmaNorm, fringeCycles),
        })
      }
    }
    return out
  }, [viewMode, fringeCycles, section, momentAt, sigma_max_ksi, beamW, beamH, beamX, beamY])

  // Moment diagram — signed, baseline in middle of diagram band
  const momentData = useMemo(() => {
    const samples = 120
    const vals: number[] = []
    const xs: number[] = []
    for (let i = 0; i <= samples; i++) {
      const xf = i / samples
      vals.push(momentAt(xf))
      xs.push(beamX + xf * beamW)
    }
    const vmax = Math.max(1e-6, ...vals.map(Math.abs))
    const scale = diagHalfH / vmax
    let path = `M${xs[0]},${diagBase} `
    for (let i = 0; i <= samples; i++) {
      path += `L${xs[i].toFixed(1)},${(diagBase - vals[i] * scale).toFixed(1)} `
    }
    path += `L${xs[xs.length - 1]},${diagBase} Z`
    // Find the peak for label placement
    let peakI = 0
    for (let i = 0; i < vals.length; i++) if (Math.abs(vals[i]) > Math.abs(vals[peakI])) peakI = i
    return {
      path,
      vmax,
      peakX: xs[peakI],
      peakY: diagBase - vals[peakI] * scale,
      peakSign: Math.sign(vals[peakI]),
    }
  }, [momentAt, beamW, beamX, diagBase, diagHalfH])

  // Shear diagram — piecewise, signed
  const shearData = useMemo(() => {
    const samples = 240
    const vals: number[] = []
    const xs: number[] = []
    for (let i = 0; i <= samples; i++) {
      const xf = i / samples
      vals.push(shearAt(xf))
      xs.push(beamX + xf * beamW)
    }
    const vmax = Math.max(1e-6, ...vals.map(Math.abs))
    const scale = diagHalfH / vmax
    let path = `M${xs[0]},${diagBase} `
    for (let i = 0; i <= samples; i++) {
      path += `L${xs[i].toFixed(1)},${(diagBase - vals[i] * scale).toFixed(1)} `
    }
    path += `L${xs[xs.length - 1]},${diagBase} Z`
    let peakI = 0
    for (let i = 0; i < vals.length; i++) if (Math.abs(vals[i]) > Math.abs(vals[peakI])) peakI = i
    return {
      path,
      vmax,
      peakX: xs[peakI],
      peakY: diagBase - vals[peakI] * scale,
      peakSign: Math.sign(vals[peakI]),
    }
  }, [shearAt, beamW, beamX, diagBase, diagHalfH])

  // Deflection — drawn as deflected beam shape in beam region (baseline = beam centerline)
  const deflectionData = useMemo(() => {
    const samples = 120
    const vals: number[] = []
    const xs: number[] = []
    for (let i = 0; i <= samples; i++) {
      const xf = i / samples
      vals.push(deflectionAt(xf))
      xs.push(beamX + xf * beamW)
    }
    const vmax = Math.max(1e-6, ...vals.map(Math.abs), delta_max_in)
    const scale = (beamH * 1.4) / vmax
    const cy = beamY + beamH / 2
    let path = ''
    for (let i = 0; i <= samples; i++) {
      const y = cy + vals[i] * scale
      path += (i === 0 ? 'M' : 'L') + xs[i].toFixed(1) + ',' + y.toFixed(1) + ' '
    }
    let peakI = 0
    for (let i = 0; i < vals.length; i++) if (Math.abs(vals[i]) > Math.abs(vals[peakI])) peakI = i
    return {
      path,
      peakX: xs[peakI],
      peakY: cy + vals[peakI] * scale,
    }
  }, [deflectionAt, beamW, beamX, beamY, beamH, delta_max_in])

  // ─── Load graphics ───
  const renderLoads = () => {
    const udlTop = beamY - 34
    const udlBot = beamY - 16
    const arrowTip = beamY - 2
    const tickCount = 14

    if (loadCase === 'udl' && support !== 'cantilever') {
      return (
        <g>
          <rect
            x={beamX}
            y={udlTop}
            width={beamW}
            height={udlBot - udlTop}
            fill="url(#loadHatch)"
            stroke="rgba(165,243,252,0.4)"
            strokeWidth="0.8"
            rx="2"
          />
          {Array.from({ length: tickCount }).map((_, i) => {
            const x = beamX + (beamW * (i + 0.5)) / tickCount
            return (
              <g key={i}>
                <line x1={x} y1={udlBot} x2={x} y2={arrowTip - 3} stroke="#a5f3fc" strokeWidth="1" />
                <polygon
                  points={`${x - 3},${arrowTip - 4} ${x + 3},${arrowTip - 4} ${x},${arrowTip}`}
                  fill="#a5f3fc"
                />
              </g>
            )
          })}
          <text
            x={beamX + beamW / 2}
            y={udlTop - 8}
            textAnchor="middle"
            fill="#a5f3fc"
            fontSize="13"
            fontFamily="JetBrains Mono, monospace"
          >
            {loadLabel}
          </text>
        </g>
      )
    }

    if (loadCase === 'point_mid') {
      const x = beamX + beamW / 2
      return (
        <g>
          <line x1={x} y1={beamY - 60} x2={x} y2={arrowTip - 4} stroke="#a5f3fc" strokeWidth="2.2" />
          <polygon
            points={`${x - 6},${arrowTip - 6} ${x + 6},${arrowTip - 6} ${x},${arrowTip}`}
            fill="#a5f3fc"
          />
          <text x={x} y={beamY - 68} textAnchor="middle" fill="#a5f3fc" fontSize="13" fontFamily="JetBrains Mono, monospace">
            {loadLabel}
          </text>
        </g>
      )
    }

    if (loadCase === 'third_points') {
      const x1 = beamX + beamW / 3
      const x2 = beamX + (2 * beamW) / 3
      return (
        <g>
          {[x1, x2].map((x, i) => (
            <g key={i}>
              <line x1={x} y1={beamY - 60} x2={x} y2={arrowTip - 4} stroke="#a5f3fc" strokeWidth="2.2" />
              <polygon
                points={`${x - 6},${arrowTip - 6} ${x + 6},${arrowTip - 6} ${x},${arrowTip}`}
                fill="#a5f3fc"
              />
              <text x={x} y={beamY - 68} textAnchor="middle" fill="#a5f3fc" fontSize="13" fontFamily="JetBrains Mono, monospace">
                {loadLabel}
              </text>
            </g>
          ))}
        </g>
      )
    }

    // cantilever + UDL
    if (support === 'cantilever' && loadCase === 'udl') {
      return (
        <g>
          <rect
            x={beamX}
            y={udlTop}
            width={beamW}
            height={udlBot - udlTop}
            fill="url(#loadHatch)"
            stroke="rgba(165,243,252,0.4)"
            strokeWidth="0.8"
            rx="2"
          />
          {Array.from({ length: tickCount }).map((_, i) => {
            const x = beamX + (beamW * (i + 0.5)) / tickCount
            return (
              <g key={i}>
                <line x1={x} y1={udlBot} x2={x} y2={arrowTip - 3} stroke="#a5f3fc" strokeWidth="1" />
                <polygon
                  points={`${x - 3},${arrowTip - 4} ${x + 3},${arrowTip - 4} ${x},${arrowTip}`}
                  fill="#a5f3fc"
                />
              </g>
            )
          })}
          <text x={beamX + beamW / 2} y={udlTop - 8} textAnchor="middle" fill="#a5f3fc" fontSize="13" fontFamily="JetBrains Mono, monospace">
            {loadLabel}
          </text>
        </g>
      )
    }
    return null
  }

  const leftX = beamX
  const rightX = beamX + beamW

  return (
    <div className="photoelastic-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id="shimmer" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(165,243,252,0.55)" strokeWidth="1.2" />
          </pattern>
          <pattern id="loadHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(165,243,252,0.35)" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="legendFringe" x1="0" x2="1" y1="0" y2="0">
            {Array.from({ length: fringeCycles * 4 + 1 }).map((_, i) => {
              const t = i / (fringeCycles * 4)
              const col = fringeColor(t, fringeCycles)
              return <stop key={i} offset={t} stopColor={col} />
            })}
          </linearGradient>
        </defs>

        {/* Faint vertical grid */}
        <g opacity="0.1">
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={'v' + i}
              x1={beamX + (i * beamW) / 10}
              y1={40}
              x2={beamX + (i * beamW) / 10}
              y2={diagBot + 10}
              stroke="#a5f3fc"
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Load graphics */}
        {renderLoads()}

        {/* Beam border */}
        <rect
          x={beamX - 1.5}
          y={beamY - 1.5}
          width={beamW + 3}
          height={beamH + 3}
          fill="rgba(165,243,252,0.04)"
          stroke="rgba(165,243,252,0.35)"
          strokeWidth="1"
          rx="2"
        />

        {/* PHOTOELASTIC FRINGES */}
        {viewMode === 'fringes' && (
          <g>
            {cells.map((c, idx) => (
              <rect
                key={idx}
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                fill={c.fill}
                shapeRendering="crispEdges"
              />
            ))}
            {/* soft pulse on peak stress fiber */}
            <motion.ellipse
              cx={beamX + beamW / 2}
              cy={beamY + 4}
              rx={44}
              ry={6}
              fill="rgba(255,255,255,0.12)"
              animate={{ opacity: [0.08, 0.25, 0.08] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              filter="url(#shimmer)"
            />
            <motion.ellipse
              cx={beamX + beamW / 2}
              cy={beamY + beamH - 4}
              rx={44}
              ry={6}
              fill="rgba(255,255,255,0.12)"
              animate={{ opacity: [0.08, 0.25, 0.08] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
              filter="url(#shimmer)"
            />
            {/* σ_max callout */}
            <g>
              <line
                x1={beamX + beamW / 2}
                y1={beamY - 2}
                x2={beamX + beamW / 2 + 90}
                y2={beamY - 18}
                stroke="#e2e8f0"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.6"
              />
              <rect
                x={beamX + beamW / 2 + 86}
                y={beamY - 36}
                width={128}
                height={22}
                rx={4}
                fill="rgba(8,12,24,0.75)"
                stroke="rgba(165,243,252,0.35)"
              />
              <text
                x={beamX + beamW / 2 + 150}
                y={beamY - 20}
                textAnchor="middle"
                fill="#a5f3fc"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
              >
                σ_max = {stressLabel}
              </text>
            </g>
          </g>
        )}

        {/* Deflection view: beam centerline reference + deflected shape */}
        {viewMode === 'deflection' && (
          <g>
            <rect
              x={beamX}
              y={beamY}
              width={beamW}
              height={beamH}
              fill="rgba(165,243,252,0.04)"
              stroke="rgba(165,243,252,0.25)"
              strokeDasharray="4 4"
            />
            <line
              x1={beamX}
              y1={beamY + beamH / 2}
              x2={beamX + beamW}
              y2={beamY + beamH / 2}
              stroke="rgba(226,232,240,0.25)"
              strokeDasharray="3 3"
            />
            <motion.path
              d={deflectionData.path}
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6 }}
            />
            {/* peak callout */}
            <g>
              <circle cx={deflectionData.peakX} cy={deflectionData.peakY} r={4} fill="#a5f3fc" />
              <line
                x1={deflectionData.peakX}
                y1={deflectionData.peakY}
                x2={deflectionData.peakX + 80}
                y2={deflectionData.peakY + 24}
                stroke="#a5f3fc"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.7"
              />
              <text
                x={deflectionData.peakX + 85}
                y={deflectionData.peakY + 28}
                fill="#a5f3fc"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
              >
                δ_max = {deflectionLabel}
              </text>
            </g>
          </g>
        )}

        {/* ─── DIMENSION LINE ─── */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#94a3b8">
          <line x1={beamX} y1={baseY + 48} x2={beamX + beamW} y2={baseY + 48} stroke="#475569" strokeWidth="0.8" />
          <line x1={beamX} y1={baseY + 44} x2={beamX} y2={baseY + 52} stroke="#475569" strokeWidth="0.8" />
          <line x1={beamX + beamW} y1={baseY + 44} x2={beamX + beamW} y2={baseY + 52} stroke="#475569" strokeWidth="0.8" />
          <text x={beamX + beamW / 2} y={baseY + 63} textAnchor="middle">L = {L_ft.toFixed(1)} ft</text>
        </g>

        {/* ─── DIAGRAM REGION (moment / shear) ─── */}
        {(viewMode === 'moment' || viewMode === 'shear') && (
          <g>
            {/* bounding box */}
            <rect
              x={beamX}
              y={diagTop}
              width={beamW}
              height={diagBot - diagTop}
              fill="rgba(8, 12, 24, 0.35)"
              stroke="rgba(165,243,252,0.2)"
              strokeWidth="0.8"
              rx="4"
            />
            {/* zero line */}
            <line
              x1={beamX}
              y1={diagBase}
              x2={beamX + beamW}
              y2={diagBase}
              stroke="rgba(226,232,240,0.3)"
              strokeDasharray="4 4"
            />
            {/* y-axis ticks */}
            {[-1, -0.5, 0.5, 1].map((t) => (
              <line
                key={t}
                x1={beamX - 4}
                y1={diagBase - t * diagHalfH}
                x2={beamX}
                y2={diagBase - t * diagHalfH}
                stroke="rgba(148,163,184,0.5)"
                strokeWidth="0.8"
              />
            ))}
            <text x={beamX - 8} y={diagBase + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono, monospace">0</text>
          </g>
        )}

        {viewMode === 'moment' && (
          <g>
            <motion.path
              d={momentData.path}
              fill="rgba(165,243,252,0.22)"
              stroke="#a5f3fc"
              strokeWidth="2.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
            {/* peak callout */}
            <g>
              <circle cx={momentData.peakX} cy={momentData.peakY} r={4} fill="#a5f3fc" />
              <text
                x={momentData.peakX}
                y={momentData.peakY + (momentData.peakSign >= 0 ? -12 : 18)}
                textAnchor="middle"
                fill="#a5f3fc"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
              >
                M_max = {momentLabel}
              </text>
            </g>
            <text x={beamX + beamW / 2} y={diagBot + 18} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono, monospace">
              Bending Moment M(x)
            </text>
          </g>
        )}

        {viewMode === 'shear' && (
          <g>
            <motion.path
              d={shearData.path}
              fill="rgba(251,191,36,0.22)"
              stroke="#fbbf24"
              strokeWidth="2.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45 }}
            />
            <g>
              <circle cx={shearData.peakX} cy={shearData.peakY} r={4} fill="#fbbf24" />
              <text
                x={shearData.peakX}
                y={shearData.peakY + (shearData.peakSign >= 0 ? -12 : 18)}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
              >
                V_max = {shearLabel}
              </text>
            </g>
            <text x={beamX + beamW / 2} y={diagBot + 18} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono, monospace">
              Shear V(x)
            </text>
          </g>
        )}

        {/* ─── SUPPORTS ─── */}
        {support === 'simple' && (
          <g>
            <polygon points={`${leftX},${baseY} ${leftX - 14},${baseY + 20} ${leftX + 14},${baseY + 20}`} fill="rgba(165,243,252,0.35)" stroke="#a5f3fc" />
            <line x1={leftX - 22} y1={baseY + 22} x2={leftX + 22} y2={baseY + 22} stroke="#a5f3fc" strokeWidth="1.5" />
            <polygon points={`${rightX},${baseY} ${rightX - 14},${baseY + 17} ${rightX + 14},${baseY + 17}`} fill="rgba(165,243,252,0.25)" stroke="#a5f3fc" />
            <circle cx={rightX - 7} cy={baseY + 21} r={3} fill="#a5f3fc" />
            <circle cx={rightX + 7} cy={baseY + 21} r={3} fill="#a5f3fc" />
            <line x1={rightX - 22} y1={baseY + 26} x2={rightX + 22} y2={baseY + 26} stroke="#a5f3fc" strokeWidth="1.5" />
          </g>
        )}
        {support === 'fixed' && (
          <g>
            <rect x={leftX - 22} y={beamY - 10} width={14} height={beamH + 20} fill="url(#hatch)" opacity="0.7" />
            <line x1={leftX - 8} y1={beamY - 10} x2={leftX - 8} y2={beamY + beamH + 10} stroke="#a5f3fc" strokeWidth="1.5" />
            <rect x={rightX + 8} y={beamY - 10} width={14} height={beamH + 20} fill="url(#hatch)" opacity="0.7" />
            <line x1={rightX + 8} y1={beamY - 10} x2={rightX + 8} y2={beamY + beamH + 10} stroke="#a5f3fc" strokeWidth="1.5" />
          </g>
        )}
        {support === 'cantilever' && (
          <g>
            <rect x={leftX - 22} y={beamY - 20} width={14} height={beamH + 40} fill="url(#hatch)" opacity="0.8" />
            <line x1={leftX - 8} y1={beamY - 20} x2={leftX - 8} y2={beamY + beamH + 20} stroke="#a5f3fc" strokeWidth="1.5" />
          </g>
        )}

        {/* ─── STRESS LEGEND (only in fringe view) ─── */}
        {viewMode === 'fringes' && (
          <g>
            <rect x={beamX} y={diagTop + 40} width={beamW} height={14} fill="url(#legendFringe)" rx="2" />
            <text x={beamX} y={diagTop + 74} fontSize="11" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">0 ksi</text>
            <text x={beamX + beamW} y={diagTop + 74} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
              ±{sigma_max_ksi.toFixed(1)} ksi peak
            </text>
            <text x={beamX + beamW / 2} y={diagTop + 74} textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="JetBrains Mono, monospace">
              {fringeCycles} isochromatic cycles
            </text>
            <text x={beamX + beamW / 2} y={diagTop + 25} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="JetBrains Mono, monospace">
              Stress fringe scale (|σ| → color cycles)
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export type { ViewMode }
