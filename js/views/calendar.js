import { store } from '../store.js';
import { today, getCalendarDays, dateToStr, formatDateFull, weekdayLabel, initials, now, uid } from '../utils.js';

let _year, _month;

export function renderCalendar(container) {
  const t = new Date();
  if (_year === undefined) { _year = t.getFullYear(); _month = t.getMonth(); }

  container.className = 'view-calendar fade-in';
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">日历</h1>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="cal-month-label" id="cal-month-label"></span>
        <button class="cal-nav-btn" id="cal-next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button class="btn btn-secondary btn-sm" id="cal-today">今天</button>
      </div>
    </div>
    <div class="cal-body">
      <div class="cal-dow-row">
        ${['日','一','二','三','四','五','六'].map(d => `<div class="cal-dow-cell">${d}</div>`).join('')}
      </div>
      <div class="cal-grid" id="cal-grid"></div>
    </div>`;

  renderGrid();

  container.querySelector('#cal-prev').onclick = () => { _month--; if(_month<0){_month=11;_year--;} renderGrid(); };
  container.querySelector('#cal-next').onclick = () => { _month++; if(_month>11){_month=0;_year++;} renderGrid(); };
  container.querySelector('#cal-today').onclick = () => { const n=new Date(); _year=n.getFullYear(); _month=n.getMonth(); renderGrid(); };
}

function renderGrid() {
  const grid  = document.getElementById('cal-grid');
  const label = document.getElementById('cal-month-label');
  if (!grid) return;

  const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  label.textContent = `${_year} · ${months[_month]}`;

  const todayStr = today();
  const days     = getCalendarDays(_year, _month);

  // Build event map  { dateStr → { ddls:[], milestones:[] } }
  const eventMap = {};
  function getDay(ds) { return eventMap[ds] || (eventMap[ds] = { ddls: [], milestones: [] }); }

  for (const proj of store.projects) {
    if (proj.ddl) getDay(proj.ddl).ddls.push(proj.name);
    for (const ms of (proj.milestones || [])) {
      if (ms.date && ms.title) getDay(ms.date).milestones.push(ms.title);
    }
  }

  grid.innerHTML = '';
  for (const { date, otherMonth } of days) {
    const ds  = dateToStr(date);
    const ev  = eventMap[ds] || { ddls: [], milestones: [] };
    const isToday = ds === todayStr;

    const cell = document.createElement('div');
    cell.className = ['cal-cell', isToday ? 'today' : '', otherMonth ? 'other-month' : ''].filter(Boolean).join(' ');
    cell.dataset.date = ds;

    let html = `<div class="cal-day-num">${date.getDate()}</div>`;
    ev.ddls.slice(0, 2).forEach(n => { html += `<div class="cal-event ddl" title="${esc(n)}">⬡ ${esc(n)}</div>`; });
    ev.milestones.slice(0, 2).forEach(n => { html += `<div class="cal-event milestone" title="${esc(n)}">◆ ${esc(n)}</div>`; });
    const more = (ev.ddls.length + ev.milestones.length) - 4;
    if (more > 0) html += `<div class="cal-event more">+${more} more</div>`;

    cell.innerHTML = html;
    cell.onclick   = () => openPlanner(ds);
    grid.appendChild(cell);
  }
}

/* ─── Daily Planner Panel ────────────────────────────── */
export function openPlanner(dateStr) {
  const panel   = document.getElementById('planner-panel');
  const content = document.getElementById('planner-content');
  const overlay = document.getElementById('planner-overlay');

  panel.classList.add('is-open');
  renderPlannerContent(content, dateStr);

  overlay.onclick = closePlanner;
}

function closePlanner() {
  document.getElementById('planner-panel').classList.remove('is-open');
}

function renderPlannerContent(content, dateStr) {
  const todayStr = today();
  const dateLabel = formatDateFull(dateStr);
  const tasks = store.tasks.filter(t => t.scheduledDate === dateStr);
  const allOpen = store.tasks.filter(t => t.status !== 'done' && t.status !== 'blocked' && !t.scheduledDate);
  const people  = store.activePeople();

  // Events for this day (DDL or milestones)
  const events = [];
  for (const proj of store.projects) {
    if (proj.ddl === dateStr) events.push({ type: 'ddl', label: `DDL · ${proj.name}` });
    for (const ms of (proj.milestones || [])) {
      if (ms.date === dateStr && ms.title) events.push({ type: 'milestone', label: `里程碑 · ${ms.title}` });
    }
  }

  content.innerHTML = `
    <div class="planner-header">
      <div>
        <div class="planner-date-big">${dateLabel}</div>
        <div class="planner-date-sub">${dateStr === todayStr ? '今天' : dateStr}</div>
      </div>
      <button class="btn btn-ghost btn-icon" id="planner-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="planner-body">
      ${events.length ? `
      <div class="planner-section">
        <div class="planner-section-title">关键节点</div>
        ${events.map(ev => `<div class="planner-event-row ${ev.type}">${esc(ev.label)}</div>`).join('')}
      </div>` : ''}

      <div class="planner-section">
        <div class="planner-section-title">当天人员安排</div>
        <div id="planner-people-rows"></div>
      </div>

      <div class="planner-section">
        <div class="planner-section-title">可分配任务（未安排）</div>
        <div id="planner-unassigned-rows"></div>
      </div>
    </div>`;

  content.querySelector('#planner-close').onclick = closePlanner;

  renderPlannerPeople(dateStr);
  renderPlannerUnassigned(dateStr);
}

function renderPlannerPeople(dateStr) {
  const el = document.getElementById('planner-people-rows');
  if (!el) return;
  const people = store.activePeople();
  if (!people.length) { el.innerHTML = '<div class="text-muted text-sm">暂无人员</div>'; return; }

  el.innerHTML = '';
  for (const p of people) {
    const assigned = store.tasks.filter(t => t.assigneeId === p.id && t.scheduledDate === dateStr);

    const row = document.createElement('div');
    row.innerHTML = `
      <div class="planner-person-row" data-person-id="${p.id}">
        <div class="avatar sm">${initials(p.name)}</div>
        <div style="flex:1;font-size:13px;font-weight:600">${esc(p.name)}</div>
        <span style="font-size:11px;color:var(--c-text-3)">${assigned.length} 个任务</span>
      </div>
      <div class="planner-tasks-of-person" id="ptasks-${p.id}"></div>`;

    // Drop zone
    const pRow = row.querySelector('.planner-person-row');
    pRow.style.cursor = 'default';
    setupDropZone(pRow, p.id, dateStr);

    el.appendChild(row);

    const tasksEl = document.getElementById(`ptasks-${p.id}`);
    for (const t of assigned) {
      const ta = document.createElement('div');
      ta.className = 'planner-assigned-task';
      ta.innerHTML = `
        <div class="task-check done"></div>
        <span style="flex:1">${esc(t.title)}</span>
        <button class="planner-unassign-btn" data-task-id="${t.id}" data-person-id="${p.id}">取消分配</button>`;
      ta.querySelector('.planner-unassign-btn').onclick = async () => {
        const task = store.getTask(t.id);
        if (!task) return;
        task.scheduledDate = null;
        task.updatedAt = now();
        await store.saveTask(task);
        await store.addLog(`取消分配任务「${task.title}」给 ${p.name} 在 ${dateStr}`);
        renderPlannerPeople(dateStr);
        renderPlannerUnassigned(dateStr);
      };
      tasksEl.appendChild(ta);
    }
  }
}

function renderPlannerUnassigned(dateStr) {
  const el = document.getElementById('planner-unassigned-rows');
  if (!el) return;
  const tasks = store.tasks.filter(t => t.status !== 'done' && t.status !== 'blocked' && !t.scheduledDate);

  if (!tasks.length) {
    el.innerHTML = '<div class="text-muted text-sm">所有任务已安排</div>';
    return;
  }

  el.innerHTML = '';
  for (const t of tasks) {
    const proj = store.getProject(t.projectId);
    const row = document.createElement('div');
    row.className = 'planner-task-row';
    row.draggable = true;
    row.dataset.taskId = t.id;
    row.innerHTML = `
      <div class="task-check"></div>
      <span style="flex:1;font-size:13px">${esc(t.title)}</span>
      ${proj ? `<span style="font-size:11px;color:var(--c-text-3)">${esc(proj.name)}</span>` : ''}
      <div class="planner-task-assign">
        <select class="filter-select" data-task-id="${t.id}" style="font-size:12px;padding:3px 6px">
          <option value="">分配给…</option>
          ${store.activePeople().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
        </select>
      </div>`;

    row.querySelector('select').onchange = async (e) => {
      const personId = e.target.value;
      if (!personId) return;
      const task = store.getTask(t.id);
      const person = store.getPerson(personId);
      if (!task || !person) return;
      task.assigneeId    = personId;
      task.scheduledDate = dateStr;
      task.updatedAt     = now();
      await store.saveTask(task);
      await store.addLog(`安排任务「${task.title}」给 ${person.name} · ${dateStr}`);
      renderPlannerPeople(dateStr);
      renderPlannerUnassigned(dateStr);
    };

    // Drag
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/task-id', t.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));

    el.appendChild(row);
  }
}

function setupDropZone(el, personId, dateStr) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.style.background = 'var(--c-teal-light)'; });
  el.addEventListener('dragleave', () => { el.style.background = ''; });
  el.addEventListener('drop', async (e) => {
    e.preventDefault();
    el.style.background = '';
    const taskId = e.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    const task   = store.getTask(taskId);
    const person = store.getPerson(personId);
    if (!task || !person) return;
    task.assigneeId    = personId;
    task.scheduledDate = dateStr;
    task.updatedAt     = now();
    await store.saveTask(task);
    await store.addLog(`安排任务「${task.title}」给 ${person.name} · ${dateStr}`);
    renderPlannerPeople(dateStr);
    renderPlannerUnassigned(dateStr);
  });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
