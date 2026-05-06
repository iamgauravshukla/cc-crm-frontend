import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Chart from 'react-apexcharts';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import QuickFilterBar from '../components/QuickFilterBar';
import { useTheme } from '../context/ThemeContext';
import { FiTrendingUp, FiDollarSign, FiBarChart2, FiUsers, FiRepeat, FiHome, FiPackage, FiCreditCard, FiUserCheck, FiPieChart, FiCalendar, FiTarget, FiAward, FiActivity } from 'react-icons/fi';
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
  'VENICE',
  'STA LUCIA',
  'FELIZ',
  'ESTANCIA'
];

const ANALYTICS_FILTER_FIELDS = [
  {
    key: 'branch',
    fieldLabel: 'Branch',
    type: 'select',
    options: BRANCHES.filter(b => b !== 'All'),
  },
  {
    key: 'dateRange',
    fieldLabel: 'Date Range',
    type: 'datepreset',
    options: [
      { value: 'today',   label: 'Today' },
      { value: 'week',    label: 'Last 7 Days' },
      { value: 'month',   label: 'Last Month' },
      { value: 'quarter', label: 'Last Quarter' },
      { value: 'year',    label: 'Last Year' },
      { value: 'custom',  label: 'Custom Range' },
    ],
  },
];

function Analytics() {
  const navigate = useNavigate();

  // Quick-filter state — defaults to All branches, Last Year
  const [activeFilters, setActiveFilters] = useState([
    { id: 'qf-date-default', field: 'dateRange', fieldLabel: 'Date Range', operator: 'is', value: 'year', dateFrom: '', dateTo: '', displayValue: 'Last Year' },
  ]);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [agentTab, setAgentTab]   = useState('bookings');
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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
    // Derive params from active filters
    const branchFilter    = activeFilters.find(f => f.field === 'branch');
    const dateFilter      = activeFilters.find(f => f.field === 'dateRange');

    const selectedBranch  = branchFilter?.value || 'All';
    const selectedRange   = dateFilter?.value || 'year';
    const customStartDate = dateFilter?.dateFrom || '';
    const customEndDate   = dateFilter?.dateTo   || '';

    if (selectedRange === 'custom' && (!customStartDate || !customEndDate)) return;

    try {
      setLoading(true);
      setError('');
      const params = { branch: selectedBranch };
      if (selectedRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate   = customEndDate;
      } else {
        params.range = selectedRange;
      }
      const response = await api.get('/analytics', { params });
      setAnalytics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
      if (err.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [activeFilters, navigate]);

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

  // Derive display values from active filters
  const dateFilter      = activeFilters.find(f => f.field === 'dateRange');
  const selectedBranch  = activeFilters.find(f => f.field === 'branch')?.value || 'All';
  const selectedRange   = dateFilter?.value || 'year';
  const customStartDate = dateFilter?.dateFrom || '';
  const customEndDate   = dateFilter?.dateTo   || '';

  // Compute range days for arrival averages display label
  const rangeDaysLabel = (() => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      const s = new Date(customStartDate);
      const e = new Date(customEndDate);
      const d = Math.max(1, Math.round((e - s) / 86400000) + 1);
      return `${d} days`;
    }
    const map = { today: '1 day', week: '7 days', month: '30 days', quarter: '90 days', year: '365 days' };
    return map[selectedRange] || '';
  })();

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="analytics-container">

      <header className="analytics-header">
        <div className="header-title-row">
          <h1><FiBarChart2 /> Analytics Overview</h1>
          <span className="range-badge">{rangeDaysLabel}</span>
        </div>
        <QuickFilterBar
          fields={ANALYTICS_FILTER_FIELDS}
          activeFilters={activeFilters}
          onChange={(f) => setActiveFilters(f)}
          resultLabel="bookings"
        />
      </header>

      <div className="analytics-content">
        {/* Overview Cards */}
        <section className="overview-section">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FiTrendingUp size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Bookings</p>
              <h3>{overview.totalBookings.toLocaleString()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <FiDollarSign size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Revenue</p>
              <h3>₱{Number(overview.totalRevenue).toLocaleString()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FiBarChart2 size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Avg Booking Value</p>
              <h3>₱{Number(overview.avgBookingValue).toLocaleString()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <FiUsers size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Unique Customers</p>
              <h3>{overview.uniqueCustomers.toLocaleString()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teal">
              <FiRepeat size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Repeat Customer Rate</p>
              <h3>{overview.repeatCustomerRate}%</h3>
            </div>
          </div>
        </section>

        {/* Branch Performance (only show when All is selected) */}
        {selectedBranch === 'All' && branchPerformance.length > 0 && (
          <section className="chart-section">
            <h2><FiHome style={{marginRight: '8px', verticalAlign: 'middle'}} /> Branch Performance</h2>

            {/* Branch chart */}
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#1e40af', '#93c5fd'],
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
                      labels: { 
                        formatter: (val) => `₱${(val/1000).toFixed(0)}k`,
                        style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } 
                      }
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

            {/* Arrival Averages per Branch */}
            <div className="branch-arrivals-section">
              <h3 className="subsection-title"><FiActivity style={{marginRight:'6px',verticalAlign:'middle'}} /> Arrival Averages per Branch <span className="subsection-note">({rangeDaysLabel})</span></h3>
              <div className="branch-arrivals-grid">
                {branchPerformance.map(b => (
                  <div key={b.name} className="branch-arrival-card">
                    <div className="branch-arrival-name">{b.name}</div>
                    <div className="branch-arrival-stats">
                      <div className="branch-arrival-stat">
                        <span className="bstat-label">Overall</span>
                        <span className="bstat-value">{b.arrivals}</span>
                      </div>
                      <div className="branch-arrival-stat">
                        <span className="bstat-label">Avg/Week</span>
                        <span className="bstat-value">{b.avgWeeklyArrivals}</span>
                      </div>
                      <div className="branch-arrival-stat">
                        <span className="bstat-label">Avg/Month</span>
                        <span className="bstat-value">{b.avgMonthlyArrivals}</span>
                      </div>
                      <div className="branch-arrival-stat">
                        <span className="bstat-label">Arrival Rate</span>
                        <span className="bstat-value rate">{b.arrivalRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Top Treatments */}
        <section className="chart-section">
          <h2><FiPackage style={{marginRight: '8px', verticalAlign: 'middle'}} /> Top Treatments</h2>
          <div className="chart-grid">
            <div className="chart-container">
              <h3>By Booking Count</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 6, horizontal: true } },
                  colors: ['#1e40af'],
                  xaxis: { 
                    categories: treatmentAnalysis.slice(0, 10).map(t => t.name),
                    title: { text: 'Count', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  dataLabels: { enabled: true, style: { fontSize: '11px', colors: [isDarkMode ? '#f1f5f9' : '#1f2937'] } },
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
                  colors: ['#10B981'],
                  xaxis: { 
                    categories: treatmentAnalysis.slice(0, 10).map(t => t.name),
                    title: { text: 'Revenue (₱)', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } },
                    labels: { formatter: (val) => `₱${Number(val).toLocaleString()}`, style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  tooltip: { y: { formatter: (val) => `₱${Number(val).toLocaleString()}` } },
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
                  chart: { ...getChartTheme().chart, type: 'donut' },
                  labels: revenueAnalysis.byPaymentMode.map(p => p.mode),
                  colors: ['#1e40af', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                  legend: { position: 'bottom', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  dataLabels: { 
                    enabled: true,
                    formatter: (val) => `${val.toFixed(1)}%`,
                    style: { colors: ['#fff'] }
                  },
                  tooltip: { y: { formatter: (val) => `₱${Number(val).toLocaleString()}` } },
                  plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `₱${revenueAnalysis.byPaymentMode.reduce((s, p) => s + p.revenue, 0).toLocaleString()}` } } } } }
                }}
                series={revenueAnalysis.byPaymentMode.map(p => p.revenue)}
                type="donut"
                height={320}
              />
            </div>
            <div className="chart-container">
              <h3>By Price Range</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%', dataLabels: { position: 'top' } } },
                  colors: ['#F59E0B'],
                  xaxis: { categories: revenueAnalysis.byPriceRange.map(p => p.range) },
                  yaxis: { title: { text: 'Bookings', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } } },
                  dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '11px', colors: [isDarkMode ? '#cbd5e1' : '#64748b'] } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Bookings', data: revenueAnalysis.byPriceRange.map(p => p.count) }]}
                type="bar"
                height={320}
              />
            </div>
          </div>
        </section>

        {/* Agent Performance — tabbed: Bookings/Revenue + Arrival Rate */}
        <section className="chart-section">
          <div className="section-header-row">
            <h2><FiUserCheck style={{marginRight: '8px', verticalAlign: 'middle'}} /> Agent Performance</h2>
            <div className="tab-group">
              <button className={`tab-btn${agentTab === 'bookings' ? ' active' : ''}`} onClick={() => setAgentTab('bookings')}>
                <FiAward /> Bookings & Revenue
              </button>
              <button className={`tab-btn${agentTab === 'arrival' ? ' active' : ''}`} onClick={() => setAgentTab('arrival')}>
                <FiTarget /> Arrival Rate
              </button>
            </div>
          </div>

          {agentTab === 'bookings' && (
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%' } },
                  colors: ['#1e40af', '#93c5fd'],
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
                      labels: { formatter: (val) => `₱${(val/1000).toFixed(0)}k`, style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    }
                  ],
                  dataLabels: { enabled: false },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' },
                  tooltip: { y: { formatter: (val, opts) => opts.seriesIndex === 1 ? `₱${Number(val).toLocaleString()}` : val } }
                }}
                series={[
                  { name: 'Bookings', data: agentPerformance.slice(0, 10).map(a => a.bookings) },
                  { name: 'Revenue (₱)', data: agentPerformance.slice(0, 10).map(a => a.revenue) }
                ]}
                type="bar"
                height={380}
              />
            </div>
          )}

          {agentTab === 'arrival' && (
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: true } },
                  plotOptions: { bar: { borderRadius: 8, horizontal: true, dataLabels: { position: 'top' } } },
                  colors: ['#10B981'],
                  xaxis: { 
                    categories: agentPerformance.slice(0, 10).map(a => a.name),
                    max: 100,
                    labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                  },
                  yaxis: { labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } } },
                  dataLabels: { enabled: true, formatter: (val) => `${val}%`, offsetX: -6, style: { fontSize: '12px', colors: ['#fff'] } },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Arrival Rate (%)', data: agentPerformance.slice(0, 10).map(a => a.arrivalRate || 0) }]}
                type="bar"
                height={380}
              />
            </div>
          )}
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
                  chart: { ...getChartTheme().chart, type: 'donut' },
                  labels: demographicAnalysis.byGender.map(g => g.gender),
                  colors: ['#1e40af', '#10B981', '#F59E0B'],
                  legend: { position: 'bottom', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%`, style: { colors: ['#fff'] } },
                  plotOptions: { pie: { donut: { size: '55%' } } }
                }}
                series={demographicAnalysis.byGender.map(g => g.count)}
                type="donut"
                height={300}
              />
            </div>
            <div className="chart-container">
              <h3>By Age Group</h3>
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                  plotOptions: { bar: { borderRadius: 8, columnWidth: '60%', dataLabels: { position: 'top' } } },
                  colors: ['#8B5CF6'],
                  xaxis: { categories: demographicAnalysis.byAgeGroup.map(a => a.ageGroup) },
                  yaxis: { title: { text: 'Customers', style: { color: isDarkMode ? '#cbd5e1' : '#64748b' } } },
                  dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '11px', colors: [isDarkMode ? '#cbd5e1' : '#64748b'] } },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                }}
                series={[{ name: 'Customers', data: demographicAnalysis.byAgeGroup.map(a => a.count) }]}
                type="bar"
                height={300}
              />
            </div>
          </div>
        </section>

        {/* Booking Trends */}
        {timeSeriesData.byMonth.length > 0 && (
          <section className="chart-section">
            <h2><FiCalendar style={{marginRight: '8px', verticalAlign: 'middle'}} /> Booking Trends</h2>
            <div className="chart-container">
              <Chart
                options={{
                  ...getChartTheme(),
                  chart: { ...getChartTheme().chart, type: 'line', toolbar: { show: true } },
                  colors: ['#1e40af', '#10B981'],
                  xaxis: { categories: timeSeriesData.byMonth.map(m => m.month), labels: { rotate: -45, style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } } },
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
                      labels: { formatter: (val) => `₱${(val/1000).toFixed(0)}k`, style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    }
                  ],
                  dataLabels: { enabled: false },
                  stroke: { curve: 'smooth', width: [3, 3] },
                  markers: { size: 4 },
                  grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' },
                  legend: { position: 'top', labels: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } },
                  tooltip: { y: { formatter: (val, opts) => opts.seriesIndex === 1 ? `₱${Number(val).toLocaleString()}` : val } }
                }}
                series={[
                  { name: 'Bookings', type: 'column', data: timeSeriesData.byMonth.map(m => m.count) },
                  { name: 'Revenue (₱)', type: 'line', data: timeSeriesData.byMonth.map(m => m.revenue) }
                ]}
                type="line"
                height={380}
              />
            </div>
          </section>
        )}

        {/* Marketing Channels */}
        {marketingChannels.length > 0 && (
          <section className="chart-section">
            <h2><FiActivity style={{marginRight: '8px', verticalAlign: 'middle'}} /> Marketing Channel Performance</h2>
            <div className="chart-grid">
              <div className="chart-container">
                <h3>Bookings by Channel</h3>
                <Chart
                  options={{
                    ...getChartTheme(),
                    chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                    plotOptions: { bar: { borderRadius: 6, horizontal: true } },
                    colors: ['#1e40af'],
                    xaxis: { 
                      categories: marketingChannels.slice(0, 10).map(m => m.channel),
                      labels: { style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    },
                    dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#fff'] } },
                    grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                  }}
                  series={[{ name: 'Bookings', data: marketingChannels.slice(0, 10).map(m => m.bookings) }]}
                  type="bar"
                  height={340}
                />
              </div>
              <div className="chart-container">
                <h3>Revenue by Channel</h3>
                <Chart
                  options={{
                    ...getChartTheme(),
                    chart: { ...getChartTheme().chart, type: 'bar', toolbar: { show: false } },
                    plotOptions: { bar: { borderRadius: 6, horizontal: true } },
                    colors: ['#10B981'],
                    xaxis: { 
                      categories: marketingChannels.slice(0, 10).map(m => m.channel),
                      labels: { formatter: (val) => `₱${(val/1000).toFixed(0)}k`, style: { colors: isDarkMode ? '#cbd5e1' : '#64748b' } }
                    },
                    tooltip: { y: { formatter: (val) => `₱${Number(val).toLocaleString()}` } },
                    dataLabels: { enabled: false },
                    grid: { strokeDashArray: 4, borderColor: isDarkMode ? '#334155' : '#e5e7eb' }
                  }}
                  series={[{ name: 'Revenue', data: marketingChannels.slice(0, 10).map(m => m.revenue) }]}
                  type="bar"
                  height={340}
                />
              </div>
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
