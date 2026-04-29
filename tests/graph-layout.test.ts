import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildGraphData } from '../src/features/graph/graphData'
import { buildLaneLayout, buildRadialLayout, ensureSimulationNodes, truncateGraphTextByWidth } from '../src/features/graph/graphUtils'

describe('graph canvas layout', () => {
  it('keeps the riskiest project-task-person chain near the top of the lane canvas', () => {
    const graph = buildGraphData(
      [
        { id: 'project-calm', name: '常规项目', status: 'active', priority: 'low' },
        { id: 'project-risk', name: '风险项目', status: 'active', priority: 'urgent' },
      ],
      [
        {
          id: 'task-calm',
          title: '常规任务',
          projectId: 'project-calm',
          status: 'todo',
          priority: 'low',
          assigneeIds: ['person-calm'],
          estimatedHours: 2,
        },
        {
          id: 'task-risk',
          title: '受阻任务',
          projectId: 'project-risk',
          status: 'blocked',
          priority: 'urgent',
          assigneeIds: ['person-busy'],
          estimatedHours: 8,
        },
      ],
      [
        { id: 'person-calm', name: '常规成员', status: 'active' },
        { id: 'person-busy', name: '高负载成员', status: 'active' },
      ],
    )

    const positions = buildLaneLayout(graph.nodes, graph.edges)

    expect(positions['project:project-risk'].y).toBeLessThan(positions['project:project-calm'].y)
    expect(positions['task:task-risk'].y).toBeLessThan(positions['task:task-calm'].y)
    expect(positions['person:person-busy'].y).toBeLessThan(positions['person:person-calm'].y)

    const riskTaskToRiskProject = Math.abs(positions['task:task-risk'].y - positions['project:project-risk'].y)
    const riskTaskToCalmProject = Math.abs(positions['task:task-risk'].y - positions['project:project-calm'].y)
    const busyPersonToRiskTask = Math.abs(positions['person:person-busy'].y - positions['task:task-risk'].y)
    const busyPersonToCalmTask = Math.abs(positions['person:person-busy'].y - positions['task:task-calm'].y)

    expect(riskTaskToRiskProject).toBeLessThan(riskTaskToCalmProject)
    expect(busyPersonToRiskTask).toBeLessThan(busyPersonToCalmTask)
  })

  it('uses the readable lane canvas as the default graph presentation', () => {
    const graphSource = readFileSync(join(process.cwd(), 'src/views/Graph.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(graphSource).toMatch(/useState<LayoutMode>\('lanes'\)/)
    expect(graphSource).toMatch(/graph-lane-guides/)
    expect(graphSource).toMatch(/graph-lane-guide-rule/)
    expect(graphSource).not.toMatch(/graph-lane-guide-bg/)
    expect(graphSource).toMatch(/graph-node-card-bg/)
    expect(graphSource).toMatch(/buildLaneEdgePath/)

    expect(styleSource).toMatch(/\.graph-node-card-bg/)
    expect(styleSource).toMatch(/\.graph-lane-guide-title/)
    expect(styleSource).toMatch(/\.graph-lane-guide-rule/)
    expect(styleSource).not.toMatch(/\.graph-lane-guide-bg/)
  })

  it('keeps lane summary labels clear of concrete node cards', () => {
    const graph = buildGraphData(
      [
        { id: 'project-a', name: '项目 A', status: 'active', priority: 'urgent' },
        { id: 'project-b', name: '项目 B', status: 'active', priority: 'medium' },
      ],
      [
        { id: 'task-a', title: '任务 A', projectId: 'project-a', status: 'blocked', priority: 'urgent', assigneeIds: ['person-a'] },
        { id: 'task-b', title: '任务 B', projectId: 'project-b', status: 'todo', priority: 'medium', assigneeIds: ['person-b'] },
      ],
      [
        { id: 'person-a', name: '成员 A', status: 'active' },
        { id: 'person-b', name: '成员 B', status: 'active' },
      ],
    )

    const positions = buildLaneLayout(graph.nodes, graph.edges)
    const topMostNodeCenter = Math.min(...Object.values(positions).map((position) => position.y))

    expect(topMostNodeCenter).toBeGreaterThanOrEqual(156)
  })

  it('orders people by active task count across lane and radial layouts', () => {
    const graph = buildGraphData(
      [
        { id: 'project-a', name: '项目 A', status: 'active', priority: 'medium' },
        { id: 'project-b', name: '项目 B', status: 'active', priority: 'medium' },
      ],
      [
        { id: 'task-a1', title: '任务 A1', projectId: 'project-a', status: 'todo', assigneeIds: ['person-calm'] },
        { id: 'task-b1', title: '任务 B1', projectId: 'project-b', status: 'todo', assigneeIds: ['person-busy'] },
        { id: 'task-b2', title: '任务 B2', projectId: 'project-b', status: 'in-progress', assigneeIds: ['person-busy'] },
        { id: 'task-b3', title: '任务 B3', projectId: 'project-b', status: 'todo', assigneeIds: ['person-busy'] },
      ],
      [
        { id: 'person-calm', name: '低任务成员', status: 'active' },
        { id: 'person-busy', name: '多任务成员', status: 'active' },
      ],
    )

    const lanePositions = buildLaneLayout(graph.nodes, graph.edges)
    const radialPositions = buildRadialLayout(graph.nodes)

    expect(lanePositions['person:person-busy'].y).toBeLessThan(lanePositions['person:person-calm'].y)
    expect(radialPositions['person:person-busy'].y).toBeLessThan(radialPositions['person:person-calm'].y)
  })

  it('starts force layout from the same business ordering instead of random scatter', () => {
    const graph = buildGraphData(
      [{ id: 'project-a', name: '项目 A', status: 'active', priority: 'medium' }],
      [
        { id: 'task-1', title: '任务 1', projectId: 'project-a', status: 'todo', assigneeIds: ['person-calm'] },
        { id: 'task-2', title: '任务 2', projectId: 'project-a', status: 'todo', assigneeIds: ['person-busy'] },
        { id: 'task-3', title: '任务 3', projectId: 'project-a', status: 'todo', assigneeIds: ['person-busy'] },
      ],
      [
        { id: 'person-calm', name: '低任务成员', status: 'active' },
        { id: 'person-busy', name: '多任务成员', status: 'active' },
      ],
    )

    const nodes = ensureSimulationNodes(graph.nodes, {})

    expect(nodes['project:project-a'].x).toBeLessThan(nodes['task:task-1'].x)
    expect(nodes['task:task-1'].x).toBeLessThan(nodes['person:person-busy'].x)
    expect(nodes['person:person-busy'].y).toBeLessThan(nodes['person:person-calm'].y)
  })

  it('keeps graph canvas visual markers prominent enough to scan quickly', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.graph-edge\.lanes\s*\{[\s\S]*stroke-width:\s*1\.8;/)
    expect(styleSource).toMatch(/\.graph-node-card-title\s*\{[\s\S]*font-size:\s*17px;/)
    expect(styleSource).toMatch(/\.graph-node-label\s*\{[\s\S]*font-size:\s*13px;[\s\S]*paint-order:\s*stroke;/)
  })

  it('keeps lane card surfaces readable in light and dark themes', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.graph-node-card-bg\s*\{[\s\S]*fill:\s*rgba\(255,\s*255,\s*255,\s*\.88\);/)
    expect(styleSource).toMatch(/\[data-theme='dark'\]\s+\.graph-node-card-bg\s*\{[\s\S]*fill:\s*rgba\(15,\s*23,\s*42,\s*\.72\);/)
    expect(styleSource).toMatch(/\[data-theme='dark'\]\s+\.graph-node-card-title\s*\{[\s\S]*fill:\s*rgba\(248,\s*250,\s*252,\s*\.96\);/)
    expect(styleSource).toMatch(/\[data-theme='dark'\]\s+\.graph-node-card-meta\s*\{[\s\S]*fill:\s*rgba\(203,\s*213,\s*225,\s*\.82\);/)
  })

  it('keeps lane cards aligned with the anomaly palette', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/html\[data-easter-mode='konami'\]\s+\.graph-node-card-bg\s*\{[\s\S]*fill:\s*rgba\(250,\s*245,\s*220,\s*\.66\);/)
    expect(styleSource).toMatch(/html\[data-easter-mode='konami'\]\s+\.graph-node-card-title\s*\{[\s\S]*fill:\s*#4f421a;/)
    expect(styleSource).toMatch(/html\[data-easter-mode='konami'\]\s+\.graph-node-card-meta\s*\{[\s\S]*fill:\s*#695729;/)
  })

  it('adds anomaly-only squid marks to task and person cards for Quan Shuyi', () => {
    const graphSource = readFileSync(join(process.cwd(), 'src/views/Graph.tsx'), 'utf8')
    const squidPath = join(process.cwd(), 'src/components/easter/SquidMark.tsx')
    const taskItemSource = readFileSync(join(process.cwd(), 'src/features/tasks/TaskItem.tsx'), 'utf8')
    const taskPoolSource = readFileSync(join(process.cwd(), 'src/features/dashboard/TaskPoolPanel.tsx'), 'utf8')
    const personCardSource = readFileSync(join(process.cwd(), 'src/features/people/PersonCard.tsx'), 'utf8')
    const personAssignmentSource = readFileSync(join(process.cwd(), 'src/features/dashboard/PersonAssignmentCard.tsx'), 'utf8')
    const productivitySource = readFileSync(join(process.cwd(), 'src/views/Productivity.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(existsSync(squidPath)).toBe(true)
    const squidSource = readFileSync(squidPath, 'utf8')

    expect(squidSource).toContain("SQUID_PERSON_NAME = '全舒怡'")
    expect(squidSource).toContain('getSquidVariant')
    expect(squidSource).toContain('SquidMark')
    expect(squidSource).toContain('SquidMarkSvg')
    expect(squidSource).not.toContain('graph-squid-tentacle')
    expect(squidSource).not.toContain('graph-squid-shadow')
    expect(graphSource).toContain('squidNodeIds')
    expect(graphSource).toContain('SquidMarkSvg')
    expect(graphSource).not.toContain('squidTaskIds')
    expect(taskItemSource).toContain('SquidMark')
    expect(taskPoolSource).toContain('SquidMark')
    expect(personCardSource).toContain('SquidMark')
    expect(personAssignmentSource).toContain('SquidMark')
    expect(productivitySource).toContain('SquidMark')
    expect(styleSource).toContain("html[data-easter-mode='konami'] .squid-mark")
    expect(styleSource).toContain('.squid-mark--lavender')
    expect(styleSource).toContain('.squid-mark--mint')
    expect(squidSource).toContain('graph-squid-eye')
    expect(styleSource).toMatch(/\.graph-squid-mark\s*\{[\s\S]*display:\s*none;/)
    expect(styleSource).toMatch(/html\[data-easter-mode='konami'\]\s+\.graph-squid-mark\s*\{[\s\S]*display:\s*block;/)
  })

  it('truncates long lane task titles by visual width before they reach the card edge', () => {
    const title = '极乐故乡游 项目介绍 场景参考（等场景三视图）'
    const truncated = truncateGraphTextByWidth(title, 204)

    expect(truncated).toMatch(/…$/)
    expect(truncated.length).toBeLessThan(20)
    expect(truncated).toBe('极乐故乡游 项目介绍…')
  })
})
