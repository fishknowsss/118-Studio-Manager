/**
 * Reusable UI components: Modal (form builder), Toast, Confirm dialog.
 */
import { uid } from './utils.js';

/* ─── Toast ──────────────────────────────────────────── */
export function toast(msg, type = 'default', duration = 2800) {
  const root = document.getElementById('toast-root');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ─── Confirm ────────────────────────────────────────── */
export function confirm(title, body) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'confirm-modal';
    d.innerHTML = `
      <div class="confirm-title">${title}</div>
      <div class="confirm-body">${body}</div>
      <div class="confirm-actions">
        <button class="btn btn-secondary" id="_cn">取消</button>
        <button class="btn btn-danger"    id="_cy">确认删除</button>
      </div>`;
    document.body.appendChild(d);
    d.showModal();
    d.querySelector('#_cn').onclick = () => { d.close(); d.remove(); resolve(false); };
    d.querySelector('#_cy').onclick = () => { d.close(); d.remove(); resolve(true);  };
    d.addEventListener('close', () => { d.remove(); resolve(false); });
  });
}

/* ─── Generic Modal (form) ───────────────────────────── */
const modal      = () => document.getElementById('app-modal');
const modalTitle = () => document.getElementById('modal-title');
const modalBody  = () => document.getElementById('modal-body');
const modalFtr   = () => document.getElementById('modal-footer');

export function openModal({ title, body, footer }) {
  modalTitle().textContent = title;
  modalBody().innerHTML    = '';
  modalFtr().innerHTML     = '';
  if (typeof body === 'string') modalBody().innerHTML = body;
  else modalBody().appendChild(body);
  if (typeof footer === 'string') modalFtr().innerHTML = footer;
  else if (footer) modalFtr().appendChild(footer);

  const m = modal();
  // Bind close handlers lazily each time the modal opens (shell may not exist at DOMContentLoaded)
  document.getElementById('modal-close').onclick = closeModal;
  m._backdropHandler = (e) => { if (e.target === m) closeModal(); };
  m.removeEventListener('click', m._backdropHandler);
  m.addEventListener('click', m._backdropHandler);

  m.showModal();
}

export function closeModal() {
  modal().close();
}

/* ─── Form builder ───────────────────────────────────── */
/**
 * Build an HTML form from a schema.
 * schema: { fields: [{ name, label, type, required, options, span2, placeholder }] }
 * Returns: { formEl, getData }
 */
export function buildForm(schema, initialData = {}) {
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.id = 'modal-form-' + uid();

  for (const f of schema.fields) {
    const wrap = document.createElement('div');
    wrap.className = 'form-field' + (f.span2 ? ' span2' : '');

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = f.label + (f.required ? ' *' : '');
    label.htmlFor = f.name;
    wrap.appendChild(label);

    let input;

    if (f.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-input';
      for (const [val, lbl] of f.options) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = lbl;
        input.appendChild(opt);
      }
      input.value = initialData[f.name] ?? f.options[0][0];

    } else if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'form-input';
      input.rows = 3;
      input.value = initialData[f.name] ?? '';
      input.placeholder = f.placeholder ?? '';

    } else if (f.type === 'milestones') {
      // Custom milestones editor
      const container = document.createElement('div');
      container.className = 'milestones-editor';
      const milestones = (initialData.milestones || []).map(m => ({ ...m }));
      renderMilestoneEditor(container, milestones);
      container.dataset.type = 'milestones';
      wrap.appendChild(container);
      form.appendChild(wrap);
      continue;

    } else if (f.type === 'skills') {
      const container = document.createElement('div');
      container.className = 'skills-editor';
      const skills = [...(initialData.skills || [])];
      renderSkillsEditor(container, skills);
      container.dataset.type = 'skills';
      wrap.appendChild(container);
      form.appendChild(wrap);
      continue;

    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
      input.className = 'form-input';
      input.value = initialData[f.name] ?? '';
      input.placeholder = f.placeholder ?? '';
      if (f.required) input.required = true;
    }

    input.id   = f.name;
    input.name = f.name;
    wrap.appendChild(input);
    form.appendChild(wrap);
  }

  function getData() {
    const result = {};
    for (const f of schema.fields) {
      if (f.type === 'milestones') {
        const container = form.querySelector('.milestones-editor');
        result.milestones = getMilestonesData(container);
      } else if (f.type === 'skills') {
        const container = form.querySelector('.skills-editor');
        result.skills = getSkillsData(container);
      } else if (f.type === 'number') {
        const el = form.querySelector(`[name="${f.name}"]`);
        result[f.name] = el?.value ? parseFloat(el.value) : null;
      } else {
        const el = form.querySelector(`[name="${f.name}"]`);
        result[f.name] = el?.value || null;
      }
    }
    return result;
  }

  function validate() {
    for (const f of schema.fields) {
      if (f.required) {
        const el = form.querySelector(`[name="${f.name}"]`);
        if (!el?.value?.trim()) { el?.focus(); return false; }
      }
    }
    return true;
  }

  return { formEl: form, getData, validate };
}

/* ─── Milestones editor ──────────────────────────────── */
function renderMilestoneEditor(container, milestones) {
  container.innerHTML = '';
  milestones.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'milestone-edit-row';
    row.innerHTML = `
      <input type="checkbox" class="milestone-check-input" ${m.completed ? 'checked' : ''} data-idx="${i}" title="标记完成">
      <input type="text"  class="form-input" placeholder="里程碑名称" value="${esc(m.title)}" data-idx="${i}" data-field="title" style="flex:1">
      <input type="date"  class="form-input" value="${m.date || ''}" data-idx="${i}" data-field="date" style="width:130px">
      <button type="button" class="btn btn-ghost btn-icon btn-sm ms-del" data-idx="${i}" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    container.appendChild(row);
  });

  const addBtn = document.createElement('span');
  addBtn.className = 'add-milestone-btn';
  addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 添加里程碑`;
  addBtn.onclick = () => {
    milestones.push({ id: uid(), title: '', date: '', completed: false });
    renderMilestoneEditor(container, milestones);
  };
  container.appendChild(addBtn);

  container.querySelectorAll('.ms-del').forEach(btn => {
    btn.onclick = () => { milestones.splice(+btn.dataset.idx, 1); renderMilestoneEditor(container, milestones); };
  });
  container.querySelectorAll('[data-field]').forEach(inp => {
    inp.oninput = () => { milestones[+inp.dataset.idx][inp.dataset.field] = inp.value; };
  });
  container.querySelectorAll('.milestone-check-input').forEach(cb => {
    cb.onchange = () => { milestones[+cb.dataset.idx].completed = cb.checked; };
  });

  container._milestones = milestones;
}

function getMilestonesData(container) {
  const rows = container.querySelectorAll('.milestone-edit-row');
  const result = [];
  rows.forEach((row) => {
    const titleEl = row.querySelector('[data-field="title"]');
    const dateEl  = row.querySelector('[data-field="date"]');
    const cbEl    = row.querySelector('.milestone-check-input');
    const idx     = +titleEl.dataset.idx;
    result.push({
      id: container._milestones[idx]?.id || uid(),
      title: titleEl.value,
      date:  dateEl.value,
      completed: cbEl.checked,
    });
  });
  return result;
}

/* ─── Skills editor ──────────────────────────────────── */
function renderSkillsEditor(container, skills) {
  container.innerHTML = '';
  skills.forEach((s, i) => {
    const tag = document.createElement('span');
    tag.className = 'skill-edit-tag';
    tag.innerHTML = `${esc(s)} <span class="skill-remove" data-idx="${i}">×</span>`;
    container.appendChild(tag);
  });
  const inp = document.createElement('input');
  inp.className = 'skill-add-input';
  inp.placeholder = '添加技能…';
  inp.onkeydown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
      e.preventDefault();
      skills.push(inp.value.trim());
      renderSkillsEditor(container, skills);
    }
    if (e.key === 'Backspace' && !inp.value && skills.length) {
      skills.pop();
      renderSkillsEditor(container, skills);
    }
  };
  container.appendChild(inp);

  container.querySelectorAll('.skill-remove').forEach(btn => {
    btn.onclick = () => { skills.splice(+btn.dataset.idx, 1); renderSkillsEditor(container, skills); };
  });
  container._skills = skills;
}

function getSkillsData(container) {
  return container._skills || [];
}

/* ─── Helpers ────────────────────────────────────────── */
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
