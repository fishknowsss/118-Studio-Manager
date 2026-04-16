# Structure Refactor Design

## Goal

继续做结构性收口：把 Dashboard 头部和迷你日历组件化，把 Projects、Tasks、People 的列表项组件拆出，并继续把页面里的展示拼装下沉到 selector，同时补对应测试。

## Scope

- Dashboard:
  - 拆出 `DashboardHeader`
  - 拆出 `DashboardMiniCalendar`
  - 页面只保留状态、导航和拖拽事件
- Projects:
  - 拆出 `ProjectCard`
  - 拆出 `ProjectTimeline`
  - 卡片与时间轴展示数据由 selector 提供
- Tasks:
  - 拆出 `TaskItem`
  - 行展示模型由 selector 提供
- People:
  - 拆出 `PersonCard`
  - 卡片展示模型由 selector 提供

## Component Tree

### Dashboard

- `Dashboard`
  - `DashboardHeader`
  - `FocusPrimaryCard`
  - `FocusSecondaryCards`
  - `TaskPoolPanel`
  - `PeopleAssignmentPanel`
  - `DashboardMiniCalendar`

### Projects

- `Projects`
  - toolbar
  - `ProjectCard[]`
  - `ProjectTimeline`

### Tasks

- `Tasks`
  - filter bar
  - `TaskItem[]`

### People

- `People`
  - filter bar
  - `PersonCard[]`

## Selector Boundaries

- `buildDashboardHeaderModel`:
  - 输出当前日期文案、星期文案、随机引言和激励语
- `buildDashboardMiniCalendarModel`:
  - 输出月份标题、weekday、day cell、事件态
- `buildProjectCardModels`:
  - 输出项目卡片的进度、DDL 和状态标签
- `buildTaskListItemModels`:
  - 输出任务行的项目名、人员名、日期态和标签文案
- `buildPersonCardModels`:
  - 输出成员卡片的状态文案、任务数、技能与备注摘要

## Testing

- selector 单测：
  - Dashboard header model
  - mini calendar model
  - project card model
  - task list item model
  - person card model
- 结构回归：
  - Dashboard 不再内嵌头部和迷你日历实现细节
  - Projects / Tasks / People 不再在 view 文件内声明 `ProjectCard`、`ProjectTimeline`、`TaskItem`、`PersonCard`

## Constraints

- 保持现有交互和中文文案风格
- 不引入嵌套卡片
- 不把实现说明渲染进 UI
- 每个 section 最多 3 层视觉层级
