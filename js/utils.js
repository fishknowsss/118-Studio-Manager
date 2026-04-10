/* ─── ID & Time ──────────────────────────────────────── */
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/* ─── Date helpers ───────────────────────────────────── */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d   = new Date(dateStr + 'T00:00:00');
  const t   = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

export function urgencyClass(dateStr, status) {
  if (status === 'completed' || status === 'cancelled') return 'urg-done';
  if (!dateStr) return '';
  const d = daysUntil(dateStr);
  if (d === null) return '';
  if (d < 0)  return 'urg-overdue';
  if (d === 0) return 'urg-today';
  if (d <= 3)  return 'urg-soon';
  if (d <= 7)  return 'urg-near';
  return '';
}

export function ddlLabel(dateStr, status) {
  if (status === 'completed') return '已完成';
  if (status === 'cancelled') return '已取消';
  if (!dateStr) return '—';
  const d = daysUntil(dateStr);
  if (d === null) return '—';
  if (d < 0)   return `逾期 ${Math.abs(d)} 天`;
  if (d === 0) return '今日截止';
  if (d <= 7)  return `还剩 ${d} 天`;
  return `DDL ${formatDate(dateStr)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  return dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function isSameDay(a, b) {
  return a && b && a.slice(0, 10) === b.slice(0, 10);
}

export function weekdayLabel(dateStr) {
  const dt = new Date(dateStr + 'T00:00:00');
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
}

/* ─── String ─────────────────────────────────────────── */
export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (name.length >= 2 && /[\u4e00-\u9fa5]/.test(name)) return name.slice(-2);
  return name[0].toUpperCase();
}

/* ─── Status / Priority labels ───────────────────────── */
export const STATUS_LABELS = {
  active:    '进行中',
  completed: '已完成',
  paused:    '暂停',
  cancelled: '已取消',
  todo:       '待处理',
  'in-progress': '进行中',
  done:       '完成',
  blocked:    '受阻',
};

export const PRIORITY_LABELS = {
  urgent: '紧急',
  high:   '高',
  medium: '中',
  low:    '低',
};

/* ─── Sort helpers ───────────────────────────────────── */
export function sortByUrgency(projects) {
  const order = { 'urg-overdue': 0, 'urg-today': 1, 'urg-soon': 2, 'urg-near': 3, '': 4, 'urg-done': 5 };
  return [...projects].sort((a, b) => {
    const au = order[urgencyClass(a.ddl, a.status)] ?? 4;
    const bu = order[urgencyClass(b.ddl, b.status)] ?? 4;
    return au !== bu ? au - bu : (a.ddl || '').localeCompare(b.ddl || '');
  });
}

/* ─── Calendar helpers ───────────────────────────────── */
export function getCalendarDays(year, month) {
  // month: 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  // Fill previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), otherMonth: true });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), otherMonth: false });
  }
  // Fill next month
  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, days.length - firstDay - daysInMonth + 1), otherMonth: true });
  }
  return days;
}

export function dateToStr(d) {
  return d.toISOString().slice(0, 10);
}

/* ─── CSV export ─────────────────────────────────────── */
export function toCSV(rows, headers) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

export function downloadFile(content, filename, mime = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
}
