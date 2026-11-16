import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getPackages, getPackageStats, getPackage, createPackage, updatePackage,
  markSessionDone, scheduleSession, sessionNoShow, remindSession, addPackageLog,
  getBookingById,
} from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { useConfig } from '../hooks/useConfig';
import {
  FiPlus, FiRefreshCw, FiSearch, FiChevronDown, FiChevronUp, FiX, FiCheck,
  FiPhone, FiMail, FiCalendar, FiAlertTriangle, FiClock, FiPhoneCall,
} from 'react-icons/fi';
import './SessionTracker.css';

const PKG_STATUSES = ['Active', 'Completed', 'Paused', 'Cancelled', 'Expired'];
const OUTCOMES = ['Answered', 'No answer', 'Confirmed', 'Rescheduled', 'Not interested', 'Other'];

const phToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d.slice(0, 10) : d;
  const dt = new Date(`${s}T00:00:00`);
  return isNaN(dt) ? s : dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);

const EMPTY_FORM = {
  firstName: '', lastName: '', phone: '', email: '', branch: '', treatment: '',
  totalSessions: 6, gapDays: 14, priceTotal: '', startDate: phToday(), startTime: '', notes: '', sourceBookingId: '',
};

export default function SessionTracker() {
  const { options: cfg } = useConfig();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const isAdmin = user?.role === 'Admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const [stats, setStats] = useState(null);
  const [packages, setPackages] = useState([]);
  const [today, setToday] = useState(phToday());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All');
  const [treatment, setTreatment] = useState('All');
  const [pkgStatus, setPkgStatus] = useState('Active');
  const [due, setDue] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Expanded drawer
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Schedule mini-modal
  const [schedModal, setSchedModal] = useState(null); // { sessionId, date, time }

  // Log call form (inside drawer)
  const [logOutcome, setLogOutcome] = useState('Answered');
  const [logNotes, setLogNotes] = useState('');

  // Existing packages for the phone typed in the create form (duplicate guard)
  const [phoneHint, setPhoneHint] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { search, branch, treatment, status: pkgStatus, due, from: fromDate, to: toDate };
      const [pRes, sRes] = await Promise.all([getPackages(params), getPackageStats()]);
      setPackages(pRes.data.packages || []);
      setToday(pRes.data.today || phToday());
      setStats(sRes.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [search, branch, treatment, pkgStatus, due, fromDate, toDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // "Create package" from Master Bookings: ?fromBooking=BK-… prefills the form
  useEffect(() => {
    const rid = searchParams.get('fromBooking');
    if (!rid) return;
    (async () => {
      try {
        const res = await getBookingById(rid);
        const b = res.data.booking;
        setForm(f => ({
          ...f,
          firstName: b.firstName || '', lastName: b.lastName || '',
          phone: b.phone || '', email: b.email || '',
          branch: b.branch || '', treatment: b.treatment || '',
          priceTotal: b.totalPrice || '', sourceBookingId: rid,
          startDate: b.date && b.date >= phToday() ? b.date : phToday(),
          startTime: '',
        }));
        setShowCreate(true);
      } catch { /* booking not found — open blank form */ setShowCreate(true); }
      setSearchParams({}, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDrawer = async (id) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id); setDetail(null); setDetailLoading(true);
    setLogOutcome('Answered'); setLogNotes('');
    try {
      const res = await getPackage(id);
      setDetail(res.data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const refreshDrawer = async (id) => {
    try { const res = await getPackage(id); setDetail(res.data); } catch { /* keep old */ }
    fetchAll();
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showToast(okMsg);
      await refreshDrawer(expandedId);
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed');
    } finally { setBusy(false); }
  };

  const handleDone = (sid) => act(() => markSessionDone(expandedId, sid), 'Session marked done — next visit re-anchored');
  const handleNoShow = (sid) => act(() => sessionNoShow(expandedId, sid), 'Marked no-show — added to the call list');
  const handleRemind = (sid, channel) => act(() => remindSession(expandedId, sid, channel), null);
  const handleSchedule = async () => {
    if (!schedModal?.date) return;
    const { sessionId, date, time } = schedModal;
    setSchedModal(null);
    await act(() => scheduleSession(expandedId, sessionId, { date, time }), 'Appointment set — reminders scheduled');
  };
  const handleLog = (sessionId) => act(
    () => addPackageLog(expandedId, { sessionId: sessionId || null, channel: 'call', outcome: logOutcome, notes: logNotes }),
    'Call logged'
  ).then(() => setLogNotes(''));
  const handlePkgStatus = (status) => act(() => updatePackage(expandedId, { status }), `Package ${status.toLowerCase()}`);
  const handleOptOut = (optOut) => act(() => updatePackage(expandedId, { optOut }), optOut ? 'Reminders muted for this customer' : 'Reminders enabled');

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true); setCreateError('');
    try {
      const payload = {
        ...form,
        totalSessions: Number(form.totalSessions),
        gapDays: Number(form.gapDays),
        priceTotal: form.priceTotal === '' ? null : Number(form.priceTotal),
        sourceBookingId: form.sourceBookingId || null,
      };
      await createPackage(payload);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setPhoneHint([]);
      showToast('Package created — sessions scheduled');
      fetchAll();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create package');
    } finally { setCreating(false); }
  };

  const fChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // When a phone is entered, surface the packages this customer already owns
  const checkPhone = async () => {
    const digits = (form.phone || '').replace(/\D/g, '');
    if (digits.length < 7) { setPhoneHint([]); return; }
    try {
      const res = await getPackages({ search: digits, status: 'All' });
      setPhoneHint(res.data.packages || []);
    } catch { setPhoneHint([]); }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const nextBadge = (p) => {
    if (!p.nextDate) return <span className="st-pill st-pill-muted">—</span>;
    const diff = daysBetween(today, p.nextDate.slice(0, 10));
    if (p.nextStatus === 'No Show') return <span className="st-pill st-pill-warn">No show</span>;
    if (diff < 0)  return <span className="st-pill st-pill-danger">{-diff}d overdue</span>;
    if (diff === 0) return <span className="st-pill st-pill-today">Today</span>;
    return <span className="st-pill st-pill-ok">in {diff}d</span>;
  };

  const sessionPill = (s) => {
    const cls = { Done: 'st-pill-done', Scheduled: 'st-pill-ok', Upcoming: 'st-pill-muted', 'No Show': 'st-pill-warn', Cancelled: 'st-pill-muted' }[s.status] || 'st-pill-muted';
    return <span className={`st-pill ${cls}`}>{s.status}</span>;
  };

  const kpi = (label, value, filterKey, cls = '') => (
    <button
      className={`st-kpi ${cls}${due === filterKey && filterKey ? ' active' : ''}`}
      onClick={() => filterKey !== undefined && setDue(d => d === filterKey ? '' : filterKey)}
    >
      <b>{value ?? '—'}</b><span>{label}</span>
    </button>
  );

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container st-page">

          <div className="page-header">
            <div>
              <h1 className="page-title">Session Tracker</h1>
              <p className="page-subtitle">Multi-session packages — schedule, remind, and bring customers back</p>
            </div>
            <div className="st-header-actions">
              <button className="refresh-btn" onClick={fetchAll} disabled={loading}>
                <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </button>
              <button className="st-new-btn" onClick={() => { setForm(EMPTY_FORM); setCreateError(''); setShowCreate(true); }}>
                <FiPlus size={15} /> New package
              </button>
            </div>
          </div>

          {/* KPI strip — click to filter */}
          <div className="st-kpis">
            {kpi('Due today', stats?.dueToday, 'today', 'k-today')}
            {kpi('Overdue', stats?.overdue, 'overdue', 'k-overdue')}
            {kpi('Needs a call', stats?.needsCall, 'needs-call', 'k-call')}
            {kpi('Active packages', stats?.active, '', 'k-active')}
            {kpi('Completed this month', stats?.completedThisMonth, undefined, 'k-done')}
          </div>

          {/* Filters */}
          <div className="st-filters">
            <div className="st-search">
              <FiSearch size={14} />
              <input placeholder="Search name, phone, package code…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={branch} onChange={e => setBranch(e.target.value)}>
              <option value="All">All branches</option>
              {cfg.branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={treatment} onChange={e => setTreatment(e.target.value)}>
              <option value="All">All treatments</option>
              {cfg.treatments.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={pkgStatus} onChange={e => setPkgStatus(e.target.value)}>
              {PKG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="All">All statuses</option>
            </select>
            <div className="st-range">
              <label>Next visit</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <span>→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              {(fromDate || toDate || due) && (
                <button className="st-clear" onClick={() => { setFromDate(''); setToDate(''); setDue(''); }}>Clear</button>
              )}
            </div>
          </div>

          {error && <div className="leads-error-banner">{error}</div>}

          {loading ? <Loader message="Loading packages…" /> : packages.length === 0 ? (
            <div className="leads-empty">
              <FiClock size={40} />
              <p>No packages found</p>
              <span>Create one from a sale in Master Bookings, or with “New package”.</span>
            </div>
          ) : (
            <div className="st-table-wrap">
              <table className="bookings-table st-table">
                <thead>
                  <tr>
                    <th>Customer</th><th>Treatment</th><th>Branch</th><th>Progress</th>
                    <th>Next session</th><th>When</th><th>Status</th><th>Last contact</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(p => (
                    <React.Fragment key={p.id}>
                      <tr className={`st-row${expandedId === p.id ? ' st-row-open' : ''}${p.needsCall ? ' st-row-call' : ''}`} onClick={() => openDrawer(p.id)}>
                        <td>
                          <strong>{p.firstName} {p.lastName}</strong>
                          <div className="st-sub">
                            {p.phone && <span><FiPhone size={10} /> {p.phone}</span>}
                            {p.needsCall && <span className="st-pill st-pill-warn st-pill-xs"><FiPhoneCall size={9} /> call</span>}
                          </div>
                        </td>
                        <td>{p.treatment}</td>
                        <td>{p.branch}</td>
                        <td>
                          <div className="st-progress">
                            <span>{p.doneCount} / {p.totalSessions}</span>
                            <div className="st-bar"><div style={{ width: `${(p.doneCount / p.totalSessions) * 100}%` }} /></div>
                          </div>
                        </td>
                        <td>
                          {p.nextDate ? <>#{p.nextSessionNo} · {fmtDate(p.nextDate)}{p.nextTime ? ` · ${p.nextTime}` : ''}</> : '—'}
                        </td>
                        <td>{nextBadge(p)}</td>
                        <td><span className={`st-pill st-pkg-${p.status.toLowerCase()}`}>{p.status}</span></td>
                        <td className="st-muted">{p.lastContact ? new Date(p.lastContact).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'never'}</td>
                        <td>{expandedId === p.id ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}</td>
                      </tr>

                      {expandedId === p.id && (
                        <tr className="st-drawer-row">
                          <td colSpan={9}>
                            {detailLoading || !detail ? (
                              <div className="st-drawer-msg">Loading package…</div>
                            ) : (
                              <div className="st-drawer">
                                <div className="st-drawer-grid">
                                  {/* Sessions timeline */}
                                  <div className="st-sessions">
                                    <h4>Sessions · gap {detail.package.gapDays} days · {detail.package.packageCode}</h4>
                                    {detail.sessions.map(s => (
                                      <div key={s.id} className={`st-session${s.status === 'Done' ? ' done' : ''}`}>
                                        <span className="st-session-no">#{s.sessionNo}</span>
                                        <span className="st-session-date">
                                          {fmtDate(s.scheduledDate)}{s.scheduledTime ? ` · ${s.scheduledTime}` : ''}
                                        </span>
                                        {sessionPill(s)}
                                        {detail.package.status === 'Active' && s.status !== 'Done' && s.status !== 'Cancelled' && (
                                          <span className="st-session-actions">
                                            <button disabled={busy} onClick={() => handleDone(s.id)} title="Mark this visit done"><FiCheck size={12} /> Done</button>
                                            <button disabled={busy} onClick={() => setSchedModal({ sessionId: s.id, date: s.scheduledDate ? String(s.scheduledDate).slice(0, 10) : today, time: s.scheduledTime || '' })}>
                                              <FiCalendar size={12} /> {s.status === 'Scheduled' ? 'Move' : 'Set date'}
                                            </button>
                                            {s.status === 'Scheduled' && (
                                              <button disabled={busy} className="warn" onClick={() => handleNoShow(s.id)}><FiAlertTriangle size={12} /> No show</button>
                                            )}
                                            {detail.package.phone && (
                                              <button disabled={busy} onClick={() => handleRemind(s.id, 'sms')} title="Send SMS now (needs provider)"><FiPhone size={12} /> SMS</button>
                                            )}
                                            {detail.package.email && (
                                              <button disabled={busy} onClick={() => handleRemind(s.id, 'email')} title="Send email now (needs provider)"><FiMail size={12} /> Email</button>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Contact log + package controls */}
                                  <div className="st-side">
                                    {detail.otherPackages?.length > 0 && (
                                      <>
                                        <h4>Same customer · {detail.otherPackages.length} more package{detail.otherPackages.length !== 1 ? 's' : ''}</h4>
                                        <div className="st-others">
                                          {detail.otherPackages.map(o => (
                                            <button key={o.id} className="st-other" onClick={() => openDrawer(o.id)} title={o.packageCode}>
                                              <strong>{o.treatment}</strong>
                                              <span>{o.doneCount}/{o.totalSessions}</span>
                                              <span className={`st-pill st-pill-xs st-pkg-${o.status.toLowerCase()}`}>{o.status}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    <h4>Log a call</h4>
                                    <div className="st-logform">
                                      <select value={logOutcome} onChange={e => setLogOutcome(e.target.value)}>
                                        {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                      <input placeholder="Notes (optional)" value={logNotes} onChange={e => setLogNotes(e.target.value)} />
                                      <button disabled={busy} onClick={() => handleLog(detail.package.status === 'Active' ? (packages.find(x => x.id === expandedId)?.nextSessionId || null) : null)}>
                                        <FiPhoneCall size={12} /> Log
                                      </button>
                                    </div>

                                    <h4>History</h4>
                                    <div className="st-logs">
                                      {detail.contactLogs.length === 0 && <div className="st-muted">No contact logged yet.</div>}
                                      {detail.contactLogs.map(l => (
                                        <div key={l.id} className="st-log">
                                          <span className={`st-pill st-pill-xs ${l.outcome === 'Confirmed' || l.outcome === 'Answered' ? 'st-pill-ok' : 'st-pill-muted'}`}>{l.outcome}</span>
                                          <span>{l.notes || l.channel}</span>
                                          <span className="st-muted">{new Date(l.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {l.loggedByName || '—'}</span>
                                        </div>
                                      ))}
                                    </div>

                                    <h4>Package</h4>
                                    <div className="st-pkg-actions">
                                      <label className="st-check">
                                        <input type="checkbox" checked={!!detail.package.optOut} onChange={e => handleOptOut(e.target.checked)} disabled={busy} />
                                        Mute SMS/email reminders
                                      </label>
                                      {isAdmin && detail.package.status === 'Active' && (
                                        <>
                                          <button disabled={busy} onClick={() => handlePkgStatus('Paused')}>Pause</button>
                                          <button disabled={busy} className="danger" onClick={() => window.confirm('Cancel this package? Remaining sessions stop being tracked.') && handlePkgStatus('Cancelled')}>Cancel package</button>
                                        </>
                                      )}
                                      {isAdmin && detail.package.status === 'Paused' && (
                                        <button disabled={busy} onClick={() => handlePkgStatus('Active')}>Resume</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {toast && <div className="st-toast">{toast}</div>}
        </div>
      </div>

      {/* ── New package modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content st-modal" onClick={e => e.stopPropagation()}>
            <div className="st-modal-head">
              <h3>New treatment package</h3>
              <button onClick={() => setShowCreate(false)}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="st-form">
              {form.sourceBookingId && <div className="st-note">Linked to sale booking <code>{form.sourceBookingId}</code></div>}
              {phoneHint.length > 0 && (
                <div className="st-note st-note-warn">
                  This phone already has {phoneHint.length} package{phoneHint.length !== 1 ? 's' : ''}:{' '}
                  {phoneHint.map(p => `${p.treatment} (${p.doneCount}/${p.totalSessions}, ${p.status})`).join(' · ')}.
                  Creating another one is fine — each package keeps its own session numbers.
                </div>
              )}
              <div className="st-form-grid">
                <label>First name *<input name="firstName" value={form.firstName} onChange={fChange} required /></label>
                <label>Last name<input name="lastName" value={form.lastName} onChange={fChange} /></label>
                <label>Phone<input name="phone" value={form.phone} onChange={fChange} onBlur={checkPhone} placeholder="09xx…" /></label>
                <label>Email<input name="email" value={form.email} onChange={fChange} type="email" /></label>
                <label>Branch *
                  <select name="branch" value={form.branch} onChange={fChange} required>
                    <option value="">Select…</option>
                    {cfg.branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label>Treatment *
                  <select name="treatment" value={form.treatment} onChange={fChange} required>
                    <option value="">Select…</option>
                    {cfg.treatments.map(t => <option key={t} value={t}>{t}</option>)}
                    {form.treatment && !cfg.treatments.includes(form.treatment) && <option value={form.treatment}>{form.treatment}</option>}
                  </select>
                </label>
                <label>Total sessions *<input name="totalSessions" type="number" min="1" max="100" value={form.totalSessions} onChange={fChange} onWheel={e => e.currentTarget.blur()} required /></label>
                <label>Gap between sessions (days) *<input name="gapDays" type="number" min="1" max="365" value={form.gapDays} onChange={fChange} onWheel={e => e.currentTarget.blur()} required /></label>
                <label>First session date *<input name="startDate" type="date" value={form.startDate} onChange={fChange} required /></label>
                <label>First session time<input name="startTime" value={form.startTime} onChange={fChange} placeholder="e.g. 2:00 PM" /></label>
                <label>Package price (₱)<input name="priceTotal" type="number" min="0" step="any" value={form.priceTotal} onChange={fChange} onWheel={e => e.currentTarget.blur()} /></label>
              </div>
              <label className="st-full">Notes<textarea name="notes" rows={2} value={form.notes} onChange={fChange} /></label>
              {createError && <div className="lead-modal-error">{createError}</div>}
              <div className="st-modal-foot">
                <button type="button" className="st-btn-ghost" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="st-new-btn" disabled={creating}>
                  {creating ? 'Creating…' : `Create package (${form.totalSessions || 0} sessions)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Set appointment modal ── */}
      {schedModal && (
        <div className="modal-overlay" onClick={() => setSchedModal(null)}>
          <div className="modal-content st-modal st-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="st-modal-head">
              <h3>Set appointment</h3>
              <button onClick={() => setSchedModal(null)}><FiX size={18} /></button>
            </div>
            <div className="st-form">
              <div className="st-form-grid">
                <label>Date *<input type="date" value={schedModal.date} onChange={e => setSchedModal(m => ({ ...m, date: e.target.value }))} /></label>
                <label>Time<input value={schedModal.time} onChange={e => setSchedModal(m => ({ ...m, time: e.target.value }))} placeholder="e.g. 2:00 PM" /></label>
              </div>
              <p className="st-muted" style={{ fontSize: '0.8rem' }}>Reminders are scheduled 3 days and 1 day before, and a call task lands in “Needs a call”.</p>
              <div className="st-modal-foot">
                <button className="st-btn-ghost" onClick={() => setSchedModal(null)}>Cancel</button>
                <button className="st-new-btn" disabled={!schedModal.date || busy} onClick={handleSchedule}>Save appointment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
