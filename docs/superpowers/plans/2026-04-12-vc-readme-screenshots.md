# VC README Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 2026-04-11 备份 JSON 重做 `vc` 分支 README 的 7 张页面截图并更新 README 引用

**Architecture:** 使用浏览器上下文直接导入备份 JSON 到现有 IndexedDB，再在同一个会话中连续切页截图。README 只更新截图区说明、图片引用和版本记录，不动其他结构。

**Tech Stack:** React, Vite, IndexedDB, Playwright, Markdown

---

### Task 1: 写入设计数据并确认页面取景

**Files:**
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/*`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/README.md`

- [ ] **Step 1: 读取备份 JSON**

Run: `python3 - <<'PY' ...`
Expected: 输出 `projects / tasks / people` 的数量和字段结构

- [ ] **Step 2: 在 `127.0.0.1:5173` 页面上下文中清空并导入 JSON**

Run: `node - <<'NODE' ... playwright ... NODE`
Expected: 页面上下文内的 IndexedDB 载入备份数据

- [ ] **Step 3: 检查 7 个页面是否都能稳定渲染**

Run: `node - <<'NODE' ... console.log body text ... NODE`
Expected: 今日、项目、任务、人员、日历、深色今日、设置都有可截图内容

### Task 2: 生成 7 张截图

**Files:**
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-dashboard.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-projects.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-tasks.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-people.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-calendar.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-dashboard-dark.png`
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/docs/screenshots/vc-settings.png`

- [ ] **Step 1: 生成亮色 6 张图**

Run: `node - <<'NODE' ... playwright screenshot ... NODE`
Expected: `vc-dashboard.png`、`vc-projects.png`、`vc-tasks.png`、`vc-people.png`、`vc-calendar.png`、`vc-settings.png` 写入成功

- [ ] **Step 2: 生成深色今日图**

Run: `node - <<'NODE' ... set localStorage theme=dark ... NODE`
Expected: `vc-dashboard-dark.png` 写入成功

- [ ] **Step 3: 人工抽查图片**

Run: `ls -lh docs/screenshots` 和本地图像预览
Expected: 7 张图都存在，且画面包含备份数据

### Task 3: 更新 README 并同步

**Files:**
- Modify: `/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/README.md`

- [ ] **Step 1: 更新截图区说明**

把截图区说明改为“基于 `118studio-backup-2026-04-11.json` 导入后的页面状态拍摄”。

- [ ] **Step 2: 更新 7 张图片引用顺序**

顺序固定为：今日、项目、任务、人员、日历、深色今日、设置。

- [ ] **Step 3: 更新版本记录**

补充一条 `vc-readme-4 | 2026-04-12 | 按 2026-04-11 备份数据重做 7 张 README 页面截图`

- [ ] **Step 4: 提交并推送**

Run:
```bash
git add README.md docs/screenshots docs/superpowers/specs docs/superpowers/plans
git commit -m "Refresh vc README with backup screenshots"
git push origin vc
```

Expected: `vc` 分支远端更新成功
