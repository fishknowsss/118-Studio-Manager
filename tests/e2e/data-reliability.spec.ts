import { expect, test } from '@playwright/test'

test('事务在请求成功后中止时，不报告保存成功也不更新内存', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '首页', exact: true })).toBeVisible()
  const result = await page.evaluate(async () => {
    const { store } = await import('/src/legacy/store.ts')
    const { db } = await import('/src/legacy/db.ts')
    const original = IDBObjectStore.prototype.put
    try {
      IDBObjectStore.prototype.put = function (value, key) {
        const request = key === undefined ? original.call(this, value) : original.call(this, value, key)
        if (this.name === 'projects' && value.id === 'transaction-abort') {
          request.addEventListener('success', () => this.transaction.abort())
        }
        return request
      }
      let error = ''
      try {
        await store.saveProject({ id: 'transaction-abort', name: '中止写入', status: 'active' })
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause)
      }
      return { error, memory: !!store.getProject('transaction-abort'), database: !!(await db.get('projects', 'transaction-abort')) }
    } finally {
      IDBObjectStore.prototype.put = original
    }
  })
  expect(result.error).not.toBe('')
  expect(result.memory).toBe(false)
  expect(result.database).toBe(false)
})

test('资料写入失败时保留编辑内容并允许重试', async ({ page }) => {
  await page.goto('/#materials')
  await expect(page.getByRole('heading', { name: '资料', exact: true })).toBeVisible()
  await page.evaluate(async () => {
    const { db } = await import('/src/legacy/db.ts')
    const put = db.put
    let rejected = false
    db.put = async (...args: Parameters<typeof put>) => {
      if (!rejected && args[0] === 'settings') {
        rejected = true
        throw new Error('测试写入失败')
      }
      return put(...args)
    }
  })
  await page.getByRole('button', { name: '新建要求', exact: true }).click()
  await page.locator('#brief-client').fill('可靠保存测试')
  await page.locator('#brief-requirements').fill('失败后保留输入')
  const dialog = page.getByRole('dialog', { name: '新建甲方要求' })
  await dialog.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('.toast.error')).toContainText('保存失败')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#brief-client')).toHaveValue('可靠保存测试')
  await dialog.getByRole('button', { name: '创建', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('可靠保存测试', { exact: true })).toBeVisible()
})

test('其他标签页变更刷新业务内存和设置，并使旧撤回历史失效', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '首页', exact: true })).toBeVisible()
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('button', { name: '首页', exact: true })).toBeVisible()
  await other.evaluate(async () => {
    const { pushUndoCheckpoint } = await import('/src/legacy/editUndo.ts')
    await pushUndoCheckpoint('其他页面更新前')
  })
  await page.evaluate(async () => {
    const { store } = await import('/src/legacy/store.ts')
    const { writeTermStartDate } = await import('/src/features/productivity/termSettings.ts')
    await store.saveProject({ id: 'cross-tab-project', name: '跨页面项目', status: 'active' })
    await writeTermStartDate('2026-09-07')
  })
  await expect.poll(() => other.evaluate(async () => {
    const { store } = await import('/src/legacy/store.ts')
    const { readTermStartDate } = await import('/src/features/productivity/termSettings.ts')
    const { getUndoHistoryState } = await import('/src/legacy/editUndo.ts')
    return [store.getProject('cross-tab-project')?.name, readTermStartDate(), getUndoHistoryState().count]
  })).toEqual(['跨页面项目', '2026-09-07', 0])
})

test('日程面板随打开期间的任务写入更新', async ({ page }) => {
  await page.clock.setFixedTime('2026-10-23T10:00:00+08:00')
  await page.goto('/')
  await expect(page.getByRole('button', { name: /^2026-10-23，/ })).toBeVisible()
  await page.getByRole('button', { name: /^2026-10-23，/ }).click()
  const taskCount = page.locator('.planner-stat').filter({ hasText: '当天任务' }).locator('.planner-stat-num')
  const previous = Number(await taskCount.textContent())
  await page.evaluate(async () => {
    const { store } = await import('/src/legacy/store.ts')
    await store.saveTask({ id: 'planner-live-task', title: '面板更新测试', status: 'todo', scheduledDate: '2026-10-23', assigneeIds: [] })
  })
  await expect(taskCount).toHaveText(String(previous + 1))
  await expect(page.locator('.planner-body').getByText('面板更新测试', { exact: true })).toBeVisible()
})

test('语句管理使用完整弹窗键盘行为，桌面首页没有内部裁切', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const launcher = page.getByRole('button', { name: '管理语句', exact: true })
  await launcher.focus()
  await launcher.click()
  const dialog = page.getByRole('dialog', { name: '语句管理', exact: true })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(launcher).toBeFocused()
  const bounds = await page.locator('.dash-bottom').boundingBox()
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1441)
})


test('移动端导航保留名称，浅深主题没有装饰性粗侧边框', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: '首页', exact: true })).toBeVisible()
  for (const mode of ['深色模式', '浅色模式']) {
    await expect(page.getByRole('button', { name: '设置', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible()
    await page.getByRole('button', { name: mode, exact: true }).click()
    expect(await page.locator('.task-row').first().evaluate((element) => {
      const style = getComputedStyle(element)
      return Math.max(parseFloat(style.borderLeftWidth), parseFloat(style.borderRightWidth))
    })).toBeLessThanOrEqual(1)
  }
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByRole('heading', { name: '设置与备份' })).toBeVisible()
})
