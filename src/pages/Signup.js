import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../services/api';

function Signup() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessError, setAccessError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Agent', // Default to Agent
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (accessPassword === 'Admin@Ageless') {
      setIsAuthorized(true);
      setAccessError('');
    } else {
      setAccessError('Invalid access password. Please contact your administrator.');
      setAccessPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      const response = await signup(signupData);
      
      const { token, user } = response.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-container">
      <div className="auth-left-section">
        <div className="auth-logo">
          <h1 className="animated-title">Ageless</h1>
          <p className="tagline">Wellness Booking System</p>
        </div>
        <div className="animated-text-container">
          <div className="animated-text-item">
            <span className="text-icon">✨</span>
            <p>Streamline Your Wellness Bookings</p>
          </div>
          <div className="animated-text-item">
            <span className="text-icon">📊</span>
            <p>Track Performance & Analytics</p>
          </div>
          <div className="animated-text-item">
            <span className="text-icon">🎯</span>
            <p>Manage Multiple Branches Efficiently</p>
          </div>
          <div className="animated-text-item">
            <span className="text-icon">💼</span>
            <p>Role-Based Access Control</p>
          </div>
        </div>
      </div>
      
      <div className="auth-right-section">
        <div className="modern-auth-card">
        
        {!isAuthorized ? (
          <>
            <h2>Access Verification</h2>
            <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
              Please enter the access password to create a new account
            </p>

            {accessError && <div className="modern-error-message">{accessError}</div>}

            <form onSubmit={handleAccessSubmit}>
              <div className="modern-form-group">
                <label htmlFor="accessPassword">Access Password</label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="accessPassword"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    required
                    placeholder="Enter access password"
                    autoFocus
                  />
                  <span className="input-icon">🔐</span>
                </div>
              </div>

              <button type="submit" className="btn-modern-primary">
                Verify Access
              </button>
            </form>

            <div className="modern-auth-link">
              Already have an account? <Link to="/login">Sign In</Link>
            </div>
          </>
        ) : (
          <>
            <h2>Create Account</h2>

            {error && <div className="modern-error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
          <div className="modern-form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
              <span className="input-icon">👤</span>
            </div>
          </div>

          <div className="modern-form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
              />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <div className="modern-form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Minimum 8 characters"
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <div className="modern-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <div className="modern-form-group">
            <label htmlFor="role">Role</label>
            <div className="input-wrapper">
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="modern-select"
              >
                <option value="Agent">Agent</option>
                <option value="Admin">Admin</option>
              </select>
              <span className="input-icon">👥</span>
            </div>
          </div>

          <button type="submit" className="btn-modern-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="modern-auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
        </>
        )}
        
        </div>
      </div>
    </div>
  );
}

export default Signup;
