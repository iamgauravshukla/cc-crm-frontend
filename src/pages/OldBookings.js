import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiArrowDown, FiArrowUp, FiGrid, FiList, FiEdit2, FiX, FiSave, FiFilter, FiSearch, FiCamera } from 'react-icons/fi';
import html2canvas from 'html2canvas';
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
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table');
  const cardRefs = useRef({});
  const [page, setPage] = useState(1);

  // Quick filter state (Monday.com style)
  // Default: show today's scheduled appointments
  const [activeFilters, setActiveFilters] = useState([{
    id: 'default-apt-today',
    field: 'appointmentDate',
    fieldLabel: 'Appointment Date',
    operator: 'is',
    value: 'today',
    dateFrom: '',
    dateTo: '',
    displayValue: 'Today',
  }]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderField, setBuilderField] = useState('');
  const [builderOperator, setBuilderOperator] = useState('is');
  const [builderValue, setBuilderValue] = useState('');
  const [builderValues, setBuilderValues] = useState([]); // multi-select
  const [builderDateFrom, setBuilderDateFrom] = useState('');
  const [builderDateTo, setBuilderDateTo] = useState('');
  const [editingFilterId, setEditingFilterId] = useState(null);
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null); // eslint-disable-line no-unused-vars
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  // Track which rows have in-flight validation updates
  const [validationUpdating, setValidationUpdating] = useState({});

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
    // Don't fetch if a custom date filter is active but dates aren't fully filled
    const hasIncompleteCustomDate = activeFilters.some(
      f => (f.field === 'createdDate' || f.field === 'appointmentDate') &&
           f.value === 'custom' && (!f.dateFrom || !f.dateTo)
    );
    if (hasIncompleteCustomDate) return;

    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit,
        search: debouncedSearchTerm,
        sortOrder: sortOrder === 'desc' ? 'newest' : 'oldest',
        ...deriveApiParams(activeFilters)
      };
      
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
  }, [page, debouncedSearchTerm, activeFilters, sortOrder]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setPage(1);
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

  // ── Quick filter system ────────────────────────────────────────────────────
  const FILTER_FIELDS = [
    { key: 'branch',          fieldLabel: 'Branch',           type: 'select',     multiSelect: true,  options: branches.filter(b => b !== 'All') },
    { key: 'status',          fieldLabel: 'Status',           type: 'select',     multiSelect: true,  options: bookingStatuses.filter(s => s !== 'All') },
    { key: 'agent',           fieldLabel: 'Agent',            type: 'select',     multiSelect: true,  options: agents },
    { key: 'gender',          fieldLabel: 'Gender',           type: 'select',     multiSelect: false, options: ['Male', 'Female'] },
    {
      key: 'createdDate', fieldLabel: 'Booking Created', type: 'datepreset',
      options: [
        { value: 'today',  label: 'Today' },
        { value: 'last7',  label: 'Last 7 Days' },
        { value: 'last30', label: 'Last 30 Days' },
        { value: 'last90', label: 'Last 90 Days' },
        { value: 'custom', label: 'Custom Range' },
      ]
    },
    {
      key: 'appointmentDate', fieldLabel: 'Appointment Date', type: 'datepreset',
      options: [
        { value: 'today',    label: 'Today' },
        { value: 'tomorrow', label: 'Tomorrow' },
        { value: 'thisWeek', label: 'This Week' },
        { value: 'custom',   label: 'Custom Range' },
      ]
    },
  ];

  const getFieldConfig = (key) => FILTER_FIELDS.find(f => f.key === key);

  const deriveApiParams = (filters) => {
    const p = {};
    filters.forEach(f => {
      if (f.field === 'branch')  p.branch = f.operator === 'is not' ? `NOT:${f.value}` : f.value;
      if (f.field === 'status')  p.status = f.operator === 'is not' ? `NOT:${f.value}` : f.value;
      if (f.field === 'agent')   p.agent  = f.value;
      if (f.field === 'gender')  p.gender = f.value;
      if (f.field === 'createdDate') {
        if (f.value === 'custom') { p.createdStartDate = f.dateFrom; p.createdEndDate = f.dateTo; }
        else p.createdDateRange = f.value;
      }
      if (f.field === 'appointmentDate') {
        if (f.value === 'custom') { p.appointmentStartDate = f.dateFrom; p.appointmentEndDate = f.dateTo; }
        else p.appointmentDateRange = f.value;
      }
    });
    return p;
  };

  const resetBuilder = () => {
    setBuilderField('');
    setBuilderOperator('is');
    setBuilderValue('');
    setBuilderValues([]);
    setBuilderDateFrom('');
    setBuilderDateTo('');
  };

  const isMultiSelect = (key) => !!getFieldConfig(key)?.multiSelect;

  const toggleMultiValue = (opt) => {
    setBuilderValues(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
    );
  };

  const canApplyFilter = () => {
    if (!builderField || !builderValue && builderValues.length === 0) return false;
    const cfg = getFieldConfig(builderField);
    if (cfg?.multiSelect) return builderValues.length > 0;
    if (!builderValue) return false;
    if (builderValue === 'custom' && (!builderDateFrom || !builderDateTo)) return false;
    return true;
  };

  const applyFilter = () => {
    const config = getFieldConfig(builderField);
    const multi = config?.multiSelect;
    let displayValue;
    if (multi) {
      const label = builderValues.join(', ');
      displayValue = builderOperator === 'is not' ? `≠ ${label}` : label;
    } else if (config?.type === 'datepreset') {
      if (builderValue === 'custom') displayValue = `${builderDateFrom} – ${builderDateTo}`;
      else displayValue = config.options.find(o => o.value === builderValue)?.label || builderValue;
    } else if (builderOperator === 'is not') {
      displayValue = `≠ ${builderValue}`;
    } else {
      displayValue = builderValue;
    }
    const newFilter = {
      id: editingFilterId || Date.now().toString(),
      field: builderField,
      fieldLabel: config?.fieldLabel || builderField,
      operator: builderOperator,
      value: multi ? builderValues.join(',') : builderValue,
      values: multi ? builderValues : undefined,
      dateFrom: builderDateFrom,
      dateTo: builderDateTo,
      displayValue,
    };
    if (editingFilterId) {
      setActiveFilters(prev => prev.map(f => f.id === editingFilterId ? newFilter : f));
    } else {
      setActiveFilters(prev => [...prev.filter(f => f.field !== builderField), newFilter]);
    }
    setPage(1);
    setShowBuilder(false);
    setEditingFilterId(null);
    resetBuilder();
  };

  const removeFilter = (id) => { setActiveFilters(prev => prev.filter(f => f.id !== id)); setPage(1); };
  const clearAllFilters = () => { setActiveFilters([]); setPage(1); };
  const openEditFilter = (filter) => {
    setEditingFilterId(filter.id);
    setBuilderField(filter.field);
    setBuilderOperator(filter.operator);
    const cfg = getFieldConfig(filter.field);
    if (cfg?.multiSelect) {
      setBuilderValues(filter.values || (filter.value ? filter.value.split(',') : []));
      setBuilderValue('');
    } else {
      setBuilderValue(filter.value);
      setBuilderValues([]);
    }
    setBuilderDateFrom(filter.dateFrom || '');
    setBuilderDateTo(filter.dateTo || '');
    setShowBuilder(true);
  };
  // ── end quick filter system ────────────────────────────────────────────────

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
      companionFreebie: booking.companionFreebie || '',
      companionArea: booking.companionArea || ''
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

  // Toggle cancel_validation or underage_validation for a single booking row (Admin only)
  const handleValidationToggle = useCallback(async (booking, field) => {
    const key = `${booking.rowNumber}-${field}`;
    setValidationUpdating(prev => ({ ...prev, [key]: true }));

    const newVal = !booking[field];
    const body = {
      cancelValidation:   field === 'cancelValidation'   ? newVal : booking.cancelValidation,
      underageValidation: field === 'underageValidation' ? newVal : booking.underageValidation,
    };

    try {
      const apiBase = process.env.REACT_APP_API_URL || 'https://cc-crm-backend-production.up.railway.app/api';
      const res = await fetch(`${apiBase}/bookings/${booking.rowNumber}/validation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json();
        console.error('Validation update failed:', d.error);
      } else {
        // Optimistically update local state so UI responds instantly
        setBookings(prev => prev.map(b =>
          b.rowNumber === booking.rowNumber ? { ...b, [field]: newVal } : b
        ));
      }
    } catch (err) {
      console.error('Validation toggle error:', err);
    } finally {
      setValidationUpdating(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }, []);

  const handleCardSnapshot = useCallback(async (booking, index) => {
    const el = cardRefs.current[index];
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `booking-${booking.firstName}-${booking.lastName}-${booking.date || 'nodate'}.png`.replace(/\s+/g, '-');
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  }, []);

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">

        {/* ── Monday.com-style Quick Filter Bar ──────────────────────── */}
        <div className="qf-bar">

          {/* Toolbar row */}
          <div className="qf-toolbar">
            <div className="qf-left">
              <button
                className={`qf-toolbar-btn${showBuilder ? ' active' : ''}`}
                onClick={() => { if (!showBuilder) { resetBuilder(); setEditingFilterId(null); } setShowBuilder(s => !s); }}
              >
                <FiFilter size={14} />
                <span>Filter</span>
                {activeFilters.length > 0 && <span className="qf-count-badge">{activeFilters.length}</span>}
              </button>
              <button className="qf-toolbar-btn" onClick={toggleSort}>
                {sortOrder === 'desc' ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
                <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
              </button>
            </div>
            <div className="qf-right">
              <div className="qf-search">
                <FiSearch size={14} />
                <input
                  type="text"
                  placeholder="Search name, phone, email, Instagram, agent..."
                  value={searchTerm}
                  onChange={handleSearch}
                  aria-label="Search bookings"
                />
              </div>
              <div className="view-toggle">
                <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table View"><FiList size={16} /></button>
                <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Card View"><FiGrid size={16} /></button>
              </div>
            </div>
          </div>

          {/* Chips row — always visible */}
          <div className="qf-chips-row">
            <span className="qf-quick-label">Quick filters</span>
            <span className="qf-result-count">Showing {(pagination.total || 0).toLocaleString()} bookings</span>
            <div className="qf-chips">
              {activeFilters.map(f => (
                <div key={f.id} className="qf-chip" onClick={() => openEditFilter(f)} title="Click to edit filter">
                  <span className="qf-chip-field">{f.fieldLabel}</span>
                  <span className="qf-chip-sep">:</span>
                  <span className="qf-chip-value">{f.displayValue}</span>
                  <button className="qf-chip-remove" onClick={e => { e.stopPropagation(); removeFilter(f.id); }} aria-label="Remove filter">
                    <FiX size={11} />
                  </button>
                </div>
              ))}
              <button className="qf-add-btn" onClick={() => { resetBuilder(); setEditingFilterId(null); setShowBuilder(true); }}>
                + Add filter
              </button>
            </div>
            {activeFilters.length > 0 && (
              <button className="qf-clear-btn" onClick={clearAllFilters}>Clear all</button>
            )}
          </div>

          {/* Filter builder — slides open */}
          {showBuilder && (
            <div className="qf-builder">
              <div className="qf-builder-header">
                <span>{editingFilterId ? 'Edit filter' : 'Add filter'}</span>
                <button className="qf-builder-close" onClick={() => { setShowBuilder(false); setEditingFilterId(null); resetBuilder(); }} aria-label="Close builder">
                  <FiX size={15} />
                </button>
              </div>

              <div className="qf-builder-body">
                {/* Field selector */}
                <div className="qf-builder-row">
                  <label>Field</label>
                  <select
                    value={builderField}
                    onChange={e => { setBuilderField(e.target.value); setBuilderValue(''); setBuilderOperator('is'); setBuilderDateFrom(''); setBuilderDateTo(''); }}
                  >
                    <option value="">Select field...</option>
                    {FILTER_FIELDS.map(f => (
                      <option
                        key={f.key}
                        value={f.key}
                        disabled={activeFilters.some(af => af.field === f.key && af.id !== editingFilterId)}
                      >
                        {f.fieldLabel}{activeFilters.some(af => af.field === f.key && af.id !== editingFilterId) ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select field: operator + value chips */}
                {builderField && getFieldConfig(builderField)?.type === 'select' && (
                  <>
                    <div className="qf-builder-row">
                      <label>Condition</label>
                      <div className="qf-operator-btns">
                        {['is', 'is not'].map(op => (
                          <button key={op} className={`qf-op-btn${builderOperator === op ? ' active' : ''}`} onClick={() => setBuilderOperator(op)}>{op}</button>
                        ))}
                      </div>
                    </div>
                    <div className="qf-builder-row">
                      <label>
                        Value
                        {isMultiSelect(builderField) && builderValues.length > 0 && (
                          <span className="qf-multi-hint"> · {builderValues.length} selected</span>
                        )}
                      </label>
                      <div className="qf-value-chips">
                        {getFieldConfig(builderField).options.map(opt => {
                          const selected = isMultiSelect(builderField)
                            ? builderValues.includes(opt)
                            : builderValue === opt;
                          return (
                            <button
                              key={opt}
                              className={`qf-value-chip${selected ? ' selected' : ''}`}
                              onClick={() =>
                                isMultiSelect(builderField)
                                  ? toggleMultiValue(opt)
                                  : setBuilderValue(opt)
                              }
                            >
                              {isMultiSelect(builderField) && selected && <span className="qf-chip-tick">✓ </span>}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Date preset field: period chips + optional custom date inputs */}
                {builderField && getFieldConfig(builderField)?.type === 'datepreset' && (
                  <>
                    <div className="qf-builder-row">
                      <label>Period</label>
                      <div className="qf-value-chips">
                        {getFieldConfig(builderField).options.map(opt => (
                          <button
                            key={opt.value}
                            className={`qf-value-chip${builderValue === opt.value ? ' selected' : ''}`}
                            onClick={() => setBuilderValue(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {builderValue === 'custom' && (
                      <div className="qf-builder-row">
                        <label>Range</label>
                        <div className="qf-custom-dates">
                          <input type="date" value={builderDateFrom} onChange={e => setBuilderDateFrom(e.target.value)} max={builderDateTo || undefined} aria-label="Start date" />
                          <span>to</span>
                          <input type="date" value={builderDateTo} onChange={e => setBuilderDateTo(e.target.value)} min={builderDateFrom || undefined} aria-label="End date" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="qf-builder-footer">
                <button className="qf-builder-cancel" onClick={() => { setShowBuilder(false); setEditingFilterId(null); resetBuilder(); }}>Cancel</button>
                <button className="qf-builder-apply" disabled={!canApplyFilter()} onClick={applyFilter}>
                  {editingFilterId ? 'Update filter' : 'Apply filter'}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* ── end Quick Filter Bar ─────────────────────────────────────── */}

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
                      <th>Booking Schedule</th>
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
                      {user?.role !== 'Agent' && <th>Price</th>}
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
                      <th>Companion Area</th>
                      {user?.role === 'Admin' && <th className="validation-col-header">Cancel Validation</th>}
                      {user?.role === 'Admin' && <th className="validation-col-header">Underage Validation</th>}
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
                        <td>
                          <div style={{whiteSpace: 'nowrap'}}>
                            {booking.date ? (
                              <>
                                <div style={{fontSize: '14px', fontWeight: '600'}}>
                                  {booking.date.split(' ').slice(0, 3).join(' ')}
                                </div>
                                <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                                  {booking.date.split(' ').slice(3).join(' ')}
                                </div>
                              </>
                            ) : '-'}
                          </div>
                        </td>
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
                        {user?.role !== 'Agent' && <td><strong>₱{typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : (parseFloat(booking.totalPrice) || 0).toFixed(2)}</strong></td>}
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
                        <td>{booking.companionArea || '-'}</td>
                        {user?.role === 'Admin' && (
                          <td className="validation-cell">
                            <label className="validation-checkbox-wrap" title="Cancel Validation: exclude this arrival from agent stats">
                              <input
                                type="checkbox"
                                checked={!!booking.cancelValidation}
                                disabled={!!validationUpdating[`${booking.rowNumber}-cancelValidation`]}
                                onChange={() => handleValidationToggle(booking, 'cancelValidation')}
                              />
                              {booking.cancelValidation && <span className="val-badge val-cancel">Excluded</span>}
                            </label>
                          </td>
                        )}
                        {user?.role === 'Admin' && (
                          <td className="validation-cell">
                            <label className="validation-checkbox-wrap" title="Underage Validation: exclude this arrival from agent stats">
                              <input
                                type="checkbox"
                                checked={!!booking.underageValidation}
                                disabled={!!validationUpdating[`${booking.rowNumber}-underageValidation`]}
                                onChange={() => handleValidationToggle(booking, 'underageValidation')}
                              />
                              {booking.underageValidation && <span className="val-badge val-underage">Excluded</span>}
                            </label>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bookings-cards-grid">
                {bookings.map((booking, index) => (
                  <div key={index} className="booking-card" ref={el => cardRefs.current[index] = el}>
                    <div className="booking-card-header">
                      <div className="card-header-left">
                        <h3>{booking.firstName} {booking.lastName}</h3>
                        <span className="card-date">{booking.date || '-'} • {booking.timestamp ? new Date(booking.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                      <div className="card-header-right">
                        <span className={getStatusClass(booking.status)}>
                          {booking.status || 'N/A'}
                        </span>
                        <div className="card-actions">
                          <button className="card-action-btn card-edit-btn" onClick={() => handleEditClick(booking)} title="Edit booking">
                            <FiEdit2 size={14} />
                          </button>
                          <button className="card-action-btn card-snap-btn" onClick={() => handleCardSnapshot(booking, index)} title="Save as image">
                            <FiCamera size={14} />
                          </button>
                        </div>
                      </div>
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
                          {user?.role !== 'Agent' && (
                            <div className="card-info-item">
                              <span className="label">Total Price:</span>
                              <span className="value price">₱{typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : (parseFloat(booking.totalPrice) || 0).toFixed(2)}</span>
                            </div>
                          )}
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
                            <div className="card-info-item">
                              <span className="label">Area:</span>
                              <span className="value">{booking.companionArea || '-'}</span>
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

                  {user?.role !== 'Agent' && (
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
                  )}

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
                    <select 
                      name="agent" 
                      value={editFormData.agent} 
                      onChange={handleEditFormChange} 
                      required
                      disabled={user?.role !== 'Admin'}
                      title={user?.role !== 'Admin' ? 'Agents cannot change the assigned agent' : ''}
                    >
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

                  <div className="form-group">
                    <label>Companion Area</label>
                    <input
                      type="text"
                      name="companionArea"
                      value={editFormData.companionArea}
                      onChange={handleEditFormChange}
                      placeholder="Area of treatment"
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
