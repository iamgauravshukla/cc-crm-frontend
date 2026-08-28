import React, { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import api, { getAgentBookings } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import QuickFilterBar from '../components/QuickFilterBar';
import { useTheme } from '../context/ThemeContext';
import { FiTrendingUp, FiDollarSign, FiUsers, FiAward, FiPercent, FiTarget, FiBarChart2, FiX, FiMaximize2 } from 'react-icons/fi';

// Status → colour, mirroring the Monday per-agent charts.
const STATUS_COLORS = {
  'Arrived & Bought': '#10B981',
  'Arrived Not Potential': '#EF4444',
  'Arrived On Treatment': '#22C55E',
  'Comeback & Bought': '#14B8A6',
  'Comeback': '#0EA5E9',
  'Cancelled': '#6B7280',
  'Scheduled': '#3B82F6',
  'Promo Hunter': '#F59E0B',
  'No Show': '#9CA3AF',
  'Refund': '#F43F5E',
  'Old Client': '#8B5CF6',
};
const statusColor = (label) => STATUS_COLORS[label] || '#A78BFA';

function AgentPerformance() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [modalAgent, setModalAgent] = useState(null); // agent whose breakdown modal is open
  const [modalDrill, setModalDrill] = useState(null); // { status, bookings, loading } — bar clicked inside the modal
  const [activeFilters, setActiveFilters] = useState([
    { id: 'qf-date-default', field: 'dateRange', fieldLabel: 'Date Range', operator: 'is', value: '30', dateFrom: '', dateTo: '', displayValue: 'Last 30 Days' },
  ]);
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');

  // Derived from activeFilters
  const dateFilter   = activeFilters.find(f => f.field === 'dateRange');
  const agentFilter  = activeFilters.find(f => f.field === 'agent');
  const dateValue    = dateFilter?.value || '30';
  const customStart  = dateFilter?.dateFrom || '';
  const customEnd    = dateFilter?.dateTo   || '';
  const selectedAgent = agentFilter?.value || 'All';

  // Dynamic filter fields — agent options populated once data loads
  const agentFilterFields = [
    {
      key: 'dateRange',
      fieldLabel: 'Date Range',
      type: 'datepreset',
      options: [
        { value: '7',      label: 'Last 7 Days' },
        { value: '15',     label: 'Last 15 Days' },
        { value: '30',     label: 'Last 30 Days' },
        { value: '60',     label: 'Last 60 Days' },
        { value: '90',     label: 'Last 90 Days' },
        { value: 'custom', label: 'Custom Range' },
      ],
    },
    {
      key: 'agent',
      fieldLabel: 'Agent',
      type: 'select',
      options: performanceData ? performanceData.agents.map(a => a.name).sort() : [],
    },
  ];
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const fetchPerformanceData = useCallback(async () => {
    if (dateValue === 'custom' && (!customStart || !customEnd)) return;
    try {
      setLoading(true);
      const params = {};
      if (dateValue === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate   = customEnd;
      } else {
        params.days = dateValue;
      }
      const response = await api.get('/analytics/agent-performance', { params });
      if (response.data.success) setPerformanceData(response.data.data);
    } catch (error) {
      console.error('Error fetching agent performance:', error);
    } finally {
      setLoading(false);
    }
  }, [dateValue, customStart, customEnd]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // Bookings behind one status bar of the per-agent modal (click a bar / legend row).
  const loadAgentDrill = async (agentName, status) => {
    if (modalDrill?.status === status) { setModalDrill(null); return; } // toggle off
    setModalDrill({ status, bookings: [], loading: true });
    try {
      const params = { agent: agentName, status };
      if (dateValue === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate   = customEnd;
      } else {
        params.days = dateValue;
      }
      const res = await getAgentBookings(params);
      setModalDrill(prev => prev?.status === status
        ? { status, bookings: res.data.bookings || [], loading: false }
        : prev);
    } catch {
      setModalDrill(prev => prev?.status === status ? { status, bookings: [], loading: false } : prev);
    }
  };

  const PLACEHOLDER_AGENTS = new Set(['no data', 'unknown', 'n/a', '-', '', 'none', 'unassigned']);

  const getFilteredAgents = () => {
    if (!performanceData) return [];
    const real = performanceData.agents.filter(a => !PLACEHOLDER_AGENTS.has((a.name || '').toLowerCase().trim()));
    if (selectedAgent === 'All') return real;
    return real.filter(a => a.name === selectedAgent);
  };

  const getSortedAgents = () => {
    const agents = [...getFilteredAgents()];
    agents.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      if (sortOrder === 'desc') return bVal - aVal;
      return aVal - bVal;
    });
    return agents;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Compute once for all charts
  const chartAgents = getFilteredAgents();
  const avgConv = chartAgents.length
    ? (chartAgents.reduce((s, a) => s + (a.conversionRate ?? 0), 0) / chartAgents.length).toFixed(1)
    : 0;
  const avgArr = chartAgents.length
    ? (chartAgents.reduce((s, a) => s + (a.arrivalRate ?? 0), 0) / chartAgents.length).toFixed(1)
    : 0;
  const topRevAgent = chartAgents.length
    ? [...chartAgents].sort((a, b) => b.revenue - a.revenue)[0]
    : null;

  // Per-bar colors for rate charts: green ≥50%, amber ≥30%, red <30%
  const convColors = chartAgents.map(a =>
    (a.conversionRate ?? 0) >= 50 ? '#10B981' : (a.conversionRate ?? 0) >= 30 ? '#F59E0B' : '#EF4444'
  );
  const arrColors = chartAgents.map(a =>
    (a.arrivalRate ?? 0) >= 50 ? '#10B981' : (a.arrivalRate ?? 0) >= 30 ? '#F59E0B' : '#EF4444'
  );

  const axisLabel = isDarkMode ? '#cbd5e1' : '#64748b';
  const gridLine  = isDarkMode ? '#334155' : '#f0f0f0';

  // ── Chart 1: Bookings (bars) + Revenue (line), dual Y-axis ──
  const comparisonChartOptions = performanceData ? {
    theme: { mode: isDarkMode ? 'dark' : 'light' },
    chart: {
      type: 'bar',
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
      foreColor: axisLabel,
      background: 'transparent',
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: { columnWidth: '48%', borderRadius: 4, borderRadiusApplication: 'end' },
    },
    dataLabels: { enabled: false },
    stroke: { width: [0, 3], curve: 'smooth' },
    colors: ['#1e40af', '#10B981'],
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shade: isDarkMode ? 'dark' : 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        opacityFrom: 1,
        opacityTo: 0.8,
      },
    },
    xaxis: {
      categories: chartAgents.map(a => a.name),
      labels: { rotate: -35, style: { colors: axisLabel, fontSize: '12px' } },
      axisBorder: { color: gridLine },
      axisTicks: { color: gridLine },
    },
    yaxis: [
      {
        seriesName: 'Bookings',
        title: { text: 'Bookings', style: { color: '#1e40af', fontWeight: 600, fontSize: '12px' } },
        labels: { style: { colors: axisLabel } },
        min: 0,
      },
      {
        seriesName: 'Revenue (₱)',
        opposite: true,
        title: { text: 'Revenue (₱)', style: { color: '#10B981', fontWeight: 600, fontSize: '12px' } },
        labels: {
          formatter: (v) => v >= 1000 ? '₱' + (v / 1000).toFixed(0) + 'k' : '₱' + v,
          style: { colors: axisLabel },
        },
        min: 0,
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      theme: isDarkMode ? 'dark' : 'light',
      y: { formatter: (val, opts) => opts.seriesIndex === 1 ? '₱' + val.toLocaleString() : val + ' bookings' },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -8,
      labels: { colors: axisLabel },
      markers: { radius: 3 },
    },
    grid: {
      borderColor: gridLine,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    markers: { size: [0, 5], strokeWidth: 2, hover: { size: 7 } },
  } : {};

  const comparisonChartSeries = performanceData ? [
    { name: 'Bookings',    type: 'bar',  data: chartAgents.map(a => a.bookings) },
    { name: 'Revenue (₱)', type: 'line', data: chartAgents.map(a => a.revenue) },
  ] : [];

  // ── Chart 2: Conversion Rate — distributed color per bar ──
  const conversionChartOptions = performanceData ? {
    theme: { mode: isDarkMode ? 'dark' : 'light' },
    chart: {
      type: 'bar',
      toolbar: { show: false },
      foreColor: axisLabel,
      background: 'transparent',
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: { horizontal: true, distributed: true, dataLabels: { position: 'top' }, borderRadius: 4 },
    },
    colors: convColors.length ? convColors : ['#10B981'],
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(1) + '%',
      offsetX: -6,
      style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] },
    },
    xaxis: {
      categories: chartAgents.map(a => a.name),
      max: 100,
      labels: { formatter: (v) => v + '%', style: { colors: axisLabel, fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: axisLabel, fontSize: '13px' } },
    },
    annotations: {
      xaxis: [{
        x: 50,
        borderColor: isDarkMode ? '#64748b' : '#94a3b8',
        strokeDashArray: 5,
        label: {
          text: 'Target 50%',
          borderColor: 'transparent',
          style: { color: axisLabel, fontSize: '11px', background: 'transparent' },
        },
      }],
    },
    grid: {
      borderColor: gridLine,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      padding: { left: 0, right: 10 },
    },
    legend: { show: false },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: { formatter: (val) => val.toFixed(1) + '%' },
    },
  } : {};

  const conversionChartSeries = performanceData ? [{
    name: 'Conversion Rate',
    data: chartAgents.map(a => parseFloat((a.conversionRate ?? 0).toFixed(2))),
  }] : [];

  // ── Chart 3: Arrival Rate — distributed color per bar ──
  const arrivalChartOptions = performanceData ? {
    theme: { mode: isDarkMode ? 'dark' : 'light' },
    chart: {
      type: 'bar',
      toolbar: { show: false },
      foreColor: axisLabel,
      background: 'transparent',
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: { horizontal: true, distributed: true, dataLabels: { position: 'top' }, borderRadius: 4 },
    },
    colors: arrColors.length ? arrColors : ['#10B981'],
    dataLabels: {
      enabled: true,
      formatter: (val) => val.toFixed(1) + '%',
      offsetX: -6,
      style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] },
    },
    xaxis: {
      categories: chartAgents.map(a => a.name),
      max: 100,
      labels: { formatter: (v) => v + '%', style: { colors: axisLabel, fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: axisLabel, fontSize: '13px' } },
    },
    annotations: {
      xaxis: [{
        x: 40,
        borderColor: isDarkMode ? '#64748b' : '#94a3b8',
        strokeDashArray: 5,
        label: {
          text: 'Target 40%',
          borderColor: 'transparent',
          style: { color: axisLabel, fontSize: '11px', background: 'transparent' },
        },
      }],
    },
    grid: {
      borderColor: gridLine,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      padding: { left: 0, right: 10 },
    },
    legend: { show: false },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: { formatter: (val) => val.toFixed(1) + '%' },
    },
  } : {};

  const arrivalChartSeries = performanceData ? [{
    name: 'Arrival Rate',
    data: chartAgents.map(a => parseFloat((a.arrivalRate ?? 0).toFixed(2))),
  }] : [];

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          {/* Page header */}
          <div className="ap-page-header">
            <div className="ap-title-row">
              <div>
                <h1 className="ap-title"><FiBarChart2 /> Agent Performance</h1>
                <p className="page-subtitle">Detailed analysis of agent performance and metrics</p>
              </div>
              {performanceData && (
                <div className="ap-summary-pills">
                  <span className="ap-pill ap-pill-blue"><FiUsers size={13}/> {performanceData.summary.totalAgents} Agents</span>
                  <span className="ap-pill ap-pill-green"><FiDollarSign size={13}/> ₱{performanceData.summary.totalRevenue.toLocaleString()}</span>
                  <span className="ap-pill ap-pill-purple"><FiPercent size={13}/> {performanceData.summary.avgConversion.toFixed(1)}% Avg Conv.</span>
                </div>
              )}
            </div>
            <QuickFilterBar
              fields={agentFilterFields}
              activeFilters={activeFilters}
              onChange={setActiveFilters}
              resultCount={performanceData ? getFilteredAgents().length : undefined}
              resultLabel="agents"
            />
          </div>

          {loading ? (
            <Loader />
          ) : performanceData ? (
            <>
              {/* Overview Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <FiUsers />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Active Agents</p>
                    <h2 className="stat-value">{performanceData.summary.totalAgents}</h2>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon pink">
                    <FiTarget />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Total Bookings</p>
                    <h2 className="stat-value">{performanceData.summary.totalBookings}</h2>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon cyan">
                    <FiDollarSign />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Total Revenue</p>
                    <h2 className="stat-value">₱{performanceData.summary.totalRevenue.toLocaleString()}</h2>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">
                    <FiPercent />
                  </div>
                  <div className="stat-content">
                    <p className="stat-label">Avg Conversion</p>
                    <h2 className="stat-value">{performanceData.summary.avgConversion.toFixed(1)}%</h2>
                  </div>
                </div>
              </div>

              {/* Top Performers Leaderboard */}
              {getSortedAgents().length > 0 && (
                <div className="ap-leaderboard-section">
                  <h2 className="ap-leaderboard-title"><FiAward /> Top Performers</h2>
                  <div className="ap-leaderboard">
                    {getSortedAgents().slice(0, 3).map((agent, idx) => {
                      const medals  = ['🥇', '🥈', '🥉'];
                      const colors  = ['#f59e0b', '#94a3b8', '#cd7f32'];
                      const heights = [120, 90, 75];
                      return (
                        <div key={agent.name} className={`ap-podium ap-podium-${idx + 1}`} style={{ order: idx === 0 ? 2 : idx === 1 ? 1 : 3 }}>
                          <div className="ap-podium-card" style={{ borderTop: `3px solid ${colors[idx]}` }}>
                            <div className="ap-podium-medal">{medals[idx]}</div>
                            <div className="ap-podium-name">{agent.name}</div>
                            <div className="ap-podium-stats">
                              <div className="ap-podium-stat">
                                <span className="ap-podium-val">₱{agent.revenue.toLocaleString()}</span>
                                <span className="ap-podium-lbl">Revenue</span>
                              </div>
                              <div className="ap-podium-stat">
                                <span className="ap-podium-val">{agent.bookings}</span>
                                <span className="ap-podium-lbl">Bookings</span>
                              </div>
                              <div className="ap-podium-stat">
                                <span className="ap-podium-val">{(agent.conversionRate ?? 0).toFixed(1)}%</span>
                                <span className="ap-podium-lbl">Conv.</span>
                              </div>
                            </div>
                          </div>
                          <div className="ap-podium-block" style={{ height: heights[idx], background: colors[idx] }}>
                            <span className="ap-podium-rank">#{idx + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Arrivals Averages Section */}
              <div className="analytics-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analytics-card-header">
                  <h3><FiTarget /> Arrival Averages per Agent</h3>
                  <p>Overall, weekly, and monthly arrival averages for the selected date range</p>
                </div>
                <div className="analytics-card-body">
                  <div className="arrivals-averages-grid">
                    {getFilteredAgents().map(agent => (
                      <div
                        key={agent.name}
                        className="arrivals-agent-card arrivals-agent-card--clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => { setModalAgent(agent); setModalDrill(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalAgent(agent); setModalDrill(null); } }}
                        title={`View ${agent.name}'s booking breakdown`}
                      >
                        <div className="arrivals-agent-name">
                          {agent.name}
                          <FiMaximize2 className="arrivals-agent-expand" size={13} />
                        </div>
                        <div className="arrivals-stats-row">
                          <div className="arrivals-stat">
                            <span className="arrivals-stat-label">Overall</span>
                            <span className="arrivals-stat-value">{agent.arrivals}</span>
                          </div>
                          <div className="arrivals-stat">
                            <span className="arrivals-stat-label">Avg / Week</span>
                            <span className="arrivals-stat-value">{agent.avgWeeklyArrivals ?? '—'}</span>
                          </div>
                          <div className="arrivals-stat">
                            <span className="arrivals-stat-label">Avg / Month</span>
                            <span className="arrivals-stat-value">{agent.avgMonthlyArrivals ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Full-width Bookings & Revenue Combo Chart ── */}
              <div className="analytics-card ap-chart-full-card">
                <div className="ap-chart-header">
                  <div className="ap-chart-header-left">
                    <div className="ap-chart-icon-wrap ap-ci-blue"><FiTrendingUp size={16} /></div>
                    <div>
                      <h3 className="ap-chart-title">Bookings &amp; Revenue Comparison</h3>
                      <p className="ap-chart-subtitle">Bars = bookings count &nbsp;·&nbsp; Line = total revenue per agent</p>
                    </div>
                  </div>
                  {topRevAgent && (
                    <div className="ap-chart-header-badge">
                      <span className="ap-chb-label">Top Earner</span>
                      <span className="ap-chb-name">{topRevAgent.name}</span>
                      <span className="ap-chb-val">₱{topRevAgent.revenue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="analytics-card-body">
                  <Chart
                    options={comparisonChartOptions}
                    series={comparisonChartSeries}
                    type="bar"
                    height={320}
                  />
                </div>
              </div>

              {/* ── 2-col: Conversion Rate + Arrival Rate ── */}
              <div className="ap-charts-2col">
                <div className="analytics-card">
                  <div className="ap-chart-header">
                    <div className="ap-chart-header-left">
                      <div className="ap-chart-icon-wrap ap-ci-purple"><FiPercent size={16} /></div>
                      <div>
                        <h3 className="ap-chart-title">Conversion Rate by Agent</h3>
                        <p className="ap-chart-subtitle">Percentage of bookings converted to sales</p>
                      </div>
                    </div>
                    <div className="ap-chart-rate-badges">
                      <span className="ap-crb ap-crb-green">≥50% Good</span>
                      <span className="ap-crb ap-crb-amber">≥30% OK</span>
                      <span className="ap-crb ap-crb-red">&lt;30% Low</span>
                      <span className="ap-crb ap-crb-avg">Avg: {avgConv}%</span>
                    </div>
                  </div>
                  <div className="analytics-card-body">
                    <Chart
                      options={conversionChartOptions}
                      series={conversionChartSeries}
                      type="bar"
                      height={Math.max(220, chartAgents.length * 44)}
                    />
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="ap-chart-header">
                    <div className="ap-chart-header-left">
                      <div className="ap-chart-icon-wrap ap-ci-green"><FiTarget size={16} /></div>
                      <div>
                        <h3 className="ap-chart-title">Arrival Rate by Agent</h3>
                        <p className="ap-chart-subtitle">Percentage of customers who arrived from bookings</p>
                      </div>
                    </div>
                    <div className="ap-chart-rate-badges">
                      <span className="ap-crb ap-crb-green">≥50% Good</span>
                      <span className="ap-crb ap-crb-amber">≥30% OK</span>
                      <span className="ap-crb ap-crb-red">&lt;30% Low</span>
                      <span className="ap-crb ap-crb-avg">Avg: {avgArr}%</span>
                    </div>
                  </div>
                  <div className="analytics-card-body">
                    <Chart
                      options={arrivalChartOptions}
                      series={arrivalChartSeries}
                      type="bar"
                      height={Math.max(220, chartAgents.length * 44)}
                    />
                  </div>
                </div>
              </div>


              {/* Detailed Performance Table */}
              <div className="bookings-section">
                <h2 className="section-title"><FiAward /> Detailed Agent Performance</h2>
                <div className="table-container">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Agent Name</th>
                        <th onClick={() => handleSort('bookings')} style={{ cursor: 'pointer' }}>
                          Total Bookings {sortBy === 'bookings' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer' }}>
                          Total Revenue {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('avgBookingValue')} style={{ cursor: 'pointer' }}>
                          Avg Booking {sortBy === 'avgBookingValue' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('conversionRate')} style={{ cursor: 'pointer' }}>
                          Conversion % {sortBy === 'conversionRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('arrivalRate')} style={{ cursor: 'pointer' }}>
                          Arrival Rate % {sortBy === 'arrivalRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('converted')} style={{ cursor: 'pointer' }}>
                          Converted {sortBy === 'converted' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th onClick={() => handleSort('promoHunters')} style={{ cursor: 'pointer' }}>
                          Promo Hunters {sortBy === 'promoHunters' && (sortOrder === 'desc' ? '↓' : '↑')}
                        </th>
                        <th>Top Treatment</th>
                        <th>Top Branch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedAgents().map((agent, index) => (
                        <tr key={agent.name}>
                          <td><strong>{index + 1}</strong></td>
                          <td><strong>{agent.name}</strong></td>
                          <td>{agent.bookings}</td>
                          <td><strong>₱{agent.revenue.toLocaleString()}</strong></td>
                          <td>₱{agent.avgBookingValue.toLocaleString()}</td>
                          <td>
                            <span className={`conversion-badge ${agent.conversionRate >= 50 ? 'high' : agent.conversionRate >= 30 ? 'medium' : 'low'}`}>
                              {(agent.conversionRate ?? 0).toFixed(1)}%
                            </span>
                          </td>
                          <td>
                            <span className={`arrival-badge ${agent.arrivalRate >= 50 ? 'high' : agent.arrivalRate >= 30 ? 'medium' : 'low'}`}>
                              {(agent.arrivalRate ?? 0).toFixed(1)}%
                            </span>
                          </td>
                          <td>{agent.converted}</td>
                          <td>
                            <span className="promo-hunter-badge">{agent.promoHunters}</span>
                          </td>
                          <td>{agent.topTreatment || '-'}</td>
                          <td>{agent.topBranch || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Treatment Distribution */}
              {performanceData.agents && performanceData.agents.length > 0 && (
                <div className="treatment-section">
                  <h2 className="section-title">📊 Treatment Distribution by Agent</h2>
                  <div className="treatment-distribution-grid">
                    {getFilteredAgents().map((agent) => {
                      const totalTreatments = agent.treatments ? agent.treatments.reduce((sum, t) => sum + t.count, 0) : 0;
                      
                      return (
                        <div key={agent.name} className="agent-treatment-card">
                          <div className="agent-treatment-header">
                            <div className="agent-info">
                              <h4>{agent.name}</h4>
                              <span className="total-treatments">{totalTreatments} treatments</span>
                            </div>
                            <div className="agent-stats-mini">
                              <div className="stat-mini">
                                <span className="label">Bookings</span>
                                <span className="value">{agent.bookings}</span>
                              </div>
                              <div className="stat-mini">
                                <span className="label">Revenue</span>
                                <span className="value">₱{agent.revenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="treatments-list">
                            {agent.treatments && agent.treatments.slice(0, 5).map((treatment, idx) => {
                              const percentage = totalTreatments > 0 ? (treatment.count / totalTreatments * 100) : 0;
                              const colors = ['#1e40af', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
                              const color = colors[idx % colors.length];
                              
                              return (
                                <div key={idx} className="treatment-row">
                                  <div className="treatment-info">
                                    <span className="treatment-rank" style={{ backgroundColor: color }}>
                                      #{idx + 1}
                                    </span>
                                    <span className="treatment-text">{treatment.name}</span>
                                  </div>
                                  <div className="treatment-metrics">
                                    <div className="progress-bar-container">
                                      <div 
                                        className="progress-bar-fill" 
                                        style={{ 
                                          width: `${percentage}%`,
                                          backgroundColor: color
                                        }}
                                      />
                                    </div>
                                    <div className="treatment-count-info">
                                      <span className="count">{treatment.count}</span>
                                      <span className="percentage">{percentage.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {(!agent.treatments || agent.treatments.length === 0) && (
                              <div className="no-treatments">No treatment data available</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">No performance data available</div>
          )}
        </div>
      </div>

      {/* Per-agent booking-breakdown modal (expandable graph) */}
      {modalAgent && (() => {
        const entries = Object.entries(modalAgent.statusBreakdown || {}).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, [, n]) => s + n, 0);
        const cats = entries.map(([k]) => k);
        const colors = cats.map(statusColor);
        const options = {
          chart: {
            type: 'bar', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit',
            events: {
              dataPointSelection: (_ev, _ctx, config) => {
                const st = cats[config.dataPointIndex];
                if (st) loadAgentDrill(modalAgent.name, st);
              },
            },
          },
          theme: { mode: isDarkMode ? 'dark' : 'light' },
          plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true, dataLabels: { position: 'top' }, cursor: 'pointer' } },
          states: { active: { filter: { type: 'darken', value: 0.7 } } },
          dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', fontWeight: 700, colors: [isDarkMode ? '#e2e8f0' : '#1e293b'] } },
          colors,
          legend: { show: false },
          grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
          xaxis: { categories: cats, labels: { rotate: -25, style: { colors: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
          yaxis: { labels: { style: { colors: isDarkMode ? '#94a3b8' : '#64748b' } } },
          tooltip: { theme: isDarkMode ? 'dark' : 'light', y: { formatter: (v) => `${v} booking${v !== 1 ? 's' : ''}` } },
        };
        const series = [{ name: 'Bookings', data: entries.map(([, n]) => n) }];
        return (
          <div className="modal-overlay" onClick={() => { setModalAgent(null); setModalDrill(null); }}>
            <div className="modal-content ap-agent-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{modalAgent.name} — Booking Breakdown</h2>
                <button className="modal-close-btn" onClick={() => { setModalAgent(null); setModalDrill(null); }} aria-label="Close"><FiX size={22} /></button>
              </div>
              <div className="ap-agent-modal-body">
                <div className="ap-agent-modal-stats">
                  <div className="ap-am-stat"><span className="ap-am-label">Total Bookings</span><span className="ap-am-value">{modalAgent.bookings}</span></div>
                  <div className="ap-am-stat"><span className="ap-am-label">Arrivals</span><span className="ap-am-value" style={{ color: '#10B981' }}>{modalAgent.arrivals}</span></div>
                  <div className="ap-am-stat"><span className="ap-am-label">Conversion</span><span className="ap-am-value">{(modalAgent.conversionRate ?? 0).toFixed(1)}%</span></div>
                  <div className="ap-am-stat"><span className="ap-am-label">Arrival Rate</span><span className="ap-am-value">{(modalAgent.arrivalRate ?? 0).toFixed(1)}%</span></div>
                  <div className="ap-am-stat"><span className="ap-am-label">Revenue</span><span className="ap-am-value">₱{Number(modalAgent.revenue || 0).toLocaleString()}</span></div>
                </div>
                {total > 0 ? (
                  <>
                    <Chart options={options} series={series} type="bar" height={360} />
                    <div className="ap-am-hint">Click a bar or a status below to see its bookings</div>
                    <div className="ap-am-legend">
                      {entries.map(([k, n]) => (
                        <div
                          key={k}
                          className={`ap-am-legend-item ap-am-legend-item--clickable${modalDrill?.status === k ? ' active' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => loadAgentDrill(modalAgent.name, k)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadAgentDrill(modalAgent.name, k); } }}
                          title={`Show ${modalAgent.name}'s ${k} bookings`}
                        >
                          <span className="ap-am-dot" style={{ background: statusColor(k) }} />
                          <span className="ap-am-legend-label">{k}</span>
                          <span className="ap-am-legend-count">{n}</span>
                        </div>
                      ))}
                    </div>
                    {modalDrill && (
                      <div className="ap-am-drill">
                        <div className="ap-am-drill-header">
                          <span className="ap-am-dot" style={{ background: statusColor(modalDrill.status) }} />
                          <strong>{modalDrill.status}</strong>
                          {!modalDrill.loading && (
                            <span className="ap-am-drill-count">{modalDrill.bookings.length} booking{modalDrill.bookings.length !== 1 ? 's' : ''}</span>
                          )}
                          <button className="ap-am-drill-close" onClick={() => setModalDrill(null)} title="Close"><FiX size={14} /></button>
                        </div>
                        {modalDrill.loading ? (
                          <div className="ap-am-drill-msg">Loading bookings…</div>
                        ) : modalDrill.bookings.length === 0 ? (
                          <div className="ap-am-drill-msg">No bookings found.</div>
                        ) : (
                          <div className="ap-am-drill-tablewrap">
                            <table className="bookings-table">
                              <thead>
                                <tr>
                                  <th>Name</th><th>Date</th><th>Branch</th><th>Treatment</th><th>Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {modalDrill.bookings.map((b) => (
                                  <tr key={b.recordId}>
                                    <td><strong>{b.firstName} {b.lastName}</strong>{b.isPromoHunter && <span title="Promo Hunter"> 🎯</span>}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{b.date}{b.time ? ` · ${b.time}` : ''}</td>
                                    <td>{b.branch}</td>
                                    <td>{b.treatment}</td>
                                    <td>₱{Number(b.totalPrice || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-data" style={{ padding: '2rem' }}>No booking status data for this agent in the selected range.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

export default AgentPerformance;
