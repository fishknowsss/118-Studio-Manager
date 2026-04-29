import { useRef, useState } from 'react'
import { useBackdropDismiss } from '../../components/ui/useBackdropDismiss'
import { PHILOSOPHY_QUOTES, MOTIVATIONS } from '../../content/quotes'

const LS_CUSTOM_QUOTES = '118studio:custom-quotes'
const LS_CUSTOM_MOTIVATIONS = '118studio:custom-motivations'

type QuoteItem = { text: string; src: string }

function loadLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch { return [] }
}

function saveLS<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function QuoteBlock() {
  const [customQuotes, setCustomQuotes] = useState<QuoteItem[]>(() => loadLS<QuoteItem>(LS_CUSTOM_QUOTES))
  const [customMotivations, setCustomMotivations] = useState<string[]>(() => loadLS<string>(LS_CUSTOM_MOTIVATIONS))

  const allQuotes = [...PHILOSOPHY_QUOTES, ...customQuotes]
  const allMotivations = [...MOTIVATIONS, ...customMotivations]

  const [quote, setQuote] = useState<QuoteItem>(() => pickRand(allQuotes))
  const [motivation, setMotivation] = useState<string>(() => pickRand(allMotivations))
  const [hovered, setHovered] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const [tab, setTab] = useState<'quotes' | 'motivations'>('quotes')
  const [newText, setNewText] = useState('')
  const [newSrc, setNewSrc] = useState('')
  const [newMotivationText, setNewMotivationText] = useState('')
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = () => {
    const qs = [...PHILOSOPHY_QUOTES, ...customQuotes]
    const ms = [...MOTIVATIONS, ...customMotivations]
    setQuote(pickRand(qs))
    setMotivation(pickRand(ms))
  }

  const handleMouseEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), 250)
  }

  const addQuote = () => {
    const t = newText.trim()
    if (!t) return
    const item: QuoteItem = { text: t, src: newSrc.trim() }
    const next = [...customQuotes, item]
    setCustomQuotes(next)
    saveLS(LS_CUSTOM_QUOTES, next)
    setNewText('')
    setNewSrc('')
  }

  const deleteCustomQuote = (i: number) => {
    const next = customQuotes.filter((_, idx) => idx !== i)
    setCustomQuotes(next)
    saveLS(LS_CUSTOM_QUOTES, next)
  }

  const addMotivation = () => {
    const t = newMotivationText.trim()
    if (!t) return
    const next = [...customMotivations, t]
    setCustomMotivations(next)
    saveLS(LS_CUSTOM_MOTIVATIONS, next)
    setNewMotivationText('')
  }

  const deleteCustomMotivation = (i: number) => {
    const next = customMotivations.filter((_, idx) => idx !== i)
    setCustomMotivations(next)
    saveLS(LS_CUSTOM_MOTIVATIONS, next)
  }

  const closeManager = () => setShowManager(false)
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(closeManager)

  return (
    <>
      <div
        className="dash-quote-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="dash-quote-content">
          <div className="dash-quote-line">
            <span className="dash-quote-text">"{quote.text}"</span>
            <span className="dash-quote-src">— {quote.src || '佚名'}</span>
          </div>
          <div className="dash-motivation">{motivation}</div>
        </div>
        <div className={`dash-quote-actions${hovered ? ' visible' : ''}`}>
          <button
            className="dash-quote-btn"
            type="button"
            title="刷新语句"
            onClick={refresh}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="12" height="12">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            className="dash-quote-btn"
            type="button"
            title="管理语句"
            onClick={() => setShowManager(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="12" height="12">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {showManager ? (
        <div className="qm-overlay" role="presentation" {...backdropDismiss}>
          <div
            className="qm-box"
            role="dialog"
            aria-modal="true"
            aria-label="语句管理"
          >
            <div className="qm-header">
              <span className="qm-title">语句库</span>
              <button className="modal-close" type="button" onClick={closeManager} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="qm-tabs">
              <button className={`qm-tab${tab === 'quotes' ? ' active' : ''}`} type="button" onClick={() => setTab('quotes')}>
                格言 · {allQuotes.length}
              </button>
              <button className={`qm-tab${tab === 'motivations' ? ' active' : ''}`} type="button" onClick={() => setTab('motivations')}>
                激励语 · {allMotivations.length}
              </button>
            </div>

            <div className="qm-body">
              {tab === 'quotes' ? (
                <>
                  <div className="qm-list">
                    {PHILOSOPHY_QUOTES.map((q, i) => (
                      <div key={`b-${i}`} className="qm-item">
                        <div className="qm-item-content">
                          <span className="qm-item-text">"{q.text}"</span>
                          {q.src ? <span className="qm-item-src">— {q.src}</span> : null}
                        </div>
                        <span className="qm-builtin-badge">内置</span>
                      </div>
                    ))}
                    {customQuotes.map((q, i) => (
                      <div key={`c-${i}`} className="qm-item">
                        <div className="qm-item-content">
                          <span className="qm-item-text">"{q.text}"</span>
                          {q.src ? <span className="qm-item-src">— {q.src}</span> : null}
                        </div>
                        <button className="qm-delete-btn" type="button" onClick={() => deleteCustomQuote(i)} aria-label="删除">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="qm-add-row">
                    <input
                      className="qm-input"
                      placeholder="语句内容"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addQuote() }}
                    />
                    <input
                      className="qm-input qm-input-src"
                      placeholder="来源（可选）"
                      value={newSrc}
                      onChange={(e) => setNewSrc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addQuote() }}
                    />
                    <button className="btn btn-primary btn-sm" type="button" onClick={addQuote}>添加</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="qm-list">
                    {MOTIVATIONS.map((m, i) => (
                      <div key={`bm-${i}`} className="qm-item">
                        <div className="qm-item-content">
                          <span className="qm-item-text">{m}</span>
                        </div>
                        <span className="qm-builtin-badge">内置</span>
                      </div>
                    ))}
                    {customMotivations.map((m, i) => (
                      <div key={`cm-${i}`} className="qm-item">
                        <div className="qm-item-content">
                          <span className="qm-item-text">{m}</span>
                        </div>
                        <button className="qm-delete-btn" type="button" onClick={() => deleteCustomMotivation(i)} aria-label="删除">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="qm-add-row">
                    <input
                      className="qm-input"
                      placeholder="激励语内容"
                      value={newMotivationText}
                      onChange={(e) => setNewMotivationText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addMotivation() }}
                    />
                    <button className="btn btn-primary btn-sm" type="button" onClick={addMotivation}>添加</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
