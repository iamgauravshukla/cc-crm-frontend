import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import api from '../services/api';
import { FiUsers, FiShield, FiClock, FiMail, FiUserCheck, FiEdit, FiTrash2, FiKey, FiX } from 'react-icons/fi';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.role !== 'Admin') {
      navigate('/dashboard');
      return;
    }

    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getRoleClass = (role) => {
    return role === 'Admin' ? 'role-badge-admin' : 'role-badge-agent';
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Modal handlers
  const openRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowRoleModal(false);
    setShowPasswordModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
    setNewRole('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Update user role
  const handleUpdateRole = async () => {
    try {
      setActionLoading(true);
      setError('');
      
      const response = await api.put(`/auth/users/${selectedUser.userId}/role`, {
        role: newRole
      });

      if (response.data.success) {
        setSuccessMessage('User role updated successfully');
        fetchUsers();
        closeModals();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  // Change user password
  const handleChangePassword = async () => {
    try {
      setActionLoading(true);
      setError('');

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setActionLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        setActionLoading(false);
        return;
      }

      const response = await api.put(`/auth/users/${selectedUser.userId}/password`, {
        newPassword
      });

      if (response.data.success) {
        setSuccessMessage('Password changed successfully');
        closeModals();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      setError('');

      const response = await api.delete(`/auth/users/${selectedUser.userId}`);

      if (response.data.success) {
        setSuccessMessage('User deleted successfully');
        fetchUsers();
        closeModals();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="page-header">
            <div className="header-content">
              <div className="header-title-group">
                <h1><FiUsers className="page-icon" /> Users Management</h1>
                <p className="page-subtitle">Manage all system users, roles, and track activity</p>
              </div>
            </div>
            <div className="stats-summary">
              <div className="stat-item stat-admin">
                <FiShield size={20} />
                <div className="stat-content">
                  <span className="stat-number">{users.filter(u => u.role === 'Admin').length}</span>
                  <span className="stat-label">Admins</span>
                </div>
              </div>
              <div className="stat-item stat-agent">
                <FiUserCheck size={20} />
                <div className="stat-content">
                  <span className="stat-number">{users.filter(u => u.role === 'Agent').length}</span>
                  <span className="stat-label">Agents</span>
                </div>
              </div>
              <div className="stat-item stat-total">
                <FiUsers size={20} />
                <div className="stat-content">
                  <span className="stat-number">{users.length}</span>
                  <span className="stat-label">Total Users</span>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          {loading ? (
            <Loader message="Loading users..." />
          ) : (
            <div className="users-table-container">
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><FiMail /> Email</th>
                      <th><FiUserCheck /> Name</th>
                      <th><FiShield /> Role</th>
                      <th><FiClock /> Created At</th>
                      <th><FiClock /> Last Login</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center">No users found</td>
                      </tr>
                    ) : (
                      users.map((user, index) => (
                        <tr key={user.userId}>
                          <td>{index + 1}</td>
                          <td className="email-cell">{user.email}</td>
                          <td className="name-cell">{user.name}</td>
                          <td>
                            <span className={`role-badge ${getRoleClass(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(user.createdAt)}</td>
                          <td className="date-cell">
                            <div className="last-login-cell">
                              <div>{formatDate(user.lastLogin)}</div>
                              <small className="time-since">{getTimeSince(user.lastLogin)}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${getTimeSince(user.lastLogin).includes('day') && !getTimeSince(user.lastLogin).includes('0 day') ? 'status-inactive' : 'status-active'}`}>
                              {getTimeSince(user.lastLogin).includes('day') && !getTimeSince(user.lastLogin).includes('0 day') ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="action-btn action-btn-edit"
                                onClick={() => openRoleModal(user)}
                                title="Edit Role"
                              >
                                <FiEdit />
                              </button>
                              <button 
                                className="action-btn action-btn-password"
                                onClick={() => openPasswordModal(user)}
                                title="Change Password"
                              >
                                <FiKey />
                              </button>
                              <button 
                                className="action-btn action-btn-delete"
                                onClick={() => openDeleteModal(user)}
                                title="Delete User"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiEdit /> Edit User Role</h2>
              <button className="modal-close" onClick={closeModals}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-user-info">
                <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
              </p>
              <div className="form-group">
                <label>Select Role</label>
                <select 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value)}
                  className="form-control"
                >
                  <option value="Admin">Admin</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeModals}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdateRole}
                disabled={actionLoading || newRole === selectedUser?.role}
              >
                {actionLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiKey /> Change Password</h2>
              <button className="modal-close" onClick={closeModals}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-user-info">
                <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
              </p>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-control"
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-control"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeModals}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleChangePassword}
                disabled={actionLoading || !newPassword || !confirmPassword}
              >
                {actionLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiTrash2 /> Delete User</h2>
              <button className="modal-close" onClick={closeModals}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-warning">
                Are you sure you want to delete this user?
              </p>
              <p className="modal-user-info">
                <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
              </p>
              <p className="modal-warning-text">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeModals}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UsersManagement;
