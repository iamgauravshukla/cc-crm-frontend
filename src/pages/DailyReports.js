import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDailyReports, getOTSBookings, getOverallBookings, getTomorrowBookings, getNext7DaysBookings, getCancellations, getArrivalsToday, getTomorrowSummary } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import ReactApexChart from 'react-apexcharts';
import html2canvas from 'html2canvas';
import { FiRefreshCw, FiAlertCircle, FiX, FiMaximize2, FiPhone, FiMail, FiCamera, FiDownload, FiChevronDown } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import ScrollableTable from '../components/ScrollableTable';
import ReportFilter, { filterToParams, EMPTY_FILTER } from '../components/ReportFilter';
import { useConfig } from '../hooks/useConfig';
import './DailyReports.css';

const BRANCH_COLORS = [
  '#ec4899','#f97316','#a16207','#22c55e','#06b6d4',
  '#f59e0b','#8b5cf6','#3b82f6','#10b981','#e11d48',
  '#14b8a6','#84cc16','#6366f1','#f43f5e','#0ea5e9'
];

const DailyReports = () => {
  const [reports, setReports]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [refreshAt, setRefreshAt] = useState(new Date());

  // Full-page modal (expand button)
  const [expandedSection, setExpandedSection] = useState(null);
  const [modalBookings, setModalBookings]     = useState([]);
  const [modalLoading, setModalLoading]       = useState(false);

  // Inline bar-click drill-down
  const [drillDown, setDrillDown] = useState(null);
  // { chartKey, branch, bookings: [], loading: bool }
  const bookingsCache = useRef({});

  // Snapshot
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [snapshotMode, setSnapshotMode]   = useState(false);
  const [downloading, setDownloading]     = useState(false);
  const cardRefs = useRef({});

  // Scope filter (Branch / Agent)
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const { options: cfgOptions } = useConfig();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ── Snapshot ──────────────────────────────────────────────────────────────
  const toggleCardSelect = useCallback((id) => {
    setSelectedCards(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const selectAll      = () => setSelectedCards(new Set(Object.keys(cardRefs.current)));
  const clearSelection = useCallback(() => { setSelectedCards(new Set()); setSnapshotMode(false); }, []);

  const downloadSelected = useCallback(async () => {
    if (!selectedCards.size) return;
    setDownloading(true);
    try {
      for (const id of selectedCards) {
        const el = cardRefs.current[id];
        if (!el) continue;
        const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
        const a = document.createElement('a');
        a.download = `daily-report-${id}-${new Date().toISOString().slice(0,10)}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        await new Promise(r => setTimeout(r, 200));
      }
    } finally { setDownloading(false); }
  }, [selectedCards]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchDailyReports = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      bookingsCache.current = {};   // filter changed → invalidate drill-down cache
      setDrillDown(null);
      const res = await getDailyReports(filterToParams(filter));
      if (res.data?.success) { setReports(res.data.reports); setRefreshAt(new Date()); }
      else setError('Failed to load daily reports');
    } catch (err) { setError(err.message || 'An error occurred'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    fetchDailyReports();
    const auto = setInterval(fetchDailyReports, 5 * 60 * 1000);
    const calcMid = () => {
      const now = new Date(), tom = new Date(now);
      tom.setDate(tom.getDate() + 1); tom.setHours(0,0,0,0);
      return setTimeout(() => { fetchDailyReports(); calcMid(); }, tom - now);
    };
    const mid = calcMid();
    return () => { clearInterval(auto); clearTimeout(mid); };
  }, [fetchDailyReports]);

  // ── Full-section modal ────────────────────────────────────────────────────
  const handleExpandSection = async (sectionName) => {
    setExpandedSection(sectionName); setModalLoading(true);
    try {
      const apiMap = {
        ots: getOTSBookings, 'arrivals-today': getArrivalsToday,
        overall: getOverallBookings, tomorrow: getTomorrowBookings,
        next7days: getNext7DaysBookings, cancellations: getCancellations,
        'tomorrow-summary': getTomorrowSummary,
      };
      const fn = apiMap[sectionName]; if (!fn) return;
      const res = await fn(filterToParams(filter));
      setModalBookings(res.data?.bookings || []);
    } catch { setModalBookings([]); }
    finally { setModalLoading(false); }
  };

  // ── Inline bar-click drill-down ───────────────────────────────────────────
  const handleBarClick = async (chartKey, branch, apiFn) => {
    // Toggle off if same bar
    if (drillDown?.chartKey === chartKey && drillDown?.branch === branch) {
      setDrillDown(null); return;
    }
    setDrillDown({ chartKey, branch, bookings: [], loading: true });
    try {
      let all = bookingsCache.current[chartKey];
      if (!all) {
        const res = await apiFn(filterToParams(filter));
        all = res.data?.bookings || [];
        bookingsCache.current[chartKey] = all;
      }
      const filtered = all.filter(b => (b.branch || '').toLowerCase() === branch.toLowerCase());
      setDrillDown({ chartKey, branch, bookings: filtered, loading: false });
    } catch {
      setDrillDown({ chartKey, branch, bookings: [], loading: false });
    }
  };

  if (loading) return (
    <><Sidebar /><main className="daily-reports-container">
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
        <Loader message="Loading daily reports..." />
      </div>
    </main></>
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const prepareBranchData = (byBranch) =>
    Object.entries(byBranch || {})
      .filter(([, v]) => v.count > 0)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([branch, v]) => ({ branch, count: v.count }));

  const barOptions = (data, title, chartKey, apiFn) => ({
    chart: {
      type: 'bar', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit',
      events: {
        dataPointSelection: (_ev, _ctx, config) => {
          const branch = data[config.dataPointIndex]?.branch;
          if (branch) handleBarClick(chartKey, branch, apiFn);
        }
      }
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    title: { text: title, style: { fontSize:'13px', fontWeight:600, color: isDark ? '#e2e8f0' : '#1e293b' } },
    plotOptions: { bar: { borderRadius:5, distributed:true, columnWidth:'55%', dataLabels:{ position:'top' }, cursor: 'pointer' } },
    dataLabels: { enabled:true, offsetY:-18, style:{ fontSize:'12px', fontWeight:700, colors:[isDark ? '#e2e8f0' : '#1e293b'] } },
    colors: data.map((_, i) => BRANCH_COLORS[i % BRANCH_COLORS.length]),
    legend: { show: false },
    grid: { borderColor: isDark ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    xaxis: { categories: data.map(d => d.branch), labels: { rotate:-40, style:{ colors: isDark ? '#94a3b8' : '#64748b', fontSize:'11px' } } },
    yaxis: { labels: { style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize:'11px' } } },
    tooltip: { theme: isDark ? 'dark' : 'light' },
    states: { active: { filter: { type: 'darken', value: 0.7 } } },
  });

  const barSeries = (data, name='Count') => [{ name, data: data.map(d => d.count) }];

  // Snap wrapper
  const Snap = ({ id, children, className='' }) => (
    <div
      ref={el => { cardRefs.current[id] = el; }}
      className={`dr-card ${className}${snapshotMode ? ' snap-selectable' : ''}${selectedCards.has(id) ? ' snap-selected' : ''}`}
      onClick={() => snapshotMode && toggleCardSelect(id)}
    >
      {snapshotMode && <div className="snap-check">{selectedCards.has(id) ? '✓' : ''}</div>}
      {children}
    </div>
  );

  // Big number card
  const BigNum = ({ id, value, label, color='#3b82f6', onExpand }) => (
    <Snap id={id} className="dr-bignum">
      <div className="dr-bignum-label">{label}</div>
      <div className="dr-bignum-value" style={{ color }}>{Number(value||0).toLocaleString()}</div>
      {onExpand && (
        <button className="dr-expand-btn" onClick={e => { e.stopPropagation(); onExpand(); }} title="View all bookings">
          <FiMaximize2 size={15} />
        </button>
      )}
    </Snap>
  );

  // Inline drill-down panel
  const DrillDownPanel = ({ chartKey }) => {
    if (!drillDown || drillDown.chartKey !== chartKey) return null;
    return (
      <div className="dr-drilldown">
        <div className="dr-drilldown-header">
          <div className="dr-drilldown-title">
            <FiChevronDown size={16} />
            <strong>{drillDown.branch}</strong>
            {!drillDown.loading && (
              <span className="dr-drilldown-count">{drillDown.bookings.length} booking{drillDown.bookings.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button className="dr-drilldown-close" onClick={() => setDrillDown(null)} title="Close">
            <FiX size={15} />
          </button>
        </div>
        {drillDown.loading ? (
          <div className="dr-drilldown-msg">Loading bookings…</div>
        ) : drillDown.bookings.length === 0 ? (
          <div className="dr-drilldown-msg">No bookings found for {drillDown.branch}</div>
        ) : (
          <ScrollableTable className="dr-drilldown-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Name</th><th>Date</th><th>Treatment</th><th>Status</th>
                  <th>Contact</th><th>Price</th><th>Agent</th>
                </tr>
              </thead>
              <tbody>
                {drillDown.bookings.map((b, i) => (
                  <tr key={i}>
                    <td><strong>{b.firstName} {b.lastName}</strong></td>
                    <td style={{ whiteSpace:'nowrap' }}>{b.date}</td>
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
        )}
      </div>
    );
  };

  const NoData = ({ msg='No data available' }) => (
    <div className="dr-nodata"><FiAlertCircle size={28} /><span>{msg}</span></div>
  );

  if (!reports) return null;

  const otsData      = prepareBranchData(reports?.otsBookings?.byBranch);
  const overallData  = prepareBranchData(reports?.overallBookings?.byBranch);
  const tomorrowData = prepareBranchData(reports?.bookedTomorrow?.byBranch);
  const overallTomData = prepareBranchData(reports?.overallBookingsTomorrow?.byBranch);
  const next7Data    = prepareBranchData(reports?.bookedNext7Days?.byBranch);
  const cancelData   = prepareBranchData(reports?.cancellations?.byBranch);
  const arrivalsData = prepareBranchData(reports?.arrivalsToday?.byBranch);

  const tomorrowTotal   = Object.values(reports?.bookedTomorrow?.byBranch || {}).reduce((s,v) => s + v.count, 0);
  const next7Total      = Object.values(reports?.bookedNext7Days?.byBranch || {}).reduce((s,v) => s + v.count, 0);
  const overallTomTotal = reports?.overallBookingsTomorrow?.count || 0;

  const MODAL_LABELS = {
    ots:'Same-Day Bookings', overall:'Overall Bookings', 'arrivals-today':'Arrivals Today',
    tomorrow:'Tomorrow Bookings', next7days:'Next 7 Days', cancellations:'Cancellations',
    'tomorrow-summary':'Tomorrow Summary'
  };

  return (
    <>
      <Sidebar />
      <main className="daily-reports-container">

        {/* Header */}
        <div className="report-header">
          <div className="header-left">
            <h1 className="page-title">📊 Daily Reports</h1>
            <p className="page-subtitle">
              {new Date().toLocaleDateString('en-US',{ weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Manila' })}
            </p>
          </div>
          <div className="header-right">
            <span className="refresh-label">Updated {refreshAt.toLocaleTimeString()}</span>
            <ReportFilter
              branches={cfgOptions.branches}
              agents={cfgOptions.agents}
              value={filter}
              onApply={setFilter}
            />
            <button className={`btn-icon-primary${snapshotMode ? ' active' : ''}`}
              onClick={() => { setSnapshotMode(s => !s); setSelectedCards(new Set()); }} title="Snapshot mode">
              <FiCamera size={16} />
            </button>
            <button className="btn-icon-primary" onClick={fetchDailyReports} title="Refresh">
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {error && <div className="dr-error"><FiAlertCircle size={18} /> {error}</div>}

        {/* KPI Summary Strip */}
        {reports && (() => {
          const schedTotal = Object.values(reports.otsBookings?.byBranch || {}).reduce((s, v) => s + v.count, 0)
                           + Object.values(reports.overallBookings?.byBranch || {}).reduce((s, v) => s + v.count, 0);
          const arrRate = schedTotal > 0 && reports.arrivalRateToday != null
            ? reports.arrivalRateToday : null;
          return (
            <div className="dr-kpi-strip">
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">Today's Revenue</div>
                <div className="dr-kpi-value" style={{ color: '#10b981' }}>
                  ₱{Number(reports.boughtToday?.revenue || 0).toLocaleString()}
                </div>
                <div className="dr-kpi-sub">{reports.boughtToday?.count || 0} sales
                  {(reports.boughtToday?.comebackCount || 0) > 0 && ` · ${reports.boughtToday.comebackCount} comeback`}
                </div>
              </div>
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">Arrival Rate</div>
                <div className="dr-kpi-value" style={{ color: '#3b82f6' }}>
                  {arrRate !== null ? `${arrRate}%` : '—'}
                </div>
                <div className="dr-kpi-sub">{reports.arrivalsToday?.count || 0} arrived today</div>
              </div>
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">Conversion Rate</div>
                <div className="dr-kpi-value" style={{ color: '#8b5cf6' }}>
                  {reports.conversionRateToday != null ? `${reports.conversionRateToday}%` : '—'}
                </div>
                <div className="dr-kpi-sub">arrived → bought</div>
              </div>
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">Promo Hunters</div>
                <div className="dr-kpi-value" style={{ color: reports.promoHuntersToday > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>
                  {reports.promoHuntersToday || 0}
                </div>
                <div className="dr-kpi-sub">today</div>
              </div>
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">No-Shows</div>
                <div className="dr-kpi-value" style={{ color: reports.noShowsToday > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                  {reports.noShowsToday || 0}
                </div>
                <div className="dr-kpi-sub">today</div>
              </div>
              <div className="dr-kpi-item">
                <div className="dr-kpi-label">Follow-ups Due</div>
                <div className="dr-kpi-value" style={{ color: reports.followUpsDueToday > 0 ? '#ec4899' : 'var(--text-secondary)' }}>
                  {reports.followUpsDueToday || 0}
                </div>
                <div className="dr-kpi-sub">scheduled today</div>
              </div>
            </div>
          );
        })()}

        {/* Row 1 — OTS */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-ots" className="dr-chart-wrap">
              {otsData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(otsData,'OTS per Branch','ots',getOTSBookings)} series={barSeries(otsData,'OTS')} />
                : <NoData msg="No OTS bookings today" />}
            </Snap>
            <BigNum id="big-ots" value={reports?.otsBookings?.count} label="OTS" color="#ec4899"
              onExpand={() => handleExpandSection('ots')} />
          </div>
          <DrillDownPanel chartKey="ots" />
        </div>

        {/* Row 2 — Overall */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-overall" className="dr-chart-wrap">
              {overallData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(overallData,'OVERALL per Branch','overall',getOverallBookings)} series={barSeries(overallData,'Overall')} />
                : <NoData msg="No overall bookings" />}
            </Snap>
            <BigNum id="big-overall" value={reports?.overallBookings?.count} label="OVERALL" color="#3b82f6"
              onExpand={() => handleExpandSection('overall')} />
          </div>
          <DrillDownPanel chartKey="overall" />
        </div>

        {/* Row 3 — Arrivals Today */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-arrivals" className="dr-chart-wrap">
              {arrivalsData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(arrivalsData,'Arrivals Today per Branch','arrivals-today',getArrivalsToday)} series={barSeries(arrivalsData,'Arrivals')} />
                : <NoData msg="No arrivals today" />}
            </Snap>
            <BigNum id="big-arrivals" value={reports?.arrivalsToday?.count} label="ARRIVALS TODAY" color="#10b981"
              onExpand={() => handleExpandSection('arrivals-today')} />
          </div>
          <DrillDownPanel chartKey="arrivals-today" />
        </div>

        {/* Row 4 — Booked Tomorrow */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-tomorrow" className="dr-chart-wrap">
              {tomorrowData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(tomorrowData,'Booked Tomorrow per Branch','tomorrow',getTomorrowBookings)} series={barSeries(tomorrowData,'Tomorrow')} />
                : <NoData msg="No appointments tomorrow" />}
            </Snap>
            <BigNum id="big-tomorrow" value={tomorrowTotal} label="Total Booked Tomorrow" color="#f97316"
              onExpand={() => handleExpandSection('tomorrow')} />
          </div>
          <DrillDownPanel chartKey="tomorrow" />
        </div>

        {/* Row 5 — Next 7 Days */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-next7" className="dr-chart-wrap">
              {next7Data.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(next7Data,'Booked Next 7 Days per Branch','next7days',getNext7DaysBookings)} series={barSeries(next7Data,'Next 7 Days')} />
                : <NoData msg="No bookings in next 7 days" />}
            </Snap>
            <BigNum id="big-next7" value={next7Total} label="Total Booked Next 7 Days" color="#8b5cf6"
              onExpand={() => handleExpandSection('next7days')} />
          </div>
          <DrillDownPanel chartKey="next7days" />
        </div>

        {/* Row 6 — Cancellations */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-cancellations" className="dr-chart-wrap">
              {cancelData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(cancelData,'Cancellations per Branch','cancellations',getCancellations)} series={barSeries(cancelData,'Cancellations')} />
                : <NoData msg="No cancellations today" />}
            </Snap>
            <BigNum id="big-cancellations" value={reports?.cancellations?.count} label="Total Cancellations" color="#ef4444"
              onExpand={() => handleExpandSection('cancellations')} />
          </div>
          <DrillDownPanel chartKey="cancellations" />
        </div>

        {/* Row 7 — Overall Bookings Tomorrow */}
        <div className="dr-section">
          <div className="dr-row">
            <Snap id="chart-overall-tomorrow" className="dr-chart-wrap">
              {overallTomData.length > 0
                ? <ReactApexChart type="bar" height={320} options={barOptions(overallTomData,'Overall Bookings Tomorrow','overall-tomorrow',getTomorrowSummary)} series={barSeries(overallTomData,'Tomorrow')} />
                : <NoData msg="No bookings tomorrow" />}
            </Snap>
            <BigNum id="big-overall-tomorrow" value={overallTomTotal} label="Overall Bookings Tomorrow" color="#06b6d4"
              onExpand={() => handleExpandSection('tomorrow-summary')} />
          </div>
          <DrillDownPanel chartKey="overall-tomorrow" />
        </div>

        {/* Full-page Detail Modal */}
        {expandedSection && (
          <div className="modal-overlay" onClick={() => { setExpandedSection(null); setModalBookings([]); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{MODAL_LABELS[expandedSection] || 'Bookings'}</h2>
                <button className="modal-close-btn" onClick={() => { setExpandedSection(null); setModalBookings([]); }}>
                  <FiX size={24} />
                </button>
              </div>
              {modalLoading ? (
                <div className="modal-loading">Loading bookings…</div>
              ) : modalBookings.length === 0 ? (
                <div className="modal-empty">No bookings found</div>
              ) : (
                <ScrollableTable className="bookings-table-wrapper">
                  <table className="bookings-table">
                    <thead>
                      <tr><th>Name</th><th>Branch</th><th>Date</th><th>Treatment</th><th>Contact</th><th>Status</th><th>Price</th><th>Agent</th></tr>
                    </thead>
                    <tbody>
                      {modalBookings.map((b, i) => (
                        <tr key={i}>
                          <td><strong>{b.firstName} {b.lastName}</strong></td>
                          <td>{b.branch}</td><td>{b.date}</td><td>{b.treatment}</td>
                          <td className="contact-cell">
                            <div className="contact-info">
                              {b.phone && <a href={`tel:${b.phone}`} title={b.phone}><FiPhone size={14}/></a>}
                              {b.email && <a href={`mailto:${b.email}`} title={b.email}><FiMail size={14}/></a>}
                            </div>
                          </td>
                          <td><span className={`status-badge status-${(b.status||'').toLowerCase().replace(/\s+/g,'-')}`}>{b.status}</span></td>
                          <td><strong>₱{Number(b.totalPrice||0).toLocaleString()}</strong></td>
                          <td>{b.agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              )}
            </div>
          </div>
        )}

        {/* Snapshot bar */}
        {snapshotMode && (
          <div className="snapshot-bar">
            <span className="snapshot-bar-info"><FiCamera size={14} />
              {selectedCards.size === 0 ? 'Click cards to select' : `${selectedCards.size} selected`}
            </span>
            <button className="snapshot-bar-btn outline" onClick={selectAll}>Select all</button>
            <button className="snapshot-bar-btn primary" disabled={selectedCards.size===0||downloading} onClick={downloadSelected}>
              <FiDownload size={13}/>{downloading ? 'Saving…' : 'Download PNG'}
            </button>
            <button className="snapshot-bar-btn cancel" onClick={clearSelection}><FiX size={13}/></button>
          </div>
        )}

      </main>
    </>
  );
};

export default DailyReports;
