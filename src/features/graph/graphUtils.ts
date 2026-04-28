import {
  type DisplayMode,
  type EdgeKind,
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type NodeKind,
  type SimNode,
  type Viewport,
  SCENE_HEIGHT,
  SCENE_WIDTH,
} from './graphTypes'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getKindLabel(kind: NodeKind) {
  if (kind === 'project') return '项目'
  if (kind === 'task') return '任务'
  return '人员'
}

export function getKindShortLabel(kind: NodeKind) {
  if (kind === 'project') return '项'
  if (kind === 'task') return '任'
  return '人'
}

export function buildHexagonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((Math.PI * 2) / 6) * index - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return `${x},${y}`
  }).join(' ')
}

export function cloneNodeMap(nodes: Record<string, SimNode>) {
  return Object.fromEntries(
    Object.entries(nodes).map(([id, node]) => [id, { ...node }]),
  ) as Record<string, SimNode>
}

const urgencyOrder: Record<string, number> = {
  'urg-blocked': 0,
  'urg-overdue': 1,
  'urg-today': 2,
  'urg-soon': 3,
  'urg-near': 4,
  'urg-active': 5,
  '': 6,
  'urg-done': 7,
}

function nodeUrgencyRank(node: GraphNode) {
  return urgencyOrder[node.urgency] ?? 6
}

export function compareGraphNodesForCanvas(left: GraphNode, right: GraphNode) {
  if (left.kind === 'person' && right.kind === 'person') {
    return right.sortValue - left.sortValue
      || nodeUrgencyRank(left) - nodeUrgencyRank(right)
      || right.size - left.size
      || left.label.localeCompare(right.label)
  }

  return nodeUrgencyRank(left) - nodeUrgencyRank(right)
    || right.sortValue - left.sortValue
    || right.size - left.size
    || left.label.localeCompare(right.label)
}

function rankedY(node: GraphNode, top = 116, bottom = SCENE_HEIGHT - 92) {
  const rankCount = Math.max(1, node.rankCount || 1)
  const rankIndex = Math.min(rankCount - 1, Math.max(0, node.rankIndex || 0))
  if (rankCount === 1) return (top + bottom) / 2

  const gap = (bottom - top) / (rankCount - 1)
  return top + gap * rankIndex
}

function kindTargetX(kind: NodeKind) {
  if (kind === 'project') return 300
  if (kind === 'task') return SCENE_WIDTH / 2
  return SCENE_WIDTH - 300
}

export function buildRadialLayout(nodes: GraphNode[]) {
  const centerX = SCENE_WIDTH / 2
  const centerY = SCENE_HEIGHT / 2
  const grouped: Record<NodeKind, GraphNode[]> = {
    project: nodes.filter((node) => node.kind === 'project'),
    task: nodes.filter((node) => node.kind === 'task'),
    person: nodes.filter((node) => node.kind === 'person'),
  }

  const radiusMap: Record<NodeKind, number> = {
    project: 170,
    task: 315,
    person: 450,
  }

  const positioned: Record<string, { x: number; y: number }> = {}
  ;(['project', 'task', 'person'] as NodeKind[]).forEach((kind) => {
    const ringNodes = [...grouped[kind]].sort(compareGraphNodesForCanvas)
    const radius = radiusMap[kind]
    const count = ringNodes.length

    ringNodes.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, count) - Math.PI / 2
      positioned[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      }
    })
  })

  return positioned
}

export function buildLaneLayout(nodes: GraphNode[], edges: GraphEdge[] = []) {
  const laneTop = 156
  const laneBottom = SCENE_HEIGHT - 64
  const laneX: Record<NodeKind, number> = {
    project: 250,
    task: SCENE_WIDTH / 2,
    person: SCENE_WIDTH - 250,
  }

  const grouped: Record<NodeKind, GraphNode[]> = {
    project: nodes.filter((node) => node.kind === 'project'),
    task: nodes.filter((node) => node.kind === 'task'),
    person: nodes.filter((node) => node.kind === 'person'),
  }

  const placeOrderedNodes = (laneNodes: GraphNode[], top = laneTop, bottom = laneBottom) => {
    const gap = laneNodes.length > 1
      ? clamp((bottom - top) / (laneNodes.length - 1), 74, 160)
      : 0
    return laneNodes.map((node, index) => ({
      node,
      y: laneNodes.length === 1 ? (top + bottom) / 2 : top + gap * index,
    }))
  }
  const placeAnchoredNodes = (
    laneNodes: GraphNode[],
    getAnchor: (node: GraphNode) => number,
    top = laneTop,
    bottom = laneBottom,
  ) => {
    if (laneNodes.length === 0) return [] as Array<{ node: GraphNode; y: number }>
    if (laneNodes.length === 1) {
      return [{ node: laneNodes[0], y: clamp(getAnchor(laneNodes[0]), top, bottom) }]
    }

    const gap = clamp((bottom - top) / (laneNodes.length - 1), 72, 128)
    const placed = [...laneNodes]
      .sort((left, right) => getAnchor(left) - getAnchor(right) || compareGraphNodesForCanvas(left, right))
      .map((node) => ({ node, y: clamp(getAnchor(node), top, bottom) }))

    for (let index = 1; index < placed.length; index += 1) {
      placed[index].y = Math.max(placed[index].y, placed[index - 1].y + gap)
    }

    const overflow = placed[placed.length - 1].y - bottom
    if (overflow > 0) {
      for (const item of placed) item.y -= overflow
    }

    for (let index = placed.length - 2; index >= 0; index -= 1) {
      placed[index].y = Math.min(placed[index].y, placed[index + 1].y - gap)
    }

    const underflow = top - placed[0].y
    if (underflow > 0) {
      for (const item of placed) item.y += underflow
    }

    return placed
  }

  grouped.project.sort((left, right) =>
    compareGraphNodesForCanvas(left, right),
  )

  // 建立连接映射
  const taskToProjects = new Map<string, string[]>()
  const personToTasks = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.kind === 'project-task') {
      const list = taskToProjects.get(edge.target) || []
      list.push(edge.source)
      taskToProjects.set(edge.target, list)
    }
    if (edge.kind === 'task-person') {
      const list = personToTasks.get(edge.target) || []
      list.push(edge.source)
      personToTasks.set(edge.target, list)
    }
  }

  // 任务按所属项目在项目列中的位置排序，减少项目→任务连线交叉
  const projectOrder = new Map(grouped.project.map((n, i) => [n.id, i]))
  grouped.task.sort((a, b) => {
    const minIdx = (id: string) => {
      const ps = taskToProjects.get(id) || []
      return ps.length ? Math.min(...ps.map((p) => projectOrder.get(p) ?? 9999)) : 9999
    }
    return minIdx(a.id) - minIdx(b.id)
      || compareGraphNodesForCanvas(a, b)
  })

  // 人员按进行中任务数量排序，让负载一眼可见。
  const taskOrder = new Map(grouped.task.map((n, i) => [n.id, i]))
  grouped.person.sort((a, b) => {
    const avgIdx = (id: string) => {
      const ts = personToTasks.get(id) || []
      if (!ts.length) return 9999
      return ts.reduce((sum, t) => sum + (taskOrder.get(t) ?? 9999), 0) / ts.length
    }
    return compareGraphNodesForCanvas(a, b)
      || avgIdx(a.id) - avgIdx(b.id)
  })

  const positioned: Record<string, { x: number; y: number }> = {}

  for (const { node, y } of placeOrderedNodes(grouped.project)) {
    positioned[node.id] = { x: laneX.project, y }
  }

  const taskPlacements = placeAnchoredNodes(grouped.task, (node) => {
    const projects = taskToProjects.get(node.id) || []
    const projectYs = projects
      .map((projectId) => positioned[projectId]?.y)
      .filter((y): y is number => typeof y === 'number')

    if (projectYs.length === 0) return SCENE_HEIGHT - 112
    return projectYs.reduce((sum, y) => sum + y, 0) / projectYs.length
  })
  for (const { node, y } of taskPlacements) {
    positioned[node.id] = { x: laneX.task, y }
  }

  for (const { node, y } of placeOrderedNodes(grouped.person)) {
    positioned[node.id] = { x: laneX.person, y }
  }

  return positioned
}

export function ensureSimulationNodes(nodes: GraphNode[], previous: Record<string, SimNode>) {
  const next: Record<string, SimNode> = {}

  const kindOrder: Record<NodeKind, number> = { project: 0, task: 1, person: 2 }
  const orderedNodes = [...nodes].sort((left, right) =>
    kindOrder[left.kind] - kindOrder[right.kind]
    || compareGraphNodesForCanvas(left, right),
  )

  for (const node of orderedNodes) {
    const old = previous[node.id]
    next[node.id] = old
      ? { ...old, ...node }
      : {
          ...node,
          x: kindTargetX(node.kind),
          y: rankedY(node),
          vx: 0,
          vy: 0,
        }
  }

  return next
}

export function buildAdjacency(edges: GraphEdge[]) {
  const adjacency = new Map<string, Set<string>>()

  for (const edge of edges) {
    adjacency.set(edge.source, adjacency.get(edge.source) || new Set<string>())
    adjacency.set(edge.target, adjacency.get(edge.target) || new Set<string>())
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }

  return adjacency
}

export function collectReachableNodeIds(
  startId: string,
  depthLimit: number,
  adjacency: Map<string, Set<string>>,
) {
  const visited = new Set<string>()
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    if (visited.has(current.id)) continue

    visited.add(current.id)
    if (current.depth >= depthLimit) continue

    const neighbors = adjacency.get(current.id)
    if (!neighbors) continue

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push({ id: neighborId, depth: current.depth + 1 })
      }
    }
  }

  return visited
}

export function applyDisplayModeFilter(graph: GraphData, displayMode: DisplayMode) {
  if (displayMode === 'all') return graph

  if (displayMode === 'project-task') {
    const nodes = graph.nodes.filter((node) => node.kind === 'project' || node.kind === 'task')
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = graph.edges.filter((edge) => edge.kind === 'project-task' && nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }

  const nodes = graph.nodes.filter((node) => node.kind === 'task' || node.kind === 'person')
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = graph.edges.filter((edge) => edge.kind === 'task-person' && nodeIds.has(edge.source) && nodeIds.has(edge.target))
  return { nodes, edges }
}

export function runForceSimulation(
  nodes: SimNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,
): number {
  const repulsionStrength = 3300
  const springLength = 125
  const springStrength = 0.0082
  const damping = 0.88

  for (const node of nodes) {
    if (pinnedNodeIds.has(node.id)) {
      node.vx = 0
      node.vy = 0
      continue
    }

    node.vx *= damping
    node.vy *= damping
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const left = nodes[i]
    if (!left) continue

    for (let j = i + 1; j < nodes.length; j += 1) {
      const right = nodes[j]
      if (!right) continue

      const dx = left.x - right.x
      const dy = left.y - right.y
      const distanceSq = dx * dx + dy * dy + 0.01
      const distance = Math.sqrt(distanceSq)
      const force = repulsionStrength / distanceSq
      const fx = (dx / distance) * force
      const fy = (dy / distance) * force

      if (!pinnedNodeIds.has(left.id)) {
        left.vx += fx
        left.vy += fy
      }

      if (!pinnedNodeIds.has(right.id)) {
        right.vx -= fx
        right.vy -= fy
      }
    }
  }

  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]))

  for (const edge of edges) {
    const source = nodeMap[edge.source]
    const target = nodeMap[edge.target]
    if (!source || !target) continue

    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))
    const delta = distance - springLength
    const force = delta * springStrength
    const fx = (dx / distance) * force
    const fy = (dy / distance) * force

    if (!pinnedNodeIds.has(source.id)) {
      source.vx += fx
      source.vy += fy
    }

    if (!pinnedNodeIds.has(target.id)) {
      target.vx -= fx
      target.vy -= fy
    }
  }

  let energy = 0
  for (const node of nodes) {
    if (pinnedNodeIds.has(node.id)) continue

    const centerPull = node.kind === 'task' ? 0.00045 : 0.0003
    const structurePull = node.kind === 'task' ? 0.00052 : 0.00042
    node.vx += (SCENE_WIDTH / 2 - node.x) * centerPull
    node.vx += (kindTargetX(node.kind) - node.x) * structurePull
    node.vy += (rankedY(node) - node.y) * structurePull

    node.x = clamp(node.x + node.vx, 30, SCENE_WIDTH - 30)
    node.y = clamp(node.y + node.vy, 30, SCENE_HEIGHT - 30)
    energy += node.vx * node.vx + node.vy * node.vy
  }
  return energy
}

export function buildEdgePath(source: SimNode, target: SimNode, kind: EdgeKind) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))

  // Offset start/end points to begin/end at the node visual edge (not center)
  // Project nodes are diamonds: half-diagonal ≈ size * 1.05
  const sourceRadius = source.kind === 'project' ? source.size * 1.05 : source.size
  const targetRadius = target.kind === 'project' ? target.size * 1.05 : target.size
  const startX = source.x + (dx / length) * (sourceRadius + 2)
  const startY = source.y + (dy / length) * (sourceRadius + 2)
  const endX = target.x - (dx / length) * (targetRadius + 6)
  const endY = target.y - (dy / length) * (targetRadius + 6)

  const normalX = -dy / length
  const normalY = dx / length
  const bend = kind === 'task-person' ? 14 : 9

  const controlX = (source.x + target.x) / 2 + normalX * bend
  const controlY = (source.y + target.y) / 2 + normalY * bend

  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
}

export function buildLaneEdgePath(source: SimNode, target: SimNode, kind: EdgeKind) {
  const cardWidth: Record<NodeKind, number> = {
    project: 250,
    task: 330,
    person: 250,
  }
  const sourceHalf = (cardWidth[source.kind] || 90) / 2
  const targetHalf = (cardWidth[target.kind] || 90) / 2
  const startX = source.x + sourceHalf + 6
  const startY = source.y
  const endX = target.x - targetHalf - 8
  const endY = target.y
  const controlOffset = kind === 'task-person' ? 64 : 58
  const controlX1 = startX + controlOffset
  const controlX2 = endX - controlOffset

  return `M ${startX} ${startY} C ${controlX1} ${startY} ${controlX2} ${endY} ${endX} ${endY}`
}

export function toScenePoint(svg: SVGSVGElement | null, viewport: Viewport, clientX: number, clientY: number) {
  if (!svg) return null

  const rect = svg.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  const viewX = ((clientX - rect.left) / rect.width) * SCENE_WIDTH
  const viewY = ((clientY - rect.top) / rect.height) * SCENE_HEIGHT

  return {
    x: (viewX - viewport.x) / viewport.scale,
    y: (viewY - viewport.y) / viewport.scale,
  }
}
