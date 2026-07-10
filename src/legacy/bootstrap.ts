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
import { shiftLocalDateKey, type BackupPayload } from './utils'
import { restoreCloudSnapshotOnBoot } from '../features/sync/bootstrapSync'
import { isCloudSyncConfigured } from '../features/sync/syncApi'
import { initializeSyncableViewState } from '../features/persistence/syncableViewState'
import { hasBackupContent } from '../features/sync/syncShared'
import { db } from './db'

let hasBooted = false
const DEMO_DATA_VERSION = 'studio-production-v2'
const DEMO_DATA_SETTING_KEY = 'demo:dataVersion'

function isLegacyDemoSnapshot(backup: BackupPayload) {
  const projectNames = new Set(backup.projects.map((project) => String(project.name || '')))
  const hasCurrentVersion = backup.settings.some((setting) => (
    setting.key === DEMO_DATA_SETTING_KEY && setting.value === DEMO_DATA_VERSION
  ))

  return !hasCurrentVersion
    && projectNames.has('品牌宣传片 · 第三季')
    && projectNames.has('线下活动视觉设计')
    && projectNames.has('社交媒体内容 · 4月')
}

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
    id: uid(),
    name: '短剧《微光便利店》01-12 集后期统筹',
    status: 'active',
    priority: 'urgent',
    startDate: shiftLocalDateKey(new Date(), -8),
    reviewDate: shiftLocalDateKey(new Date(), 0),
    deliveryDate: shiftLocalDateKey(new Date(), 2),
    endDate: shiftLocalDateKey(new Date(), 3),
    ddl: shiftLocalDateKey(new Date(), 2),
    description: '竖屏短剧 01-12 集后期统筹，含粗剪、字幕花字、调色、混音和平台送审包。',
    notes: '交付 9:16 1080x1920，平台审片版、无水印母版、封面图各一套；审查前先锁 01-06 集节奏。',
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }
  const projB: LegacyProject = {
    id: uid(),
    name: '城市文旅品牌片 60s 主片与 15s 短版',
    status: 'active',
    priority: 'high',
    startDate: shiftLocalDateKey(new Date(), -4),
    reviewDate: shiftLocalDateKey(new Date(), 4),
    deliveryDate: shiftLocalDateKey(new Date(), 9),
    endDate: shiftLocalDateKey(new Date(), 10),
    ddl: shiftLocalDateKey(new Date(), 9),
    description: '城市文旅客户品牌片，输出 60 秒主片、15 秒横竖屏短版和封面静帧。',
    notes: '客户要求保留城市夜景、手作市集和青年游客三类镜头；音乐版权和航拍授权需在审查前确认。',
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }
  const projC: LegacyProject = {
    id: uid(),
    name: '毕业展互动装置记录片与现场快剪',
    status: 'active',
    priority: 'high',
    startDate: shiftLocalDateKey(new Date(), -2),
    reviewDate: shiftLocalDateKey(new Date(), 6),
    deliveryDate: shiftLocalDateKey(new Date(), 12),
    endDate: shiftLocalDateKey(new Date(), 13),
    ddl: shiftLocalDateKey(new Date(), 12),
    description: '记录毕业展互动装置的布展、开幕和观众体验，现场先出 90 秒快剪。',
    notes: '重点保留装置屏幕内容、观众互动和作品铭牌；拍摄授权名单由制片统一确认。',
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }
  const projD: LegacyProject = {
    id: uid(),
    name: '品牌账号七月内容矩阵 12 条短视频',
    status: 'active',
    priority: 'medium',
    startDate: shiftLocalDateKey(new Date(), 1),
    reviewDate: shiftLocalDateKey(new Date(), 8),
    deliveryDate: shiftLocalDateKey(new Date(), 15),
    endDate: shiftLocalDateKey(new Date(), 16),
    ddl: shiftLocalDateKey(new Date(), 15),
    description: '品牌账号七月短视频矩阵，覆盖产品教程、幕后花絮、口播和活动预告。',
    notes: '每条需同步封面、标题、字幕和发布平台备注；先完成 4 条样片给运营确认。',
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }
  const projE: LegacyProject = {
    id: uid(),
    name: '三维片头资产库与包装模板',
    status: 'active',
    priority: 'medium',
    startDate: shiftLocalDateKey(new Date(), 3),
    reviewDate: shiftLocalDateKey(new Date(), 13),
    deliveryDate: shiftLocalDateKey(new Date(), 21),
    endDate: shiftLocalDateKey(new Date(), 23),
    ddl: shiftLocalDateKey(new Date(), 21),
    description: '沉淀节目片头、转场、字幕条和角标模板，服务后续短剧与栏目包装。',
    notes: '交付 AE 模板、C4D 源文件、渲染预设和命名规范；先做 3 套风格样机。',
    createdAt: timestamp(),
    updatedAt: timestamp(),
  }

  const tasks: LegacyTask[] = [
    { id: uid(), projectId: projA.id, title: '01-06 集粗剪锁节奏', status: 'done', priority: 'urgent', assigneeIds: [alice.id, he.id], scheduledDate: shiftLocalDateKey(new Date(), -2), startDate: shiftLocalDateKey(new Date(), -6), endDate: shiftLocalDateKey(new Date(), -2), estimatedHours: 18, description: '完成前 6 集结构和节奏锁定。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '07-12 集字幕花字校对', status: 'in-progress', priority: 'urgent', assigneeIds: [bob.id, iris.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), -1), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 10, description: '统一角色名、平台敏感词和花字动效。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '平台送审包导出', status: 'blocked', priority: 'urgent', assigneeIds: [grace.id], scheduledDate: shiftLocalDateKey(new Date(), 1), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 2), estimatedHours: 5, description: '等待客户补齐片尾免责声明和版权授权编号。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '主片精剪与旁白节奏', status: 'in-progress', priority: 'high', assigneeIds: [alice.id, emma.id], scheduledDate: shiftLocalDateKey(new Date(), 1), startDate: shiftLocalDateKey(new Date(), -2), endDate: shiftLocalDateKey(new Date(), 3), estimatedHours: 14, description: '按 60 秒主片结构压缩城市段落。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '音乐版权确认', status: 'blocked', priority: 'high', assigneeIds: [grace.id], scheduledDate: shiftLocalDateKey(new Date(), 2), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 4), estimatedHours: 3, description: '版权方尚未回复可商用范围，影响审片版本输出。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '15 秒竖版短版适配', status: 'todo', priority: 'high', assigneeIds: [jay.id, bob.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 4), endDate: shiftLocalDateKey(new Date(), 7), estimatedHours: 8, description: '从主片拆出竖屏短版并补字幕安全区。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '现场机位与收音清单', status: 'done', priority: 'high', assigneeIds: [david.id, he.id], scheduledDate: shiftLocalDateKey(new Date(), -1), startDate: shiftLocalDateKey(new Date(), -2), endDate: shiftLocalDateKey(new Date(), -1), estimatedHours: 4, description: '确认布展、开幕和观众体验三组机位。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '90 秒快剪模板', status: 'in-progress', priority: 'high', assigneeIds: [alice.id, jay.id], scheduledDate: shiftLocalDateKey(new Date(), 2), startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 4), estimatedHours: 9, description: '预设片头、作品信息条和快速调色节点。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '作品授权名单核对', status: 'todo', priority: 'high', assigneeIds: [grace.id, emma.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 3), endDate: shiftLocalDateKey(new Date(), 5), estimatedHours: 4, description: '未授权作品不进入正片特写镜头。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '前 4 条脚本和分镜锁定', status: 'todo', priority: 'medium', assigneeIds: [emma.id, carol.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 4), estimatedHours: 7, description: '先锁产品教程和幕后花絮两类模板。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '批量封面版式', status: 'todo', priority: 'medium', assigneeIds: [carol.id, iris.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 4), endDate: shiftLocalDateKey(new Date(), 7), estimatedHours: 6, description: '统一封面标题层级和品牌角标。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, title: '发布平台备注整理', status: 'todo', priority: 'low', assigneeIds: [grace.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 8), endDate: shiftLocalDateKey(new Date(), 11), estimatedHours: 3, description: '整理视频号、小红书、抖音不同发布字段。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projE.id, title: '三维片头风格样机', status: 'todo', priority: 'medium', assigneeIds: [frank.id, bob.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 4), endDate: shiftLocalDateKey(new Date(), 10), estimatedHours: 16, description: '先出 3 套片头和转场样机给内部评审。', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projE.id, title: '字幕条和角标模板规范', status: 'todo', priority: 'medium', assigneeIds: [jay.id, iris.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 11), endDate: shiftLocalDateKey(new Date(), 17), estimatedHours: 10, description: '命名、字体、版本号和导出预设统一归档。', createdAt: timestamp(), updatedAt: timestamp() },
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
    { id: uid(), projectId: projA.id, projectName: projA.name || '', clientName: '青石影业', requirements: '01-12 集竖屏短剧送审包，含平台审片版、无水印母版和封面图。', styleNotes: '节奏紧凑，字幕清楚，花字不要抢对白。', prohibitions: '不要使用未授权音乐，不保留临时水印。', referenceUrls: [{ label: '平台规范', url: 'https://example.com/short-drama-spec' }], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, projectName: projB.name || '', clientName: '澄江文旅', requirements: '60 秒主片、15 秒横版和 15 秒竖版短版，均需带字幕版和无字幕版。', styleNotes: '真实、明亮，镜头节奏要保留城市烟火气。', prohibitions: '避免过度滤镜，不使用未经授权航拍镜头。', referenceUrls: [{ label: '审片链接', url: 'https://example.com/review-city-film' }], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, projectName: projC.name || '', clientName: '艺术设计学院', requirements: '现场 90 秒快剪和 4 分钟记录片，需覆盖布展、开幕和观众互动。', styleNotes: '画面干净，作品信息清晰，节奏不做夸张转场。', prohibitions: '未授权作品不做特写，不拍摄未授权学生正脸。', referenceUrls: [], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projD.id, projectName: projD.name || '', clientName: '映禾品牌运营', requirements: '12 条短视频，统一封面、字幕、标题和平台发布备注。', styleNotes: '轻快、直接，口播内容要有明确开头和结尾。', prohibitions: '不要堆过多贴纸，不使用夸张促销口吻。', referenceUrls: [{ label: '选题表', url: 'https://example.com/content-calendar' }], createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projE.id, projectName: projE.name || '', clientName: '118 Studio 内部', requirements: 'AE 模板、C4D 源文件、渲染预设和命名规范，供后续短剧和栏目包装复用。', styleNotes: '机械感、干净、易改字，颜色可按项目替换。', prohibitions: '不要依赖本机字体，不提交未整理贴图路径。', referenceUrls: [], createdAt: timestamp(), updatedAt: timestamp() },
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
  await db.put('settings', { key: DEMO_DATA_SETTING_KEY, value: DEMO_DATA_VERSION, updatedAt: timestamp() })
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
  } else if (!cloudSyncConfigured && isLegacyDemoSnapshot(localBackup)) {
    await db.clearAll()
    await seedDemoData()
  }

  await store.loadAll()

  if (!window.location.hash) {
    window.location.hash = '#dashboard'
  }

  await initializeSyncableViewState()
}

export function disposeLegacyApp() {
  hasBooted = false
}
