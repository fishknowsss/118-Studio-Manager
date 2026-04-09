interface BackupData {
  appVersion: string
  schemaVersion: number
  exportedAt: string
  data: {
    projects: unknown[]
    people: unknown[]
    tasks: unknown[]
    milestones: unknown[]
    assignments: unknown[]
    logs: unknown[]
    settings: unknown[]
  }
}

export function validateBackupData(data: unknown): { valid: boolean; error?: string; data?: BackupData } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '无效的 JSON 数据' }
  }

  const d = data as Record<string, unknown>

  if (!d.appVersion || typeof d.appVersion !== 'string') {
    return { valid: false, error: '缺少 appVersion 字段' }
  }
  if (!d.schemaVersion || typeof d.schemaVersion !== 'number') {
    return { valid: false, error: '缺少 schemaVersion 字段' }
  }
  if (!d.exportedAt || typeof d.exportedAt !== 'string') {
    return { valid: false, error: '缺少 exportedAt 字段' }
  }
  if (!d.data || typeof d.data !== 'object') {
    return { valid: false, error: '缺少 data 字段' }
  }

  const tables = d.data as Record<string, unknown>
  const requiredTables = ['projects', 'people', 'tasks', 'milestones', 'assignments', 'logs', 'settings']
  for (const table of requiredTables) {
    if (!Array.isArray(tables[table])) {
      return { valid: false, error: `data.${table} 不是数组` }
    }
  }

  return { valid: true, data: data as BackupData }
}
