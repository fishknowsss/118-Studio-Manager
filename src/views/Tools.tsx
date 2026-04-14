import { useMemo } from 'react'
import { useToast } from '../components/feedback/ToastProvider'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { getTaskAssigneeIds } from '../legacy/store'
import { formatLocalDateKey } from '../legacy/utils'

type ToolLink = {
  title: string
  desc: string
  url: string
}

type ScriptSnippet = {
  title: string
  desc: string
  code: string
}

const WEB_TOOLS: ToolLink[] = [
  {
    title: 'JSON Formatter',
    desc: '快速格式化、校验与压缩 JSON 数据。',
    url: 'https://jsonformatter.org/',
  },
  {
    title: 'Regex101',
    desc: '调试正则表达式，带解释与匹配高亮。',
    url: 'https://regex101.com/',
  },
  {
    title: 'TinyPNG',
    desc: '压缩 PNG/JPG 资源图，适合页面发布前处理。',
    url: 'https://tinypng.com/',
  },
  {
    title: 'Can I Use',
    desc: '查询浏览器兼容性，避免线上样式兼容问题。',
    url: 'https://caniuse.com/',
  },
]

const SCRIPT_SNIPPETS: ScriptSnippet[] = [
  {
    title: '批量按关键词筛项目',
    desc: '在浏览器控制台快速筛选项目名称。',
    code: "store.projects.filter((p) => (p.name || '').includes('宣传片'))",
  },
  {
    title: '找出本周截止任务',
    desc: '筛选 7 天内截止且未完成的任务。',
    code: "store.tasks.filter((t) => t.endDate && t.endDate <= shiftLocalDateKey(new Date(), 7) && t.status !== 'done')",
  },
  {
    title: '人员负载快照',
    desc: '输出每位成员的未完成任务数。',
    code: "store.people.map((p) => ({ name: p.name, count: store.tasksForPerson(p.id).length }))",
  },
]

export function Tools() {
  const { toast } = useToast()
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const todayStr = useMemo(() => formatLocalDateKey(new Date()), [])

  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'active' || !p.status)
    const doneTasks = tasks.filter((t) => t.status === 'done')
    const todoTasks = tasks.filter((t) => t.status !== 'done')
    const overdueTasks = todoTasks.filter((t) => t.endDate && t.endDate < todayStr)
    const unassignedTasks = todoTasks.filter((t) => getTaskAssigneeIds(t).length === 0)

    const loadMap: Record<string, number> = {}
    for (const task of todoTasks) {
      for (const personId of getTaskAssigneeIds(task)) {
        loadMap[personId] = (loadMap[personId] || 0) + 1
      }
    }

    const busiestPerson = people
      .map((p) => ({ name: p.name || '未命名', count: loadMap[p.id] || 0 }))
      .sort((a, b) => b.count - a.count)[0]

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalTasks: tasks.length,
      doneTasks: doneTasks.length,
      overdueTasks: overdueTasks.length,
      unassignedTasks: unassignedTasks.length,
      totalPeople: people.length,
      busiestPerson,
    }
  }, [people, projects, tasks, todayStr])

  const copyScript = async (snippet: ScriptSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code)
      toast(`已复制脚本：${snippet.title}`, 'success')
    } catch {
      toast('复制失败，请手动复制', 'error')
    }
  }

  const exportData = () => {
    const data = { projects, tasks, people, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `118studio-data-${todayStr}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('数据已导出', 'success')
  }

  return (
    <div className="view-tools fade-in">
      <div className="view-header">
        <h1 className="view-title">工具</h1>
        <div className="view-actions">
          <button className="btn btn-secondary" type="button" onClick={exportData}>
            导出数据
          </button>
        </div>
      </div>

      <div className="view-body tools-view-body">
        <section className="tools-section">
          <h2 className="tools-section-title">数据概览</h2>
          <div className="tools-stats-grid">
            <div className="tools-stat-card">
              <div className="tools-stat-value">{stats.activeProjects}<span className="tools-stat-total">/{stats.totalProjects}</span></div>
              <div className="tools-stat-label">进行中项目</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{stats.doneTasks}<span className="tools-stat-total">/{stats.totalTasks}</span></div>
              <div className="tools-stat-label">已完成任务</div>
            </div>
            <div className={`tools-stat-card${stats.overdueTasks > 0 ? ' tools-stat-warn' : ''}`}>
              <div className="tools-stat-value">{stats.overdueTasks}</div>
              <div className="tools-stat-label">逾期任务</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{stats.unassignedTasks}</div>
              <div className="tools-stat-label">未分配任务</div>
            </div>
            <div className="tools-stat-card">
              <div className="tools-stat-value">{stats.totalPeople}</div>
              <div className="tools-stat-label">成员总数</div>
            </div>
            {stats.busiestPerson ? (
              <div className="tools-stat-card">
                <div className="tools-stat-value tools-stat-name">{stats.busiestPerson.name}</div>
                <div className="tools-stat-label">负载最高成员（{stats.busiestPerson.count} 项）</div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="tools-section">
          <h2 className="tools-section-title">常用 Web 工具</h2>
          <div className="tools-grid">
            {WEB_TOOLS.map((tool) => (
              <a key={tool.title} className="tool-card" href={tool.url} target="_blank" rel="noreferrer">
                <div className="tool-card-title">{tool.title}</div>
                <div className="tool-card-desc">{tool.desc}</div>
                <span className="tool-card-action">打开工具</span>
              </a>
            ))}
          </div>
        </section>

        <section className="tools-section">
          <h2 className="tools-section-title">脚本推荐</h2>
          <div className="script-list">
            {SCRIPT_SNIPPETS.map((snippet) => (
              <div key={snippet.title} className="script-item">
                <div className="script-item-head">
                  <div>
                    <div className="script-title">{snippet.title}</div>
                    <div className="script-desc">{snippet.desc}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => void copyScript(snippet)}>
                    复制脚本
                  </button>
                </div>
                <pre className="script-code">{snippet.code}</pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
