import React, { useState, useEffect } from 'react';
import { getDailyReports, getOTSBookings, getOverallBookings, getTomorrowBookings, getNext7DaysBookings, getCancellations, getTomorrowSummary } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ReactApexChart from 'react-apexcharts';
import { FiRefreshCw, FiTrendingUp, FiDollarSign, FiCalendar, FiBarChart2, FiPieChart, FiAlertCircle, FiCheckCircle, FiX, FiMaximize2, FiPhone, FiMail } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import './DailyReports.css';

const DailyReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshAt, setRefreshAt] = useState(new Date());
  const [expandedSection, setExpandedSection] = useState(null);
  const [modalBookings, setModalBookings] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Common chart theme
  const getChartTheme = () => ({
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    chart: {
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      }
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      style: {
        fontSize: '12px'
      }
    },
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e2e8f0'
    },
    xaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  });

  useEffect(() => {
    fetchDailyReports();
    
    // Auto-refresh every 5 minutes
    const periodicRefresh = setInterval(fetchDailyReports, 5 * 60 * 1000);
    
    // Refresh at midnight
    const calculateMidnightRefresh = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeToMidnight = tomorrow.getTime() - now.getTime();
      
      const midnightRefresh = setTimeout(() => {
        console.log('🌙 Midnight reached - refreshing daily reports');
        fetchDailyReports();
        calculateMidnightRefresh();
      }, timeToMidnight);
      
      return midnightRefresh;
    };
    
    const midnightRefresh = calculateMidnightRefresh();
    
    return () => {
      clearInterval(periodicRefresh);
      clearTimeout(midnightRefresh);
    };
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

  const handleExpandSection = async (sectionName) => {
    setExpandedSection(sectionName);
    setModalLoading(true);
    try {
      let response;
      switch(sectionName) {
        case 'ots':
          response = await getOTSBookings();
          break;
        case 'overall':
          response = await getOverallBookings();
          break;
        case 'tomorrow':
          response = await getTomorrowBookings();
          break;
        case 'next7days':
          response = await getNext7DaysBookings();
          break;
        case 'cancellations':
          response = await getCancellations();
          break;
        case 'tomorrow-summary':
          response = await getTomorrowSummary();
          break;
        default:
          return;
      }
      if (response.data && response.data.success) {
        setModalBookings(response.data.bookings || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setModalBookings([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setExpandedSection(null);
    setModalBookings([]);
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="daily-reports-container">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Loader message="Loading daily reports..." />
          </div>
        </main>
      </>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Prepare data for charts
  const prepareBranchChartData = (branchData) => {
    if (!branchData || typeof branchData !== 'object') {
      return [];
    }
    return Object.entries(branchData)
      .filter(([_, value]) => value.count > 0)
      .map(([branch, value]) => ({
        branch,
        count: value.count,
        revenue: value.revenue
      }))
      .sort((a, b) => b.count - a.count);
  };

  const overallChartData = prepareBranchChartData(reports?.overallBookings?.byBranch);
  const otsChartData = prepareBranchChartData(reports?.otsBookings?.byBranch);
  const tomorrowChartData = prepareBranchChartData(reports?.bookedTomorrow?.byBranch);
  const next7DaysChartData = prepareBranchChartData(reports?.bookedNext7Days?.byBranch);
  const cancellationsChartData = prepareBranchChartData(reports?.cancellations?.byBranch);

  // OTS chart options
  const otsChartOptions = {
    ...getChartTheme(),
    chart: { ...getChartTheme().chart, type: 'bar', height: 350 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 8,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '13px',
        fontWeight: 600,
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    },
    xaxis: {
      categories: otsChartData.map(d => d.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Bookings',
        style: {
          color: isDarkMode ? '#cbd5e1' : '#64748b',
          fontSize: '12px'
        }
      }
    },
    colors: ['#10b981'],
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e5e7eb',
      strokeDashArray: 4
    }
  };

  const otsChartSeries = [{
    name: 'Same-Day Bookings',
    data: otsChartData.map(d => d.count)
  }];

  // Bar chart options
  const branchChartOptions = {
    ...getChartTheme(),
    chart: { ...getChartTheme().chart, type: 'bar', height: 350 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '65%',
        borderRadius: 6,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    },
    xaxis: {
      categories: overallChartData.map(d => d.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b',
          fontSize: '12px'
        }
      }
    },
    colors: ['#3b82f6']
  };

  const branchChartSeries = [{
    name: 'Bookings',
    data: overallChartData.map(d => d.count)
  }];

  // Pie chart options
  const tomorrowPieOptions = {
    ...getChartTheme(),
    labels: tomorrowChartData.map(d => d.branch),
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { fontSize: '16px' },
            value: { fontSize: '20px', fontWeight: 600 }
          }
        }
      }
    }
  };

  const tomorrowPieSeries = tomorrowChartData.map(d => d.count);

  // Horizontal bar chart
  const next7DaysChartOptions = {
    ...getChartTheme(),
    chart: { ...getChartTheme().chart, type: 'bar', height: 400 },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: '60%',
        borderRadius: 4
      }
    },
    xaxis: {
      categories: next7DaysChartData.map(d => d.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    colors: ['#8b5cf6']
  };

  const next7DaysChartSeries = [{
    name: 'Bookings',
    data: next7DaysChartData.map(d => d.count)
  }];

  // Cancellations chart
  const cancellationsChartOptions = {
    ...getChartTheme(),
    chart: { ...getChartTheme().chart, type: 'bar', height: 320 },
    plotOptions: {
      bar: { columnWidth: '60%', borderRadius: 4 }
    },
    xaxis: {
      categories: cancellationsChartData.map(d => d.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b',
          fontSize: '11px'
        },
        rotate: -45
      }
    },
    colors: ['#ef4444']
  };

  const cancellationsChartSeries = [{
    name: 'Cancellations',
    data: cancellationsChartData.map(d => d.count)
  }];

  // Stat card component
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, trendColor = '#10b981' }) => (
    <div className="stat-card-premium">
      <div className="stat-card-header">
        <div className="stat-icon-wrapper" style={{ background: trendColor + '15' }}>
          <Icon size={24} style={{ color: trendColor }} />
        </div>
        {trend && <div className="stat-trend" style={{ color: trendColor }}>{trend}%</div>}
      </div>
      <div className="stat-card-body">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  if (!reports) return null;

  const totalRevenue = (reports?.otsBookings?.revenue || 0) + (reports?.overallBookings?.revenue || 0);
  const totalBookings = (reports?.otsBookings?.count || 0) + (reports?.overallBookings?.count || 0);
  const avgValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  return (
    <>
      <Sidebar />
      <main className="daily-reports-container">
        {/* Header */}
        <div className="report-header">
          <div className="header-left">
            <h1 className="page-title">📊 Daily Reports</h1>
            <p className="page-subtitle">Real-time booking analytics for today</p>
          </div>
          <div className="header-right">
            <button onClick={fetchDailyReports} className="btn-icon-primary">
              <FiRefreshCw size={18} />
            </button>
            <div className="last-refresh">
              <span className="refresh-label">Updated</span>
              <span className="refresh-time">{refreshAt.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Top Metrics */}
        <div className="metrics-grid">
          <StatCard
            icon={FiCheckCircle}
            title="Same-Day Bookings"
            value={reports?.otsBookings?.count || 0}
            subtitle={formatCurrency(reports?.otsBookings?.revenue || 0)}
            trend={(((reports?.otsBookings?.count || 0) / (totalBookings || 1)) * 100).toFixed(0)}
            trendColor="#3b82f6"
          />
          <StatCard
            icon={FiCalendar}
            title="Overall (7 Days)"
            value={reports?.overallBookings?.count || 0}
            subtitle={formatCurrency(reports?.overallBookings?.revenue || 0)}
            trend={(((reports?.overallBookings?.count || 0) / (totalBookings || 1)) * 100).toFixed(0)}
            trendColor="#8b5cf6"
          />
          <StatCard
            icon={FiTrendingUp}
            title="Tomorrow's Bookings"
            value={Object.values(reports?.bookedTomorrow?.byBranch || {}).reduce((sum, b) => sum + b.count, 0)}
            subtitle="scheduled appointments"
            trend="20"
            trendColor="#10b981"
          />
          <StatCard
            icon={FiDollarSign}
            title="Avg. Booking Value"
            value={formatCurrency(avgValue)}
            subtitle="today's average"
            trendColor="#f59e0b"
          />
        </div>

        {/* Charts Section */}
        <div className="charts-container">
          {/* 1. OTS (Same-Day) Bookings */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <div>
                <h2>1️⃣ OTS (Same-Day) Bookings by Branch</h2>
                <p>Created today & scheduled for today</p>
              </div>
              <button className="btn-expand" onClick={() => handleExpandSection('ots')} title="View Details">
                <FiMaximize2 size={18} />
              </button>
            </div>
            {otsChartData.length > 0 ? (
              <ReactApexChart
                options={otsChartOptions}
                series={otsChartSeries}
                type="bar"
                height={350}
              />
            ) : (
              <div className="no-data">
                <FiBarChart2 size={40} />
                <p>No OTS bookings today</p>
              </div>
            )}
          </div>

          {/* 2. Overall Bookings */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2>2️⃣ Overall Bookings by Branch</h2>
                <p>Distribution across branches (7-day forecast)</p>
              </div>
              <button className="btn-expand" onClick={() => handleExpandSection('overall')} title="View Details">
                <FiMaximize2 size={18} />
              </button>
            </div>
            {overallChartData.length > 0 ? (
              <ReactApexChart
                options={branchChartOptions}
                series={branchChartSeries}
                type="bar"
                height={350}
              />
            ) : (
              <div className="no-data">
                <FiBarChart2 size={40} />
                <p>No bookings data available</p>
              </div>
            )}
          </div>

          {/* 3. Tomorrow's Schedule */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2>3️⃣ Tomorrow's Schedule by Branch</h2>
                <p>Breakdown of tomorrow's appointments</p>
              </div>
              <button className="btn-expand" onClick={() => handleExpandSection('tomorrow')} title="View Details">
                <FiMaximize2 size={18} />
              </button>
            </div>
            {tomorrowChartData.length > 0 ? (
              <ReactApexChart
                options={tomorrowPieOptions}
                series={tomorrowPieSeries}
                type="donut"
                height={320}
              />
            ) : (
              <div className="no-data">
                <FiPieChart size={40} />
                <p>No appointments scheduled</p>
              </div>
            )}
          </div>

          {/* 4. Next 7 Days */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <div>
                <h2>4️⃣ Next 7 Days Appointments by Branch</h2>
                <p>All scheduled appointments for the next week</p>
              </div>
              <button className="btn-expand" onClick={() => handleExpandSection('next7days')} title="View Details">
                <FiMaximize2 size={18} />
              </button>
            </div>
            {next7DaysChartData.length > 0 ? (
              <ReactApexChart
                options={next7DaysChartOptions}
                series={next7DaysChartSeries}
                type="bar"
                height={400}
              />
            ) : (
              <div className="no-data">
                <FiBarChart2 size={40} />
                <p>No appointments scheduled</p>
              </div>
            )}
          </div>

          {/* 5. Cancellations */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2>5️⃣ Cancellations Today</h2>
                <p>Bookings cancelled today by branch</p>
              </div>
              <button className="btn-expand" onClick={() => handleExpandSection('cancellations')} title="View Details">
                <FiMaximize2 size={18} />
              </button>
            </div>
            {cancellationsChartData.length > 0 ? (
              <ReactApexChart
                options={cancellationsChartOptions}
                series={cancellationsChartSeries}
                type="bar"
                height={320}
              />
            ) : (
              <div className="no-data">
                <FiBarChart2 size={40} />
                <p>No cancellations today</p>
              </div>
            )}
          </div>

          {/* 6. Quick Insights */}
          <div className="chart-card">
            <div className="chart-header">
              <h2>6️⃣ Quick Insights</h2>
              <p>Today's performance summary</p>
            </div>
            <div className="insights-list">
              <div className="insight-row">
                <span className="insight-label">Today's Revenue</span>
                <span className="insight-value">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="insight-divider"></div>
              <div className="insight-row">
                <span className="insight-label">Total Bookings</span>
                <span className="insight-value">{totalBookings}</span>
              </div>
              <div className="insight-divider"></div>
              <div className="insight-row">
                <span className="insight-label">Cancellations</span>
                <span className="insight-value" style={{ color: '#ef4444' }}>
                  {reports?.cancellations?.count || 0}
                </span>
              </div>
              <div className="insight-divider"></div>
              <div className="insight-row">
                <span className="insight-label">Tomorrow Total</span>
                <span className="insight-value">{reports?.overallBookingsTomorrow?.count || 0}</span>
              </div>
              <div className="insight-divider"></div>
              <div className="insight-row">
                <span className="insight-label">Expected Revenue</span>
                <span className="insight-value">{formatCurrency(reports?.overallBookingsTomorrow?.revenue || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Details Modal */}
        {expandedSection && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{
                  expandedSection === 'ots' ? 'Same-Day Bookings' :
                  expandedSection === 'overall' ? 'Overall Bookings' :
                  expandedSection === 'tomorrow' ? 'Tomorrow Bookings' :
                  expandedSection === 'next7days' ? 'Next 7 Days Bookings' :
                  expandedSection === 'cancellations' ? 'Cancellations' :
                  expandedSection === 'tomorrow-summary' ? 'Tomorrow Summary' : 'Bookings'
                }</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>
                  <FiX size={24} />
                </button>
              </div>

              {modalLoading ? (
                <div className="modal-loading">Loading bookings...</div>
              ) : modalBookings.length === 0 ? (
                <div className="modal-empty">No bookings found for this section</div>
              ) : (
                <div className="bookings-table-wrapper">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Branch</th>
                        <th>Date</th>
                        <th>Treatment</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th>Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalBookings.map((booking, idx) => (
                        <tr key={idx}>
                          <td className="name-cell">
                            <strong>{booking.firstName} {booking.lastName}</strong>
                          </td>
                          <td>{booking.branch}</td>
                          <td>{booking.date}</td>
                          <td>{booking.treatment}</td>
                          <td className="contact-cell">
                            <div className="contact-info">
                              {booking.phone && (
                                <a href={`tel:${booking.phone}`} title={booking.phone}>
                                  <FiPhone size={14} />
                                </a>
                              )}
                              {booking.email && (
                                <a href={`mailto:${booking.email}`} title={booking.email}>
                                  <FiMail size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge status-${booking.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="price-cell">
                            <strong>{formatCurrency(booking.totalPrice)}</strong>
                          </td>
                          <td>{booking.agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default DailyReports;
