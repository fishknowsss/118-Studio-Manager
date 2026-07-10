// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getTheme,
  hydrateThemeFromStorage,
  setEasterThemeOverride,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from '../src/features/theme/themeStore'

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    setEasterThemeOverride(false)
    hydrateThemeFromStorage()
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
})
