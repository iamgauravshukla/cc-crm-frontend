import React, { useState, useRef, useEffect } from 'react';
import { FiFilter, FiX, FiPlus, FiChevronDown } from 'react-icons/fi';
import './WidgetFilter.css';

const FIELDS = [
  { key: 'branch',          label: 'Branch' },
  { key: 'status',          label: 'Status' },
  { key: 'agent',           label: 'Agent' },
  { key: 'bookingSchedule', label: 'Booking Schedule' },
  { key: 'bookedOn',        label: 'Booked On' },
];
const DATE_FIELDS = new Set(['bookingSchedule', 'bookedOn', 'dateRange']);
const TEXT_OPS = [
  { key: 'is',     label: 'is' },
  { key: 'isNot',  label: 'is not' },
  { key: 'isLike', label: 'is like' },
];
const DATE_OPS = [
  { key: 'is',    label: 'is' },
  { key: 'isNot', label: 'is not' },
];
// Date value presets — mirror Monday's date filter (is Today / is not Tomorrow / …).
const DATE_PRESETS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'tomorrow',  label: 'Tomorrow' },
  { key: 'thisWeek',  label: 'This Week' },
  { key: 'next7',     label: 'Next 7 Days' },
  { key: 'past',      label: 'Past dates' },
  { key: 'future',    label: 'Future dates' },
];

export const EMPTY_WFILTER = { logic: 'and', conditions: [] };

// Build the map of active per-widget filters into a single query param
export const widgetFiltersToParam = (map) => {
  const active = {};
  Object.entries(map || {}).forEach(([k, v]) => { if (v && v.conditions && v.conditions.length) active[k] = v; });
  return Object.keys(active).length ? { filters: JSON.stringify(active) } : {};
};
// A single widget's filter → drill-down query param
export const singleFilterToParam = (f) =>
  (f && f.conditions && f.conditions.length) ? { filter: JSON.stringify(f) } : {};

// A value counts as "set" when it has at least one selection / text / range bound.
const hasValue = (c) => {
  if (Array.isArray(c.value)) return c.value.length > 0;
  if (c.value && typeof c.value === 'object') return !!(c.value.from || c.value.to);
  return !!(c.value && String(c.value).trim());
};
const toArray = (v) => (Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]));
// A custom {from,to} date range (as opposed to an array of preset keys).
const isRange = (v) => !!v && !Array.isArray(v) && typeof v === 'object';

/**
 * Multi-select value picker (checkbox dropdown, like Monday's chips).
 * options: array of strings or {value,label}. value: array of selected values.
 */
function MultiSelect({ options = [], value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const sel  = toArray(value);
  const toggle = (v) => onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  const allValues = norm.map((o) => o.value);
  const allSelected = allValues.length > 0 && allValues.every((v) => sel.includes(v));
  const text = sel.length
    ? (allSelected ? 'All selected' : norm.filter((o) => sel.includes(o.value)).map((o) => o.label).join(', '))
    : (placeholder || 'Select…');

  return (
    <div className="wf-ms" ref={ref}>
      <button type="button" className={`wf-ms-btn${sel.length ? ' has' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="wf-ms-text">{text}</span>
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className="wf-ms-menu">
          {norm.length === 0 && <div className="wf-ms-empty">No options</div>}
          {norm.length > 0 && (
            <div className="wf-ms-head">
              <button type="button" onClick={() => onChange(allSelected ? [] : allValues)}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {sel.length > 0 && <button type="button" onClick={() => onChange([])}>Clear</button>}
            </div>
          )}
          {norm.map((o) => (
            <label key={o.value} className="wf-ms-opt">
              <input type="checkbox" checked={sel.includes(o.value)} onChange={() => toggle(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Per-widget condition builder. Refines the widget's built-in formula with
 * conditions on Branch / Status / Agent (is / is not / is like) and Booking
 * Schedule / Booked On dates (is / is not — preset windows or a custom range).
 * Each value is multi-select with Select-all (matches ANY for is/is-like, NONE
 * for is-not), conditions combined by AND or OR.
 * Props: options {branches,statuses,agents}, value, onApply, label.
 */
function WidgetFilter({ options = {}, value = EMPTY_WFILTER, onApply, label }) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (open) setDraft(value && value.conditions ? value : EMPTY_WFILTER); }, [open, value]);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const count = (value.conditions || []).length;
  const optsFor = (field) =>
    field === 'branch' ? (options.branches || []) :
    field === 'status' ? (options.statuses || []) :
    field === 'agent'  ? (options.agents || []) : [];

  const addCond = () => setDraft((d) => ({ ...d, conditions: [...(d.conditions || []), { field: 'branch', op: 'is', value: [] }] }));
  const setCond = (i, patch) => setDraft((d) => ({ ...d, conditions: d.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c) }));
  const delCond = (i) => setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, idx) => idx !== i) }));

  const apply = () => {
    const clean = (draft.conditions || []).filter(hasValue);
    onApply({ logic: draft.logic || 'and', conditions: clean });
    setOpen(false);
  };
  const clear = () => { onApply({ ...EMPTY_WFILTER }); setOpen(false); };

  return (
    <div className="wf-wrap" ref={ref}>
      <button type="button" className={`wf-btn${count ? ' active' : ''}`} onClick={() => setOpen((o) => !o)} title="Filter this widget" aria-label="Filter widget">
        <FiFilter size={13} />
        {count > 0 && <span className="wf-badge">{count}</span>}
      </button>

      {open && (
        <div className="wf-panel" role="dialog">
          <div className="wf-head">
            <span className="wf-title">Advanced filters{label ? ` · ${label}` : ''}</span>
            <button type="button" className="wf-close" onClick={() => setOpen(false)} aria-label="Close"><FiX size={16} /></button>
          </div>

          <div className="wf-conds">
            {(draft.conditions || []).length === 0 && <div className="wf-empty">No conditions — showing the full widget.</div>}
            {(draft.conditions || []).map((c, i) => (
              <div className="wf-row" key={i}>
                <div className="wf-lead">
                  {i === 0
                    ? <span className="wf-where">Where</span>
                    : (
                      <select className="wf-andor" value={draft.logic} onChange={(e) => setDraft((d) => ({ ...d, logic: e.target.value }))}>
                        <option value="and">And</option>
                        <option value="or">Or</option>
                      </select>
                    )}
                </div>
                <select
                  className="wf-field"
                  value={c.field}
                  onChange={(e) => {
                    const nf = e.target.value;
                    const nowDate = DATE_FIELDS.has(nf);
                    setCond(i, { field: nf, op: nowDate && c.op === 'isLike' ? 'is' : c.op, value: [] });
                  }}
                >
                  {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select
                  className="wf-op"
                  value={c.op}
                  onChange={(e) => {
                    const nop = e.target.value;
                    const nval = nop === 'isLike'
                      ? (typeof c.value === 'string' ? c.value : '')
                      : (typeof c.value === 'string' ? (c.value ? [c.value] : []) : c.value);
                    setCond(i, { op: nop, value: nval });
                  }}
                >
                  {(DATE_FIELDS.has(c.field) ? DATE_OPS : TEXT_OPS).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <div className="wf-valcell">
                  {DATE_FIELDS.has(c.field) ? (
                    isRange(c.value) ? (
                      <div className="wf-range">
                        <input type="date" value={c.value.from || ''} onChange={(e) => setCond(i, { value: { ...c.value, from: e.target.value } })} aria-label="From date" />
                        <span className="wf-range-sep">→</span>
                        <input type="date" value={c.value.to || ''} onChange={(e) => setCond(i, { value: { ...c.value, to: e.target.value } })} aria-label="To date" />
                        <button type="button" className="wf-linkbtn" title="Use presets instead" onClick={() => setCond(i, { value: [] })}>Presets</button>
                      </div>
                    ) : (
                      <div className="wf-datewrap">
                        <MultiSelect
                          options={DATE_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
                          value={c.value}
                          onChange={(v) => setCond(i, { value: v })}
                          placeholder="Select dates…"
                        />
                        <button type="button" className="wf-linkbtn" onClick={() => setCond(i, { value: { from: '', to: '' } })}>Custom range…</button>
                      </div>
                    )
                  ) : c.op === 'isLike' ? (
                    <input type="text" className="wf-val" placeholder="contains…" value={typeof c.value === 'string' ? c.value : ''} onChange={(e) => setCond(i, { value: e.target.value })} />
                  ) : (
                    <MultiSelect
                      options={optsFor(c.field)}
                      value={c.value}
                      onChange={(v) => setCond(i, { value: v })}
                      placeholder="Select…"
                    />
                  )}
                </div>
                <button type="button" className="wf-del" onClick={() => delCond(i)} aria-label="Remove condition"><FiX size={15} /></button>
              </div>
            ))}
            <button type="button" className="wf-add" onClick={addCond}><FiPlus size={13} /> New filter</button>
          </div>

          <div className="wf-actions">
            <button type="button" className="wf-clear" onClick={clear}>Clear all</button>
            <button type="button" className="wf-apply" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WidgetFilter;
