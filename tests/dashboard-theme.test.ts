import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8')

describe('dashboard dark theme styles', () => {
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
