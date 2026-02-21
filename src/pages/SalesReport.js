import React, { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiTrendingUp, FiCalendar, FiBarChart2, FiArrowUp, FiArrowDown, FiUsers, FiInfo } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '../context/ThemeContext';
import { getSalesReport } from '../services/api';
import './SalesReport.css';

const SalesReport = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [openTooltipId, setOpenTooltipId] = useState(null);

  const fetchSalesReport = useCallback(async () => {
    try {
      if (!appliedStartDate || !appliedEndDate) {
        return;
      }
      setLoading(true);
      const response = await getSalesReport({ startDate: appliedStartDate, endDate: appliedEndDate });
      setSalesData(response.data.data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
    } finally {
      setLoading(false);
    }
  }, [appliedEndDate, appliedStartDate]);

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = start.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);
    setAppliedStartDate(startStr);
    setAppliedEndDate(endStr);
  }, []);

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
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      }
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light'
    },
    dataLabels: {
      style: {
        colors: [isDarkMode ? '#cbd5e1' : '#64748b']
      }
    },
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e2e8f0'
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  });

  // Helper functions for insights
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  const getTopBranches = () => {
    if (!salesData) return [];
    const allBranches = rangeSales.byBranch || [];
    return allBranches.sort((a, b) => b.sales - a.sales).slice(0, 5);
  };

  const getTotalBookings = () => salesData?.totalBookings || 0;

  const getAverageSaleValue = () => {
    const total = rangeSales.overall || 0;
    const bookings = getTotalBookings();
    return bookings > 0 ? Math.round(total / bookings) : 0;
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const now = new Date();
  const appliedStart = appliedStartDate ? new Date(appliedStartDate) : null;
  const appliedEnd = appliedEndDate ? new Date(appliedEndDate) : null;
  const rangeDisplay = appliedStart && appliedEnd
    ? `${formatDate(appliedStart)} - ${formatDate(appliedEnd)}`
    : 'Select range';
  const todayStr = now.toISOString().split('T')[0];
  const rangeSales = salesData?.rangeSales || { overall: 0, byBranch: [] };
  const previousRangeSales = salesData?.previousRangeSales || { overall: 0, byBranch: [] };
  const rangeFirstHalfSales = salesData?.rangeFirstHalfSales || { overall: 0, byBranch: [] };
  const rangeSecondHalfSales = salesData?.rangeSecondHalfSales || { overall: 0, byBranch: [] };
  const arrivalRateByBranch = salesData?.arrivalRateByBranch || [];
  const arrivalRateMap = arrivalRateByBranch.reduce((acc, item) => {
    acc[item.branch] = item;
    return acc;
  }, {});
  const dailyTrendData = salesData?.dailySalesAndBookings || [];
  const monthlyTrendData = salesData?.monthlySalesAndBookings || [];
  const rangeDays = appliedStart && appliedEnd
    ? Math.floor((appliedEnd.getTime() - appliedStart.getTime()) / 86400000) + 1
    : 0;
  const previousRangeDisplay = appliedStart && appliedEnd && rangeDays > 0
    ? (() => {
        const previousEnd = new Date(appliedStart.getTime() - 86400000);
        const previousStart = new Date(previousEnd.getTime() - (rangeDays - 1) * 86400000);
        return `${formatDate(previousStart)} - ${formatDate(previousEnd)}`;
      })()
    : 'Select range';
  const useDailyTrend = rangeDays > 0 && rangeDays <= 31 && dailyTrendData.length > 0;
  const toggleTooltip = (id) => {
    setOpenTooltipId((current) => (current === id ? null : id));
  };
  const renderInfoTooltip = (id, content) => (
    <span className="info-tooltip">
      <button
        type="button"
        className="info-btn"
        aria-label="Info"
        aria-expanded={openTooltipId === id}
        onClick={() => toggleTooltip(id)}
      >
        <FiInfo />
      </button>
      {openTooltipId === id && (
        <span className="info-popover" role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
  const formatShortDate = (dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const trendCategories = useDailyTrend
    ? dailyTrendData.map((item) => formatShortDate(item.date))
    : monthlyTrendData.map((item) => item.month);
  const trendSales = useDailyTrend
    ? dailyTrendData.map((item) => item.sales)
    : monthlyTrendData.map((item) => item.sales);
  const trendBookings = useDailyTrend
    ? dailyTrendData.map((item) => item.bookings)
    : monthlyTrendData.map((item) => item.bookings);

  const handleApplyRange = () => {
    if (!startDate || !endDate) {
      setRangeError('Select both start and end dates.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setRangeError('Invalid date range.');
      return;
    }
    if (start > end) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError('');
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleCurrentMonthRange = () => {
    const nowDate = new Date();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const startStr = monthStart.toISOString().split('T')[0];
    const endStr = nowDate.toISOString().split('T')[0];
    setRangeError('');
    setStartDate(startStr);
    setEndDate(endStr);
    setAppliedStartDate(startStr);
    setAppliedEndDate(endStr);
  };

  if (!salesData && !loading) {
    return (
      <div className="sales-report-page">
        <Sidebar />
        <div className="main-content">
          <div className="page-container">
            <div className="error-message">Failed to load sales report data.</div>
          </div>
        </div>
      </div>
    );
  }

  // Daily Sales Chart Options
  const dailySalesChartOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'bar',
      height: '100%'
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `₱${val.toLocaleString()}`,
      offsetY: -20,
      style: {
        fontSize: '11px',
        colors: [isDarkMode ? '#cbd5e1' : '#64748b']
      }
    },
    xaxis: {
      categories: rangeSales.byBranch.map(b => b.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => `₱${val.toLocaleString()}`,
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    colors: ['#10b981'],
    title: {
      text: 'By Branch',
      align: 'left',
      style: {
        color: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    }
  } : {};

  const dailySalesSeries = salesData ? [{
    name: 'Range Sales',
    data: rangeSales.byBranch.map(b => b.sales)
  }] : [];

  // First & Second Half Sales Comparison
  const halfSalesChartOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'bar',
      height: '100%'
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `₱${val.toLocaleString()}`,
      offsetY: -20,
      style: {
        fontSize: '11px',
        colors: [isDarkMode ? '#cbd5e1' : '#64748b']
      }
    },
    xaxis: {
      categories: rangeFirstHalfSales.byBranch.map(b => b.branch),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => `₱${val.toLocaleString()}`,
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    colors: ['#3b82f6', '#8b5cf6'],
    legend: {
      position: 'top'
    }
  } : {};

  const halfSalesSeries = salesData ? [
    {
      name: 'First Half',
      data: rangeFirstHalfSales.byBranch.map(b => b.sales)
    },
    {
      name: 'Second Half',
      data: rangeSecondHalfSales.byBranch.map(b => b.sales)
    }
  ] : [];

  // Current Month Sales by Branch (Pie Chart)
  const currentMonthPieOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'pie',
      height: '100%'
    },
    labels: rangeSales.byBranch.map(b => b.branch),
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    legend: {
      position: 'bottom',
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(1)}%`,
      style: {
        colors: ['#fff']
      }
    },
    tooltip: {
      y: {
        formatter: (val) => `₱${val.toLocaleString()}`
      }
    }
  } : {};

  const currentMonthPieSeries = salesData ? rangeSales.byBranch.map(b => b.sales) : [];

  // Last Month vs Current Month Comparison
  const monthComparisonOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'bar',
      height: '100%'
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `₱${val.toLocaleString()}`,
      style: {
        fontSize: '11px',
        colors: [isDarkMode ? '#cbd5e1' : '#64748b']
      }
    },
    xaxis: {
      labels: {
        formatter: (val) => `₱${val.toLocaleString()}`,
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
    colors: ['#f59e0b', '#10b981'],
    legend: {
      position: 'top'
    }
  } : {};

  // Merge branches from both months
  const allBranches = salesData ? new Set([
    ...previousRangeSales.byBranch.map(b => b.branch),
    ...rangeSales.byBranch.map(b => b.branch)
  ]) : new Set();

  const lastMonthData = [];
  const currentMonthData = [];

  if (salesData) {
    allBranches.forEach(branch => {
      const previousRange = previousRangeSales.byBranch.find(b => b.branch === branch);
      const currentRange = rangeSales.byBranch.find(b => b.branch === branch);
      lastMonthData.push(previousRange ? previousRange.sales : 0);
      currentMonthData.push(currentRange ? currentRange.sales : 0);
    });
  }

  const monthComparisonSeries = [
    {
      name: 'Last Month',
      data: lastMonthData
    },
    {
      name: 'Current Month',
      data: currentMonthData
    }
  ];

  const monthComparisonCategories = Array.from(allBranches);

  // Yearly Sales - Monthly Breakdown (Column Chart)
  const yearlyChartOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'bar',
      height: '100%'
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val > 0 ? `₱${(val / 1000).toFixed(0)}k` : '',
      offsetY: -20,
      style: {
        fontSize: '10px',
        colors: [isDarkMode ? '#cbd5e1' : '#64748b']
      }
    },
    xaxis: {
      categories: salesData.monthlySalesAndBookings.map(m => m.month),
      labels: {
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Sales (₱)',
          style: {
            color: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        },
        labels: {
          formatter: (val) => `₱${(val / 1000).toFixed(0)}k`,
          style: {
            colors: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'Bookings',
          style: {
            color: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        },
        labels: {
          style: {
            colors: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        }
      }
    ],
    colors: ['#10b981', '#3b82f6'],
    legend: {
      position: 'top'
    }
  } : {};

  const yearlySeries = salesData ? [
    {
      name: 'Sales',
      type: 'column',
      data: monthlyTrendData.map(m => m.sales)
    },
    {
      name: 'Bookings',
      type: 'line',
      data: monthlyTrendData.map(m => m.bookings)
    }
  ] : [];

  // Monthly Sales & Bookings (Last 12 Months) - Area Chart
  const monthlyTrendOptions = salesData ? {
    ...getChartTheme(),
    chart: {
      ...getChartTheme().chart,
      type: 'area',
      height: '100%'
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: trendCategories,
      labels: {
        rotate: useDailyTrend ? 0 : -45,
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Sales (₱)',
          style: {
            color: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        },
        labels: {
          formatter: (val) => `₱${(val / 1000).toFixed(0)}k`,
          style: {
            colors: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'Bookings',
          style: {
            color: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        },
        labels: {
          style: {
            colors: isDarkMode ? '#cbd5e1' : '#64748b'
          }
        }
      }
    ],
    colors: ['#10b981', '#3b82f6'],
    legend: {
      position: 'top'
    }
  } : {};

  const monthlyTrendSeries = salesData ? [
    {
      name: 'Sales',
      data: trendSales
    },
    {
      name: 'Bookings',
      data: trendBookings
    }
  ] : [];

  return (
    <div className="sales-report-page">
      <Sidebar />
      <div className="main-content">
        {loading && <Loader message="Loading sales report..." />}
        {!loading && (
        <div className="page-container">
          <div className="page-header">
            <div className="header-left">
              <h1>Sales Report</h1>
              <p className="page-subtitle">Comprehensive sales insights - Sales use "Arrived & bought" and "Comeback & bought". Arrival rate includes "Arrived not potential" | Range: {rangeDisplay}</p>
            </div>
            <div className="header-actions">
                <button className="current-month-btn" onClick={handleCurrentMonthRange}>
                  Current Month
                </button>
              <div className="filters-container">
                <div className="date-range-inputs">
                  <div className="date-field">
                    <label htmlFor="sales-start-date">Start</label>
                    <input
                      id="sales-start-date"
                      type="date"
                      className="date-input"
                      value={startDate}
                      max={todayStr}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>
                  <div className="date-field">
                    <label htmlFor="sales-end-date">End</label>
                    <input
                      id="sales-end-date"
                      type="date"
                      className="date-input"
                      value={endDate}
                      max={todayStr}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </div>
                <button className="apply-btn" onClick={handleApplyRange}>
                  Apply
                </button>
              </div>
            </div>
          </div>
          {rangeError && (
            <div className="range-error">{rangeError}</div>
          )}
       

          {salesData && (
          <>
          {/* Enhanced Summary Cards */}
          <div className="summary-cards">
            <div
              className="summary-card daily highlight"
            >
              <div className="card-header">
                <div className="card-icon">
                  <FiDollarSign />
                </div>
                <div className="card-header-meta">
                  <span className="card-badge">Range</span>
                  {renderInfoTooltip(
                    'range-sales',
                    `Range Sales = total sales from all branches within ${rangeDisplay}.`
                  )}
                </div>
              </div>
              <div className="card-content">
                <h3>Range Sales</h3>
                <p className="amount">₱{rangeSales.overall.toLocaleString()}</p>
                <div className="card-footer">
                  <span className="card-label">{rangeSales.byBranch.length} active branches</span>
                </div>
              </div>
            </div>

            <div
              className="summary-card current-month highlight"
            >
              <div className="card-header">
                <div className="card-icon">
                  <FiCalendar />
                </div>
                <div className="card-header-meta">
                  <span className="card-badge">Current</span>
                  {renderInfoTooltip(
                    'current-range',
                    `Current Range = total sales within ${rangeDisplay}. Growth compares against ${previousRangeDisplay}.`
                  )}
                </div>
              </div>
              <div className="card-content">
                <h3>Current Range</h3>
                <p className="amount">₱{rangeSales.overall.toLocaleString()}</p>
                <div className="card-footer">
                  <div className={`growth-indicator ${rangeSales.overall >= previousRangeSales.overall ? 'positive' : 'negative'}`}>
                    {rangeSales.overall >= previousRangeSales.overall ? <FiArrowUp /> : <FiArrowDown />}
                    <span>{Math.abs(calculateGrowth(rangeSales.overall, previousRangeSales.overall))}% vs previous range</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="summary-card last-month"
            >
              <div className="card-header">
                <div className="card-icon">
                  <FiBarChart2 />
                </div>
                <div className="card-header-meta">
                  <span className="card-badge">Previous</span>
                  {renderInfoTooltip(
                    'previous-range',
                    `Previous Range = total sales from ${previousRangeDisplay} (same number of days as ${rangeDisplay}).`
                  )}
                </div>
              </div>
              <div className="card-content">
                <h3>Previous Range</h3>
                <p className="amount">₱{previousRangeSales.overall.toLocaleString()}</p>
                <span className="card-label">Previous range total</span>
              </div>
            </div>

            <div
              className="summary-card yearly"
            >
              <div className="card-header">
                <div className="card-icon">
                  <FiTrendingUp />
                </div>
                <div className="card-header-meta">
                  <span className="card-badge">Average</span>
                  {renderInfoTooltip(
                    'avg-sale',
                    `Avg Sale Value = total range sales divided by total bookings in ${rangeDisplay}.`
                  )}
                </div>
              </div>
              <div className="card-content">
                <h3>Avg Sale Value</h3>
                <p className="amount">₱{getAverageSaleValue().toLocaleString()}</p>
                <span className="card-label">Range average per booking</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="key-metrics">
            <div
              className="metric-card"
            >
              <div className="metric-icon">
                <FiUsers />
              </div>
              <div className="metric-content">
                <span className="metric-label">Total Bookings</span>
                <p className="metric-value">{getTotalBookings().toLocaleString()}</p>
              </div>
              {renderInfoTooltip(
                'total-bookings',
                `Total Bookings = count of bookings (including cancelled) within ${rangeDisplay}.`
              )}
            </div>

            <div
              className="metric-card"
            >
              <div className="metric-icon">
                <FiBarChart2 />
              </div>
              <div className="metric-content">
                <span className="metric-label">Active Branches</span>
                <p className="metric-value">{getTopBranches().length}</p>
              </div>
              {renderInfoTooltip(
                'active-branches',
                `Active Branches = branches with at least one booking within ${rangeDisplay}.`
              )}
            </div>

            <div
              className="metric-card"
            >
              <div className="metric-icon">
                <FiTrendingUp />
              </div>
              <div className="metric-content">
                <span className="metric-label">Growth Rate</span>
                <p className="metric-value">{calculateGrowth(rangeSales.overall, previousRangeSales.overall)}%</p>
              </div>
              {renderInfoTooltip(
                'growth-rate',
                `Growth Rate = percentage change between ${rangeDisplay} and ${previousRangeDisplay}.`
              )}
            </div>
          </div>

          {/* Top Performing Branches */}
          <div className="insights-section">
            <div className="section-header">
              <h2>Top Performing Branches</h2>
              <span className="section-subtitle">Range: {rangeDisplay}</span>
            </div>
            {getTopBranches().length > 0 ? (
              <div className="branches-grid">
                {getTopBranches().map((branch, index) => (
                  <div key={branch.branch} className="branch-card">
                    <div className="branch-rank">#{index + 1}</div>
                    <div className="branch-info">
                      <h4>{branch.branch}</h4>
                      <p className="branch-sales">₱{branch.sales.toLocaleString()}</p>
                      <p className="branch-arrival-rate">
                        Arrival rate: {(arrivalRateMap[branch.branch]?.arrivalRate || 0).toFixed(2)}%
                      </p>
                      <p className="branch-arrival-count">
                        Arrivals: {arrivalRateMap[branch.branch]?.arrivals || 0} / {arrivalRateMap[branch.branch]?.bookings || 0}
                      </p>
                      <div className="branch-percentage">
                        {((branch.sales / rangeSales.overall) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">No branch data available</div>
            )}
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Daily Sales */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Range Sales Overview</h3>
                <span className="chart-subtitle">Range: {rangeDisplay}</span>
              </div>
              <div className="chart-content">
                {rangeSales.byBranch.length > 0 ? (
                  <ReactApexChart
                    options={dailySalesChartOptions}
                    series={dailySalesSeries}
                    type="bar"
                    height="100%"
                  />
                ) : (
                  <div className="no-data">No sales data for selected range</div>
                )}
              </div>
            </div>

            {/* First & Second Half Comparison */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Range Split Analysis</h3>
                <span className="chart-subtitle">Range halves: {rangeDisplay}</span>
              </div>
              <div className="chart-content">
                <div className="half-summary">
                  <div className="half-item first">
                    <span className="label">First Half Total:</span>
                    <span className="value">₱{rangeFirstHalfSales.overall.toLocaleString()}</span>
                  </div>
                  <div className="half-item second">
                    <span className="label">Second Half Total:</span>
                    <span className="value">₱{rangeSecondHalfSales.overall.toLocaleString()}</span>
                  </div>
                </div>
                <ReactApexChart
                  options={halfSalesChartOptions}
                  series={halfSalesSeries}
                  type="bar"
                  height="100%"
                />
              </div>
            </div>

            {/* Current Month Distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Range Sales Distribution</h3>
                <span className="chart-subtitle">Range: {rangeDisplay}</span>
              </div>
              <div className="chart-content">
                {rangeSales.byBranch.length > 0 ? (
                  <ReactApexChart
                    options={currentMonthPieOptions}
                    series={currentMonthPieSeries}
                    type="pie"
                    height="100%"
                  />
                ) : (
                  <div className="no-data">No sales data for selected range</div>
                )}
              </div>
            </div>

            {/* Month Comparison */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Range Comparison</h3>
                <span className="chart-subtitle">Previous range vs Current range</span>
              </div>
              <div className="chart-content">
                <ReactApexChart
                  options={{...monthComparisonOptions, xaxis: { ...monthComparisonOptions.xaxis, categories: monthComparisonCategories }}}
                  series={monthComparisonSeries}
                  type="bar"
                  height="100%"
                />
              </div>
            </div>

            {/* Yearly Sales - Full Width */}
            <div className="chart-card full-width">
              <div className="chart-header">
                <h3>Monthly Sales Report</h3>
                <span className="chart-subtitle">Range: {rangeDisplay}</span>
              </div>
              <div className="chart-content">
                <ReactApexChart
                  options={yearlyChartOptions}
                  series={yearlySeries}
                  type="bar"
                  height="100%"
                />
              </div>
            </div>

            {/* Monthly Trend - Full Width */}
            <div className="chart-card full-width">
              <div className="chart-header">
                <h3>Sales & Bookings Trend</h3>
                <span className="chart-subtitle">Range: {rangeDisplay}</span>
              </div>
              <div className="chart-content">
                <ReactApexChart
                  options={monthlyTrendOptions}
                  series={monthlyTrendSeries}
                  type="area"
                  height="100%"
                />
              </div>
            </div>
          </div>
          </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;
