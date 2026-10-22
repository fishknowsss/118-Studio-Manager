// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('持久化可靠性', () => {
  it('写入失败时向调用方和等待者传递错误，保留旧值，并允许重试', async () => {
    const put = vi.fn().mockRejectedValueOnce(new Error('空间不足')).mockResolvedValue(undefined)
    vi.doMock('../src/legacy/db', () => ({ db: { put } }))
    const { createSyncableSettingsStore, waitForSyncableSettingsWrites } = await import('../src/features/persistence/syncableSettings')
    const settings = createSyncableSettingsStore({ key: 'test:settings', emptyValue: '旧值', sanitize: String })
    const onError = vi.fn()
    document.addEventListener('persistenceError', onError)
    try {
      const write = settings.write('新值')
      const waiting = waitForSyncableSettingsWrites()
      await expect(write).rejects.toThrow('空间不足')
      await expect(waiting).rejects.toThrow('空间不足')
      expect(settings.read()).toBe('旧值')
      expect(onError).toHaveBeenCalledTimes(1)
      await settings.write('重试值')
      expect(settings.read()).toBe('重试值')
    } finally {
      document.removeEventListener('persistenceError', onError)
    }
  })

  it('迁移未编码的旧学期日期，并在外部恢复后重新读取基准', async () => {
    let record: { key: string; value: string } | undefined
    const put = vi.fn(async (_store: string, next: typeof record) => { record = next })
    vi.doMock('../src/legacy/db', () => ({ db: { get: vi.fn(async () => record), put } }))
    localStorage.setItem('118sm.productivity.termStartDate', '2026-09-07')
    const term = await import('../src/features/productivity/termSettings')
    await term.initializeTermSettings()
    expect(term.readTermStartDate()).toBe('2026-09-07')
    expect(record?.key).toBe('productivity:term-start-date')
    expect(localStorage.getItem('118sm.productivity.termStartDate')).toBeNull()
    await term.writeTermStartDate('2027-03-01')
    expect(record?.value).toBe('2027-03-01')
    record = { key: 'productivity:term-start-date', value: '2026-09-14' }
    await term.reloadTermSettingsFromDB()
    expect(term.readTermStartDate()).toBe('2026-09-14')
  })
})
