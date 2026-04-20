import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8')

describe('konami anomaly style coverage', () => {
  const entryFlashSection =
    stylesheet.match(/html\[data-easter-mode='konami'\] \.konami-entry-flash[\s\S]*?(?=html\[data-easter-mode='konami'\] \.person-gender-avatar\.male)/)?.[0] ?? ''

  it('applies anomaly root tokens to html and body instead of only the app shell', () => {
    expect(stylesheet).toMatch(/html\[data-easter-mode='konami'\],\s*body\[data-easter-mode='konami'\]\s*\{/)
  })

  it('covers overlays and portal panels that render outside #app', () => {
    expect(stylesheet).toContain("#app[data-easter-mode='konami']::after")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .expand-panel-overlay")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .expand-panel-box")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .acc-fan-panel")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .dialog-backdrop")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .modal-inner")
    expect(stylesheet).toContain("html[data-easter-mode='konami'] .leave-dialog")
    expect(stylesheet).toContain('@keyframes konamiSmearDrift')
  })

  it('keeps the brand wordmark on one line in anomaly mode', () => {
    expect(stylesheet).toMatch(/\.brand-chaos\s*\{[\s\S]*white-space:\s*nowrap;/)
  })

  it('uses a deconstructed backdrop dissolve for the entry flash instead of plain fade', () => {
    expect(stylesheet).toContain('.konami-entry-flash-backdrop::after')
    expect(stylesheet).toContain('@keyframes konamiEntryBackdropDissolve')
    expect(stylesheet).toContain('@keyframes konamiEntryDataScatter')
    expect(stylesheet).toContain('@keyframes konamiEntryTextDissolve')
  })

  it('keeps the entry flash on compositor-friendly motion properties', () => {
    expect(entryFlashSection).toContain('will-change: opacity, transform')
    expect(entryFlashSection).not.toContain('background-position:')
    expect(entryFlashSection).not.toContain('saturate(')
    expect(entryFlashSection).not.toContain('brightness(')
  })
})
