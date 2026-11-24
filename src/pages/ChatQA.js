import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { useTheme } from '../context/ThemeContext';
import {
  getQaPages, getQaAgents, startQaRun, getQaRun, getQaRuns, deleteQaRun,
  getQaConversations, getQaConversation, getQaStats, getQaAgentProfile, getQaWorkload,
  getQaAgentScorecard, getQaRatings, getQaAgentMap, saveQaAgentMap, getAciWeights, saveAciWeights,
} from '../services/api';
import {
  FiRefreshCw, FiPlay, FiX, FiFlag, FiMessageSquare, FiClock,
  FiAlertTriangle, FiPlus, FiUser, FiChevronRight, FiTrendingUp, FiTrash2,
  FiArrowLeft, FiFileText, FiAward, FiLink, FiSliders,
} from 'react-icons/fi';
import './ChatQA.css';

const CRITERIA = [
  ['greeting', 'Greeting'], ['responsiveness', 'Speed'], ['accuracy', 'Accuracy'],
  ['tone_empathy', 'Tone'], ['clarity', 'Clarity'], ['compliance', 'Policy'], ['closing', 'Closing'],
];

const phDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d);
};
const fmtSec = (s) => {
  if (s == null) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
};
const fmtWhen = (iso) => iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const scoreClass = (v) => v == null ? 'na' : v >= 80 ? 'great' : v >= 60 ? 'ok' : v >= 40 ? 'weak' : 'bad';
const ACI_COMPONENTS = [
  ['chatQa', 'Chat QA', v => v != null ? `${v}/100` : '—'],
  ['conversion', 'Chat→Booking', v => v != null ? `${v}%` : '—'],
  ['showRate', 'Show rate', v => v != null ? `${v}%` : '—'],
  ['revenue', '₱/arrival', v => v != null ? `₱${Number(v).toLocaleString()}` : '—'],
  ['responsiveness', 'Response', v => v != null ? fmtSec(v) : '—'],
  ['discipline', 'Discipline', v => v != null ? `${v}% lost` : '—'],
];
const critClass  = (v) => v == null ? 'na' : v >= 8 ? 'great' : v >= 6 ? 'ok' : v >= 4 ? 'weak' : 'bad';
const pagePlatform = (p) => p.platform === 'instagram_official' ? '📷 IG' : '📘 FB';
const SCORE_COLORS = { great: '#10b981', ok: '#3b82f6', weak: '#f59e0b', bad: '#ef4444' };

export default function ChatQA() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [ready, setReady] = useState(false);

  // Setup / pages
  const [pages, setPages] = useState([]);
  const [openaiConfigured, setOpenaiConfigured] = useState(true);
  const [model, setModel] = useState('');
  const [setupError, setSetupError] = useState('');

  // Run panel
  const [showRunPanel, setShowRunPanel] = useState(false);
  const [runPage, setRunPage] = useState('');
  const [runAgents, setRunAgents] = useState([]);
  const [runAgent, setRunAgent] = useState('');
  const [runFrom, setRunFrom] = useState(phDate(-7));
  const [runTo, setRunTo] = useState(phDate(0));
  const [runSample, setRunSample] = useState(20);
  const [runName, setRunName] = useState('');
  const [runForce, setRunForce] = useState(false);
  const [starting, setStarting] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [showRuns, setShowRuns] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  // viewRun → the page shows a single run's report; showRunPanel without it → the "new analysis" screen
  const [viewRun, setViewRun] = useState(null);
  const pollRef = useRef(null);

  // Agents tab (capability ratings)
  const [pageTab, setPageTab] = useState('overview'); // 'overview' | 'agents'
  const [ratings, setRatings] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [rFrom, setRFrom] = useState(phDate(-29));
  const [rTo, setRTo] = useState(phDate(0));
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [agentMap, setAgentMap] = useState(null);
  const [showMapping, setShowMapping] = useState(false);
  const [weights, setWeights] = useState(null);
  const [showWeights, setShowWeights] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);

  // Results + filters
  const [fPage, setFPage] = useState('');
  const [fAgent, setFAgent] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fFlags, setFFlags] = useState(false);
  const [stats, setStats] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [trend, setTrend] = useState([]);
  const [agents, setAgents] = useState([]);
  const [convs, setConvs] = useState([]);
  const [convPage, setConvPage] = useState(1);
  const [convTotal, setConvTotal] = useState(0);
  const [workload, setWorkload] = useState(null);
  const [workloadLoading, setWorkloadLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CONV_PAGE_SIZE = 10;

  // Agent profile (tabbed: scorecard | chat QA) + conversation drill-down
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('scorecard');
  const [scorecard, setScorecard] = useState(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u.role !== 'Admin') { navigate('/dashboard'); return; }
    setReady(true);
  }, [navigate]);

  const loadPages = useCallback(async () => {
    try {
      const res = await getQaPages();
      setPages(res.data.pages || []);
      setOpenaiConfigured(res.data.openaiConfigured);
      setModel(res.data.model || '');
      setSetupError('');
      const first = (res.data.pages || []).find(p => p.hasToken);
      if (first) setRunPage(prev => prev || first.pageId);
    } catch (err) {
      setSetupError(err.response?.data?.error || 'Could not reach Pancake — check PANCAKE_ACCESS_TOKEN');
    }
  }, []);

  const filterParams = useCallback(() => ({
    pageId: fPage || undefined, agent: fAgent || undefined,
    from: fFrom || undefined, to: fTo || undefined,
    flagsOnly: fFlags ? '1' : undefined,
  }), [fPage, fAgent, fFrom, fTo, fFlags]);

  const loadResults = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // A run report is exactly the chats that run scored; the dashboard uses the filter bar
      const params = viewRun ? { runId: viewRun.id } : filterParams();
      const [sRes, cRes, rRes] = await Promise.all([
        getQaStats(params),
        getQaConversations({ ...params, page: convPage, pageSize: CONV_PAGE_SIZE }),
        getQaRuns(),
      ]);
      setStats(sRes.data.stats);
      setDistribution(sRes.data.distribution);
      setTrend(sRes.data.trend || []);
      setAgents(sRes.data.agents || []);
      setConvs(cRes.data.conversations || []);
      setConvTotal(cRes.data.total || 0);
      setRuns(rRes.data.runs || []);
      if (!viewRun && (sRes.data.stats?.analyzed || 0) === 0) setShowRunPanel(true);

      // The analysis runs on the server, so it survives closing this page.
      // On load: resume a run that is still going, or surface one that finished
      // while the page was away (until dismissed).
      const latest = (rRes.data.runs || [])[0];
      if (latest && !pollRef.current) {
        if (latest.status === 'Running') {
          setActiveRun(latest);
          pollRun(latest.id);
        } else {
          let ack = 0;
          try { ack = parseInt(localStorage.getItem('cqa-ack-run') || '0', 10); } catch { /* ignore */ }
          if (latest.id > ack) setActiveRun(prev => prev || latest);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load QA data');
    } finally { setLoading(false); }
  }, [filterParams, convPage, viewRun]);

  useEffect(() => { if (ready) loadPages(); }, [ready, loadPages]);
  useEffect(() => { if (ready) loadResults(); }, [ready, loadResults]);
  // Changing a filter (or opening/closing a run report) returns to the first page of results
  useEffect(() => { setConvPage(1); }, [fPage, fAgent, fFrom, fTo, fFlags, viewRun]);

  // Workload & response rate — needs one concrete page selected (hidden inside a run report)
  useEffect(() => {
    if (!ready || !fPage || viewRun) { setWorkload(null); return; }
    let alive = true;
    setWorkloadLoading(true);
    getQaWorkload(fPage, { from: fFrom || undefined, to: fTo || undefined })
      .then(r => { if (alive) setWorkload(r.data); })
      .catch(() => { if (alive) setWorkload(null); })
      .finally(() => { if (alive) setWorkloadLoading(false); });
    return () => { alive = false; };
  }, [ready, fPage, fFrom, fTo, viewRun]);

  useEffect(() => {
    if (!runPage) return;
    setRunAgents([]); setRunAgent('');
    getQaAgents(runPage).then(r => setRunAgents(r.data.agents || [])).catch(() => setRunAgents([]));
  }, [runPage]);

  const loadResultsRef = useRef(() => {});
  useEffect(() => { loadResultsRef.current = loadResults; }, [loadResults]);

  // Capability ratings — computed server-side from chats + bookings
  const loadRatings = useCallback(() => {
    setRatingsLoading(true);
    getQaRatings({ from: rFrom, to: rTo })
      .then(r => setRatings(r.data))
      .catch(err => { setRatings(null); setError(err.response?.data?.error || 'Failed to load agent ratings'); })
      .finally(() => setRatingsLoading(false));
  }, [rFrom, rTo]);
  useEffect(() => { if (ready && pageTab === 'agents') loadRatings(); }, [ready, pageTab, loadRatings]);

  const loadAgentMap = () => {
    getQaAgentMap().then(r => setAgentMap(r.data)).catch(() => setAgentMap(null));
  };
  const handleMapChange = async (pancakeName, crmAgent) => {
    try {
      await saveQaAgentMap({ pancakeName, crmAgent: crmAgent || null });
      setAgentMap(m => m ? { ...m, agents: m.agents.map(a => a.pancakeName === pancakeName ? { ...a, crmAgent: crmAgent || null, confirmed: true } : a) } : m);
      loadRatings(); // identities changed → ratings regroup
    } catch (err) { setError(err.response?.data?.error || 'Failed to save mapping'); }
  };
  const handleSaveWeights = async () => {
    if (!weights) return;
    setSavingWeights(true);
    try {
      const res = await saveAciWeights(weights.weights);
      setWeights(w => ({ ...w, weights: res.data.weights }));
      loadRatings();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save weights'); }
    finally { setSavingWeights(false); }
  };

  const notifyDone = (run) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Chat QA finished', {
          body: run.status === 'Done'
            ? `${run.name || `Run #${run.id}`}: ${run.convsAnalyzed} chats scored`
            : `${run.name || `Run #${run.id}`} failed`,
        });
      }
    } catch { /* notifications unavailable */ }
  };

  // Resilient polling: a transient error (network blip, server busy mid-run)
  // must never kill the loop — the run itself continues on the server.
  const pollRun = (runId) => {
    clearInterval(pollRef.current);
    let misses = 0;
    pollRef.current = setInterval(async () => {
      try {
        const res = await getQaRun(runId);
        misses = 0;
        const run = res.data.run;
        setActiveRun(run);
        if (run.status !== 'Running') {
          clearInterval(pollRef.current); pollRef.current = null;
          notifyDone(run);
          loadResultsRef.current();
        }
      } catch {
        misses++;
        if (misses >= 20) { // ~1.5 minutes of continuous failures → give up quietly
          clearInterval(pollRef.current); pollRef.current = null;
        }
      }
    }, 4000);
  };
  useEffect(() => () => clearInterval(pollRef.current), []);

  const dismissRun = (run) => {
    try { localStorage.setItem('cqa-ack-run', String(run.id)); } catch { /* ignore */ }
    setActiveRun(null);
  };

  // Open one run's report (its scored chats only); back returns to the dashboard
  const openRun = (run) => {
    if (run.status === 'Running' || !run.convsAnalyzed) return;
    setShowRunPanel(false);
    setViewRun(run);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => { setViewRun(null); setShowRunPanel(false); };

  const handleDeleteRun = async (run) => {
    if (!window.confirm(`Delete "${run.name || `Run #${run.id}`}" and the ${run.convsAnalyzed} chat score${run.convsAnalyzed !== 1 ? 's' : ''} it produced? This cannot be undone.`)) return;
    try {
      await deleteQaRun(run.id);
      if (activeRun?.id === run.id) setActiveRun(null);
      if (viewRun?.id === run.id) setViewRun(null);
      loadResultsRef.current();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete run');
    }
  };

  const handleRun = async () => {
    if (starting || activeRun?.status === 'Running') return; // double-click guard
    setStarting(true);
    try {
      setError('');
      // Ask once for browser notifications so a closed-tab run can announce itself on return
      try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
      const res = await startQaRun({
        pageId: runPage, from: runFrom, to: runTo, agentName: runAgent,
        sampleSize: Number(runSample), force: runForce, name: runName,
      });
      setActiveRun({ id: res.data.runId, name: runName, status: 'Running', convsAnalyzed: 0, sampleSize: Number(runSample) });
      setRunName('');
      // Return to the dashboard so the progress card and incoming results are visible
      setShowRunPanel(false); setViewRun(null);
      pollRun(res.data.runId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start run');
    } finally { setStarting(false); }
  };

  const loadScorecard = async (name, crmAgent) => {
    setScorecardLoading(true);
    try {
      const res = await getQaAgentScorecard(name, { from: fFrom || undefined, to: fTo || undefined, crmAgent: crmAgent || undefined });
      setScorecard(res.data);
    } catch { setScorecard(null); }
    finally { setScorecardLoading(false); }
  };

  const openProfile = async (name) => {
    setProfile({ agentName: name }); setProfileLoading(true);
    setProfileTab('scorecard'); setScorecard(null);
    loadScorecard(name); // in parallel with the QA profile
    try {
      const { agent, ...rest } = filterParams();
      const res = await getQaAgentProfile(name, rest);
      setProfile(res.data.profile);
    } catch { setProfile(null); }
    finally { setProfileLoading(false); }
  };

  // Scorecard row statuses — same spirit as the team's Google-Sheet coaching card
  const scStatus = (key, v) => {
    if (v == null) return ['—', 'na'];
    switch (key) {
      case 'bookingsCreated': return v === 0 ? ['⚠ Flag', 'bad'] : ['✓ OK', 'great'];
      case 'showRate':        return v >= 60 ? ['✓ OK', 'great'] : v >= 40 ? ['Watch', 'weak'] : ['⚠ Flag', 'bad'];
      case 'noShowRate':      return v <= 10 ? ['✓ OK', 'great'] : v <= 20 ? ['Watch', 'weak'] : ['⚠ Flag', 'bad'];
      case 'cancelRate':      return v <= 15 ? ['✓ OK', 'great'] : v <= 25 ? ['Watch', 'weak'] : ['⚠ Flag', 'bad'];
      case 'conversionRate':  return v >= 50 ? ['✓ OK', 'great'] : ['Watch', 'weak'];
      case 'chatQa':          return v >= 80 ? ['✓ OK', 'great'] : v >= 60 ? ['Watch', 'weak'] : ['⚠ Flag', 'bad'];
      default: return ['—', 'na'];
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true); setDetail({ id });
    try { const res = await getQaConversation(id); setDetail(res.data.conversation); }
    catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  if (!ready) return null;
  const tokenPages = pages.filter(p => p.hasToken);
  // Three screens on this page: dashboard (default), "new analysis" setup, and a single run's report
  const inNew = showRunPanel && !viewRun;
  const inReport = !!viewRun;
  const axis = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#334155' : '#e2e8f0';

  // ── Chart configs ──────────────────────────────────────────────────────────
  const distTotal = distribution ? (distribution.great + distribution.ok + distribution.weak + distribution.bad) : 0;
  const donutOptions = {
    chart: { type: 'donut', background: 'transparent', fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    labels: ['Great 80+', 'Good 60–79', 'Weak 40–59', 'Poor <40'],
    colors: [SCORE_COLORS.great, SCORE_COLORS.ok, SCORE_COLORS.weak, SCORE_COLORS.bad],
    legend: { position: 'bottom', labels: { colors: axis } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'chats', color: axis, formatter: () => String(distTotal) } } } } },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };

  const trendOptions = {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3b82f6'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 4 },
    xaxis: { categories: trend.map(t => t.day.slice(5)), labels: { style: { colors: axis, fontSize: '11px' } } },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { style: { colors: axis } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v, { dataPointIndex }) => `${v}/100 · ${trend[dataPointIndex]?.convs ?? 0} chats` } },
    markers: { size: 4 },
  };

  const profileRadarOptions = profile?.criteria ? {
    chart: { type: 'radar', background: 'transparent', toolbar: { show: false }, fontFamily: 'inherit' },
    theme: { mode: isDark ? 'dark' : 'light' },
    xaxis: { categories: CRITERIA.map(([, l]) => l), labels: { style: { colors: CRITERIA.map(() => axis), fontSize: '11px' } } },
    yaxis: { min: 0, max: 10, tickAmount: 5, labels: { style: { colors: [axis] } } },
    colors: ['#3b82f6'],
    fill: { opacity: 0.25 },
    stroke: { width: 2 },
    markers: { size: 3 },
    plotOptions: { radar: { polygons: { strokeColors: grid, connectorColors: grid } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => `${v}/10` } },
  } : null;

  const profileTrendOptions = profile?.trend?.length ? {
    ...trendOptions,
    xaxis: { categories: profile.trend.map(t => t.day.slice(5)), labels: { style: { colors: axis, fontSize: '11px' } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v, { dataPointIndex }) => `${v}/100 · ${profile.trend[dataPointIndex]?.convs ?? 0} chats` } },
  } : null;

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container cqa-page">

          {/* ── Header ── */}
          <div className="page-header">
            <div className="cqa-title-wrap">
              {(inNew || inReport) && (
                <button className="cqa-back" onClick={goBack} title="Back to the QA dashboard">
                  <FiArrowLeft size={16} /> Back
                </button>
              )}
              <div>
                <h1 className="page-title">
                  {inReport ? (viewRun.name || `Run #${viewRun.id}`) : inNew ? 'New analysis' : 'Chat QA'}
                </h1>
                <p className="page-subtitle">
                  {inReport ? 'Report — only the chats this run scored'
                    : inNew ? 'Pick a page and period — a random sample is pulled from Pancake and scored by GPT'
                    : 'GPT-scored quality of agent conversations from Pancake'}
                  {!inReport && !inNew && model && <span className="cqa-model">{model}</span>}
                </p>
              </div>
            </div>
            <div className="cqa-head-actions">
              <button className="refresh-btn" onClick={() => { loadPages(); loadResults(); }} disabled={loading}>
                <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </button>
              {!inNew && (
                <button className="cqa-runbtn" onClick={() => { setViewRun(null); setShowRunPanel(true); }}>
                  <FiPlus size={15} /> New analysis
                </button>
              )}
            </div>
          </div>

          {setupError && <div className="leads-error-banner"><FiAlertTriangle size={14} /> {setupError}</div>}
          {!openaiConfigured && <div className="leads-error-banner">OPENAI_API_KEY is not set on the server — runs will not start.</div>}
          {error && <div className="leads-error-banner">{error}</div>}

          {/* ── New analysis screen (results hidden while setting one up) ── */}
          {inNew && (
            <div className="cqa-runpanel">
              <div className="cqa-runpanel-title">Analyze conversations <span>the report appears on the dashboard as soon as the run finishes · chats scored before are reused at no cost — tick Re-score to force fresh scoring</span></div>
              <div className="cqa-runrow">
                <label>Run name
                  <input value={runName} onChange={e => setRunName(e.target.value)} placeholder="e.g. TBF week 47 review" maxLength={140} style={{ minWidth: 180 }} />
                </label>
                <label>Page
                  <select value={runPage} onChange={e => setRunPage(e.target.value)}>
                    {tokenPages.length === 0 && <option value="">No pages configured</option>}
                    {tokenPages.map(p => <option key={p.pageId} value={p.pageId}>{pagePlatform(p)} · {p.label}</option>)}
                  </select>
                </label>
                <label>Agent
                  <select value={runAgent} onChange={e => setRunAgent(e.target.value)}>
                    <option value="">All agents</option>
                    {runAgents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </label>
                <label>From<input type="date" value={runFrom} max={phDate(0)} onChange={e => setRunFrom(e.target.value)} /></label>
                <label>To<input type="date" value={runTo} min={runFrom || undefined} max={phDate(0)} onChange={e => setRunTo(e.target.value)} /></label>
                <label>Chats to score<input type="number" min="1" max="200" value={runSample} onChange={e => setRunSample(e.target.value)} onWheel={e => e.currentTarget.blur()} /></label>
                <label className="cqa-check" style={{ alignSelf: 'center' }} title="Scores chats again even if they were analyzed before (useful after rubric or date-window fixes)">
                  <input type="checkbox" checked={runForce} onChange={e => setRunForce(e.target.checked)} /> Re-score analyzed
                </label>
                <button className="cqa-runbtn solid" onClick={handleRun} disabled={!runPage || !openaiConfigured || starting || activeRun?.status === 'Running'}>
                  {starting ? <><span className="cqa-spinner" /> Starting…</>
                    : activeRun?.status === 'Running' ? <><span className="cqa-spinner" /> Running…</>
                    : <><FiPlay size={14} /> Analyze</>}
                </button>
              </div>
            </div>
          )}

          {activeRun && (
            <div className={`cqa-progress ${activeRun.status.toLowerCase()}`}>
              {activeRun.status === 'Running' ? (
                <>
                  <span className="cqa-spinner dark" />
                  <strong>{activeRun.name || `Run #${activeRun.id}`}</strong>
                  <span>{activeRun.convsAnalyzed || 0} / {activeRun.sampleSize} chats{activeRun.convsFound ? ` · ${activeRun.convsFound} found in range` : ''}</span>
                  <span className="cqa-bar"><span style={{ width: `${Math.min(100, ((activeRun.convsAnalyzed || 0) / (activeRun.sampleSize || 1)) * 100)}%` }} /></span>
                  <span className="cqa-muted">runs on the server — safe to close this page</span>
                </>
              ) : activeRun.status === 'Done' ? (
                <>
                  <strong>{activeRun.name || `Run #${activeRun.id}`}</strong>
                  <span>finished — {activeRun.convsAnalyzed} analyzed{activeRun.convsReused ? `, ${activeRun.convsReused} reused (no GPT cost)` : ''}, {activeRun.convsSkipped || 0} skipped, {activeRun.convsFailed || 0} failed</span>
                  <button className="cqa-dismiss" onClick={() => dismissRun(activeRun)}><FiX size={13} /></button>
                </>
              ) : (
                <>
                  <strong>{activeRun.name || `Run #${activeRun.id}`}</strong>
                  <span>failed: {activeRun.error}</span>
                  <button className="cqa-dismiss" onClick={() => dismissRun(activeRun)}><FiX size={13} /></button>
                </>
              )}
            </div>
          )}

          {/* ── Report meta (single-run view) ── */}
          {inReport && (
            <div className="cqa-reportbar">
              <FiFileText size={15} />
              <span><b>{viewRun.pageName}</b></span>
              <span>{viewRun.since?.slice(0, 10)} → {viewRun.until?.slice(0, 10)}</span>
              <span>Agent: <b>{viewRun.agentFilter || 'All'}</b></span>
              <span>{viewRun.convsAnalyzed} analyzed{viewRun.convsReused ? ` · ${viewRun.convsReused} reused` : ''}{viewRun.convsSkipped ? ` · ${viewRun.convsSkipped} skipped` : ''}{viewRun.convsFailed ? ` · ${viewRun.convsFailed} failed` : ''}</span>
              <span className="cqa-muted">by {viewRun.createdByName || '—'} · {fmtWhen(viewRun.createdAt)}</span>
            </div>
          )}

          {/* ── Page tabs: QA overview vs agent capability ratings ── */}
          {!inNew && !inReport && (
            <div className="cqa-pagetabs">
              <button className={pageTab === 'overview' ? 'active' : ''} onClick={() => setPageTab('overview')}>
                <FiTrendingUp size={14} /> Overview
              </button>
              <button className={pageTab === 'agents' ? 'active' : ''} onClick={() => setPageTab('agents')}>
                <FiAward size={14} /> Agents
              </button>
            </div>
          )}

          {/* ── Filters (dashboard only — a report is fixed to its run) ── */}
          {!inNew && !inReport && pageTab === 'overview' && (
          <div className="cqa-filters">
            <select value={fPage} onChange={e => setFPage(e.target.value)}>
              <option value="">All pages</option>
              {pages.map(p => <option key={p.pageId} value={p.pageId}>{pagePlatform(p)} · {p.label}</option>)}
            </select>
            <input placeholder="Agent name…" value={fAgent} onChange={e => setFAgent(e.target.value)} />
            <input type="date" value={fFrom} max={phDate(0)} onChange={e => setFFrom(e.target.value)} />
            <span className="cqa-arrow">→</span>
            <input type="date" value={fTo} min={fFrom || undefined} max={phDate(0)} onChange={e => setFTo(e.target.value)} />
            <label className="cqa-check"><input type="checkbox" checked={fFlags} onChange={e => setFFlags(e.target.checked)} /> Red flags only</label>
            {(fPage || fAgent || fFrom || fTo || fFlags) && (
              <button className="cqa-clear" onClick={() => { setFPage(''); setFAgent(''); setFFrom(''); setFTo(''); setFFlags(false); }}>Clear filters</button>
            )}
          </div>
          )}

          {!inNew && (inReport || pageTab === 'overview') && (
          <>
          {/* ── KPIs ── */}
          <div className="cqa-kpis">
            <div className="cqa-kpi"><b>{stats?.analyzed ?? '—'}</b><span>Chats analyzed</span></div>
            <div className={`cqa-kpi score-${scoreClass(stats?.avgScore)}`}><b>{stats?.avgScore ?? '—'}</b><span>Avg score / 100</span></div>
            <div className="cqa-kpi flag"><b>{stats?.flagged ?? '—'}</b><span>Red-flagged</span></div>
            <div className="cqa-kpi"><b>{fmtSec(stats?.medianFirstResponseSec)}</b><span>Median first response</span></div>
            <div className="cqa-kpi"><b>{stats?.bookingPushRate != null ? `${stats.bookingPushRate}%` : '—'}</b><span>Strong booking push</span></div>
          </div>

          {loading ? <Loader message="Loading QA data…" /> : (stats?.analyzed || 0) === 0 ? (
            <div className="leads-empty"><FiMessageSquare size={36} />
              {activeRun?.status === 'Running'
                ? <><p>Analysis in progress</p><span>Scored chats will appear here as the run finishes — it keeps running even if you close this page.</span></>
                : <><p>No scored chats match these filters</p><span>Adjust the filters, or start a run with “New analysis”.</span></>}
            </div>
          ) : (
            <>
              {/* ── Charts ── */}
              <div className="cqa-charts">
                <div className="cqa-chartcard">
                  <h3>Score distribution</h3>
                  <ReactApexChart type="donut" height={230} options={donutOptions}
                    series={distribution ? [distribution.great, distribution.ok, distribution.weak, distribution.bad] : []} />
                </div>
                <div className="cqa-chartcard wide">
                  <h3><FiTrendingUp size={13} /> Average score by day</h3>
                  {trend.length > 1 ? (
                    <ReactApexChart type="area" height={230} options={trendOptions}
                      series={[{ name: 'Avg score', data: trend.map(t => t.avgScore) }]} />
                  ) : <div className="cqa-chart-empty">Trend appears once chats span more than one day.</div>}
                </div>
              </div>

              {/* ── Workload & response rate (all chats, from Pancake) — dashboard only ── */}
              {!inReport && (
              <div className="cqa-section">
                <h3>Workload &amp; response rate
                  <span className="cqa-hint">
                    {fPage
                      ? `every chat on ${pages.find(p => p.pageId === fPage)?.label || 'this page'} · ${workload ? `${workload.from} → ${workload.to}` : ''} · Pancake data, not just the sampled chats`
                      : 'select a page in the filters above to see assigned chats per agent'}
                  </span>
                </h3>
                {fPage && (workloadLoading ? (
                  <div className="cqa-chart-empty">Counting conversations on Pancake… (first load takes a few seconds)</div>
                ) : workload && workload.agents.length > 0 ? (
                  <div className="cqa-tablewrap">
                    <table className="bookings-table cqa-table">
                      <thead>
                        <tr>
                          <th>Agent</th><th>Chats assigned</th><th>Per day</th>
                          <th>Responded</th><th>Response rate</th><th>Messages sent</th><th>Avg response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workload.agents.map(w => (
                          <tr key={w.agentName} className="cqa-agentrow" onClick={() => openProfile(w.agentName)}>
                            <td><strong>{w.agentName}</strong></td>
                            <td>{w.assigned}</td>
                            <td><b>{w.assignedPerDay}</b><span className="cqa-muted"> /day</span></td>
                            <td>{w.respondedUnique ?? '—'}</td>
                            <td>
                              {w.responseRate != null
                                ? <span className={`cqa-pill score-${w.responseRate >= 80 ? 'great' : w.responseRate >= 60 ? 'ok' : w.responseRate >= 40 ? 'weak' : 'bad'}`}>{w.responseRate}%</span>
                                : '—'}
                            </td>
                            <td>{w.messagesSent != null ? w.messagesSent.toLocaleString() : '—'}</td>
                            <td>{fmtSec(w.avgResponseSec)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="cqa-chart-empty">No workload data for this page and period.</div>
                ))}
              </div>
              )}

              {/* ── Agent cards ── */}
              <div className="cqa-section">
                <h3>Quality by agent <span className="cqa-hint">GPT-scored sample · click an agent to open their profile</span></h3>
                <div className="cqa-agentgrid">
                  {agents.map(a => (
                    <button key={a.agentName} className="cqa-agentcard" onClick={() => openProfile(a.agentName)}>
                      <div className="cqa-agentcard-top">
                        <span className="cqa-avatar"><FiUser size={15} /></span>
                        <div className="cqa-agentcard-name">
                          <strong>{a.agentName}</strong>
                          <span>{a.convs} chat{a.convs !== 1 ? 's' : ''} · 1st resp {fmtSec(a.avgFirstResponseSec)}</span>
                        </div>
                        <span className={`cqa-pill big score-${scoreClass(a.avgScore)}`}>{a.avgScore}</span>
                      </div>
                      <div className="cqa-minibar-row">
                        {CRITERIA.map(([k, l]) => {
                          const v = a.criteria[k] != null ? Number(a.criteria[k]) : null;
                          return (
                            <div key={k} className="cqa-minibar" title={`${l}: ${v ?? '—'}/10`}>
                              <span className="cqa-track"><i className={`crit-bg-${critClass(v)}`} style={{ height: `${(v ?? 0) * 10}%` }} /></span>
                              <label>{l.slice(0, 4)}</label>
                            </div>
                          );
                        })}
                        <div className="cqa-agentcard-meta">
                          {a.flagged > 0 && <span className="cqa-flagcount"><FiFlag size={10} /> {a.flagged}</span>}
                          <FiChevronRight size={15} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Conversations (paginated) ── */}
              <div className="cqa-section">
                <h3>Scored conversations <span className="cqa-count">{convTotal}</span></h3>
                <div className="cqa-tablewrap">
                  <table className="bookings-table cqa-table">
                    <thead>
                      <tr><th>When</th><th>Page</th><th>Customer</th><th>Agent</th><th>Score</th><th>Flags</th><th>Summary</th></tr>
                    </thead>
                    <tbody>
                      {convs.map(c => (
                        <tr key={c.id} className="cqa-convrow" onClick={() => openDetail(c.id)}>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtWhen(c.lastMsgAt)}</td>
                          <td>{c.pageName}</td>
                          <td><strong>{c.customerName || '—'}</strong></td>
                          <td>{c.agentName || '—'}</td>
                          <td><span className={`cqa-pill score-${scoreClass(c.overall)}`}>{c.overall}</span></td>
                          <td>{(c.redFlags || []).length > 0 ? <span className="cqa-flagcount"><FiFlag size={11} /> {c.redFlags.length}</span> : '—'}</td>
                          <td className="cqa-summary" title={c.summary}>{c.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {convTotal > CONV_PAGE_SIZE && (
                  <div className="cqa-pagination">
                    <button disabled={convPage <= 1} onClick={() => setConvPage(p => p - 1)}>‹ Prev</button>
                    <span>
                      {(convPage - 1) * CONV_PAGE_SIZE + 1}–{Math.min(convPage * CONV_PAGE_SIZE, convTotal)} of {convTotal}
                    </span>
                    <button disabled={convPage * CONV_PAGE_SIZE >= convTotal} onClick={() => setConvPage(p => p + 1)}>Next ›</button>
                  </div>
                )}
              </div>

              {/* ── Run history (collapsed) — dashboard only ── */}
              {!inReport && (
              <div className="cqa-section">
                <button className="cqa-toggle" onClick={() => setShowRuns(s => !s)}>
                  <FiClock size={13} /> Run history ({runs.length}) {showRuns ? '▴' : '▾'}
                </button>
                {showRuns && (
                  <div className="cqa-tablewrap" style={{ marginTop: 10 }}>
                    <table className="bookings-table cqa-table">
                      <thead><tr><th>#</th><th>Name</th><th>Page</th><th>Range</th><th>Agent</th><th>Status</th><th>Analyzed</th><th>Tokens</th><th>By</th><th>Started</th><th></th></tr></thead>
                      <tbody>
                        {runs.slice((runsPage - 1) * 10, runsPage * 10).map(r => {
                          const openable = r.status !== 'Running' && (r.convsAnalyzed + (r.convsReused || 0)) > 0;
                          return (
                          <tr key={r.id} className={openable ? 'cqa-runrow-open' : ''} onClick={() => openable && openRun(r)}
                              title={openable ? 'Open this report' : r.status === 'Running' ? 'Still running' : 'No scored chats in this run'}>
                            <td>{r.id}</td>
                            <td className="cqa-summary" title={r.name}>
                              {openable
                                ? <button className="cqa-runlink" onClick={e => { e.stopPropagation(); openRun(r); }}>{r.name || `Run #${r.id}`}</button>
                                : <strong>{r.name || '—'}</strong>}
                            </td>
                            <td>{r.pageName}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.since?.slice(0, 10)} → {r.until?.slice(0, 10)}</td>
                            <td>{r.agentFilter || 'All'}</td>
                            <td><span className={`cqa-pill run-${r.status.toLowerCase()}`}>{r.status}</span></td>
                            <td>{r.convsAnalyzed}{r.convsReused > 0 ? ` +${r.convsReused} reused` : ''}{r.convsFailed > 0 ? ` (+${r.convsFailed} failed)` : ''}</td>
                            <td>{(r.tokensIn + r.tokensOut).toLocaleString()}</td>
                            <td>{r.createdByName || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{fmtWhen(r.createdAt)}</td>
                            <td>
                              {r.status !== 'Running' && (
                                <button className="cqa-del" title="Delete this report and its chat scores" onClick={e => { e.stopPropagation(); handleDeleteRun(r); }}>
                                  <FiTrash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {runs.length > 10 && (
                      <div className="cqa-pagination">
                        <button disabled={runsPage <= 1} onClick={() => setRunsPage(p => p - 1)}>‹ Prev</button>
                        <span>{(runsPage - 1) * 10 + 1}–{Math.min(runsPage * 10, runs.length)} of {runs.length}</span>
                        <button disabled={runsPage * 10 >= runs.length} onClick={() => setRunsPage(p => p + 1)}>Next ›</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </>
          )}
          </>
          )}

          {/* ── Agents tab: capability leaderboard, mapping, weights ── */}
          {!inNew && !inReport && pageTab === 'agents' && (
            <div className="cqa-agents-tab">
              <div className="cqa-filters">
                <input type="date" value={rFrom} max={phDate(0)} onChange={e => setRFrom(e.target.value)} />
                <span className="cqa-arrow">→</span>
                <input type="date" value={rTo} min={rFrom || undefined} max={phDate(0)} onChange={e => setRTo(e.target.value)} />
                <label className="cqa-check">
                  <input type="checkbox" checked={showAllAgents} onChange={e => setShowAllAgents(e.target.checked)} /> Include agents without chats
                </label>
                <span style={{ flex: 1 }} />
                <button className="cqa-clear" onClick={() => { setShowMapping(s => !s); if (!agentMap) loadAgentMap(); }}>
                  <FiLink size={12} /> Agent mapping
                </button>
                <button className="cqa-clear" onClick={() => {
                  setShowWeights(s => !s);
                  if (!weights) getAciWeights().then(r => setWeights(r.data)).catch(() => {});
                }}>
                  <FiSliders size={12} /> ACI weights
                </button>
              </div>

              {showWeights && weights && (
                <div className="cqa-panelbox">
                  <h4>ACI component weights <span className="cqa-hint">missing data re-weights automatically — components never count as zero</span></h4>
                  <div className="cqa-weights-row">
                    {ACI_COMPONENTS.map(([k, label]) => (
                      <label key={k}>{label}
                        <input type="number" min="0" max="100" value={weights.weights[k] ?? 0}
                          onChange={e => setWeights(w => ({ ...w, weights: { ...w.weights, [k]: Number(e.target.value) } }))} />
                      </label>
                    ))}
                    <button className="cqa-runbtn solid" onClick={handleSaveWeights} disabled={savingWeights}>
                      {savingWeights ? 'Saving…' : 'Save & recompute'}
                    </button>
                    <button className="cqa-clear" onClick={() => setWeights(w => ({ ...w, weights: { ...w.defaults } }))}>Reset to defaults</button>
                  </div>
                </div>
              )}

              {showMapping && (
                <div className="cqa-panelbox">
                  <h4>Pancake → CRM agent mapping <span className="cqa-hint">confirm once — scorecards, ratings and learning then always use the right identity</span></h4>
                  {!agentMap ? <div className="cqa-chart-empty">Loading…</div> : (
                    <div className="cqa-tablewrap">
                      <table className="bookings-table cqa-table">
                        <thead><tr><th>Pancake agent</th><th>Chats scored</th><th>CRM booking agent</th><th>Status</th></tr></thead>
                        <tbody>
                          {agentMap.agents.map(a => (
                            <tr key={a.pancakeName}>
                              <td><strong>{a.pancakeName}</strong></td>
                              <td>{a.convs}</td>
                              <td>
                                <select value={a.crmAgent || ''} onChange={e => handleMapChange(a.pancakeName, e.target.value)}>
                                  <option value="">— no CRM agent —</option>
                                  {agentMap.crmAgents.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td>
                                {a.confirmed
                                  ? <span className="cqa-pill score-great">✓ Confirmed</span>
                                  : a.crmAgent
                                    ? <span className="cqa-pill score-ok">Auto-matched</span>
                                    : <span className="cqa-pill score-na">Unmatched</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {ratingsLoading ? <Loader message="Computing capability ratings…" /> : !ratings ? (
                <div className="cqa-chart-empty">Could not compute ratings.</div>
              ) : (() => {
                const list = ratings.agents.filter(a => a.aci != null && (showAllAgents || a.convs > 0));
                if (!list.length) return <div className="leads-empty"><FiAward size={36} /><p>No rated agents in this period</p><span>Run a chat analysis first, or tick “Include agents without chats”.</span></div>;
                return (
                  <div className="cqa-section">
                    <h3>Agent Capability Index
                      <span className="cqa-hint">{ratings.from} → {ratings.to} · Δ vs {ratings.prevFrom} → {ratings.prevTo} · click an agent for their profile</span>
                    </h3>
                    <div className="cqa-lb">
                      {list.map((a, i) => (
                        <button key={a.agentKey} className="cqa-lb-row" onClick={() => a.profileName && openProfile(a.profileName)}
                          title={a.profileName ? 'Open profile' : 'No scored chats yet — booking data only'}>
                          <span className="cqa-lb-rank">{i + 1}</span>
                          <span className={`cqa-tier t${a.tier}`}>{a.tier}</span>
                          <span className="cqa-lb-name">
                            <strong>{a.agentKey}</strong>
                            <span>
                              {a.convs > 0 ? `${a.convs} chats` : 'no chats'}
                              {a.bookings ? ` · ${a.bookings.created} bookings · ₱${Math.round(a.bookings.revenue).toLocaleString()}` : ''}
                              {a.pancakeNames.length > 0 && a.crmAgent && a.pancakeNames[0] !== a.crmAgent ? ` · ${a.pancakeNames.join(', ')}` : ''}
                            </span>
                          </span>
                          <span className="cqa-lb-comps">
                            {ACI_COMPONENTS.map(([k, label, fmt]) => {
                              const c = a.components[k];
                              return (
                                <span key={k} className="cqa-comp" title={`${label}: ${fmt(c.value)} → ${c.score ?? '—'}/100 (weight ${c.weight}%)`}>
                                  <label>{label}</label>
                                  <span className="cqa-comp-track"><i className={`crit-bg-${c.score == null ? 'na' : scoreClass(c.score)}`} style={{ width: `${c.score ?? 0}%` }} /></span>
                                </span>
                              );
                            })}
                          </span>
                          <span className="cqa-lb-aci">
                            <b className={`aci-${scoreClass(a.aci)}`}>{Math.round(a.aci)}</b>
                            {a.delta != null && <span className={`cqa-delta ${a.delta >= 0 ? 'up' : 'down'}`}>{a.delta >= 0 ? '▲' : '▼'} {Math.abs(a.delta)}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Agent profile ── */}
      {profile && (
        <div className="modal-overlay" onClick={() => setProfile(null)}>
          <div className="modal-content dr-modal-wide cqa-modal" onClick={e => e.stopPropagation()}>
            <div className="cqa-modal-head">
              <div className="cqa-profile-head">
                <span className="cqa-avatar lg"><FiUser size={20} /></span>
                <div>
                  <h3>{profile.agentName}</h3>
                  {!profileLoading && <span className="cqa-muted">{profile.convs} chats scored{fFrom || fTo ? ' in selected period' : ''} · range {profile.minScore}–{profile.maxScore}</span>}
                </div>
                {!profileLoading && <span className={`cqa-pill big score-${scoreClass(profile.avgScore)}`}>{profile.avgScore} / 100</span>}
              </div>
              <button onClick={() => setProfile(null)}><FiX size={18} /></button>
            </div>

            {/* Tabs: booking scorecard vs chat quality */}
            <div className="cqa-tabs">
              <button className={profileTab === 'scorecard' ? 'active' : ''} onClick={() => setProfileTab('scorecard')}>Scorecard</button>
              <button className={profileTab === 'chatqa' ? 'active' : ''} onClick={() => setProfileTab('chatqa')}>Chat QA</button>
            </div>

            {profileTab === 'scorecard' ? (
              scorecardLoading ? <div className="cqa-modal-loading">Building scorecard…</div> :
              !scorecard ? <div className="cqa-modal-loading">Could not load the scorecard.</div> : (
                <div className="cqa-profile-body">
                  <div className="cqa-sc-meta">
                    <span>Period <b>{scorecard.from} → {scorecard.to}</b>{!fFrom && !fTo ? ' (last 7 days — set dates in the filters to change)' : ''}</span>
                    <label>CRM booking agent
                      <select
                        value={scorecard.matchedCrmAgent || ''}
                        onChange={e => loadScorecard(profile.agentName, e.target.value)}
                      >
                        <option value="">— not matched —</option>
                        {scorecard.crmAgents.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                  </div>

                  {!scorecard.matchedCrmAgent ? (
                    <div className="cqa-chart-empty">
                      No CRM booking agent auto-matched “{profile.agentName}”. Pick one above to load their booking metrics — the Chat QA row below works either way.
                    </div>
                  ) : null}

                  <div className="cqa-tablewrap">
                    <table className="bookings-table cqa-table cqa-sc-table">
                      <thead><tr><th>Metric</th><th>Value</th><th>Status</th></tr></thead>
                      <tbody>
                        {scorecard.metrics && (() => {
                          const m = scorecard.metrics;
                          const rows = [
                            ['Bookings created', m.bookingsCreated, scStatus('bookingsCreated', m.bookingsCreated)],
                            ['Appointments in period', m.appointments, ['—', 'na']],
                            ['Arrived', m.arrived, ['—', 'na']],
                            ['Arrival / show rate', m.showRate != null ? `${m.showRate}%` : '—', scStatus('showRate', m.showRate)],
                            ['No-show rate', m.noShowRate != null ? `${m.noShowRate}%` : '—', scStatus('noShowRate', m.noShowRate)],
                            ['Cancellation rate', m.cancelRate != null ? `${m.cancelRate}%` : '—', scStatus('cancelRate', m.cancelRate)],
                            ['Conversion (bought / arrived)', m.conversionRate != null ? `${m.conversionRate}%` : '—', scStatus('conversionRate', m.conversionRate)],
                            ['Revenue (₱)', `₱${(m.revenue || 0).toLocaleString()}`, ['—', 'na']],
                            ['Revenue / arrival (₱)', m.revenuePerArrival != null ? `₱${m.revenuePerArrival.toLocaleString()}` : '—', ['—', 'na']],
                          ];
                          return rows.map(([label, value, [stLabel, stCls]]) => (
                            <tr key={label}>
                              <td>{label}</td>
                              <td><b>{value}</b></td>
                              <td><span className={`cqa-pill score-${stCls}`}>{stLabel}</span></td>
                            </tr>
                          ));
                        })()}
                        <tr className="cqa-sc-qa-row">
                          <td>Chat QA score <span className="cqa-muted">({scorecard.chatQa.convs} chat{scorecard.chatQa.convs !== 1 ? 's' : ''} scored{scorecard.chatQa.flagged ? `, ${scorecard.chatQa.flagged} flagged` : ''})</span></td>
                          <td><b>{scorecard.chatQa.avgScore != null ? `${scorecard.chatQa.avgScore}%` : '—'}</b></td>
                          <td><span className={`cqa-pill score-${scStatus('chatQa', scorecard.chatQa.avgScore)[1]}`}>{scStatus('chatQa', scorecard.chatQa.avgScore)[0]}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="cqa-muted" style={{ fontSize: '0.76rem', marginTop: 10 }}>
                    Booking metrics come from Master Bookings for the matched CRM agent; Chat QA comes from the GPT-scored Pancake chats. Dials and attendance stay in your sheet for now.
                  </p>
                </div>
              )
            ) : profileLoading ? <div className="cqa-modal-loading">Loading profile…</div> : (
              <div className="cqa-profile-body">
                {profile.insight && (profile.insight.strengths?.length > 0 || profile.insight.weaknesses?.length > 0) && (
                  <div className="cqa-insight-strip">
                    <span className="cqa-muted">Learned so far ({profile.insight.allTimeConvs} chats all-time):</span>
                    {profile.insight.strengths.map(s => <span key={s} className="cqa-pill score-great">↑ {s}</span>)}
                    {profile.insight.weaknesses.map(w => <span key={w} className="cqa-pill score-weak">↓ {w}</span>)}
                  </div>
                )}
                <div className="cqa-profile-stats">
                  <div><b className={critClass(10 - (profile.flagged || 0)) ? '' : ''}>{profile.flagged}</b><span>Red-flagged chats</span></div>
                  <div><b>{profile.bookingPushRate != null ? `${profile.bookingPushRate}%` : '—'}</b><span>Strong booking push</span></div>
                  <div><b>{fmtSec(profile.avgFirstResponseSec)}</b><span>Avg first response</span></div>
                  <div><b>{profile.leftUnanswered}</b><span>Customers left unanswered</span></div>
                </div>

                <div className="cqa-profile-charts">
                  <div className="cqa-chartcard">
                    <h3>Quality shape</h3>
                    {profileRadarOptions && (
                      <ReactApexChart type="radar" height={260} options={profileRadarOptions}
                        series={[{ name: profile.agentName, data: CRITERIA.map(([k]) => profile.criteria[k] != null ? Number(profile.criteria[k]) : 0) }]} />
                    )}
                  </div>
                  <div className="cqa-chartcard">
                    <h3>Score over time</h3>
                    {profileTrendOptions && profile.trend.length > 1 ? (
                      <ReactApexChart type="area" height={260} options={profileTrendOptions}
                        series={[{ name: 'Avg score', data: profile.trend.map(t => t.avgScore) }]} />
                    ) : <div className="cqa-chart-empty">Needs chats on more than one day.</div>}
                  </div>
                </div>

                <div className="cqa-profile-cols">
                  <div>
                    <h4><FiFlag size={12} /> Red flags</h4>
                    {profile.flags.length === 0 ? <p className="cqa-note cqa-muted">None — clean record in this period.</p> : (
                      <ul className="cqa-flags">{profile.flags.map((f, i) => <li key={i}>{f.flag} <b>×{f.count}</b></li>)}</ul>
                    )}
                  </div>
                  <div>
                    <h4>Coaching themes</h4>
                    {profile.coachingTips.length === 0 ? <p className="cqa-note cqa-muted">No tips yet.</p> : (
                      <ul className="cqa-tips">{profile.coachingTips.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul>
                    )}
                  </div>
                </div>

                <h4 className="cqa-profile-chats-h">This agent's chats — click to read</h4>
                <div className="cqa-tablewrap">
                  <table className="bookings-table cqa-table">
                    <thead><tr><th>When</th><th>Page</th><th>Customer</th><th>Score</th><th>Flags</th><th>Summary</th></tr></thead>
                    <tbody>
                      {profile.conversations.map(c => (
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
            )}
          </div>
        </div>
      )}

      {/* ── Conversation drill-down (stacks above the profile) ── */}
      {detail && (
        <div className="modal-overlay cqa-overlay-top" onClick={() => setDetail(null)}>
          <div className="modal-content dr-modal-wide cqa-modal" onClick={e => e.stopPropagation()}>
            <div className="cqa-modal-head">
              <div>
                <h3>{detail.customerName || 'Conversation'} <span className="cqa-muted">· {detail.agentName} · {detail.pageName}</span></h3>
                {!detailLoading && <span className={`cqa-pill big score-${scoreClass(detail.overall)}`}>{detail.overall} / 100</span>}
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
                  <h4>Sentiment</h4>
                  <p className="cqa-note">{detail.sentimentStart} → {detail.sentimentEnd}{detail.followthrough === false ? ' · customer left unanswered' : ''}</p>
                  <h4>Booking outcome</h4>
                  {(detail.linkedBookings || []).length > 0 ? (
                    <ul className="cqa-flags cqa-outcome">
                      {detail.linkedBookings.map((b, i) => (
                        <li key={i}>
                          <b>{b.status || 'Booked'}</b> · {b.branch} · {b.treatment || '—'}
                          {b.totalPrice > 0 ? ` · ₱${b.totalPrice.toLocaleString()}` : ''}
                          <span className="cqa-muted"> (booked {String(b.bookingDate || '').slice(0, 10)}{b.agent ? ` by ${b.agent}` : ''})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="cqa-note cqa-muted">
                      {detail.hasPhone ? 'No CRM booking within 7 days of this chat.' : 'No phone captured for this chat (scored before phone tracking) — re-score to enable attribution.'}
                    </p>
                  )}
                  <h4>Summary</h4>
                  <p className="cqa-note">{detail.summary}</p>
                  <h4>Coaching tip</h4>
                  <p className="cqa-note cqa-tip">{detail.coachingTip}</p>
                  <p className="cqa-muted" style={{ fontSize: '0.72rem' }}>Scored by {detail.model} · {fmtWhen(detail.analyzedAt)} · first response {fmtSec(detail.firstResponseSec)} · worst gap {fmtSec(detail.maxGapSec)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
