const SNAPSHOT_KEY = 'sync:current'

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  const allowedOrigin = env.ALLOWED_ORIGIN || origin || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

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

    if (url.pathname === '/data' && request.method === 'PUT') {
      const body = await request.json()
      const payload = body?.payload
      const source = body?.source

      if (!payload || (source !== 'auto' && source !== 'manual')) {
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
  },
}
