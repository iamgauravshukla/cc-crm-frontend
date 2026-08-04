import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiArrowDown, FiArrowUp, FiGrid, FiList, FiEdit2, FiX, FiSave, FiFilter, FiSearch, FiCamera, FiTrash2, FiAlertTriangle, FiDownload, FiBookmark, FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import { getOldBookings, deleteBooking, exportBookings, bulkUpdateStatus, bulkDeleteBookings, getSavedViews, createSavedView, deleteSavedView, getActivityLog, updateBooking, updateValidation, updateBookingFlags } from '../services/api';
import { useConfig } from '../hooks/useConfig';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ScrollableTable from '../components/ScrollableTable';

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

const FIELD_LABELS = {
  booking_status:       'Status',
  branch:               'Branch',
  appointment_date:     'Appointment Date',
  appointment_time:     'Appointment Time',
  first_name:           'First Name',
  last_name:            'Last Name',
  age:                  'Age',
  gender:               'Gender',
  email:                'Email',
  phone:                'Phone',
  social_media:         'Social Media',
  treatment:            'Treatment',
  area:                 'Area',
  freebie:              'Freebie',
  total_price:          'Total Price',
  payment_mode:         'Payment Mode',
  agent:                'Agent',
  booking_details:      'Booking Details',
  ad_interacted:        'Ad Interacted',
  companion_treatment:  'Companion Treatment',
  companion_first_name: 'Companion First Name',
  companion_last_name:  'Companion Last Name',
  companion_age:        'Companion Age',
  companion_gender:     'Companion Gender',
  companion_freebie:    'Companion Freebie',
  remarks:              'Remarks',
  purchase_details:     'Purchase Details',
  follow_up_date:       'Follow-up Date',
  is_ots:               'OTS',
  is_high_priority:     'High Priority',
  is_meta_conversion:   'Meta Conversion',
};

function OldBookings() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('appointment_date');
  const [sortDir,   setSortDir]   = useState('desc');
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
  const [modalTab, setModalTab] = useState('edit');
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  // Track which rows have in-flight validation updates
  const [validationUpdating, setValidationUpdating] = useState({});

  // Delete state
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Multi-select + bulk update
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Export
  const [exportLoading, setExportLoading] = useState(false);

  // Saved views
  const [savedViews, setSavedViews] = useState([]);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [savingView, setSavingView] = useState(false);

  const limit = 50;
  const { options: cfgOptions } = useConfig();

  const branches        = ['All', ...cfgOptions.branches];
  const bookingStatuses = ['All', ...cfgOptions.statuses];

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
        sortField,
        sortOrder: sortDir === 'desc' ? 'newest' : 'oldest',
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
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearchTerm, activeFilters, sortField, sortDir]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleColumnSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
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

  const treatments = cfgOptions.treatments;
  const agents     = cfgOptions.agents;

  // ── Quick filter system ────────────────────────────────────────────────────
  const FILTER_FIELDS = [
    { key: 'branch',          fieldLabel: 'Branch',           type: 'select',     multiSelect: true,  options: branches.filter(b => b !== 'All') },
    { key: 'status',          fieldLabel: 'Status',           type: 'select',     multiSelect: true,  options: bookingStatuses.filter(s => s !== 'All') },
    { key: 'agent',           fieldLabel: 'Agent',            type: 'select',     multiSelect: true,  options: agents },
    { key: 'gender',          fieldLabel: 'Gender',           type: 'select',     multiSelect: false, options: ['Male', 'Female'] },
    {
      key: 'createdDate', fieldLabel: 'Booked On', type: 'datepreset',
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
        { value: 'today',     label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'tomorrow',  label: 'Tomorrow' },
        { value: 'thisWeek',  label: 'This Week' },
        { value: 'next7',     label: 'Next 7 Days' },
        { value: 'next30',    label: 'Next 30 Days' },
        { value: 'thisMonth', label: 'This Month' },
        { value: 'last30',    label: 'Last 30 Days' },
        { value: 'last90',    label: 'Last 90 Days' },
        { value: 'lastMonth', label: 'Last Month' },
        { value: 'custom',    label: 'Custom Range' },
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
    if (!builderField || (!builderValue && builderValues.length === 0)) return false;
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

  const removeFilter = (id) => { setActiveFilters(prev => prev.filter(f => f.id !== id)); setPage(1); setSelectedIds(new Set()); };
  const clearAllFilters = () => { setActiveFilters([]); setPage(1); setSelectedIds(new Set()); };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = { search: debouncedSearchTerm, ...deriveApiParams(activeFilters) };
      const response = await exportBookings(params);
      const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `bookings-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Multi-select ──────────────────────────────────────────────────────────
  const handleSelectAll = () => {
    if (selectedIds.size === bookings.length && bookings.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(bookings.map(b => b.recordId)));
  };

  const handleSelectOne = (recordId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId); else next.add(recordId);
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await bulkUpdateStatus({ recordIds: [...selectedIds], status: bulkStatus });
      setSelectedIds(new Set());
      setBulkStatus('');
      fetchBookings();
    } catch (err) {
      console.error('Bulk update failed:', err.response?.data?.error || err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected booking(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await bulkDeleteBookings([...selectedIds]);
      setSelectedIds(new Set());
      fetchBookings();
    } catch (err) {
      console.error('Bulk delete failed:', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || 'Failed to delete selected bookings');
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Saved views ───────────────────────────────────────────────────────────
  useEffect(() => {
    getSavedViews().then(res => setSavedViews(res.data.views || [])).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveView = async () => {
    const name = newViewName.trim();
    if (!name || activeFilters.length === 0) return;
    setSavingView(true);
    try {
      const res = await createSavedView({ name, filters: activeFilters });
      setSavedViews(prev => {
        const idx = prev.findIndex(v => v.name === name);
        return idx >= 0 ? prev.map((v, i) => i === idx ? res.data.view : v) : [res.data.view, ...prev];
      });
      setNewViewName('');
    } catch (err) {
      console.error('Save view failed:', err);
    } finally {
      setSavingView(false);
    }
  };

  const handleLoadView = (view) => {
    setActiveFilters(view.filters);
    setPage(1);
    setSelectedIds(new Set());
    setShowSavedViews(false);
  };

  const handleDeleteView = async (id) => {
    try {
      await deleteSavedView(id);
      setSavedViews(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Delete view failed:', err);
    }
  };
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

  const handleDeleteClick = (booking) => {
    setDeleteError('');
    setConfirmDeleteBooking(booking);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteBooking) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteBooking(confirmDeleteBooking.rowNumber);
      setConfirmDeleteBooking(null);
      fetchBookings();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete booking');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = (booking) => {
    setEditingBooking(booking);
    // Parse stored "YYYY-MM-DD" date and "H:MM AM/PM" time into native input formats
    const dateVal = booking.date || '';
    // Convert "H:MM AM/PM" → "HH:MM" for time input
    const timeVal = (() => {
      if (!booking.time) return '';
      const m = booking.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return '';
      let h = parseInt(m[1], 10);
      const mn = m[2];
      const ap = m[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${mn}`;
    })();
    // Case-insensitive match against config options (handles imported data with different casing)
    const matchConfig = (val, arr) => {
      if (!val) return '';
      return arr.find(o => o.toLowerCase() === val.toLowerCase()) || val;
    };
    setEditFormData({
      rowNumber: booking.rowNumber,
      date: dateVal,
      time: timeVal,
      branch: matchConfig(booking.branch, cfgOptions.branches),
      status: matchConfig(booking.status, cfgOptions.statuses),
      firstName: booking.firstName || '',
      lastName: booking.lastName || '',
      age: booking.age ?? '',
      gender: booking.gender || '',
      phone: booking.phone || '',
      socialMedia: booking.socialMedia || '',
      email: booking.email || '',
      treatment: matchConfig(booking.treatment, cfgOptions.treatments),
      area: booking.area || '',
      freebie: booking.freebie || '',
      totalPrice: booking.totalPrice ?? 0,
      paymentMode: booking.paymentMode || '',
      agent: matchConfig(booking.agent, cfgOptions.agents),
      bookingDetails: booking.bookingDetails || '',
      adInteracted: booking.adInteracted || '',
      remarks: booking.remarks || '',
      purchaseDetails: booking.purchaseDetails || '',
      companionFirstName: booking.companionFirstName || '',
      companionLastName: booking.companionLastName || '',
      companionAge: booking.companionAge ?? '',
      companionGender: booking.companionGender || '',
      companionTreatment: matchConfig(booking.companionTreatment, cfgOptions.treatments),
      companionFreebie: booking.companionFreebie || '',
      companionArea: booking.companionArea || '',
      isOts: booking.isOts || false,
      isAdId: booking.isAdId || false,
      isCompanion: booking.isCompanion || false,
      isPromoHunter: booking.isPromoHunter || false,
      isHighPriority: booking.isHighPriority || false,
      isMetaConversion: booking.isMetaConversion || false,
      followUpDate: booking.followUpDate || '',
      bookingDate: booking.bookingDate || '',
      bookingTime: (() => {
        if (!booking.bookingTime) return '';
        const bm = booking.bookingTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!bm) return '';
        let bh = parseInt(bm[1], 10);
        if (bm[3].toUpperCase() === 'PM' && bh !== 12) bh += 12;
        if (bm[3].toUpperCase() === 'AM' && bh === 12) bh = 0;
        return `${String(bh).padStart(2, '0')}:${bm[2]}`;
      })(),
    });
    setUpdateError('');
    setUpdateSuccess('');
    setModalTab('edit');
    setActivityLog([]);
    setIsEditModalOpen(true);
    // Fetch activity log in the background
    setActivityLoading(true);
    getActivityLog(booking.rowNumber || booking.recordId || booking.record_id)
      .then(r => setActivityLog(r.data.log || []))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      // Guard: only send totalPrice when the admin actually changed it, so unrelated
      // edits can never overwrite the stored price (#13). Blank/invalid → omit entirely.
      const payload = { ...editFormData };
      const origPrice = Number(editingBooking?.totalPrice);
      const formPrice = (editFormData.totalPrice === '' || editFormData.totalPrice == null)
        ? NaN : Number(editFormData.totalPrice);
      if (Number.isNaN(formPrice) || formPrice === origPrice) {
        delete payload.totalPrice;
      } else {
        payload.totalPrice = formPrice;
      }

      await updateBooking(editFormData.rowNumber, payload);

      setUpdateSuccess('Booking updated successfully!');
      setTimeout(() => {
        fetchBookings();
        setIsEditModalOpen(false);
        setEditingBooking(null);
      }, 1500);
    } catch (err) {
      setUpdateError(err.response?.data?.error || err.message || 'Failed to update booking');
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

  // Set tri-state Underage Status / Double Booking Status for a single row (Admin only)
  // field is 'underageStatus' or 'dbStatus'; value ∈ 'Approved' | 'Pending' | 'Rejected'
  const handleStatusChange = useCallback(async (booking, field, value) => {
    const key = `${booking.rowNumber}-${field}`;
    const prevVal = booking[field];
    setValidationUpdating(prev => ({ ...prev, [key]: true }));
    // Optimistic update
    setBookings(prev => prev.map(b =>
      b.rowNumber === booking.rowNumber ? { ...b, [field]: value } : b
    ));

    try {
      await updateValidation(booking.rowNumber, { [field]: value });
    } catch (err) {
      console.error('Status change error:', err.response?.data?.error || err.message);
      // Revert on failure
      setBookings(prev => prev.map(b =>
        b.rowNumber === booking.rowNumber ? { ...b, [field]: prevVal } : b
      ));
    } finally {
      setValidationUpdating(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }, []);

  // Toggle the OTS / With-Companion identifier columns for a single row
  // field is 'isOts' or 'isCompanion'
  const handleFlagToggle = useCallback(async (booking, field) => {
    const key = `${booking.rowNumber}-${field}`;
    const newVal = !booking[field];
    setValidationUpdating(prev => ({ ...prev, [key]: true }));
    setBookings(prev => prev.map(b =>
      b.rowNumber === booking.rowNumber ? { ...b, [field]: newVal } : b
    ));
    try {
      await updateBookingFlags(booking.rowNumber, { [field]: newVal });
    } catch (err) {
      console.error('Flag toggle error:', err.response?.data?.error || err.message);
      setBookings(prev => prev.map(b =>
        b.rowNumber === booking.rowNumber ? { ...b, [field]: !newVal } : b
      ));
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
              <button className="qf-toolbar-btn" onClick={() => handleColumnSort(sortField)}>
                {sortDir === 'desc' ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
                <span>{sortDir === 'desc' ? 'Newest first' : 'Oldest first'}</span>
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
              {/* Saved Views */}
              <div className="saved-views-wrap">
                <button
                  className={`qf-toolbar-btn${showSavedViews ? ' active' : ''}`}
                  onClick={() => setShowSavedViews(s => !s)}
                  title="Saved views"
                >
                  <FiBookmark size={14} />
                  <span>Views</span>
                  {savedViews.length > 0 && <span className="qf-count-badge">{savedViews.length}</span>}
                </button>
                {showSavedViews && (
                  <div className="saved-views-dropdown">
                    <div className="saved-views-header">Saved Views</div>
                    {savedViews.length === 0 && <div className="saved-views-empty">No saved views yet</div>}
                    {savedViews.map(v => (
                      <div key={v.id} className="saved-view-item">
                        <button className="saved-view-load" onClick={() => handleLoadView(v)}>{v.name}</button>
                        <button className="saved-view-del" onClick={() => handleDeleteView(v.id)} title="Delete view"><FiX size={12} /></button>
                      </div>
                    ))}
                    <div className="saved-views-save">
                      <input
                        type="text"
                        value={newViewName}
                        onChange={e => setNewViewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveView()}
                        placeholder="Save current filters as..."
                        disabled={activeFilters.length === 0}
                      />
                      <button
                        onClick={handleSaveView}
                        disabled={!newViewName.trim() || activeFilters.length === 0 || savingView}
                      >
                        {savingView ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Export */}
              <button
                className="qf-toolbar-btn"
                onClick={handleExport}
                disabled={exportLoading}
                title="Export current view to CSV"
              >
                <FiDownload size={14} />
                <span>{exportLoading ? 'Exporting…' : 'Export CSV'}</span>
              </button>
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

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-selected-count">{selectedIds.size} selected</span>
            <select
              className="bulk-status-select"
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
            >
              <option value="">Set status…</option>
              {cfgOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || bulkLoading}
            >
              {bulkLoading ? 'Updating…' : 'Apply'}
            </button>
            {user?.role === 'Admin' && (
              <button
                className="btn btn-danger btn-sm"
                onClick={handleBulkDelete}
                disabled={bulkLoading}
              >
                <FiTrash2 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {bulkLoading ? 'Deleting…' : `Delete ${selectedIds.size}`}
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <Loader message="Loading bookings..." />
        ) : bookings.length === 0 ? (
          <div className="loading-section">
            <p>No bookings found.</p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <ScrollableTable className="table-container">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={bookings.length > 0 && selectedIds.size === bookings.length}
                          onChange={handleSelectAll}
                          title="Select all"
                        />
                      </th>
                      <th>Actions</th>
                      <th className="id-flags-col" title="Identifiers">Flags</th>
                      <th className="sortable-th" onClick={() => handleColumnSort('appointment_date')}>
                        Booking Schedule
                        {sortField === 'appointment_date'
                          ? (sortDir === 'desc' ? <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle'}} /> : <FiArrowUp size={11} style={{marginLeft:4,verticalAlign:'middle'}} />)
                          : <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle',opacity:0.25}} />}
                      </th>
                      <th className="sortable-th" onClick={() => handleColumnSort('booking_date')}>
                        Booked On
                        {sortField === 'booking_date'
                          ? (sortDir === 'desc' ? <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle'}} /> : <FiArrowUp size={11} style={{marginLeft:4,verticalAlign:'middle'}} />)
                          : <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle',opacity:0.25}} />}
                      </th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th className="sortable-th" onClick={() => handleColumnSort('age')}>
                        Age
                        {sortField === 'age'
                          ? (sortDir === 'desc' ? <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle'}} /> : <FiArrowUp size={11} style={{marginLeft:4,verticalAlign:'middle'}} />)
                          : <FiArrowDown size={11} style={{marginLeft:4,verticalAlign:'middle',opacity:0.25}} />}
                      </th>
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
                      <th>Remarks</th>
                      <th>Ad Interacted</th>
                      <th>Companion First Name</th>
                      <th>Companion Last Name</th>
                      <th>Companion Age</th>
                      <th>Companion Gender</th>
                      <th>Companion Freebie</th>
                      <th>Companion Area</th>
                      <th className="validation-col-header">OTS</th>
                      <th className="validation-col-header">With Companion</th>
                      {user?.role === 'Admin' && <th className="validation-col-header">Underage Status</th>}
                      {user?.role === 'Admin' && <th className="validation-col-header">Double Booking Status</th>}
                      {user?.role === 'Admin' && <th className="validation-col-header">Delete</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr key={index} className={[
                        booking.isPromoHunter ? 'promo-hunter-row' : '',
                        selectedIds.has(booking.recordId) ? 'row-selected' : ''
                      ].filter(Boolean).join(' ')}>
                        <td className="checkbox-col">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(booking.recordId)}
                            onChange={() => handleSelectOne(booking.recordId)}
                          />
                        </td>
                        <td>
                          <button
                            className="edit-btn-icon"
                            onClick={() => handleEditClick(booking)}
                            title="Edit booking"
                          >
                            <FiEdit2 size={16} />
                          </button>
                        </td>
                        <td className="id-flags-cell">
                          {booking.isPromoHunter     && <span className="id-badge id-promo" title="Promo Hunter">🎯</span>}
                          {booking.isOts            && <span className="id-badge id-ots"  title="On-the-spot">OTS</span>}
                          {booking.isAdId            && <span className="id-badge id-adid" title="Ad ID">AD</span>}
                          {booking.isHighPriority    && <span className="id-badge id-hp"   title="High Priority">HP</span>}
                          {booking.isCompanion       && <span className="id-badge id-comp" title="Companion">CO</span>}
                          {booking.isMetaConversion  && <span className="id-badge id-meta" title="Meta Conversion">MC</span>}
                        </td>
                        <td>
                          <div style={{whiteSpace: 'nowrap'}}>
                            {booking.date ? (
                              <>
                                <div style={{fontSize: '14px', fontWeight: '600'}}>
                                  {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'})}
                                </div>
                                <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                                  {booking.time || ''}
                                </div>
                              </>
                            ) : '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{whiteSpace: 'nowrap'}}>
                            {booking.bookingDate ? (
                              <>
                                <div style={{fontSize: '14px', fontWeight: '600'}}>
                                  {new Date(booking.bookingDate + 'T00:00:00').toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'})}
                                </div>
                                <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                                  {booking.bookingTimeDisplay || booking.bookingTime || ''}
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
                        <td><span className="booking-details-cell" title={booking.remarks || ''}>{booking.remarks ? (booking.remarks.length > 30 ? booking.remarks.substring(0, 30) + '...' : booking.remarks) : '-'}</span></td>
                        <td>{booking.adInteracted || '-'}</td>
                        <td>{booking.companionFirstName || '-'}</td>
                        <td>{booking.companionLastName || '-'}</td>
                        <td>{booking.companionAge || '-'}</td>
                        <td>{booking.companionGender || '-'}</td>
                        <td>{booking.companionFreebie || '-'}</td>
                        <td>{booking.companionArea || '-'}</td>
                        <td className="validation-cell">
                          <input
                            type="checkbox"
                            className="flag-checkbox"
                            checked={!!booking.isOts}
                            disabled={!!validationUpdating[`${booking.rowNumber}-isOts`]}
                            onChange={() => handleFlagToggle(booking, 'isOts')}
                            title="OTS (On-The-Spot)"
                          />
                        </td>
                        <td className="validation-cell">
                          <input
                            type="checkbox"
                            className="flag-checkbox"
                            checked={!!booking.isCompanion}
                            disabled={!!validationUpdating[`${booking.rowNumber}-isCompanion`]}
                            onChange={() => handleFlagToggle(booking, 'isCompanion')}
                            title="With Companion"
                          />
                        </td>
                        {user?.role === 'Admin' && (
                          <td className="validation-cell">
                            <select
                              className={`val-status-select val-${(booking.underageStatus || 'Approved').toLowerCase()}`}
                              value={booking.underageStatus || 'Approved'}
                              disabled={!!validationUpdating[`${booking.rowNumber}-underageStatus`]}
                              onChange={e => handleStatusChange(booking, 'underageStatus', e.target.value)}
                              title="Underage Status — Pending or Rejected excludes this booking from reports"
                            >
                              <option value="Approved">✓ Approved</option>
                              <option value="Pending">⏳ Pending</option>
                              <option value="Rejected">✕ Rejected</option>
                            </select>
                          </td>
                        )}
                        {user?.role === 'Admin' && (
                          <td className="validation-cell">
                            <select
                              className={`val-status-select val-${(booking.dbStatus || 'Approved').toLowerCase()}`}
                              value={booking.dbStatus || 'Approved'}
                              disabled={!!validationUpdating[`${booking.rowNumber}-dbStatus`]}
                              onChange={e => handleStatusChange(booking, 'dbStatus', e.target.value)}
                              title="Double Booking Status — Pending or Rejected excludes this booking from reports"
                            >
                              <option value="Approved">✓ Approved</option>
                              <option value="Pending">⏳ Pending</option>
                              <option value="Rejected">✕ Rejected</option>
                            </select>
                          </td>
                        )}
                        {user?.role === 'Admin' && (
                          <td className="validation-cell">
                            <button
                              className="delete-row-btn"
                              title="Delete this booking"
                              onClick={() => handleDeleteClick(booking)}
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>
            ) : (
              <div className="bookings-cards-grid">
                {bookings.map((booking, index) => (
                  <div key={index} className={`booking-card${booking.isPromoHunter ? ' promo-hunter-card' : ''}`} ref={el => cardRefs.current[index] = el}>
                    <div className="booking-card-header">
                      <div className="card-header-left">
                        <h3>{booking.firstName} {booking.lastName}</h3>
                        {booking.isPromoHunter && (
                          <span className="promo-hunter-badge-inline">🎯 Promo Hunter</span>
                        )}
                        <span className="card-date">
                          {booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'}) : '-'}{booking.time ? ` • ${booking.time}` : ''}
                        </span>
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
                          {user?.role === 'Admin' && (
                            <button className="card-action-btn card-delete-btn" onClick={() => handleDeleteClick(booking)} title="Delete booking">
                              <FiTrash2 size={14} />
                            </button>
                          )}
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

                      {(booking.isOts || booking.isAdId || booking.isCompanion || booking.isHighPriority) && (
                        <div className="card-section">
                          <h4>Identifiers</h4>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            {booking.isOts           && <span className="id-badge id-ots" >OTS</span>}
                            {booking.isAdId          && <span className="id-badge id-adid">Ad ID</span>}
                            {booking.isCompanion     && <span className="id-badge id-comp">Companion</span>}
                            {booking.isHighPriority  && <span className="id-badge id-hp"  >High Priority</span>}
                            {booking.isMetaConversion && <span className="id-badge id-meta">Meta Conv.</span>}
                          </div>
                        </div>
                      )}
                      {booking.bookingDetails && (
                        <div className="card-section">
                          <h4>Booking Details</h4>
                          <p className="booking-details-text">{booking.bookingDetails}</p>
                        </div>
                      )}
                      {booking.remarks && (
                        <div className="card-section">
                          <h4>Remarks</h4>
                          <p className="booking-details-text">{booking.remarks}</p>
                        </div>
                      )}
                      {booking.purchaseDetails && (
                        <div className="card-section">
                          <h4>Purchase Details</h4>
                          <p className="booking-details-text">{booking.purchaseDetails}</p>
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
          <>
            <div className="flyout-backdrop" onClick={closeEditModal} />
            <div className="flyout-panel">
              <div className="flyout-header">
                <div className="flyout-header-info">
                  <h2 className="flyout-title">Edit Booking</h2>
                  {editFormData.rowNumber && <span className="flyout-record-id">{editFormData.rowNumber}</span>}
                </div>
                <button className="flyout-close-btn" onClick={closeEditModal} title="Close">
                  <FiX size={20} />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="modal-tab-bar">
                <button className={`modal-tab-btn${modalTab === 'edit' ? ' active' : ''}`} onClick={() => setModalTab('edit')}>
                  <FiEdit2 size={13} /> Edit
                </button>
                <button className={`modal-tab-btn${modalTab === 'activity' ? ' active' : ''}`} onClick={() => setModalTab('activity')}>
                  <FiClock size={13} /> Activity Log {activityLog.length > 0 && <span className="tab-badge">{activityLog.length}</span>}
                </button>
              </div>

              {updateError && modalTab === 'edit' && <div className="alert alert-error">{updateError}</div>}
              {updateSuccess && modalTab === 'edit' && <div className="alert alert-success">{updateSuccess}</div>}

              {/* Activity Log Panel */}
              {modalTab === 'activity' && (
                <div className="activity-log-panel">
                  {activityLoading ? (
                    <div className="activity-loading"><FiRefreshCw size={18} className="spin" /> Loading history…</div>
                  ) : activityLog.length === 0 ? (
                    <div className="activity-empty">No activity recorded yet.</div>
                  ) : (
                    <div className="activity-timeline">
                      {activityLog.map(entry => (
                        <div key={entry.id} className={`activity-entry activity-${entry.action.toLowerCase()}`}>
                          <div className="activity-icon">
                            {entry.action === 'CREATED'      && <FiCheckCircle size={15} />}
                            {entry.action === 'STATUS_CHANGED'&& <FiRefreshCw   size={15} />}
                            {entry.action === 'UPDATED'       && <FiEdit2       size={15} />}
                            {entry.action === 'BULK_STATUS'   && <FiAlertCircle size={15} />}
                          </div>
                          <div className="activity-body">
                            <div className="activity-meta">
                              <span className="activity-user">{entry.user_name}</span>
                              <span className="activity-action-label">
                                {entry.action === 'CREATED'       && 'created this booking'}
                                {entry.action === 'STATUS_CHANGED' && 'changed status'}
                                {entry.action === 'UPDATED'        && 'updated booking'}
                                {entry.action === 'BULK_STATUS'    && 'bulk-updated status'}
                              </span>
                              <span className="activity-time">{new Date(entry.created_at).toLocaleString()}</span>
                            </div>
                            {Object.keys(entry.changes || {}).length > 0 && (
                              <div className="activity-changes">
                                {Object.entries(entry.changes).map(([field, { from, to }]) => (
                                  <div key={field} className="activity-change-row">
                                    <span className="ac-field">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</span>
                                    {from != null && from !== '' && <span className="ac-from">{String(from)}</span>}
                                    {from != null && from !== '' && <span className="ac-arrow">→</span>}
                                    <span className="ac-to">{to != null && to !== '' ? String(to) : '(cleared)'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleUpdateBooking} className="edit-booking-form" style={{ display: modalTab === 'edit' ? undefined : 'none' }}>
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Booking Date</label>
                    <input
                      type="date"
                      name="bookingDate"
                      value={editFormData.bookingDate}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Booking Time</label>
                    <input
                      type="time"
                      name="bookingTime"
                      value={editFormData.bookingTime}
                      onChange={handleEditFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Appointment Date *</label>
                    <input
                      type="date"
                      name="date"
                      value={editFormData.date}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Appointment Time *</label>
                    <input
                      type="time"
                      name="time"
                      value={editFormData.time}
                      onChange={handleEditFormChange}
                      required
                    />
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
                      onWheel={(e) => e.currentTarget.blur()}
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
                      {editFormData.treatment && !treatments.includes(editFormData.treatment) && (
                        <option value={editFormData.treatment}>{editFormData.treatment}</option>
                      )}
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
                        onWheel={(e) => e.currentTarget.blur()}
                        required
                        min="0"
                        step="any"
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
                      {editFormData.agent && !agents.includes(editFormData.agent) && (
                        <option value={editFormData.agent}>{editFormData.agent}</option>
                      )}
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

                  <div className="form-group full-width">
                    <label>Remarks</label>
                    <textarea
                      name="remarks"
                      value={editFormData.remarks}
                      onChange={handleEditFormChange}
                      rows="2"
                      placeholder="Agent remarks about this booking..."
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Purchase Details <span style={{fontSize:'12px',fontWeight:'normal',color:'var(--text-secondary)'}}>— filled after visit</span></label>
                    <textarea
                      name="purchaseDetails"
                      value={editFormData.purchaseDetails}
                      onChange={handleEditFormChange}
                      rows="2"
                      placeholder="Details of what was purchased during the visit..."
                    />
                  </div>

                  {/* Identifier Checkboxes */}
                  <div className="form-group full-width">
                    <label>Identifiers</label>
                    <div style={{display:'flex',gap:'20px',flexWrap:'wrap',marginTop:'6px'}}>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isOts" checked={!!editFormData.isOts} onChange={handleEditFormChange} />
                        OTS (On-the-spot)
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isAdId" checked={!!editFormData.isAdId} onChange={handleEditFormChange} />
                        Ad ID
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isCompanion" checked={!!editFormData.isCompanion} onChange={handleEditFormChange} />
                        Companion
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isPromoHunter" checked={!!editFormData.isPromoHunter} onChange={handleEditFormChange} />
                        🎯 Promo Hunter
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isHighPriority" checked={!!editFormData.isHighPriority} onChange={handleEditFormChange} />
                        High Priority
                      </label>
                      <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'14px'}}>
                        <input type="checkbox" name="isMetaConversion" checked={!!editFormData.isMetaConversion} onChange={handleEditFormChange} />
                        Meta Conversion
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Follow-up Date</label>
                    <input
                      type="date"
                      name="followUpDate"
                      value={editFormData.followUpDate || ''}
                      onChange={handleEditFormChange}
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
                      onWheel={(e) => e.currentTarget.blur()}
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
                      {editFormData.companionTreatment && !treatments.includes(editFormData.companionTreatment) && (
                        <option value={editFormData.companionTreatment}>{editFormData.companionTreatment}</option>
                      )}
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
          </>
        )}

        {/* ── Delete Confirmation Modal ── */}
        {confirmDeleteBooking && (
          <div className="modal-overlay" onClick={() => !deleteLoading && setConfirmDeleteBooking(null)}>
            <div className="modal-container" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FiAlertTriangle size={20} /> Delete Booking
                </h2>
                <button className="modal-close" onClick={() => !deleteLoading && setConfirmDeleteBooking(null)} disabled={deleteLoading}>
                  <FiX size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: '28px 24px' }}>
                <p style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '15px' }}>
                  Are you sure you want to permanently delete this booking?
                </p>
                <p style={{ margin: '0 0 20px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>
                  {confirmDeleteBooking.firstName} {confirmDeleteBooking.lastName} — {confirmDeleteBooking.date}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  This action marks the booking as deleted and cannot be undone.
                </p>
                {deleteError && (
                  <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
                    {deleteError}
                  </div>
                )}
              </div>
              <div className="modal-actions" style={{ padding: '0 24px 24px', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmDeleteBooking(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  <FiTrash2 size={15} />
                  {deleteLoading ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
  );
}

export default OldBookings;
