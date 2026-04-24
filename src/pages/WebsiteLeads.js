import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiRefreshCw, FiPhone, FiMail, FiCalendar, FiUser, FiMessageSquare, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import { getCallLeads, getBookingLeads, getLeadCenters, updateLead } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import './WebsiteLeads.css';

const TABS = [
  { key: 'call', label: 'Consultancy Call' },
  { key: 'booking', label: 'Direct Booking' },
];

function WebsiteLeads() {
  const [activeTab, setActiveTab] = useState('call');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [centers, setCenters] = useState(['ALL']);
  const [selectedCenter, setSelectedCenter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [lastRefresh, setLastRefresh] = useState(null);

  // Edit modal state
  const [editModal, setEditModal] = useState(null); // { lead, type }
  const [editStatus, setEditStatus] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Fetch available centers once
  useEffect(() => {
    getLeadCenters()
      .then(res => setCenters(res.data.data || ['ALL']))
      .catch(() => setCenters(['ALL']));
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { center: selectedCenter, search, sort };
      const res = activeTab === 'call'
        ? await getCallLeads(params)
        : await getBookingLeads(params);
      setLeads(res.data.data || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCenter, search, sort]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch('');
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    return ts;
  };

  const getStatusBadge = (status) => {
    const s = (status || 'New').toLowerCase();
    if (s === 'new') return <span className="lead-badge lead-badge-new">New</span>;
    if (s === 'contacted') return <span className="lead-badge lead-badge-contacted">Contacted</span>;
    if (s === 'booked') return <span className="lead-badge lead-badge-booked">Booked</span>;
    if (s === 'not interested') return <span className="lead-badge lead-badge-lost">Not Interested</span>;
    return <span className="lead-badge lead-badge-default">{status}</span>;
  };

  const openEditModal = (lead) => {
    setEditModal({ lead, type: activeTab });
    setEditStatus(lead.status || 'New');
    setEditFeedback(lead.feedback || '');
    setEditError('');
  };

  const closeEditModal = () => {
    setEditModal(null);
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    setEditError('');
    try {
      await updateLead(editModal.type, editModal.lead.rowIndex, {
        status: editStatus,
        feedback: editFeedback,
      });
      // Update local state so table reflects change immediately
      setLeads(prev => prev.map(l =>
        l.rowIndex === editModal.lead.rowIndex
          ? { ...l, status: editStatus, feedback: editFeedback }
          : l
      ));
      closeEditModal();
    } catch (err) {
      setEditError('Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">

          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Website Leads</h1>
              <p className="page-subtitle">
                Leads submitted through your website booking & consultation forms
              </p>
            </div>
            <button className="refresh-btn" onClick={fetchLeads} disabled={loading}>
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="leads-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`leads-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="leads-filters">
            <div className="leads-filter-group">
              <label>Wellness Center</label>
              <select
                className="leads-select"
                value={selectedCenter}
                onChange={e => setSelectedCenter(e.target.value)}
              >
                {centers.map(c => (
                  <option key={c} value={c}>{c === 'ALL' ? 'All Centers' : c}</option>
                ))}
              </select>
            </div>

            <div className="leads-filter-group">
              <label>Search</label>
              <div className="leads-search-wrapper">
                <FiSearch size={14} className="leads-search-icon" />
                <input
                  className="leads-search"
                  type="text"
                  placeholder="Name, email, phone, treatment…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="leads-filter-group">
              <label>Sort by</label>
              <select
                className="leads-select"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {lastRefresh && (
              <div className="leads-refresh-time">
                Updated {lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Content */}
          {error && <div className="leads-error-banner">{error}</div>}

          {loading ? (
            <Loader />
          ) : leads.length === 0 ? (
            <div className="leads-empty">
              <FiMessageSquare size={40} />
              <p>No {activeTab === 'call' ? 'consultancy call' : 'direct booking'} leads found</p>
              <span>
                {selectedCenter !== 'ALL' ? `for ${selectedCenter} ` : ''}
                {search ? `matching "${search}"` : ''}
              </span>
            </div>
          ) : (
            <div className="leads-table-wrapper">
              <div className="leads-count">
                <strong>{leads.length}</strong> lead{leads.length !== 1 ? 's' : ''} found
              </div>
              <div className="table-responsive">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><FiCalendar size={12} /> Submitted</th>
                      <th>Wellness Center</th>
                      <th><FiUser size={12} /> Full Name</th>
                      <th><FiMail size={12} /> Email</th>
                      <th><FiPhone size={12} /> Phone</th>
                      <th>Treatment</th>
                      {activeTab === 'call' && <th><FiMessageSquare size={12} /> Message</th>}
                      {activeTab === 'booking' && <th>Age</th>}
                      {activeTab === 'booking' && <th><FiCalendar size={12} /> Schedule</th>}
                      {activeTab === 'booking' && <th>Payment Method</th>}
                      <th>Status</th>
                      <th>Feedback</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, idx) => (
                      <tr key={lead.rowIndex || idx}>
                        <td className="leads-row-num">{idx + 1}</td>
                        <td className="leads-timestamp">{formatTimestamp(lead.timestamp)}</td>
                        <td>
                          <span className="leads-center-badge">{lead.center || '—'}</span>
                        </td>
                        <td className="leads-name">{lead.fullname || '—'}</td>
                        <td>
                          <a href={`mailto:${lead.email}`} className="leads-link">
                            {lead.email || '—'}
                          </a>
                        </td>
                        <td>
                          <a href={`tel:${lead.phone}`} className="leads-link">
                            {lead.phone || '—'}
                          </a>
                        </td>
                        <td>{lead.treatment || '—'}</td>
                        {activeTab === 'call' && (
                          <td className="leads-message">
                            <span title={lead.message}>
                              {lead.message
                                ? lead.message.length > 60
                                  ? lead.message.substring(0, 60) + '…'
                                  : lead.message
                                : '—'}
                            </span>
                          </td>
                        )}
                        {activeTab === 'booking' && <td>{lead.age || '—'}</td>}
                        {activeTab === 'booking' && <td>{lead.schedule || '—'}</td>}
                        {activeTab === 'booking' && <td>{lead.paymentMethod || '—'}</td>}
                        <td>{getStatusBadge(lead.status)}</td>
                        <td className="leads-feedback-cell">
                          {lead.feedback
                            ? <span title={lead.feedback}>
                                {lead.feedback.length > 50 ? lead.feedback.substring(0, 50) + '…' : lead.feedback}
                              </span>
                            : <span className="leads-feedback-empty">—</span>}
                        </td>
                        <td>
                          <button
                            className="lead-edit-btn"
                            title="Edit status & feedback"
                            onClick={() => openEditModal(lead)}
                          >
                            <FiEdit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API Usage hint for developers */}
          <div className="leads-api-hint">
            <strong>Website Integration</strong>
            <span>
              Consultancy Call:&nbsp;
              <code>POST /api/leads?type=call&amp;center=YOUR_CENTER</code>
              &nbsp;·&nbsp;
              Direct Booking:&nbsp;
              <code>POST /api/leads?type=booking&amp;center=YOUR_CENTER</code>
            </span>
          </div>

        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="lead-modal-overlay" onClick={closeEditModal}>
          <div className="lead-modal" onClick={e => e.stopPropagation()}>
            <div className="lead-modal-header">
              <div>
                <h3>Edit Lead</h3>
                <p className="lead-modal-name">{editModal.lead.fullname} · {editModal.lead.center}</p>
              </div>
              <button className="lead-modal-close" onClick={closeEditModal}>
                <FiX size={18} />
              </button>
            </div>

            <div className="lead-modal-body">
              <label className="lead-modal-label">Status</label>
              <select
                className="lead-modal-select"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Booked">Booked</option>
                <option value="Not Interested">Not Interested</option>
              </select>

              <label className="lead-modal-label" style={{ marginTop: 14 }}>
                Feedback / Notes
              </label>
              <textarea
                className="lead-modal-textarea"
                placeholder="What happened when you contacted them? Add any notes here…"
                value={editFeedback}
                onChange={e => setEditFeedback(e.target.value)}
                rows={4}
              />

              {editError && <div className="lead-modal-error">{editError}</div>}
            </div>

            <div className="lead-modal-footer">
              <button className="lead-modal-cancel" onClick={closeEditModal} disabled={editSaving}>
                Cancel
              </button>
              <button className="lead-modal-save" onClick={saveEdit} disabled={editSaving}>
                <FiCheck size={14} />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WebsiteLeads;
