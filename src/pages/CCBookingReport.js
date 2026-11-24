import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import html2canvas from 'html2canvas';
import { FiRefreshCw, FiCamera, FiDownload, FiX, FiAlertCircle, FiChevronDown, FiPhone, FiMail, FiPrinter, FiBarChart2, FiList, FiGrid } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import api, { getCCReportDrilldown } from '../services/api';
import ScrollableTable from '../components/ScrollableTable';
import WidgetFilter, { widgetFiltersToParam, singleFilterToParam, EMPTY_WFILTER } from '../components/WidgetFilter';
import SavedViewsMenu from '../components/SavedViewsMenu';
import { useFilterOptions } from '../hooks/useFilterOptions';
import { branchColor } from '../utils/branchColors';
import './CCBookingReport.css';

const formatNum = (n) => Number(n || 0).toLocaleString();

export default function CCBookingReport() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshAt, setRefreshAt] = useState(new Date());

  // Simple report view (default) vs full chart dashboard
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('ccr-view') || 'simple'; } catch { return 'simple'; }
  });
  const switchView = (v) => { setView(v); try { localStorage.setItem('ccr-view', v); } catch { /* ignore */ } };

  // Snapshot
  const [snapshotMode, setSnapshotMode]   = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [downloading, setDownloading]     = useState(false);
  const cardRefs = useRef({});

  // Drill-down (+ table ↔ card layout; cards by default on narrow screens)
  const [drillDown, setDrillDown]   = useState(null);
  const [ddCards, setDdCards] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760);
  const bookingsCache = useRef({});

  // Simple-view branch modal (client list behind one branch row)
  const [svModal, setSvModal] = useState(null); // { branch, bookings, loading }
  const openBranchModal = async (branch) => {
    setSvModal({ branch, bookings: [], loading: true });
    try {
      let all = bookingsCache.current['sv-today'];
      if (!all) {
        const res = await getCCReportDrilldown('schedules-today', {});
        all = res.data?.bookings || [];
        bookingsCache.current['sv-today'] = all;
      }
      const filtered = all.filter(b => (b.branch || '').toLowerCase() === branch.toLowerCase());
      setSvModal(prev => prev?.branch === branch ? { branch, bookings: filtered, loading: false } : prev);
    } catch {
      setSvModal(prev => prev?.branch === branch ? { branch, bookings: [], loading: false } : prev);
    }
  };

  // Per-widget refine filters, keyed by chartKey (today, tomorrow, payment, next7, ots, arrivals, cancellations)
  const [widgetFilters, setWidgetFilters] = useState({});
  const filterOptions = useFilterOptions();
  const setWidgetFilter = useCallback((key, val) => setWidgetFilters(prev => ({ ...prev, [key]: val })), []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    bookingsCache.current = {};   // filters changed → invalidate drill-down cache
    setDrillDown(null);
    try {
      const res = await api.get('/bookings/cc-report', { params: widgetFiltersToParam(widgetFilters) });
      setData(res.data.data);
      setRefreshAt(new Date());
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [widgetFilters]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Snapshot helpers ─────────────────────────────────────────────────────
  const toggleCard = useCallback((id) => {
    setSelectedCards(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const selectAll = () => setSelectedCards(new Set(Object.keys(cardRefs.current)));
  const clearSel  = () => { setSelectedCards(new Set()); setSnapshotMode(false); };

  const downloadSelected = useCallback(async () => {
    if (!selectedCards.size) return;
    setDownloading(true);
    try {
      for (const id of selectedCards) {
        const el = cardRefs.current[id];
        if (!el) continue;
        const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
        const a = document.createElement('a');
        a.download = `cc-report-${id}-${new Date().toISOString().slice(0,10)}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        await new Promise(r => setTimeout(r, 200));
      }
    } finally { setDownloading(false); }
  }, [selectedCards]);

  // ── Drill-down handler ──────────────────────────────────────────────────
  const handleBarClick = async (chartKey, clickedValue, section, filterType = 'branch') => {
    if (drillDown?.chartKey === chartKey && drillDown?.filterValue === clickedValue) {
      setDrillDown(null); return;
    }
    setDrillDown({ chartKey, filterValue: clickedValue, filterType, bookings: [], loading: true });
    try {
      let all = bookingsCache.current[chartKey];
      if (!all) {
        const res = await getCCReportDrilldown(section, singleFilterToParam(widgetFilters[chartKey]));
        all = res.data?.bookings || [];
        bookingsCache.current[chartKey] = all;
      }
      let filtered;
      if (filterType === 'payMode') {
        const kw = clickedValue.toLowerCase().includes('cash') ? 'cash'
                 : clickedValue.toLowerCase().includes('debit') ? 'debit' : 'credit';
        filtered = all.filter(b => (b.paymentMode || '').toLowerCase().includes(kw));
      } else {
        filtered = all.filter(b => (b.branch || '').toLowerCase() === clickedValue.toLowerCase());
      }
      setDrillDown({ chartKey, filterValue: clickedValue, filterType, bookings: filtered, loading: false });
    } catch {
      setDrillDown({ chartKey, filterValue: clickedValue, filterType, bookings: [], loading: false });
    }
  };

  // ── Chart helpers ────────────────────────────────────────────────────────
  const baseChart = (title) => ({
    chart: { background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    title: { text: title, style: { fontSize: '13px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' } },
    grid: { borderColor: isDark ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    xaxis: { labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' }, rotate: -40 } },
    yaxis: { labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } } },
  });

  const barSeries = (map, label = 'Count') => {
    const sorted = Object.entries(map || {})
      .filter(([,v]) => v.count > 0)
      .sort(([,a],[,b]) => b.count - a.count);
    return {
      series: [{ name: label, data: sorted.map(([,v]) => v.count) }],
      categories: sorted.map(([k]) => k),
      colors: sorted.map(([k], i) => branchColor(k, i)),
    };
  };

  // ── Snap-card wrapper ─────────────────────────────────────────────────────
  const Snap = ({ id, children, className = '' }) => (
    <div
      ref={el => { cardRefs.current[id] = el; }}
      className={`ccr-card ${className}${snapshotMode ? ' snap-selectable' : ''}${selectedCards.has(id) ? ' snap-selected' : ''}`}
      onClick={() => snapshotMode && toggleCard(id)}
    >
      {snapshotMode && (
        <div className="snap-check">{selectedCards.has(id) ? '✓' : ''}</div>
      )}
      {children}
    </div>
  );

  // ── Big-number card — filterEl renders the same per-widget filter as the section's chart
  const BigNum = ({ id, label, total, left, leftLabel, right, rightLabel, color = '#3b82f6', filterEl }) => (
    <Snap id={id} className="ccr-bignum-card">
      {filterEl && <div className="wf-corner">{filterEl}</div>}
      <div className="ccr-bignum-top">{formatNum(total)}</div>
      <div className="ccr-bignum-title">{label}</div>
      <div className="ccr-bignum-split">
        <div className="ccr-split-item" style={{ background: color + '18', borderColor: color + '40' }}>
          <span className="ccr-split-label">{leftLabel}</span>
          <span className="ccr-split-val" style={{ color }}>{formatNum(left)}</span>
        </div>
        <div className="ccr-split-item" style={{ background: '#64748b18', borderColor: '#64748b40' }}>
          <span className="ccr-split-label">{rightLabel}</span>
          <span className="ccr-split-val" style={{ color: isDark ? '#94a3b8' : '#475569' }}>{formatNum(right)}</span>
        </div>
      </div>
    </Snap>
  );

  if (loading) return (
    <><Sidebar /><main className="ccr-container"><Loader message="Generating CC Booking Report…" /></main></>
  );

  if (!data) return null;

  const {
    totalSchedulesToday, totalArrivalsToday, totalSchedulesTomorrow,
    paymentModesTomorrow, paymentModeRevenueTomorrow, totalSchedulesNext7, totalOTS,
    cancellationsToday = { byBranch: {}, total: 0 },
    performance
  } = data;

  // Chart data
  const todayChart     = barSeries(totalSchedulesToday.byBranch,    'Schedules Today');
  const arrivalsChart  = barSeries(totalArrivalsToday.byBranch,     'Arrivals');
  const tomorrowChart  = barSeries(totalSchedulesTomorrow.byBranch, 'Tomorrow');
  const next7Chart     = barSeries(totalSchedulesNext7.byBranch,    'Next 7 Days');
  const otsChart       = barSeries(totalOTS.byBranch,               'OTS');
  const cancelChart    = barSeries(cancellationsToday.byBranch,     'Cancellations');
  const cancelColors   = cancelChart.colors;

  const payModes = ['Cash', 'Debit', 'Credit'];
  const payModeLabels = ['Cash', 'Debit', 'Credit'];
  const payChart = {
    // Only the payment-method booking counts (no revenue series)
    series: [{ name: 'Bookings', data: payModes.map(m => paymentModesTomorrow[m] || 0) }],
    categories: payModeLabels,
    colors: ['#10b981', '#3b82f6', '#8b5cf6'],
  };

  const barOptions = (cats, colors, title, chartKey = null, section = null, filterType = 'branch') => {
    const base = baseChart(title);
    return {
      ...base,
      chart: {
        ...base.chart,
        ...(chartKey ? {
          events: {
            dataPointSelection: (_ev, _ctx, config) => {
              const val = cats[config.dataPointIndex];
              if (val) handleBarClick(chartKey, val, section, filterType);
            }
          }
        } : {})
      },
      plotOptions: { bar: { borderRadius: 5, distributed: true, columnWidth: '55%',
        dataLabels: { position: 'top' }, cursor: 'pointer' } },
      dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 600,
        colors: [isDark ? '#e2e8f0' : '#1e293b'] }, offsetY: -18 },
      colors,
      legend: { show: false },
      xaxis: { ...base.xaxis, categories: cats },
      states: { active: { filter: { type: 'darken', value: 0.7 } } },
    };
  };

  // ── Drill-down panel ──────────────────────────────────────────────────────
  const DrillDownPanel = ({ chartKey }) => {
    if (!drillDown || drillDown.chartKey !== chartKey) return null;
    return (
      <div className="dr-drilldown">
        <div className="dr-drilldown-header">
          <div className="dr-drilldown-title">
            <FiChevronDown size={16} />
            <strong>{drillDown.filterValue}</strong>
            {!drillDown.loading && (
              <span className="dr-drilldown-count">
                {drillDown.bookings.length} booking{drillDown.bookings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="dr-drilldown-actions">
            <div className="dd-viewtoggle" role="group" aria-label="Layout">
              <button className={!ddCards ? 'on' : ''} onClick={() => setDdCards(false)} title="Table view"><FiList size={13} /></button>
              <button className={ddCards ? 'on' : ''} onClick={() => setDdCards(true)} title="Card view"><FiGrid size={13} /></button>
            </div>
            <button className="dr-drilldown-close" onClick={() => setDrillDown(null)} title="Close">
              <FiX size={15} />
            </button>
          </div>
        </div>
        {drillDown.loading ? (
          <div className="dr-drilldown-msg">Loading bookings…</div>
        ) : drillDown.bookings.length === 0 ? (
          <div className="dr-drilldown-msg">No bookings found for {drillDown.filterValue}</div>
        ) : (
          <BookingListBody bookings={drillDown.bookings} />
        )}
      </div>
    );
  };

  // Shared booking list — table or cards per the ddCards toggle; used by the
  // chart drill-down panel and the simple-view branch modal alike.
  const BookingListBody = ({ bookings }) => ddCards ? (
    <div className="dd-cardgrid">
      {bookings.map((b, idx) => (
        <div className="dd-card" key={idx}>
          <div className="dd-card-top">
            <strong>{b.firstName} {b.lastName}</strong>
            <span className={`status-badge status-${(b.status||'').toLowerCase().replace(/\s+/g,'-')}`}>{b.status}</span>
          </div>
          <div className="dd-card-rows">
            <span>{b.branch} · {b.date}</span>
            <span>{b.treatment || '—'}</span>
            <span>Age {b.age ?? '—'} · Agent {b.agent || '—'}</span>
          </div>
          <div className="dd-card-foot">
            <b>₱{Number(b.totalPrice||0).toLocaleString()}</b>
            <span className="contact-info">
              {b.phone && <a href={`tel:${b.phone}`} title={b.phone}><FiPhone size={14}/></a>}
              {b.email && <a href={`mailto:${b.email}`} title={b.email}><FiMail size={14}/></a>}
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <ScrollableTable className="dr-drilldown-table-wrap">
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Name</th><th>Age</th><th>Branch</th><th>Date</th><th>Treatment</th>
            <th>Status</th><th>Contact</th><th>Price</th><th>Agent</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b, idx) => (
            <tr key={idx}>
              <td><strong>{b.firstName} {b.lastName}</strong></td>
              <td>{b.age ?? '-'}</td>
              <td>{b.branch}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{b.date}</td>
              <td>{b.treatment}</td>
              <td><span className={`status-badge status-${(b.status||'').toLowerCase().replace(/\s+/g,'-')}`}>{b.status}</span></td>
              <td className="contact-cell">
                <div className="contact-info">
                  {b.phone && <a href={`tel:${b.phone}`} title={b.phone}><FiPhone size={13}/></a>}
                  {b.email && <a href={`mailto:${b.email}`} title={b.email}><FiMail size={13}/></a>}
                </div>
              </td>
              <td>₱{Number(b.totalPrice||0).toLocaleString()}</td>
              <td>{b.agent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );

  // ── Simple report view (matches the printed daily report the team shares) ──
  const SimpleView = () => {
    const ds = data.dailySummary || { byBranch: {}, totals: {} };
    const t = ds.totals || {};
    const branches = Object.entries(ds.byBranch || {}).sort(([,a],[,b]) => b.overall - a.overall);
    const arrived = (t.arrivedBought || 0) + (t.arrivedNotPotential || 0) + (t.inTreatment || 0);
    const pctOf = (n) => t.overall > 0 ? Math.round((n / t.overall) * 100) : 0;
    const busiest = branches[0];
    const maxOverall = busiest ? busiest[1].overall : 0;
    const dot = (name, i) => <span className="sv-dot" style={{ background: branchColor(name, i) }} />;
    const cell = (v, cls = '') => v > 0 ? <td className={cls}>{v}</td> : <td className={cls}><span className="sv-z">·</span></td>;

    return (
      <div className="sv-card" id="ccr-print-area">
        {/* Page already has a header — this one appears only on the printed PDF */}
        <div className="sv-hd sv-printonly">
          <div>
            <h2>📋 Daily Bookings Report</h2>
            <div className="sv-sub">Ageless Branches · Call Center Bookings · {branches.length} branch{branches.length !== 1 ? 'es' : ''}</div>
          </div>
          <div className="sv-datebadge">
            <span className="sv-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</span>
            <div className="sv-asof">Live snapshot — as of {refreshAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}</div>
          </div>
        </div>

        <div className="sv-kpis">
          <div className="sv-kpi k0"><div className="l">Overall Bookings</div><div className="v">{formatNum(t.overall)}</div><div className="s">appointments today</div></div>
          <div className="sv-kpi k1"><div className="l">OTS · same-day</div><div className="v">{formatNum(t.ots)}</div><div className="s">booked &amp; scheduled today</div></div>
          <div className="sv-kpi k2"><div className="l">Additional · advance</div><div className="v">{formatNum(t.additional)}</div><div className="s">booked on earlier days</div></div>
          <div className="sv-kpi k3"><div className="l">Arrived so far</div><div className="v">{formatNum(arrived)}</div><div className="s">{pctOf(arrived)}% of bookings</div></div>
          <div className="sv-kpi k4"><div className="l">Cancelled</div><div className="v">{formatNum(t.cancelled)}</div><div className="s">{pctOf(t.cancelled)}% of bookings</div></div>
        </div>

        <div className="sv-ins">
          <b>At a glance:</b> {formatNum(t.overall || 0)} bookings across {branches.length} branches{busiest ? <> — <b>{busiest[0]}</b> is busiest with <b>{busiest[1].overall}</b>.</> : '.'}{' '}
          <span className="sv-tag tg">{arrived} arrived</span>{' '}
          <span className="sv-tag tr">{t.cancelled || 0} cancelled ({pctOf(t.cancelled || 0)}%)</span>{' '}
          <span className="sv-tag ta">{t.upcoming || 0} still upcoming</span>
          {' '}— same-day (OTS) vs advance: {t.ots || 0} vs {t.additional || 0}.
          {t.promoHunter > 0 ? <> {t.promoHunter} promo-hunter{t.promoHunter !== 1 ? 's' : ''} flagged.</> : null}
        </div>

        <div className="sv-sec"><h3>Per-branch breakdown</h3><div className="sv-line" /></div>
        <div className="sv-tablewrap">
          <table className="sv-table">
            <thead>
              <tr className="sv-grp">
                <th className="bn"></th>
                <th className="gb gb-book" colSpan={3}>Bookings</th>
                <th className="sp"></th>
                <th className="gb gb-arr" colSpan={3}>Arrived</th>
                <th className="sp"></th>
                <th className="gb gb-nc" colSpan={4}>Not yet / not completed</th>
              </tr>
              <tr className="sv-cols">
                <th className="bn">Branch</th>
                <th>Overall</th><th>OTS<br/>same-day</th><th>Additional<br/>advance</th>
                <th className="sp"></th>
                <th>&amp; Bought</th><th>Not<br/>Potential</th><th>In<br/>Treatment</th>
                <th className="sp"></th>
                <th>Cancelled</th><th>No<br/>Show</th><th>Promo<br/>Hunter</th><th>Upcoming</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(([name, d], i) => (
                <tr key={name} className="sv-rowclick" onClick={() => openBranchModal(name)} title={`View ${name}'s client list`}>
                  <td className="bn">{dot(name, i)}{name}</td>
                  <td className="ov">{d.overall}</td>
                  {cell(d.ots)}{cell(d.additional)}
                  <td className="sp"></td>
                  {cell(d.arrivedBought, 'g1')}{cell(d.arrivedNotPotential, 'g2')}{cell(d.inTreatment, 'g3')}
                  <td className="sp"></td>
                  {cell(d.cancelled, 'r1')}{cell(d.noShow, 'r2')}{cell(d.promoHunter, 'r3')}{cell(d.upcoming, 'u')}
                </tr>
              ))}
              <tr className="sv-tot">
                <td className="bn">TOTAL</td>
                <td className="ov">{t.overall || 0}</td>
                <td>{t.ots || 0}</td><td>{t.additional || 0}</td>
                <td className="sp"></td>
                <td>{t.arrivedBought || 0}</td><td>{t.arrivedNotPotential || 0}</td><td>{t.inTreatment || 0}</td>
                <td className="sp"></td>
                <td>{t.cancelled || 0}</td><td>{t.noShow || 0}</td><td>{t.promoHunter || 0}</td><td>{t.upcoming || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="sv-grid2">
          <div>
            <div className="sv-sec"><h3>Bookings by branch</h3><div className="sv-line" /></div>
            {branches.map(([name, d], i) => (
              <div className="sv-barrow sv-rowclick" key={name} onClick={() => openBranchModal(name)} title={`View ${name}'s client list`}>
                <div className="sv-blab">{name}</div>
                <div className="sv-btrack"><div className="sv-bfill" style={{ width: `${maxOverall > 0 ? Math.max(4, Math.round((d.overall / maxOverall) * 100)) : 0}%`, background: branchColor(name, i) }} /></div>
                <div className="sv-bval">{d.overall}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="sv-sec"><h3>What the columns mean</h3><div className="sv-line" /></div>
            <div className="sv-legend">
              <b>OTS</b> — a fresh lead that booked for the same day.<br/>
              <b>Additional</b> — booked on a previous day for today.<br/>
              <b>Arrived &amp; Bought</b> — showed up and purchased add-on services.<br/>
              <b>Arrived Not Potential</b> — showed up, paid the promo only.<br/>
              <b>In Treatment</b> — arrived, currently being served.<br/>
              <b>Cancelled / No Show</b> — did not push through.<br/>
              <b>Promo Hunter</b> — repeat promo-only seeker (flagged).<br/>
              <b>Upcoming</b> — appointment later today, not yet arrived.
            </div>
          </div>
        </div>

        <div className="sv-foot">
          <span>Source: Ageless CRM — CC Bookings Report (live)</span>
          <span>Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })} · {refreshAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })} · Ageless Branches</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sidebar />
      <main className="ccr-container">

        {/* Header */}
        <div className="ccr-header">
          <div>
            <h1 className="ccr-title">📋 CC Booking Report</h1>
            <p className="ccr-subtitle">Live booking overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</p>
          </div>
          <div className="ccr-header-actions">
            <span className="ccr-refresh-label">Updated {refreshAt.toLocaleTimeString()}</span>
            <div className="ccr-viewtoggle" role="group" aria-label="Report view">
              <button className={view === 'simple' ? 'on' : ''} onClick={() => switchView('simple')}><FiList size={14} /> Simple</button>
              <button className={view === 'charts' ? 'on' : ''} onClick={() => switchView('charts')}><FiBarChart2 size={14} /> Charts</button>
            </div>
            {view === 'simple' && (
              <button className="ccr-btn" onClick={() => window.print()} title="Print / save as PDF">
                <FiPrinter size={16} />
              </button>
            )}
            {view === 'charts' && (
              <>
                <SavedViewsMenu page="cc-report" filters={widgetFilters} onLoad={(f) => setWidgetFilters(f || {})} />
                <button
                  className={`ccr-btn${snapshotMode ? ' active' : ''}`}
                  onClick={() => { setSnapshotMode(s => !s); setSelectedCards(new Set()); }}
                  title="Snapshot mode"
                >
                  <FiCamera size={16} />
                </button>
              </>
            )}
            <button className="ccr-btn" onClick={fetch} title="Refresh">
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="ccr-error">
            <FiAlertCircle size={18} /> {error}
          </div>
        )}

        {/* ── Simple report view (default) ─────────────────────────── */}
        {view === 'simple' && <SimpleView />}

        {view === 'charts' && (
        <>
        {/* ── Performance Strip ────────────────────────────────────── */}
        {performance && (
          <div className="ccr-perf-strip">
            <div className="ccr-perf-item">
              <div className="ccr-perf-label">Arrival Rate</div>
              <div className="ccr-perf-value" style={{ color: performance.arrivalRateToday >= 60 ? '#10b981' : performance.arrivalRateToday >= 40 ? '#f59e0b' : '#ef4444' }}>
                {performance.arrivalRateToday}%
              </div>
              <div className="ccr-perf-sub">{formatNum(totalArrivalsToday.total)} arrived / {formatNum(totalSchedulesToday.total)} sched</div>
            </div>
            <div className="ccr-perf-item">
              <div className="ccr-perf-label">Conversion Rate</div>
              <div className="ccr-perf-value" style={{ color: performance.conversionRateToday >= 60 ? '#10b981' : performance.conversionRateToday >= 40 ? '#f59e0b' : '#ef4444' }}>
                {performance.conversionRateToday}%
              </div>
              <div className="ccr-perf-sub">arrived → bought</div>
            </div>
            <div className="ccr-perf-item">
              <div className="ccr-perf-label">Bought Today</div>
              <div className="ccr-perf-value" style={{ color: '#3b82f6' }}>{formatNum(performance.boughtToday.count)}</div>
              <div className="ccr-perf-sub">₱{Number(performance.boughtToday.revenue).toLocaleString()}</div>
            </div>
            <div className="ccr-perf-item">
              <div className="ccr-perf-label">Promo Hunters</div>
              <div className="ccr-perf-value" style={{ color: performance.promoHuntersToday > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>
                {formatNum(performance.promoHuntersToday)}
              </div>
              <div className="ccr-perf-sub">today</div>
            </div>
            <div className="ccr-perf-item">
              <div className="ccr-perf-label">Tomorrow Pipeline</div>
              <div className="ccr-perf-value" style={{ color: '#8b5cf6' }}>{formatNum(totalSchedulesTomorrow.total)}</div>
              <div className="ccr-perf-sub">₱{Number(totalSchedulesTomorrow.potentialRevenue || 0).toLocaleString()} potential</div>
            </div>
          </div>
        )}

        {/* ── Row 1: Total Schedules Today ─────────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-today" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Schedules Today" value={widgetFilters.today || EMPTY_WFILTER} onApply={v => setWidgetFilter('today', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(todayChart.categories, todayChart.colors, 'Total Schedules Today per Branch', 'today', 'schedules-today')}
                series={todayChart.series}
              />
            </Snap>
            <BigNum
              id="big-today"
              filterEl={<WidgetFilter options={filterOptions} label="Schedules Today" value={widgetFilters.today || EMPTY_WFILTER} onApply={v => setWidgetFilter('today', v)} />}
                            label="Total Schedules Today"
              total={totalSchedulesToday.total}
              left={totalSchedulesToday.ots}         leftLabel="OTS"
              right={totalSchedulesToday.additional}  rightLabel="Additional"
              color="#3b82f6"
            />
          </div>
          <DrillDownPanel chartKey="today" />
        </div>

        {/* ── Row 2: Total Arrivals Today ──────────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-arrivals" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Arrivals" value={widgetFilters.arrivals || EMPTY_WFILTER} onApply={v => setWidgetFilter('arrivals', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(arrivalsChart.categories, arrivalsChart.colors, 'Total Arrivals per Branch', 'arrivals', 'arrivals')}
                series={arrivalsChart.series}
              />
            </Snap>
            <BigNum
              id="big-arrivals"
              filterEl={<WidgetFilter options={filterOptions} label="Arrivals" value={widgetFilters.arrivals || EMPTY_WFILTER} onApply={v => setWidgetFilter('arrivals', v)} />}
                            label="Total Arrivals Today"
              total={totalArrivalsToday.total}
              left={totalArrivalsToday.otsArrivals}        leftLabel="Arrived OTS"
              right={totalArrivalsToday.additionalArrivals} rightLabel="Additional"
              color="#10b981"
            />
          </div>
          <DrillDownPanel chartKey="arrivals" />
        </div>

        {/* ── Row 3: Total Schedules Tomorrow ─────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-tomorrow" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Sched Tomorrow" value={widgetFilters.tomorrow || EMPTY_WFILTER} onApply={v => setWidgetFilter('tomorrow', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(tomorrowChart.categories, tomorrowChart.colors, 'Total Sched For Tomorrow per Branch', 'tomorrow', 'schedules-tomorrow')}
                series={tomorrowChart.series}
              />
            </Snap>
            <BigNum
              id="big-tomorrow"
              filterEl={<WidgetFilter options={filterOptions} label="Sched Tomorrow" value={widgetFilters.tomorrow || EMPTY_WFILTER} onApply={v => setWidgetFilter('tomorrow', v)} />}
                            label="Total Schedules for Tomorrow"
              total={totalSchedulesTomorrow.total}
              left={totalSchedulesTomorrow.otsTomorrow}        leftLabel="OTS for Tomorrow"
              right={totalSchedulesTomorrow.additionalTomorrow} rightLabel="Additional"
              color="#8b5cf6"
            />
          </div>
          <DrillDownPanel chartKey="tomorrow" />
        </div>

        {/* ── Row 4: Payment Modes for Tomorrow (full width) ────────── */}
        <div className="ccr-section">
          <div className="ccr-row ccr-row-full">
            <Snap id="chart-payment" className="ccr-chart-wrap ccr-full">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Payment Tomorrow" value={widgetFilters.payment || EMPTY_WFILTER} onApply={v => setWidgetFilter('payment', v)} /></div>
              <ReactApexChart
                type="bar" height={300}
                options={{
                  ...baseChart('Modes of Payment For Tomorrow'),
                  chart: { ...baseChart('').chart, type: 'bar',
                    events: { dataPointSelection: (_ev, _ctx, config) => {
                      const val = payModeLabels[config.dataPointIndex];
                      if (val) handleBarClick('payment', val, 'payment-tomorrow', 'payMode');
                    }}
                  },
                  plotOptions: { bar: { borderRadius: 5, distributed: true, columnWidth: '50%', dataLabels: { position: 'top' } } },
                  colors: payChart.colors,
                  legend: { show: false },
                  xaxis: { ...baseChart('').xaxis, categories: payModeLabels },
                  dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700, colors: [isDark ? '#e2e8f0' : '#1e293b'] }, offsetY: -18 },
                  yaxis: { title: { text: 'Bookings', style: { color: isDark ? '#cbd5e1' : '#64748b' } }, labels: { style: { colors: isDark ? '#94a3b8' : '#64748b' } } },
                  tooltip: { y: { formatter: v => `${v ?? 0} bookings` } }
                }}
                series={payChart.series}
              />
            </Snap>
          </div>
          <DrillDownPanel chartKey="payment" />
        </div>

        {/* ── Row 5: Next 7 Days ────────────────────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-next7" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Next 7 Days" value={widgetFilters.next7 || EMPTY_WFILTER} onApply={v => setWidgetFilter('next7', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(next7Chart.categories, next7Chart.colors, 'Total Schedules for the Next 7 Days', 'next7', 'next7days')}
                series={next7Chart.series}
              />
            </Snap>
            <BigNum
              id="big-next7"
              filterEl={<WidgetFilter options={filterOptions} label="Next 7 Days" value={widgetFilters.next7 || EMPTY_WFILTER} onApply={v => setWidgetFilter('next7', v)} />}
                            label="Total Schedules for the Next 7 Days"
              total={totalSchedulesNext7.total}
              left={totalSchedulesNext7.otsNext7}        leftLabel="OTS Next 7 Days"
              right={totalSchedulesNext7.additionalNext7} rightLabel="Additional"
              color="#f59e0b"
            />
          </div>
          <DrillDownPanel chartKey="next7" />
        </div>

        {/* ── Row 6: Total OTS ─────────────────────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-ots" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Total OTS" value={widgetFilters.ots || EMPTY_WFILTER} onApply={v => setWidgetFilter('ots', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(otsChart.categories, otsChart.colors, 'Total OTS (Today + Tomorrow + Next 7 Days)', 'ots', 'ots')}
                series={otsChart.series}
              />
            </Snap>
            <Snap id="big-ots" className="ccr-bignum-card ccr-ots-total">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Total OTS" value={widgetFilters.ots || EMPTY_WFILTER} onApply={v => setWidgetFilter('ots', v)} /></div>
              <div className="ccr-ots-label">Total OTS</div>
              <div className="ccr-ots-num">{formatNum(totalOTS.total)}</div>
              <div className="ccr-ots-sub">Today + Tomorrow + Next 7 Days</div>
            </Snap>
          </div>
          <DrillDownPanel chartKey="ots" />
        </div>

        {/* ── Row 7: Cancellation per Branch ────────────────────────── */}
        <div className="ccr-section">
          <div className="ccr-row">
            <Snap id="chart-cancellations" className="ccr-chart-wrap">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Cancellations" value={widgetFilters.cancellations || EMPTY_WFILTER} onApply={v => setWidgetFilter('cancellations', v)} /></div>
              <ReactApexChart
                type="bar" height={320}
                options={barOptions(cancelChart.categories, cancelColors, 'Cancellation per Branch', 'cancellations', 'cancellations')}
                series={cancelChart.series}
              />
            </Snap>
            <Snap id="big-cancellations" className="ccr-bignum-card ccr-ots-total">
              <div className="wf-corner"><WidgetFilter options={filterOptions} label="Cancellations" value={widgetFilters.cancellations || EMPTY_WFILTER} onApply={v => setWidgetFilter('cancellations', v)} /></div>
              <div className="ccr-ots-label">Cancellations Today</div>
              <div className="ccr-ots-num" style={{ color: '#ef4444' }}>{formatNum(cancellationsToday.total)}</div>
              <div className="ccr-ots-sub">Status = Cancelled · Booked on = Today</div>
            </Snap>
          </div>
          <DrillDownPanel chartKey="cancellations" />
        </div>

        </>
        )}

        {/* ── Simple-view branch client list (modal) ─────────────────── */}
        {svModal && (
          <div className="modal-overlay" onClick={() => setSvModal(null)}>
            <div className="modal-content dr-modal-wide sv-modal" onClick={e => e.stopPropagation()}>
              <div className="sv-modal-head">
                <div className="dr-drilldown-title">
                  <strong>{svModal.branch}</strong>
                  {!svModal.loading && (
                    <span className="dr-drilldown-count">
                      {svModal.bookings.length} booking{svModal.bookings.length !== 1 ? 's' : ''} today
                    </span>
                  )}
                </div>
                <div className="dr-drilldown-actions">
                  <div className="dd-viewtoggle" role="group" aria-label="Layout">
                    <button className={!ddCards ? 'on' : ''} onClick={() => setDdCards(false)} title="Table view"><FiList size={13} /></button>
                    <button className={ddCards ? 'on' : ''} onClick={() => setDdCards(true)} title="Card view"><FiGrid size={13} /></button>
                  </div>
                  <button className="dr-drilldown-close" onClick={() => setSvModal(null)} title="Close">
                    <FiX size={16} />
                  </button>
                </div>
              </div>
              {svModal.loading ? (
                <div className="dr-drilldown-msg">Loading client list…</div>
              ) : svModal.bookings.length === 0 ? (
                <div className="dr-drilldown-msg">No bookings scheduled today for {svModal.branch}</div>
              ) : (
                <div className="sv-modal-body">
                  <BookingListBody bookings={svModal.bookings} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Snapshot floating bar */}
        {snapshotMode && (
          <div className="snapshot-bar">
            <span className="snapshot-bar-info">
              <FiCamera size={14} />
              {selectedCards.size === 0 ? 'Click cards to select' : `${selectedCards.size} selected`}
            </span>
            <button className="snapshot-bar-btn outline" onClick={selectAll}>Select all</button>
            <button
              className="snapshot-bar-btn primary"
              disabled={selectedCards.size === 0 || downloading}
              onClick={downloadSelected}
            >
              <FiDownload size={13} />
              {downloading ? 'Saving…' : 'Download PNG'}
            </button>
            <button className="snapshot-bar-btn cancel" onClick={clearSel}><FiX size={13} /></button>
          </div>
        )}

      </main>
    </>
  );
}
