import { useEffect, useMemo, useRef, useState, type MouseEventHandler, type WheelEventHandler } from 'react'
import { useToast } from '../components/feedback/ToastProvider'
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
  type LocalDepth,
  type SimNode,
  type Viewport,
} from '../features/graph/graphTypes'
import {
  applyDisplayModeFilter,
  buildAdjacency,
  buildEdgePath,
  buildHexagonPoints,
  buildLaneLayout,
  buildRadialLayout,
  clamp,
  cloneNodeMap,
  collectReachableNodeIds,
  ensureSimulationNodes,
  getKindLabel,
  runForceSimulation,
  toScenePoint,
} from '../features/graph/graphUtils'

export function Graph() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const { toast } = useToast()

  const [displayMode, setDisplayMode] = useState<DisplayMode>('all')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force')
  const [localDepth, setLocalDepth] = useState<LocalDepth>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [draggingCanvas, setDraggingCanvas] = useState(false)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [pinnedNodeMap, setPinnedNodeMap] = useState<Record<string, boolean>>({})
  const [renderNodeMap, setRenderNodeMap] = useState<Record<string, SimNode>>({})

  const svgRef = useRef<SVGSVGElement | null>(null)
  const simNodesRef = useRef<Record<string, SimNode>>({})
  const canvasDragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const nodeDragRef = useRef<string | null>(null)
  const nodeDragMovedRef = useRef(false)
  const viewportRef = useRef<Viewport>(viewport)
  const originalViewRef = useRef<GraphViewSnapshot | null>(null)
  const activeSelectedNodeIdRef = useRef<string | null>(null)

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

  const displayAdjacency = useMemo(
    () => buildAdjacency(displayGraph.edges),
    [displayGraph.edges],
  )

  const displayNodeIds = useMemo(
    () => new Set(displayGraph.nodes.map((node) => node.id)),
    [displayGraph.nodes],
  )

  const selectedSeedNodeId = selectedNodeId && displayNodeIds.has(selectedNodeId)
    ? selectedNodeId
    : null

  const searchKeyword = searchText.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!searchKeyword) return [] as typeof displayGraph.nodes

    const kindOrder: Record<string, number> = { project: 0, task: 1, person: 2 }

    return displayGraph.nodes
      .filter((node) => node.label.toLowerCase().includes(searchKeyword))
      .sort((left, right) => {
        const leftStarts = left.label.toLowerCase().startsWith(searchKeyword) ? 0 : 1
        const rightStarts = right.label.toLowerCase().startsWith(searchKeyword) ? 0 : 1
        if (leftStarts !== rightStarts) return leftStarts - rightStarts

        const leftKind = kindOrder[left.kind] ?? 0
        const rightKind = kindOrder[right.kind] ?? 0
        if (leftKind !== rightKind) return leftKind - rightKind

        return left.label.localeCompare(right.label)
      })
      .slice(0, 8)
  }, [displayGraph.nodes, searchKeyword])

  const searchMatchedNodeIds = useMemo(
    () => new Set(searchResults.map((node) => node.id)),
    [searchResults],
  )

  const scopedGraph = useMemo(() => {
    let allowedNodeIds = new Set(displayGraph.nodes.map((node) => node.id))

    if (selectedSeedNodeId && localDepth !== 'all') {
      const depthLimit = localDepth === '1' ? 1 : 2
      const localNodeIds = collectReachableNodeIds(selectedSeedNodeId, depthLimit, displayAdjacency)
      allowedNodeIds = new Set(
        [...allowedNodeIds].filter((nodeId) => localNodeIds.has(nodeId)),
      )
    }

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

    const nodes = displayGraph.nodes.filter((node) => allowedNodeIds.has(node.id))
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = displayGraph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }, [displayAdjacency, displayGraph, localDepth, searchKeyword, searchMatchedNodeIds, selectedSeedNodeId])

  const scopedNodeIds = useMemo(
    () => new Set(scopedGraph.nodes.map((node) => node.id)),
    [scopedGraph.nodes],
  )

  const pinnedNodeIds = useMemo(() => {
    const set = new Set<string>()
    for (const [nodeId, pinned] of Object.entries(pinnedNodeMap)) {
      if (pinned && scopedNodeIds.has(nodeId)) set.add(nodeId)
    }
    return set
  }, [pinnedNodeMap, scopedNodeIds])

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
        : buildLaneLayout(scopedGraph.nodes)

      for (const node of Object.values(nextNodes)) {
        const previousNode = previous[node.id]
        if (pinnedNodeIds.has(node.id) && previousNode) {
          node.x = previousNode.x
          node.y = previousNode.y
          node.vx = 0
          node.vy = 0
          continue
        }

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

    let raf = 0
    const run = () => {
      runForceSimulation(Object.values(simNodesRef.current), scopedGraph.edges, pinnedNodeIds)
      setRenderNodeMap(cloneNodeMap(simNodesRef.current))
      raf = window.requestAnimationFrame(run)
    }

    raf = window.requestAnimationFrame(run)

    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [layoutMode, pinnedNodeIds, scopedGraph.edges, scopedGraph.nodes])

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
  }, [activeEdgeSet, scopedGraph.edges.length, scopedGraph.nodes])

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
    originalViewRef.current = { viewport: { ...viewportRef.current }, localDepth, searchText }
  }

  const clearNodeDetail = () => {
    activeSelectedNodeIdRef.current = null
    setSelectedNodeId(null)
    setHoveredNodeId(null)
  }

  const restoreOriginalView = () => {
    const snapshot = originalViewRef.current
    if (!snapshot) { clearNodeDetail(); return }
    setLocalDepth(snapshot.localDepth)
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
    if (options?.center ?? true) centerNodeInViewport(nodeId)
  }

  const togglePinNode = (nodeId: string) => {
    setPinnedNodeMap((current) => {
      const next = { ...current }
      if (next[nodeId]) { delete next[nodeId] } else { next[nodeId] = true }
      return next
    })
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

  const handleMouseDown: MouseEventHandler<SVGSVGElement> = (event) => {
    if (event.button !== 0) return
    if ((event.target as Element).closest('.graph-node-group')) return
    setDraggingCanvas(true)
    canvasDragOriginRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleMouseMove: MouseEventHandler<SVGSVGElement> = (event) => {
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

  const handleMouseUp = () => {
    const draggedNode = nodeDragRef.current
    if (draggedNode && nodeDragMovedRef.current) {
      setPinnedNodeMap((current) => ({ ...current, [draggedNode]: true }))
    }
    nodeDragRef.current = null
    nodeDragMovedRef.current = false
    setDraggingNodeId(null)
    setDraggingCanvas(false)
    canvasDragOriginRef.current = null
  }

  const handleNodeMouseDown = (nodeId: string): MouseEventHandler<SVGGElement> => (event) => {
    if (event.button !== 0) return
    event.stopPropagation()
    rememberOriginalView()
    activeSelectedNodeIdRef.current = nodeId
    nodeDragRef.current = nodeId
    nodeDragMovedRef.current = false
    setDraggingNodeId(nodeId)
    setSelectedNodeId(nodeId)
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
        setLocalDepth(snapshot.localDepth)
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

  const selectedNodePinned = Boolean(selectedNode && pinnedNodeIds.has(selectedNode.id))

  return (
    <div className="view-graph fade-in">
      <div className="view-header">
        <h1 className="view-title">图谱</h1>
        <div className="view-actions">
          <div className="filter-bar graph-filter-bar">
            <input
              className="filter-input graph-search-input"
              placeholder="搜索节点…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) {
                  event.preventDefault()
                  focusNode(searchResults[0].id)
                }
              }}
            />
            <select className="filter-select" value={displayMode} onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}>
              <option value="all">全量关系</option>
              <option value="project-task">项目 - 任务</option>
              <option value="task-person">任务 - 人员</option>
              <option value="people-focus">人员中心</option>
            </select>
            <select className="filter-select" value={localDepth} onChange={(event) => setLocalDepth(event.target.value as LocalDepth)}>
              <option value="all">全局图谱</option>
              <option value="1">局部 1 跳</option>
              <option value="2">局部 2 跳</option>
            </select>
            <select className="filter-select" value={layoutMode} onChange={(event) => setLayoutMode(event.target.value as LayoutMode)}>
              <option value="force">动态力导</option>
              <option value="radial">同心分层</option>
              <option value="lanes">分组泳道</option>
            </select>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowLabels((current) => !current)}>
              {showLabels ? '隐藏标签' : '显示标签'}
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setViewport({ x: 0, y: 0, scale: 1 })}>
              重置视角
            </button>
            {pinnedNodeIds.size > 0 ? (
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPinnedNodeMap({})}>
                解除固定
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="view-body graph-view-body">
        <div className="graph-stage-panel">
          <div className="graph-hint-bar">
            <span className="graph-pill">节点 {scopedGraph.nodes.length}</span>
            <span className="graph-pill">连线 {scopedGraph.edges.length}</span>
            <span className="graph-pill">固定 {pinnedNodeIds.size}</span>
            <span className="graph-hint-text">滚轮缩放 · 拖拽平移 · 拖拽节点自动固定 · 双击节点切换固定</span>
            <span className="graph-kind-legend">形状：◇ 项目 · ○ 任务 · ⬡ 人员</span>
          </div>

          {selectedNode ? (
            <button className="graph-stage-quick-back" type="button" onClick={quickBackFromDetail}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>返回原视图</span>
              <span className="graph-stage-quick-back-kbd">Esc</span>
            </button>
          ) : null}

          <svg
            ref={svgRef}
            className={`graph-stage ${draggingNodeId ? 'dragging-node' : ''}`}
            viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
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
                    className={`graph-edge ${edge.kind} ${isFocused ? 'focused' : ''} ${dimmed ? 'dimmed' : ''} ${matched ? 'matched' : ''}`}
                    d={buildEdgePath(source, target, edge.kind)}
                  />
                )
              })}

              {activeNodes.map((node) => {
                const isFocused = focusedNodeId === node.id
                const isRelated = Boolean(focusedNodeId && activeEdgeSet.get(focusedNodeId)?.has(node.id))
                const isMatched = searchMatchedNodeIds.has(node.id)
                const isPinned = pinnedNodeIds.has(node.id)
                const isDragging = draggingNodeId === node.id
                const dimmed = Boolean(focusedNodeId && !isFocused && !isRelated)
                const showLabel = showLabels || isFocused || isRelated || isMatched
                const projectHalf = node.size * 0.72

                return (
                  <g
                    key={node.id}
                    className={`graph-node-group ${node.kind} ${isFocused ? 'focused' : ''} ${isRelated ? 'related' : ''} ${isMatched ? 'matched' : ''} ${isPinned ? 'pinned' : ''} ${isDragging ? 'dragging' : ''} ${dimmed ? 'dimmed' : ''}`}
                    transform={`translate(${node.x} ${node.y})`}
                    onMouseDown={handleNodeMouseDown(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                    onClick={(event) => { event.stopPropagation(); focusNode(node.id, { center: false }) }}
                    onDoubleClick={(event) => { event.stopPropagation(); togglePinNode(node.id) }}
                  >
                    <title>{node.label}</title>
                    {node.kind === 'project' ? (
                      <rect
                        className="graph-node-core"
                        x={-projectHalf} y={-projectHalf}
                        width={projectHalf * 2} height={projectHalf * 2}
                        rx={2.6} transform="rotate(45)"
                      />
                    ) : null}
                    {node.kind === 'task' ? <circle className="graph-node-core" r={node.size} /> : null}
                    {node.kind === 'person' ? <polygon className="graph-node-core" points={buildHexagonPoints(node.size)} /> : null}
                    {isPinned ? <circle className="graph-node-pin" cx={node.size - 2} cy={-node.size + 2} r={3.2} /> : null}
                    {showLabel ? <text className="graph-node-label" x={node.size + 8} y={4}>{node.label}</text> : null}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        <aside className="graph-side-panel">
          <div className="graph-side-title">快速定位</div>
          {!searchKeyword ? (
            <div className="text-muted text-sm">输入关键词可快速定位节点，回车自动跳到首个结果</div>
          ) : (
            <div className="graph-related-list">
              {searchResults.length === 0 ? (
                <div className="text-muted text-sm">没有匹配节点</div>
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
              <div className="text-muted text-sm">暂无节点</div>
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
            <div className="text-muted text-sm">点击图谱中的任意节点查看关联详情</div>
          ) : (
            <>
              <div className="graph-detail-card">
                <div className="graph-detail-kind">{getKindLabel(selectedNode.kind)}</div>
                <div className="graph-detail-title">{selectedNode.label}</div>
                <div className="graph-detail-subtitle">{selectedNode.subtitle}</div>
                <div className="graph-detail-subtitle">关联 {relatedNodes.length} 个节点</div>
                <div className="graph-detail-actions">
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => centerNodeInViewport(selectedNode.id)}>居中查看</button>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => togglePinNode(selectedNode.id)}>
                    {selectedNodePinned ? '取消固定' : '固定节点'}
                  </button>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => void copyNodeName(selectedNode)}>复制名称</button>
                </div>
              </div>
              <div className="graph-related-list">
                {relatedNodes.length === 0 ? (
                  <div className="text-muted text-sm">暂无关联</div>
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
