import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { Dialog } from '../../components/ui/Dialog'
import type { ClientBrief } from './materialsState'
import { normalizeMaterialUrl } from './materialsState'

type RefEntry = { label: string; url: string }

type Props = {
  brief: ClientBrief | null
  projectOptions: { id: string; name: string }[]
  onSave: (brief: ClientBrief) => void
  onClose: () => void
}

export function ClientBriefDialog({ brief, projectOptions, onSave, onClose }: Props) {
  const isNew = !brief
  const { toast } = useToast()

  const [projectId, setProjectId]       = useState(brief?.projectId ?? '')
  const [projectName, setProjectName]   = useState(brief?.projectName ?? '')
  const [clientName, setClientName]     = useState(brief?.clientName ?? '')
  const [requirements, setRequirements] = useState(brief?.requirements ?? '')
  const [styleNotes, setStyleNotes]     = useState(brief?.styleNotes ?? '')
  const [prohibitions, setProhibitions] = useState(brief?.prohibitions ?? '')
  const [refs, setRefs]                 = useState<RefEntry[]>(brief?.referenceUrls ?? [])

  const handleProjectChange = (id: string) => {
    setProjectId(id)
    const found = projectOptions.find((p) => p.id === id)
    if (found) setProjectName(found.name)
    else setProjectName('')
  }

  const addRef = () => setRefs((prev) => [...prev, { label: '', url: '' }])

  const updateRef = (index: number, patch: Partial<RefEntry>) => {
    setRefs((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const removeRef = (index: number) => {
    setRefs((prev) => prev.filter((_, i) => i !== index))
  }

  const save = () => {
    if (!clientName.trim()) {
      toast('请填写甲方名称', 'error')
      return
    }
    if (!requirements.trim()) {
      toast('请填写核心需求', 'error')
      return
    }

    // 用户直接填了项目名但没选下拉：保留手填名称
    const resolvedProjectName = projectId
      ? (projectOptions.find((p) => p.id === projectId)?.name ?? projectName)
      : projectName

    const validRefs = refs
      .map((r) => ({ label: r.label.trim(), url: normalizeMaterialUrl(r.url) }))
      .filter((r) => r.label && r.url)

    const now = new Date().toISOString()
    onSave({
      id:            brief?.id ?? crypto.randomUUID(),
      projectId:     projectId || null,
      projectName:   resolvedProjectName.trim(),
      clientName:    clientName.trim(),
      requirements:  requirements.trim(),
      styleNotes:    styleNotes.trim(),
      prohibitions:  prohibitions.trim(),
      referenceUrls: validRefs,
      createdAt:     brief?.createdAt ?? now,
      updatedAt:     now,
    })
  }

  return (
    <Dialog
      open
      title={isNew ? '新建甲方要求' : '编辑甲方要求'}
      onClose={onClose}
      width="wide"
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={save}>
            {isNew ? '创建' : '保存'}
          </button>
        </>
      )}
    >
      <div className="form-grid">
        {/* 关联项目 */}
        <div className="form-field">
          <label className="form-label" htmlFor="brief-project">关联项目</label>
          <select
            id="brief-project"
            className="form-input"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">— 不关联项目 —</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 不关联项目时手填名称 */}
        {!projectId && (
          <div className="form-field">
            <label className="form-label" htmlFor="brief-project-name">项目名称（手填）</label>
            <input
              id="brief-project-name"
              className="form-input"
              placeholder="例：极乐故乡游"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        )}

        {/* 甲方名称 */}
        <div className="form-field">
          <label className="form-label" htmlFor="brief-client">甲方名称 *</label>
          <input
            id="brief-client"
            className="form-input"
            placeholder="例：上海某文旅公司"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        {/* 核心需求 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="brief-requirements">核心需求 *</label>
          <textarea
            id="brief-requirements"
            className="form-input"
            rows={4}
            placeholder="描述甲方的核心诉求、目标受众、交付物要求等…"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>

        {/* 风格偏好 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="brief-style">风格偏好</label>
          <textarea
            id="brief-style"
            className="form-input"
            rows={2}
            placeholder="例：活泼、青春、偏暖色调；可参考某某品牌…"
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
          />
        </div>

        {/* 禁忌 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="brief-prohibitions">禁忌事项</label>
          <textarea
            id="brief-prohibitions"
            className="form-input"
            rows={2}
            placeholder="例：不能出现竞品Logo；不得使用黑色作为主色调…"
            value={prohibitions}
            onChange={(e) => setProhibitions(e.target.value)}
          />
        </div>

        {/* 参考链接 */}
        <div className="form-field span2">
          <div className="brief-ref-head">
            <label className="form-label">参考资料链接</label>
            <button className="btn btn-xs btn-ghost" type="button" onClick={addRef}>+ 添加</button>
          </div>
          {refs.length === 0 ? (
            <div className="text-muted text-sm">暂无参考链接，点「添加」新增</div>
          ) : (
            <div className="brief-ref-list">
              {refs.map((ref, index) => (
                <div key={index} className="brief-ref-row">
                  <input
                    className="form-input brief-ref-label"
                    placeholder="名称，例：竞品参考"
                    value={ref.label}
                    onChange={(e) => updateRef(index, { label: e.target.value })}
                  />
                  <input
                    className="form-input brief-ref-url"
                    placeholder="https://"
                    value={ref.url}
                    onChange={(e) => updateRef(index, { url: e.target.value })}
                  />
                  <button
                    className="btn btn-xs btn-danger"
                    type="button"
                    onClick={() => removeRef(index)}
                    aria-label="删除此链接"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
