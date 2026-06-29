'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { PIPELINE_AGENTS, CRITIC_AGENTS, LLM_AGENTS, AGENT_META } from './AgentMeta'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ── Accent colour per agent type (icon colour + derived bg tint) ──────────────
const NCOLOR: Record<string, string> = {
  discovery:            '#4f46e5',
  research:             '#9333ea',
  company_intel:        '#0284c7',
  contact:              '#db2777',
  enrichment:           '#ea580c',
  qualification:        '#059669',
  handoff:              '#0d9488',
  research_critic:      '#7c3aed',
  contact_critic:       '#e11d48',
  enrichment_critic:    '#d97706',
  qualification_critic: '#0891b2',
  outreach_critic:      '#65a30d',
  supervisor_critic:    '#a21caf',
  system_llm:           '#be185d',
}

const STATUS_COLOR: Record<string, string> = {
  success: '#10b981', failed: '#ef4444', running: '#3b82f6', pending: '#f59e0b',
}

const CATEGORY_COLOR: Record<string, string> = {
  pipeline: '#4f46e5', critic: '#a21caf', llm: '#be185d',
}

const SHORT_LABEL: Record<string, string> = {
  discovery:            'Discovery',   research:             'Research',
  company_intel:        'Co. Intel',   contact:              'Contact',
  enrichment:           'Enrichment',  qualification:        'Qual.',
  handoff:              'Handoff',     research_critic:      'R. Critic',
  contact_critic:       'C. Critic',   enrichment_critic:    'E. Critic',
  qualification_critic: 'Q. Critic',   outreach_critic:      'O. Critic',
  supervisor_critic:    'Supervisor',  system_llm:           'System LLM',
}

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_BASE  = 28   // min bounding-box side (SVG px)
const NODE_SCALE = 14   // extra px added by runs_24h → 28–42px total
const MIN_DIST   = 94
const CW = 860
const CH = 400

// ── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

type NodeLayout = { agent_type: string; x: number; y: number }

// ── Force-directed layout (same as GeographicCoverage) ───────────────────────
function buildForceLayout(types: string[]): NodeLayout[] {
  if (types.length === 0) return []
  const rand = seededRandom(types.length * 137 + 42)
  const pad  = 58
  const nodes: NodeLayout[] = types.map(type => ({
    agent_type: type,
    x: pad + rand() * (CW - pad * 2),
    y: pad + rand() * (CH - pad * 2),
  }))
  for (let iter = 0; iter < 220; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01
        if (d < MIN_DIST) {
          const f = ((MIN_DIST - d) / MIN_DIST) * 1.5
          fx += (dx / d) * f; fy += (dy / d) * f
        }
      }
      nodes[i].x = Math.max(pad, Math.min(CW - pad, nodes[i].x + fx))
      nodes[i].y = Math.max(pad, Math.min(CH - pad, nodes[i].y + fy))
    }
  }
  return nodes
}

// ── MST + extra random edges ──────────────────────────────────────────────────
function buildEdges(nodes: NodeLayout[]): [number, number][] {
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
  const extra = Math.floor(nodes.length * 0.45)
  for (let e = 0; e < extra; e++) {
    const i = Math.floor(rand() * nodes.length)
    const j = Math.floor(rand() * nodes.length)
    if (i !== j && !edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)))
      edges.push([i, j])
  }
  return edges
}

const ALL_TYPES = [...PIPELINE_AGENTS, ...CRITIC_AGENTS, ...LLM_AGENTS]

// ── Drag ref ──────────────────────────────────────────────────────────────────
type DragState =
  | { kind: 'bg';   startMouse: {x:number;y:number}; startPan: {x:number;y:number} }
  | { kind: 'node'; type: string; startMouse: {x:number;y:number}; startPos: {x:number;y:number} }

// ── Component ─────────────────────────────────────────────────────────────────
export function AgentNetworkViz({ agents }: { agents: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null)

  const [hovered,    setHovered]    = useState<string | null>(null)
  const [pan,        setPan]        = useState({ x: 0, y: 0 })
  const [zoom,       setZoom]       = useState(0.9)
  const [positions,  setPositions]  = useState<Record<string, {x:number;y:number}>>({})
  const [edges,      setEdges]      = useState<[number,number][]>([])
  const [isDragging, setIsDragging] = useState(false)

  const panRef  = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(0.9)
  const dragRef = useRef<DragState | null>(null)
  const posRef  = useRef<Record<string, {x:number;y:number}>>({})

  const agentMap = useMemo(() => {
    const m: Record<string, any> = {}
    for (const a of agents) m[a.agent_type] = a
    return m
  }, [agents])

  const types = useMemo(
    () => agents.length > 0 ? agents.map(a => a.agent_type) : ALL_TYPES,
    [agents],
  )

  useEffect(() => {
    const layout = buildForceLayout(types)
    const pos: Record<string, {x:number;y:number}> = {}
    for (const n of layout) pos[n.agent_type] = { x: n.x, y: n.y }
    setPositions(pos); posRef.current = pos
    setEdges(buildEdges(layout))
    setPan({ x: 0, y: 0 }); panRef.current = { x: 0, y: 0 }
    setZoom(0.9);            zoomRef.current = 0.9
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join(',')])

  // Window-level mouse handlers so drag continues outside SVG bounds
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
        posRef.current = { ...posRef.current, [d.type]: pos }
        setPositions(prev => ({ ...prev, [d.type]: pos }))
      }
    }
    const onUp = () => { dragRef.current = null; setIsDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function onBgDown(e: React.MouseEvent) {
    dragRef.current = { kind: 'bg', startMouse: { x: e.clientX, y: e.clientY }, startPan: { ...panRef.current } }
    setIsDragging(true); setHovered(null)
  }
  function onNodeDown(e: React.MouseEvent, type: string) {
    e.stopPropagation()
    const startPos = posRef.current[type] ?? { x: 0, y: 0 }
    dragRef.current = { kind: 'node', type, startMouse: { x: e.clientX, y: e.clientY }, startPos: { ...startPos } }
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

  const maxRuns = Math.max(1, ...agents.map(a => a.runs_24h ?? 0))
  const nodeSz  = (type: string) => NODE_BASE + ((agentMap[type]?.runs_24h ?? 0) / maxRuns) * NODE_SCALE

  return (
    <div className="w-full h-full flex flex-col px-5 py-4">

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 flex-wrap flex-shrink-0">
        {(['pipeline','critic','llm'] as const).map(cat => (
          <span key={cat} className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 capitalize">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLOR[cat], display: 'inline-block', flexShrink: 0 }} />
            {cat}
          </span>
        ))}
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 capitalize">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
            {s}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-slate-300 dark:text-slate-700">
          Drag nodes · scroll to zoom · size ∝ runs today
        </span>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex-1">
        <svg
          ref={svgRef}
          width="100%" height="100%"
          style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={onBgDown}
          onWheel={onWheel}
        >
          <defs><style>{`
            .nv-edge    { stroke: #e2e8f0; }
            .dark .nv-edge    { stroke: #1e293b; }
            .nv-label   { fill: #64748b; font-size: 11px; font-family: inherit; }
            .dark .nv-label   { fill: #64748b; }
            .nv-label-h { fill: #1e293b; font-size: 11px; font-weight: 600; font-family: inherit; }
            .dark .nv-label-h { fill: #e2e8f0; }
            .tt-bg    { fill: #ffffff; stroke: #e2e8f0; }
            .dark .tt-bg    { fill: #1e2028; stroke: #334155; }
            .tt-title { fill: #1e293b; font-size: 12px; font-weight: 600; font-family: inherit; }
            .dark .tt-title { fill: #f1f5f9; }
            .tt-body  { fill: #64748b; font-size: 11px; font-family: inherit; }
            .dark .tt-body  { fill: #94a3b8; }
            .tt-dim   { fill: #94a3b8; font-size: 10px; font-family: inherit; }
            .dark .tt-dim   { fill: #475569; }
          `}</style></defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* Edges */}
            {edges.map(([ai, bi], i) => {
              const aType = types[ai], bType = types[bi]
              const a = positions[aType], b = positions[bType]
              if (!a || !b) return null
              const lit = !isDragging && (hovered === aType || hovered === bType)
              return (
                <line key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={lit ? '#94a3b8' : undefined}
                  className={lit ? undefined : 'nv-edge'}
                  strokeWidth={lit ? 1.5 : 0.7}
                  style={{ transition: isDragging ? 'none' : 'stroke 0.12s, stroke-width 0.12s' }}
                />
              )
            })}

            {/* Nodes */}
            {types.map(type => {
              const pos = positions[type]
              if (!pos) return null
              const { x, y }  = pos
              const data       = agentMap[type]
              const meta       = AGENT_META[type]
              const Icon       = meta?.icon ?? null
              const color      = NCOLOR[type] ?? '#94a3b8'
              const sz         = nodeSz(type)
              const half       = sz / 2
              const iconSz     = Math.round(sz * 0.55)
              const active     = hovered === type && !isDragging
              const isRunning  = data?.last_status === 'running'
              const dotColor   = data?.last_status ? (STATUS_COLOR[data.last_status] ?? null) : null

              // Tooltip position (relative to node centre)
              const TW = 178, TH = data?.last_lead_name ? 82 : 66
              let ttx = half + 10, tty = -TH / 2
              if (x + ttx + TW > CW - 4) ttx = -(half + TW + 10)
              if (y + tty < 4)            tty = -half
              if (y + tty + TH > CH - 4)  tty = (CH - 4 - y) - TH

              return (
                <g key={type}
                  transform={`translate(${x},${y})`}
                  onMouseDown={e => onNodeDown(e, type)}
                  onMouseEnter={() => { if (!isDragging) setHovered(type) }}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  {/* Running pulse ring */}
                  {isRunning && (
                    <rect x={-(half+5)} y={-(half+5)} width={sz+10} height={sz+10}
                      rx={(half+5)*0.32} fill={color} opacity={0}
                    >
                      <animate attributeName="opacity" values="0;0.35;0" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="x" values={`${-(half+5)};${-(half+11)};${-(half+5)}`} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="y" values={`${-(half+5)};${-(half+11)};${-(half+5)}`} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="width" values={`${sz+10};${sz+22};${sz+10}`} dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="height" values={`${sz+10};${sz+22};${sz+10}`} dur="1.6s" repeatCount="indefinite" />
                    </rect>
                  )}

                  {/* Hover glow */}
                  {active && !isRunning && (
                    <rect x={-(half+5)} y={-(half+5)} width={sz+10} height={sz+10}
                      rx={(half+5)*0.32} fill={color} opacity={0.13}
                    />
                  )}

                  {/* Icon background (rounded square) */}
                  <rect x={-half} y={-half} width={sz} height={sz}
                    rx={sz * 0.28}
                    fill={color} fillOpacity={active ? 0.17 : 0.1}
                    stroke={color} strokeWidth={active ? 1.8 : 1.1}
                    strokeOpacity={active ? 1 : 0.45}
                    style={{ transition: isDragging ? 'none' : 'fill-opacity 0.12s, stroke-opacity 0.12s, stroke-width 0.12s' }}
                  />

                  {/* Lucide icon rendered via foreignObject */}
                  {Icon && (
                    <foreignObject
                      x={-half} y={-half} width={sz} height={sz}
                      style={{ pointerEvents: 'none', overflow: 'visible' }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: '100%',
                      }}>
                        <Icon size={iconSz} strokeWidth={1.75} color={color} />
                      </div>
                    </foreignObject>
                  )}

                  {/* Label below node */}
                  <text y={half + 13} textAnchor="middle"
                    className={active ? 'nv-label-h' : 'nv-label'}
                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.12s' }}
                  >
                    {SHORT_LABEL[type] ?? type}
                  </text>

                  {/* Status dot — bottom-right corner */}
                  {dotColor && (
                    <circle cx={half - 2} cy={half - 2} r={3.5}
                      fill={dotColor} stroke="#fff" strokeWidth={1.2}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* Runs badge — top-right corner */}
                  {(data?.runs_24h ?? 0) > 0 && (
                    <>
                      <circle cx={half + 1} cy={-(half + 1)} r={7}
                        fill={color} stroke="#fff" strokeWidth={1}
                        style={{ pointerEvents: 'none' }}
                      />
                      <text x={half + 1} y={-(half + 1) + 3.5}
                        textAnchor="middle"
                        style={{ fontSize: 7, fill: '#fff', fontWeight: 700, fontFamily: 'inherit', pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {(data.runs_24h > 99) ? '99+' : data.runs_24h}
                      </text>
                    </>
                  )}

                  {/* Tooltip */}
                  {active && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={ttx} y={tty} width={TW} height={TH} rx={7}
                        className="tt-bg" strokeWidth={0.8}
                        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.13))' }}
                      />
                      <text x={ttx+10} y={tty+17} className="tt-title">
                        {data?.display_name ?? meta?.label ?? SHORT_LABEL[type]}
                      </text>
                      <text x={ttx+10} y={tty+33} className="tt-body">
                        {`${data?.runs_24h ?? 0} runs today${data?.last_status ? ` · ${data.last_status}` : ''}`}
                      </text>
                      {data?.last_lead_name && (
                        <text x={ttx+10} y={tty+49} className="tt-body">
                          {`Last: ${data.last_lead_name.length > 22 ? data.last_lead_name.slice(0,22)+'…' : data.last_lead_name}`}
                        </text>
                      )}
                      {data?.last_run_at && (
                        <text x={ttx+10} y={tty + (data?.last_lead_name ? 65 : 49)} className="tt-dim">
                          {formatRelativeTime(data.last_run_at)}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            linear-gradient(to right,  rgba(245,245,245,0.5) 0px, transparent 36px),
            linear-gradient(to left,   rgba(245,245,245,0.5) 0px, transparent 36px),
            linear-gradient(to bottom, rgba(245,245,245,0.5) 0px, transparent 36px),
            linear-gradient(to top,    rgba(245,245,245,0.5) 0px, transparent 36px)
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
      </div>
    </div>
  )
}
