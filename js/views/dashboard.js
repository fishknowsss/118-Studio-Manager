import { store } from '../store.js';
import { getRandQuote, getRandMotivation } from '../quotes.js';
import {
  today, daysUntil, urgencyClass, ddlLabel, formatDate, initials,
  sortByUrgency, getCalendarDays, dateToStr, weekdayLabel
} from '../utils.js';
import { openPlanner } from './calendar.js';

let _quote = getRandQuote();
let _motivation = getRandMotivation();
let _calYear, _calMonth;

export function renderDashboard(container) {
  const t = new Date();
  if (_calYear === undefined) { _calYear = t.getFullYear(); _calMonth = t.getMonth(); }

  const todayStr = today();
  const dateObj  = new Date();
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

  container.className = 'dashboard fade-in';
  container.innerHTML = `
    <!-- Header -->
    <div class="dash-header">
      <div class="dash-date-block">
        <div class="dash-date-big">${dateObj.getMonth()+1}月${dateObj.getDate()}日</div>
        <div class="dash-date-weekday">${dateObj.getFullYear()} · ${weekdays[dateObj.getDay()]}</div>
      </div>
      <div class="dash-quote-block">
        <div class="dash-quote-text">"${_quote.text}"</div>
        <div class="dash-quote-src">— ${_quote.src}</div>
        <div class="dash-motivation">${_motivation}</div>
      </div>
    </div>

    <!-- Today's Focus -->
    <div class="today-focus">
      <div class="focus-label">今日焦点</div>
      <div class="focus-cards" id="focus-cards"></div>
    </div>

    <!-- Bottom 7:3 -->
    <div class="dash-bottom">
      <div class="dash-left">
        <!-- Task pool -->
        <div class="panel" id="dash-task-panel">
          <div class="panel-header">
            <span class="panel-title">任务池</span>
            <span class="panel-action" id="go-tasks">全部任务 →</span>
          </div>
          <div class="panel-body" id="task-pool-list"></div>
        </div>
        <!-- People -->
        <div class="panel" id="dash-people-panel">
          <div class="panel-header">
            <span class="panel-title">人员</span>
            <span class="panel-action" id="go-people">管理 →</span>
          </div>
          <div class="panel-body" id="people-pool-list"></div>
        </div>
      </div>

      <!-- Mini Calendar -->
      <div class="dash-right">
        <div class="mini-cal-header">
          <span class="mini-cal-title" id="mini-cal-title"></span>
          <div class="mini-cal-nav">
            <button class="mini-cal-btn" id="mini-cal-prev" title="上月">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="mini-cal-btn" id="mini-cal-next" title="下月">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
        <div class="mini-cal-grid" id="mini-cal-grid"></div>
        <div class="cal-legend">
          <div class="cal-legend-item">
            <div class="cal-legend-dot" style="background:var(--c-overdue)"></div> DDL
          </div>
          <div class="cal-legend-item">
            <div class="cal-legend-dot" style="background:var(--c-primary)"></div> 里程碑
          </div>
        </div>
        <!-- Recent log -->
        <div style="margin-top:12px;flex-shrink:0">
          <div class="panel-title" style="margin-bottom:6px">最近操作</div>
          <div class="log-list" id="dash-log-list"></div>
        </div>
      </div>
    </div>`;

  renderFocusCards();
  renderTaskPool();
  renderPeoplePool();
  renderMiniCal();
  renderLog();

  // Nav shortcuts
  container.querySelector('#go-tasks').onclick  = () => navigate('tasks');
  container.querySelector('#go-people').onclick = () => navigate('people');

  // Mini cal nav
  container.querySelector('#mini-cal-prev').onclick = () => {
    _calMonth--; if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderMiniCal();
  };
  container.querySelector('#mini-cal-next').onclick = () => {
    _calMonth++; if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    renderMiniCal();
  };
}

function renderFocusCards() {
  const el = document.getElementById('focus-cards');
  if (!el) return;
  const todayStr = today();
  const active = store.projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed');
  const sorted = sortByUrgency(active);
  const top    = sorted.slice(0, 8);

  if (!top.length) {
    el.innerHTML = '<div class="focus-empty">暂无活跃项目 — 新建一个开始吧</div>';
    return;
  }

  el.innerHTML = '';
  for (const proj of top) {
    const uc = urgencyClass(proj.ddl, proj.status);
    const dl = ddlLabel(proj.ddl, proj.status);
    const tasks = store.tasksForProject(proj.id);
    const remaining = tasks.filter(t => t.status !== 'done').length;
    const nextMs = (proj.milestones || []).filter(m => !m.completed && m.date >= todayStr)
      .sort((a,b) => a.date.localeCompare(b.date))[0];

    const card = document.createElement('div');
    card.className = `focus-card ${uc}`;
    card.innerHTML = `
      <div class="focus-card-name">${esc(proj.name)}</div>
      <div class="focus-card-ddl">${dl}</div>
      <div class="focus-card-meta">
        <span>${remaining} 个任务</span>
      </div>
      ${nextMs ? `<div class="focus-card-milestone">⬡ ${esc(nextMs.title)} · ${formatDate(nextMs.date)}</div>` : ''}`;
    card.onclick = () => navigate('projects');
    el.appendChild(card);
  }
}

function renderTaskPool() {
  const el = document.getElementById('task-pool-list');
  if (!el) return;
  // Show non-done tasks, sorted by priority then end date
  const PRIO_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
  const tasks = store.tasks
    .filter(t => t.status !== 'done' && t.status !== 'blocked' || t.status === 'in-progress')
    .sort((a, b) => {
      const po = (PRIO_ORDER[a.priority] ?? 3) - (PRIO_ORDER[b.priority] ?? 3);
      if (po !== 0) return po;
      return (a.endDate || '9999').localeCompare(b.endDate || '9999');
    })
    .slice(0, 20);

  if (!tasks.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-text">暂无待处理任务</div></div>';
    return;
  }

  el.innerHTML = '';
  const todayStr = today();
  for (const t of tasks) {
    const proj = store.getProject(t.projectId);
    const person = t.assigneeId ? store.getPerson(t.assigneeId) : null;
    const overdue = t.endDate && t.endDate < todayStr && t.status !== 'done';
    const row = document.createElement('div');
    row.className = 'task-row';
    row.draggable = true;
    row.dataset.taskId = t.id;
    row.innerHTML = `
      <div class="prio-dot ${t.priority || 'medium'}"></div>
      <span class="task-title-text">${esc(t.title)}</span>
      ${proj ? `<span class="task-proj-tag">${esc(proj.name)}</span>` : ''}
      ${person ? `<span class="task-assignee-tag">${initials(person.name)}</span>` : ''}
      ${overdue ? `<span class="date-chip overdue">${formatDate(t.endDate)}</span>` : ''}`;
    el.appendChild(row);
  }

  // Drag start
  el.querySelectorAll('.task-row[draggable]').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/task-id', row.dataset.taskId);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
  });
}

function renderPeoplePool() {
  const el = document.getElementById('people-pool-list');
  if (!el) return;
  const people = store.activePeople();
  if (!people.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-text">暂无人员</div></div>';
    return;
  }
  el.innerHTML = '';
  for (const p of people) {
    const taskCount = store.tasksForPerson(p.id).length;
    const row = document.createElement('div');
    row.className = 'person-row';
    row.dataset.personId = p.id;
    row.innerHTML = `
      <div class="avatar">${initials(p.name)}</div>
      <div class="person-info">
        <div class="person-name">${esc(p.name)}</div>
        <div class="person-skills">${(p.skills||[]).slice(0,3).join(' · ')}</div>
      </div>
      <span class="person-task-count">${taskCount} 任务</span>`;

    // Drop zone for tasks
    row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drop-zone-active'); });
    row.addEventListener('dragleave', () => row.classList.remove('drop-zone-active'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drop-zone-active');
      const taskId = e.dataTransfer.getData('text/task-id');
      if (!taskId) return;
      const task = store.getTask(taskId);
      if (!task) return;
      task.assigneeId = p.id;
      task.updatedAt  = new Date().toISOString();
      await store.saveTask(task);
      await store.addLog(`分配任务「${task.title}」给 ${p.name}`);
      renderTaskPool();
      renderPeoplePool();
    });
    el.appendChild(row);
  }
}

function renderMiniCal() {
  const titleEl = document.getElementById('mini-cal-title');
  const gridEl  = document.getElementById('mini-cal-grid');
  if (!titleEl || !gridEl) return;

  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  titleEl.textContent = `${_calYear} · ${months[_calMonth]}`;

  const days    = getCalendarDays(_calYear, _calMonth);
  const todayStr = today();

  // Build event map
  const eventMap = {};
  for (const proj of store.projects) {
    if (proj.ddl) {
      if (!eventMap[proj.ddl]) eventMap[proj.ddl] = { hasDdl: false, hasMs: false };
      eventMap[proj.ddl].hasDdl = true;
      if (urgencyClass(proj.ddl, proj.status).includes('overdue')) eventMap[proj.ddl].urgent = true;
    }
    for (const ms of (proj.milestones || [])) {
      if (ms.date) {
        if (!eventMap[ms.date]) eventMap[ms.date] = { hasDdl: false, hasMs: false };
        eventMap[ms.date].hasMs = true;
      }
    }
  }

  const dows = ['日','一','二','三','四','五','六'];
  let html = dows.map(d => `<div class="mini-cal-dow">${d}</div>`).join('');

  for (const { date, otherMonth } of days) {
    const ds  = dateToStr(date);
    const ev  = eventMap[ds] || {};
    const isToday = ds === todayStr;
    const cls = [
      'mini-cal-day',
      isToday ? 'today' : '',
      otherMonth ? 'other-month' : '',
      ev.hasDdl || ev.hasMs ? 'has-events' : '',
      ev.urgent ? 'has-urgent' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" data-date="${ds}">${date.getDate()}</div>`;
  }

  gridEl.innerHTML = html;
  gridEl.querySelectorAll('.mini-cal-day').forEach(cell => {
    cell.onclick = () => openPlanner(cell.dataset.date);
  });
}

function renderLog() {
  const el = document.getElementById('dash-log-list');
  if (!el) return;
  const logs = store.logs.slice(0, 8);
  if (!logs.length) { el.innerHTML = '<div class="text-muted text-sm">暂无操作记录</div>'; return; }
  el.innerHTML = logs.map(l => {
    const d = new Date(l.ts);
    const t = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    return `<div class="log-item"><span class="log-time">${t}</span><span class="log-text">${esc(l.text)}</span></div>`;
  }).join('');
}

function navigate(view) {
  window.location.hash = '#' + view;
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
