/**
 * 118 Studio Manager — Bootstrap
 * Handles DB init, store load, demo seed, and badge updates.
 * Routing is handled by React (src/App.tsx).
 */
import { openDB } from './db.js';
import { store }  from './store.js';

let hasBooted = false;
let teardown  = [];

/* ─── Badge ──────────────────────────────────────────── */
function updateBadge() {
  const badge = document.getElementById('badge-projects');
  if (!badge) return;
  const urgent = store.projects.filter(p => {
    if (p.status === 'completed' || p.status === 'cancelled') return false;
    if (!p.ddl) return false;
    const d = Math.round((new Date(p.ddl + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000);
    return d < 0 || d <= 3;
  }).length;
  badge.textContent = urgent;
  badge.style.display = urgent > 0 ? '' : 'none';
}

/* ─── Demo seed ──────────────────────────────────────── */
async function seedDemoData() {
  const uid = () => crypto.randomUUID();
  const n   = () => new Date().toISOString();
  const today = new Date();
  const fmtDate = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const alice = { id: uid(), name: '陈佳宁', gender: 'female', status: 'active', skills: ['视频剪辑', 'After Effects', '调色'], notes: '主视频剪辑师', createdAt: n(), updatedAt: n() };
  const bob   = { id: uid(), name: '王浩然', gender: 'male',   status: 'active', skills: ['动态设计', 'Cinema 4D', '建模'], notes: '', createdAt: n(), updatedAt: n() };
  const carol = { id: uid(), name: '刘思敏', gender: 'female', status: 'active', skills: ['平面设计', 'Figma', '插画'], notes: '兼顾社媒', createdAt: n(), updatedAt: n() };

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

/* ─── Init ───────────────────────────────────────────── */
async function init() {
  if (hasBooted) return;
  hasBooted = true;

  await openDB();
  await store.loadAll();

  if (!store.projects.length && !store.tasks.length && !store.people.length) {
    await seedDemoData();
  }

  // Set initial hash if missing
  if (!window.location.hash) window.location.hash = '#dashboard';

  // Signal React that store is ready
  document.dispatchEvent(new CustomEvent('appReady'));

  updateBadge();

  // Keep badge in sync with store changes
  const onStoreUpdated = () => updateBadge();
  document.addEventListener('storeUpdated', onStoreUpdated);
  teardown.push(() => document.removeEventListener('storeUpdated', onStoreUpdated));

  // Nav click → hash navigation (React handles rendering)
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    const handler = () => { window.location.hash = '#' + item.dataset.view; };
    item.addEventListener('click', handler);
    teardown.push(() => item.removeEventListener('click', handler));
  });
}

export function disposeLegacyApp() {
  while (teardown.length) {
    const fn = teardown.pop();
    try { fn?.(); } catch {}
  }
  hasBooted = false;
}

/* ─── Boot ───────────────────────────────────────────── */
init().catch(err => {
  console.error('[118SM] 初始化失败:', err);
  const vc = document.getElementById('view-container');
  if (vc) vc.innerHTML =
    `<div style="padding:40px;color:#E54D4D;font-size:14px">
      <strong>启动失败</strong><br>
      请检查浏览器是否支持 IndexedDB，并确认页面通过 HTTP 加载（非 file://）。<br>
      <code style="font-size:12px;color:#666">${err.message}</code>
    </div>`;
});
