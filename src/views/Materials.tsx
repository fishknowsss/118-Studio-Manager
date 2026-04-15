import { useMemo, useState, useSyncExternalStore } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ClientBriefDialog } from '../features/materials/ClientBriefDialog'
import { AccountDialog } from '../features/materials/AccountDialog'
import {
  readBriefs,
  writeBriefs,
  subscribeBriefs,
  readAccounts,
  writeAccounts,
  subscribeAccounts,
  ACCOUNT_CATEGORIES,
  ACCOUNT_CATEGORY_LABELS,
  type ClientBrief,
  type AccountCategory,
  type AccountCredential,
} from '../features/materials/materialsState'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'

// ─── 复制到剪贴板 ─────────────────────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ─── 账号卡片 ──────────────────────────────────────────
function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountCredential
  onEdit: () => void
  onDelete: () => void
}) {
  const [showPwd, setShowPwd] = useState(false)
  const { toast } = useToast()

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    toast(ok ? `${label}已复制` : '复制失败，请手动选择', ok ? 'success' : 'error')
  }

  return (
    <div className="acc-card">
      <div className="acc-card-head">
        <div className="acc-card-platform">
          <span className="acc-platform-name">{account.platform}</span>
          <span className={`acc-cat-badge acc-cat-${account.category}`}>
            {ACCOUNT_CATEGORY_LABELS[account.category]}
          </span>
        </div>
        <div className="acc-card-actions">
          <button className="btn btn-xs btn-secondary" type="button" onClick={onEdit}>编辑</button>
          <button className="btn btn-xs btn-danger" type="button" onClick={onDelete}>删除</button>
        </div>
      </div>

      {account.url ? (
        <a className="acc-url" href={account.url} target="_blank" rel="noreferrer">
          {account.url}
        </a>
      ) : null}

      <div className="acc-field-row">
        <span className="acc-field-label">账号</span>
        <span className="acc-field-value">{account.account}</span>
        <button
          className="acc-copy-btn"
          type="button"
          onClick={() => void copy(account.account, '账号')}
          title="复制账号"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      {account.password ? (
        <div className="acc-field-row">
          <span className="acc-field-label">密码</span>
          <span className="acc-field-value acc-pwd-value">
            {showPwd ? account.password : '●●●●●●●●'}
          </span>
          <button
            className="acc-copy-btn"
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            title={showPwd ? '隐藏密码' : '显示密码'}
          >
            {showPwd ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          {showPwd ? (
            <button
              className="acc-copy-btn"
              type="button"
              onClick={() => void copy(account.password, '密码')}
              title="复制密码"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {account.note ? (
        <div className="acc-note">{account.note}</div>
      ) : null}
    </div>
  )
}

// ─── 甲方要求卡片 ─────────────────────────────────────
function BriefCard({
  brief,
  onEdit,
  onDelete,
}: {
  brief: ClientBrief
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="brief-card">
      <div className="brief-card-head">
        <div className="brief-card-meta">
          {brief.projectName ? (
            <span className="brief-project-badge">{brief.projectName}</span>
          ) : null}
          <span className="brief-client-name">{brief.clientName}</span>
        </div>
        <div className="brief-card-actions">
          <button className="btn btn-xs btn-secondary" type="button" onClick={onEdit}>编辑</button>
          <button className="btn btn-xs btn-danger" type="button" onClick={onDelete}>删除</button>
        </div>
      </div>

      <div className="brief-section">
        <div className="brief-section-label">核心需求</div>
        <div className={`brief-requirements${expanded ? ' expanded' : ''}`}>
          {brief.requirements}
        </div>
      </div>

      {(brief.styleNotes || brief.prohibitions || brief.referenceUrls.length > 0) && (
        <button
          className="brief-toggle"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '收起详情 ↑' : '展开详情 ↓'}
        </button>
      )}

      {expanded ? (
        <>
          {brief.styleNotes ? (
            <div className="brief-section">
              <div className="brief-section-label">风格偏好</div>
              <div className="brief-section-body">{brief.styleNotes}</div>
            </div>
          ) : null}

          {brief.prohibitions ? (
            <div className="brief-section brief-section-danger">
              <div className="brief-section-label">禁忌事项</div>
              <div className="brief-section-body">{brief.prohibitions}</div>
            </div>
          ) : null}

          {brief.referenceUrls.length > 0 ? (
            <div className="brief-section">
              <div className="brief-section-label">参考资料</div>
              <div className="brief-ref-links">
                {brief.referenceUrls.map((ref, index) => (
                  <a
                    key={index}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="brief-ref-link"
                  >
                    {ref.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

// ─── 主视图 ───────────────────────────────────────────
export function Materials() {
  const store = useLegacyStoreSnapshot()
  const { confirm } = useConfirm()
  const { toast } = useToast()

  // 甲方要求
  const briefs = useSyncExternalStore(subscribeBriefs, readBriefs)
  const [editingBrief, setEditingBrief] = useState<ClientBrief | null | undefined>(undefined)
  const [briefProjectFilter, setBriefProjectFilter] = useState('')

  // 账号密码
  const accounts = useSyncExternalStore(subscribeAccounts, readAccounts)
  const [editingAccount, setEditingAccount] = useState<AccountCredential | null | undefined>(undefined)
  const [accCategory, setAccCategory]       = useState<AccountCategory | ''>('')
  const [accSearch, setAccSearch]           = useState('')

  // 关联项目下拉选项
  const projectOptions = useMemo(() =>
    store.projects.map((p) => ({ id: p.id, name: p.name || '未命名项目' })),
    [store.projects],
  )

  // 过滤甲方要求
  const filteredBriefs = useMemo(() => {
    if (!briefProjectFilter) return briefs
    return briefs.filter((b) =>
      b.projectId === briefProjectFilter || b.projectName === briefProjectFilter,
    )
  }, [briefs, briefProjectFilter])

  // 过滤账号密码
  const filteredAccounts = useMemo(() => {
    let result = accounts
    if (accCategory) result = result.filter((a) => a.category === accCategory)
    if (accSearch.trim()) {
      const q = accSearch.trim().toLowerCase()
      result = result.filter(
        (a) =>
          a.platform.toLowerCase().includes(q) ||
          a.account.toLowerCase().includes(q),
      )
    }
    return result
  }, [accounts, accCategory, accSearch])

  // ── 甲方要求操作 ────────────────────────────────────
  const saveBrief = (brief: ClientBrief) => {
    const exists = briefs.some((item) => item.id === brief.id)
    const next = exists
      ? briefs.map((item) => (item.id === brief.id ? brief : item))
      : [brief, ...briefs]
    writeBriefs(next)
    toast(editingBrief ? '已保存' : '甲方要求已创建', 'success')
    setEditingBrief(undefined)
  }

  const deleteBrief = async (brief: ClientBrief) => {
    const ok = await confirm('删除甲方要求', `确认删除「${brief.clientName}」的要求记录？`)
    if (!ok) return
    writeBriefs(briefs.filter((item) => item.id !== brief.id))
    toast('已删除', 'error')
  }

  // ── 账号密码操作 ────────────────────────────────────
  const saveAccount = (account: AccountCredential) => {
    const exists = accounts.some((item) => item.id === account.id)
    const next = exists
      ? accounts.map((item) => (item.id === account.id ? account : item))
      : [account, ...accounts]
    writeAccounts(next)
    toast(editingAccount ? '已保存' : '账号已创建', 'success')
    setEditingAccount(undefined)
  }

  const deleteAccount = async (account: AccountCredential) => {
    const ok = await confirm('删除账号', `确认删除「${account.platform}」的账号记录？`)
    if (!ok) return
    writeAccounts(accounts.filter((item) => item.id !== account.id))
    toast('已删除', 'error')
  }

  return (
    <div className="view-materials fade-in">
      {/* ── 统一顶栏：两列同行，确保对齐 ───────────────── */}
      <div className="mat-topbar">
        <div className="mat-col-head">
          <div className="mat-col-identity">
            <span className="mat-col-title">甲方要求</span>
            {briefs.length > 0 && (
              <span className="mat-col-count">{filteredBriefs.length}</span>
            )}
          </div>
          <div className="mat-col-controls">
            <select
              className="filter-select"
              value={briefProjectFilter}
              onChange={(e) => setBriefProjectFilter(e.target.value)}
            >
              <option value="">全部项目</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => setEditingBrief(null)}
            >
              新建要求
            </button>
          </div>
        </div>

        <div className="mat-top-sep" />

        <div className="mat-col-head">
          <div className="mat-col-identity">
            <span className="mat-col-title">账号密码</span>
            {accounts.length > 0 && (
              <span className="mat-col-count">{filteredAccounts.length}</span>
            )}
          </div>
          <div className="mat-col-controls">
            <input
              className="filter-input"
              placeholder="搜索平台或账号…"
              value={accSearch}
              onChange={(e) => setAccSearch(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => setEditingAccount(null)}
            >
              新建账号
            </button>
          </div>
        </div>
      </div>

      {/* ── 双栏主体 ─────────────────────────────────── */}
      <div className="materials-split">

        {/* ── 左：甲方要求 ──────────────────────────── */}
        <div className="materials-pane">
          <div className="materials-pane-body">
            {filteredBriefs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="empty-text">
                  {briefProjectFilter ? '该项目下暂无甲方要求' : '还没有任何甲方要求记录'}
                </div>
                <div className="empty-sub">把客户的诉求整理进来，方便团队对齐目标</div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setEditingBrief(null)}
                >
                  新建要求
                </button>
              </div>
            ) : (
              <div className="brief-list brief-list-pane">
                {filteredBriefs.map((brief) => (
                  <BriefCard
                    key={brief.id}
                    brief={brief}
                    onEdit={() => setEditingBrief(brief)}
                    onDelete={() => void deleteBrief(brief)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 分隔线 ────────────────────────────────── */}
        <div className="materials-divider" />

        {/* ── 右：账号密码 ──────────────────────────── */}
        <div className="materials-pane">
          {/* 分类筛选 + 安全提示 */}
          <div className="acc-subhead">
            <div className="acc-category-tabs">
              <button
                className={`acc-cat-tab${accCategory === '' ? ' active' : ''}`}
                type="button"
                onClick={() => setAccCategory('')}
              >
                全部
              </button>
              {ACCOUNT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`acc-cat-tab${accCategory === cat ? ' active' : ''}`}
                  type="button"
                  onClick={() => setAccCategory(cat === accCategory ? '' : cat)}
                >
                  {ACCOUNT_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="acc-warn-inline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              明文存储，勿保存高敏感账号
            </div>
          </div>

          <div className="materials-pane-body">
            {filteredAccounts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="empty-text">
                  {accSearch || accCategory ? '没有匹配的账号' : '还没有保存任何账号'}
                </div>
                <div className="empty-sub">把团队共用的平台账号整理在这里，方便成员随时取用</div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setEditingAccount(null)}
                >
                  新建账号
                </button>
              </div>
            ) : (
              <div className="acc-list acc-list-pane">
                {filteredAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onEdit={() => setEditingAccount(account)}
                    onDelete={() => void deleteAccount(account)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── 弹窗 ─────────────────────────────────────── */}
      {editingBrief !== undefined ? (
        <ClientBriefDialog
          brief={editingBrief}
          projectOptions={projectOptions}
          onSave={saveBrief}
          onClose={() => setEditingBrief(undefined)}
        />
      ) : null}

      {editingAccount !== undefined ? (
        <AccountDialog
          account={editingAccount}
          onSave={saveAccount}
          onClose={() => setEditingAccount(undefined)}
        />
      ) : null}
    </div>
  )
}
