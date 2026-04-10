import { Navigate, createBrowserRouter, createHashRouter, RouterProvider } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'

const createRouter = import.meta.env.PROD ? createHashRouter : createBrowserRouter

const router = createRouter([
  { path: '/', element: <DashboardPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
