import { describe, expect, it } from 'vitest'
import { normalizeExternalHttpUrl } from '../src/legacy/utils'

describe('external URL safety', () => {
  it('normalizes ordinary web addresses to HTTP(S) URLs', () => {
    expect(normalizeExternalHttpUrl(' example.com/path ')).toBe('https://example.com/path')
    expect(normalizeExternalHttpUrl('example.com:8080/path')).toBe('https://example.com:8080/path')
    expect(normalizeExternalHttpUrl('localhost:8080/test')).toBe('https://localhost:8080/test')
    expect(normalizeExternalHttpUrl('127.0.0.1:8080/test')).toBe('https://127.0.0.1:8080/test')
    expect(normalizeExternalHttpUrl('http://localhost:5173/test')).toBe('http://localhost:5173/test')
  })

  it('rejects active or malformed URL schemes', () => {
    expect(normalizeExternalHttpUrl('javascript:alert(1)')).toBe('')
    expect(normalizeExternalHttpUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(normalizeExternalHttpUrl('file:///tmp/private.txt')).toBe('')
    expect(normalizeExternalHttpUrl('https://')).toBe('')
  })
})
