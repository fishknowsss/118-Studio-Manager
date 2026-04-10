/**
 * Central in-memory store. Loaded from DB on boot.
 * Views listen to 'storeUpdated' events on document.
 */
import { db } from './db.js';

export const store = {
  projects: [],
  tasks: [],
  people: [],
  logs: [],

  async loadAll() {
    [this.projects, this.tasks, this.people, this.logs] = await Promise.all([
      db.getAll('projects'),
      db.getAll('tasks'),
      db.getAll('people'),
      db.getAll('logs'),
    ]);
    this._emit();
  },

  _emit(detail = {}) {
    document.dispatchEvent(new CustomEvent('storeUpdated', { detail }));
  },

  /* ── Projects ── */
  async saveProject(proj) {
    await db.put('projects', proj);
    const idx = this.projects.findIndex(p => p.id === proj.id);
    if (idx >= 0) this.projects[idx] = proj;
    else this.projects.push(proj);
    this._emit({ type: 'project', action: 'save', id: proj.id });
  },

  async deleteProject(id) {
    await db.delete('projects', id);
    // also delete related tasks
    const related = this.tasks.filter(t => t.projectId === id);
    for (const t of related) { await db.delete('tasks', t.id); }
    this.tasks    = this.tasks.filter(t => t.projectId !== id);
    this.projects = this.projects.filter(p => p.id !== id);
    this._emit({ type: 'project', action: 'delete', id });
  },

  getProject(id) { return this.projects.find(p => p.id === id); },

  /* ── Tasks ── */
  async saveTask(task) {
    await db.put('tasks', task);
    const idx = this.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) this.tasks[idx] = task;
    else this.tasks.push(task);
    this._emit({ type: 'task', action: 'save', id: task.id });
  },

  async deleteTask(id) {
    await db.delete('tasks', id);
    this.tasks = this.tasks.filter(t => t.id !== id);
    this._emit({ type: 'task', action: 'delete', id });
  },

  getTask(id) { return this.tasks.find(t => t.id === id); },

  tasksForProject(pid) { return this.tasks.filter(t => t.projectId === pid); },
  tasksForDate(dateStr)  { return this.tasks.filter(t => t.scheduledDate === dateStr); },
  tasksForPerson(pid)    { return this.tasks.filter(t => t.assigneeId === pid && t.status !== 'done'); },

  /* ── People ── */
  async savePerson(person) {
    await db.put('people', person);
    const idx = this.people.findIndex(p => p.id === person.id);
    if (idx >= 0) this.people[idx] = person;
    else this.people.push(person);
    this._emit({ type: 'person', action: 'save', id: person.id });
  },

  async deletePerson(id) {
    await db.delete('people', id);
    // unassign tasks
    for (const t of this.tasks.filter(t => t.assigneeId === id)) {
      t.assigneeId = null;
      await db.put('tasks', t);
    }
    this.people = this.people.filter(p => p.id !== id);
    this._emit({ type: 'person', action: 'delete', id });
  },

  getPerson(id) { return this.people.find(p => p.id === id); },
  activePeople() { return this.people.filter(p => p.status === 'active'); },

  /* ── Logs ── */
  async addLog(text) {
    const log = { id: crypto.randomUUID(), text, ts: new Date().toISOString() };
    await db.put('logs', log);
    this.logs.unshift(log);
    if (this.logs.length > 50) {
      const removed = this.logs.splice(50);
      for (const l of removed) await db.delete('logs', l.id);
    }
  },
};
