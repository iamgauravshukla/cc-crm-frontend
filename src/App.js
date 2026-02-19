import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateBooking from './pages/CreateBooking';
import OldBookings from './pages/OldBookings';
import Analytics from './pages/Analytics';
import AgentPerformance from './pages/AgentPerformance';
import AdPerformance from './pages/AdPerformance';
import UsersManagement from './pages/UsersManagement';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const PrivateRoute = ({ children }) => {
    if (loading) {
      return <div className="loading">Loading...</div>;
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  const AdminRoute = ({ children }) => {
    if (loading) {
      return <div className="loading">Loading...</div>;
    }
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'Admin' ? children : <Navigate to="/dashboard" />;
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/signup" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard onLogout={handleLogout} />
            </PrivateRoute>
          } />
          <Route path="/create-booking" element={
            <PrivateRoute>
              <CreateBooking />
            </PrivateRoute>
          } />
          <Route path="/old-bookings" element={
            <PrivateRoute>
              <OldBookings />
            </PrivateRoute>
          } />
          <Route path="/analytics" element={
            <PrivateRoute>
              <Analytics />
            </PrivateRoute>
          } />
          <Route path="/agent-performance" element={
            <PrivateRoute>
              <AgentPerformance />
            </PrivateRoute>
          } />
          <Route path="/ad-performance" element={
            <PrivateRoute>
              <AdPerformance />
            </PrivateRoute>
          } />
          <Route path="/users-management" element={
            <AdminRoute>
              <UsersManagement />
            </AdminRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
