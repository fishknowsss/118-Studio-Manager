import { describe, expect, it, vi } from 'vitest'
import worker from '../cloudflare/sync-worker/src/index.js'
import { buildBackupPayload } from '../src/legacy/utils'

const ALLOWED_ORIGIN = 'https://app.example.com'

function createEnv() {
  let storedValue: string | null = null
  const get = vi.fn(async () => storedValue)
  const put = vi.fn(async (_key: string, value: string) => {
    storedValue = value
  })

  return {
    env: {
      ALLOWED_ORIGIN,
      SYNC_DATA: { get, put },
    },
    get,
    put,
  }
}

function createWriteRequest(payload: unknown, origin = ALLOWED_ORIGIN, method = 'POST') {
  return new Request('https://sync.example.com/data', {
    method,
    headers: {
      'Content-Type': 'text/plain',
      Origin: origin,
    },
    body: JSON.stringify({ payload, source: 'manual' }),
  })
}

describe('sync worker', () => {
  it('rejects writes from a foreign browser origin before touching KV', async () => {
    const { env, put } = createEnv()

    const response = await worker.fetch(
      createWriteRequest(buildBackupPayload({ projects: [{ id: 'project-1' }] }), 'https://evil.example'),
      env,
    )

    expect(response.status).toBe(403)
    expect(put).not.toHaveBeenCalled()
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('rejects writes that omit the browser origin', async () => {
    const { env, put } = createEnv()
    const response = await worker.fetch(new Request('https://sync.example.com/data', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        payload: buildBackupPayload({ projects: [{ id: 'project-1' }] }),
        source: 'manual',
      }),
    }), env)

    expect(response.status).toBe(403)
    expect(put).not.toHaveBeenCalled()
  })

  it('stores a complete current snapshot from the configured origin', async () => {
    const { env, put } = createEnv()

    const response = await worker.fetch(
      createWriteRequest(buildBackupPayload({ projects: [{ id: 'project-1' }] })),
      env,
    )

    expect(response.status).toBe(200)
    expect(put).toHaveBeenCalledTimes(1)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)
  })

  it('accepts an allowed preflight and PUT snapshot', async () => {
    const { env, put } = createEnv()
    const preflight = await worker.fetch(new Request('https://sync.example.com/data', {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    }), env)
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN)

    const response = await worker.fetch(
      createWriteRequest(buildBackupPayload({ projects: [{ id: 'project-1' }] }), ALLOWED_ORIGIN, 'PUT'),
      env,
    )
    expect(response.status).toBe(200)
    expect(put).toHaveBeenCalledTimes(1)
  })

  it('rejects an unknown sync source', async () => {
    const { env, put } = createEnv()
    const response = await worker.fetch(new Request('https://sync.example.com/data', {
      method: 'POST',
      headers: { Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({
        payload: buildBackupPayload({ projects: [{ id: 'project-1' }] }),
        source: 'background',
      }),
    }), env)

    expect(response.status).toBe(400)
    expect(put).not.toHaveBeenCalled()
  })

  it('rejects a partial current-schema snapshot', async () => {
    const { env, put } = createEnv()
    const partial = buildBackupPayload({ projects: [{ id: 'project-1' }] }) as Record<string, unknown>
    delete partial.settings

    const response = await worker.fetch(createWriteRequest(partial), env)

    expect(response.status).toBe(400)
    expect(put).not.toHaveBeenCalled()
  })

  it('rejects request bodies larger than the snapshot limit', async () => {
    const { env, put } = createEnv()
    const response = await worker.fetch(new Request('https://sync.example.com/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Origin: ALLOWED_ORIGIN,
      },
      body: 'x'.repeat(5 * 1024 * 1024 + 1),
    }), env)

    expect(response.status).toBe(413)
    expect(put).not.toHaveBeenCalled()
  })

  it('returns a structured error when KV cannot be read', async () => {
    const { env } = createEnv()
    env.SYNC_DATA.get.mockRejectedValueOnce(new Error('KV unavailable'))

    const response = await worker.fetch(new Request('https://sync.example.com/meta'), env)

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    await expect(response.json()).resolves.toEqual({ error: '云端同步暂时不可用' })
  })

  it('returns a structured error when KV cannot be written', async () => {
    const { env } = createEnv()
    env.SYNC_DATA.put.mockRejectedValueOnce(new Error('KV unavailable'))

    const response = await worker.fetch(
      createWriteRequest(buildBackupPayload({ projects: [{ id: 'project-1' }] })),
      env,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: '云端同步暂时不可用' })
  })
})
