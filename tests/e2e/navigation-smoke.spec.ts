import { expect, test } from '@playwright/test'

test('侧栏页面可以连续打开且没有运行时错误', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  await page.goto('/#dashboard')
  await expect(page.getByRole('button', { name: '首页' })).toBeVisible()

  for (const [navigationLabel, heading] of [
    ['资料', '资料'],
    ['工效', '工效'],
    ['短剧', '短剧'],
    ['图谱', '图谱'],
    ['工具', '工具'],
    ['设置', '设置与备份'],
  ] as const) {
    await page.getByRole('button', { name: navigationLabel, exact: true }).click()
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()

    if (navigationLabel === '图谱') {
      const currentNode = page.locator('.graph-node-group[tabindex="0"]')
      await expect(currentNode).toHaveCount(1)
      await currentNode.focus()
      const currentNodeId = await currentNode.getAttribute('data-graph-node-id')
      await currentNode.press('ArrowRight')
      const focusedNode = page.locator('.graph-node-group:focus')
      await expect(focusedNode).toBeVisible()
      await expect.poll(() => focusedNode.getAttribute('data-graph-node-id')).not.toBe(currentNodeId)
      await expect(page.locator('.graph-node-group[tabindex="0"]')).toHaveCount(1)
    }
  }

  expect(runtimeErrors).toEqual([])
})

test('移动端首页与展开面板不溢出并恢复键盘焦点', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#dashboard')
  await expect(page.getByRole('button', { name: '首页' })).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391)

  const peoplePanel = page.locator('.people-panel-body').locator('..')
  const expandButton = peoplePanel.getByRole('button', { name: '展开全部', exact: true })
  await expandButton.click()

  const dialog = page.getByRole('dialog', { name: '团队成员' })
  await expect(dialog).toBeVisible()
  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width }
  })
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(390)
  expect(bounds.width).toBeLessThanOrEqual(366)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(expandButton).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

  const projectFocusButton = page.locator('.focus-section-header')
  await projectFocusButton.click()
  const projectsDialog = page.getByRole('dialog', { name: '所有项目' })
  await expect(projectsDialog).toBeVisible()

  const projectToolbarLayout = await projectsDialog.evaluate((element) => {
    const dialogRect = element.getBoundingClientRect()
    const header = element.querySelector<HTMLElement>('.view-header')
    const body = element.querySelector<HTMLElement>('.view-body')
    const controls = Array.from(element.querySelectorAll<HTMLElement>(
      '.project-overview-toolbar .filter-input, .project-overview-toolbar .filter-select, .view-actions > .btn',
    ))
    const headerRect = header?.getBoundingClientRect()
    const bodyRect = body?.getBoundingClientRect()

    return {
      dialogClientWidth: element.clientWidth,
      dialogScrollWidth: element.scrollWidth,
      controlsInsideHeader: Boolean(headerRect) && controls.every((control) => {
        const rect = control.getBoundingClientRect()
        return rect.top >= headerRect!.top && rect.bottom <= headerRect!.bottom
      }),
      controlsInside: controls.every((control) => {
        const rect = control.getBoundingClientRect()
        return rect.left >= dialogRect.left && rect.right <= dialogRect.right
      }),
      headerClearsBody: Boolean(headerRect && bodyRect && headerRect.bottom <= bodyRect.top + 1),
    }
  })

  expect(projectToolbarLayout.dialogScrollWidth).toBeLessThanOrEqual(projectToolbarLayout.dialogClientWidth + 1)
  expect(projectToolbarLayout.controlsInside).toBe(true)
  expect(projectToolbarLayout.controlsInsideHeader).toBe(true)
  expect(projectToolbarLayout.headerClearsBody).toBe(true)

  await page.keyboard.press('Escape')
  await expect(projectsDialog).toHaveCount(0)
})

test('宽屏矮窗口保持首页比例并完整显示迷你日历', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 650 })
  await page.goto('/#dashboard')
  await expect(page.locator('.project-focus-timeline')).toBeVisible()

  const layout = await page.evaluate(() => {
    const focus = document.querySelector<HTMLElement>('.today-focus')
    const bottom = document.querySelector<HTMLElement>('.dash-bottom')
    const calendar = document.querySelector<HTMLElement>('.dash-right')
    const footer = document.querySelector<HTMLElement>('.mini-cal-footer')
    const days = Array.from(document.querySelectorAll<HTMLElement>('.mini-cal-day'))

    if (!focus || !bottom || !calendar || !footer || days.length === 0) {
      throw new Error('首页布局节点不完整')
    }

    const calendarRect = calendar.getBoundingClientRect()
    const footerRect = footer.getBoundingClientRect()

    return {
      focusHeight: focus.getBoundingClientRect().height,
      bottomHeight: bottom.getBoundingClientRect().height,
      shortestDay: Math.min(...days.map((day) => day.getBoundingClientRect().height)),
      footerBottom: footerRect.bottom,
      calendarBottom: calendarRect.bottom,
    }
  })

  expect(layout.focusHeight).toBeLessThanOrEqual(241)
  expect(layout.bottomHeight).toBeGreaterThanOrEqual(360)
  expect(layout.shortestDay).toBeGreaterThanOrEqual(28)
  expect(layout.footerBottom).toBeLessThanOrEqual(layout.calendarBottom)
})

test('宽屏常规窗口无需缩放即可显示完整日历和技能名称', async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 849 })
  await page.goto('/#dashboard')
  await expect(page.locator('.mini-cal-footer')).toBeVisible()

  const layout = await page.evaluate(() => {
    const focus = document.querySelector<HTMLElement>('.today-focus')
    const calendar = document.querySelector<HTMLElement>('.dash-right')
    const footer = document.querySelector<HTMLElement>('.mini-cal-footer')
    const skillTags = Array.from(document.querySelectorAll<HTMLElement>('.person-assignment-skill-list .skill-tag'))

    if (!focus || !calendar || !footer || skillTags.length === 0) {
      throw new Error('首页日历或人员技能节点不完整')
    }

    return {
      focusHeight: focus.getBoundingClientRect().height,
      calendarBottom: calendar.getBoundingClientRect().bottom,
      calendarScrollHeight: calendar.scrollHeight,
      calendarClientHeight: calendar.clientHeight,
      footerBottom: footer.getBoundingClientRect().bottom,
      skillWhiteSpaces: skillTags.map((tag) => getComputedStyle(tag).whiteSpace),
    }
  })

  expect(layout.focusHeight).toBeGreaterThanOrEqual(292)
  expect(layout.focusHeight).toBeLessThanOrEqual(305)
  expect(layout.footerBottom).toBeLessThanOrEqual(layout.calendarBottom)
  expect(layout.calendarScrollHeight).toBeLessThanOrEqual(layout.calendarClientHeight + 1)
  expect(layout.skillWhiteSpaces.every((whiteSpace) => whiteSpace === 'normal')).toBe(true)
})

test('首页语句固定为两行且侧栏品牌分隔线与顶栏对齐', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.999999
  })

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1366, height: 650 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/#dashboard')
    await expect(page.locator('.dash-quote-src')).toBeVisible()

    const layout = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.dash-header')
      const brand = document.querySelector<HTMLElement>('.sidebar-brand')
      const block = document.querySelector<HTMLElement>('.dash-quote-block')
      const line = document.querySelector<HTMLElement>('.dash-quote-line')
      const text = document.querySelector<HTMLElement>('.dash-quote-text')
      const source = document.querySelector<HTMLElement>('.dash-quote-src')
      const motivation = document.querySelector<HTMLElement>('.dash-motivation')

      if (!header || !brand || !block || !line || !text || !source || !motivation) {
        throw new Error('首页语句或顶栏节点不完整')
      }

      const headerRect = header.getBoundingClientRect()
      const brandRect = brand.getBoundingClientRect()
      const blockRect = block.getBoundingClientRect()
      const lineRect = line.getBoundingClientRect()
      const textRect = text.getBoundingClientRect()
      const sourceRect = source.getBoundingClientRect()
      const motivationRect = motivation.getBoundingClientRect()

      return {
        headerClientHeight: header.clientHeight,
        headerScrollHeight: header.scrollHeight,
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        brandBottom: brandRect.bottom,
        brandVisible: getComputedStyle(brand).display !== 'none',
        blockTop: blockRect.top,
        blockBottom: blockRect.bottom,
        blockWidth: blockRect.width,
        lineHeight: lineRect.height,
        firstLineHeight: Math.max(textRect.height, sourceRect.height),
        textClientWidth: text.clientWidth,
        textScrollWidth: text.scrollWidth,
        motivationTop: motivationRect.top,
        firstLineBottom: lineRect.bottom,
        textWhiteSpace: getComputedStyle(text).whiteSpace,
        sourceWhiteSpace: getComputedStyle(source).whiteSpace,
        motivationWhiteSpace: getComputedStyle(motivation).whiteSpace,
      }
    })

    expect(layout.headerScrollHeight).toBeLessThanOrEqual(layout.headerClientHeight)
    expect(layout.blockTop).toBeGreaterThanOrEqual(layout.headerTop)
    expect(layout.blockBottom).toBeLessThanOrEqual(layout.headerBottom)
    expect(layout.lineHeight).toBeLessThanOrEqual(layout.firstLineHeight + 1)
    expect(layout.motivationTop).toBeGreaterThanOrEqual(layout.firstLineBottom)
    expect(layout.textWhiteSpace).toBe('nowrap')
    expect(layout.sourceWhiteSpace).toBe('nowrap')
    expect(layout.motivationWhiteSpace).toBe('nowrap')
    if (viewport.width === 1440) {
      expect(layout.blockWidth).toBeGreaterThanOrEqual(680)
      expect(layout.textScrollWidth).toBeLessThanOrEqual(layout.textClientWidth)
    }
    if (layout.brandVisible) {
      expect(Math.abs(layout.brandBottom - layout.headerBottom)).toBeLessThanOrEqual(0.5)
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#dashboard')
  await page.locator('.dash-quote-block').hover()
  await page.getByRole('button', { name: '管理语句' }).click()
  const quoteManager = page.getByRole('dialog', { name: '语句管理' })
  await expect(quoteManager).toBeVisible()
  await quoteManager.getByRole('button', { name: '关闭' }).click()
  await expect(quoteManager).toHaveCount(0)
})

test('全部侧栏分页沿用首页顶栏分隔线基准', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 800, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/#dashboard')

    const dashboardBottom = await page.locator('.dash-header').evaluate((element) => (
      element.getBoundingClientRect().bottom
    ))

    for (const navigationLabel of ['资料', '工效', '短剧', '图谱', '工具', '设置']) {
      await page.getByRole('button', { name: navigationLabel, exact: true }).click()
      await expect(page.locator('.view-header')).toBeVisible()

      const layout = await page.evaluate(() => {
        const brand = document.querySelector<HTMLElement>('.sidebar-brand')
        const header = document.querySelector<HTMLElement>('.view-header')
        if (!brand || !header) throw new Error('侧栏品牌区或分页顶栏不存在')

        return {
          brandBottom: brand.getBoundingClientRect().bottom,
          headerBottom: header.getBoundingClientRect().bottom,
          headerClientHeight: header.clientHeight,
          headerScrollHeight: header.scrollHeight,
        }
      })

      expect(Math.abs(layout.brandBottom - dashboardBottom)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(layout.headerBottom - dashboardBottom)).toBeLessThanOrEqual(0.5)
      expect(layout.headerScrollHeight).toBeLessThanOrEqual(layout.headerClientHeight)
    }
  }
})
