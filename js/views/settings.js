import { store } from '../store.js';
import { db } from '../db.js';
import { toCSV, downloadFile, now } from '../utils.js';
import { toast, confirm } from '../components.js';

export function renderSettings(container) {
  container.className = 'view-settings fade-in';
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">设置 / 备份</h1>
    </div>
    <div class="settings-body">

      <!-- Data export -->
      <div class="settings-section">
        <div class="settings-section-title">数据导出</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">导出 JSON（全量备份）</div>
            <div class="settings-row-desc">包含所有项目、任务、人员数据，可用于恢复。</div>
          </div>
          <button class="btn btn-primary" id="btn-export-json">导出 JSON</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">导出项目 CSV</div>
            <div class="settings-row-desc">项目列表，含状态、优先级、截止日期。</div>
          </div>
          <button class="btn btn-secondary" id="btn-export-projects-csv">导出</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">导出任务 CSV</div>
            <div class="settings-row-desc">任务列表，含状态、负责人、日期。</div>
          </div>
          <button class="btn btn-secondary" id="btn-export-tasks-csv">导出</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">导出人员 CSV</div>
            <div class="settings-row-desc">人员列表，含技能标签。</div>
          </div>
          <button class="btn btn-secondary" id="btn-export-people-csv">导出</button>
        </div>
      </div>

      <!-- Import -->
      <div class="settings-section">
        <div class="settings-section-title">数据导入</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">从 JSON 恢复</div>
            <div class="settings-row-desc">导入前将清空现有数据，请确认后操作。</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="file" accept=".json" id="import-file" style="display:none">
            <button class="btn btn-secondary" id="btn-import-json">选择文件</button>
          </div>
        </div>
      </div>

      <!-- Danger -->
      <div class="settings-section">
        <div class="settings-section-title">危险操作</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label" style="color:var(--c-overdue)">清空所有数据</div>
            <div class="settings-row-desc">删除全部项目、任务、人员，不可恢复。建议先备份。</div>
          </div>
          <button class="btn btn-danger" id="btn-clear-all">清空</button>
        </div>
      </div>

      <!-- Info -->
      <div class="settings-section">
        <div class="settings-section-title">关于</div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">118 Studio Manager</div>
            <div class="settings-row-desc">本地优先 · 数据存于 IndexedDB · 无需登录 · 无云同步</div>
          </div>
          <span class="badge badge-active">v1.0</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">数据统计</div>
          </div>
          <span id="data-stats" class="text-muted text-sm"></span>
        </div>
      </div>
    </div>`;

  // Stats
  document.getElementById('data-stats').textContent =
    `${store.projects.length} 项目 · ${store.tasks.length} 任务 · ${store.people.length} 人员`;

  // Export JSON
  container.querySelector('#btn-export-json').onclick = async () => {
    const data = await db.exportAll();
    const json = JSON.stringify(data, null, 2);
    const ts   = new Date().toISOString().slice(0, 10);
    downloadFile(json, `118studio-backup-${ts}.json`);
    toast('JSON 已导出', 'success');
  };

  // Export CSVs
  container.querySelector('#btn-export-projects-csv').onclick = () => {
    const rows = store.projects.map(p => ({
      id: p.id, name: p.name, status: p.status, priority: p.priority,
      ddl: p.ddl, description: p.description, createdAt: p.createdAt,
    }));
    const csv = toCSV(rows, ['id','name','status','priority','ddl','description','createdAt']);
    downloadFile(csv, `118-projects-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
    toast('项目 CSV 已导出', 'success');
  };

  container.querySelector('#btn-export-tasks-csv').onclick = () => {
    const rows = store.tasks.map(t => {
      const proj   = store.getProject(t.projectId);
      const person = t.assigneeId ? store.getPerson(t.assigneeId) : null;
      return {
        id: t.id, title: t.title, project: proj?.name || '',
        status: t.status, priority: t.priority,
        assignee: person?.name || '', startDate: t.startDate,
        endDate: t.endDate, scheduledDate: t.scheduledDate,
        estimatedHours: t.estimatedHours, createdAt: t.createdAt,
      };
    });
    const csv = toCSV(rows, ['id','title','project','status','priority','assignee','startDate','endDate','scheduledDate','estimatedHours','createdAt']);
    downloadFile(csv, `118-tasks-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
    toast('任务 CSV 已导出', 'success');
  };

  container.querySelector('#btn-export-people-csv').onclick = () => {
    const rows = store.people.map(p => ({
      id: p.id, name: p.name, gender: p.gender, status: p.status,
      skills: (p.skills||[]).join(';'), notes: p.notes, createdAt: p.createdAt,
    }));
    const csv = toCSV(rows, ['id','name','gender','status','skills','notes','createdAt']);
    downloadFile(csv, `118-people-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
    toast('人员 CSV 已导出', 'success');
  };

  // Import JSON
  container.querySelector('#btn-import-json').onclick = () => {
    document.getElementById('import-file').click();
  };
  document.getElementById('import-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await confirm('确认导入', '导入将清空现有所有数据，用文件内容替换。建议先导出备份。确认继续？');
    if (!ok) { e.target.value = ''; return; }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importAll(data);
      await store.loadAll();
      toast('数据已恢复', 'success');
      // Re-render stats
      document.getElementById('data-stats').textContent =
        `${store.projects.length} 项目 · ${store.tasks.length} 任务 · ${store.people.length} 人员`;
    } catch {
      toast('文件格式错误', 'error');
    }
    e.target.value = '';
  };

  // Clear all
  container.querySelector('#btn-clear-all').onclick = async () => {
    const ok = await confirm('清空数据', '将清除所有项目、任务和人员数据，且无法撤销。是否继续？');
    if (!ok) return;
    await db.clearAll();
    await store.loadAll();
    toast('数据已清空', 'error');
    document.getElementById('data-stats').textContent =
      `${store.projects.length} 项目 · ${store.tasks.length} 任务 · ${store.people.length} 人员`;
  };
}
