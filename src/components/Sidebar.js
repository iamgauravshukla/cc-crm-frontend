import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiCalendar, FiBarChart2, FiLogOut, FiMenu, FiX, FiPlusCircle, FiMoon, FiSun, FiUsers, FiTrendingUp, FiClipboard, FiDollarSign } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Set initial collapsed state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsCollapsed(true); // Collapsed (hidden) on mobile/tablet
      } else {
        setIsCollapsed(false); // Expanded on desktop
      }
    };

    // Set initial state
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update body class when sidebar collapses/expands
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome, roles: ['Admin', 'Agent'] },
    { path: '/create-booking', label: 'Create New Booking', icon: FiPlusCircle, roles: ['Admin', 'Agent'] },
    { path: '/old-bookings', label: 'Master Bookings', icon: FiCalendar, roles: ['Admin', 'Agent'] },
    { path: '/analytics', label: 'Analytics', icon: FiBarChart2, roles: ['Admin'] },
    { path: '/daily-reports', label: 'Daily Reports', icon: FiClipboard, roles: ['Admin'] },
    { path: '/sales-report', label: 'Sales Report', icon: FiDollarSign, roles: ['Admin'] },
    { path: '/agent-performance', label: 'Agent Performance', icon: FiUsers, roles: ['Admin'] },
    { path: '/ad-performance', label: 'Ad Performance', icon: FiTrendingUp, roles: ['Admin'] },
    { path: '/users-management', label: 'Users Management', icon: FiUsers, roles: ['Admin'] },
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'Agent')
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile menu toggle button - always visible on mobile/tablet */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle menu"
      >
        {isCollapsed ? <FiMenu size={24} /> : <FiX size={24} />}
      </button>

      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {!isCollapsed && <span className="logo-text">Ageless</span>}
          </div>
          <button 
            className="sidebar-toggle desktop-only"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon className="sidebar-icon" size={20} />
                {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {/* Theme Toggle */}
          <button 
            className="sidebar-item theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <FiMoon className="sidebar-icon" size={20} /> : <FiSun className="sidebar-icon" size={20} />}
            {!isCollapsed && <span className="sidebar-label">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          {!isCollapsed && user && (
            <div className="sidebar-user">
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name || 'User'}</div>
                <div className="user-role">{user.role || 'Agent'}</div>
              </div>
            </div>
          )}
          <button 
            className="sidebar-item logout"
            onClick={handleLogout}
            title="Logout"
          >
            <FiLogOut className="sidebar-icon" size={20} />
            {!isCollapsed && <span className="sidebar-label">Logout</span>}
          </button>
        </div>
      </div>
      
      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}

export default Sidebar;
