import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import dayjs from 'dayjs'

export function useDashboard() {
  const todayStr = dayjs().format('YYYY-MM-DD')
  const weekLater = dayjs().add(7, 'day').format('YYYY-MM-DD')

  const stats = useLiveQuery(async () => {
    const allTasks = await db.tasks.toArray()
    const allProjects = await db.projects.toArray()
    const todayAssignments = await db.assignments.where('date').equals(todayStr).toArray()
    const allPeople = await db.people.toArray()

    const todayTasks = todayAssignments.length
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length
    const overdueTasks = allTasks.filter(t =>
      t.dueDate && t.dueDate < todayStr && t.status !== 'completed'
    ).length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length

    const upcomingDeadlines = allProjects
      .filter(p => p.deadline >= todayStr && p.deadline <= weekLater && p.status !== 'completed')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))

    const overdueProjects = allProjects
      .filter(p => p.deadline < todayStr && p.status !== 'completed')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))

    const upcomingMilestones = await db.milestones
      .where('date')
      .between(todayStr, weekLater, true, true)
      .toArray()

    const taskMap = new Map(allTasks.map(task => [task.id, task]))
    const projectMap = new Map(allProjects.map(project => [project.id, project]))
    const personMap = new Map(allPeople.map(person => [person.id, person]))
    const todayAssignmentDetails = todayAssignments
      .map(assignment => ({
        ...assignment,
        task: taskMap.get(assignment.taskId),
        project: projectMap.get(assignment.projectId),
        person: personMap.get(assignment.personId),
      }))
      .sort((a, b) => {
        const personA = a.person?.name || ''
        const personB = b.person?.name || ''
        return personA.localeCompare(personB, 'zh-CN')
      })

    return {
      todayTasks,
      inProgressTasks,
      overdueTasks,
      completedTasks,
      totalTasks: allTasks.length,
      totalProjects: allProjects.length,
      upcomingDeadlines,
      overdueProjects,
      upcomingMilestones: upcomingMilestones.sort((a, b) => a.date.localeCompare(b.date)),
      todayAssignmentDetails,
    }
  })

  return stats ?? {
    todayTasks: 0, inProgressTasks: 0, overdueTasks: 0, completedTasks: 0,
    totalTasks: 0, totalProjects: 0,
    upcomingDeadlines: [], overdueProjects: [], upcomingMilestones: [], todayAssignmentDetails: [],
  }
}
