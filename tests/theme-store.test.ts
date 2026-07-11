// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getTheme,
  hydrateThemeFromStorage,
  setEasterThemeOverride,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from '../src/features/theme/themeStore'

let animationFrameId = 0
let animationFrames = new Map<number, FrameRequestCallback>()

function runNextAnimationFrame() {
  const next = animationFrames.entries().next().value as [number, FrameRequestCallback] | undefined
  if (!next) return
  animationFrames.delete(next[0])
  next[1](performance.now())
}

describe('theme store', () => {
  beforeEach(() => {
    animationFrameId = 0
    animationFrames = new Map()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      animationFrameId += 1
      animationFrames.set(animationFrameId, callback)
      return animationFrameId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      animationFrames.delete(id)
    })
    document.documentElement.classList.remove('theme-switching')
    localStorage.clear()
    setEasterThemeOverride(false)
    hydrateThemeFromStorage()
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-switching')
    vi.unstubAllGlobals()
  })

  it('hydrates valid preferences and falls back to light', () => {
    localStorage.setItem('theme', 'dark')
    hydrateThemeFromStorage()
    expect(getTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    localStorage.setItem('theme', 'invalid')
    hydrateThemeFromStorage()
    expect(getTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists changes and only notifies active subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTheme(listener)

    setTheme('dark')

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    toggleTheme()

    expect(getTheme()).toBe('light')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('temporarily forces light without changing the preference', () => {
    setTheme('dark')
    setEasterThemeOverride(true)

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('dark')

    setEasterThemeOverride(false)

    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('suppresses transitions until two animation frames complete', () => {
    setTheme('dark')
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

    runNextAnimationFrame()
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

    runNextAnimationFrame()
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
  })

  it('restarts transition suppression during rapid toggles', () => {
    setTheme('dark')
    runNextAnimationFrame()
    toggleTheme()

    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
    expect(animationFrames.size).toBe(1)

    runNextAnimationFrame()
    runNextAnimationFrame()
    expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
  })
})
