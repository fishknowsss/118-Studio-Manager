import { describe, expect, it } from 'vitest'
import {
  orderFoldersByCount,
} from '../src/features/materials/materialsState'

function createCounts(entries: Array<[string, number]>) {
  return new Map<string, number>(entries)
}

describe('materials folder ordering', () => {
  const folderOrder = ['剪映', 'Figma', 'Notion', '百度网盘']

  it('orders folders by account count descending', () => {
    expect(orderFoldersByCount(
      folderOrder,
      createCounts([
        ['剪映', 2],
        ['Figma', 1],
        ['Notion', 5],
        ['百度网盘', 3],
      ]),
    )).toEqual(['Notion', '百度网盘', '剪映', 'Figma'])
  })

  it('keeps current folder order when counts are tied', () => {
    expect(orderFoldersByCount(
      folderOrder,
      createCounts([
        ['剪映', 2],
        ['Figma', 2],
        ['Notion', 5],
        ['百度网盘', 2],
      ]),
    )).toEqual(['Notion', '剪映', 'Figma', '百度网盘'])
  })

  it('keeps empty folders after folders with accounts', () => {
    expect(orderFoldersByCount(
      folderOrder,
      createCounts([
        ['剪映', 0],
        ['Figma', 1],
        ['Notion', 0],
        ['百度网盘', 3],
      ]),
    )).toEqual(['百度网盘', 'Figma', '剪映', 'Notion'])
  })
})
