export type NodeKind = 'project' | 'task' | 'person'
export type EdgeKind = 'project-task' | 'task-person'
export type DisplayMode = 'all' | 'project-task' | 'task-person' | 'people-focus'
export type LayoutMode = 'force' | 'radial' | 'lanes'
export type LocalDepth = 'all' | '1' | '2'

export type GraphNode = {
  id: string
  refId: string
  kind: NodeKind
  label: string
  subtitle: string
  size: number
}

export type SimNode = GraphNode & {
  x: number
  y: number
  vx: number
  vy: number
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  kind: EdgeKind
}

export type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type Viewport = {
  x: number
  y: number
  scale: number
}

export type GraphViewSnapshot = {
  viewport: Viewport
  localDepth: LocalDepth
  searchText: string
}

export const SCENE_WIDTH = 1400
export const SCENE_HEIGHT = 860
export const MIN_SCALE = 0.45
export const MAX_SCALE = 2.2
