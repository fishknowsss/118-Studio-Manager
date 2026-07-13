import { useEffect, useMemo, useRef, useState, type PointerEventHandler, type WheelEventHandler } from 'react'
import { useToast } from '../components/feedback/ToastProvider'
import { SquidMarkSvg } from '../components/easter/SquidMark'
import { getSquidVariant, SQUID_PERSON_NAME } from '../components/easter/squidMarkUtils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { buildGraphData } from '../features/graph/graphData'
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  MIN_SCALE,
  MAX_SCALE,
  type DisplayMode,
  type GraphViewSnapshot,
  type LayoutMode,
  type SimNode,
  type Viewport,
} from '../features/graph/graphTypes'
import {
  applyDisplayModeFilter,
  buildAdjacency,
  buildEdgePath,
  buildHexagonPoints,
  buildLaneEdgePath,
  buildLaneLayout,
  buildRadialLayout,
  clamp,
  cloneNodeMap,
  ensureSimulationNodes,
  getGraphSearchMatches,
  getKindLabel,
  getNextGraphNodeId,
  runForceSimulation,
  toScenePoint,
  truncateGraphTextByWidth,
} from '../features/graph/graphUtils'

const LANE_NODE_WIDTH = {
  project: 250,
  task: 330,
  person: 250,
}

const LANE_NODE_HEIGHT = 66
const LANE_GUIDE_WIDTH = {
  project: 306,
  task: 390,
  person: 306,
}
const LANE_X = {
  project: 250,
  task: SCENE_WIDTH / 2,
  person: SCENE_WIDTH - 250,
}

export function Graph() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const { toast } = useToast()

  const [displayMode, setDisplayMode] = useState<DisplayMode>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('lanes')
  const [showLabels, setShowLabels] = useState(true)
  const [hideDone, setHideDone] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [draggingCanvas, setDraggingCanvas] = useState(false)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<string | null>(null)
  const [renderNodeMap, setRenderNodeMap] = useState<Record<string, SimNode>>({})
  const [simRevision, setSimRevision] = useState(0)
  const [tooltipScreenPos, setTooltipScreenPos] = useState<{ x: number; y: number } | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const simNodesRef = useRef<Record<string, SimNode>>({})
  const canvasDragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const nodeDragRef = useRef<string | null>(null)
  const nodeDragMovedRef = useRef(false)
  const viewportRef = useRef<Viewport>(viewport)
  const originalViewRef = useRef<GraphViewSnapshot | null>(null)
  const activeSelectedNodeIdRef = useRef<string | null>(null)
  const simulationActiveRef = useRef(false)
  const nodeElementRefs = useRef(new Map<string, SVGGElement>())

  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

  const graph = useMemo(
    () => buildGraphData(projects, tasks, people),
    [people, projects, tasks],
  )

  const displayGraph = useMemo(
    () => applyDisplayModeFilter(graph, displayMode),
    [displayMode, graph],
  )

  const filteredGraph = useMemo(() => {
    if (!hideDone) return displayGraph
    const nodes = displayGraph.nodes.filter((node) => !(node.kind === 'task' && node.urgency === 'urg-done'))
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = displayGraph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }, [displayGraph, hideDone])

  const displayAdjacency = useMemo(
    () => buildAdjacency(filteredGraph.edges),
    [filteredGraph.edges],
  )

  const searchKeyword = searchText.trim().toLowerCase()

  const allSearchMatches = useMemo(
    () => getGraphSearchMatches(filteredGraph.nodes, searchKeyword),
    [filteredGraph.nodes, searchKeyword],
  )

  const searchResults = useMemo(
    () => allSearchMatches.slice(0, 8),
    [allSearchMatches],
  )

  const searchMatchedNodeIds = useMemo(
    () => new Set(allSearchMatches.map((node) => node.id)),
    [allSearchMatches],
  )

  const scopedGraph = useMemo(() => {
    let allowedNodeIds = new Set(filteredGraph.nodes.map((node) => node.id))

    if (searchKeyword) {
      if (searchMatchedNodeIds.size === 0) {
        allowedNodeIds = new Set<string>()
      } else {
        const searchScopeIds = new Set<string>()
        for (const nodeId of searchMatchedNodeIds) {
          searchScopeIds.add(nodeId)
          const neighbors = displayAdjacency.get(nodeId)
          if (!neighbors) continue
          for (const neighborId of neighbors) {
            searchScopeIds.add(neighborId)
          }
        }

        allowedNodeIds = new Set(
          [...allowedNodeIds].filter((nodeId) => searchScopeIds.has(nodeId)),
        )
      }
    }

    const nodes = filteredGraph.nodes.filter((node) => allowedNodeIds.has(node.id))
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = filteredGraph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }, [displayAdjacency, filteredGraph, searchKeyword, searchMatchedNodeIds])

  const scopedNodeIds = useMemo(
    () => new Set(scopedGraph.nodes.map((node) => node.id)),
    [scopedGraph.nodes],
  )

  const activeSelectedNodeId = selectedNodeId && scopedNodeIds.has(selectedNodeId)
    ? selectedNodeId
    : null

  const activeHoveredNodeId = hoveredNodeId && scopedNodeIds.has(hoveredNodeId)
    ? hoveredNodeId
    : null

  useEffect(() => {
    activeSelectedNodeIdRef.current = activeSelectedNodeId
  }, [activeSelectedNodeId])

  useEffect(() => {
    const previous = simNodesRef.current
    const nextNodes = ensureSimulationNodes(scopedGraph.nodes, previous)

    if (layoutMode === 'radial' || layoutMode === 'lanes') {
      const positions = layoutMode === 'radial'
        ? buildRadialLayout(scopedGraph.nodes)
        : buildLaneLayout(scopedGraph.nodes, scopedGraph.edges)

      for (const node of Object.values(nextNodes)) {
        const position = positions[node.id]
        if (!position) continue
        node.x = position.x
        node.y = position.y
        node.vx = 0
        node.vy = 0
      }

      simNodesRef.current = nextNodes
      setRenderNodeMap(cloneNodeMap(nextNodes))
      return
    }

    simNodesRef.current = nextNodes
    setRenderNodeMap(cloneNodeMap(nextNodes))

    const SETTLE_THRESHOLD = 0.25
    const emptyPins = new Set<string>()
    let raf = 0
    const run = () => {
      const energy = runForceSimulation(Object.values(simNodesRef.current), scopedGraph.edges, emptyPins)
      setRenderNodeMap(cloneNodeMap(simNodesRef.current))
      // 仍在拖拽 或 能量未收敛 时继续运行
      if (energy > SETTLE_THRESHOLD || nodeDragRef.current) {
        raf = window.requestAnimationFrame(run)
      } else {
        simulationActiveRef.current = false
      }
    }

    simulationActiveRef.current = true
    raf = window.requestAnimationFrame(run)

    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [layoutMode, scopedGraph.edges, scopedGraph.nodes, simRevision])

  const activeNodes = useMemo(() => {
    return scopedGraph.nodes.map((node) => {
      const sim = renderNodeMap[node.id]
      if (sim) return sim

      return { ...node, x: SCENE_WIDTH / 2, y: SCENE_HEIGHT / 2, vx: 0, vy: 0 }
    })
  }, [renderNodeMap, scopedGraph.nodes])

  const activeNodeMap = useMemo(() => {
    const map: Record<string, SimNode> = {}
    for (const node of activeNodes) {
      map[node.id] = node
    }
    return map
  }, [activeNodes])

  const activeEdgeSet = useMemo(
    () => buildAdjacency(scopedGraph.edges),
    [scopedGraph.edges],
  )

  const focusedNodeId = activeHoveredNodeId || activeSelectedNodeId
  const keyboardStartNodeId = activeNodes.some((node) => node.id === keyboardFocusedNodeId)
    ? keyboardFocusedNodeId
    : activeSelectedNodeId ?? activeNodes[0]?.id ?? null

  const selectedNode = useMemo(
    () => activeNodes.find((node) => node.id === activeSelectedNodeId) || null,
    [activeNodes, activeSelectedNodeId],
  )

  const relatedNodeIds = useMemo(() => {
    if (!activeSelectedNodeId) return [] as string[]
    return [...(activeEdgeSet.get(activeSelectedNodeId) || [])]
  }, [activeEdgeSet, activeSelectedNodeId])

  const relatedNodes = useMemo(
    () => activeNodes.filter((node) => relatedNodeIds.includes(node.id)),
    [activeNodes, relatedNodeIds],
  )

  const graphStats = useMemo(() => {
    const kindCount = { project: 0, task: 0, person: 0 }
    for (const node of scopedGraph.nodes) {
      kindCount[node.kind] += 1
    }

    const topNodes = scopedGraph.nodes
      .map((node) => ({ ...node, degree: activeEdgeSet.get(node.id)?.size || 0 }))
      .sort((left, right) => right.degree - left.degree)
      .slice(0, 5)

    return {
      kindCount,
      topNodes,
      density: scopedGraph.nodes.length > 0
        ? (scopedGraph.edges.length / scopedGraph.nodes.length).toFixed(1)
        : '0.0',
    }
  }, [activeEdgeSet, scopedGraph.edges, scopedGraph.nodes])

  const laneSummaries = useMemo(() => {
    const summary = {
      project: { count: 0, alert: 0 },
      task: { count: 0, alert: 0 },
      person: { count: 0, alert: 0 },
    }
    const alertUrgencies = new Set(['urg-blocked', 'urg-overdue', 'urg-today', 'urg-soon'])

    for (const node of scopedGraph.nodes) {
      summary[node.kind].count += 1
      if (alertUrgencies.has(node.urgency)) summary[node.kind].alert += 1
    }

    return [
      { kind: 'project' as const, title: '项目', subtitle: `${summary.project.count} 个 · ${summary.project.alert} 个需关注`, x: LANE_X.project, width: LANE_GUIDE_WIDTH.project },
      { kind: 'task' as const, title: '任务', subtitle: `${summary.task.count} 个 · ${summary.task.alert} 个紧急`, x: LANE_X.task, width: LANE_GUIDE_WIDTH.task },
      { kind: 'person' as const, title: '人员', subtitle: `${summary.person.count} 人 · ${summary.person.alert} 人有压力`, x: LANE_X.person, width: LANE_GUIDE_WIDTH.person },
    ]
  }, [scopedGraph.nodes])

  const squidNodeIds = useMemo(() => {
    const ids = new Set<string>()
    const squidPeople = scopedGraph.nodes.filter((node) =>
      node.kind === 'person' && node.label.includes(SQUID_PERSON_NAME),
    )
    const squidPersonIds = new Set(squidPeople.map((node) => node.id))
    for (const personNode of squidPeople) ids.add(personNode.id)

    for (const edge of scopedGraph.edges) {
      if (edge.kind !== 'task-person' || !squidPersonIds.has(edge.target)) continue
      ids.add(edge.source)
    }

    return ids
  }, [scopedGraph.edges, scopedGraph.nodes])

  const centerNodeInViewport = (nodeId: string) => {
    const node = simNodesRef.current[nodeId] || activeNodeMap[nodeId]
    if (!node) return

    setViewport((current) => ({
      ...current,
      x: SCENE_WIDTH / 2 - node.x * current.scale,
      y: SCENE_HEIGHT / 2 - node.y * current.scale,
    }))
  }

  const rememberOriginalView = () => {
    if (originalViewRef.current) return
    originalViewRef.current = { viewport: { ...viewportRef.current }, searchText }
  }

  const clearNodeDetail = () => {
    activeSelectedNodeIdRef.current = null
    setSelectedNodeId(null)
    setHoveredNodeId(null)
  }

  const restoreOriginalView = () => {
    const snapshot = originalViewRef.current
    if (!snapshot) { clearNodeDetail(); return }
    setSearchText(snapshot.searchText)
    setViewport(snapshot.viewport)
    clearNodeDetail()
    originalViewRef.current = null
  }

  const quickBackFromDetail = () => {
    if (originalViewRef.current) { restoreOriginalView(); return }
    clearNodeDetail()
    originalViewRef.current = null
  }

  const focusNode = (nodeId: string, options?: { center?: boolean }) => {
    rememberOriginalView()
    activeSelectedNodeIdRef.current = nodeId
    setSelectedNodeId(nodeId)
    setKeyboardFocusedNodeId(nodeId)
    if (options?.center ?? true) centerNodeInViewport(nodeId)
  }

  const handleWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    event.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const viewX = ((event.clientX - rect.left) / rect.width) * SCENE_WIDTH
    const viewY = ((event.clientY - rect.top) / rect.height) * SCENE_HEIGHT
    const scaleFactor = event.deltaY < 0 ? 1.08 : 0.92

    setViewport((current) => {
      const nextScale = clamp(current.scale * scaleFactor, MIN_SCALE, MAX_SCALE)
      const sceneX = (viewX - current.x) / current.scale
      const sceneY = (viewY - current.y) / current.scale
      return { scale: nextScale, x: viewX - sceneX * nextScale, y: viewY - sceneY * nextScale }
    })
  }

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    if (event.button !== 0) return
    if ((event.target as Element).closest('.graph-node-group')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingCanvas(true)
    setHoveredNodeId(null)
    canvasDragOriginRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    if (activeHoveredNodeId && !draggingNodeId && !draggingCanvas) {
      setTooltipScreenPos({ x: event.clientX, y: event.clientY })
    }

    const draggingNode = nodeDragRef.current

    if (draggingNode) {
      const point = toScenePoint(svgRef.current, viewportRef.current, event.clientX, event.clientY)
      if (!point) return
      const node = simNodesRef.current[draggingNode]
      if (!node) return
      node.x = clamp(point.x, 28, SCENE_WIDTH - 28)
      node.y = clamp(point.y, 28, SCENE_HEIGHT - 28)
      node.vx = 0
      node.vy = 0
      nodeDragMovedRef.current = true
      setRenderNodeMap(cloneNodeMap(simNodesRef.current))
      return
    }

    if (!draggingCanvas || !canvasDragOriginRef.current) return
    const dx = event.clientX - canvasDragOriginRef.current.x
    const dy = event.clientY - canvasDragOriginRef.current.y
    canvasDragOriginRef.current = { x: event.clientX, y: event.clientY }
    setViewport((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
  }

  const handlePointerUp: PointerEventHandler<SVGSVGElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const wasNodeDrag = nodeDragMovedRef.current
    nodeDragRef.current = null
    nodeDragMovedRef.current = false
    setDraggingNodeId(null)
    setDraggingCanvas(false)
    canvasDragOriginRef.current = null
    // 拖拽节点后重启仿真，让其他节点响应新位置
    if (wasNodeDrag) setSimRevision(r => r + 1)
  }

  const handleNodePointerDown = (nodeId: string): PointerEventHandler<SVGGElement> => (event) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    rememberOriginalView()
    activeSelectedNodeIdRef.current = nodeId
    nodeDragRef.current = nodeId
    nodeDragMovedRef.current = false
    setDraggingNodeId(nodeId)
    setSelectedNodeId(nodeId)
    // 拖拽时若仿真已收敛，重启它以便其他节点响应
    if (!simulationActiveRef.current) {
      simulationActiveRef.current = true
    }
  }

  const copyNodeName = async (node: SimNode) => {
    try {
      await navigator.clipboard.writeText(node.label)
      toast(`已复制：${node.label}`, 'success')
    } catch {
      toast('复制失败，请手动复制', 'error')
    }
  }

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!activeSelectedNodeIdRef.current) return
      event.preventDefault()
      event.stopPropagation()

      const snapshot = originalViewRef.current
      if (snapshot) {
        setSearchText(snapshot.searchText)
        setViewport(snapshot.viewport)
        activeSelectedNodeIdRef.current = null
        setSelectedNodeId(null)
        setHoveredNodeId(null)
        originalViewRef.current = null
        return
      }

      activeSelectedNodeIdRef.current = null
      setSelectedNodeId(null)
      setHoveredNodeId(null)
    }

    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
  }, [])

  return (
    <div className="view-graph fade-in">
      <div className="view-header">
        <h1 className="view-title">图谱</h1>
        <div className="view-actions">
          <div className="filter-bar graph-filter-bar">
            <input
              className="filter-input graph-search-input"
              aria-label="搜索图谱节点"
              placeholder="搜索节点…"
              value={searchText}
              onChange={(event) => {
                clearNodeDetail()
                originalViewRef.current = null
                setSearchText(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) {
                  event.preventDefault()
                  focusNode(searchResults[0].id)
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="view-body graph-view-body">
        <div className="graph-stage-panel">
          <div className="graph-hint-bar">
            <span className="graph-pill">节点 {scopedGraph.nodes.length}</span>
            <span className="graph-pill">连线 {scopedGraph.edges.length}</span>
            <span className="graph-kind-legend">◇ 项目 · ○ 任务 · ⬡ 人员</span>
          </div>

          {/* 右上角：返回原视图（有选中节点时）+ 重置视角 */}
          <div className="graph-canvas-topright">
            {selectedNode ? (
              <button className="graph-stage-quick-back" type="button" onClick={quickBackFromDetail}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>返回原视图</span>
                <span className="graph-stage-quick-back-kbd">Esc</span>
              </button>
            ) : null}
            <button className="graph-canvas-reset-btn" type="button" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })} title="重置视角">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 8L8 1.5 14.5 8" />
                <path d="M3.5 6.5V14h3.5v-4h2v4H12.5V6.5" />
              </svg>
            </button>
          </div>

          {/* 主浮动工具栏（右侧居中） */}
          <div className="graph-canvas-toolbar">
            {/* 关系范围 */}
            <button className={`graph-canvas-btn${displayMode === 'all' ? ' active' : ''}`} type="button" aria-label="全量关系" aria-pressed={displayMode === 'all'} onClick={() => { clearNodeDetail(); originalViewRef.current = null; setDisplayMode('all') }} title="全量关系">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="8,1.5 14.1,11.25 1.9,11.25"/>
                <polygon points="8,14.5 1.9,4.75 14.1,4.75"/>
              </svg>
            </button>
            <button className={`graph-canvas-btn${displayMode === 'project-task' ? ' active' : ''}`} type="button" aria-label="项目与任务" aria-pressed={displayMode === 'project-task'} onClick={() => { clearNodeDetail(); originalViewRef.current = null; setDisplayMode('project-task') }} title="项目·任务">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L14 8L8 14L2 8z"/>
              </svg>
            </button>
            <button className={`graph-canvas-btn${displayMode === 'task-person' ? ' active' : ''}`} type="button" aria-label="任务与人员" aria-pressed={displayMode === 'task-person'} onClick={() => { clearNodeDetail(); originalViewRef.current = null; setDisplayMode('task-person') }} title="任务·人员">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="8" cy="5.5" r="2.5"/>
                <path d="M2.5 14.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/>
              </svg>
            </button>
            <div className="graph-canvas-sep" />
            <button className={`graph-canvas-btn${layoutMode === 'force' ? ' active' : ''}`} type="button" aria-label="动态力导布局" aria-pressed={layoutMode === 'force'} onClick={() => setLayoutMode('force')} title="动态力导">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="2.5" cy="12.5" r="1.5" />
                <circle cx="13.5" cy="12.5" r="1.5" />
                <line x1="8" y1="4.5" x2="2.5" y2="11" />
                <line x1="8" y1="4.5" x2="13.5" y2="11" />
                <line x1="4" y1="12.5" x2="12" y2="12.5" />
              </svg>
            </button>
            <button className={`graph-canvas-btn${layoutMode === 'radial' ? ' active' : ''}`} type="button" aria-label="同心分层布局" aria-pressed={layoutMode === 'radial'} onClick={() => setLayoutMode('radial')} title="同心分层">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="6.5" />
                <circle cx="8" cy="8" r="3.5" />
                <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button className={`graph-canvas-btn${layoutMode === 'lanes' ? ' active' : ''}`} type="button" aria-label="分组泳道布局" aria-pressed={layoutMode === 'lanes'} onClick={() => setLayoutMode('lanes')} title="分组泳道">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <rect x="1.5" y="3" width="3.5" height="10" rx="1" />
                <rect x="6.25" y="3" width="3.5" height="10" rx="1" />
                <rect x="11" y="3" width="3.5" height="10" rx="1" />
              </svg>
            </button>
            <div className="graph-canvas-sep" />
            <button className={`graph-canvas-btn${showLabels ? ' active' : ''}`} type="button" aria-label="显示节点标签" aria-pressed={showLabels} onClick={() => setShowLabels((v) => !v)} title={showLabels ? '隐藏标签' : '显示标签'}>
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 3h11v2H9.5v8h-3V5H2.5V3z" />
              </svg>
            </button>
          </div>

          {/* 右下角已完成任务过滤 */}
          <button className={`graph-canvas-hide-done${hideDone ? ' active' : ''}`} type="button" aria-pressed={hideDone} onClick={() => { clearNodeDetail(); originalViewRef.current = null; setHideDone((value) => !value) }} title={hideDone ? '显示已完成任务' : '隐藏已完成任务'}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h12l-4 5.5V13l-4-1.5V8.5L2 3z" />
            </svg>
            {hideDone ? '已过滤完成任务' : '显示全部任务'}
          </button>

          <svg
            ref={svgRef}
            className={`graph-stage ${draggingNodeId ? 'dragging-node' : ''}`}
            viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(event) => { event.preventDefault(); if (activeSelectedNodeId) quickBackFromDetail() }}
          >
            <defs>
              <pattern id="graph-dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(100,116,139,0.13)" />
              </pattern>
              <marker id="graph-arrow-pt" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,0.5 L0,6.5 L6,3.5 z" className="graph-arrow-fill project-task" />
              </marker>
              <marker id="graph-arrow-tp" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,0.5 L0,6.5 L6,3.5 z" className="graph-arrow-fill task-person" />
              </marker>
              <filter id="graph-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                <feFlood floodOpacity="0.28" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* 固定点阵背景，不随视口平移缩放 */}
            <rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill="url(#graph-dot-grid)" />

            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
              {layoutMode === 'lanes' ? (
                <g className="graph-lane-guides">
                  {laneSummaries.map((lane) => {
                    const guideLeft = lane.x - lane.width / 2
                    const guideRight = lane.x + lane.width / 2

                    return (
                      <g key={lane.kind} className={`graph-lane-guide ${lane.kind}`}>
                        <line className="graph-lane-guide-mark" x1={guideLeft + 10} x2={guideLeft + 10} y1={58} y2={100} />
                        <text className="graph-lane-guide-title" x={guideLeft + 24} y={74}>{lane.title}</text>
                        <text className="graph-lane-guide-meta" x={guideLeft + 24} y={97}>{lane.subtitle}</text>
                        <line className="graph-lane-guide-rule" x1={guideLeft + 10} x2={guideRight - 10} y1={122} y2={122} />
                      </g>
                    )
                  })}
                </g>
              ) : null}

              {scopedGraph.edges.map((edge) => {
                const source = activeNodeMap[edge.source]
                const target = activeNodeMap[edge.target]
                if (!source || !target) return null

                const isFocused = Boolean(focusedNodeId && (edge.source === focusedNodeId || edge.target === focusedNodeId))
                const dimmed = Boolean(focusedNodeId && !isFocused)
                const matched = searchMatchedNodeIds.has(edge.source) || searchMatchedNodeIds.has(edge.target)

                return (
                  <path
                    key={edge.id}
                    className={`graph-edge ${edge.kind} ${layoutMode === 'lanes' ? 'lanes' : ''} ${isFocused ? 'focused' : ''} ${dimmed ? 'dimmed' : ''} ${matched ? 'matched' : ''}`}
                    d={layoutMode === 'lanes' ? buildLaneEdgePath(source, target, edge.kind) : buildEdgePath(source, target, edge.kind)}
                    markerEnd={edge.kind === 'project-task' ? 'url(#graph-arrow-pt)' : 'url(#graph-arrow-tp)'}
                  />
                )
              })}

              {activeNodes.map((node) => {
                const isFocused = focusedNodeId === node.id
                const isRelated = Boolean(focusedNodeId && activeEdgeSet.get(focusedNodeId)?.has(node.id))
                const isMatched = searchMatchedNodeIds.has(node.id)
                const isDragging = draggingNodeId === node.id
                const dimmed = Boolean(focusedNodeId && !isFocused && !isRelated)
                const showLabel = showLabels || isFocused || isRelated || isMatched
                const isLaneCanvas = layoutMode === 'lanes'
                const cardWidth = LANE_NODE_WIDTH[node.kind]
                const cardHalfWidth = cardWidth / 2
                const cardHalfHeight = LANE_NODE_HEIGHT / 2
                const projectHalf = node.size * 0.72
                const cardTextWidth = cardWidth - (node.kind === 'task' ? 126 : 86)
                const truncatedLabel = isLaneCanvas
                  ? truncateGraphTextByWidth(node.label, cardTextWidth)
                  : truncateGraphTextByWidth(node.label, 126)
                const truncatedSubtitle = truncateGraphTextByWidth(node.subtitle, isLaneCanvas ? cardTextWidth : 180)

                return (
                  <g
                    key={node.id}
                    ref={(element) => {
                      if (element) nodeElementRefs.current.set(node.id, element)
                      else nodeElementRefs.current.delete(node.id)
                    }}
                    className={`graph-node-group ${node.kind} ${isLaneCanvas ? 'card-node' : ''} ${isFocused ? 'focused' : ''} ${isRelated ? 'related' : ''} ${isMatched ? 'matched' : ''} ${isDragging ? 'dragging' : ''} ${dimmed ? 'dimmed' : ''}`}
                    role="button"
                    tabIndex={node.id === keyboardStartNodeId ? 0 : -1}
                    aria-label={`${node.kind === 'project' ? '项目' : node.kind === 'task' ? '任务' : '人员'}：${node.label}`}
                    data-graph-node-id={node.id}
                    data-urgency={node.urgency}
                    transform={`translate(${node.x} ${node.y})`}
                    onPointerDown={handleNodePointerDown(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                    onFocus={() => setKeyboardFocusedNodeId(node.id)}
                    onClick={(event) => { event.stopPropagation(); focusNode(node.id, { center: false }) }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        focusNode(node.id, { center: false })
                        return
                      }

                      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
                      event.preventDefault()
                      event.stopPropagation()
                      const nextNodeId = getNextGraphNodeId(
                        activeNodes.map((activeNode) => activeNode.id),
                        node.id,
                        event.key as 'ArrowRight' | 'ArrowDown' | 'ArrowLeft' | 'ArrowUp' | 'Home' | 'End',
                      )
                      if (!nextNodeId) return
                      setKeyboardFocusedNodeId(nextNodeId)
                      window.requestAnimationFrame(() => nodeElementRefs.current.get(nextNodeId)?.focus())
                    }}
                  >
                    {isLaneCanvas ? (
                      <>
                        {(isFocused || isRelated) ? (
                          <rect
                            className={`graph-focus-ring ${isFocused ? 'selected' : 'related'}`}
                            x={-cardHalfWidth - 5}
                            y={-cardHalfHeight - 5}
                            width={cardWidth + 10}
                            height={LANE_NODE_HEIGHT + 10}
                            rx={13}
                          />
                        ) : null}
                        <rect
                          className="graph-node-card-bg"
                          x={-cardHalfWidth}
                          y={-cardHalfHeight}
                          width={cardWidth}
                          height={LANE_NODE_HEIGHT}
                          rx={10}
                        />
                        <rect
                          className="graph-node-card-accent"
                          x={-cardHalfWidth}
                          y={-cardHalfHeight + 8}
                          width={3}
                          height={LANE_NODE_HEIGHT - 16}
                          rx={2}
                        />
                        <g transform={`translate(${-cardHalfWidth + 24} 0)`}>
                          {node.kind === 'project' ? (
                            <rect
                              className="graph-node-core"
                              x={-8}
                              y={-8}
                              width={16}
                              height={16}
                              rx={2.2}
                              transform="rotate(45)"
                            />
                          ) : null}
                          {node.kind === 'task' ? (
                            <circle className="graph-node-core" r={9} />
                          ) : null}
                          {node.kind === 'person' ? (
                            <polygon className="graph-node-core" points={buildHexagonPoints(9)} />
                          ) : null}
                        </g>
                        <text className="graph-node-card-title" x={-cardHalfWidth + 46} y={-8}>{truncatedLabel}</text>
                        {showLabel ? (
                          <text className="graph-node-card-meta" x={-cardHalfWidth + 46} y={16}>{truncatedSubtitle}</text>
                        ) : null}
                        {node.urgency ? (
                          <circle
                            className="graph-node-urgency-dot"
                            data-urgency={node.urgency}
                            cx={cardHalfWidth - 15}
                            cy={-cardHalfHeight + 14}
                            r={4}
                          />
                        ) : null}
                        {squidNodeIds.has(node.id) ? (
                          <SquidMarkSvg variant={getSquidVariant(node.id)} x={cardHalfWidth - 42} y={cardHalfHeight - 30} />
                        ) : null}
                      </>
                    ) : (
                      <>
                    {/* 焦点光环（在节点形状之下渲染） */}
                    {(isFocused || isRelated) ? (
                      <circle
                        className={`graph-focus-ring ${isFocused ? 'selected' : 'related'}`}
                        r={node.size + (isFocused ? 10 : 6)}
                      />
                    ) : null}

                    {/* 节点形状 */}
                    {node.kind === 'project' ? (
                      <rect
                        className="graph-node-core"
                        x={-projectHalf} y={-projectHalf}
                        width={projectHalf * 2} height={projectHalf * 2}
                        rx={2.6} transform="rotate(45)"
                        filter={isFocused ? 'url(#graph-glow)' : undefined}
                      />
                    ) : null}
                    {node.kind === 'task' ? (
                      <circle
                        className="graph-node-core"
                        r={node.size}
                        filter={isFocused ? 'url(#graph-glow)' : undefined}
                      />
                    ) : null}
                    {node.kind === 'person' ? (
                      <polygon
                        className="graph-node-core"
                        points={buildHexagonPoints(node.size)}
                        filter={isFocused ? 'url(#graph-glow)' : undefined}
                      />
                    ) : null}

                    {/* 紧急度指示点 */}
                    {node.urgency ? (
                      <circle
                        className="graph-node-urgency-dot"
                        data-urgency={node.urgency}
                        cx={node.size * 0.62}
                        cy={-node.size * 0.62}
                        r={3.2}
                      />
                    ) : null}

                    {/* 标签 */}
                    {showLabel ? (
                      <text className="graph-node-label" x={node.size + 7} y={4}>{truncatedLabel}</text>
                    ) : null}
                      </>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          {/* 悬停 Tooltip */}
          {(() => {
            const tooltipNode = !draggingNodeId && !draggingCanvas && activeHoveredNodeId
              ? activeNodeMap[activeHoveredNodeId] ?? null
              : null
            if (!tooltipNode || !tooltipScreenPos) return null
            return (
              <div className="graph-tooltip" style={{ left: tooltipScreenPos.x + 14, top: tooltipScreenPos.y - 56 }}>
                <div className="graph-tooltip-kind">{getKindLabel(tooltipNode.kind)}</div>
                <div className="graph-tooltip-label">{tooltipNode.label}</div>
                {tooltipNode.subtitle ? <div className="graph-tooltip-subtitle">{tooltipNode.subtitle}</div> : null}
              </div>
            )
          })()}
        </div>

        <aside className="graph-side-panel">
          <div className="graph-side-title">快速定位</div>
          {!searchKeyword ? (
            <div className="graph-side-action">搜索节点</div>
          ) : (
            <div className="graph-related-list">
              {searchResults.length === 0 ? (
                <div className="graph-side-action">修改关键词</div>
              ) : (
                searchResults.map((node) => (
                  <button key={node.id} className="graph-related-item" type="button" onClick={() => focusNode(node.id)}>
                    <span className={`graph-related-kind ${node.kind}`}>{getKindLabel(node.kind)}</span>
                    <span className="graph-related-label">{node.label}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="graph-side-title sub">图谱概览</div>
          <div className="graph-overview-grid">
            <div className="graph-overview-card"><span>项目</span><strong>{graphStats.kindCount.project}</strong></div>
            <div className="graph-overview-card"><span>任务</span><strong>{graphStats.kindCount.task}</strong></div>
            <div className="graph-overview-card"><span>人员</span><strong>{graphStats.kindCount.person}</strong></div>
            <div className="graph-overview-card"><span>稠密度</span><strong>{graphStats.density}</strong></div>
          </div>

          <div className="graph-side-title sub">关键节点</div>
          <div className="graph-related-list">
            {graphStats.topNodes.length === 0 ? (
              <div className="graph-side-action">先创建项目、任务或人员</div>
            ) : (
              graphStats.topNodes.map((node) => (
                <button key={node.id} className="graph-related-item compact" type="button" onClick={() => focusNode(node.id)}>
                  <span className={`graph-related-kind ${node.kind}`}>{getKindLabel(node.kind)}</span>
                  <span className="graph-related-label">{node.label}</span>
                  <span className="graph-related-meta">{node.degree} 连接</span>
                </button>
              ))
            )}
          </div>

          <div className="graph-side-title sub">节点详情</div>
          {!selectedNode ? (
            <div className="graph-side-action">选择节点查看详情</div>
          ) : (
            <>
              <div className="graph-detail-card">
                <div className="graph-detail-kind">{getKindLabel(selectedNode.kind)}</div>
                <div className="graph-detail-title">{selectedNode.label}</div>
                <div className="graph-detail-subtitle">{selectedNode.subtitle}</div>
                <div className="graph-detail-subtitle">关联 {relatedNodes.length} 个节点</div>
                <div className="graph-detail-actions">
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => centerNodeInViewport(selectedNode.id)}>居中查看</button>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => void copyNodeName(selectedNode)}>复制名称</button>
                </div>
              </div>
              <div className="graph-related-list">
                {relatedNodes.length === 0 ? (
                  <div className="graph-side-action">选择其他节点</div>
                ) : (
                  relatedNodes.map((node) => (
                    <button key={node.id} className="graph-related-item" type="button" onClick={() => focusNode(node.id)}>
                      <span className={`graph-related-kind ${node.kind}`}>{getKindLabel(node.kind)}</span>
                      <span className="graph-related-label">{node.label}</span>
                      <span className="graph-related-meta">{activeEdgeSet.get(node.id)?.size || 0} 连接</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
