import { describe, expect, it, vi } from 'vitest'
import { BUILTIN_QUOTE_MOTIVATION_PAIRS, pickQuoteSelection } from '../src/content/quotes'

describe('quote library', () => {
  it('keeps each built-in quote bound to its matching motivation', () => {
    BUILTIN_QUOTE_MOTIVATION_PAIRS.forEach((pair, index) => {
      vi.spyOn(Math, 'random').mockReturnValue(index / BUILTIN_QUOTE_MOTIVATION_PAIRS.length)

      expect(pickQuoteSelection([], [])).toEqual({
        quote: { text: pair.text, src: pair.src },
        motivation: pair.motivation,
      })

      vi.restoreAllMocks()
    })
  })

  it('contains the requested multilingual and philosophical entries', () => {
    const texts = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ text }) => text).join('\n')
    const sources = BUILTIN_QUOTE_MOTIVATION_PAIRS.map(({ src }) => src).join('\n')

    expect(texts).toContain('Non terrae plus ultra')
    expect(sources).toContain('尼采')
    expect(sources).toContain('黑格尔')
    expect(sources).toContain('拉康')
    expect(sources).toContain('维特根斯坦')
  })

  it('pairs custom entries by their shared order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)

    expect(pickQuoteSelection(
      [{ text: '自定义格言', src: '测试' }],
      ['对应激励语'],
    )).toEqual({
      quote: { text: '自定义格言', src: '测试' },
      motivation: '对应激励语',
    })

    vi.restoreAllMocks()
  })
})
