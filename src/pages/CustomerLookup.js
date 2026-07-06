import React, { useState } from 'react';
import { FiSearch, FiUser, FiCalendar, FiDollarSign, FiRepeat, FiAlertTriangle } from 'react-icons/fi';
import { getCustomerHistory } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import './CustomerLookup.css';

const STATUS_COMPLETED = new Set(['arrived & bought', 'comeback & bought', 'arrived not potential']);

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'scheduled')              return 'status-badge status-scheduled';
  if (s === 'arrived & bought')       return 'status-badge status-arrived-bought';
  if (s === 'comeback & bought')      return 'status-badge status-comeback-bought';
  if (s === 'arrived not potential')  return 'status-badge status-arrived-not-potential';
  if (s.includes('cancel'))           return 'status-badge status-cancelled';
  if (s === 'promo hunter')           return 'status-badge status-promo-hunter';
  if (s === 'comeback')               return 'status-badge status-comeback';
  return 'status-badge';
}

function CustomerLookup() {
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [result, setResult]       = useState(null); // { customer, bookings }
  const [searched, setSearched]   = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || q.length < 3) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(false);
    try {
      const res = await getCustomerHistory(q);
      setResult(res.data);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const { customer, bookings = [] } = result || {};

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="page-header">
            <h2>Customer Lookup</h2>
            <p className="page-subtitle">Search by phone number, email, social media handle, or name</p>
          </div>

          <form onSubmit={handleSearch} className="lookup-search-bar">
            <div className="lookup-input-wrap">
              <FiSearch className="lookup-search-icon" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="09171234567  ·  name@email.com  ·  @handle  ·  Juan dela Cruz"
                className="lookup-input"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || query.trim().length < 3}>
              Search
            </button>
          </form>

          {error && <div className="alert alert-error">{error}</div>}

          {loading && <Loader message="Searching..." />}

          {searched && !loading && !customer && (
            <div className="lookup-empty">
              <FiUser size={48} />
              <p>No bookings found for <strong>{query}</strong></p>
              <p className="muted">Try a phone number, email, or full name.</p>
            </div>
          )}

          {customer && (
            <>
              <div className="customer-card">
                <div className="customer-card-header">
                  <div className="customer-avatar-lg">
                    {(customer.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="customer-card-info">
                    <h3>{customer.name || '—'}</h3>
                    <div className="customer-meta">
                      {customer.phone && <span>{customer.phone}</span>}
                      {customer.email && <span>{customer.email}</span>}
                      {customer.socialMedia && <span>{customer.socialMedia}</span>}
                      {customer.gender && <span>{customer.gender}</span>}
                    </div>
                    <div className="customer-branches">
                      {customer.branches.map(b => <span key={b} className="branch-tag">{b}</span>)}
                    </div>
                  </div>
                  {customer.isRepeat && (
                    <span className="repeat-badge"><FiRepeat size={12} /> Repeat Customer</span>
                  )}
                </div>

                <div className="customer-stats">
                  <div className="stat-box">
                    <FiCalendar />
                    <div className="stat-value">{customer.totalBookings}</div>
                    <div className="stat-label">Total Bookings</div>
                  </div>
                  <div className="stat-box">
                    <FiDollarSign />
                    <div className="stat-value">₱{customer.totalSpend.toLocaleString()}</div>
                    <div className="stat-label">Total Spend</div>
                  </div>
                  <div className="stat-box">
                    <FiDollarSign />
                    <div className="stat-value">₱{customer.avgSpend.toLocaleString()}</div>
                    <div className="stat-label">Avg. per Visit</div>
                  </div>
                  <div className="stat-box">
                    <FiCalendar />
                    <div className="stat-value">{customer.completedBookings}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-box">
                    <FiCalendar />
                    <div className="stat-value">{customer.firstVisit || '—'}</div>
                    <div className="stat-label">First Visit</div>
                  </div>
                  <div className="stat-box">
                    <FiCalendar />
                    <div className="stat-value">{customer.lastVisit || '—'}</div>
                    <div className="stat-label">Last Visit</div>
                  </div>
                </div>
              </div>

              <h4 className="booking-history-title">Booking History ({bookings.length})</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Treatment</th>
                      <th>Price</th>
                      <th>Agent</th>
                      <th>Remarks</th>
                      {bookings.some(b => b.followUpDate) && <th>Follow-up</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.recordId} className={STATUS_COMPLETED.has((b.status || '').toLowerCase()) ? 'row-completed' : ''}>
                        <td>{b.date || '—'}</td>
                        <td>{b.branch}</td>
                        <td><span className={getStatusClass(b.status)}>{b.status}</span></td>
                        <td>{b.treatment}</td>
                        <td>₱{(b.totalPrice || 0).toLocaleString()}</td>
                        <td>{b.agent}</td>
                        <td className="remarks-cell">{b.remarks || ''}</td>
                        {bookings.some(bk => bk.followUpDate) && <td>{b.followUpDate || ''}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bookings.some(b => b.purchaseDetails) && (
                <div className="purchase-section">
                  <h4>Purchase Details</h4>
                  {bookings.filter(b => b.purchaseDetails).map(b => (
                    <div key={b.recordId} className="purchase-item">
                      <span className="purchase-date">{b.date}</span>
                      <p>{b.purchaseDetails}</p>
                    </div>
                  ))}
                </div>
              )}

              {customer.totalBookings > 1 && !customer.isRepeat && (
                <div className="alert alert-info" style={{ marginTop: '16px' }}>
                  <FiAlertTriangle /> This customer has multiple bookings under different contact details.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default CustomerLookup;
