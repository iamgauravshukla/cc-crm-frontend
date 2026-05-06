import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '../context/ThemeContext';
import { getAdPerformance } from '../services/api';
import { FiSearch, FiTrendingUp, FiDollarSign, FiMapPin, FiTag } from 'react-icons/fi';
import QuickFilterBar from '../components/QuickFilterBar';

function AdPerformance() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [sortBy, setSortBy] = useState('bookings');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([
    { id: 'qf-date-default', field: 'dateRange', fieldLabel: 'Date Range', operator: 'is', value: '30', dateFrom: '', dateTo: '', displayValue: 'Last 30 Days' },
  ]);
  const [adIdSearch, setAdIdSearch] = useState('');
  const itemsPerPage = 12;

  const AD_FILTER_FIELDS = [
    {
      key: 'branch',
      fieldLabel: 'Wellness Center',
      type: 'select',
      options: [
        'AI SKIN', 'CENTRIS', 'DNA MANILA', 'GENEVA', 'GLORIETTA',
        'HERA', 'LIONESSE', 'LUMIA', 'PARIS', 'SM NORTH',
        'VENICE', 'STA LUCIA', 'FELIZ', 'ESTANCIA',
      ],
    },
    {
      key: 'dateRange',
      fieldLabel: 'Date Range',
      type: 'datepreset',
      options: [
        { value: '7',      label: 'Last 7 Days' },
        { value: '30',     label: 'Last 30 Days' },
        { value: '60',     label: 'Last 60 Days' },
        { value: '90',     label: 'Last 90 Days' },
        { value: 'custom', label: 'Custom Range' },
      ],
    },
  ];
  
  // Use theme context for reactive theme detection
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchAdPerformance = useCallback(async () => {
    const dateFilter  = activeFilters.find(f => f.field === 'dateRange');
    const branchFilter = activeFilters.find(f => f.field === 'branch');
    const dateValue   = dateFilter?.value || '30';
    const customStart = dateFilter?.dateFrom || '';
    const customEnd   = dateFilter?.dateTo   || '';
    const branch      = branchFilter?.value  || 'All';

    if (dateValue === 'custom' && (!customStart || !customEnd)) return;

    setLoading(true);
    setError('');
    try {
      const params = {};
      if (dateValue === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate   = customEnd;
      } else {
        params.days = dateValue;
      }
      if (branch !== 'All') params.branch = branch;
      const response = await getAdPerformance(params);
      setPerformanceData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ad performance data');
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    if (user) {
      fetchAdPerformance();
    }
  }, [user, fetchAdPerformance]);

  const sortAds = (ads) => {
    if (!ads) return [];
    let filtered = ads;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(ad => ad.adName?.toLowerCase().includes(t));
    }
    if (adIdSearch) {
      const t = adIdSearch.toLowerCase();
      filtered = filtered.filter(ad => ad.adName?.toLowerCase().includes(t));
    }
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'bookings':  aValue = a.totalBookings;  bValue = b.totalBookings;  break;
        case 'revenue':   aValue = a.totalRevenue;   bValue = b.totalRevenue;   break;
        case 'conversion': aValue = a.conversionRate; bValue = b.conversionRate; break;
        default: aValue = a.totalBookings; bValue = b.totalBookings;
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

  const fmtStatus = (s) =>
    (s || 'Unknown').replace(/\b\w/g, c => c.toUpperCase());

  const STATUS_ORDER = [
    'arrived & bought', 'arrived not potential', 'comeback & bought',
    'cancelled', 'promo hunter', 'scheduled',
  ];

  const sortedBreakdown = (breakdown = []) => {
    const ordered = STATUS_ORDER
      .map(key => breakdown.find(b => b.status === key))
      .filter(Boolean);
    const rest = breakdown.filter(b => !STATUS_ORDER.includes(b.status));
    return [...ordered, ...rest];
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
    colors: ['#1e40af', '#10b981'],
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

          {/* Page header */}
          <div className="adc-page-header">
            <h2 className="page-title" style={{ margin: 0 }}>Ad Performance Report</h2>
          </div>

          {/* Quick Filters */}
          <QuickFilterBar
            fields={AD_FILTER_FIELDS}
            activeFilters={activeFilters}
            onChange={(f) => { setActiveFilters(f); setCurrentPage(1); }}
            resultCount={sortedAds.length}
            resultLabel="ads"
          />

          {error && <div className="modern-error-message">{error}</div>}

          {loading ? (
            <Loader message="Loading ad performance data..." />
          ) : !performanceData || !summary || !ads ? (
            <p>No ad performance data available.</p>
          ) : (
            <>
              {/* Overview stat cards */}
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

              {/* Chart */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <h3>Top 10 Ads — Bookings &amp; Conversion</h3>
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

              {/* Ad Detail Cards */}
              <div className="analytics-card">
                {/* Section header with inline search + sort */}
                <div className="adc-section-header">
                  <div className="adc-section-title-row">
                    <div>
                      <h3 style={{ margin: 0 }}>Ad Performance Details</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sortedAds.length} ads · Sort by:&nbsp;
                        {['bookings','revenue','conversion'].map(s => (
                          <button
                            key={s}
                            className={`adc-sort-btn${sortBy === s ? ' active' : ''}`}
                            onClick={() => handleSort(s)}
                          >
                            {s === 'bookings' ? 'Bookings' : s === 'revenue' ? 'Revenue' : 'Conv. Rate'}
                            {sortBy === s && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                          </button>
                        ))}
                      </p>
                    </div>
                  </div>
                  <div className="adc-search-row">
                    <div className="adc-search-box">
                      <FiSearch className="adc-search-icon" />
                      <input
                        type="text"
                        placeholder="Search ad name..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="adc-search-box">
                      <FiTag className="adc-search-icon" />
                      <input
                        type="text"
                        placeholder="Search Ad ID..."
                        value={adIdSearch}
                        onChange={(e) => { setAdIdSearch(e.target.value); setCurrentPage(1); }}
                      />
                    </div>
                  </div>
                </div>
                <div className="analytics-card-body">
              {paginatedAds.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No ads match your search.</p>
              ) : (
                <div className="adc-grid">
                  {paginatedAds.map((ad) => {
                    const breakdown  = sortedBreakdown(ad.statusBreakdown || []);
                    const totalSales = breakdown.reduce((s, b) => s + (b.revenue || 0), 0);
                    const convClass  = ad.conversionRate >= 30 ? 'high' : ad.conversionRate >= 15 ? 'medium' : 'low';
                    return (
                      <div key={ad.adName} className="adc-card">
                        {/* Card Header */}
                        <div className="adc-card-header">
                          <div className="adc-card-name">{ad.adName || 'Unknown'}</div>
                          <span className={`conversion-badge ${convClass}`}>{ad.conversionRate.toFixed(1)}% conv.</span>
                        </div>

                        {/* Key metrics strip */}
                        <div className="adc-metrics">
                          <div className="adc-metric">
                            <FiTrendingUp size={13} />
                            <span className="adc-metric-val">{ad.totalBookings}</span>
                            <span className="adc-metric-lbl">Bookings</span>
                          </div>
                          <div className="adc-metric">
                            <FiTrendingUp size={13} style={{ color: '#10b981' }} />
                            <span className="adc-metric-val">{ad.convertedBookings}</span>
                            <span className="adc-metric-lbl">Converted</span>
                          </div>
                          <div className="adc-metric">
                            <FiDollarSign size={13} />
                            <span className="adc-metric-val">₱{ad.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            <span className="adc-metric-lbl">Revenue</span>
                          </div>
                          <div className="adc-metric">
                            <FiDollarSign size={13} style={{ color: '#8b5cf6' }} />
                            <span className="adc-metric-val">₱{ad.avgRevenuePerBooking.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            <span className="adc-metric-lbl">Avg / Booking</span>
                          </div>
                        </div>

                        {/* Top branch / treatment */}
                        <div className="adc-tags">
                          {ad.topBranch && (
                            <span className="adc-tag"><FiMapPin size={11} /> {ad.topBranch}</span>
                          )}
                          {ad.topTreatment && (
                            <span className="adc-tag adc-tag-purple"><FiTag size={11} /> {ad.topTreatment}</span>
                          )}
                        </div>

                        {/* Status breakdown table */}
                        {breakdown.length > 0 && (
                          <div className="adc-breakdown">
                            <table className="adc-breakdown-table">
                              <thead>
                                <tr>
                                  <th>Status</th>
                                  <th>Count</th>
                                  <th>Total Sales</th>
                                  <th>% Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {breakdown.map(b => (
                                  <tr key={b.status}>
                                    <td>{fmtStatus(b.status)}</td>
                                    <td>{b.count}</td>
                                    <td>{b.revenue > 0 ? `₱${b.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '–'}</td>
                                    <td>
                                      <div className="ad-bd-pct-row">
                                        <div className="ad-bd-pct-bar" style={{ width: `${b.pct}%` }} />
                                        <span>{b.pct}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="adc-breakdown-total">
                                  <td><strong>TOTAL</strong></td>
                                  <td><strong>{ad.totalBookings}</strong></td>
                                  <td><strong>{totalSales > 0 ? `₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '–'}</strong></td>
                                  <td><strong>100%</strong></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
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
                    Page {currentPage} of {totalPages} ({sortedAds.length} ads)
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
