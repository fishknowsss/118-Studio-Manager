// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('theme store', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('theme-switching')
  })

  afterEach(() => {
    document.documentElement.classList.remove('theme-switching')
  })

  it('applies stored theme on module load without App state', async () => {
    localStorage.setItem('theme', 'dark')
    const { getTheme } = await import('../src/features/theme/themeStore')

    expect(getTheme()).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('toggles theme, persists preference, and briefly marks switching class', async () => {
    const { getTheme, toggleTheme, subscribeTheme } = await import('../src/features/theme/themeStore')
    const listener = vi.fn()
    const unsubscribe = subscribeTheme(listener)

    expect(getTheme()).toBe('light')
    toggleTheme()

    expect(getTheme()).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('forces light surface during easter override without rewriting stored preference', async () => {
    localStorage.setItem('theme', 'dark')
    const { getTheme, setEasterThemeOverride } = await import('../src/features/theme/themeStore')

    expect(getTheme()).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    setEasterThemeOverride(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(getTheme()).toBe('dark')

    setEasterThemeOverride(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
