import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowDown, FiArrowUp, FiGrid, FiList, FiEdit2, FiX, FiSave, FiCalendar } from 'react-icons/fi';
import { getOldBookings } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';

// Custom hook for debouncing
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function OldBookings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest first) or 'asc' (oldest first)
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const limit = 50;

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

  const bookingStatuses = [
    'All',
    'Arrived & bought',
    'Arrived not potential',
    'Cancelled',
    'Promo hunter',
    'Scheduled',
    'Refund',
    'Comeback',
    'Comeback & bought',
    'No Data',
    'Arrived on treatment',
    'Old client',
    'On the way'
  ];

  const fetchBookings = async () => {
    // Don't fetch if custom date range is selected but dates aren't both filled
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = { 
        page, 
        limit, 
        search: debouncedSearchTerm,
        branch: selectedBranch,
        status: selectedStatus,
        sortOrder: sortOrder === 'desc' ? 'newest' : 'oldest'
      };
      
      // Add date range filters
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else if (dateRange !== 'all') {
        params.dateRange = dateRange;
      }
      
      const response = await getOldBookings(params);
      
      // Backend handles sorting, so just use the data as-is
      const bookingsData = response.data.bookings || response.data.data || [];
      
      setBookings(bookingsData);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearchTerm, selectedBranch, selectedStatus, sortOrder, dateRange, customStartDate, customEndDate]);

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setPage(1); // Reset to first page on filter change
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    setPage(1); // Reset to first page on filter change
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

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

  const treatments = [
    'HAIR RENEWAL', 'HAIR REGROWTH', 'HAIR REMOVAL', 'SCALP DANDRUFF',
    'SCALP PSORIASIS', 'EXOSOMES', 'ADVANCED HAIRLOSS SOLUTION', 'EXCIMER RX LASER',
    'EYEBAG', '7D HIFU', '12D HIFU', 'HYDRA', 'CRYO', 'CO2', 'CARBON', 'PICO',
    'ANTI MELASMA', 'ACNE CLEANSE', 'ACNE BRIGHTENING', 'ORGANIC BOTOX',
    'COLLAGEN FACIAL', 'THERMAGE', 'EMS', '10D LASER', 'SKIN LIGHTENING',
    'EXILIS', 'SAUNAPOD', 'SOFWAVE', 'RF', 'WARTS REMOVAL'
  ];

  const agents = [
    'NICOLE', 'SYRA', 'DHEZA', 'GERALDINE', 'ANJELA', 'RAIZA', 'NALYN',
    'DONA', 'TRISHA', 'IRIS', 'JOY', 'MAE', 'JULS', 'YAN', 'SUTRA'
  ];

  const handleEditClick = (booking) => {
    setEditingBooking(booking);
    setEditFormData({
      rowNumber: booking.rowNumber,
      dateTime: booking.date || '', // Combined date and time
      branch: booking.branch || '',
      status: booking.status || '',
      firstName: booking.firstName || '',
      lastName: booking.lastName || '',
      age: booking.age || '',
      gender: booking.gender || '',
      phone: booking.phone || '',
      socialMedia: booking.socialMedia || '',
      email: booking.email || '',
      treatment: booking.treatment || '',
      area: booking.area || '',
      freebie: booking.freebie || '',
      totalPrice: booking.totalPrice || '',
      paymentMode: booking.paymentMode || '',
      agent: booking.agent || '',
      bookingDetails: booking.bookingDetails || '',
      adInteracted: booking.adInteracted || '',
      companionFirstName: booking.companionFirstName || '',
      companionLastName: booking.companionLastName || '',
      companionAge: booking.companionAge || '',
      companionGender: booking.companionGender || '',
      companionTreatment: booking.companionTreatment || '',
      companionFreebie: booking.companionFreebie || ''
    });
    setUpdateError('');
    setUpdateSuccess('');
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://cc-crm-backend-production.up.railway.app/api'}/bookings/${editFormData.rowNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking');
      }

      setUpdateSuccess('Booking updated successfully!');
      
      // Refresh bookings list
      setTimeout(() => {
        fetchBookings();
        setIsEditModalOpen(false);
        setEditingBooking(null);
      }, 1500);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update booking');
    } finally {
      setUpdateLoading(false);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingBooking(null);
    setUpdateError('');
    setUpdateSuccess('');
  };

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">

        <div className="filters-section">
          <div className="filter-group">
            <label>Wellness Center:</label>
            <select 
              value={selectedBranch} 
              onChange={handleBranchChange}
              className="filter-select"
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Booking Status:</label>
            <select 
              value={selectedStatus} 
              onChange={handleStatusChange}
              className="filter-select"
            >
              {bookingStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by name, email, phone, Instagram, agent, treatment..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="filter-group">
            <label>Sort by Date:</label>
            <button 
              className="sort-btn"
              onClick={toggleSort}
              title="Sort by Date"
            >
              {sortOrder === 'desc' ? (
                <>
                  <FiArrowDown size={16} />
                  <span>Newest First</span>
                </>
              ) : (
                <>
                  <FiArrowUp size={16} />
                  <span>Oldest First</span>
                </>
              )}
            </button>
          </div>

          <div className="filter-group">
            <label><FiCalendar /> Date Range:</label>
            <select 
              value={dateRange} 
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="filter-group custom-date-range">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPage(1);
                }}
                max={customEndDate || new Date().toISOString().split('T')[0]}
                className="date-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPage(1);
                }}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
                className="date-input"
              />
            </div>
          )}

          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <FiList size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Card View"
            >
              <FiGrid size={18} />
            </button>
          </div>
        </div>

        {error && <div className="modern-error-message">{error}</div>}

        {loading ? (
          <Loader message="Loading bookings..." />
        ) : bookings.length === 0 ? (
          <div className="loading-section">
            <p>No bookings found.</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <div className="table-container">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Actions</th>
                      <th>Date & Time</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Treatment</th>
                      <th>Treatment Area</th>
                      <th>Freebie</th>
                      <th>Companion Treatment</th>
                      <th>Price</th>
                      <th>Payment Mode</th>
                      <th>Phone</th>
                      <th>Instagram</th>
                      <th>Email</th>
                      <th>Agent</th>
                      <th>Booking Details</th>
                      <th>Ad Interacted</th>
                      <th>Companion First Name</th>
                      <th>Companion Last Name</th>
                      <th>Companion Age</th>
                      <th>Companion Gender</th>
                      <th>Companion Freebie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr key={index}>
                        <td>
                          <button 
                            className="edit-btn-icon"
                            onClick={() => handleEditClick(booking)}
                            title="Edit booking"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        </td>
                        <td>{booking.date || '-'}</td>
                        <td>{booking.branch || '-'}</td>
                        <td>
                          <span className={getStatusClass(booking.status)}>
                            {booking.status || 'N/A'}
                          </span>
                        </td>
                        <td>{booking.firstName || '-'}</td>
                        <td>{booking.lastName || '-'}</td>
                        <td>{booking.age || '-'}</td>
                        <td>{booking.gender || '-'}</td>
                        <td>{booking.treatment || '-'}</td>
                        <td>{booking.area || '-'}</td>
                        <td>{booking.freebie || '-'}</td>
                        <td>{booking.companionTreatment || '-'}</td>
                        <td><strong>₱{typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : (parseFloat(booking.totalPrice) || 0).toFixed(2)}</strong></td>
                        <td>{booking.paymentMode || '-'}</td>
                        <td>{booking.phone || '-'}</td>
                        <td>{booking.socialMedia || '-'}</td>
                        <td>{booking.email || '-'}</td>
                        <td>{booking.agent || '-'}</td>
                        <td><span className="booking-details-cell" title={booking.bookingDetails || ''}>{booking.bookingDetails ? (booking.bookingDetails.length > 30 ? booking.bookingDetails.substring(0, 30) + '...' : booking.bookingDetails) : '-'}</span></td>
                        <td>{booking.adInteracted || '-'}</td>
                        <td>{booking.companionFirstName || '-'}</td>
                        <td>{booking.companionLastName || '-'}</td>
                        <td>{booking.companionAge || '-'}</td>
                        <td>{booking.companionGender || '-'}</td>
                        <td>{booking.companionFreebie || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bookings-cards-grid">
                {bookings.map((booking, index) => (
                  <div key={index} className="booking-card">
                    <div className="booking-card-header">
                      <div className="card-header-left">
                        <h3>{booking.firstName} {booking.lastName}</h3>
                        <span className="card-date">{booking.date || '-'} • {booking.timestamp ? new Date(booking.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                      <span className={getStatusClass(booking.status)}>
                        {booking.status || 'N/A'}
                      </span>
                    </div>

                    <div className="booking-card-body">
                      <div className="card-section">
                        <h4>Contact Information</h4>
                        <div className="card-info-grid">
                          <div className="card-info-item">
                            <span className="label">Phone:</span>
                            <span className="value">{booking.phone || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Email:</span>
                            <span className="value">{booking.email || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Instagram:</span>
                            <span className="value">{booking.socialMedia || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Age:</span>
                            <span className="value">{booking.age || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Gender:</span>
                            <span className="value">{booking.gender || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-section">
                        <h4>Treatment Details</h4>
                        <div className="card-info-grid">
                          <div className="card-info-item">
                            <span className="label">Branch:</span>
                            <span className="value">{booking.branch || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Treatment:</span>
                            <span className="value">{booking.treatment || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Treatment Area:</span>
                            <span className="value">{booking.area || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Freebie:</span>
                            <span className="value">{booking.freebie || '-'}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Agent:</span>
                            <span className="value">{booking.agent || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-section">
                        <h4>Payment</h4>
                        <div className="card-info-grid">
                          <div className="card-info-item">
                            <span className="label">Total Price:</span>
                            <span className="value price">₱{typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : (parseFloat(booking.totalPrice) || 0).toFixed(2)}</span>
                          </div>
                          <div className="card-info-item">
                            <span className="label">Payment Mode:</span>
                            <span className="value">{booking.paymentMode || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {(booking.companionFirstName || booking.companionLastName) && (
                        <div className="card-section">
                          <h4>Companion Details</h4>
                          <div className="card-info-grid">
                            <div className="card-info-item">
                              <span className="label">Name:</span>
                              <span className="value">{booking.companionFirstName} {booking.companionLastName}</span>
                            </div>
                            <div className="card-info-item">
                              <span className="label">Age:</span>
                              <span className="value">{booking.companionAge || '-'}</span>
                            </div>
                            <div className="card-info-item">
                              <span className="label">Gender:</span>
                              <span className="value">{booking.companionGender || '-'}</span>
                            </div>
                            <div className="card-info-item">
                              <span className="label">Treatment:</span>
                              <span className="value">{booking.companionTreatment || '-'}</span>
                            </div>
                            <div className="card-info-item">
                              <span className="label">Freebie:</span>
                              <span className="value">{booking.companionFreebie || '-'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {booking.bookingDetails && (
                        <div className="card-section">
                          <h4>Booking Details</h4>
                          <p className="booking-details-text">{booking.bookingDetails}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev}
              >
                ← Previous
              </button>
              
              <span className="pagination-info">
                Page {page} of {pagination.totalPages} • {pagination.total} total bookings
              </span>
              
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
              >
                Next →
              </button>
            </div>
          </>
        )}
          </div>
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content edit-booking-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Booking</h2>
                <button className="modal-close-btn" onClick={closeEditModal}>
                  <FiX size={24} />
                </button>
              </div>

              {updateError && <div className="alert alert-error">{updateError}</div>}
              {updateSuccess && <div className="alert alert-success">{updateSuccess}</div>}

              <form onSubmit={handleUpdateBooking} className="edit-booking-form">
                <div className="modal-form-grid">
                  <div className="form-group full-width">
                    <label>Date & Time *</label>
                    <input
                      type="text"
                      name="dateTime"
                      value={editFormData.dateTime}
                      onChange={handleEditFormChange}
                      required
                      placeholder="Jan 27 2026 5:35 PM"
                    />
                    <small className="form-hint">Format: MMM DD YYYY H:MM AM/PM (e.g., Jan 27 2026 5:35 PM)</small>
                  </div>

                  <div className="form-group">
                    <label>Branch *</label>
                    <select name="branch" value={editFormData.branch} onChange={handleEditFormChange} required>
                      <option value="">Select Branch</option>
                      {branches.filter(b => b !== 'All').map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status *</label>
                    <select name="status" value={editFormData.status} onChange={handleEditFormChange} required>
                      <option value="">Select Status</option>
                      {bookingStatuses.filter(s => s !== 'All').map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editFormData.firstName}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editFormData.lastName}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Age *</label>
                    <input
                      type="number"
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditFormChange}
                      required
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={editFormData.gender} onChange={handleEditFormChange} required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Instagram / Facebook</label>
                    <input
                      type="text"
                      name="socialMedia"
                      value={editFormData.socialMedia}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Treatment *</label>
                    <select name="treatment" value={editFormData.treatment} onChange={handleEditFormChange} required>
                      <option value="">Select Treatment</option>
                      {treatments.map(treatment => (
                        <option key={treatment} value={treatment}>{treatment}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Treatment Area</label>
                    <input
                      type="text"
                      name="area"
                      value={editFormData.area}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Freebie</label>
                    <input
                      type="text"
                      name="freebie"
                      value={editFormData.freebie}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Price *</label>
                    <input
                      type="number"
                      name="totalPrice"
                      value={editFormData.totalPrice}
                      onChange={handleEditFormChange}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Mode *</label>
                    <select name="paymentMode" value={editFormData.paymentMode} onChange={handleEditFormChange} required>
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">Cash</option>
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Agent *</label>
                    <select name="agent" value={editFormData.agent} onChange={handleEditFormChange} required>
                      <option value="">Select Agent</option>
                      {agents.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ad Interacted</label>
                    <input
                      type="text"
                      name="adInteracted"
                      value={editFormData.adInteracted}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Booking Details</label>
                    <textarea
                      name="bookingDetails"
                      value={editFormData.bookingDetails}
                      onChange={handleEditFormChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion First Name</label>
                    <input
                      type="text"
                      name="companionFirstName"
                      value={editFormData.companionFirstName}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Last Name</label>
                    <input
                      type="text"
                      name="companionLastName"
                      value={editFormData.companionLastName}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Age</label>
                    <input
                      type="number"
                      name="companionAge"
                      value={editFormData.companionAge}
                      onChange={handleEditFormChange}
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Gender</label>
                    <select name="companionGender" value={editFormData.companionGender} onChange={handleEditFormChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Companion Treatment</label>
                    <select name="companionTreatment" value={editFormData.companionTreatment} onChange={handleEditFormChange}>
                      <option value="">Select Treatment</option>
                      {treatments.map(treatment => (
                        <option key={treatment} value={treatment}>{treatment}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Companion Freebie</label>
                    <input
                      type="text"
                      name="companionFreebie"
                      value={editFormData.companionFreebie}
                      onChange={handleEditFormChange}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updateLoading}>
                    <FiSave size={16} />
                    {updateLoading ? 'Updating...' : 'Update Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
  );
}

export default OldBookings;
