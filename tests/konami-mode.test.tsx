// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/legacy/bootstrap', () => ({
  initializeAppData: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/components/feedback/ConfirmProvider', () => ({
  ConfirmProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
  },
}))

vi.mock('../src/components/feedback/ToastProvider', () => ({
  ToastProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
  },
}))

vi.mock('../src/features/planner/PlannerProvider', () => ({
  PlannerProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
  },
}))

vi.mock('../src/features/sync/SyncProvider', () => ({
  CloudSyncProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
  },
}))

vi.mock('../src/views/Dashboard', () => ({
  Dashboard() {
    return (
      <div>
        <input aria-label="首页搜索" />
        <div>Dashboard</div>
      </div>
    )
  },
}))

vi.mock('../src/views/Materials', () => ({
  Materials() {
    return <div>Materials</div>
  },
}))

vi.mock('../src/views/Graph', () => ({
  Graph() {
    return <div>Graph</div>
  },
}))

vi.mock('../src/views/Tools', () => ({
  Tools() {
    return <div>Tools</div>
  },
}))

vi.mock('../src/views/Settings', () => ({
  Settings() {
    return <div>Settings</div>
  },
}))

import App from '../src/App'

const KONAMI_KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

async function renderApp() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(<App />)
    await Promise.resolve()
  })

  await act(async () => {
    await Promise.resolve()
  })

  return {
    container,
    root,
    cleanup() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

async function dispatchKonami(target: EventTarget = window) {
  for (const key of KONAMI_KEYS) {
    await act(async () => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    })
  }
}

describe('konami anomaly mode', () => {
  beforeEach(() => {
    window.location.hash = '#dashboard'
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('enters anomaly mode after the konami sequence on the dashboard shell', async () => {
    const view = await renderApp()

    await dispatchKonami(window)

    const appShell = view.container.querySelector('#app')
    expect(appShell?.getAttribute('data-easter-mode')).toBe('konami')
    expect(document.documentElement.getAttribute('data-easter-mode')).toBe('konami')
    expect(document.body.getAttribute('data-easter-mode')).toBe('konami')
    expect(view.container.textContent).toContain('烧粥幺幺捌')
    expect(view.container.textContent).toContain('退出异象')
    expect(view.container.textContent).toContain('Noclipping into the Backrooms')
    expect(view.container.querySelector('.konami-entry-flash-backdrop')).toBeTruthy()
    expect(view.container.querySelector('.brand-icon')).toBeNull()

    view.cleanup()
  })

  it('ignores the konami sequence while an input is focused', async () => {
    const view = await renderApp()
    const searchInput = view.container.querySelector('input') as HTMLInputElement | null

    searchInput?.focus()
    await dispatchKonami(searchInput ?? window)

    const appShell = view.container.querySelector('#app')
    expect(appShell?.getAttribute('data-easter-mode')).toBeNull()
    expect(view.container.textContent).toContain('Studio')
    expect(view.container.textContent).toContain('深色模式')

    view.cleanup()
  })

  it('lets the footer button exit anomaly mode after it is unlocked', async () => {
    const view = await renderApp()

    await dispatchKonami(window)

    const exitButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('退出异象'),
    )

    expect(exitButton).toBeTruthy()

    await act(async () => {
      exitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const appShell = view.container.querySelector('#app')
    expect(appShell?.getAttribute('data-easter-mode')).toBeNull()
    expect(document.documentElement.getAttribute('data-easter-mode')).toBeNull()
    expect(document.body.getAttribute('data-easter-mode')).toBeNull()
    expect(view.container.textContent).toContain('Studio')
    expect(view.container.textContent).toContain('深色模式')

    view.cleanup()
  })

  it('uses the light theme surface while anomaly mode is active from dark mode', async () => {
    localStorage.setItem('theme', 'dark')
    const view = await renderApp()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    await dispatchKonami(window)

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('dark')

    const exitButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('退出异象'),
    )

    await act(async () => {
      exitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    view.cleanup()
  })
})
