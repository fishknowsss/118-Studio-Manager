export function arrayToCSV<T extends object>(data: T[], columns: { key: keyof T; label: string }[]): string {
  const header = columns.map(c => c.label).join(',')
  const rows = data.map(item =>
    columns.map(c => {
      const val = item[c.key]
      const str = Array.isArray(val) ? val.join('; ') : String(val ?? '')
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
