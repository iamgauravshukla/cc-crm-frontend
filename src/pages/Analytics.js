import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Chart from 'react-apexcharts';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { FiTrendingUp, FiDollarSign, FiBarChart2, FiUsers, FiRepeat, FiHome, FiPackage, FiCreditCard, FiUserCheck, FiPieChart, FiCalendar, FiTarget } from 'react-icons/fi';
import './Analytics.css';

const BRANCHES = [
  'All',
  'AI SKIN',
  'CENTRIS',
  'DNA MANILA',
  'GENEVA',
  'GLORIETTA',
  'HERA',
  'LIONESSE',
  'LUMIA',
  'PARIS',
  'SM NORTH',
  'VENICE'
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last Month' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' }
];

function Analytics() {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedRange, setSelectedRange] = useState('year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Detect dark mode
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  // Common chart theme config
  const getChartTheme = () => ({
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      style: {
        fontSize: '12px'
      }
    },
    chart: {
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent'
    },
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    },
    xaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
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
    },
    dataLabels: {
      style: {
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    }
  });

  const fetchAnalytics = useCallback(async () => {
    // Don't fetch if custom date range is selected but dates aren't both filled
    if (selectedRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = { branch: selectedBranch };
      
      if (selectedRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.range = selectedRange;
      }
      
      const response = await api.get('/analytics', { params });
      setAnalytics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedRange, customStartDate, customEndDate, navigate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="main-content">
          <div className="page-container">
            <Loader message="Loading analytics data..." />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const { overview, branchPerformance, treatmentAnalysis, revenueAnalysis, 
          agentPerformance, demographicAnalysis, timeSeriesData, marketingChannels } = analytics;

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="analytics-container">

      <header className="analytics-header">
        <div className="filters-row">
          <div className="filter-group">
            <label>Branch:</label>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {BRANCHES.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label><FiCalendar /> Date Range:</label>
            <select value={selectedRange} onChange={(e) => setSelectedRange(e.target.value)}>
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {selectedRange === 'custom' && (
            <div className="filter-group custom-date-range">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || new Date().toISOString().split('T')[0]}
                className="date-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
                className="date-input"
              />
            </div>
          )}
        </div>
      </header>

      <div className="analytics-content">
        {/* Overview Cards */}
        <section className="overview-section">
          <div className="stat-card">
            <div className="stat-icon">
              <FiTrendingUp size={32} />
            </div>
            <div className="stat-content">
              <h3>{overview.totalBookings}</h3>
              <p>Total Bookings</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <FiDollarSign size={32} />
            </div>
            <div className="stat-content">
              <h3>₱{overview.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <FiBarChart2 size={32} />
            </div>
            <div className="stat-content">
              <h3>₱{overview.avgBookingValue}</h3>
              <p>Avg Booking Value</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <FiUsers size={32} />
            </div>
            <div className="stat-content">
              <h3>{overview.uniqueCustomers}</h3>
              <p>Unique Customers</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <FiRepeat size={32} />
            </div>
            <div className="stat-content">
              <h3>{overview.repeatCustomerRate}%</h3>
              <p>Repeat Customer Rate</p>
            </div>
          </div>
        </section>

        {/* Branch Performance (only show when All is selected) */}
        {selectedBranch === 'All' && branchPerformance.length > 0 && (
          <section className="chart-section">
            <h2><FiHome style={{marginRight: '8px', verticalAlign: 'middle'}} /> Branch Performance</h2>
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#2563EB', '#60A5FA'],
                  xaxis: { 
                    categories: branchPerformance.map(b => b.name),
                    labels: { 
                      rotate: -45, 
                      style: { fontSize: '11px', colors: isDarkMode ? '#cbd5e1' : '#64748b' }
                    }
                  },
                  yaxis: [
                    { 
                      title: { text: 'Bookings', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Bookings',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    },
                    { 
                      opposite: true, 
                      title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Revenue',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    }
                  ],
                  dataLabels: { enabled: false },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[
                  { name: 'Bookings', data: branchPerformance.map(b => b.bookings) },
                  { name: 'Revenue (₱)', data: branchPerformance.map(b => b.revenue) }
                ]}
                type="bar"
                height={400}
              />
            </div>
          </section>
        )}

        {/* Top Treatments */}
        <section className="chart-section">
          <h2><FiPackage style={{marginRight: '8px', verticalAlign: 'middle'}} /> Top Treatments</h2>
          <div className="chart-grid">
            <div className="chart-container">
              <h3>By Count</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 6, horizontal: true } },
                  colors: ['#0088FE'],
                  xaxis: { 
                    categories: treatmentAnalysis.slice(0, 10).map(t => t.name),
                    title: { text: 'Count', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Count', data: treatmentAnalysis.slice(0, 10).map(t => t.count) }]}
                type="bar"
                height={350}
              />
            </div>
            <div className="chart-container">
              <h3>By Revenue</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 6, horizontal: true } },
                  colors: ['#00C49F'],
                  xaxis: { 
                    categories: treatmentAnalysis.slice(0, 10).map(t => t.name),
                    title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Revenue', data: treatmentAnalysis.slice(0, 10).map(t => t.revenue) }]}
                type="bar"
                height={350}
              />
            </div>
          </div>
        </section>

        {/* Revenue Analysis */}
        <section className="chart-section">
          <h2><FiCreditCard style={{marginRight: '8px', verticalAlign: 'middle'}} /> Revenue Analysis</h2>
          <div className="chart-grid">
            <div className="chart-container">
              <h3>By Payment Mode</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'pie' },
                  labels: revenueAnalysis.byPaymentMode.map(p => p.mode),
                  colors: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'],
                  legend: { position: 'bottom', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  dataLabels: { 
                    enabled: true,
                    formatter: (val, opts) => {
                      const revenue = revenueAnalysis.byPaymentMode[opts.seriesIndex].revenue;
                      return `₱${revenue}`;
                    },
                    style: { colors: [isDarkMode ? '#f1f5f9' : '#1f2937'] }
                  }
                }}
                series={revenueAnalysis.byPaymentMode.map(p => p.revenue)}
                type="pie"
                height={300}
              />
            </div>
            <div className="chart-container">
              <h3>By Price Range</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#FFBB28'],
                  xaxis: { categories: revenueAnalysis.byPriceRange.map(p => p.range) },
                  yaxis: { title: { text: 'Count', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } } },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Count', data: revenueAnalysis.byPriceRange.map(p => p.count) }]}
                type="bar"
                height={300}
              />
            </div>
          </div>
        </section>

        {/* Agent Performance */}
        <section className="chart-section">
          <h2><FiUserCheck style={{marginRight: '8px', verticalAlign: 'middle'}} /> Agent Performance</h2>
          <div className="chart-container">
            <Chart
              options={{
                ...getChartTheme(),
                chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                colors: ['#2563EB', '#60A5FA'],
                xaxis: { 
                  categories: agentPerformance.slice(0, 10).map(a => a.name),
                  labels: { rotate: -45, style: { fontSize: '11px', colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                },
                yaxis: [
                  { 
                    title: { text: 'Bookings', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                    seriesName: 'Bookings',
                    labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  { 
                    opposite: true, 
                    title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                    seriesName: 'Revenue',
                    labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  }
                ],
                dataLabels: { enabled: false },
                legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
              }}
              series={[
                { name: 'Bookings', data: agentPerformance.slice(0, 10).map(a => a.bookings) },
                { name: 'Revenue (₱)', data: agentPerformance.slice(0, 10).map(a => a.revenue) }
              ]}
              type="bar"
              height={400}
            />
          </div>
        </section>

        {/* Demographics */}
        <section className="chart-section">
          <h2><FiPieChart style={{marginRight: '8px', verticalAlign: 'middle'}} /> Customer Demographics</h2>
          <div className="chart-grid">
            <div className="chart-container">
              <h3>By Gender</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'pie' },
                  labels: demographicAnalysis.byGender.map(g => g.gender),
                  colors: ['#0088FE', '#00C49F', '#FFBB28'],
                  legend: { position: 'bottom', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  dataLabels: { enabled: true, style: { colors: [isDarkMode ? '#f1f5f9' : '#1f2937'] } }
                }}
                series={demographicAnalysis.byGender.map(g => g.count)}
                type="pie"
                height={300}
              />
            </div>
            <div className="chart-container">
              <h3>By Age Group</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#FF8042'],
                  xaxis: { categories: demographicAnalysis.byAgeGroup.map(a => a.ageGroup) },
                  yaxis: { title: { text: 'Count', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } } },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Count', data: demographicAnalysis.byAgeGroup.map(a => a.count) }]}
                type="bar"
                height={300}
              />
            </div>
          </div>
        </section>

        {/* Time Series */}
        {timeSeriesData.byMonth.length > 0 && (
          <section className="chart-section">
            <h2><FiCalendar style={{marginRight: '8px', verticalAlign: 'middle'}} /> Booking Trends</h2>
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'area', toolbar: { show: true } },
                  colors: ['#2563EB', '#60A5FA'],
                  xaxis: { categories: timeSeriesData.byMonth.map(m => m.month) },
                  yaxis: [
                    { 
                      title: { text: 'Bookings', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Bookings',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    },
                    { 
                      opposite: true, 
                      title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Revenue',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    }
                  ],
                  dataLabels: { enabled: false },
                  stroke: { curve: 'smooth', width: 2 },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                }}
                series={[
                  { name: 'Bookings', type: 'area', data: timeSeriesData.byMonth.map(m => m.count) },
                  { name: 'Revenue (₱)', type: 'area', data: timeSeriesData.byMonth.map(m => m.revenue) }
                ]}
                type="area"
                height={350}
              />
            </div>
          </section>
        )}

        {/* Marketing Channels */}
        {marketingChannels.length > 0 && (
          <section className="chart-section">
            <h2><FiTarget style={{marginRight: '8px', verticalAlign: 'middle'}} /> Marketing Channel Performance</h2>
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#2563EB', '#60A5FA'],
                  xaxis: { 
                    categories: marketingChannels.slice(0, 10).map(m => m.channel),
                    labels: { rotate: -45, style: { fontSize: '11px', colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  yaxis: [
                    { 
                      title: { text: 'Bookings', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Bookings',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    },
                    { 
                      opposite: true, 
                      title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }, 
                      seriesName: 'Revenue',
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    }
                  ],
                  dataLabels: { enabled: false },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[
                  { name: 'Bookings', data: marketingChannels.slice(0, 10).map(m => m.bookings) },
                  { name: 'Revenue (₱)', data: marketingChannels.slice(0, 10).map(m => m.revenue) }
                ]}
                type="bar"
                height={400}
              />
            </div>
          </section>
        )}
      </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Analytics;
