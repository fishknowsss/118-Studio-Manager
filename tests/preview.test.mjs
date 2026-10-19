import assert from 'node:assert/strict'
import test from 'node:test'
import { preview } from 'vite'

test('production preview serves every local script and stylesheet referenced by its entry page', async (t) => {
  const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
  t.after(() => new Promise((resolve, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolve())
  }))

  const url = server.resolvedUrls.local[0]
  const response = await fetch(url)
  assert.equal(response.status, 200)
  const html = await response.text()
  const assets = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map((match) => match[1])
  assert.ok(assets.length > 0, 'entry page must reference built assets')

  for (const asset of assets) {
    const resource = await fetch(new URL(asset, url))
    assert.equal(resource.status, 200, `preview must serve ${asset}`)
    assert.match(resource.headers.get('content-type') || '', /javascript|css/, `asset must not fall back to HTML: ${asset}`)
  }
})
