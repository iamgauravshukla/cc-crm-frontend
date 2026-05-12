import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import html2canvas from 'html2canvas';
import { FiRefreshCw, FiCamera, FiDownload, FiX, FiAlertCircle } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import api from '../services/api';
import './CCBookingReport.css';

const CHART_COLORS = [
  '#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6',
  '#ef4444','#06b6d4','#84cc16','#f97316','#a78bfa',
  '#fb7185','#34d399','#60a5fa','#fbbf24','#c084fc'
];

const formatNum = (n) => Number(n || 0).toLocaleString();

export default function CCBookingReport() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshAt, setRefreshAt] = useState(new Date());

  // Snapshot
  const [snapshotMode, setSnapshotMode]   = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [downloading, setDownloading]     = useState(false);
  const cardRefs = useRef({});

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/bookings/cc-report');
      setData(res.data.data);
      setRefreshAt(new Date());
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

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
      colors: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
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

  // ── Big-number card ───────────────────────────────────────────────────────
  const BigNum = ({ id, label, total, left, leftLabel, right, rightLabel, color = '#3b82f6' }) => (
    <Snap id={id} className="ccr-bignum-card">
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
    paymentModesTomorrow, totalSchedulesNext7, totalOTS
  } = data;

  // Chart data
  const todayChart     = barSeries(totalSchedulesToday.byBranch,    'Schedules Today');
  const arrivalsChart  = barSeries(totalArrivalsToday.byBranch,     'Arrivals');
  const tomorrowChart  = barSeries(totalSchedulesTomorrow.byBranch, 'Tomorrow');
  const next7Chart     = barSeries(totalSchedulesNext7.byBranch,    'Next 7 Days');
  const otsChart       = barSeries(totalOTS.byBranch,               'OTS');

  const payModes = ['Cash', 'Debit', 'Credit'];
  const payChart = {
    series: [{ name: 'Bookings', data: payModes.map(m => paymentModesTomorrow[m] || 0) }],
    categories: ['Cash Payment', 'Debit Card', 'Credit Card'],
    colors: ['#10b981', '#3b82f6', '#8b5cf6'],
  };

  const barOptions = (cats, colors, title) => ({
    ...baseChart(title),
    plotOptions: { bar: { borderRadius: 5, distributed: true, columnWidth: '55%',
      dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 600,
      colors: [isDark ? '#e2e8f0' : '#1e293b'] }, offsetY: -18 },
    colors,
    legend: { show: false },
    xaxis: { ...baseChart(title).xaxis, categories: cats },
  });

  return (
    <>
      <Sidebar />
      <main className="ccr-container">

        {/* Header */}
        <div className="ccr-header">
          <div>
            <h1 className="ccr-title">📋 CC Booking Report</h1>
            <p className="ccr-subtitle">Live booking overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="ccr-header-actions">
            <span className="ccr-refresh-label">Updated {refreshAt.toLocaleTimeString()}</span>
            <button
              className={`ccr-btn${snapshotMode ? ' active' : ''}`}
              onClick={() => { setSnapshotMode(s => !s); setSelectedCards(new Set()); }}
              title="Snapshot mode"
            >
              <FiCamera size={16} />
            </button>
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

        {/* ── Row 1: Total Schedules Today ─────────────────────────── */}
        <div className="ccr-row">
          <Snap id="chart-today" className="ccr-chart-wrap">
            <ReactApexChart
              type="bar" height={320}
              options={barOptions(todayChart.categories, todayChart.colors, 'Total Schedules Today per Branch')}
              series={todayChart.series}
            />
          </Snap>
          <BigNum
            id="big-today"
            label="Total Schedules Today"
            total={totalSchedulesToday.total}
            left={totalSchedulesToday.ots}         leftLabel="OTS"
            right={totalSchedulesToday.additional}  rightLabel="Additional"
            color="#3b82f6"
          />
        </div>

        {/* ── Row 2: Total Arrivals Today ──────────────────────────── */}
        <div className="ccr-row">
          <Snap id="chart-arrivals" className="ccr-chart-wrap">
            <ReactApexChart
              type="bar" height={320}
              options={barOptions(arrivalsChart.categories, arrivalsChart.colors, 'Total Arrivals per Branch')}
              series={arrivalsChart.series}
            />
          </Snap>
          <BigNum
            id="big-arrivals"
            label="Total Arrivals Today"
            total={totalArrivalsToday.total}
            left={totalArrivalsToday.otsArrivals}        leftLabel="Arrived OTS"
            right={totalArrivalsToday.additionalArrivals} rightLabel="Additional"
            color="#10b981"
          />
        </div>

        {/* ── Row 3: Total Schedules Tomorrow ─────────────────────── */}
        <div className="ccr-row">
          <Snap id="chart-tomorrow" className="ccr-chart-wrap">
            <ReactApexChart
              type="bar" height={320}
              options={barOptions(tomorrowChart.categories, tomorrowChart.colors, 'Total Sched For Tomorrow per Branch')}
              series={tomorrowChart.series}
            />
          </Snap>
          <BigNum
            id="big-tomorrow"
            label="Total Schedules for Tomorrow"
            total={totalSchedulesTomorrow.total}
            left={totalSchedulesTomorrow.otsTomorrow}        leftLabel="OTS for Tomorrow"
            right={totalSchedulesTomorrow.additionalTomorrow} rightLabel="Additional"
            color="#8b5cf6"
          />
        </div>

        {/* ── Row 4: Payment Modes for Tomorrow (full width) ────────── */}
        <div className="ccr-row ccr-row-full">
          <Snap id="chart-payment" className="ccr-chart-wrap ccr-full">
            <ReactApexChart
              type="bar" height={300}
              options={barOptions(payChart.categories, payChart.colors, 'Modes of Payment For Tomorrow')}
              series={payChart.series}
            />
          </Snap>
        </div>

        {/* ── Row 5: Next 7 Days ────────────────────────────────────── */}
        <div className="ccr-row">
          <Snap id="chart-next7" className="ccr-chart-wrap">
            <ReactApexChart
              type="bar" height={320}
              options={barOptions(next7Chart.categories, next7Chart.colors, 'Total Schedules for the Next 7 Days')}
              series={next7Chart.series}
            />
          </Snap>
          <BigNum
            id="big-next7"
            label="Total Schedules for the Next 7 Days"
            total={totalSchedulesNext7.total}
            left={totalSchedulesNext7.otsNext7}        leftLabel="OTS Next 7 Days"
            right={totalSchedulesNext7.additionalNext7} rightLabel="Additional"
            color="#f59e0b"
          />
        </div>

        {/* ── Row 6: Total OTS ─────────────────────────────────────── */}
        <div className="ccr-row">
          <Snap id="chart-ots" className="ccr-chart-wrap">
            <ReactApexChart
              type="bar" height={320}
              options={barOptions(otsChart.categories, otsChart.colors, 'Total OTS (Today + Tomorrow + Next 7 Days)')}
              series={otsChart.series}
            />
          </Snap>
          <Snap id="big-ots" className="ccr-bignum-card ccr-ots-total">
            <div className="ccr-ots-label">Total OTS</div>
            <div className="ccr-ots-num">{formatNum(totalOTS.total)}</div>
            <div className="ccr-ots-sub">Today + Tomorrow + Next 7 Days</div>
          </Snap>
        </div>

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
