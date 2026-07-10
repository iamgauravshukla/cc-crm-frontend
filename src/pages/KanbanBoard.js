import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiColumns, FiChevronLeft, FiChevronRight, FiStar, FiAlertTriangle, FiClock } from 'react-icons/fi';
import { getKanbanBookings, updateBooking } from '../services/api';
import { useConfig } from '../hooks/useConfig';
import Sidebar from '../components/Sidebar';
import './KanbanBoard.css';

const STATUS_COLORS = {
  'scheduled':             '#2563eb',
  'arrived & bought':      '#10b981',
  'arrived not potential': '#f59e0b',
  'comeback':              '#8b5cf6',
  'cancelled':             '#ef4444',
  'no show':               '#f97316',
  'promo hunter':          '#ec4899',
  'arrived in':            '#06b6d4',
};

function statusColor(s) {
  return STATUS_COLORS[(s || '').toLowerCase()] || '#64748b';
}

function parseMinutes(t) {
  if (!t) return Infinity;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return Infinity;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + mn;
}

export default function KanbanBoard() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

  const [date, setDate]         = useState(today);
  const [branch, setBranch]     = useState('All');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [draggedId, setDraggedId]   = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [updating, setUpdating]     = useState({});

  const { options: cfgOptions } = useConfig();
  const branches = ['All', ...cfgOptions.branches];
  const statuses = React.useMemo(() => cfgOptions.statuses || [], [cfgOptions.statuses]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await getKanbanBookings({ date, branch: branch === 'All' ? '' : branch });
      setBookings(r.data.bookings || []);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [date, branch]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // Build columns: configured statuses first, then any extra found in data
  const columns = React.useMemo(() => {
    const configSet = new Set(statuses.map(s => s.toLowerCase()));
    const extras = [...new Set(
      bookings.map(b => b.status).filter(s => s && !configSet.has(s.toLowerCase()))
    )];
    return [...statuses, ...extras].map(s => ({
      status: s,
      color:  statusColor(s),
      cards:  bookings
        .filter(b => (b.status || '').toLowerCase() === s.toLowerCase())
        .map(b => ({ ...b, status: s }))
        .sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time)),
    }));
  }, [statuses, bookings]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedId) return;
    const booking = bookings.find(b => b.recordId === draggedId);
    if (!booking || booking.status === targetStatus) { setDraggedId(null); return; }

    setBookings(prev => prev.map(b => b.recordId === draggedId ? { ...b, status: targetStatus } : b));
    setUpdating(prev => ({ ...prev, [draggedId]: true }));
    setDraggedId(null);

    try {
      await updateBooking(booking.recordId, { status: targetStatus });
    } catch {
      setBookings(prev => prev.map(b => b.recordId === booking.recordId ? { ...b, status: booking.status } : b));
    } finally {
      setUpdating(prev => { const n = { ...prev }; delete n[booking.recordId]; return n; });
    }
  };

  const handleDragEnd = () => { setDraggedId(null); setDropTarget(null); };

  // ── Quick status select ───────────────────────────────────────────────────
  const handleQuickStatus = async (bookingId, newStatus, oldStatus) => {
    if (newStatus === oldStatus) return;
    setBookings(prev => prev.map(b => b.recordId === bookingId ? { ...b, status: newStatus } : b));
    setUpdating(prev => ({ ...prev, [bookingId]: true }));
    try {
      await updateBooking(bookingId, { status: newStatus });
    } catch {
      setBookings(prev => prev.map(b => b.recordId === bookingId ? { ...b, status: oldStatus } : b));
    } finally {
      setUpdating(prev => { const n = { ...prev }; delete n[bookingId]; return n; });
    }
  };

  const shiftDate = delta => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const totalCount = bookings.length;

  return (
    <div className="kanban-container">
      <Sidebar />
      <div className="kanban-main">

        {/* ── Header ── */}
        <div className="kanban-header">
          <div className="kanban-header-left">
            <FiColumns size={20} className="kanban-header-icon" />
            <div>
              <h1 className="kanban-title">Kanban Board</h1>
              <p className="kanban-subtitle">
                {totalCount} booking{totalCount !== 1 ? 's' : ''} · drag cards to change status
              </p>
            </div>
          </div>

          <div className="kanban-controls">
            <div className="kanban-date-nav">
              <button className="kanban-nav-btn" onClick={() => shiftDate(-1)} title="Previous day">
                <FiChevronLeft size={15} />
              </button>
              <input
                type="date"
                className="kanban-date-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <button className="kanban-nav-btn" onClick={() => shiftDate(1)} title="Next day">
                <FiChevronRight size={15} />
              </button>
            </div>

            <select
              className="kanban-branch-select"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <button
              className="kanban-refresh-btn"
              onClick={loadBookings}
              disabled={loading}
              title="Refresh"
            >
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="kanban-error">
            <FiAlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ── Board ── */}
        <div className="kanban-board">
          {columns.map(col => (
            <div
              key={col.status}
              className={`kanban-col${dropTarget === col.status ? ' drop-target' : ''}`}
              onDragOver={e => handleDragOver(e, col.status)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => handleDrop(e, col.status)}
            >
              {/* Column header */}
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <span className="kanban-col-title" style={{ color: col.color }}>
                  {col.status}
                </span>
                <span className="kanban-col-count" style={{ background: col.color }}>
                  {col.cards.length}
                </span>
              </div>

              {/* Scrollable cards area */}
              <div className="kanban-cards-wrap">
                <div className="kanban-cards">
                  {col.cards.length === 0 ? (
                    <div className="kanban-empty-col">Drop here</div>
                  ) : (
                    col.cards.map(card => (
                      <div
                        key={card.recordId}
                        className={[
                          'kanban-card',
                          draggedId === card.recordId ? 'dragging' : '',
                          updating[card.recordId]     ? 'updating' : '',
                        ].filter(Boolean).join(' ')}
                        draggable
                        onDragStart={e => handleDragStart(e, card.recordId)}
                        onDragEnd={handleDragEnd}
                        style={{ borderLeftColor: col.color }}
                      >
                        {updating[card.recordId] && <div className="card-updating-bar" />}

                        {/* Name + flags */}
                        <div className="card-top">
                          <span className="card-name">
                            {card.firstName} {card.lastName}
                          </span>
                          <span className="card-flags">
                            {card.isOts          && <span className="card-flag ots"   title="OTS">OTS</span>}
                            {card.isHighPriority && <span className="card-flag prio"  title="High Priority"><FiStar size={10} /></span>}
                            {card.doNotCall      && <span className="card-flag dnc"   title="Do Not Call">DNC</span>}
                            {card.isRescheduled  && <span className="card-flag rsch"  title="Rescheduled">RSCH</span>}
                          </span>
                        </div>

                        {/* Treatment */}
                        {card.treatment && (
                          <div className="card-treatment">{card.treatment}</div>
                        )}

                        {/* Time / branch / price pills */}
                        {(card.time || card.branch || card.totalPrice > 0) && (
                          <div className="card-meta">
                            {card.time && (
                              <span className="card-meta-item time">
                                <FiClock size={10} /> {card.time}
                              </span>
                            )}
                            {card.branch && (
                              <span className="card-meta-item branch">{card.branch}</span>
                            )}
                            {card.totalPrice > 0 && (
                              <span className="card-meta-item price">
                                ₱{card.totalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Agent */}
                        {card.agent && (
                          <div className="card-agent">@{card.agent}</div>
                        )}

                        {/* Quick status change */}
                        <div className="card-quick-status">
                          <select
                            value={card.status}
                            onChange={e => handleQuickStatus(card.recordId, e.target.value, card.status)}
                            onClick={e => e.stopPropagation()}
                            className="card-status-select"
                            style={{ '--status-color': col.color, borderColor: col.color }}
                            disabled={!!updating[card.recordId]}
                          >
                            {statuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
