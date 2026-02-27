import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { useTheme } from '../context/ThemeContext';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingBag, FiPercent, FiAward } from 'react-icons/fi';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Add cache-busting parameter to force fresh data
      const response = await api.get('/dashboard/overview', {
        params: { t: Date.now() }
      });
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      // Add cache-busting parameter to force fresh data
      const response = await api.get('/dashboard/trend', {
        params: { days: 20, t: Date.now() }
      });
      if (response.data.success) {
        setTrendData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
    fetchTrendData();

    // Refetch data when the page becomes visible (user returns from another tab/page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
        fetchTrendData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getStatusClass = (status) => {
    if (!status) return 'status-badge';
    
    const statusLower = status.toLowerCase();
    
    // Map each status to a specific color class
    if (statusLower === 'scheduled') {
      return 'status-badge status-scheduled';
    } else if (statusLower === 'arrived & bought') {
      return 'status-badge status-arrived-bought';
    } else if (statusLower === 'comeback & bought') {
      return 'status-badge status-comeback-bought';
    } else if (statusLower === 'arrived not potential') {
      return 'status-badge status-arrived-not-potential';
    } else if (statusLower === 'cancelled') {
      return 'status-badge status-cancelled';
    } else if (statusLower === 'promo hunter') {
      return 'status-badge status-promo-hunter';
    } else if (statusLower === 'refund') {
      return 'status-badge status-refund';
    } else if (statusLower === 'comeback') {
      return 'status-badge status-comeback';
    } else if (statusLower === 'no data') {
      return 'status-badge status-no-data';
    } else if (statusLower === 'arrived on treatment') {
      return 'status-badge status-arrived-treatment';
    } else if (statusLower === 'old client') {
      return 'status-badge status-old-client';
    } else if (statusLower === 'on the way') {
      return 'status-badge status-on-the-way';
    }
    
    return 'status-badge';
  };

  // Trend chart options
  const trendChartOptions = trendData ? {
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    chart: { 
      type: 'area', 
      toolbar: { show: true }, 
      zoom: { enabled: false },
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent'
    },
    colors: ['#2563EB'],
    stroke: { curve: 'smooth', width: 3 },
    fill: { 
      type: 'gradient', 
      gradient: { 
        opacityFrom: 0.6, 
        opacityTo: 0.1,
        stops: [0, 90, 100]
      } 
    },
    dataLabels: { 
      enabled: false,
      style: {
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    },
    xaxis: { 
      categories: trendData.dates,
      labels: { 
        rotate: -45, 
        style: { 
          fontSize: '11px',
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        } 
      }
    },
    yaxis: { 
      title: { 
        text: 'Bookings',
        style: {
          color: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      },
      labels: { 
        formatter: (val) => Math.round(val),
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    grid: { 
      strokeDashArray: 4,
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      x: { format: 'dd MMM' },
      y: { formatter: (val) => `${val} bookings` }
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  } : {};

  const trendChartSeries = trendData ? [{
    name: 'Bookings',
    data: trendData.bookings
  }] : [];

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">

        {loading ? (
          <Loader message="Loading dashboard data..." />
        ) : dashboardData ? (
          <>
            {/* KPI Comparison Cards */}
            {dashboardData.kpis && (
              <div className="kpi-section">
                <h2>📊 Key Metrics (Today vs Yesterday)</h2>
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-icon bookings-icon">
                      <FiShoppingBag size={28} />
                    </div>
                    <div className="kpi-content">
                      <p className="kpi-label">Total Bookings</p>
                      <h3 className="kpi-value">{dashboardData.kpis.bookings.today}</h3>
                      <div className="kpi-comparison">
                        <span className={`trend-badge ${dashboardData.kpis.bookings.trend}`}>
                          {dashboardData.kpis.bookings.trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                          {Math.abs(dashboardData.kpis.bookings.change)}%
                        </span>
                        <span className="yesterday-value">vs {dashboardData.kpis.bookings.yesterday} yesterday</span>
                      </div>
                    </div>
                  </div>

                  {user?.role === 'Admin' && (
                    <div className="kpi-card">
                      <div className="kpi-icon revenue-icon">
                        <FiDollarSign size={28} />
                      </div>
                      <div className="kpi-content">
                        <p className="kpi-label">Total Revenue (All Payments)</p>
                        <h3 className="kpi-value">₱{dashboardData.kpis.revenue.today.toLocaleString()}</h3>
                        <div className="kpi-comparison">
                          <span className={`trend-badge ${dashboardData.kpis.revenue.trend}`}>
                            {dashboardData.kpis.revenue.trend === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                            {Math.abs(dashboardData.kpis.revenue.change)}%
                          </span>
                          <span className="yesterday-value">vs ₱{dashboardData.kpis.revenue.yesterday.toLocaleString()} yesterday</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {user?.role === 'Admin' && (
                    <div className="kpi-card">
                      <div className="kpi-icon avg-icon">
                        <FiDollarSign size={28} />
                      </div>
                      <div className="kpi-content">
                        <p className="kpi-label">Avg Booking Value</p>
                        <h3 className="kpi-value">₱{dashboardData.kpis.avgBookingValue.today.toLocaleString()}</h3>
                        <div className="kpi-comparison">
                          <span className="yesterday-value">Yesterday: ₱{dashboardData.kpis.avgBookingValue.yesterday.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="kpi-card">
                    <div className="kpi-icon conversion-icon">
                      <FiPercent size={28} />
                    </div>
                    <div className="kpi-content">
                      <p className="kpi-label">Completion Rate</p>
                      <h3 className="kpi-value">{dashboardData.kpis.conversionRate}%</h3>
                      <div className="kpi-comparison">
                        <span className="yesterday-value">Completed bookings today</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Performers - Admin Only */}
            {user?.role === 'Admin' && dashboardData.topPerformers && (
              <div className="performers-section">
                <h2>🏆 Today's Top Performers</h2>
                <div className="performers-grid">
                  {/* Top Branches */}
                  <div className="performer-card">
                    <h3><FiAward /> Top Branches</h3>
                    <div className="performer-list">
                      {dashboardData.topPerformers.branches.map((branch, idx) => (
                        <div key={idx} className="performer-item">
                          <div className="performer-rank">{idx + 1}</div>
                          <div className="performer-info">
                            <strong>{branch.name}</strong>
                            <span>{branch.bookings} bookings • ₱{branch.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Agents */}
                  <div className="performer-card">
                    <h3><FiAward /> Top Agents</h3>
                    <div className="performer-list">
                      {dashboardData.topPerformers.agents.map((agent, idx) => (
                        <div key={idx} className="performer-item">
                          <div className="performer-rank">{idx + 1}</div>
                          <div className="performer-info">
                            <strong>{agent.name}</strong>
                            <span>{agent.bookings} bookings • ₱{agent.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Treatments */}
                  <div className="performer-card">
                    <h3><FiAward /> Popular Treatments</h3>
                    <div className="performer-list">
                      {dashboardData.topPerformers.treatments.map((treatment, idx) => (
                        <div key={idx} className="performer-item">
                          <div className="performer-rank">{idx + 1}</div>
                          <div className="performer-info">
                            <strong>{treatment.name}</strong>
                            <span>{treatment.count} bookings</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 15 Days Booking Trend - Admin Only */}
            {user?.role === 'Admin' && trendData && (
              <div className="trend-section">
                <h2>📈 Last 20 Days Booking Performance</h2>
                <div className="chart-card">
                  <Chart
                    options={trendChartOptions}
                    series={trendChartSeries}
                    type="area"
                    height={350}
                  />
                </div>
              </div>
            )}

            {/* Today's Bookings Table */}
            <div className="todays-bookings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>📅 Today's Bookings ({dashboardData.todayBookings.length})</h2>
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.3s'
                  }}
                  title="Refresh dashboard data"
                >
                  {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
                </button>
              </div>
              {dashboardData.todayBookings.length > 0 ? (
                <div className="table-container">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Date</th>
                        <th>Branch</th>
                        <th>Customer</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Instagram</th>
                        <th>Treatment</th>
                        <th>Treatment Area</th>
                        <th>Freebie</th>
                        <th>Companion</th>
                        <th>Companion Phone</th>
                        <th>Companion Age</th>
                        <th>Companion Gender</th>
                        <th>Companion Treatment</th>
                        <th>Companion Freebie</th>
                        <th>Payment</th>
                        <th>Price</th>
                        <th>Agent</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th>Promo Hunter Status</th>
                        <th>Match Reason</th>
                        <th>Matched Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.todayBookings.map((booking, index) => (
                        <tr key={index}>
                          <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td>{booking.date || '-'}</td>
                          <td>{booking.branch}</td>
                          <td>{booking.customer}</td>
                          <td>{booking.age || '-'}</td>
                          <td>{booking.gender || '-'}</td>
                          <td>{booking.phone || '-'}</td>
                          <td>{booking.email || '-'}</td>
                          <td>{booking.socialMedia || '-'}</td>
                          <td>{booking.treatment}</td>
                          <td>{booking.area || '-'}</td>
                          <td>{booking.freebie || '-'}</td>
                          <td>{booking.companionName || '-'}</td>
                          <td>{booking.companionPhone || '-'}</td>
                          <td>{booking.companionAge || '-'}</td>
                          <td>{booking.companionGender || '-'}</td>
                          <td>{booking.companionTreatment || '-'}</td>
                          <td>{booking.companionFreebie || '-'}</td>
                          <td>{booking.paymentMode || '-'}</td>
                          <td><strong>₱{booking.price.toFixed(2)}</strong></td>
                          <td>{booking.agent}</td>
                          <td><span className="booking-details-cell" title={booking.bookingDetails || ''}>{booking.bookingDetails ? (booking.bookingDetails.length > 30 ? booking.bookingDetails.substring(0, 30) + '...' : booking.bookingDetails) : '-'}</span></td>
                          <td>
                            <span className={getStatusClass(booking.status)}>
                              {booking.status || 'Scheduled'}
                            </span>
                          </td>
                          <td>{booking.promoHunterStatus || '-'}</td>
                          <td>{booking.matchReason || '-'}</td>
                          <td>{booking.matchedSource || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No bookings today yet</div>
              )}
            </div>
          </>
        ) : null}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
