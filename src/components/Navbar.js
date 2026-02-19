import React from 'react';
import { useLocation } from 'react-router-dom';
import './Navbar.css';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/create-booking': 'Create New Booking',
  '/old-bookings': 'Master Bookings',
  '/analytics': 'Analytics'
};

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const pageTitle = routeTitles[location.pathname] || 'Dashboard';

  return (
    <>
      <nav className="modern-navbar">
        <div className="navbar-left">
          <h1 className="logo">Ageless</h1>
        </div>
        <div className="navbar-right">
          {user && (
            <>
              <div className="user-profile">
                <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="btn-logout-modern" onClick={onLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
      <div className="page-title-bar">
        <h2>{pageTitle}</h2>
      </div>
    </>
  );
}

export default Navbar;
