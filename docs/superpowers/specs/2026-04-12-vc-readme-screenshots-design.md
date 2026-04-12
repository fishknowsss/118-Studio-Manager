# VC README 截图刷新设计

## 目标

基于用户提供的备份文件 `/Users/fishknowsss/Downloads/118studio-backup-2026-04-11.json`，重做 `vc` 分支 README 中的截图部分，并把截图范围扩展为 7 张页面图。

## 范围

- 使用备份 JSON 作为截图数据源
- 在 `http://127.0.0.1:5173/` 页面上下文中导入同一套数据
- 重新生成 7 张截图：
  - 今日
  - 项目
  - 任务
  - 人员
  - 日历
  - 深色今日
  - 设置
- 更新 `README.md` 的截图区说明与图片引用
- 更新版本记录

## 不做的事

- 不修改业务逻辑
- 不调整页面布局
- 不重写 README 的其余章节

## 数据策略

- 截图前清空当前 IndexedDB
- 导入备份 JSON 中的 `projects`、`tasks`、`people`
- 调用现有 store 重新加载数据，确保截图页面与导入结果一致
- 深色图仅切换主题，不更换数据

## 产出文件

- `README.md`
- `docs/screenshots/vc-dashboard.png`
- `docs/screenshots/vc-projects.png`
- `docs/screenshots/vc-tasks.png`
- `docs/screenshots/vc-people.png`
- `docs/screenshots/vc-calendar.png`
- `docs/screenshots/vc-dashboard-dark.png`
- `docs/screenshots/vc-settings.png`
