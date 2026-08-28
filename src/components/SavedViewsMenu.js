import React, { useState, useEffect, useRef } from 'react';
import { FiBookmark, FiX } from 'react-icons/fi';
import { getSavedViews, createSavedView, deleteSavedView } from '../services/api';

/**
 * "Views" dropdown for saving/loading the per-widget filters of a report page.
 * Reuses the saved-views styles from Master Bookings (App.css).
 *
 * Props:
 *   page     — saved-views scope ('daily-reports' | 'cc-report')
 *   filters  — current filters object to save
 *   onLoad(filters) — called when the user loads a saved view
 */
export default function SavedViewsMenu({ page, filters, onLoad }) {
  const [views, setViews]     = useState([]);
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    getSavedViews(page).then(r => setViews(r.data.views || [])).catch(() => {});
  }, [page]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const hasFilters = filters && Object.values(filters).some(
    f => f && Array.isArray(f.conditions) ? f.conditions.length > 0 : Object.keys(f || {}).length > 0
  );

  const handleSave = async () => {
    const n = name.trim();
    if (!n || !hasFilters) return;
    setSaving(true);
    try {
      const res = await createSavedView({ name: n, filters, page });
      setViews(prev => [res.data.view, ...prev.filter(v => v.id !== res.data.view.id && v.name !== n)]);
      setName('');
    } catch (err) {
      console.error('Save view failed:', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSavedView(id);
      setViews(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Delete view failed:', err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="saved-views-wrap" ref={wrapRef}>
      <button
        className={`qf-toolbar-btn${open ? ' active' : ''}`}
        onClick={() => setOpen(s => !s)}
        title="Saved filter views"
      >
        <FiBookmark size={14} />
        <span>Views</span>
        {views.length > 0 && <span className="qf-count-badge">{views.length}</span>}
      </button>
      {open && (
        <div className="saved-views-dropdown">
          <div className="saved-views-header">Saved Views</div>
          {views.length === 0 && <div className="saved-views-empty">No saved views yet</div>}
          {views.map(v => (
            <div key={v.id} className="saved-view-item">
              <button className="saved-view-load" onClick={() => { onLoad(v.filters || {}); setOpen(false); }}>{v.name}</button>
              <button className="saved-view-del" onClick={() => handleDelete(v.id)} title="Delete view"><FiX size={12} /></button>
            </div>
          ))}
          <div className="saved-views-save">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Save current filters as..."
              disabled={!hasFilters}
            />
            <button onClick={handleSave} disabled={!name.trim() || !hasFilters || saving}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
