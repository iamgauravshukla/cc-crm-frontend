/**
 * QuickFilterBar — reusable Monday.com-style filter bar.
 *
 * Props:
 *   fields        – array of field config objects (see FIELD_TYPES below)
 *   activeFilters – array of active filter objects (controlled from parent)
 *   onChange      – (newFilters) => void — called whenever filters change
 *   resultCount   – optional number to show "Showing N results"
 *   resultLabel   – optional string suffix e.g. "bookings" (default: "results")
 *
 * Field config shape:
 *   { key, fieldLabel, type: 'select' | 'datepreset' | 'daterange', options, multiSelect? }
 *
 *   'select'      – options: string[]; set multiSelect:true to allow multiple values
 *   'datepreset'  – options: { value, label }[]
 *   'daterange'   – no options; always shows from/to date pickers
 *
 * Multi-select filter shape:
 *   { ..., value: ['HERA','LUMIA'], displayValue: 'HERA, LUMIA' }
 *   Backend receives comma-separated: branch=HERA,LUMIA
 */

import React, { useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

export default function QuickFilterBar({
  fields = [],
  activeFilters = [],
  onChange,
  resultCount,
  resultLabel = 'results',
}) {
  const [showBuilder, setShowBuilder]         = useState(false);
  const [editingId, setEditingId]             = useState(null);
  const [builderField, setBuilderField]       = useState('');
  const [builderOperator, setBuilderOperator] = useState('is');
  // For multi-select: array of strings. For single: string.
  const [builderValue, setBuilderValue]       = useState('');
  const [builderValues, setBuilderValues]     = useState([]); // multi-select
  const [builderDateFrom, setBuilderDateFrom] = useState('');
  const [builderDateTo, setBuilderDateTo]     = useState('');

  const getConfig = (key) => fields.find(f => f.key === key);

  const resetBuilder = () => {
    setBuilderField('');
    setBuilderOperator('is');
    setBuilderValue('');
    setBuilderValues([]);
    setBuilderDateFrom('');
    setBuilderDateTo('');
  };

  const closeBuilder = () => {
    setShowBuilder(false);
    setEditingId(null);
    resetBuilder();
  };

  const isMultiSelect = (key) => !!getConfig(key)?.multiSelect;

  const toggleMultiValue = (opt) => {
    setBuilderValues(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt]
    );
  };

  const canApply = () => {
    if (!builderField) return false;
    const cfg = getConfig(builderField);
    if (cfg?.type === 'daterange') return !!(builderDateFrom && builderDateTo);
    if (cfg?.type === 'datepreset') {
      if (!builderValue) return false;
      if (builderValue === 'custom') return !!(builderDateFrom && builderDateTo);
      return true;
    }
    if (cfg?.multiSelect) return builderValues.length > 0;
    return !!builderValue;
  };

  const buildDisplayValue = (cfg, value, operator, dateFrom, dateTo, values) => {
    if (cfg?.type === 'daterange') return `${dateFrom} – ${dateTo}`;
    if (cfg?.type === 'datepreset') {
      if (value === 'custom') return `${dateFrom} – ${dateTo}`;
      return cfg.options.find(o => o.value === value)?.label || value;
    }
    if (cfg?.multiSelect) {
      const label = values.join(', ');
      return operator === 'is not' ? `≠ ${label}` : label;
    }
    return operator === 'is not' ? `≠ ${value}` : value;
  };

  const applyFilter = () => {
    const cfg = getConfig(builderField);
    const multi = cfg?.multiSelect;
    const displayValue = buildDisplayValue(cfg, builderValue, builderOperator, builderDateFrom, builderDateTo, builderValues);

    const newFilter = {
      id:           editingId || Date.now().toString(),
      field:        builderField,
      fieldLabel:   cfg?.fieldLabel || builderField,
      operator:     builderOperator,
      value:        cfg?.type === 'daterange' ? 'custom' : (multi ? builderValues.join(',') : builderValue),
      values:       multi ? builderValues : undefined,
      dateFrom:     builderDateFrom,
      dateTo:       builderDateTo,
      displayValue,
    };

    const updated = editingId
      ? activeFilters.map(f => f.id === editingId ? newFilter : f)
      : [...activeFilters.filter(f => f.field !== builderField), newFilter];

    onChange(updated);
    closeBuilder();
  };

  const removeFilter = (id) => onChange(activeFilters.filter(f => f.id !== id));
  const clearAll    = ()  => onChange([]);

  const openEdit = (filter) => {
    setEditingId(filter.id);
    setBuilderField(filter.field);
    setBuilderOperator(filter.operator || 'is');
    const cfg = getConfig(filter.field);
    if (cfg?.multiSelect) {
      setBuilderValues(filter.values || (filter.value ? filter.value.split(',') : []));
      setBuilderValue('');
    } else {
      setBuilderValue(filter.value === 'custom' ? 'custom' : filter.value);
      setBuilderValues([]);
    }
    setBuilderDateFrom(filter.dateFrom || '');
    setBuilderDateTo(filter.dateTo || '');
    setShowBuilder(true);
  };

  const openAdd = () => {
    resetBuilder();
    setEditingId(null);
    setShowBuilder(true);
  };

  return (
    <div className="qf-bar">
      {/* Chips row */}
      <div className="qf-chips-row">
        <button
          className={`qf-toolbar-btn${showBuilder ? ' active' : ''}`}
          onClick={() => showBuilder ? closeBuilder() : openAdd()}
          style={{ marginRight: 8 }}
        >
          <FiFilter size={13} />
          <span>Filter</span>
          {activeFilters.length > 0 && (
            <span className="qf-count-badge">{activeFilters.length}</span>
          )}
        </button>

        {resultCount != null && (
          <span className="qf-result-count">
            Showing {Number(resultCount).toLocaleString()} {resultLabel}
          </span>
        )}

        <div className="qf-chips">
          {activeFilters.map(f => (
            <div key={f.id} className="qf-chip" onClick={() => openEdit(f)} title="Click to edit">
              <span className="qf-chip-field">{f.fieldLabel}</span>
              <span className="qf-chip-sep">:</span>
              <span className="qf-chip-value">{f.displayValue}</span>
              <button
                className="qf-chip-remove"
                onClick={e => { e.stopPropagation(); removeFilter(f.id); }}
                aria-label="Remove filter"
              >
                <FiX size={11} />
              </button>
            </div>
          ))}
          <button className="qf-add-btn" onClick={openAdd}>+ Add filter</button>
        </div>

        {activeFilters.length > 0 && (
          <button className="qf-clear-btn" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* Builder panel */}
      {showBuilder && (
        <div className="qf-builder">
          <div className="qf-builder-header">
            <span>{editingId ? 'Edit filter' : 'Add filter'}</span>
            <button className="qf-builder-close" onClick={closeBuilder} aria-label="Close">
              <FiX size={15} />
            </button>
          </div>

          <div className="qf-builder-body">
            {/* Field selector */}
            <div className="qf-builder-row">
              <label>Field</label>
              <select
                value={builderField}
                onChange={e => {
                  setBuilderField(e.target.value);
                  setBuilderValue('');
                  setBuilderValues([]);
                  setBuilderOperator('is');
                  setBuilderDateFrom('');
                  setBuilderDateTo('');
                }}
              >
                <option value="">Select field...</option>
                {fields.map(f => (
                  <option
                    key={f.key}
                    value={f.key}
                    disabled={activeFilters.some(af => af.field === f.key && af.id !== editingId)}
                  >
                    {f.fieldLabel}
                    {activeFilters.some(af => af.field === f.key && af.id !== editingId) ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* select-type field — single or multi */}
            {builderField && getConfig(builderField)?.type === 'select' && (
              <>
                <div className="qf-builder-row">
                  <label>Condition</label>
                  <div className="qf-operator-btns">
                    {['is', 'is not'].map(op => (
                      <button
                        key={op}
                        className={`qf-op-btn${builderOperator === op ? ' active' : ''}`}
                        onClick={() => setBuilderOperator(op)}
                      >{op}</button>
                    ))}
                  </div>
                </div>
                <div className="qf-builder-row">
                  <label>
                    Value
                    {isMultiSelect(builderField) && builderValues.length > 0 && (
                      <span className="qf-multi-hint"> · {builderValues.length} selected</span>
                    )}
                  </label>
                  <div className="qf-value-chips">
                    {getConfig(builderField).options.map(opt => {
                      const selected = isMultiSelect(builderField)
                        ? builderValues.includes(opt)
                        : builderValue === opt;
                      return (
                        <button
                          key={opt}
                          className={`qf-value-chip${selected ? ' selected' : ''}`}
                          onClick={() =>
                            isMultiSelect(builderField)
                              ? toggleMultiValue(opt)
                              : setBuilderValue(opt)
                          }
                        >
                          {isMultiSelect(builderField) && selected && (
                            <span className="qf-chip-tick">✓ </span>
                          )}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* datepreset-type field */}
            {builderField && getConfig(builderField)?.type === 'datepreset' && (
              <>
                <div className="qf-builder-row">
                  <label>Period</label>
                  <div className="qf-value-chips">
                    {getConfig(builderField).options.map(opt => (
                      <button
                        key={opt.value}
                        className={`qf-value-chip${builderValue === opt.value ? ' selected' : ''}`}
                        onClick={() => setBuilderValue(opt.value)}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                {builderValue === 'custom' && (
                  <div className="qf-builder-row">
                    <label>Range</label>
                    <div className="qf-custom-dates">
                      <input type="date" value={builderDateFrom} onChange={e => setBuilderDateFrom(e.target.value)} max={builderDateTo || undefined} aria-label="From date" />
                      <span>to</span>
                      <input type="date" value={builderDateTo} onChange={e => setBuilderDateTo(e.target.value)} min={builderDateFrom || undefined} aria-label="To date" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* daterange-type field (always custom dates) */}
            {builderField && getConfig(builderField)?.type === 'daterange' && (
              <div className="qf-builder-row">
                <label>Range</label>
                <div className="qf-custom-dates">
                  <input type="date" value={builderDateFrom} onChange={e => setBuilderDateFrom(e.target.value)} max={builderDateTo || undefined} aria-label="From date" />
                  <span>to</span>
                  <input type="date" value={builderDateTo} onChange={e => setBuilderDateTo(e.target.value)} min={builderDateFrom || undefined} aria-label="To date" />
                </div>
              </div>
            )}
          </div>

          <div className="qf-builder-footer">
            <button className="qf-builder-cancel" onClick={closeBuilder}>Cancel</button>
            <button className="qf-builder-apply" disabled={!canApply()} onClick={applyFilter}>
              {editingId ? 'Update filter' : 'Apply filter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

