import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { Login } from './pages/Login.jsx'
import { Register } from './pages/Register.jsx'
import { SSOSuccess } from './pages/SSOSuccess.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { Developer } from './pages/Developer.jsx';

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
      path: "/developer",
      element: <ProtectedRoute><Developer /></ProtectedRoute>
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
