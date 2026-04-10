/**
 * 118 Studio Manager — Main Entry Point
 * Local-first SPA powered by IndexedDB.
 */
import { openDB } from './db.js';
import { store }  from './store.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProjects }  from './views/projects.js';
import { renderTasks }     from './views/tasks.js';
import { renderPeople }    from './views/people.js';
import { renderCalendar }  from './views/calendar.js';
import { renderSettings }  from './views/settings.js';

/* ─── View registry ──────────────────────────────────── */
const VIEWS = {
  dashboard: renderDashboard,
  projects:  renderProjects,
  tasks:     renderTasks,
  people:    renderPeople,
  calendar:  renderCalendar,
  settings:  renderSettings,
};

/* ─── Current view ───────────────────────────────────── */
let currentView = null;

function getHashView() {
  const h = window.location.hash.slice(1);
  return VIEWS[h] ? h : 'dashboard';
}

function navigate(view) {
  if (!VIEWS[view]) view = 'dashboard';
  window.location.hash = '#' + view;
}

function renderView(viewName) {
  currentView = viewName;
  const container = document.getElementById('view-container');
  container.innerHTML = '';
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;height:100%;';
  container.appendChild(el);
  VIEWS[viewName](el);

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });
}

/* ─── Init ───────────────────────────────────────────── */
async function init() {
  // Open IndexedDB
  await openDB();

  // Load all data into store
  await store.loadAll();

  // Set up nav click handlers
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.view));
  });

  // Hash-based routing
  window.addEventListener('hashchange', () => {
    renderView(getHashView());
  });

  // Seed demo data on first run (if empty)
  if (!store.projects.length && !store.tasks.length && !store.people.length) {
    await seedDemoData();
  }

  // Initial render
  if (!window.location.hash) window.location.hash = '#dashboard';
  else renderView(getHashView());

  // Update urgency badge on projects nav
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById('badge-projects');
  if (!badge) return;
  const { urgencyClass } = {
    urgencyClass(ddl, status) {
      if (status === 'completed' || status === 'cancelled') return '';
      if (!ddl) return '';
      const d = Math.round((new Date(ddl + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000);
      if (d < 0) return 'overdue';
      if (d <= 3) return 'soon';
      return '';
    }
  };
  const urgent = store.projects.filter(p => {
    const uc = urgencyClass(p.ddl, p.status);
    return uc === 'overdue' || uc === 'soon';
  }).length;

  if (urgent > 0) {
    badge.textContent = urgent;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

/* ─── Demo seed data ─────────────────────────────────── */
async function seedDemoData() {
  const uid = () => crypto.randomUUID();
  const n   = () => new Date().toISOString();

  const today = new Date();
  const fmtDate = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  // People
  const alice = { id: uid(), name: '陈佳宁', gender: 'female', status: 'active', skills: ['视频剪辑', 'After Effects', '调色'], notes: '主视频剪辑师', createdAt: n(), updatedAt: n() };
  const bob   = { id: uid(), name: '王浩然', gender: 'male',   status: 'active', skills: ['动态设计', 'Cinema 4D', '建模'], notes: '', createdAt: n(), updatedAt: n() };
  const carol = { id: uid(), name: '刘思敏', gender: 'female', status: 'active', skills: ['平面设计', 'Figma', '插画'], notes: '兼顾社媒', createdAt: n(), updatedAt: n() };

  // Projects
  const projA = {
    id: uid(), name: '品牌宣传片 · 第三季', status: 'active', priority: 'urgent',
    ddl: fmtDate(1), description: '客户品牌年度宣传片，3分钟正片+15s短版，需要4K交付。',
    milestones: [
      { id: uid(), title: '初剪完成', date: fmtDate(-1), completed: true },
      { id: uid(), title: '客户审片', date: fmtDate(1),  completed: false },
      { id: uid(), title: '终版交付', date: fmtDate(3),  completed: false },
    ],
    createdAt: n(), updatedAt: n()
  };
  const projB = {
    id: uid(), name: '线下活动视觉设计', status: 'active', priority: 'high',
    ddl: fmtDate(5), description: '5月线下沙龙活动——VI设计、海报、物料、现场大屏素材。',
    milestones: [
      { id: uid(), title: 'VI方案定稿', date: fmtDate(2), completed: false },
      { id: uid(), title: '印刷文件提交', date: fmtDate(4), completed: false },
    ],
    createdAt: n(), updatedAt: n()
  };
  const projC = {
    id: uid(), name: '社交媒体内容 · 4月', status: 'active', priority: 'medium',
    ddl: fmtDate(18), description: '小红书 + 微博 + 视频号月度内容矩阵，共20条。',
    milestones: [
      { id: uid(), title: '选题策划', date: fmtDate(2), completed: false },
      { id: uid(), title: '拍摄完成', date: fmtDate(10), completed: false },
    ],
    createdAt: n(), updatedAt: n()
  };

  // Tasks
  const tasks = [
    { id: uid(), projectId: projA.id, title: '音效混音终版', status: 'in-progress', priority: 'urgent', assigneeId: alice.id, scheduledDate: fmtDate(0), startDate: fmtDate(-1), endDate: fmtDate(0), estimatedHours: 4, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projA.id, title: '客户修改版渲染输出', status: 'todo', priority: 'urgent', assigneeId: alice.id, scheduledDate: fmtDate(1), startDate: fmtDate(1), endDate: fmtDate(1), estimatedHours: 2, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projA.id, title: '片头动画调整', status: 'done', priority: 'high', assigneeId: bob.id, scheduledDate: fmtDate(-2), startDate: fmtDate(-3), endDate: fmtDate(-2), estimatedHours: 6, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projB.id, title: 'VI色彩方案提案', status: 'in-progress', priority: 'high', assigneeId: carol.id, scheduledDate: fmtDate(0), startDate: fmtDate(0), endDate: fmtDate(1), estimatedHours: 8, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projB.id, title: '活动海报 A3 版设计', status: 'todo', priority: 'high', assigneeId: carol.id, scheduledDate: null, startDate: fmtDate(2), endDate: fmtDate(3), estimatedHours: 6, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projB.id, title: '现场大屏动画', status: 'todo', priority: 'medium', assigneeId: bob.id, scheduledDate: null, startDate: fmtDate(3), endDate: fmtDate(4), estimatedHours: 10, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projC.id, title: '4月选题列表', status: 'todo', priority: 'medium', assigneeId: null, scheduledDate: null, startDate: fmtDate(1), endDate: fmtDate(2), estimatedHours: 2, description: '', createdAt: n(), updatedAt: n() },
    { id: uid(), projectId: projC.id, title: '拍摄脚本撰写', status: 'todo', priority: 'low', assigneeId: null, scheduledDate: null, startDate: fmtDate(3), endDate: fmtDate(5), estimatedHours: 4, description: '', createdAt: n(), updatedAt: n() },
  ];

  for (const p of [alice, bob, carol]) await store.savePerson(p);
  for (const p of [projA, projB, projC]) await store.saveProject(p);
  for (const t of tasks) await store.saveTask(t);
  await store.addLog('加载了演示数据');
}

/* ─── Re-render on store updates (optional cross-view refresh) */
document.addEventListener('storeUpdated', () => { updateBadge(); });

/* ─── Boot ───────────────────────────────────────────── */
init().catch(err => {
  console.error('[118SM] 初始化失败:', err);
  document.getElementById('view-container').innerHTML =
    `<div style="padding:40px;color:#E54D4D;font-size:14px">
      <strong>启动失败</strong><br>
      请检查浏览器是否支持 IndexedDB，并确认页面通过 HTTP 加载（非 file://）。<br>
      <code style="font-size:12px;color:#666">${err.message}</code>
    </div>`;
});
