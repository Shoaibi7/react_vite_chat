import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Dashboard from './Pages/Dashboard';
import { initEcho } from './echo';
import { useEffect } from 'react';

// Wrap this in a new component *inside* AuthProvider
function AppRoutes() {
  const { token, isAuthenticated, authReady } = useAuth();

  useEffect(() => {
    // console.log('[DEBUG] Initializing Echo with token:', token);
    
    if (token) {
      initEcho(token);
    }
  }, [token]);

  function PrivateRoute({ children }) {
    if (!authReady) return <p>Loading…</p>;
    return isAuthenticated ? children : <Navigate to="/login" />;
  }

  function PublicRoute({ children }) {
    if (!authReady) return <p>Loading…</p>;
    return !isAuthenticated ? children : <Navigate to="/" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// Final App
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
