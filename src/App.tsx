import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { W_SHAPES, SECTION_BY_DESIGNATION } from './sections'
import { analyze, formatNum, toMetric, type LoadCase, type Support } from './calc'
import { PhotoelasticBeam, type ViewMode } from './PhotoelasticBeam'
import { exportReport } from './export'

type Units = 'imperial' | 'metric'

export default function App() {
  const [designation, setDesignation] = useState('W12X26')
  const [L_ft, setL_ft] = useState(20)
  const [loadCase, setLoadCase] = useState<LoadCase>('udl')
  const [support, setSupport] = useState<Support>('simple')
  const [loadMag, setLoadMag] = useState(2)
  const [deflectionLimit, setDeflectionLimit] = useState(360)
  const [units, setUnits] = useState<Units>('imperial')
  const [viewMode, setViewMode] = useState<ViewMode>('fringes')
  const [fringeCycles, setFringeCycles] = useState(6)
  const [showProps, setShowProps] = useState(false)

  const section = SECTION_BY_DESIGNATION[designation] ?? W_SHAPES[0]

  // Safe numeric values for the calc layer — keep raw state permissive so
  // the user can backspace an input all the way to empty while typing.
  const safeL_ft = Number.isFinite(L_ft) ? Math.max(1, L_ft) : 1
  const safeLoadMag = Number.isFinite(loadMag) ? Math.max(0, loadMag) : 0
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (loadCase === 'udl' && safeLoadMag > 50) setLoadMag(2)
    if (loadCase !== 'udl' && safeLoadMag < 2 && safeLoadMag !== 0) setLoadMag(20)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCase])

  useEffect(() => {
    if (support === 'cantilever' && loadCase !== 'udl') setLoadCase('udl')
  }, [support, loadCase])

  const results = useMemo(
    () =>
      analyze({
        section,
        L_ft: safeL_ft,
        loadCase,
        support,
        loadMag: safeLoadMag,
        deflectionLimit,
      }),
    [section, safeL_ft, loadCase, support, safeLoadMag, deflectionLimit]
  )

  const suggestion = useMemo(() => {
    const curIdx = W_SHAPES.findIndex((s) => s.designation === designation)
    if (!results.passes) {
      for (let i = curIdx + 1; i < W_SHAPES.length; i++) {
        const trial = analyze({
          section: W_SHAPES[i],
          L_ft: safeL_ft, loadCase, support, loadMag: safeLoadMag, deflectionLimit,
        })
        if (trial.passes) {
          return {
            kind: 'upsize' as const,
            name: W_SHAPES[i].designation,
            text: `Upsize to ${W_SHAPES[i].designation} to satisfy ${trial.flexureDCR > trial.deflectionDCR ? 'flexure' : 'deflection'}`,
          }
        }
      }
      return { kind: 'none' as const, name: '', text: 'No section in catalog satisfies this loading — reduce span or load.' }
    }
    if (Math.max(results.flexureDCR, results.deflectionDCR) < 0.4) {
      for (let i = curIdx - 1; i >= 0; i--) {
        const trial = analyze({
          section: W_SHAPES[i], L_ft: safeL_ft, loadCase, support, loadMag: safeLoadMag, deflectionLimit,
        })
        if (trial.passes) {
          let best = W_SHAPES[i]
          for (let j = i - 1; j >= 0; j--) {
            const tr2 = analyze({
              section: W_SHAPES[j], L_ft: safeL_ft, loadCase, support, loadMag: safeLoadMag, deflectionLimit,
            })
            if (tr2.passes) best = W_SHAPES[j]
            else break
          }
          return {
            kind: 'downsize' as const,
            name: best.designation,
            text: `Consider ${best.designation} for lighter weight (current section is overdesigned)`,
          }
        }
      }
    }
    return { kind: 'ok' as const, name: '', text: 'Selection is efficient for this loading.' }
  }, [designation, safeL_ft, loadCase, support, safeLoadMag, deflectionLimit, results])

  const efficiency = Math.min(1, Math.max(results.flexureDCR, results.deflectionDCR))
  const effColor =
    efficiency < 0.7 ? 'var(--success)' : efficiency < 0.9 ? 'var(--warning)' : 'var(--failure)'

  const fmt = {
    moment: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} kip-ft` : `${formatNum(toMetric.kipft_to_kNm(v))} kN·m`,
    shear: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} kip` : `${formatNum(toMetric.kip_to_kN(v))} kN`,
    deflect: (v: number) =>
      units === 'imperial' ? `${formatNum(v, 3)} in` : `${formatNum(toMetric.in_to_mm(v), 1)} mm`,
    length: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} ft` : `${formatNum(toMetric.ft_to_m(v))} m`,
    stress: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} ksi` : `${formatNum(toMetric.ksi_to_MPa(v))} MPa`,
    weight_plf: (v: number) =>
      units === 'imperial' ? `${formatNum(v)} lb/ft` : `${formatNum(toMetric.lbft_to_kgm(v))} kg/m`,
  }

  const totalWeight_lb = section.weight * safeL_ft
  const L_over = results.delta_max_in > 0 ? (safeL_ft * 12) / results.delta_max_in : Infinity

  return (
    <>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px 40px', maxWidth: 1640, margin: '0 auto' }}>
        <div
          className="app-grid"
          style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: 24, alignItems: 'start' }}
        >
          {/* LEFT COLUMN */}
          <motion.div
            className="sticky-col"
            style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div>
              <h1
                className="display-title"
                style={{ fontSize: 64, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}
              >
                Beam
                <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>alyzer</span>
              </h1>
              <p className="caps" style={{ marginTop: 12, color: 'var(--text-muted)' }}>
                AISC 360 • ASD • A992 Steel
              </p>
            </div>

            <div>
              <div className="seg-wrap">
                <button className={`seg-btn ${units === 'imperial' ? 'active' : ''}`} onClick={() => setUnits('imperial')}>
                  Imperial
                </button>
                <button className={`seg-btn ${units === 'metric' ? 'active' : ''}`} onClick={() => setUnits('metric')}>
                  Metric
                </button>
              </div>
            </div>

            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}>
              <h3 className="section-title">Section</h3>
              <label className="field-label">
                W-Shape Designation
                <select className="glass-input" value={designation} onChange={(e) => setDesignation(e.target.value)}>
                  {W_SHAPES.map((s) => (
                    <option key={s.designation} value={s.designation}>
                      {s.designation}  ({s.weight} plf, Zx={s.Zx} in³)
                    </option>
                  ))}
                </select>
              </label>
            </motion.div>

            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
              <h3 className="section-title">Geometry</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <label className="field-label">
                  Span Length (ft)
                  <input
                    className="glass-input"
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={Number.isFinite(L_ft) ? L_ft : ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      setL_ft(raw === '' ? NaN : Number(raw))
                    }}
                  />
                </label>
                <label className="field-label">
                  Support Condition
                  <select className="glass-input" value={support} onChange={(e) => setSupport(e.target.value as Support)}>
                    <option value="simple">Simply Supported</option>
                    <option value="fixed">Fixed-Fixed</option>
                    <option value="cantilever">Cantilever</option>
                  </select>
                </label>
              </div>
            </motion.div>

            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
              <h3 className="section-title">Loading</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <label className="field-label">
                  Load Type
                  <select className="glass-input" value={loadCase}
                    onChange={(e) => setLoadCase(e.target.value as LoadCase)}
                    disabled={support === 'cantilever'}>
                    <option value="udl">Uniform Distributed Load (UDL)</option>
                    <option value="point_mid" disabled={support === 'cantilever'}>Point Load @ Midspan</option>
                    <option value="third_points" disabled={support === 'cantilever'}>Two Loads @ Third-Points</option>
                  </select>
                </label>
                <label className="field-label">
                  Magnitude ({loadCase === 'udl' ? 'kip/ft (klf)' : 'kip'})
                  <input
                    className="glass-input"
                    type="number"
                    min={0}
                    max={1000}
                    step={loadCase === 'udl' ? 0.1 : 1}
                    value={Number.isFinite(loadMag) ? loadMag : ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      setLoadMag(raw === '' ? NaN : Number(raw))
                    }}
                  />
                </label>
              </div>
            </motion.div>

            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }}>
              <h3 className="section-title">Criteria</h3>
              <label className="field-label">
                Deflection Limit
                <select className="glass-input" value={deflectionLimit} onChange={(e) => setDeflectionLimit(Number(e.target.value))}>
                  <option value={360}>L/360 — Live Load (Floors)</option>
                  <option value={240}>L/240 — Total Load (Floors)</option>
                  <option value={180}>L/180 — Roof</option>
                  <option value={480}>L/480 — Sensitive</option>
                </select>
              </label>
            </motion.div>

            <button className="btn" onClick={() => {
              setDesignation('W12X26'); setL_ft(20); setLoadCase('udl');
              setSupport('simple'); setLoadMag(2); setDeflectionLimit(360);
              setFringeCycles(6);
            }}>
              Reset to Defaults
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>Assumptions:</strong> compact section,
              full lateral bracing (Lb = 0, no LTB), A992 steel, ASD. Self-weight of beam not
              added to applied load.
            </p>
          </motion.div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <div className="seg-wrap">
                    {(['moment', 'shear', 'deflection', 'fringes'] as ViewMode[]).map((m) => (
                      <button key={m} className={`seg-btn ${viewMode === m ? 'active' : ''}`} onClick={() => setViewMode(m)}>
                        {m === 'fringes' ? 'Stress' : m}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn"
                    disabled={exporting}
                    style={{ marginLeft: 'auto' }}
                    onClick={async () => {
                      setExporting(true)
                      try {
                        await exportReport({
                          section, L_ft: safeL_ft, loadCase, support,
                          loadMag: safeLoadMag, deflectionLimit, units, results,
                        })
                      } finally {
                        setExporting(false)
                      }
                    }}
                  >
                    {exporting ? 'Exporting…' : 'Export Calculations'}
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {section.designation} · {fmt.length(safeL_ft)} span
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  <PhotoelasticBeam
                    section={section}
                    L_ft={safeL_ft}
                    loadCase={loadCase}
                    support={support}
                    results={results}
                    viewMode={viewMode}
                    fringeCycles={fringeCycles}
                    loadLabel={
                      loadCase === 'udl'
                        ? `w = ${units === 'imperial' ? `${formatNum(safeLoadMag)} klf` : `${formatNum(toMetric.klf_to_kNm(safeLoadMag))} kN/m`}`
                        : `P = ${units === 'imperial' ? `${formatNum(safeLoadMag)} kip` : `${formatNum(toMetric.kip_to_kN(safeLoadMag))} kN`}`
                    }
                    momentLabel={fmt.moment(results.M_max_kipft)}
                    shearLabel={fmt.shear(results.V_max_kip)}
                    deflectionLabel={fmt.deflect(results.delta_max_in)}
                    stressLabel={fmt.stress(results.sigma_max_ksi)}
                  />
                </motion.div>
              </AnimatePresence>

              {viewMode === 'fringes' && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="caps" style={{ color: 'var(--text-muted)' }}>Fringe Cycles</span>
                  <input type="range" min={3} max={15} value={fringeCycles}
                    onChange={(e) => setFringeCycles(Number(e.target.value))} style={{ flex: 1 }} />
                  <span className="mono" style={{ color: 'var(--accent)', minWidth: 30, textAlign: 'right' }}>
                    {fringeCycles}
                  </span>
                </div>
              )}
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <StatCard
                label="Demand"
                primary={fmt.moment(results.M_max_kipft)}
                primaryLabel="M_max"
                rows={[
                  { k: 'V_max', v: fmt.shear(results.V_max_kip) },
                  { k: 'δ_max', v: fmt.deflect(results.delta_max_in) },
                  { k: 'σ_max', v: fmt.stress(results.sigma_max_ksi) },
                ]}
                delay={0.1}
              />
              <StatCard
                label="Capacity"
                primary={fmt.moment(results.Ma_kipft)}
                primaryLabel="M_a (ASD)"
                rows={[
                  { k: 'M_n', v: fmt.moment(results.Mn_kipft) },
                  { k: 'Ω_b', v: '1.67' },
                  { k: 'δ_allow', v: fmt.deflect(results.delta_allow_in) },
                ]}
                delay={0.16}
              />
              <StatCard
                label="Demand / Capacity"
                primary={results.flexureDCR.toFixed(2)}
                primaryLabel="Flexure DCR"
                accent={efficiency < 0.7 ? 'var(--success)' : efficiency < 0.9 ? 'var(--warning)' : 'var(--failure)'}
                rows={[
                  { k: 'Deflection DCR', v: results.deflectionDCR.toFixed(2) },
                  { k: 'L/Δ', v: isFinite(L_over) ? `L/${Math.round(L_over)}` : '—' },
                  { k: 'Beam wt', v: units === 'imperial' ? `${formatNum(totalWeight_lb)} lb` : `${formatNum(totalWeight_lb * 0.4536)} kg` },
                ]}
                delay={0.22}
              />
            </div>

            <motion.div className="glass" style={{ padding: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28 }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <FlipPill passing={results.flexureDCR <= 1} label={`Flexure ${results.flexureDCR.toFixed(2)}`} />
                <FlipPill passing={results.deflectionDCR <= 1} label={`Deflection ${results.deflectionDCR.toFixed(2)}`} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="caps" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                    Efficiency · {(efficiency * 100).toFixed(0)}% of capacity
                  </div>
                  <div className="bar-track">
                    <motion.div
                      className="bar-fill"
                      animate={{ width: `${Math.min(100, efficiency * 100)}%`, background: effColor }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, fontStyle: 'italic', color: results.passes ? 'var(--success)' : 'var(--failure)' }}>
                  {results.passes ? 'Passes' : 'Fails'}
                </div>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={suggestion.text}
                className="glass"
                style={{
                  padding: 18,
                  borderColor:
                    suggestion.kind === 'upsize' ? 'rgba(244, 63, 94, 0.35)' :
                    suggestion.kind === 'downsize' ? 'rgba(251, 191, 36, 0.35)' : undefined,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span className="caps" style={{ color: 'var(--accent)' }}>Suggestion</span>
                  <span style={{ color: 'var(--text)' }}>{suggestion.text}</span>
                  {suggestion.name && (
                    <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setDesignation(suggestion.name)}>
                      Apply {suggestion.name}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <motion.div className="glass" style={{ padding: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.34 }}>
              <details open={showProps} onToggle={(e) => setShowProps((e.target as HTMLDetailsElement).open)}>
                <summary>
                  <h3 className="section-title" style={{ margin: 0, padding: 0, border: 0 }}>
                    {section.designation} Section Properties
                  </h3>
                  <span className="chev">▾</span>
                </summary>
                <div style={{ marginTop: 16 }}>
                  <div className="kv-grid">
                    <span className="k">Depth (d)</span><span className="v">{section.d} in</span>
                    <span className="k">Flange width (bf)</span><span className="v">{section.bf} in</span>
                    <span className="k">Web thickness (tw)</span><span className="v">{section.tw} in</span>
                    <span className="k">Flange thickness (tf)</span><span className="v">{section.tf} in</span>
                    <span className="k">Area (A)</span><span className="v">{section.A} in²</span>
                    <span className="k">Weight</span><span className="v">{fmt.weight_plf(section.weight)}</span>
                    <span className="k">Ix</span><span className="v">{section.Ix} in⁴</span>
                    <span className="k">Sx</span><span className="v">{section.Sx} in³</span>
                    <span className="k">Zx</span><span className="v">{section.Zx} in³</span>
                    <span className="k">rx</span><span className="v">{section.rx} in</span>
                    <span className="k">Iy</span><span className="v">{section.Iy} in⁴</span>
                    <span className="k">Sy</span><span className="v">{section.Sy} in³</span>
                    <span className="k">Zy</span><span className="v">{section.Zy} in³</span>
                    <span className="k">ry</span><span className="v">{section.ry} in</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                    Source: AISC <em>Steel Construction Manual</em>, 16th Edition, Table 1-1.
                  </p>
                </div>
              </details>
            </motion.div>

            <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '8px 0 24px' }}>
              Equations per AISC 360-22 — M<sub>n</sub> = F<sub>y</sub> · Z<sub>x</sub> (Eq. F2-1), M<sub>a</sub> = M<sub>n</sub> / Ω<sub>b</sub> (§B3.2)
            </div>
          </div>
        </div>

        {/* Off-screen export container — renders all four views so the PDF
            exporter can grab a PNG of each regardless of the on-screen tab. */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: -99999,
            top: 0,
            width: 1100,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          {(['moment', 'shear', 'deflection', 'fringes'] as ViewMode[]).map((mode) => {
            const loadLabel =
              loadCase === 'udl'
                ? `w = ${units === 'imperial' ? `${formatNum(safeLoadMag)} klf` : `${formatNum(toMetric.klf_to_kNm(safeLoadMag))} kN/m`}`
                : `P = ${units === 'imperial' ? `${formatNum(safeLoadMag)} kip` : `${formatNum(toMetric.kip_to_kN(safeLoadMag))} kN`}`
            return (
              <div key={mode} id={`export-svg-${mode}`}>
                <PhotoelasticBeam
                  section={section}
                  L_ft={safeL_ft}
                  loadCase={loadCase}
                  support={support}
                  results={results}
                  viewMode={mode}
                  fringeCycles={fringeCycles}
                  loadLabel={loadLabel}
                  momentLabel={fmt.moment(results.M_max_kipft)}
                  shearLabel={fmt.shear(results.V_max_kip)}
                  deflectionLabel={fmt.deflect(results.delta_max_in)}
                  stressLabel={fmt.stress(results.sigma_max_ksi)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function StatCard({
  label, primary, primaryLabel, rows, delay, accent,
}: {
  label: string
  primary: string
  primaryLabel: string
  rows: { k: string; v: string }[]
  delay: number
  accent?: string
}) {
  return (
    <motion.div className="glass" style={{ padding: 20 }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}>
      <div className="caps" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div className="caps" style={{ color: 'var(--accent)', marginBottom: 4 }}>{primaryLabel}</div>
      <motion.div
        key={primary}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 30, margin: '4px 0 14px',
          color: accent ?? 'var(--text)',
          fontFamily: 'Instrument Serif, serif',
          fontWeight: 400, letterSpacing: '-0.01em',
        }}
      >
        {primary}
      </motion.div>
      <div className="kv-grid" style={{ gridTemplateColumns: '1fr auto' }}>
        {rows.map((r) => (
          <span key={r.k} style={{ display: 'contents' }}>
            <span className="k">{r.k}</span>
            <span className="v">{r.v}</span>
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function FlipPill({ passing, label }: { passing: boolean; label: string }) {
  return (
    <motion.div
      key={`${passing}-${label}`}
      className={`pill ${passing ? 'pass' : 'fail'}`}
      initial={{ rotateX: -90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <span style={{ fontSize: 14 }}>{passing ? '✓' : '✕'}</span>
      {label}
    </motion.div>
  )
}
