import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { Login } from './pages/Login.jsx'
import { Register } from './pages/Register.jsx'
import { SSOSuccess } from './pages/SSOSuccess.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Login />
    },
    {
      path: "/login",
      element: <Login />
    },
    {
      path: "/register",
      element: <Register />
    },
    {
      path: "/sso-success",
      element: <SSOSuccess />
    },
    {
      path: "/dashboard",
      element: <ProtectedRoute><Dashboard /></ProtectedRoute>
    }
  ])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
