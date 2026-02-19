import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData);
      const { token, user } = response.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
        <h2>Sign In</h2>

        {error && <div className="modern-error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <button type="submit" className="btn-modern-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="modern-auth-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
