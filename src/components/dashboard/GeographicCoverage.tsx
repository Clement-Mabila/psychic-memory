'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MapPinX, ZoomIn, ZoomOut, Maximize2, Earth, ChevronLeft, ChevronRight } from 'lucide-react'
import CompanyAvatar from '@/components/leads/CompanyAvatar'
import { CardShell, Skel, type InvestorData } from './shared'

type GeoEntry = InvestorData['geography'][number]
type GeoCompany = GeoEntry['companies'][number]

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

function getPalette(v: string | null | undefined, idx: number) {
  return VERT_PALETTE[v as keyof typeof VERT_PALETTE]
    ?? EXTRA_COLORS[idx % EXTRA_COLORS.length]
    ?? { fill: '#94a3b8', stroke: '#64748b', glow: 'rgba(148,163,184,0.30)' }
}

// ── Layout constants ──────────────────────────────────────────────────────────
const MIN_DIST = 68
const CW       = 820
const CH       = 380
const ICON_SZ  = 22

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

interface NodePos { x: number; y: number; entry: GeoEntry; colorIdx: number }

function buildForceLayout(entries: GeoEntry[]): NodePos[] {
  if (entries.length === 0) return []
  const rand = seededRandom(entries.length * 137 + 42)
  const pad  = 44
  const nodes: NodePos[] = entries.map((entry, i) => ({
    x: pad + rand() * (CW - pad * 2),
    y: pad + rand() * (CH - pad * 2),
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
      nodes[i].x = Math.max(pad, Math.min(CW - pad, nodes[i].x + fx))
      nodes[i].y = Math.max(pad, Math.min(CH - pad, nodes[i].y + fy))
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
  const rand  = seededRandom(nodes.length * 31)
  const extra = Math.floor(nodes.length * 0.35)
  for (let e = 0; e < extra; e++) {
    const i = Math.floor(rand() * nodes.length)
    const j = Math.floor(rand() * nodes.length)
    if (i !== j && !edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)))
      edges.push([i, j])
  }
  return edges
}

// ── Drag state ────────────────────────────────────────────────────────────────
type DragState =
  | { kind: 'bg';   startMouse: {x:number;y:number}; startPan: {x:number;y:number} }
  | { kind: 'node'; idx: number; startMouse: {x:number;y:number}; startPos: {x:number;y:number} }

// ── Hover popup ───────────────────────────────────────────────────────────────
const POPUP_W  = 256
const POPUP_H  = 240  // used for viewport-flip calculation
const VISIBLE  = 4    // company rows shown at once

function CityPopup({
  companies,
  companyIdx,
  setCompanyIdx,
  screenX,
  screenY,
  onMouseEnter,
  onMouseLeave,
}: {
  companies: GeoCompany[]
  companyIdx: number
  setCompanyIdx: (n: number) => void
  screenX: number
  screenY: number
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const selected = companies[companyIdx]
  if (!selected) return null

  // Sliding window — keep selected in view
  const windowStart = Math.max(0, Math.min(companyIdx - 1, companies.length - VISIBLE))
  const visible     = companies.slice(windowStart, windowStart + VISIBLE)

  const flipLeft = screenX + POPUP_W + 20 > window.innerWidth - 10
  const rawTop   = screenY - POPUP_H / 2
  const top      = Math.max(8, Math.min(window.innerHeight - POPUP_H - 8, rawTop))
  const left     = flipLeft ? screenX - POPUP_W - 16 : screenX + 16

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed', zIndex: 9999,
        left, top, width: POPUP_W,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        pointerEvents: 'all',
      }}
      className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700"
    >
      {/* Company list */}
      <div className="border-b border-slate-100 dark:border-neutral-800">
        {visible.map((co, i) => {
          const realIdx  = windowStart + i
          const isActive = realIdx === companyIdx
          return (
            <div
              key={co.id}
              onClick={() => setCompanyIdx(realIdx)}
              className={[
                'flex items-center gap-2 px-3 py-[6px] cursor-pointer transition-colors',
                isActive
                  ? 'bg-slate-50 dark:bg-neutral-800'
                  : 'hover:bg-slate-50/60 dark:hover:bg-neutral-800/50',
              ].join(' ')}
            >
              <CompanyAvatar domain={co.domain} name={co.name} size="xxs" circle />
              <span className={[
                'flex-1 text-[12px] truncate',
                isActive
                  ? 'font-semibold text-slate-900 dark:text-white'
                  : 'font-normal text-slate-600 dark:text-slate-300',
              ].join(' ')}>
                {co.name}
              </span>
              {co.is_group_parent && (
                <Earth size={11} className="flex-shrink-0 text-sky-500" strokeWidth={1.75} />
              )}
            </div>
          )
        })}
      </div>

      {/* Summary for selected company */}
      <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 dark:border-neutral-800">
        {selected.summary ? (
          <>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
              {selected.summary}
            </p>
            <a
              href={`/leads?highlight=${selected.id}`}
              className="text-[11px] font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              See more →
            </a>
          </>
        ) : (
          <p className="text-[11px] text-slate-400 dark:text-slate-600 italic">No summary available</p>
        )}
      </div>

      {/* Footer — count left, arrows right */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] text-slate-400 dark:text-slate-500 select-none">
          {companyIdx + 1} / {companies.length}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCompanyIdx(Math.max(0, companyIdx - 1))}
            disabled={companyIdx === 0}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setCompanyIdx(Math.min(companies.length - 1, companyIdx + 1))}
            disabled={companyIdx === companies.length - 1}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GeographicCoverage({
  geo,
  loading,
}: {
  geo: InvestorData['geography']
  loading: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  const [hovered,      setHovered]      = useState<number | null>(null)
  const [companyIdx,   setCompanyIdx]   = useState(0)
  const [pan,          setPan]          = useState({ x: 0, y: 0 })
  const [zoom,         setZoom]         = useState(0.9)
  const [nodeData,     setNodeData]     = useState<Array<{entry: GeoEntry; colorIdx: number}>>([])
  const [positions,    setPositions]    = useState<Array<{x:number;y:number}>>([])
  const [edges,        setEdges]        = useState<[number,number][]>([])
  const [isDragging,   setIsDragging]   = useState(false)
  const [mounted,      setMounted]      = useState(false)

  const panRef      = useRef({ x: 0, y: 0 })
  const zoomRef     = useRef(0.9)
  const dragRef     = useRef<DragState | null>(null)
  const posRef      = useRef<Array<{x:number;y:number}>>([])
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = useMemo(() => geo.reduce((s, g) => s + g.company_count, 0), [geo])

  useEffect(() => { setMounted(true) }, [])

  // Reset company index when node changes
  useEffect(() => { setCompanyIdx(0) }, [hovered])

  const geoKey = geo.map(g => `${g.hq_city}:${g.company_count}`).join(',')
  useEffect(() => {
    const layout = buildForceLayout(geo)
    const pos    = layout.map(n => ({ x: n.x, y: n.y }))
    setNodeData(layout.map(n => ({ entry: n.entry, colorIdx: n.colorIdx })))
    setPositions(pos); posRef.current = pos
    setEdges(buildEdges(layout))
    setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }
    setZoom(0.9);            zoomRef.current = 0.9
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoKey])

  // Window-level drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.kind === 'bg') {
        const newPan = {
          x: d.startPan.x + (e.clientX - d.startMouse.x),
          y: d.startPan.y + (e.clientY - d.startMouse.y),
        }
        panRef.current = newPan; setPan(newPan)
      } else {
        const dx  = (e.clientX - d.startMouse.x) / zoomRef.current
        const dy  = (e.clientY - d.startMouse.y) / zoomRef.current
        const pos = { x: d.startPos.x + dx, y: d.startPos.y + dy }
        const next = [...posRef.current]
        next[d.idx] = pos
        posRef.current = next; setPositions(next)
      }
    }
    const onUp = () => { dragRef.current = null; setIsDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current) }
  function scheduleClose() {
    cancelClose()
    closeTimer.current = setTimeout(() => setHovered(null), 150)
  }
  function onNodeEnter(ni: number) {
    if (isDragging) return
    cancelClose()
    setHovered(ni)
  }

  function onBgDown(e: React.MouseEvent) {
    dragRef.current = { kind: 'bg', startMouse: { x: e.clientX, y: e.clientY }, startPan: { ...panRef.current } }
    setIsDragging(true); setHovered(null)
  }
  function onNodeDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation()
    const startPos = posRef.current[idx] ?? { x: 0, y: 0 }
    dragRef.current = { kind: 'node', idx, startMouse: { x: e.clientX, y: e.clientY }, startPos: { ...startPos } }
    setIsDragging(true); setHovered(null)
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor  = e.deltaY > 0 ? 0.88 : 1.14
    const newZoom = Math.max(0.2, Math.min(4.0, zoomRef.current * factor))
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const newPan = {
      x: mx - (mx - panRef.current.x) * (newZoom / zoomRef.current),
      y: my - (my - panRef.current.y) * (newZoom / zoomRef.current),
    }
    zoomRef.current = newZoom; panRef.current = newPan
    setZoom(newZoom); setPan(newPan)
  }
  function zoomBy(f: number) {
    const nz = Math.max(0.2, Math.min(4.0, zoomRef.current * f))
    zoomRef.current = nz; setZoom(nz)
  }
  function resetView() {
    setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }
    setZoom(0.9);            zoomRef.current = 0.9
  }

  // Derive popup screen position from current pan/zoom — recomputes on any change
  const popupScreenPos = useMemo(() => {
    if (hovered === null || !svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const pos  = positions[hovered]
    if (!pos) return null
    return {
      x: rect.left + pan.x + pos.x * zoom,
      y: rect.top  + pan.y + pos.y * zoom,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, positions, pan, zoom])

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

      <div className="relative w-full rounded-xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden" style={{ height: 275 }}>
        {loading ? (
          <Skel className="w-full h-full rounded-xl" />
        ) : (
          <>
            <svg
              ref={svgRef}
              width="100%" height="100%"
              style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={onBgDown}
              onWheel={onWheel}
            >
              <defs><style>{`
                .gc-edge    { stroke: #e2e8f0; }
                .dark .gc-edge    { stroke: #262626; }
                .gc-label   { fill: #64748b; font-size: 11px; font-family: inherit; }
                .dark .gc-label   { fill: #64748b; }
                .gc-label-h { fill: #1e293b; font-size: 11px; font-weight: 600; font-family: inherit; }
                .dark .gc-label-h { fill: #e2e8f0; }
              `}</style></defs>

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                {/* Edges */}
                {edges.map(([ai, bi], i) => {
                  const a = positions[ai], b = positions[bi]
                  if (!a || !b) return null
                  const lit = !isDragging && (hovered === ai || hovered === bi)
                  return (
                    <line key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={lit ? '#94a3b8' : undefined}
                      className={lit ? undefined : 'gc-edge'}
                      strokeWidth={lit ? 1.4 : 0.6}
                      style={{ transition: isDragging ? 'none' : 'stroke 0.15s, stroke-width 0.15s' }}
                    />
                  )
                })}

                {/* Nodes */}
                {nodeData.map(({ entry, colorIdx }, ni) => {
                  const pos = positions[ni]
                  if (!pos) return null
                  const { x, y } = pos
                  const pal      = getPalette(entry.primary_vertical, colorIdx)
                  const active   = hovered === ni && !isDragging
                  const pillColor = entry.hq_country === 'CA' ? '#06b6d4'
                    : entry.hq_country === 'US' ? '#ec4899'
                    : '#94a3b8'
                  const labelY = y - ICON_SZ - 6

                  return (
                    <g key={ni}
                      onMouseDown={e => onNodeDown(e, ni)}
                      onMouseEnter={() => onNodeEnter(ni)}
                      onMouseLeave={scheduleClose}
                      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                      {/* Transparent hit area — SVG <g> has no painted area without this */}
                      <rect
                        x={x - ICON_SZ * 0.75} y={y - ICON_SZ * 1.3}
                        width={ICON_SZ * 1.5} height={ICON_SZ * 1.3}
                        fill="transparent"
                      />

                      {/* Hover glow */}
                      {active && (
                        <circle cx={x} cy={y - ICON_SZ / 2} r={ICON_SZ * 0.72} fill={pal.glow} />
                      )}

                      {/* MapPinX — tip at (x, y) */}
                      <foreignObject
                        x={x - ICON_SZ / 2} y={y - ICON_SZ}
                        width={ICON_SZ} height={ICON_SZ}
                        style={{ pointerEvents: 'none', overflow: 'visible' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <MapPinX size={ICON_SZ} strokeWidth={active ? 2.1 : 1.75} color={pal.fill} />
                        </div>
                      </foreignObject>

                      {/* Earth badge for cities with a parent company */}
                      {entry.has_group_parent && (
                        <foreignObject
                          x={x + ICON_SZ / 2 - 7} y={y - ICON_SZ - 1}
                          width={13} height={13}
                          style={{ pointerEvents: 'none', overflow: 'visible' }}
                        >
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 13, height: 13, borderRadius: '50%',
                            background: '#0ea5e9',
                            border: '1.5px solid white',
                          }}>
                            <Earth size={7} color="#fff" strokeWidth={2} />
                          </div>
                        </foreignObject>
                      )}

                      {/* Country pill */}
                      <rect
                        x={x - 9} y={labelY - 13}
                        width={18} height={4} rx={2}
                        fill={pillColor} opacity={active ? 1 : 0.65}
                        style={{ pointerEvents: 'none' }}
                      />

                      {/* City label */}
                      <text x={x} y={labelY}
                        textAnchor="middle"
                        className={active ? 'gc-label-h' : 'gc-label'}
                        style={{ pointerEvents: 'none', userSelect: 'none', transition: isDragging ? 'none' : 'fill 0.15s' }}
                      >
                        {entry.hq_country} {entry.hq_city} · {entry.company_count}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* Vignette */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `
                linear-gradient(to right,  rgba(245,245,245,0.5) 0px, transparent 32px),
                linear-gradient(to left,   rgba(245,245,245,0.5) 0px, transparent 32px),
                linear-gradient(to bottom, rgba(245,245,245,0.5) 0px, transparent 32px),
                linear-gradient(to top,    rgba(245,245,245,0.5) 0px, transparent 32px)
              `,
            }} />

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1">
              {[
                { icon: ZoomIn,    title: 'Zoom in',  fn: () => zoomBy(1.25) },
                { icon: ZoomOut,   title: 'Zoom out', fn: () => zoomBy(0.8)  },
                { icon: Maximize2, title: 'Reset',    fn: resetView          },
              ].map(({ icon: BtnIcon, title, fn }) => (
                <button key={title} title={title} onClick={fn}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm transition-colors"
                >
                  <BtnIcon size={13} strokeWidth={1.75} />
                </button>
              ))}
            </div>

            {/* Zoom level */}
            <div className="absolute bottom-3 left-3 text-[10px] text-slate-300 dark:text-slate-700 select-none">
              {Math.round(zoom * 100)}%
            </div>
          </>
        )}
      </div>

      {/* Hover popup — portalled to body */}
      {mounted && popupScreenPos && hovered !== null && !isDragging && (() => {
        const companies = nodeData[hovered]?.entry?.companies ?? []
        if (companies.length === 0) return null
        return (
          <CityPopup
            companies={companies}
            companyIdx={Math.min(companyIdx, companies.length - 1)}
            setCompanyIdx={setCompanyIdx}
            screenX={popupScreenPos.x}
            screenY={popupScreenPos.y}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        )
      })()}

      {/* Legend */}
      {!loading && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(VERT_PALETTE).map(([key, pal]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: pal.fill, flexShrink: 0 }} />
              {key}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
            <Earth size={10} className="text-sky-500" />
            parent co.
          </span>
        </div>
      )}
    </CardShell>
  )
}
