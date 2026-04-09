import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

export function useLogs(limit = 20) {
  const logs = useLiveQuery(() => db.logs.orderBy('createdAt').reverse().limit(limit).toArray(), [limit])
  return logs ?? []
}
