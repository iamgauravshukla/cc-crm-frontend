import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '../context/ThemeContext';
import { getAdPerformance } from '../services/api';
import { FiCalendar, FiFilter } from 'react-icons/fi';

function AdPerformance() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [sortBy, setSortBy] = useState('bookings'); // 'bookings', 'revenue', 'conversion'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 50;
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const branches = [
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchAdPerformance = useCallback(async () => {
    // Don't fetch if custom date range is selected but dates aren't both filled
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = {};
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        params.days = dateRange;
      }
      
      if (selectedBranch !== 'All') {
        params.branch = selectedBranch;
      }
      
      const response = await getAdPerformance(params);
      console.log('Ad performance data:', response.data);
      setPerformanceData(response.data.data);
    } catch (err) {
      console.error('Error fetching ad performance:', err);
      setError(err.response?.data?.error || 'Failed to fetch ad performance data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate, selectedBranch]);

  useEffect(() => {
    if (user) {
      fetchAdPerformance();
    }
  }, [user, fetchAdPerformance]);

  const sortAds = (ads) => {
    if (!ads) return [];
    
    let filtered = ads;
    
    // Apply search filter
    if (searchTerm) {
      filtered = ads.filter(ad => 
        ad.adName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'bookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        case 'revenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'conversion':
          aValue = a.conversionRate;
          bValue = b.conversionRate;
          break;
        default:
          aValue = a.totalBookings;
          bValue = b.totalBookings;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    
    return sorted;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const { summary, ads } = performanceData || {};
  const sortedAds = performanceData ? sortAds(ads) : [];
  
  // Pagination calculation
  const totalPages = Math.ceil(sortedAds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAds = sortedAds.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Chart configurations
  const bookingsChartOptions = {
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
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 8
      }
    },
    dataLabels: { 
      enabled: false,
      style: {
        colors: [isDarkMode ? '#f1f5f9' : '#1f2937']
      }
    },
    stroke: { show: false },
    xaxis: {
      categories: sortedAds.slice(0, 10).map(ad => ad.adName),
      labels: {
        rotate: -45,
        trim: true,
        maxHeight: 100,
        style: {
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
        style: {
          colors: isDarkMode ? '#cbd5e1' : '#64748b'
        }
      }
    },
    fill: { opacity: 1 },
    colors: ['#2563EB', '#10b981'],
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: isDarkMode ? '#cbd5e1' : '#64748b'
      }
    },
    grid: {
      borderColor: isDarkMode ? '#334155' : '#e5e7eb'
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: {
        formatter: (val) => val.toFixed(0)
      }
    }
  };

  const bookingsChartSeries = [
    {
      name: 'Total Bookings',
      data: sortedAds.slice(0, 10).map(ad => ad.totalBookings)
    },
    {
      name: 'Converted',
      data: sortedAds.slice(0, 10).map(ad => ad.convertedBookings)
    }
  ];

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <h2 className="page-title">Ad Performance Report</h2>

          {/* Filters Section */}
          <div className="filters-section">
            <div className="filter-group">
              <label><FiCalendar /> Date Range:</label>
              <select 
                value={dateRange} 
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
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

            <div className="filter-group">
              <label><FiFilter /> Wellness Center:</label>
              <select 
                value={selectedBranch} 
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by ad name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {error && <div className="modern-error-message">{error}</div>}

          {loading ? (
            <Loader message="Loading ad performance data..." />
          ) : !performanceData || !summary || !ads ? (
            <p>No ad performance data available.</p>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>Total Ads</h3>
                <p>Active advertising campaigns</p>
              </div>
              <div className="analytics-card-body">
                <div className="stat-large">{summary.totalAds}</div>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>Total Bookings</h3>
                <p>From all ad campaigns</p>
              </div>
              <div className="analytics-card-body">
                <div className="stat-large">{summary.totalBookings.toLocaleString()}</div>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>Total Revenue</h3>
                <p>Generated from ads</p>
              </div>
              <div className="analytics-card-body">
                <div className="stat-large">₱{summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>Avg Conversion Rate</h3>
                <p>Across all campaigns</p>
              </div>
              <div className="analytics-card-body">
                <div className="stat-large">{summary.avgConversionRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Top 10 Ads - Bookings & Conversion</h3>
              <p>Total bookings vs converted bookings</p>
            </div>
            <div className="analytics-card-body">
              <ReactApexChart
                options={bookingsChartOptions}
                series={bookingsChartSeries}
                type="bar"
                height={350}
              />
            </div>
          </div>

          {/* Detailed Table */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Ad Performance Details</h3>
              <p>Click column headers to sort</p>
            </div>
            <div className="analytics-card-body">
              <div className="table-container">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                        Ad Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th onClick={() => handleSort('bookings')} style={{ cursor: 'pointer' }}>
                        Total Bookings {sortBy === 'bookings' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th onClick={() => handleSort('conversion')} style={{ cursor: 'pointer' }}>
                        Converted {sortBy === 'conversion' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th onClick={() => handleSort('conversion')} style={{ cursor: 'pointer' }}>
                        Conversion Rate {sortBy === 'conversion' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer' }}>
                        Total Revenue {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </th>
                      <th>Avg Revenue per Booking</th>
                      <th>Most Popular Branch</th>
                      <th>Most Popular Treatment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAds.map((ad, index) => (
                      <tr key={index}>
                        <td><strong>{ad.adName || 'Unknown'}</strong></td>
                        <td>{ad.totalBookings}</td>
                        <td>{ad.convertedBookings}</td>
                        <td>
                          <span className={`conversion-badge ${
                            ad.conversionRate >= 30 ? 'high' : 
                            ad.conversionRate >= 15 ? 'medium' : 'low'
                          }`}>
                            {ad.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td><strong>₱{ad.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        <td>₱{ad.avgRevenuePerBooking.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{ad.topBranch || '-'}</td>
                        <td>{ad.topTreatment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    className="pagination-btn" 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages} ({sortedAds.length} total ads)
                  </div>
                  
                  <button 
                    className="pagination-btn" 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default AdPerformance;
