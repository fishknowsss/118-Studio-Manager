import { openDB } from './db'
import {
  store,
  type ClassScheduleEntry,
  type LegacyPerson,
  type LegacyProject,
  type LegacyTask,
  type ShortDrama,
  type ShortDramaAssignment,
  type ShortDramaGroup,
} from './store'
import { shiftLocalDateKey } from './utils'
import { restoreCloudSnapshotOnBoot } from '../features/sync/bootstrapSync'
import { isCloudSyncConfigured } from '../features/sync/syncApi'
import { initializeSyncableViewState } from '../features/persistence/syncableViewState'
import { hasBackupContent } from '../features/sync/syncShared'
import { db } from './db'

let hasBooted = false

async function seedDemoData() {
  const uid = () => crypto.randomUUID()
  const timestamp = () => new Date().toISOString()

  const alice: LegacyPerson = { id: uid(), name: '陈佳宁', gender: 'female', status: 'active', skills: ['视频剪辑', 'After Effects', '调色'], notes: '主视频剪辑师', createdAt: timestamp(), updatedAt: timestamp() }
  const bob: LegacyPerson = { id: uid(), name: '王浩然', gender: 'male', status: 'active', skills: ['动态设计', 'Cinema 4D', '建模'], notes: '', createdAt: timestamp(), updatedAt: timestamp() }
  const carol: LegacyPerson = { id: uid(), name: '刘思敏', gender: 'female', status: 'active', skills: ['平面设计', 'Figma', '插画'], notes: '兼顾社媒', createdAt: timestamp(), updatedAt: timestamp() }
  const david: LegacyPerson = { id: uid(), name: '周明远', className: '数媒 2301', studentNo: '23011804', email: 'zhoumingyuan@example.com', gender: 'male', status: 'active', skills: ['摄影', '灯光', '达芬奇'], notes: '外拍和棚拍主力', createdAt: timestamp(), updatedAt: timestamp() }
  const emma: LegacyPerson = { id: uid(), name: '沈一禾', className: '视传 2302', studentNo: '23011805', email: 'shenyhe@example.com', gender: 'female', status: 'active', skills: ['分镜', '脚本', '运营'], notes: '负责短剧脚本和账号排期', createdAt: timestamp(), updatedAt: timestamp() }
  const frank: LegacyPerson = { id: uid(), name: '赵景然', className: '动画 2201', studentNo: '22011806', email: 'zhaojr@example.com', gender: 'male', status: 'active', skills: ['三维动画', '绑定', 'C4D'], notes: '复杂动画提前排期', createdAt: timestamp(), updatedAt: timestamp() }
  const grace: LegacyPerson = { id: uid(), name: '唐若溪', className: '广编 2303', studentNo: '23011807', email: 'tangrx@example.com', gender: 'female', status: 'active', skills: ['制片', '统筹', '采访'], notes: '跟客户确认反馈', createdAt: timestamp(), updatedAt: timestamp() }
  const he: LegacyPerson = { id: uid(), name: '何书言', className: '摄影 2202', studentNo: '22011808', email: 'hesy@example.com', gender: 'other', status: 'active', skills: ['收音', '剪辑助理', '素材整理'], notes: '晚间可协助素材归档', createdAt: timestamp(), updatedAt: timestamp() }
  const iris: LegacyPerson = { id: uid(), name: '林知夏', className: '视传 2401', studentNo: '24011809', email: 'linzx@example.com', gender: 'female', status: 'active', skills: ['排版', '海报', '字体'], notes: '新成员，适合轻量视觉任务', createdAt: timestamp(), updatedAt: timestamp() }
  const jay: LegacyPerson = { id: uid(), name: '马承宇', className: '数媒 2203', studentNo: '22011810', email: 'machy@example.com', gender: 'male', status: 'active', skills: ['前端', '交互原型', '数据整理'], notes: '负责展示页和交互 demo', createdAt: timestamp(), updatedAt: timestamp() }

  const projA: LegacyProject = {
    id: uid(), name: '品牌宣传片 · 第三季', status: 'active', priority: 'urgent',
    ddl: shiftLocalDateKey(new Date(), 1), description: '客户品牌年度宣传片，3分钟正片+15s短版，需要4K交付。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projB: LegacyProject = {
    id: uid(), name: '线下活动视觉设计', status: 'active', priority: 'high',
    ddl: shiftLocalDateKey(new Date(), 5), description: '5月线下沙龙活动——VI设计、海报、物料、现场大屏素材。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projC: LegacyProject = {
    id: uid(), name: '社交媒体内容 · 4月', status: 'active', priority: 'medium',
    ddl: shiftLocalDateKey(new Date(), 18), description: '小红书 + 微博 + 视频号月度内容矩阵，共20条。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projD: LegacyProject = {
    id: uid(), name: '校园开放日短片', status: 'active', priority: 'high',
    ddl: shiftLocalDateKey(new Date(), 8), description: '招生开放日现场拍摄与 90 秒混剪，需要当天出预览版。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projE: LegacyProject = {
    id: uid(), name: '产品发布会物料包', status: 'paused', priority: 'medium',
    ddl: shiftLocalDateKey(new Date(), 12), description: '发布会主视觉、KV 延展、邀请函和直播间贴片。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }

  const tasks: LegacyTask[] = [
    { id: uid(), projectId: projA.id, title: '音效混音终版', status: 'in-progress', priority: 'urgent', assigneeIds: [alice.id, bob.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), -1), endDate: shiftLocalDateKey(new Date(), 0), estimatedHours: 4, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '客户修改版渲染输出', status: 'todo', priority: 'urgent', assigneeIds: [alice.id], scheduledDate: shiftLocalDateKey(new Date(), 1), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 2, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '片头动画调整', status: 'done', priority: 'high', assigneeIds: [bob.id], scheduledDate: shiftLocalDateKey(new Date(), -2), startDate: shiftLocalDateKey(new Date(), -3), endDate: shiftLocalDateKey(new Date(), -2), estimatedHours: 6, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: 'VI色彩方案提案', status: 'in-progress', priority: 'high', assigneeIds: [carol.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 8, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '活动海报 A3 版设计', status: 'todo', priority: 'high', assigneeIds: [carol.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 2), endDate: shiftLocalDateKey(new Date(), 3), estimatedHours: 6, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '现场大屏动画', status: 'todo', priority: 'medium', assigneeIds: [bob.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 3), endDate: shiftLocalDateKey(new Date(), 4), estimatedHours: 10, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '4月选题列表', status: 'todo', priority: 'medium', assigneeIds: [], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 2), estimatedHours: 2, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '拍摄脚本撰写', status: 'todo', priority: 'low', assigneeIds: [], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 3), endDate: shiftLocalDateKey(new Date(), 5), estimatedHours: 4, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '开放日采访提纲', status: 'in-progress', priority: 'high', assigneeIds: [emma.id, grace.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 2), estimatedHours: 5, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '机位和收音清单', status: 'todo', priority: 'high', assigneeIds: [david.id, he.id], scheduledDate: shiftLocalDateKey(new Date(), 1), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 3, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '现场快剪模板', status: 'in-progress', priority: 'medium', assigneeIds: [alice.id, jay.id], scheduledDate: shiftLocalDateKey(new Date(), 2), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 3), estimatedHours: 6, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projE.id, title: '发布会 KV 延展', status: 'blocked', priority: 'medium', assigneeIds: [carol.id, iris.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 4), endDate: shiftLocalDateKey(new Date(), 7), estimatedHours: 9, description: '等待客户确认主视觉方向。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projE.id, title: '直播间贴片动效', status: 'todo', priority: 'medium', assigneeIds: [bob.id, frank.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 6), endDate: shiftLocalDateKey(new Date(), 9), estimatedHours: 12, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '现场物料打样检查', status: 'todo', priority: 'urgent', assigneeIds: [grace.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 0), estimatedHours: 2, description: '', createdAt: timestamp(), updatedAt: timestamp() },
  ]

  const people = [alice, bob, carol, david, emma, frank, grace, he, iris, jay]
  const projects = [projA, projB, projC, projD, projE]

  const scheduleEntries: ClassScheduleEntry[] = [
    { id: uid(), personId: alice.id, personName: alice.name || '', className: '数媒 2201', courseName: '影视后期合成', dayOfWeek: 1, startSection: 1, endSection: 3, weeksText: '1-16周', location: '艺设楼 305', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: bob.id, personName: bob.name || '', className: '动画 2201', courseName: '动态图形', dayOfWeek: 1, startSection: 2, endSection: 4, weeksText: '1-16周', location: '艺设楼 402', teacher: '马老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: carol.id, personName: carol.name || '', className: '视传 2302', courseName: '品牌视觉系统', dayOfWeek: 1, startSection: 3, endSection: 5, weeksText: '1-16周', location: '设计楼 210', teacher: '钱老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: iris.id, personName: iris.name || '', className: iris.className || '', courseName: '字体设计', dayOfWeek: 1, startSection: 6, endSection: 7, weeksText: '1-16周', location: '设计楼 318', teacher: '赵老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: bob.id, personName: bob.name || '', className: '动画 2201', courseName: '三维动画设计', dayOfWeek: 2, startSection: 1, endSection: 4, weeksText: '1-16周', location: '动画机房 B', teacher: '周老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: frank.id, personName: frank.name || '', className: frank.className || '', courseName: '角色绑定', dayOfWeek: 2, startSection: 2, endSection: 5, weeksText: '1-16周', location: '动画机房 A', teacher: '冯老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: david.id, personName: david.name || '', className: david.className || '', courseName: '摄影棚实践', dayOfWeek: 2, startSection: 3, endSection: 6, weeksText: '1-14周', location: '摄影棚 1', teacher: '郑老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: alice.id, personName: alice.name || '', className: '数媒 2201', courseName: '数字调色基础', dayOfWeek: 2, startSection: 7, endSection: 8, weeksText: '1-12周', location: '影像实验室', teacher: '许老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: alice.id, personName: alice.name || '', className: '数媒 2201', courseName: '影像叙事', dayOfWeek: 3, startSection: 1, endSection: 3, weeksText: '1-16周', location: '传媒楼 201', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: bob.id, personName: bob.name || '', className: '动画 2201', courseName: '运动规律', dayOfWeek: 3, startSection: 1, endSection: 3, weeksText: '1-16周', location: '动画机房 B', teacher: '马老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: carol.id, personName: carol.name || '', className: '视传 2302', courseName: '信息可视化', dayOfWeek: 3, startSection: 2, endSection: 4, weeksText: '1-16周', location: '设计楼 210', teacher: '钱老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: david.id, personName: david.name || '', className: david.className || '', courseName: '影视布光', dayOfWeek: 3, startSection: 2, endSection: 5, weeksText: '1-14周', location: '摄影棚 2', teacher: '郑老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: emma.id, personName: emma.name || '', className: emma.className || '', courseName: '新媒体脚本写作', dayOfWeek: 3, startSection: 3, endSection: 5, weeksText: '1-16周', location: '文创楼 106', teacher: '韩老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: grace.id, personName: grace.name || '', className: grace.className || '', courseName: '制片管理', dayOfWeek: 4, startSection: 1, endSection: 4, weeksText: '1-16周', location: '传媒楼 203', teacher: '李老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: he.id, personName: he.name || '', className: he.className || '', courseName: '同期录音', dayOfWeek: 4, startSection: 1, endSection: 4, weeksText: '1-12周', location: '录音棚', teacher: '顾老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: iris.id, personName: iris.name || '', className: iris.className || '', courseName: '版式设计', dayOfWeek: 4, startSection: 2, endSection: 4, weeksText: '1-16周', location: '设计楼 318', teacher: '赵老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: jay.id, personName: jay.name || '', className: jay.className || '', courseName: '交互原型设计', dayOfWeek: 4, startSection: 2, endSection: 5, weeksText: '1-16周', location: '数媒实验室', teacher: '陈老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: bob.id, personName: bob.name || '', className: '动画 2201', courseName: '动画短片创作', dayOfWeek: 4, startSection: 3, endSection: 5, weeksText: '1-16周', location: '动画机房 A', teacher: '周老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: carol.id, personName: carol.name || '', className: '视传 2302', courseName: '品牌提案', dayOfWeek: 4, startSection: 5, endSection: 6, weeksText: '1-16周', location: '设计楼 210', teacher: '钱老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: alice.id, personName: alice.name || '', className: '数媒 2201', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: bob.id, personName: bob.name || '', className: '动画 2201', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: carol.id, personName: carol.name || '', className: '视传 2302', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: david.id, personName: david.name || '', className: david.className || '', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: emma.id, personName: emma.name || '', className: emma.className || '', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: frank.id, personName: frank.name || '', className: frank.className || '', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: grace.id, personName: grace.name || '', className: grace.className || '', courseName: '毕业创作工作坊', dayOfWeek: 5, startSection: 1, endSection: 4, weeksText: '1-16周', location: '综合工作室', teacher: '梁老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), personId: jay.id, personName: jay.name || '', className: jay.className || '', courseName: '网页发布实训', dayOfWeek: 5, startSection: 6, endSection: 8, weeksText: '1-16周', location: '数媒实验室', teacher: '陈老师', sourceFileName: '演示课表.pdf', createdAt: timestamp(), updatedAt: timestamp() },
  ]

  const dramaA: ShortDrama = { id: uid(), title: '微光便利店', totalEpisodes: 24, status: 'in-progress', startDate: shiftLocalDateKey(new Date(), -12), endDate: shiftLocalDateKey(new Date(), 16), notes: '竖屏短剧，主打夜间治愈感。', createdAt: timestamp(), updatedAt: timestamp() }
  const dramaB: ShortDrama = { id: uid(), title: '第七次重拍', totalEpisodes: 18, status: 'review', startDate: shiftLocalDateKey(new Date(), -20), endDate: shiftLocalDateKey(new Date(), 6), notes: '校园轻喜剧，部分集数已送审。', createdAt: timestamp(), updatedAt: timestamp() }
  const groupA: ShortDramaGroup = { id: uid(), dramaId: dramaA.id, name: 'A 组剪辑', memberIds: [alice.id, he.id, jay.id], leaderId: alice.id, sortOrder: 1, notes: '负责 1-12 集粗剪与包装。', createdAt: timestamp(), updatedAt: timestamp() }
  const groupB: ShortDramaGroup = { id: uid(), dramaId: dramaA.id, name: 'B 组包装', memberIds: [bob.id, frank.id, iris.id], leaderId: bob.id, sortOrder: 2, notes: '负责字幕、片头和转场。', createdAt: timestamp(), updatedAt: timestamp() }
  const groupC: ShortDramaGroup = { id: uid(), dramaId: dramaB.id, name: '送审组', memberIds: [emma.id, grace.id, carol.id], leaderId: grace.id, sortOrder: 1, notes: '对接平台反馈。', createdAt: timestamp(), updatedAt: timestamp() }
  const assignments: ShortDramaAssignment[] = [
    { id: uid(), dramaId: dramaA.id, groupId: groupA.id, episodes: '1-4', producerIds: [alice.id, he.id], ownerId: alice.id, status: 'done', estimatedHours: 18, actualHours: 20, startDate: shiftLocalDateKey(new Date(), -10), endDate: shiftLocalDateKey(new Date(), -5), finishedDurationSeconds: 312, allocations: [{ personId: alice.id, episodes: '1-2', estimatedHours: 8, actualHours: 9 }, { personId: he.id, episodes: '3-4', estimatedHours: 8, actualHours: 9 }], notes: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), dramaId: dramaA.id, groupId: groupA.id, episodes: '5-8', producerIds: [alice.id, jay.id], ownerId: alice.id, status: 'review', estimatedHours: 16, actualHours: 14, startDate: shiftLocalDateKey(new Date(), -3), endDate: shiftLocalDateKey(new Date(), 1), finishedDurationSeconds: 286, allocations: [{ personId: alice.id, episodes: '5-6', estimatedHours: 7, actualHours: 6 }, { personId: jay.id, episodes: '7-8', estimatedHours: 7, actualHours: 6 }], notes: '等客户确认节奏。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), dramaId: dramaA.id, groupId: groupB.id, episodes: '9-12', producerIds: [bob.id, frank.id, iris.id], ownerId: bob.id, status: 'in-progress', estimatedHours: 20, actualHours: 7, startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 5), finishedDurationSeconds: null, allocations: [{ personId: bob.id, episodes: '9-10', estimatedHours: 8, actualHours: 3 }, { personId: frank.id, episodes: '11', estimatedHours: 5, actualHours: 2 }, { personId: iris.id, episodes: '12', estimatedHours: 4, actualHours: 1 }], notes: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), dramaId: dramaA.id, groupId: groupB.id, episodes: '13-16', producerIds: [frank.id, iris.id], ownerId: frank.id, status: 'not-started', estimatedHours: 14, actualHours: 0, startDate: shiftLocalDateKey(new Date(), 5), endDate: shiftLocalDateKey(new Date(), 10), finishedDurationSeconds: null, allocations: [{ personId: frank.id, episodes: '13-14', estimatedHours: 7 }, { personId: iris.id, episodes: '15-16', estimatedHours: 5 }], notes: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), dramaId: dramaB.id, groupId: groupC.id, episodes: '1-6', producerIds: [emma.id, grace.id], ownerId: grace.id, status: 'revision', estimatedHours: 12, actualHours: 15, startDate: shiftLocalDateKey(new Date(), -8), endDate: shiftLocalDateKey(new Date(), -1), finishedDurationSeconds: 410, allocations: [{ personId: emma.id, episodes: '文案', estimatedHours: 4, actualHours: 5 }, { personId: grace.id, episodes: '送审', estimatedHours: 4, actualHours: 6 }], notes: '平台要求补免责声明。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), dramaId: dramaB.id, groupId: groupC.id, episodes: '7-10', producerIds: [carol.id, emma.id], ownerId: emma.id, status: 'review', estimatedHours: 10, actualHours: 9, startDate: shiftLocalDateKey(new Date(), -4), endDate: shiftLocalDateKey(new Date(), 2), finishedDurationSeconds: 276, allocations: [{ personId: carol.id, episodes: '视觉', estimatedHours: 4, actualHours: 4 }, { personId: emma.id, episodes: '文案', estimatedHours: 3, actualHours: 3 }], notes: '', createdAt: timestamp(), updatedAt: timestamp() },
  ]

  const briefs = [
    { id: uid(), projectId: projA.id, projectName: projA.name || '', clientName: '青石影业', requirements: '正片 3 分钟内，15 秒短版同步输出。重点突出新品质感和团队协作镜头。', styleNotes: '偏冷静、高级、少口号；可参考黑银色系科技片。', prohibitions: '不要夸张转场，不使用免费素材站水印镜头。', referenceUrls: [{ label: '参考片 A', url: 'https://example.com/reference-a' }], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, projectName: projB.name || '', clientName: '城市设计周', requirements: '活动主视觉、A3 海报、导视贴纸和现场大屏循环动画。', styleNotes: '明亮、年轻、有城市街区感；字体要足够醒目。', prohibitions: '避免土黄色和过度复古纹理。', referenceUrls: [{ label: '品牌手册', url: 'https://example.com/brand-guide' }], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, projectName: projD.name || '', clientName: '招生办公室', requirements: '开放日当天快速出 90 秒预览，次日交完整 3 分钟版。', styleNotes: '真实、明亮、节奏轻快，多保留学生互动。', prohibitions: '不要使用过暗滤镜，不拍摄未授权学生正脸特写。', referenceUrls: [], createdAt: timestamp(), updatedAt: timestamp() },
  ]
  const accounts = [
    { id: uid(), platform: 'Figma 团队空间', url: 'https://figma.com', account: 'studio-design@example.com', password: 'demo-only', note: '设计文件与客户预览链接', category: 'design', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), platform: 'Frame.io 审片', url: 'https://frame.io', account: 'review@example.com', password: 'demo-only', note: '客户审片与批注', category: 'media', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), platform: '素材云盘', url: 'https://example.com/cloud', account: 'studio-share@example.com', password: 'demo-only', note: '只放演示账号，不保存真实密码', category: 'cloud', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), platform: '视频号运营', url: 'https://example.com/social', account: 'studio-social@example.com', password: 'demo-only', note: '发布前需二次确认', category: 'social', createdAt: timestamp(), updatedAt: timestamp() },
  ]
  const folders = {
    items: ['设计工具', '审片交付', '云盘资料', '社媒账号'],
    colors: {
      '设计工具': '#4166F5',
      '审片交付': '#14B8A6',
      '云盘资料': '#8B5CF6',
      '社媒账号': '#F97316',
    },
  }

  for (const person of people) await store.savePerson(person)
  for (const project of projects) await store.saveProject(project)
  for (const task of tasks) await store.saveTask(task)
  for (const entry of scheduleEntries) await store.saveClassScheduleEntry(entry)
  for (const drama of [dramaA, dramaB]) await store.saveShortDrama(drama)
  for (const group of [groupA, groupB, groupC]) await store.saveShortDramaGroup(group)
  for (const assignment of assignments) await store.saveShortDramaAssignment(assignment)
  await db.put('settings', { key: 'materials:briefs', value: briefs, updatedAt: timestamp() })
  await db.put('settings', { key: 'materials:accounts', value: accounts, updatedAt: timestamp() })
  await db.put('settings', { key: 'materials:folders', value: folders, updatedAt: timestamp() })
  await store.addLog('加载了演示数据')
}

export async function initializeAppData() {
  if (hasBooted) return
  hasBooted = true

  await openDB()
  await store.loadAll()
  const localBackup = await db.exportAll()
  const cloudSyncConfigured = isCloudSyncConfigured()

  if (!hasBackupContent(localBackup)) {
    if (cloudSyncConfigured) {
      try {
        await restoreCloudSnapshotOnBoot()
      } catch (error) {
        console.warn('[118SM] 云端首启恢复失败，保留空本地数据:', error)
      }
    } else {
      await seedDemoData()
    }
  }

  if (!window.location.hash) {
    window.location.hash = '#dashboard'
  }

  await initializeSyncableViewState()
}

export function disposeLegacyApp() {
  hasBooted = false
}
