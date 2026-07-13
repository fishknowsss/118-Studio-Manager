// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../src/components/feedback/ToastProvider'
import { DashboardHeader } from '../src/features/dashboard/DashboardHeader'
import { ClientBriefDialog } from '../src/features/materials/ClientBriefDialog'

function renderNode(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<ToastProvider>{node}</ToastProvider>))
  return () => {
    act(() => root.unmount())
    container.remove()
  }
}

function fill(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('URL entry validation', () => {
  it('keeps the dashboard resource editor open for an invalid URL', () => {
    const cleanup = renderNode(
      <DashboardHeader
        model={{ dateText: '7月13日', weekdayText: '2026 · 星期一' }}
        searchQuery=""
        searchResults={[]}
        onSearchQueryChange={() => undefined}
        onSearchSelect={() => undefined}
      />,
    )

    act(() => document.querySelector<HTMLButtonElement>('[aria-label="总资料"]')?.click())
    fill(document.querySelector<HTMLInputElement>('#home-resource-url')!, 'javascript:alert(1)')
    act(() => document.querySelector<HTMLButtonElement>('.dash-resource-actions .btn-primary')?.click())

    expect(document.querySelector('#home-resource-url')).not.toBeNull()
    expect(document.querySelector('.toast')?.textContent).toBe('请输入有效的网页链接')
    cleanup()
  })

  it('does not silently discard an invalid reference link', () => {
    const onSave = vi.fn()
    const cleanup = renderNode(
      <ClientBriefDialog
        brief={null}
        projectOptions={[]}
        onSave={onSave}
        onClose={() => undefined}
      />,
    )

    fill(document.querySelector<HTMLInputElement>('#brief-client')!, '测试甲方')
    fill(document.querySelector<HTMLTextAreaElement>('#brief-requirements')!, '测试需求')
    act(() => Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('添加'))?.click())
    fill(document.querySelector<HTMLInputElement>('.brief-ref-label')!, '参考资料')
    fill(document.querySelector<HTMLInputElement>('.brief-ref-url')!, 'data:text/html,unsafe')
    act(() => Array.from(document.querySelectorAll<HTMLButtonElement>('.modal-footer button'))
      .find((button) => button.textContent === '创建')?.click())

    expect(onSave).not.toHaveBeenCalled()
    expect(document.querySelector('.toast')?.textContent).toBe('请输入有效的参考链接')
    cleanup()
  })
})
