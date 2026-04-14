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
    const ringNodes = grouped[kind]
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

export function buildLaneLayout(nodes: GraphNode[]) {
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

  const positioned: Record<string, { x: number; y: number }> = {}
  ;(['project', 'task', 'person'] as NodeKind[]).forEach((kind) => {
    const laneNodes = grouped[kind]
    const gap = SCENE_HEIGHT / (laneNodes.length + 1)

    laneNodes.forEach((node, index) => {
      positioned[node.id] = {
        x: laneX[kind],
        y: gap * (index + 1),
      }
    })
  })

  return positioned
}

export function ensureSimulationNodes(nodes: GraphNode[], previous: Record<string, SimNode>) {
  const next: Record<string, SimNode> = {}

  for (const node of nodes) {
    const old = previous[node.id]
    next[node.id] = old
      ? { ...old, ...node }
      : {
          ...node,
          x: Math.random() * (SCENE_WIDTH * 0.7) + SCENE_WIDTH * 0.15,
          y: Math.random() * (SCENE_HEIGHT * 0.7) + SCENE_HEIGHT * 0.15,
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

  if (displayMode === 'task-person') {
    const nodes = graph.nodes.filter((node) => node.kind === 'task' || node.kind === 'person')
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = graph.edges.filter((edge) => edge.kind === 'task-person' && nodeIds.has(edge.source) && nodeIds.has(edge.target))
    return { nodes, edges }
  }

  const taskIdsWithPeople = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.kind === 'task-person') {
      taskIdsWithPeople.add(edge.source)
    }
  }

  const nodes = graph.nodes.filter((node) => {
    if (node.kind === 'person') return true
    if (node.kind === 'task') return taskIdsWithPeople.has(node.id)

    if (node.kind === 'project') {
      return graph.edges.some((edge) => (
        edge.kind === 'project-task'
        && edge.source === node.id
        && taskIdsWithPeople.has(edge.target)
      ))
    }

    return false
  })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  return { nodes, edges }
}

export function runForceSimulation(
  nodes: SimNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,
) {
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

  for (const node of nodes) {
    if (pinnedNodeIds.has(node.id)) continue

    const centerPull = node.kind === 'task' ? 0.00085 : 0.00055
    node.vx += (SCENE_WIDTH / 2 - node.x) * centerPull
    node.vy += (SCENE_HEIGHT / 2 - node.y) * centerPull

    node.x = clamp(node.x + node.vx, 30, SCENE_WIDTH - 30)
    node.y = clamp(node.y + node.vy, 30, SCENE_HEIGHT - 30)
  }
}

export function buildEdgePath(source: SimNode, target: SimNode, kind: EdgeKind) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.max(0.001, Math.sqrt(dx * dx + dy * dy))
  const normalX = -dy / length
  const normalY = dx / length
  const bend = kind === 'task-person' ? 14 : 9

  const controlX = (source.x + target.x) / 2 + normalX * bend
  const controlY = (source.y + target.y) / 2 + normalY * bend

  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`
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
