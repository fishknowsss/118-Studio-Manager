import { db } from '../db/database'
import type { LogType, TargetType } from '../types/log'
import { generateId } from '../utils/id'
import { now } from '../utils/date'

export async function addLog(
  type: LogType,
  targetType: TargetType,
  targetId: string,
  message: string
): Promise<void> {
  await db.logs.add({
    id: generateId(),
    type,
    targetType,
    targetId,
    message,
    createdAt: now(),
  })
}

export async function getRecentLogs(limit = 20) {
  return db.logs.orderBy('createdAt').reverse().limit(limit).toArray()
}

export async function clearLogs(): Promise<void> {
  await db.logs.clear()
}
