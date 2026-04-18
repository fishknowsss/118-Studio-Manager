import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8')

describe('dashboard dark theme styles', () => {
  it('defines shared font tokens once in the root theme block', () => {
    const rootThemeBlock = stylesheet.match(/:root\s*\{[\s\S]*?\n\}/)

    expect(rootThemeBlock?.[0]).toBeDefined()
    expect(rootThemeBlock?.[0]).toMatch(/--fs-2xs\s*:/)
    expect(rootThemeBlock?.[0]).toMatch(/--fs-xs\s*:/)
    expect(rootThemeBlock?.[0]).toMatch(/--fs-sm\s*:/)
    expect(rootThemeBlock?.[0]).toMatch(/--fs-base\s*:/)
  })

  it('does not redefine shared font scale inside the dark theme root block', () => {
    const darkThemeRootBlock = stylesheet.match(/\[data-theme='dark'\]\s*\{[\s\S]*?\n\}/)

    expect(darkThemeRootBlock?.[0]).toBeDefined()
    expect(darkThemeRootBlock?.[0]).not.toMatch(/--fs-(2xs|xs|sm|base)\s*:/)
  })

  it('keeps core dark theme color tokens intact and free of leaked selectors', () => {
    const darkThemeRootBlock = stylesheet.match(/\[data-theme='dark'\]\s*\{[\s\S]*?\n\}/)

    expect(darkThemeRootBlock?.[0]).toBeDefined()
    expect(darkThemeRootBlock?.[0]).toMatch(/--c-bg\s*:\s*#0F172A;/)
    expect(darkThemeRootBlock?.[0]).toMatch(/--c-surface\s*:\s*#1E293B;/)
    expect(darkThemeRootBlock?.[0]).toMatch(/--c-text\s*:\s*#F8FAFC;/)
    expect(darkThemeRootBlock?.[0]).toMatch(/--c-text-2\s*:\s*#CBD5E1;/)
    expect(darkThemeRootBlock?.[0]).toMatch(/--c-overdue-bg\s*:\s*rgba\(229, 77, 77, 0\.22\);/)
    expect(darkThemeRootBlock?.[0]).not.toMatch(/\.assignee-chip-name/)
    expect(darkThemeRootBlock?.[0]).not.toMatch(/font-size\s*:/)
  })

  it('defines dark theme overrides for focus summary chips', () => {
    expect(stylesheet).toContain("[data-theme='dark'] .focus-highlight-tier")
    expect(stylesheet).toContain("[data-theme='dark'] .focus-highlight-summary")
    expect(stylesheet).toContain("[data-theme='dark'] .focus-highlight-task-item")
  })

  it('keeps default focus gray cards explicitly gray in dark theme', () => {
    expect(stylesheet).toContain("[data-theme='dark'] .focus-highlight.focus-neutral")
    expect(stylesheet).toContain("[data-theme='dark'] .focus-card.focus-neutral")
  })
})
