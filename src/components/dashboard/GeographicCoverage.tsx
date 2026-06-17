'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { CardShell, Skel, type InvestorData } from './shared'

type GeoEntry = InvestorData['geography'][number]

// ── Palettes ─────────────────────────────────────────────────────────────────
const VERT_PALETTE: Record<string, { fill: string; stroke: string; glow: string }> = {
  casino:   { fill: '#8b5cf6', stroke: '#7c3aed', glow: 'rgba(139,92,246,0.30)' },
  transit:  { fill: '#3b82f6', stroke: '#2563eb', glow: 'rgba(59,130,246,0.30)'  },
  airport:  { fill: '#0ea5e9', stroke: '#0284c7', glow: 'rgba(14,165,233,0.30)'  },
  hospital: { fill: '#ec4899', stroke: '#db2777', glow: 'rgba(236,72,153,0.30)'  },
  mall:     { fill: '#f59e0b', stroke: '#d97706', glow: 'rgba(245,158,11,0.30)'  },
}
const EXTRA_COLORS = [
  { fill: '#10b981', stroke: '#059669', glow: 'rgba(16,185,129,0.30)' },
  { fill: '#f97316', stroke: '#ea580c', glow: 'rgba(249,115,22,0.30)' },
  { fill: '#06b6d4', stroke: '#0891b2', glow: 'rgba(6,182,212,0.30)'  },
  { fill: '#a855f7', stroke: '#9333ea', glow: 'rgba(168,85,247,0.30)' },
  { fill: '#ef4444', stroke: '#dc2626', glow: 'rgba(239,68,68,0.30)'  },
  { fill: '#84cc16', stroke: '#65a30d', glow: 'rgba(132,204,22,0.30)' },
]
const FALLBACK_PALETTE = { fill: '#94a3b8', stroke: '#64748b', glow: 'rgba(148,163,184,0.30)' }

function getPalette(v: string | null | undefined, idx: number) {
  return VERT_PALETTE[v as keyof typeof VERT_PALETTE]
    ?? EXTRA_COLORS[idx % EXTRA_COLORS.length]
    ?? FALLBACK_PALETTE
}

// ── Layout constants ──────────────────────────────────────────────────────────
const R        = 9
const MIN_DIST = 68
// Canvas is larger than the visible box — user pans by dragging
const CANVAS_W = 820
const CANVAS_H = 380

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface NodePos { x: number; y: number; entry: GeoEntry; colorIdx: number }

function buildForceLayout(entries: GeoEntry[]): NodePos[] {
  if (entries.length === 0) return []
  const rand = seededRandom(entries.length * 137 + 42)
  const pad  = 44
  const nodes: NodePos[] = entries.map((entry, i) => ({
    x: pad + rand() * (CANVAS_W - pad * 2),
    y: pad + rand() * (CANVAS_H - pad * 2),
    entry,
    colorIdx: i,
  }))
  for (let iter = 0; iter < 180; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01
        if (d < MIN_DIST) {
          const f = ((MIN_DIST - d) / MIN_DIST) * 1.4
          fx += (dx / d) * f; fy += (dy / d) * f
        }
      }
      nodes[i].x = Math.max(pad, Math.min(CANVAS_W - pad, nodes[i].x + fx))
      nodes[i].y = Math.max(pad, Math.min(CANVAS_H - pad, nodes[i].y + fy))
    }
  }
  return nodes
}

function buildEdges(nodes: NodePos[]): [number, number][] {
  if (nodes.length < 2) return []
  const edges: [number, number][] = []
  const connected = new Set<number>([0])
  while (connected.size < nodes.length) {
    let best = Infinity, bi = -1, bj = -1
    for (const i of connected) {
      for (let j = 0; j < nodes.length; j++) {
        if (connected.has(j)) continue
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const d  = dx * dx + dy * dy
        if (d < best) { best = d; bi = i; bj = j }
      }
    }
    if (bj === -1) break
    edges.push([bi, bj])
    connected.add(bj)
  }
  const rand  = seededRandom(nodes.length * 31)
  const extra = Math.floor(nodes.length * 0.35)
  for (let e = 0; e < extra; e++) {
    const i = Math.floor(rand() * nodes.length)
    const j = Math.floor(rand() * nodes.length)
    if (i === j) continue
    if (!edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)))
      edges.push([i, j])
  }
  return edges
}

// ── Drag-to-pan hook ──────────────────────────────────────────────────────────
function useDragPan(el: HTMLDivElement | null) {
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const basePan  = useRef({ x: 0, y: 0 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!el) return

    const clamp = (x: number, y: number) => ({
      x: CANVAS_W > el.clientWidth  ? Math.max(-(CANVAS_W - el.clientWidth),  Math.min(0, x)) : 0,
      y: CANVAS_H > el.clientHeight ? Math.max(-(CANVAS_H - el.clientHeight), Math.min(0, y)) : 0,
    })

    const onDown = (e: MouseEvent) => {
      dragging.current = true
      setIsDragging(true)
      startPos.current = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      setPan(clamp(
        basePan.current.x + (e.clientX - startPos.current.x),
        basePan.current.y + (e.clientY - startPos.current.y),
      ))
    }
    const onUp = (e: MouseEvent) => {
      if (!dragging.current) return
      dragging.current = false
      setIsDragging(false)
      basePan.current = clamp(
        basePan.current.x + (e.clientX - startPos.current.x),
        basePan.current.y + (e.clientY - startPos.current.y),
      )
      el.style.cursor = 'grab'
    }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    el.style.cursor = 'grab'
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [el])

  return { isDragging, pan }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GeographicCoverage({
  geo,
  loading,
}: {
  geo: InvestorData['geography']
  loading: boolean
}) {
  const [panEl, setPanEl] = useState<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const { isDragging, pan } = useDragPan(panEl)

  const nodes = useMemo(() => buildForceLayout(geo), [geo])
  const edges = useMemo(() => buildEdges(nodes), [nodes])
  const total = useMemo(() => geo.reduce((s, g) => s + g.company_count, 0), [geo])

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Geographic Coverage</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {loading
            ? <Skel className="inline-block h-3 w-28" />
            : `${geo.length} cities · ${total} companies`}
        </p>
      </div>

      {/* Map viewport — height matches AIAgents 264px scroll area */}
      <div className="relative w-full rounded-xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden" style={{ height: 275 }}>
        {loading ? (
          <Skel className="w-full h-full rounded-xl" />
        ) : (
          <>
            <div
              ref={setPanEl}
              style={{
                width: '100%', height: '100%',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                style={{ display: 'block', transform: `translate(${pan.x}px, ${pan.y}px)`, pointerEvents: isDragging ? 'none' : 'auto' }}
              >
                <defs><style>{`
                  .tt-bg   { fill: #ffffff; stroke: #e2e8f0 }
                  .dark .tt-bg   { fill: #262626; stroke: #404040 }
                  .tt-body { fill: #475569; font-size: 12px; font-weight: 400 }
                  .dark .tt-body { fill: #94a3b8 }
                `}</style></defs>
                {edges.map(([ai, bi], i) => {
                  const a   = nodes[ai]
                  const b   = nodes[bi]
                  const lit = hovered === a.entry.hq_city || hovered === b.entry.hq_city
                  return (
                    <line key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={lit ? '#94a3b8' : '#e2e8f0'}
                      strokeWidth={lit ? 1.4 : 0.6}
                      style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                    />
                  )
                })}

                {nodes.map(({ x, y, entry, colorIdx }, ni) => {
                  const pal       = getPalette(entry.primary_vertical, colorIdx)
                  const key       = `${entry.hq_city ?? ''}-${ni}`
                  const hoverKey  = entry.hq_city ?? ''
                  const active    = hovered === hoverKey && !isDragging
                  const labelY    = y - R - 8
                  const pillColor = entry.hq_country === 'CA' ? '#06b6d4'
                    : entry.hq_country === 'US' ? '#ec4899'
                    : '#94a3b8'

                  return (
                    <g key={key}
                      onMouseEnter={() => { if (!isDragging) setHovered(hoverKey) }}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
                    >
                      {active && (
                        <circle cx={x} cy={y} r={R + 5} fill={pal.glow} />
                      )}
                      <circle
                        cx={x} cy={y}
                        r={active ? R + 1.5 : R}
                        fill={pal.fill}
                        stroke={pal.stroke}
                        strokeWidth={active ? 2 : 1.2}
                        opacity={active ? 1 : 0.82}
                        style={{ transition: 'r 0.15s, opacity 0.15s' }}
                      />
                      <circle cx={x - 3} cy={y - 3} r={2} fill="rgba(255,255,255,0.45)" style={{ pointerEvents: 'none' }} />
                      <rect
                        x={x - 9} y={labelY - 13}
                        width={18} height={4} rx={2}
                        fill={pillColor} opacity={active ? 1 : 0.65}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text x={x} y={labelY}
                        textAnchor="middle"
                        fill={active ? '#334155' : '#64748b'}
                        style={{
                          fontSize: 11, fontWeight: active ? 600 : 400,
                          fontFamily: 'inherit', pointerEvents: 'none', userSelect: 'none',
                          transition: 'fill 0.15s',
                        }}
                      >
                        {entry.hq_country} {entry.hq_city} · {entry.company_count}
                      </text>
                      {active && (
                        <g>
                          <rect className="tt-bg" x={x - 56} y={y + R + 7} width={112} height={26} rx={5}
                            strokeWidth={0.8}
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                          />
                          <text x={x} y={y + R + 25} textAnchor="middle"
                            className="tt-body"
                            style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
                          >
                            {entry.company_count} co. · {entry.primary_vertical ?? 'mixed'}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Vignette */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `
                linear-gradient(to right,  rgba(255,255,255,0.4) 0px, transparent 32px),
                linear-gradient(to left,   rgba(255,255,255,0.4) 0px, transparent 32px),
                linear-gradient(to bottom, rgba(255,255,255,0.4) 0px, transparent 32px),
                linear-gradient(to top,    rgba(255,255,255,0.4) 0px, transparent 32px)
              `,
            }} />
          </>
        )}
      </div>

      {/* Legend */}
      {!loading && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(VERT_PALETTE).map(([key, pal]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: pal.fill, flexShrink: 0 }} />
              {key}
            </span>
          ))}
        </div>
      )}
    </CardShell>
  )
}