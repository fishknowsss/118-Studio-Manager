import { useToast } from '../components/feedback/ToastProvider'

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

  const copyScript = async (snippet: ScriptSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code)
      toast(`已复制脚本：${snippet.title}`, 'success')
    } catch {
      toast('复制失败，请手动复制', 'error')
    }
  }

  return (
    <div className="view-tools fade-in">
      <div className="view-header">
        <h1 className="view-title">工具</h1>
      </div>

      <div className="view-body tools-view-body">
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
