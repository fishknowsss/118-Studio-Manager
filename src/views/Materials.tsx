import { useMemo, useRef, useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ClientBriefDialog } from '../features/materials/ClientBriefDialog'
import { AccountDialog } from '../features/materials/AccountDialog'
import {
  orderFoldersByCount,
  readBriefs,
  writeBriefs,
  subscribeBriefs,
  readAccounts,
  writeAccounts,
  subscribeAccounts,
  readFolders,
  writeFolders,
  subscribeFolders,
  type ClientBrief,
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

// ─── 文件夹色彩映射（按项目DDL紧急度色阶递减）────────────────────────
const FOLDER_TONE_COLORS = [
  '#E54D4D', // overdue / focus-critical
  '#E8840F', // today / focus-strong
  '#CA8A04', // soon / focus-medium
  '#4166F5', // near / focus-calm
  '#E4E8F0', // neutral / border
]

function getFolderColor(count: number, maxCount: number): string {
  if (maxCount <= 0 || count <= 0) {
    return FOLDER_TONE_COLORS[4]
  }
  const ratio = count / maxCount
  if (ratio >= 0.8) return FOLDER_TONE_COLORS[0]
  if (ratio >= 0.6) return FOLDER_TONE_COLORS[1]
  if (ratio >= 0.4) return FOLDER_TONE_COLORS[2]
  if (ratio >= 0.2) return FOLDER_TONE_COLORS[3]
  return FOLDER_TONE_COLORS[4]
}

// ─── 文件夹图标 SVG（近方形、极简线稿双态）──────────
function FolderIcon({ color, open }: { color: string; open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 48 44" fill="none" width="104" height="92" aria-hidden="true">
        <path
          d="M10 18v-6a4 4 0 0 1 4-4h9.4l3.58 3.45A4 4 0 0 0 29.76 12.6H34a4 4 0 0 1 4 4V18"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M10.4 18H37.6a4 4 0 0 1 3.92 4.78l-1.18 6.02A4 4 0 0 1 36.42 32H11.58a4 4 0 0 1-3.92-4.78l1.14-6.02A4 4 0 0 1 10.4 18z"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M15.5 18h17"
          stroke={color}
          strokeWidth="1.35"
          strokeOpacity="0.22"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 48 44" fill="none" width="104" height="92" aria-hidden="true">
      <path
        d="M10 16v-4a4 4 0 0 1 4-4h9.7l3.56 3.45a4 4 0 0 0 2.78 1.15H34a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V16z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10 18h28"
        stroke={color}
        strokeWidth="1.35"
        strokeOpacity="0.22"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── 复制图标 SVG ──────────────────────────────────────
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ─── 账号条目（编辑/删除右对齐，支持移至文件夹）─────
function AccountEntry({
  account,
  folders,
  onEdit,
  onDelete,
  onMoveToFolder,
  onMoveModeChange,
}: {
  account: AccountCredential
  folders: string[]
  onEdit: () => void
  onDelete: () => void
  onMoveToFolder: (targetFolder: string) => void
  onMoveModeChange?: (active: boolean) => void
}) {
  const [flash, setFlash] = useState<'account' | 'password' | null>(null)
  const [showMove, setShowMove] = useState(false)
  const { toast } = useToast()

  const copy = async (text: string, field: 'account' | 'password', label: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setFlash(field)
      setTimeout(() => setFlash(null), 1200)
    }
    toast(ok ? `${label}已复制` : '复制失败，请手动选择', ok ? 'success' : 'error')
  }

  const targetFolders = folders.filter((f) => f !== account.platform)

  const openMovePanel = () => {
    setShowMove(true)
    onMoveModeChange?.(true)
  }
  const closeMovePanel = () => {
    setShowMove(false)
    onMoveModeChange?.(false)
  }

  return (
    <div className="acc-entry">
      {/* 头部：URL + 右侧操作按钮 */}
      <div className="acc-entry-head">
        {account.url ? (
          <a className="acc-entry-url" href={account.url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>{account.url}</span>
          </a>
        ) : <div className="acc-entry-url-gap" />}
        <div className="acc-entry-actions">
          <button className="acc-entry-action-btn" type="button" title="编辑" onClick={onEdit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {targetFolders.length > 0 && (
            <button className="acc-entry-action-btn acc-entry-action-move" type="button" title="移至文件夹" onClick={openMovePanel}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
                <path d="M3 7a2 2 0 0 1 2-2h3.17l2 2H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                <line x1="9" y1="14" x2="15" y2="14" />
                <line x1="12" y1="11" x2="12" y2="17" />
              </svg>
            </button>
          )}
          <button className="acc-entry-action-btn acc-entry-action-del" type="button" title="删除" onClick={onDelete}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* 移至文件夹面板（内联展开） */}
      {showMove && (
        <div className="acc-move-panel">
          <span className="acc-move-label">移至</span>
          {targetFolders.map((f) => (
            <button
              key={f}
              className="acc-move-tag"
              type="button"
              onClick={() => { onMoveToFolder(f); closeMovePanel() }}
            >
              {f}
            </button>
          ))}
          <button className="acc-move-cancel" type="button" onClick={closeMovePanel}>取消</button>
        </div>
      )}

      <button
        className={`acc-copy-row${flash === 'account' ? ' is-copied' : ''}`}
        type="button"
        onClick={() => void copy(account.account, 'account', '账号')}
        title="点击复制账号"
      >
        <span className="acc-copy-row-label">账号</span>
        <span className="acc-copy-row-value">{account.account}</span>
        <span className="acc-copy-row-icon">
          {flash === 'account' ? <CheckIcon /> : <CopyIcon />}
        </span>
      </button>

      {account.password ? (
        <button
          className={`acc-copy-row${flash === 'password' ? ' is-copied' : ''}`}
          type="button"
          onClick={() => void copy(account.password, 'password', '密码')}
          title="点击复制密码"
        >
          <span className="acc-copy-row-label">密码</span>
          <span className="acc-copy-row-value acc-copy-row-pwd">{account.password}</span>
          <span className="acc-copy-row-icon">
            {flash === 'password' ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>
      ) : null}

      {account.note ? (
        <div className="acc-entry-note">{account.note}</div>
      ) : null}
    </div>
  )
}

// ─── 平台卡片（文件夹图标 + hover 侧面扇状展开）──────
function PlatformCard({
  platform,
  accounts,
  folders,
  maxCount,
  onEdit,
  onDelete,
  onMoveToFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddAccount,
}: {
  platform: string
  accounts: AccountCredential[]
  folders: string[]
  maxCount: number
  onEdit: (account: AccountCredential) => void
  onDelete: (account: AccountCredential) => void
  onMoveToFolder: (account: AccountCredential, targetFolder: string) => void
  onRenameFolder: (oldName: string, newName: string) => void
  onDeleteFolder: (platform: string) => void
  onAddAccount: (platform: string) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRenamingRef = useRef(false)
  const isMovingRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const [panelLeft, setPanelLeft] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(platform)
  const color = getFolderColor(accounts.length, maxCount)

  useEffect(() => { isRenamingRef.current = isRenaming }, [isRenaming])

  const openPanel = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceRight = window.innerWidth - rect.right
    const isLeft = spaceRight < 280
    const top = Math.min(rect.top, window.innerHeight - 80)
    setPanelLeft(isLeft)
    setPanelStyle(
      isLeft
        ? { top, right: window.innerWidth - rect.left + 6 }
        : { top, left: rect.right + 6 },
    )
    setOpen(true)
  }

  const scheduleClose = () => {
    if (isRenamingRef.current || isMovingRef.current) return
    closeTimer.current = setTimeout(() => setOpen(false), 130)
  }

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameValue(platform)
    setIsRenaming(true)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const confirmRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== platform) onRenameFolder(platform, trimmed)
    setIsRenaming(false)
  }

  const cancelRename = () => {
    setRenameValue(platform)
    setIsRenaming(false)
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  return (
    <>
      <div
        className={`acc-platform-card${open ? ' is-open' : ''}${accounts.length === 0 ? ' is-empty' : ''}`}
        style={{ '--acc-color': color } as React.CSSProperties}
      >
        <div className="acc-platform-trigger-wrap">
          <button
            ref={triggerRef}
            className="acc-platform-trigger"
            type="button"
            onMouseEnter={openPanel}
            onMouseLeave={scheduleClose}
            onFocus={openPanel}
            onBlur={scheduleClose}
            aria-label={`${platform}，${accounts.length} 个账号`}
            aria-expanded={open}
          >
            <div className="acc-platform-card-icon">
              <FolderIcon color={color} open={open} />
            </div>
          </button>
        </div>
        <div className="acc-platform-card-meta">
          <div className="acc-platform-card-name">{platform}</div>
          <div className="acc-platform-card-count">
            {accounts.length === 0 ? '空文件夹' : `${accounts.length} 个账号`}
          </div>
        </div>
      </div>

      {open && createPortal(
        <div
          className={`acc-fan-panel${panelLeft ? ' panel-left' : ''}`}
          style={{ ...panelStyle, position: 'fixed', '--acc-panel-color': color } as React.CSSProperties}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          role="region"
          aria-label={`${platform} 账号列表`}
        >
          {/* 标题栏：重命名 / 删除 */}
          <div className="acc-fan-panel-head">
            {isRenaming ? (
              <>
                <input
                  ref={renameInputRef}
                  className="acc-fan-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') cancelRename()
                  }}
                  aria-label="重命名文件夹"
                />
                <button className="acc-fan-action-btn" type="button" title="确认" onClick={confirmRename}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button className="acc-fan-action-btn" type="button" title="取消" onClick={cancelRename}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <span className="acc-fan-panel-title" style={{ color }}>{platform}</span>
                <span className="acc-fan-panel-count">{accounts.length} 个账号</span>
                <button className="acc-fan-action-btn" type="button" title="重命名文件夹" onClick={startRename}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="acc-fan-action-btn acc-fan-action-del" type="button" title="删除文件夹" onClick={() => onDeleteFolder(platform)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* 账号列表 */}
          {accounts.length === 0 ? (
            <div className="acc-fan-empty">此文件夹暂无账号</div>
          ) : (
            accounts.map((account, i) => (
              <div
                key={account.id}
                className="acc-fan-item"
                style={{ '--i': i } as React.CSSProperties}
              >
                {i > 0 && <div className="acc-entry-sep" />}
                <AccountEntry
                  account={account}
                  folders={folders}
                  onEdit={() => { onEdit(account); setOpen(false) }}
                  onDelete={() => { onDelete(account) }}
                  onMoveToFolder={(targetFolder) => { onMoveToFolder(account, targetFolder); setOpen(false) }}
                  onMoveModeChange={(active) => { isMovingRef.current = active }}  
                />
              </div>
            ))
          )}

          {/* 底栏：在此文件夹新建账号 */}
          <div className="acc-fan-panel-footer">
            <button
              className="acc-fan-add-btn"
              type="button"
              onClick={() => { onAddAccount(platform); setOpen(false) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              在此文件夹新建账号
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
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
  const accounts  = useSyncExternalStore(subscribeAccounts, readAccounts)
  const folders   = useSyncExternalStore(subscribeFolders, readFolders)
  const [editingAccount, setEditingAccount]     = useState<AccountCredential | null | undefined>(undefined)
  const [defaultPlatform, setDefaultPlatform]   = useState('')
  const [accSearch, setAccSearch]               = useState('')
  const [newFolderMode, setNewFolderMode]        = useState(false)
  const [newFolderName, setNewFolderName]        = useState('')
  const newFolderInputRef                        = useRef<HTMLInputElement>(null)

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

  const accountsByPlatform = useMemo(() => {
    const map = new Map<string, AccountCredential[]>()
    for (const a of accounts) {
      const list = map.get(a.platform)
      if (list) list.push(a)
      else map.set(a.platform, [a])
    }
    return map
  }, [accounts])

  // 按平台分组（搜索过滤后）
  const groupedAccounts = useMemo(() => {
    let filtered = accounts
    if (accSearch.trim()) {
      const q = accSearch.trim().toLowerCase()
      filtered = filtered.filter(
        (a) => a.platform.toLowerCase().includes(q) || a.account.toLowerCase().includes(q),
      )
    }
    const map = new Map<string, AccountCredential[]>()
    for (const a of filtered) {
      const list = map.get(a.platform)
      if (list) list.push(a)
      else map.set(a.platform, [a])
    }
    return map
  }, [accounts, accSearch])

  const registeredPlatforms = useMemo(() => {
    const result: string[] = []
    const seen = new Set<string>()
    for (const f of folders) {
      if (!seen.has(f)) { result.push(f); seen.add(f) }
    }
    for (const p of accountsByPlatform.keys()) {
      if (!seen.has(p)) { result.push(p); seen.add(p) }
    }
    return result
  }, [accountsByPlatform, folders])

  // 合并显示的平台列表：固定按账号数降序
  // 搜索时只显示有匹配账号的平台（不展示空文件夹）
  const allPlatforms = useMemo(() => {
    const visible = accSearch.trim()
      ? registeredPlatforms.filter((platform) => groupedAccounts.has(platform))
      : registeredPlatforms.slice()

    const seen = new Set(visible)
    for (const platform of groupedAccounts.keys()) {
      if (!seen.has(platform)) visible.push(platform)
    }

    const counts = new Map<string, number>()
    for (const platform of visible) {
      counts.set(platform, (groupedAccounts.get(platform) ?? []).length)
    }

    return orderFoldersByCount(visible, counts)
  }, [accSearch, groupedAccounts, registeredPlatforms])

  const totalFiltered = useMemo(
    () => Array.from(groupedAccounts.values()).reduce((s, a) => s + a.length, 0),
    [groupedAccounts],
  )

  const maxFolderCount = useMemo(() => {
    return Math.max(0, ...Array.from(groupedAccounts.values()).map((accounts) => accounts.length))
  }, [groupedAccounts])

  // 新建文件夹时自动聚焦
  useEffect(() => {
    if (newFolderMode) setTimeout(() => newFolderInputRef.current?.focus(), 0)
  }, [newFolderMode])

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
    // 若平台名不在 folders 列表，自动注册
    if (account.platform && !folders.includes(account.platform)) {
      writeFolders([...folders, account.platform])
    }
    toast(editingAccount ? '已保存' : '账号已创建', 'success')
    setEditingAccount(undefined)
    setDefaultPlatform('')
  }

  const deleteAccount = async (account: AccountCredential) => {
    const ok = await confirm('删除账号', `确认删除「${account.platform}」的账号记录？`)
    if (!ok) return
    writeAccounts(accounts.filter((item) => item.id !== account.id))
    toast('已删除', 'error')
  }

  // ── 文件夹操作 ──────────────────────────────────────
  const createFolder = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newFolderName.trim()
    if (!name) return
    if (registeredPlatforms.includes(name)) {
      toast(`文件夹「${name}」已存在`, 'error')
      return
    }
    writeFolders([...folders, name])
    toast(`文件夹「${name}」已创建`, 'success')
    setNewFolderName('')
    setNewFolderMode(false)
  }

  const renamePlatform = (oldName: string, newName: string) => {
    if (oldName === newName) return
    if (registeredPlatforms.includes(newName)) {
      toast(`文件夹「${newName}」已存在`, 'error')
      return
    }
    writeAccounts(accounts.map((a) => a.platform === oldName ? { ...a, platform: newName } : a))
    if (folders.includes(oldName)) {
      writeFolders(folders.map((f) => f === oldName ? newName : f))
    } else if (!folders.includes(newName)) {
      writeFolders([...folders, newName])
    }
    toast('文件夹已重命名', 'success')
  }

  const deletePlatform = async (platform: string) => {
    const count = (groupedAccounts.get(platform) ?? []).length
    const ok = await confirm(
      '删除文件夹',
      count > 0
        ? `确认删除「${platform}」文件夹及其 ${count} 个账号记录？此操作不可撤销。`
        : `确认删除空文件夹「${platform}」？`,
    )
    if (!ok) return
    writeAccounts(accounts.filter((a) => a.platform !== platform))
    writeFolders(registeredPlatforms.filter((f) => f !== platform))
    toast('已删除', 'error')
  }

  const openAddAccountInFolder = (platform: string) => {
    setDefaultPlatform(platform)
    setEditingAccount(null)
  }

  const moveAccountToFolder = (account: AccountCredential, targetFolder: string) => {
    const updated = { ...account, platform: targetFolder, updatedAt: new Date().toISOString() }
    writeAccounts(accounts.map((a) => (a.id === account.id ? updated : a)))
    toast(`已移至「${targetFolder}」`, 'success')
  }

  // 是否有任何内容可展示（文件夹 + 账号）
  const hasContent = allPlatforms.length > 0

  return (
    <div className="view-materials fade-in">
      <div className="view-header">
        <h1 className="view-title">资料</h1>
      </div>

      {/* ── 分区子栏：甲方要求 / 账号密码 ───────────────── */}
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
              <span className="mat-col-count">{totalFiltered}</span>
            )}
          </div>
          <div className="mat-col-controls">
            {newFolderMode ? (
              <form className="acc-new-folder-form" onSubmit={createFolder}>
                <input
                  ref={newFolderInputRef}
                  className="filter-input acc-new-folder-input"
                  placeholder="文件夹名称…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') } }}
                />
                <button type="submit" className="btn btn-primary btn-sm">创建</button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setNewFolderMode(false); setNewFolderName('') }}
                >取消</button>
              </form>
            ) : (
              <>
                <input
                  className="filter-input acc-folder-search"
                  placeholder="搜索文件夹或账号…"
                  value={accSearch}
                  onChange={(e) => setAccSearch(e.target.value)}
                />
                <button
                  className="btn btn-sm btn-secondary"
                  type="button"
                  title="新建文件夹"
                  onClick={() => setNewFolderMode(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
                    <line x1="12" y1="10" x2="12" y2="16" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                  </svg>
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => setEditingAccount(null)}
                >
                  新建账号
                </button>
              </>
            )}
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
          <div className="acc-subhead">
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
            {!hasContent ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
                  </svg>
                </div>
                <div className="empty-text">
                  {accSearch ? '没有匹配的文件夹或账号' : '还没有文件夹和账号'}
                </div>
                {!accSearch && (
                  <div className="empty-sub">先新建一个文件夹，再把账号归类整理进去</div>
                )}
                {!accSearch && (
                  <div className="empty-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => setNewFolderMode(true)}>新建文件夹</button>
                    <button className="btn btn-primary" type="button" onClick={() => setEditingAccount(null)}>新建账号</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="acc-grid">
                {allPlatforms.map((platform) => (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    accounts={groupedAccounts.get(platform) ?? []}
                    folders={allPlatforms}
                    maxCount={maxFolderCount}
                    onEdit={(account) => setEditingAccount(account)}
                    onDelete={(account) => void deleteAccount(account)}
                    onMoveToFolder={moveAccountToFolder}
                    onRenameFolder={renamePlatform}
                    onDeleteFolder={(p) => void deletePlatform(p)}
                    onAddAccount={openAddAccountInFolder}
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
          folders={folders}
          defaultPlatform={defaultPlatform}
          onSave={saveAccount}
          onClose={() => { setEditingAccount(undefined); setDefaultPlatform('') }}
        />
      ) : null}
    </div>
  )
}
