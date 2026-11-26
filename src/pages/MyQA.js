import React, { useState, useEffect, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { useTheme } from '../context/ThemeContext';
import { getMyQaOverview, getMyQaConversation } from '../services/api';
import { FiRefreshCw, FiX, FiFlag, FiAward, FiMessageSquare } from 'react-icons/fi';
import './ChatQA.css';

const CRITERIA = [
  ['greeting', 'Greeting'], ['responsiveness', 'Speed'], ['accuracy', 'Accuracy'],
  ['tone_empathy', 'Tone'], ['clarity', 'Clarity'], ['compliance', 'Policy'], ['closing', 'Closing'],
];
const phDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(Date.now() + offsetDays * 86400000));
const fmtSec = (s) => s == null ? '—' : s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
const fmtWhen = (iso) => iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const scoreClass = (v) => v == null ? 'na' : v >= 80 ? 'great' : v >= 60 ? 'ok' : v >= 40 ? 'weak' : 'bad';
const critClass = (v) => v == null ? 'na' : v >= 8 ? 'great' : v >= 6 ? 'ok' : v >= 4 ? 'weak' : 'bad';

// Personal QA view — an agent sees only their own scores, tips and chats.
export default function MyQA() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [from, setFrom] = useState(phDate(-29));
  const [to, setTo] = useState(phDate(0));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    getMyQaOverview({ from, to })
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load your QA overview'))
      .finally(() => setLoading(false));
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setDetailLoading(true); setDetail({ id });
    try { const res = await getMyQaConversation(id); setDetail(res.data.conversation); }
    catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const axis = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#334155' : '#e2e8f0';
  const qa = data?.qa;

  const radarOptions = qa ? {
    chart: { type: 'radar', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    xaxis: { categories: CRITERIA.map(([, l]) => l), labels: { style: { colors: CRITERIA.map(() => axis), fontSize: '11px' } } },
    yaxis: { min: 0, max: 10, tickAmount: 5, labels: { style: { colors: [axis] } } },
    colors: ['#3b82f6'], fill: { opacity: 0.25 }, stroke: { width: 2 }, markers: { size: 3 },
    plotOptions: { radar: { polygons: { strokeColors: grid, connectorColors: grid } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => `${v}/10` } },
  } : null;

  const trendOptions = qa ? {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    stroke: { curve: 'smooth', width: 3 }, colors: ['#3b82f6'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 4 },
    xaxis: { categories: (qa.trend || []).map(t => t.day.slice(5)), labels: { style: { colors: axis, fontSize: '11px' } } },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { style: { colors: [axis] } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v, { dataPointIndex }) => `${v}/100 · ${qa.trend[dataPointIndex]?.convs ?? 0} chats` } },
    markers: { size: 4 },
  } : null;

  const b = data?.bookings;

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container cqa-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">My QA</h1>
              <p className="page-subtitle">Your own chat quality and booking results{data?.crmAgent ? ` · ${data.crmAgent}` : ''}</p>
            </div>
            <div className="cqa-head-actions">
              <button className="refresh-btn" onClick={load} disabled={loading}>
                <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {error && <div className="leads-error-banner">{error}</div>}

          <div className="cqa-filters">
            <input type="date" value={from} max={to && to < phDate(0) ? to : phDate(0)} onChange={e => setFrom(e.target.value)} />
            <span className="cqa-arrow">→</span>
            <input type="date" value={to} min={from || undefined} max={phDate(0)} onChange={e => setTo(e.target.value)} />
          </div>

          {loading ? <Loader message="Loading your results…" /> : !data ? null : !data.matched ? (
            <div className="leads-empty"><FiAward size={36} />
              <p>No results linked to your account yet</p>
              <span>{data.hint}</span>
            </div>
          ) : (
            <>
              <div className="cqa-kpis">
                <div className="cqa-kpi" title="Your GPT-scored chats in this period"><b>{qa.convs}</b><span>Chats reviewed</span></div>
                <div className={`cqa-kpi score-${scoreClass(qa.avgScore)}`} title="Your average quality score (0–100)"><b>{qa.avgScore ?? '—'}</b><span>Avg score / 100</span></div>
                <div className="cqa-kpi flag" title="Chats with a red flag — check the tips below"><b>{qa.flagged}</b><span>Red-flagged</span></div>
                <div className="cqa-kpi" title="Median time from the customer's first message to your first reply"><b>{fmtSec(qa.medianFirstResponseSec)}</b><span>Median first response</span></div>
                {b && <div className="cqa-kpi" title="Your revenue in this period — same formula as the Sales Report"><b>₱{Math.round(b.revenue).toLocaleString()}</b><span>Revenue</span></div>}
              </div>

              {(qa.strengths.length > 0 || qa.weaknesses.length > 0) && (
                <div className="cqa-insight-strip" style={{ marginBottom: 16 }}>
                  <span className="cqa-muted">Your profile so far:</span>
                  {qa.strengths.map(s => <span key={s} className="cqa-pill score-great">↑ {s}</span>)}
                  {qa.weaknesses.map(w => <span key={w} className="cqa-pill score-weak">↓ {w}</span>)}
                </div>
              )}

              {qa.convs === 0 ? (
                <div className="leads-empty"><FiMessageSquare size={36} />
                  <p>No chats reviewed in this period</p><span>Change the dates above to see earlier reviews.</span>
                </div>
              ) : (
                <>
                  <div className="cqa-charts">
                    <div className="cqa-chartcard">
                      <h3>Your quality shape</h3>
                      <ReactApexChart type="radar" height={260} options={radarOptions}
                        series={[{ name: 'Me', data: CRITERIA.map(([k]) => qa.criteria[k] != null ? Number(qa.criteria[k]) : 0) }]} />
                    </div>
                    <div className="cqa-chartcard wide">
                      <h3>Your score over time</h3>
                      {qa.trend.length > 1 ? (
                        <ReactApexChart type="area" height={260} options={trendOptions}
                          series={[{ name: 'Avg score', data: qa.trend.map(t => t.avgScore ?? t.avg_score) }]} />
                      ) : <div className="cqa-chart-empty">Trend appears once your chats span more than one day.</div>}
                    </div>
                  </div>

                  <div className="cqa-section">
                    <h3>Coaching tips for you</h3>
                    {qa.coachingTips.length === 0 ? <p className="cqa-note cqa-muted">No tips yet — keep it up!</p> : (
                      <ul className="cqa-tips">{qa.coachingTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                    )}
                  </div>

                  {b && (
                    <div className="cqa-section">
                      <h3>Your bookings in this period <span className="cqa-hint">from Master Bookings · revenue uses the Sales Report formula</span></h3>
                      <div className="cqa-kpis">
                        <div className="cqa-kpi"><b>{b.bookingsCreated}</b><span>Bookings created</span></div>
                        <div className="cqa-kpi"><b>{b.showRate != null ? `${b.showRate}%` : '—'}</b><span>Show rate</span></div>
                        <div className="cqa-kpi"><b>{b.cancelRate != null ? `${b.cancelRate}%` : '—'}</b><span>Cancellation rate</span></div>
                        <div className="cqa-kpi"><b>{b.conversionRate != null ? `${b.conversionRate}%` : '—'}</b><span>Conversion</span></div>
                        <div className="cqa-kpi"><b>{b.revenuePerArrival != null ? `₱${b.revenuePerArrival.toLocaleString()}` : '—'}</b><span>Revenue / arrival</span></div>
                      </div>
                    </div>
                  )}

                  <div className="cqa-section">
                    <h3>Your reviewed chats <span className="cqa-hint">click one to read the transcript and scores</span></h3>
                    <div className="cqa-tablewrap">
                      <table className="bookings-table cqa-table">
                        <thead><tr><th>When</th><th>Page</th><th>Customer</th><th>Score</th><th>Flags</th><th>Summary</th></tr></thead>
                        <tbody>
                          {qa.conversations.map(c => (
                            <tr key={c.id} className="cqa-convrow" onClick={() => openDetail(c.id)}>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtWhen(c.lastMsgAt)}</td>
                              <td>{c.pageName}</td>
                              <td><strong>{c.customerName || '—'}</strong></td>
                              <td><span className={`cqa-pill score-${scoreClass(c.overall)}`}>{c.overall}</span></td>
                              <td>{(c.redFlags || []).length > 0 ? <span className="cqa-flagcount"><FiFlag size={11} /> {c.redFlags.length}</span> : '—'}</td>
                              <td className="cqa-summary" title={c.summary}>{c.summary}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Own-chat transcript modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content dr-modal-wide cqa-modal" onClick={e => e.stopPropagation()}>
            <div className="cqa-modal-head">
              <div>
                <h3>{detail.customerName || 'Conversation'} <span className="cqa-muted">· {detail.pageName}</span></h3>
                {!detailLoading && detail.overall != null && <span className={`cqa-pill big score-${scoreClass(detail.overall)}`}>{detail.overall} / 100</span>}
              </div>
              <button onClick={() => setDetail(null)}><FiX size={18} /></button>
            </div>
            {detailLoading ? <div className="cqa-modal-loading">Loading…</div> : (
              <div className="cqa-modal-body">
                <div className="cqa-transcript">
                  {(detail.transcript || []).map((l, i, arr) => (
                    <React.Fragment key={i}>
                      {l.context === undefined && i > 0 && arr[i - 1].context && (
                        <div className="cqa-period-divider">— review period starts —</div>
                      )}
                      <div className={`cqa-msg ${l.role}${l.context ? ' context' : ''}`}>
                        <div className="cqa-msg-meta">
                          {l.context ? 'Earlier history · ' : ''}
                          {l.role === 'customer' ? (l.name || 'Customer') : l.role === 'auto' ? 'Auto-reply' : l.name}
                          <span>{String(l.at || '').replace('T', ' ').slice(5, 16)}</span>
                        </div>
                        <div className="cqa-bubble">{l.text}</div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="cqa-scorepanel">
                  <h4>Scores</h4>
                  {CRITERIA.map(([k, label]) => {
                    const s = detail.scores?.[k];
                    return (
                      <div key={k} className="cqa-scoreline">
                        <div className="cqa-scoreline-top"><span>{label}</span><b className={`crit-${critClass(s?.score)}`}>{s?.score ?? '—'}/10</b></div>
                        <div className="cqa-scorebar"><span className={`crit-bg-${critClass(s?.score)}`} style={{ width: `${(s?.score ?? 0) * 10}%` }} /></div>
                        {s?.reason && <div className="cqa-reason">{s.reason}</div>}
                      </div>
                    );
                  })}
                  {(detail.redFlags || []).length > 0 && (
                    <>
                      <h4><FiFlag size={12} /> Red flags</h4>
                      <ul className="cqa-flags">{detail.redFlags.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </>
                  )}
                  <h4>Summary</h4>
                  <p className="cqa-note">{detail.summary}</p>
                  <h4>Coaching tip</h4>
                  <p className="cqa-note cqa-tip">{detail.coachingTip}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
