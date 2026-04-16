import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { Dialog } from '../../components/ui/Dialog'
import { type AccountCredential } from './materialsState'

type Props = {
  account: AccountCredential | null
  /** 已有文件夹名称列表，用于 datalist 下拉提示 */
  folders: string[]
  /** 从某个文件夹打开"新建"时预填文件夹名 */
  defaultPlatform?: string
  onSave: (account: AccountCredential) => void
  onClose: () => void
}

export function AccountDialog({ account, folders, defaultPlatform, onSave, onClose }: Props) {
  const isNew = !account
  const { toast } = useToast()

  const [platform, setPlatform] = useState(account?.platform ?? defaultPlatform ?? '')
  const [url, setUrl]           = useState(account?.url ?? '')
  const [acc, setAcc]           = useState(account?.account ?? '')
  const [password, setPassword] = useState(account?.password ?? '')
  const [note, setNote]         = useState(account?.note ?? '')
  const [showPwd, setShowPwd]   = useState(false)

  const save = () => {
    if (!platform.trim()) {
      toast('请填写所在文件夹', 'error')
      return
    }
    if (!acc.trim()) {
      toast('请填写账号/邮箱', 'error')
      return
    }

    const now = new Date().toISOString()
    onSave({
      id:        account?.id ?? crypto.randomUUID(),
      platform:  platform.trim(),
      url:       url.trim() ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : '',
      account:   acc.trim(),
      password,
      note:      note.trim(),
      category:  account?.category ?? 'other',
      createdAt: account?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <Dialog
      open
      title={isNew ? '新建账号' : '编辑账号'}
      onClose={onClose}
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
        {/* 所在文件夹 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="acc-platform">所在文件夹 *</label>
          <input
            id="acc-platform"
            className="form-input"
            list="acc-platform-datalist"
            placeholder="选择已有文件夹，或直接输入新名称"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            autoComplete="off"
          />
          <datalist id="acc-platform-datalist">
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          {folders.length > 0 && (
            <div className="form-hint">输入框已列出现有文件夹，也可填写新文件夹名称自动创建</div>
          )}
        </div>

        {/* 官网地址 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="acc-url">官网地址</label>
          <input
            id="acc-url"
            className="form-input"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {/* 账号 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="acc-account">账号 / 邮箱 *</label>
          <input
            id="acc-account"
            className="form-input"
            placeholder="登录账号或邮箱"
            value={acc}
            onChange={(e) => setAcc(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* 密码 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="acc-password">密码</label>
          <div className="acc-pwd-row">
            <input
              id="acc-password"
              className="form-input acc-pwd-input"
              type={showPwd ? 'text' : 'password'}
              placeholder="留空则不保存密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              className="btn btn-xs btn-secondary acc-pwd-toggle"
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? '隐藏密码' : '显示密码'}
            >
              {showPwd ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 备注 */}
        <div className="form-field span2">
          <label className="form-label" htmlFor="acc-note">备注</label>
          <textarea
            id="acc-note"
            className="form-input"
            rows={2}
            placeholder="例：主账号、运营专用，勿轻易修改密码…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}
