import { useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import type { DashboardHeaderModel, QuickJumpSearchItem } from '../../legacy/selectors'
import { QuoteBlock } from './QuoteBlock'
import {
  readHomeResourceLinkState,
  subscribeHomeResourceLinkState,
  writeHomeResourceLink,
} from './homeResourceState'

export function DashboardHeader({
  model,
  onSearchQueryChange,
  onSearchSelect,
  searchQuery,
  searchResults,
}: {
  model: DashboardHeaderModel
  onSearchQueryChange: (value: string) => void
  onSearchSelect: (item: QuickJumpSearchItem) => void
  searchQuery: string
  searchResults: QuickJumpSearchItem[]
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [resourceEditorOpen, setResourceEditorOpen] = useState(false)
  const homeResourceLink = useSyncExternalStore(
    subscribeHomeResourceLinkState,
    readHomeResourceLinkState,
  )
  const [draftResourceUrl, setDraftResourceUrl] = useState(homeResourceLink.url)

  const showDropdown = searchOpen && searchQuery.trim().length > 0

  const openResourceEditor = () => {
    setDraftResourceUrl(homeResourceLink.url)
    setResourceEditorOpen(true)
  }

  const handleResourceContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    openResourceEditor()
  }

  const handleResourceOpen = () => {
    if (!homeResourceLink.url) {
      openResourceEditor()
      return
    }
    window.open(homeResourceLink.url, '_blank', 'noopener,noreferrer')
  }

  const saveResourceLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    writeHomeResourceLink(draftResourceUrl)
    setResourceEditorOpen(false)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (event.key === 'Escape') setSearchOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, searchResults.length - 1)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      const selected = searchResults[activeIndex] || searchResults[0]
      if (!selected) return
      event.preventDefault()
      onSearchSelect(selected)
      setSearchOpen(false)
      setActiveIndex(0)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setSearchOpen(false)
    }
  }

  const getKindLabel = (kind: QuickJumpSearchItem['kind']) => {
    if (kind === 'project') return '项目'
    if (kind === 'task') return '任务'
    return '人员'
  }

  return (
    <div className="dash-header">
      <div className="dash-header-left">
        <div className="dash-date-block">
          <div className="dash-date-big">{model.dateText}</div>
          <div className="dash-date-weekday">{model.weekdayText}</div>
        </div>

        <div
          className="dash-search-wrap"
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 100)}
        >
          <input
            className="dash-search-input"
            value={searchQuery}
            placeholder="搜索项目 / 任务 / 人员，回车快速跳转"
            onChange={(event) => {
              onSearchQueryChange(event.target.value)
              setSearchOpen(true)
              setActiveIndex(0)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {showDropdown ? (
            <div className="dash-search-dropdown" role="listbox" aria-label="全局搜索结果">
              {searchResults.length === 0 ? (
                <div className="dash-search-empty">没有匹配结果</div>
              ) : (
                searchResults.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    className={`dash-search-item ${index === activeIndex ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSearchSelect(item)
                      setSearchOpen(false)
                      setActiveIndex(0)
                    }}
                  >
                    <span className={`dash-search-kind ${item.kind}`}>{getKindLabel(item.kind)}</span>
                    <span className="dash-search-texts">
                      <span className="dash-search-title">{item.title}</span>
                      <span className="dash-search-subtitle">{item.subtitle}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="dash-resource-slot">
        <button
          className="dash-resource-hotspot"
          type="button"
          aria-label="总资料"
          onClick={handleResourceOpen}
          onContextMenu={handleResourceContextMenu}
        />
        {resourceEditorOpen ? (
          <form className="dash-resource-editor" onSubmit={saveResourceLink}>
            <label className="form-label" htmlFor="home-resource-url">总资料链接</label>
            <input
              id="home-resource-url"
              className="form-input"
              value={draftResourceUrl}
              placeholder="https://"
              autoFocus
              onChange={(event) => setDraftResourceUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setResourceEditorOpen(false)
              }}
            />
            <div className="dash-resource-actions">
              <button className="btn btn-xs btn-primary" type="submit">保存</button>
              <button
                className="btn btn-xs btn-secondary"
                type="button"
                onClick={() => {
                  writeHomeResourceLink('')
                  setDraftResourceUrl('')
                  setResourceEditorOpen(false)
                }}
              >
                清空
              </button>
              <button className="btn btn-xs btn-ghost" type="button" onClick={() => setResourceEditorOpen(false)}>取消</button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="dash-header-right">
        <QuoteBlock />
      </div>
    </div>
  )
}
