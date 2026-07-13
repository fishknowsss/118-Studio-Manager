import {
  getBackupPayloadValidationError,
} from '../../../src/legacy/utils.ts'

const SNAPSHOT_KEY = 'sync:current'
const MAX_SNAPSHOT_BODY_BYTES = 5 * 1024 * 1024

class PayloadTooLargeError extends Error {}

function isAllowedBrowserOrigin(request, env) {
  const origin = request.headers.get('Origin')
  if (!origin) return request.method === 'GET'
  return Boolean(env.ALLOWED_ORIGIN) && origin === env.ALLOWED_ORIGIN
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  }
  if (origin && origin === env.ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(data, request, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request, env),
  })
}

async function readCurrent(env) {
  const text = await env.SYNC_DATA.get(SNAPSHOT_KEY)
  return text ? JSON.parse(text) : null
}

async function readJsonBody(request) {
  const declaredSize = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_SNAPSHOT_BODY_BYTES) {
    throw new PayloadTooLargeError()
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BODY_BYTES) {
    throw new PayloadTooLargeError()
  }
  return text ? JSON.parse(text) : null
}

async function handleRequest(request, env) {
  const url = new URL(request.url)

  if (!isAllowedBrowserOrigin(request, env)) {
    return json({ error: '请求来源无效' }, request, env, 403)
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request, env),
    })
  }

  if (url.pathname === '/meta' && request.method === 'GET') {
    const current = await readCurrent(env)
    return json({
      hasData: Boolean(current),
      current: current?.meta || null,
    }, request, env)
  }

  if (url.pathname === '/data' && request.method === 'GET') {
    const current = await readCurrent(env)
    return json({ current }, request, env)
  }

  if (url.pathname === '/data' && (request.method === 'PUT' || request.method === 'POST')) {
    let body
    try {
      body = await readJsonBody(request)
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return json({ error: '同步数据过大' }, request, env, 413)
      }
      return json({ error: '请求格式无效' }, request, env, 400)
    }
    const payload = body?.payload
    const source = body?.source
    const payloadError = getBackupPayloadValidationError(payload, {
      requireCurrentSchema: true,
    })

    if (payloadError || (source !== 'auto' && source !== 'manual')) {
      return json({ error: '请求格式无效' }, request, env, 400)
    }

    const current = {
      meta: {
        version: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        source,
      },
      data: payload,
    }

    await env.SYNC_DATA.put(SNAPSHOT_KEY, JSON.stringify(current))

    return json({ current }, request, env)
  }

  return json({ error: 'Not found' }, request, env, 404)
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch (error) {
      console.error('Cloud sync request failed', error instanceof Error ? error.message : 'Unknown error')
      return json({ error: '云端同步暂时不可用' }, request, env, 500)
    }
  },
}
