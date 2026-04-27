import { describe, expect, it } from 'vitest'
import {
  insertFolderBefore,
} from '../src/features/materials/materialsState'

describe('materials folder ordering', () => {
  const folderOrder = ['剪映', 'Figma', 'Notion', '百度网盘']

  it('moves a long-pressed folder before the target folder', () => {
    expect(insertFolderBefore(folderOrder, '百度网盘', 'Figma')).toEqual([
      '剪映',
      '百度网盘',
      'Figma',
      'Notion',
    ])
  })

  it('inserts between folders without dropping other entries', () => {
    expect(insertFolderBefore(folderOrder, '剪映', '百度网盘')).toEqual([
      'Figma',
      'Notion',
      '剪映',
      '百度网盘',
    ])
  })

  it('keeps order unchanged for invalid targets', () => {
    expect(insertFolderBefore(folderOrder, '剪映', '不存在')).toEqual(folderOrder)
  })
})
