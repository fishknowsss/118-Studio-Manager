import { expect, test, type Page } from '@playwright/test'

const DB_NAME = 'studio118db'
const DB_VERSION = 5
const STORE_NAMES = ['projects', 'tasks', 'people', 'logs', 'settings', 'leaveRecords', 'classSchedules']

async function seedScheduleData(page: Page) {
  await page.evaluate(
    async ({ dbName, dbVersion, storeNames }) => {
      const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const waitForTransaction = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })

      const db = await openDatabase()
      const transaction = db.transaction(storeNames, 'readwrite')
      for (const name of storeNames) transaction.objectStore(name).clear()

      const timestamp = new Date().toISOString()
      const people = [
        { id: 'person-a', name: '刘永元', gender: 'male', status: 'active', skills: [], notes: '', createdAt: timestamp, updatedAt: timestamp },
        { id: 'person-b', name: '孔云丽', gender: 'female', status: 'active', skills: [], notes: '', createdAt: timestamp, updatedAt: timestamp },
        { id: 'person-c', name: '陈怡盈', gender: 'female', status: 'active', skills: [], notes: '', createdAt: timestamp, updatedAt: timestamp },
      ]
      const schedules = [
        { id: 'schedule-a', personId: 'person-a', personName: '刘永元', courseName: '行业考察与分析', dayOfWeek: 1, startSection: 1, endSection: 5, weeksText: '1-16周', location: 'A101', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-b', personId: 'person-b', personName: '孔云丽', courseName: '用户研究与设计策略', dayOfWeek: 2, startSection: 1, endSection: 5, weeksText: '1-16周', location: 'B201', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-c', personId: 'person-c', personName: '陈怡盈', courseName: '原画基础', dayOfWeek: 2, startSection: 1, endSection: 5, weeksText: '1-16周', location: 'B202', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-d', personId: 'person-a', personName: '刘永元', courseName: '大学生就业与创业指导', dayOfWeek: 1, startSection: 6, endSection: 7, weeksText: '1-16周', location: 'C301', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-e', personId: 'person-b', personName: '孔云丽', courseName: '中国画', dayOfWeek: 1, startSection: 8, endSection: 9, weeksText: '1-16周', location: 'D401', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-f', personId: 'person-c', personName: '陈怡盈', courseName: '海报设计', dayOfWeek: 3, startSection: 10, endSection: 12, weeksText: '1-16周', location: 'E501', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-g', personId: 'person-a', personName: '刘永元', courseName: '社会性别学', dayOfWeek: 4, startSection: 6, endSection: 8, weeksText: '1-10周', location: 'F601', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
        { id: 'schedule-h', personId: 'person-b', personName: '孔云丽', courseName: '大学生音乐素质拓展', dayOfWeek: 4, startSection: 6, endSection: 8, weeksText: '2-10周', location: 'F602', teacher: '测试教师', createdAt: timestamp, updatedAt: timestamp },
      ]

      const peopleStore = transaction.objectStore('people')
      for (const person of people) peopleStore.put(person)

      const scheduleStore = transaction.objectStore('classSchedules')
      for (const schedule of schedules) scheduleStore.put(schedule)

      await waitForTransaction(transaction)
      db.close()
      localStorage.setItem('118sm.productivity.termStartDate', '2026-03-02')
    },
    { dbName: DB_NAME, dbVersion: DB_VERSION, storeNames: STORE_NAMES },
  )
}

async function openSeededProductivityPage(page: Page) {
  await page.goto('/#productivity')
  await expect(page.getByRole('heading', { name: '工效' })).toBeVisible()
  await seedScheduleData(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: '工效' })).toBeVisible()
  await page.getByRole('button', { name: '课表', exact: true }).click()
  await expect(page.locator('.weekly-schedule-grid')).toBeVisible()
}

test.describe('工效课表', () => {
  test('节次行十二等分，点击课程后以浮层显示明细', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 768 })
    await openSeededProductivityPage(page)

    const gridMetrics = await page.locator('.weekly-schedule-grid').evaluate((grid) => {
      const gridRect = grid.getBoundingClientRect()
      const labels = [...document.querySelectorAll<HTMLElement>('.schedule-section-label')]
      const rowHeights = labels.map((label) => label.getBoundingClientRect().height)
      const lastLabel = labels.at(-1)
      const lastLabelRect = lastLabel?.getBoundingClientRect()

      return {
        rowCount: labels.length,
        clientHeight: grid.clientHeight,
        scrollHeight: grid.scrollHeight,
        rowHeights,
        lastBottomDelta: lastLabelRect ? gridRect.bottom - lastLabelRect.bottom : null,
        templateRows: getComputedStyle(grid).gridTemplateRows,
      }
    })

    expect(gridMetrics.rowCount).toBe(12)
    expect(gridMetrics.scrollHeight).toBeLessThanOrEqual(gridMetrics.clientHeight + 2)
    expect(gridMetrics.lastBottomDelta).not.toBeNull()
    expect(gridMetrics.lastBottomDelta!).toBeGreaterThanOrEqual(0)
    expect(gridMetrics.lastBottomDelta!).toBeLessThanOrEqual(2)
    expect(Math.max(...gridMetrics.rowHeights) - Math.min(...gridMetrics.rowHeights)).toBeLessThanOrEqual(1)
    expect(gridMetrics.templateRows.split(' ')).toHaveLength(13)

    const conflictCard = page.locator('.schedule-conflict-card').first()
    const conflictFace = conflictCard.locator('.schedule-conflict-face')
    const conflictTitle = conflictCard.locator('.schedule-conflict-title')
    const conflictMembers = conflictCard.locator('.schedule-conflict-members')
    const selectionDetail = page.locator('.schedule-selection-detail')
    await expect(conflictCard).toBeVisible()
    await expect(conflictFace).toBeVisible()
    await expect(conflictTitle).toBeVisible()
    await expect(conflictMembers).toBeVisible()
    await expect(selectionDetail).toHaveCount(0)

    const conflictLayout = await conflictCard.evaluate((card) => {
      const face = card.querySelector<HTMLElement>('.schedule-conflict-face')
      const title = card.querySelector<HTMLElement>('.schedule-conflict-title')
      const members = card.querySelector<HTMLElement>('.schedule-conflict-members')
      if (!face || !title || !members) return null

      const cardRect = card.getBoundingClientRect()
      const faceRect = face.getBoundingClientRect()
      const titleRect = title.getBoundingClientRect()
      const membersRect = members.getBoundingClientRect()
      const cardCenterY = cardRect.top + cardRect.height / 2
      const textCenterY = (titleRect.top + membersRect.bottom) / 2

      return {
        faceTopDelta: Math.abs(faceRect.top - cardRect.top),
        faceLeftDelta: Math.abs(faceRect.left - cardRect.left),
        faceHeightDelta: Math.abs(faceRect.height - cardRect.height),
        faceWidthDelta: Math.abs(faceRect.width - cardRect.width),
        titleCenterXDelta: Math.abs((titleRect.left + titleRect.width / 2) - (cardRect.left + cardRect.width / 2)),
        membersCenterXDelta: Math.abs((membersRect.left + membersRect.width / 2) - (cardRect.left + cardRect.width / 2)),
        textCenterYDelta: Math.abs(textCenterY - cardCenterY),
      }
    })

    expect(conflictLayout).not.toBeNull()
    expect(conflictLayout!.faceTopDelta).toBeLessThanOrEqual(1)
    expect(conflictLayout!.faceLeftDelta).toBeLessThanOrEqual(1)
    expect(conflictLayout!.faceHeightDelta).toBeLessThanOrEqual(1)
    expect(conflictLayout!.faceWidthDelta).toBeLessThanOrEqual(1)
    expect(conflictLayout!.titleCenterXDelta).toBeLessThanOrEqual(2)
    expect(conflictLayout!.membersCenterXDelta).toBeLessThanOrEqual(2)
    expect(conflictLayout!.textCenterYDelta).toBeLessThanOrEqual(14)

    await conflictCard.click()
    await expect(selectionDetail).toBeVisible()
    await expect(selectionDetail).toContainText('重叠课程')
    await expect(selectionDetail).toContainText('1–5 节')
    await expect(conflictCard).toHaveAttribute('data-selected', 'true')
    await page.waitForTimeout(200)
    const anchoredDetail = await conflictCard.evaluate((card) => {
      const detail = document.querySelector<HTMLElement>('.schedule-selection-detail')
      if (!detail) return null
      const cardRect = card.getBoundingClientRect()
      const detailRect = detail.getBoundingClientRect()

      return {
        topDelta: detailRect.top - cardRect.bottom,
        leftDelta: Math.abs(detailRect.left - cardRect.left),
      }
    })
    expect(anchoredDetail).not.toBeNull()
    expect(anchoredDetail!.topDelta).toBeGreaterThanOrEqual(5)
    expect(anchoredDetail!.topDelta).toBeLessThanOrEqual(12)
    expect(anchoredDetail!.leftDelta).toBeLessThanOrEqual(2)

    await conflictCard.click()
    await expect(selectionDetail).toHaveCount(0)

    await conflictCard.click()
    await expect(selectionDetail).toBeVisible()
    await page.locator('.schedule-cell').last().click()
    await expect(selectionDetail).toHaveCount(0)

    const middleConflictCard = page.locator('.schedule-conflict-card[aria-label*="6 至 8"]').first()
    await middleConflictCard.click()
    await expect(selectionDetail).toBeVisible()
    await expect(selectionDetail).toHaveAttribute('data-side', 'top')
    const middleDetailBounds = await page.locator('.productivity-schedule-shell').evaluate((shell) => {
      const detail = document.querySelector<HTMLElement>('.schedule-selection-detail')
      if (!detail) return null
      const shellRect = shell.getBoundingClientRect()
      const detailRect = detail.getBoundingClientRect()

      return {
        topDelta: detailRect.top - shellRect.top,
        bottomDelta: shellRect.bottom - detailRect.bottom,
      }
    })
    expect(middleDetailBounds).not.toBeNull()
    expect(middleDetailBounds!.topDelta).toBeGreaterThanOrEqual(0)
    expect(middleDetailBounds!.bottomDelta).toBeGreaterThanOrEqual(0)
  })
})
