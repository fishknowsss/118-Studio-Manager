import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8')
const dashboardSource = readFileSync(new URL('../src/views/Dashboard.tsx', import.meta.url), 'utf8')

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

  it('keeps dashboard expanded panels lightweight while preserving close animations in anomaly mode', () => {
    const liteOverlaySection =
      stylesheet.match(/html\[data-easter-mode='konami'\] \.expand-panel-overlay--easter-lite\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(dashboardSource).toContain('const expandedPanelType = expandedPanel?.type')
    expect(dashboardSource).toContain('document.body.dataset.easterPanel = expandedPanelType')
    expect(dashboardSource).toContain('overlayClassName="expand-panel-overlay--easter-lite"')
    expect(dashboardSource).toContain('boxClassName="expand-panel-box--easter-lite"')
    expect(stylesheet).toMatch(/body\[data-easter-mode='konami'\]\[data-easter-panel\]\s+#app\[data-easter-mode='konami'\]::before,[\s\S]*display:\s*none;[\s\S]*animation:\s*none;/)
    expect(liteOverlaySection).toContain('backdrop-filter: none;')
    expect(liteOverlaySection).not.toContain('animation: none;')
    expect(stylesheet).toMatch(/html\[data-easter-mode='konami'\]\s+\.expand-panel-box--easter-lite\s*\{[\s\S]*animation:\s*none;/)
    expect(stylesheet).toMatch(/html\[data-easter-mode='konami'\]\s+\.expand-panel-box--easter-lite::after\s*\{[\s\S]*display:\s*none;/)
    expect(stylesheet).toMatch(/html\[data-easter-mode='konami'\]\s+\.expand-panel-box--easter-lite\s+\.task-item,[\s\S]*\.person-card,[\s\S]*\.project-card[\s\S]*contain:\s*paint;/)
    expect(stylesheet).toMatch(/html\[data-easter-mode='konami'\]\s+\.expand-panel-box--easter-lite\s+\.task-item:hover,[\s\S]*\.person-card:hover,[\s\S]*\.project-card:hover[\s\S]*box-shadow:\s*none;/)
    expect(stylesheet).not.toContain('.expand-panel-overlay:has(.view-tasks)')
    expect(stylesheet).not.toContain('content-visibility: auto')
  })
})
