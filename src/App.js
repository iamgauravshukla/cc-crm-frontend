import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateBooking from './pages/CreateBooking';
import OldBookings from './pages/OldBookings';
import Analytics from './pages/Analytics';
import AgentPerformance from './pages/AgentPerformance';
import AdPerformance from './pages/AdPerformance';
import DailyReports from './pages/DailyReports';
import CCBookingReport from './pages/CCBookingReport';
import SalesReport from './pages/SalesReport';
import UsersManagement from './pages/UsersManagement';
import ConfigPage      from './pages/ConfigPage';
import CustomerLookup from './pages/CustomerLookup';
import WebsiteLeads from './pages/WebsiteLeads';
import KanbanBoard from './pages/KanbanBoard';
import SessionTracker from './pages/SessionTracker';
import ChatQA from './pages/ChatQA';
import ImportData from './pages/ImportData';
import LeadsTest from './pages/LeadsTest';
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
          <Route path="/leads-test" element={<LeadsTest />} />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } />
          {/* Public self-signup is disabled — accounts are created by Admins in Users Management */}
          <Route path="/signup" element={<Navigate to="/login" />} />
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
          <Route path="/session-tracker" element={
            <PrivateRoute>
              <SessionTracker />
            </PrivateRoute>
          } />
          <Route path="/chat-qa" element={
            <PrivateRoute>
              <ChatQA />
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
          <Route path="/daily-reports" element={
            <PrivateRoute>
              <DailyReports />
            </PrivateRoute>
          } />
          <Route path="/cc-booking-report" element={
            <PrivateRoute>
              <CCBookingReport />
            </PrivateRoute>
          } />
          <Route path="/sales-report" element={
            <PrivateRoute>
              <SalesReport />
            </PrivateRoute>
          } />
          <Route path="/users-management" element={
            <AdminRoute>
              <UsersManagement />
            </AdminRoute>
          } />
          <Route path="/config" element={
            <AdminRoute>
              <ConfigPage />
            </AdminRoute>
          } />
          <Route path="/customer-lookup" element={
            <PrivateRoute>
              <CustomerLookup />
            </PrivateRoute>
          } />
          <Route path="/website-leads" element={
            <PrivateRoute>
              <WebsiteLeads />
            </PrivateRoute>
          } />
          <Route path="/kanban" element={
            <PrivateRoute>
              <KanbanBoard />
            </PrivateRoute>
          } />
          <Route path="/import-data" element={
            <AdminRoute>
              <ImportData />
            </AdminRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
