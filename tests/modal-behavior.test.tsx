// @vitest-environment jsdom

import { StrictMode, useState } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ConfirmProvider, useConfirm } from '../src/components/feedback/ConfirmProvider'
import { ContextMenu } from '../src/components/ui/ContextMenu'
import { Dialog } from '../src/components/ui/Dialog'
import { DatePicker } from '../src/components/ui/DatePicker'
import { ExpandPanel } from '../src/components/ui/ExpandPanel'

function renderNode(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(node))
  return {
    container,
    cleanup() {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function DialogHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开弹窗</button>
      <Dialog
        open={open}
        title="编辑资料"
        onClose={() => setOpen(false)}
        footer={<button type="button">保存</button>}
      >
        <label>名称<input aria-label="名称" /></label>
      </Dialog>
    </>
  )
}

function ConcurrentConfirmHarness() {
  const { confirm } = useConfirm()
  const [result, setResult] = useState('等待')

  const openTwo = async () => {
    const first = confirm('第一次确认', '第一条')
    const second = confirm('第二次确认', '第二条')
    const values = await Promise.all([first, second])
    setResult(values.join(','))
  }

  return (
    <>
      <button type="button" onClick={() => void openTwo()}>连续确认</button>
      <output>{result}</output>
    </>
  )
}

function NestedOverlayHarness() {
  const { confirm } = useConfirm()
  const [expanded, setExpanded] = useState(true)

  return expanded ? (
    <ExpandPanel originX={100} originY={100} title="人员详情" onClose={() => setExpanded(false)}>
      <button type="button" onClick={() => void confirm('确认删除', '删除后无法恢复')}>删除</button>
    </ExpandPanel>
  ) : <output>面板已关闭</output>
}

function ExpandFocusFallbackHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>展开面板</button>
      {open ? (
        <ExpandPanel originX={100} originY={100} title="测试面板" onClose={() => setOpen(false)}>
          <button type="button">面板操作</button>
        </ExpandPanel>
      ) : null}
    </>
  )
}

function DatePickerDialogHarness() {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState<string | null>('2026-07-13')
  return (
    <>
      <Dialog open={open} title="编辑任务" onClose={() => setOpen(false)}>
        <DatePicker id="task-date" label="截止日期" value={value} onChange={setValue} />
      </Dialog>
      {!open ? <output>表单已关闭</output> : null}
    </>
  )
}

function ContextMenuHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开菜单</button>
      <ContextMenu
        open={open}
        x={80}
        y={80}
        items={[{ key: 'edit', label: '编辑', onSelect: () => undefined }]}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

describe('modal behavior', () => {
  it('keeps focus in a dialog and restores it after Escape', async () => {
    const view = renderNode(<StrictMode><DialogHarness /></StrictMode>)
    const opener = view.container.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    act(() => opener.click())

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.contains(document.activeElement)).toBe(true)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)

    view.cleanup()
  })

  it('settles both promises when a second confirmation replaces the first', async () => {
    const view = renderNode(
      <ConfirmProvider>
        <ConcurrentConfirmHarness />
      </ConfirmProvider>,
    )
    const opener = view.container.querySelector<HTMLButtonElement>('button')!

    act(() => opener.click())
    expect(document.querySelector('[role="alertdialog"]')?.getAttribute('aria-label')).toBe('第二次确认')

    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent === '取消')!
    await act(async () => {
      cancel.click()
      await Promise.resolve()
    })
    expect(view.container.querySelector('output')?.textContent).toBe('false,false')

    view.cleanup()
  })

  it('closes only the top overlay when Escape is pressed', async () => {
    const view = renderNode(
      <ConfirmProvider>
        <NestedOverlayHarness />
      </ConfirmProvider>,
    )
    const deleteButton = view.container.querySelector<HTMLButtonElement>('.expand-panel-body button')!
    act(() => deleteButton.click())

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
    })

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(view.container.querySelector('[aria-label="人员详情"]')).not.toBeNull()
    expect(view.container.querySelector('output')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    view.cleanup()
    expect(document.body.style.overflow).toBe('')
  })

  it('restores the opener under the animation origin when pointer activation leaves focus on the page', async () => {
    const view = renderNode(<StrictMode><ExpandFocusFallbackHarness /></StrictMode>)
    const opener = view.container.querySelector<HTMLButtonElement>('button')!
    const originalElementsFromPoint = document.elementsFromPoint
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [opener],
    })
    document.body.tabIndex = -1
    document.body.focus()

    act(() => opener.click())
    expect(document.querySelector('[aria-label="测试面板"]')).not.toBeNull()

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })

    expect(document.querySelector('[aria-label="测试面板"]')).toBeNull()
    expect(document.activeElement).toBe(opener)

    view.cleanup()
    document.body.removeAttribute('tabindex')
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    })
  })

  it('restores context-menu focus in Strict Mode', async () => {
    const view = renderNode(<StrictMode><ContextMenuHarness /></StrictMode>)
    const opener = view.container.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    act(() => opener.click())
    expect(document.querySelector('[role="menu"]')?.contains(document.activeElement)).toBe(true)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })

    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    view.cleanup()
  })

  it('keeps a portal date picker above its dialog and restores trigger focus', async () => {
    const view = renderNode(<DatePickerDialogHarness />)
    const trigger = document.querySelector<HTMLButtonElement>('[aria-label="截止日期"]')!
    act(() => trigger.click())
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })

    expect(document.querySelector('.date-picker-popover')).not.toBeNull()
    expect(document.activeElement?.classList.contains('date-picker-day')).toBe(true)

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })

    expect(document.querySelector('.date-picker-popover')).toBeNull()
    expect(document.querySelector('[aria-label="编辑任务"]')).not.toBeNull()
    expect(view.container.querySelector('output')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    view.cleanup()
  })
})
