import { lazy, Suspense } from 'react'
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'

function lazyPage<T extends object>(loader: () => Promise<T>, exportName: keyof T) {
  return lazy(async () => {
    const module = await loader()
    return { default: module[exportName] as React.ComponentType }
  })
}

const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage')
const HomePage = lazyPage(() => import('./pages/HomePage'), 'HomePage')
const ProjectsPage = lazyPage(() => import('./pages/ProjectsPage'), 'ProjectsPage')
const ProjectDetailPage = lazyPage(() => import('./pages/ProjectDetailPage'), 'ProjectDetailPage')
const PeoplePage = lazyPage(() => import('./pages/PeoplePage'), 'PeoplePage')
const PersonDetailPage = lazyPage(() => import('./pages/PersonDetailPage'), 'PersonDetailPage')
const TasksPage = lazyPage(() => import('./pages/TasksPage'), 'TasksPage')
const CalendarPage = lazyPage(() => import('./pages/CalendarPage'), 'CalendarPage')
const DailyPlannerPage = lazyPage(() => import('./pages/DailyPlannerPage'), 'DailyPlannerPage')
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage')

const createRouter = import.meta.env.PROD ? createHashRouter : createBrowserRouter

function PageLoader() {
  return <div className="py-12 text-center text-sm text-text-secondary">页面加载中...</div>
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

const router = createRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'dashboard', element: withSuspense(<DashboardPage />) },
      { path: 'projects', element: withSuspense(<ProjectsPage />) },
      { path: 'projects/:id', element: withSuspense(<ProjectDetailPage />) },
      { path: 'people', element: withSuspense(<PeoplePage />) },
      { path: 'people/:id', element: withSuspense(<PersonDetailPage />) },
      { path: 'tasks', element: withSuspense(<TasksPage />) },
      { path: 'calendar', element: withSuspense(<CalendarPage />) },
      { path: 'planner/:date', element: withSuspense(<DailyPlannerPage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
