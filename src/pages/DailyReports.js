import React, { useState, useEffect } from 'react';
import { getDailyReports } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FiRefreshCw, FiTrendingUp, FiDollarSign, FiCalendar, FiX } from 'react-icons/fi';
import './DailyReports.css';

const DailyReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshAt, setRefreshAt] = useState(new Date());

  // Detect dark mode
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  useEffect(() => {
    fetchDailyReports();
  }, []);

  const fetchDailyReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDailyReports();
      if (response.data && response.data.success) {
        setReports(response.data.reports);
        setRefreshAt(new Date());
      } else {
        setError('Failed to load daily reports');
      }
    } catch (err) {
      console.error('Error fetching daily reports:', err);
      setError(err.message || 'An error occurred while fetching reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Prepare chart data from branch data
  const prepareBranchChartData = (branchData) => {
    return Object.entries(branchData)
      .filter(([_, value]) => value.count > 0)
      .map(([branch, value]) => ({
        branch: branch.length > 10 ? branch.substring(0, 10) : branch,
        count: value.count,
        revenue: value.revenue
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Color palette for charts
  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#d97706', '#059669', '#0891b2', '#06b6d4', '#8b5cf6', '#0284c7'];

  const StatCard = ({ title, count, revenue, variant = 'default', icon: Icon }) => {
    const getGradientClass = () => {
      switch (variant) {
        case 'primary':
          return 'stat-primary';
        case 'secondary':
          return 'stat-secondary';
        case 'success':
          return 'stat-success';
        case 'warning':
          return 'stat-warning';
        case 'danger':
          return 'stat-danger';
        case 'info':
          return 'stat-info';
        default:
          return 'stat-default';
      }
    };

    return (
      <div className={`stat-card ${getGradientClass()}`}>
        <div className="stat-icon">
          {Icon && <Icon size={28} />}
        </div>
        <div className="stat-content">
          <h3>{title}</h3>
          <div className="stat-values">
            <div className="stat-item">
              <span className="stat-value-number">{count}</span>
              <span className="stat-label">Bookings</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value-currency">{formatCurrency(revenue)}</span>
              <span className="stat-label">Revenue</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!reports) return null;

  const overallBookingsChartData = prepareBranchChartData(reports.overallBookings.byBranch);
  const bookedTomorrowChartData = prepareBranchChartData(reports.bookedTomorrow.byBranch);
  const bookedNext7DaysChartData = prepareBranchChartData(reports.bookedNext7Days.byBranch);
  const cancellationsChartData = prepareBranchChartData(reports.cancellations.byBranch);

  return (
    <>
      <Sidebar />
      <main className="daily-reports-container">
        <div className="page-header">
          <div className="header-content">
            <div>
              <h1>📊 Daily Reports</h1>
              <p className="header-subtitle">Daily booking analytics and performance metrics</p>
            </div>
            <div className="header-actions">
              <button onClick={fetchDailyReports} className="btn-refresh">
                <FiRefreshCw size={18} /> Refresh
              </button>
              <span className="last-updated">
                Last updated: {refreshAt.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="reports-section">
          {/* Section 1: OTS Bookings */}
          <div className="report-row">
            <div className="report-card full-width">
              <div className="card-header">
                <h2>1️⃣ OTS Bookings (Same Day)</h2>
                <p>Bookings created today and scheduled for today</p>
              </div>
              <StatCard
                title="Same Day Bookings"
                count={reports.otsBookings.count}
                revenue={reports.otsBookings.revenue}
                variant="primary"
                icon={FiTrendingUp}
              />
            </div>
          </div>

          {/* Section 2: OVERALL Bookings */}
          <div className="report-row">
            <div className="report-card">
              <div className="card-header">
                <h2>2️⃣ Overall Bookings (7 Days)</h2>
                <p>Bookings created today scheduled for next 7 days</p>
              </div>
              <StatCard
                title="Overall Bookings"
                count={reports.overallBookings.count}
                revenue={reports.overallBookings.revenue}
                variant="secondary"
                icon={FiCalendar}
              />
            </div>
            <div className="report-card">
              <div className="card-header">
                <h2>Branch Distribution</h2>
              </div>
              {overallBookingsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overallBookingsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
                    <XAxis dataKey="branch" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="count" fill="#2563eb" name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No data available</div>
              )}
            </div>
          </div>

          {/* Section 3: Booked Tomorrow */}
          <div className="report-row">
            <div className="report-card">
              <div className="card-header">
                <h2>3️⃣ Scheduled Tomorrow</h2>
                <p>Bookings created today, scheduled for tomorrow</p>
              </div>
              {bookedTomorrowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={bookedTomorrowChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ branch, count }) => `${branch}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {bookedTomorrowChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No data available</div>
              )}
            </div>
          </div>

          {/* Section 4: Booked Next 7 Days */}
          <div className="report-row">
            <div className="report-card full-width">
              <div className="card-header">
                <h2>4️⃣ Next 7 Days Appointments</h2>
                <p>All bookings scheduled for the next 7 days by branch</p>
              </div>
              {bookedNext7DaysChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={bookedNext7DaysChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
                    <XAxis type="number" />
                    <YAxis dataKey="branch" type="category" width={100} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                      }}
                      formatter={(value) => [value, 'Bookings']}
                    />
                    <Bar dataKey="count" fill="#7c3aed" name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No data available</div>
              )}
            </div>
          </div>

          {/* Section 5: Cancellations */}
          <div className="report-row">
            <div className="report-card">
              <div className="card-header">
                <h2>5️⃣ Cancellations (Today)</h2>
                <p>Bookings created today that were cancelled</p>
              </div>
              <StatCard
                title="Total Cancellations"
                count={reports.cancellations.count}
                revenue={reports.cancellations.revenue}
                variant="danger"
                icon={FiX}
              />
            </div>
            <div className="report-card">
              <div className="card-header">
                <h2>Cancellations by Branch</h2>
              </div>
              {cancellationsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cancellationsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} />
                    <XAxis dataKey="branch" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                        border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
                      }}
                    />
                    <Bar dataKey="count" fill="#dc2626" name="Cancellations" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No data available</div>
              )}
            </div>
          </div>

          {/* Section 6: Overall Bookings Tomorrow */}
          <div className="report-row">
            <div className="report-card full-width">
              <div className="card-header">
                <h2>6️⃣ Tomorrow's Appointments (All)</h2>
                <p>All bookings scheduled for tomorrow, regardless of when they were created</p>
              </div>
              <StatCard
                title="Tomorrow's Total Appointments"
                count={reports.overallBookingsTomorrow.count}
                revenue={reports.overallBookingsTomorrow.revenue}
                variant="info"
                icon={FiDollarSign}
              />
            </div>
          </div>

          {/* Summary Insights */}
          <div className="summary-section">
            <h2>📈 Quick Insights</h2>
            <div className="insights-grid">
              <div className="insight-card">
                <span className="insight-label">Total Today's Revenue</span>
                <span className="insight-value">
                  {formatCurrency(
                    reports.otsBookings.revenue +
                    reports.overallBookings.revenue +
                    reports.cancellations.revenue
                  )}
                </span>
              </div>
              <div className="insight-card">
                <span className="insight-label">Total Bookings Created</span>
                <span className="insight-value">
                  {reports.otsBookings.count +
                   reports.overallBookings.count +
                   reports.bookedTomorrow.count +
                   reports.cancellations.count}
                </span>
              </div>
              <div className="insight-card">
                <span className="insight-label">Cancellation Rate</span>
                <span className="insight-value">
                  {Math.round(
                    (reports.cancellations.count /
                      Math.max(
                        reports.otsBookings.count +
                        reports.overallBookings.count +
                        reports.cancellations.count,
                        1
                      )) * 100
                  )}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default DailyReports;
