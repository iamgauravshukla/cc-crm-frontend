import React, { useState, useEffect, useCallback } from 'react';
import Chart from 'react-apexcharts';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { useTheme } from '../context/ThemeContext';
import { FiTrendingUp, FiDollarSign, FiUsers, FiAward, FiPercent, FiTarget, FiBarChart2, FiCalendar } from 'react-icons/fi';

function AgentPerformance() {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState('revenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedAgent, setSelectedAgent] = useState('All');
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const fetchPerformanceData = useCallback(async () => {
    // Don't fetch if custom date range is selected but dates aren't both filled
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    try {
      setLoading(true);
      const params = {};
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.days = dateRange;
      }
      
      const response = await api.get('/analytics/agent-performance', { params });
      if (response.data.success) {
        setPerformanceData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching agent performance:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const getAgentList = () => {
    if (!performanceData) return [];
    return performanceData.agents.map(a => a.name).sort();
  };

  const getFilteredAgents = () => {
    if (!performanceData) return [];
    if (selectedAgent === 'All') return performanceData.agents;
    return performanceData.agents.filter(a => a.name === selectedAgent);
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

  const comparisonChartOptions = performanceData ? {
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    chart: { 
      type: 'bar', 
      toolbar: { show: true },
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: { 
      enabled: false,
      style: {
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: getFilteredAgents().map(a => a.name),
      labels: { 
        rotate: -45,
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    yaxis: {
      title: { 
        text: 'Bookings & Revenue',
        style: {
          color: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      },
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: {
        formatter: function (val, opts) {
          if (opts.seriesIndex === 1) {
            return '₱' + val.toLocaleString();
          }
          return val;
        }
      }
    },
    colors: ['#2563EB', '#10B981'],
    legend: { 
      position: 'top',
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    },
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    }
  } : {};

  const comparisonChartSeries = performanceData ? [
    {
      name: 'Bookings',
      data: getFilteredAgents().map(a => a.bookings)
    },
    {
      name: 'Revenue',
      data: getFilteredAgents().map(a => Math.round(a.revenue / 100)) // Scale down for visibility
    }
  ] : [];

  const conversionChartOptions = performanceData ? {
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    chart: { 
      type: 'bar', 
      toolbar: { show: false },
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(1) + '%';
      },
      offsetX: -6,
      style: { 
        fontSize: '12px', 
        colors: ['#fff'] 
      }
    },
    xaxis: {
      categories: getFilteredAgents().map(a => a.name),
      max: 100,
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
    colors: ['#8B5CF6'],
    grid: { 
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light'
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  } : {};

  const conversionChartSeries = performanceData ? [{
    name: 'Conversion Rate',
    data: getFilteredAgents().map(a => a.conversionRate ?? 0)
  }] : [];

  const arrivalChartOptions = performanceData ? {
    theme: {
      mode: isDarkMode ? 'dark' : 'light'
    },
    chart: { 
      type: 'bar', 
      toolbar: { show: false },
      foreColor: isDarkMode ? '#cbd5e1' : '#64748b',
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(1) + '%';
      },
      offsetX: -6,
      style: { 
        fontSize: '12px', 
        colors: ['#fff'] 
      }
    },
    xaxis: {
      categories: getFilteredAgents().map(a => a.name),
      max: 100,
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
    colors: ['#10B981'],
    grid: { 
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light'
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  } : {};

  const arrivalChartSeries = performanceData ? [{
    name: 'Arrival Rate',
    data: getFilteredAgents().map(a => a.arrivalRate ?? 0)
  }] : [];

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="bookings-header">
            <div className="header-left">
              <h1><FiBarChart2 /> Agent Performance Report</h1>
              <p className="page-subtitle">Detailed analysis of agent performance and metrics</p>
            </div>
            
            <div className="header-right">
              <div className="filters-section">
                <div className="filter-group">
                  <label><FiCalendar /> Date Range:</label>
                  <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value)}
                    className="filter-select"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="15">Last 15 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="60">Last 60 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {dateRange === 'custom' && (
                  <div className="custom-date-range">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      max={customEndDate || new Date().toISOString().split('T')[0]}
                      className="date-input"
                      placeholder="Start Date"
                    />
                    <span className="date-separator">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={customStartDate}
                      max={new Date().toISOString().split('T')[0]}
                      className="date-input"
                      placeholder="End Date"
                    />
                  </div>
                )}
                <div className="filter-group">
                  <label><FiUsers /> Agent:</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Agents</option>
                    {getAgentList().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
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

              {/* Arrivals Averages Section */}
              <div className="analytics-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analytics-card-header">
                  <h3><FiTarget /> Arrival Averages per Agent</h3>
                  <p>Overall, weekly, and monthly arrival averages for the selected date range</p>
                </div>
                <div className="analytics-card-body">
                  <div className="arrivals-averages-grid">
                    {getFilteredAgents().map(agent => (
                      <div key={agent.name} className="arrivals-agent-card">
                        <div className="arrivals-agent-name">{agent.name}</div>
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

              {/* Comparison Charts */}
              <div className="analytics-grid-single">
                <div className="analytics-card">
                  <div className="analytics-card-header">
                    <h3><FiTrendingUp /> Bookings & Revenue Comparison</h3>
                    <p>Compare performance across all agents</p>
                  </div>
                  <div className="analytics-card-body">
                    <Chart
                      options={comparisonChartOptions}
                      series={comparisonChartSeries}
                      type="bar"
                      height={350}
                    />
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="analytics-card-header">
                    <h3><FiPercent /> Conversion Rate by Agent</h3>
                    <p>Percentage of bookings converted to sales</p>
                  </div>
                  <div className="analytics-card-body">
                    <Chart
                      options={conversionChartOptions}
                      series={conversionChartSeries}
                      type="bar"
                      height={350}
                    />
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="analytics-card-header">
                    <h3><FiTarget /> Arrival Rate by Agent</h3>
                    <p>Percentage of customers who arrived from bookings</p>
                  </div>
                  <div className="analytics-card-body">
                    <Chart
                      options={arrivalChartOptions}
                      series={arrivalChartSeries}
                      type="bar"
                      height={350}
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
                              const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
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
    </>
  );
}

export default AgentPerformance;
