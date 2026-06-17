'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { CardShell, Skel, VERT } from './shared'

interface VertEntry {
  vertical: string
  count: number
  sql_count: number
  avg_score: number | null
}

interface Props {
  verticals: VertEntry[]
  loading: boolean
}

// ── Colors — solid Tailwind-500 equivalents ──────────────────────────────────
const SOLID_COLORS = [
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
  '#a855f7', // purple-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
]

function getColor(_key: string, idx: number): string {
  return SOLID_COLORS[idx % SOLID_COLORS.length]
}

// ── Canvas ────────────────────────────────────────────────────────────────────
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

interface NodePos { x: number; y: number; r: number; entry: VertEntry; colorIdx: number }

function buildForceLayout(entries: VertEntry[]): NodePos[] {
  if (entries.length === 0) return []
  const rand = seededRandom(entries.length * 137 + 42)
  const pad  = 52
  const nodes: NodePos[] = entries.map((entry, i) => ({
    x: pad + rand() * (CANVAS_W - pad * 2),
    y: pad + rand() * (CANVAS_H - pad * 2),
    r: 8,
    entry,
    colorIdx: i,
  }))
  for (let iter = 0; iter < 200; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx      = nodes[i].x - nodes[j].x
        const dy      = nodes[i].y - nodes[j].y
        const d       = Math.sqrt(dx * dx + dy * dy) || 0.01
        const minDist = nodes[i].r + nodes[j].r + 28
        if (d < minDist) {
          const f = ((minDist - d) / minDist) * 1.6
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
    edges.push([bi, bj]); connected.add(bj)
  }
  const rand  = seededRandom(nodes.length * 53)
  const extra = Math.floor(nodes.length * 0.4)
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
export function VerticalCoverage({ verticals, loading }: Props) {
  const [panEl, setPanEl] = useState<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const { isDragging, pan } = useDragPan(panEl)

  const nodes = useMemo(() => buildForceLayout(verticals), [verticals])
  const edges = useMemo(() => buildEdges(nodes), [nodes])
  const total = useMemo(() => verticals.reduce((s, v) => s + v.count, 0) || 1, [verticals])

  return (
    <CardShell className="px-6 pt-6 pb-5 flex flex-col">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">Vertical Coverage</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">
        {loading
          ? <Skel className="inline-block h-3 w-32" />
          : `${verticals.length} active verticals`}
      </p>

      {/* Map viewport */}
      <div className="relative w-full bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden" style={{ height: 264 }}>
        {loading ? (
          <Skel className="w-full h-full rounded-xl" />
        ) : (
          <>
            <div
              ref={setPanEl}
              style={{ width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}
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
                  .tt-head { fill: #1e293b; font-size: 14px; font-weight: 600 }
                  .dark .tt-head { fill: #f1f5f9 }
                  .tt-body { fill: #64748b; font-size: 12px; font-weight: 400 }
                  .dark .tt-body { fill: #94a3b8 }
                `}</style></defs>
                {edges.map(([ai, bi], i) => {
                  const a   = nodes[ai]
                  const b   = nodes[bi]
                  const lit = hovered === a.entry.vertical || hovered === b.entry.vertical
                  return (
                    <line key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={lit ? '#94a3b8' : '#e2e8f0'}
                      strokeWidth={lit ? 1.5 : 0.6}
                      style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                    />
                  )
                })}

                {nodes.map(({ x, y, r, entry, colorIdx }) => {
                  const cfg    = VERT[entry.vertical ?? '']
                  const label  = cfg?.label ?? (entry.vertical || 'Unclassified')
                  const col    = getColor(entry.vertical ?? '', colorIdx)
                  const key    = entry.vertical ?? ''
                  const active = hovered === key && !isDragging
                  const pct    = Math.round(entry.count / total * 100)
                  const labelY = y - 15

                  const tipLines = [
                    label,
                    `${entry.count} cos · ${pct}%`,
                    ...(entry.sql_count > 0 ? [`${entry.sql_count} SQL`] : []),
                    ...(entry.avg_score != null ? [`avg ${Math.round(entry.avg_score)}`] : []),
                  ]
                  const tipW = 140
                  const tipH = tipLines.length * 18 + 12
                  const tipY = y + r + 8 + tipH > CANVAS_H - 10 ? y - r - tipH - 8 : y + r + 8

                  return (
                    <g key={key}
                      onMouseEnter={() => { if (!isDragging) setHovered(key) }}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
                    >
                      {active && (
                        <rect x={x - 11} y={y - 11} width={22} height={22} rx={5}
                          fill={col} opacity={0.28}
                        />
                      )}
                      <rect
                        x={x - 8} y={y - 8}
                        width={16} height={16}
                        rx={4}
                        fill={col}
                        opacity={active ? 1 : 0.85}
                        style={{ transition: 'opacity 0.12s' }}
                      />
                      <text x={x} y={labelY} textAnchor="middle"
                        fill={active ? '#334155' : '#64748b'}
                        style={{ fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: 'inherit', pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.15s' }}
                      >
                        {label} · {entry.count}
                      </text>
                      {active && (
                        <g>
                          <rect className="tt-bg" x={x - tipW / 2} y={tipY} width={tipW} height={tipH} rx={5}
                            strokeWidth={0.8}
                            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.09))' }}
                          />
                          {tipLines.map((line, li) => (
                            <text key={li} x={x} y={tipY + 16 + li * 18} textAnchor="middle"
                              className={li === 0 ? 'tt-head' : 'tt-body'}
                              style={{ fontFamily: 'inherit', pointerEvents: 'none' }}
                            >
                              {line}
                            </text>
                          ))}
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
          {verticals.map((v, i) => {
            const col   = getColor(v.vertical ?? '', i)
            const cfg   = VERT[v.vertical ?? '']
            const label = cfg?.label ?? (v.vertical || 'Unclassified')
            const pct   = Math.round(v.count / total * 100)
            return (
              <button key={v.vertical}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                onMouseEnter={() => setHovered(v.vertical ?? '')}
                onMouseLeave={() => setHovered(null)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'default' }}
              >
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0 }} />
                <span>{label}</span>
                <span className="tabular-nums text-slate-400">{pct}%</span>
              </button>
            )
          })}
        </div>
      )}
    </CardShell>
  )
}