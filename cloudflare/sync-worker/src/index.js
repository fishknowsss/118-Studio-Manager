const CURRENT_DATA_KEY = 'sync:current:data'
const CURRENT_META_KEY = 'sync:current:meta'
const BACKUP_DATA_KEY = 'sync:backup:manual:data'
const BACKUP_META_KEY = 'sync:backup:manual:meta'

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

async function readEnvelope(env, dataKey, metaKey) {
  const [dataText, metaText] = await Promise.all([
    env.SYNC_DATA.get(dataKey),
    env.SYNC_DATA.get(metaKey),
  ])

  if (!dataText || !metaText) {
    return null
  }

  return {
    data: JSON.parse(dataText),
    meta: JSON.parse(metaText),
  }
}

async function writeEnvelope(env, dataKey, metaKey, envelope) {
  await Promise.all([
    env.SYNC_DATA.put(dataKey, JSON.stringify(envelope.data)),
    env.SYNC_DATA.put(metaKey, JSON.stringify(envelope.meta)),
  ])
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
      const [current, manualBackup] = await Promise.all([
        readEnvelope(env, CURRENT_DATA_KEY, CURRENT_META_KEY),
        readEnvelope(env, BACKUP_DATA_KEY, BACKUP_META_KEY),
      ])

      return json({
        hasData: Boolean(current),
        current: current?.meta || null,
        manualBackup: manualBackup?.meta || null,
      }, request, env)
    }

    if (url.pathname === '/data' && request.method === 'GET') {
      const current = await readEnvelope(env, CURRENT_DATA_KEY, CURRENT_META_KEY)
      return json({ current }, request, env)
    }

    if (url.pathname === '/data' && request.method === 'PUT') {
      const body = await request.json()
      const payload = body?.payload
      const source = body?.source
      const createBackup = Boolean(body?.createBackup)

      if (!payload || (source !== 'auto' && source !== 'manual')) {
        return json({ error: '请求格式无效' }, request, env, 400)
      }

      const previousBackup = await readEnvelope(env, BACKUP_DATA_KEY, BACKUP_META_KEY)
      const timestamp = new Date().toISOString()
      const version = crypto.randomUUID()
      const current = {
        data: payload,
        meta: {
          version,
          updatedAt: timestamp,
          source,
        },
      }
      const manualBackup = createBackup
        ? {
            data: payload,
            meta: {
              version,
              updatedAt: timestamp,
              source: 'manual',
            },
          }
        : previousBackup

      await writeEnvelope(env, CURRENT_DATA_KEY, CURRENT_META_KEY, current)
      if (manualBackup) {
        await writeEnvelope(env, BACKUP_DATA_KEY, BACKUP_META_KEY, manualBackup)
      }

      return json({
        current,
        manualBackup,
      }, request, env)
    }

    return json({ error: 'Not found' }, request, env, 404)
  },
}
