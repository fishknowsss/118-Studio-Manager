import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('demo data seed', () => {
  it('uses production-focused video and short-drama sample projects', () => {
    const source = readFileSync(join(process.cwd(), 'src/legacy/bootstrap.ts'), 'utf8')
    const seedBody = source.slice(source.indexOf('async function seedDemoData()'))

    expect(source).toContain("DEMO_DATA_VERSION = 'studio-production-v2'")
    expect(source).toContain('短剧《微光便利店》01-12 集后期统筹')
    expect(source).toContain('城市文旅品牌片 60s 主片与 15s 短版')
    expect(source).toContain('毕业展互动装置记录片与现场快剪')
    expect(source).toContain('品牌账号七月内容矩阵 12 条短视频')
    expect(source).toContain('startDate:')
    expect(source).toContain('reviewDate:')
    expect(source).toContain('deliveryDate:')
    expect(source).toContain('isLegacyDemoSnapshot')
    expect(seedBody).not.toContain('线下活动视觉设计')
    expect(seedBody).not.toContain('社交媒体内容 · 4月')
  })
})
