import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as projectService from '../services/projectService'
import type { ProjectInput } from '../types/project'

export function useProjects() {
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray())

  return {
    projects: projects ?? [],
    addProject: (input: ProjectInput) => projectService.addProject(input),
    updateProject: (id: string, updates: Partial<ProjectInput>) => projectService.updateProject(id, updates),
    deleteProject: (id: string) => projectService.deleteProject(id),
  }
}

export function useProject(id: string | undefined) {
  const project = useLiveQuery(async () => {
    if (!id) return null
    return (await db.projects.get(id)) ?? null
  }, [id])
  return project
}
