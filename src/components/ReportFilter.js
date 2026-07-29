import React, { useState, useRef, useEffect } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import './ReportFilter.css';

// Convert a filter value → query params for the report endpoints
export const filterToParams = (f) => {
  const p = {};
  if (!f) return p;
  if (f.branches && f.branches.length) p.fBranch = f.branches.join(',');
  if (f.agents && f.agents.length)     p.fAgent  = f.agents.join(',');
  if (p.fBranch || p.fAgent)           p.fLogic  = f.logic || 'and';
  return p;
};

export const EMPTY_FILTER = { logic: 'and', branches: [], agents: [] };

/**
 * Monday-style scope filter for the report pages. Scopes every widget on the page
 * to the selected Branch(es)/Agent(s). Within a field, values are OR; between
 * fields they combine with AND or OR (the "Match" toggle).
 *
 * Props: branches[], agents[], value {logic,branches,agents}, onApply(value)
 */
function ReportFilter({ branches = [], agents = [], value = EMPTY_FILTER, onApply }) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  // Sync draft to committed value whenever the panel opens
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const activeCount = (value.branches ? value.branches.length : 0) + (value.agents ? value.agents.length : 0);

  const toggle = (field, val) => setDraft((d) => {
    const arr = d[field] || [];
    return { ...d, [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
  });

  const apply = () => { onApply(draft); setOpen(false); };
  const clear = () => { onApply({ ...EMPTY_FILTER }); setOpen(false); };

  const Section = ({ title, field, options }) => (
    <div className="rf-section">
      <div className="rf-section-title">{title}</div>
      {options.length === 0
        ? <div className="rf-empty">No options</div>
        : (
          <div className="rf-options">
            {options.map((o) => (
              <label key={o} className="rf-opt">
                <input type="checkbox" checked={(draft[field] || []).includes(o)} onChange={() => toggle(field, o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        )}
    </div>
  );

  return (
    <div className="rf-wrap" ref={ref}>
      <button
        type="button"
        className={`rf-icon-btn${activeCount ? ' active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Filter"
        aria-label="Filter report"
      >
        <FiFilter size={16} />
        {activeCount > 0 && <span className="rf-badge">{activeCount}</span>}
      </button>

      {open && (
        <div className="rf-panel" role="dialog" aria-label="Report filter">
          <div className="rf-head">
            <span className="rf-head-title">Filter widgets</span>
            <button type="button" className="rf-close" onClick={() => setOpen(false)} aria-label="Close"><FiX size={15} /></button>
          </div>

          <div className="rf-logic">
            <span className="rf-logic-label">Match</span>
            <div className="rf-seg">
              <button type="button" className={draft.logic === 'and' ? 'on' : ''} onClick={() => setDraft((d) => ({ ...d, logic: 'and' }))}>All · AND</button>
              <button type="button" className={draft.logic === 'or' ? 'on' : ''} onClick={() => setDraft((d) => ({ ...d, logic: 'or' }))}>Any · OR</button>
            </div>
          </div>

          <div className="rf-body">
            <Section title="Branch" field="branches" options={branches} />
            <Section title="Agent" field="agents" options={agents} />
          </div>

          <div className="rf-actions">
            <button type="button" className="rf-clear" onClick={clear}>Clear</button>
            <button type="button" className="rf-apply" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportFilter;
