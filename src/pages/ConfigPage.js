import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { getConfig, addConfigOption, updateConfigOption, deleteConfigOption, reorderConfigOptions } from '../services/api';
import { invalidateConfigCache } from '../hooks/useConfig';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiArrowUp, FiArrowDown, FiSettings } from 'react-icons/fi';
import './ConfigPage.css';

const TABS = [
  { key: 'branch',         label: 'Branches',         hint: 'branch' },
  { key: 'booking_status', label: 'Booking Statuses',  hint: 'status' },
  { key: 'treatment',      label: 'Treatments',        hint: 'treatment' },
  { key: 'agent',          label: 'Agents',            hint: 'agent name' },
];

function ConfigPage() {
  const [activeTab, setActiveTab]   = useState('branch');
  const [config, setConfig]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  // Inline edit state
  const [editingId, setEditingId]   = useState(null);
  const [editValue, setEditValue]   = useState('');

  // Add new state
  const [newValue, setNewValue]     = useState('');
  const [addError, setAddError]     = useState('');

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getConfig();
      setConfig(res.data.config || {});
      invalidateConfigCache(); // so other pages refresh on next mount
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Reset add input when switching tabs
  useEffect(() => {
    setNewValue('');
    setAddError('');
    setEditingId(null);
  }, [activeTab]);

  const currentItems = config[activeTab] || [];
  const currentTab   = TABS.find(t => t.key === activeTab);

  // ── Add ─────────────────────────────────────────────────────
  const handleAdd = async () => {
    const val = newValue.trim();
    if (!val) return;
    setAddError('');
    setSaving(true);
    try {
      await addConfigOption({ category: activeTab, value: val });
      setNewValue('');
      await loadConfig();
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add — value may already exist');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.value);
  };

  const handleEdit = async (id) => {
    const val = editValue.trim();
    if (!val) return;
    setSaving(true);
    try {
      await updateConfigOption(id, { value: val });
      setEditingId(null);
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteConfigOption(id);
      setConfirmDeleteId(null);
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // ── Reorder ──────────────────────────────────────────────────
  const handleMove = async (index, dir) => {
    const items    = [...currentItems];
    const newIndex = dir === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    // Optimistic update
    setConfig(prev => ({ ...prev, [activeTab]: items }));

    try {
      await reorderConfigOptions({ category: activeTab, orderedIds: items.map(i => i.id) });
      invalidateConfigCache();
    } catch {
      setError('Failed to reorder — reloading');
      await loadConfig();
    }
  };

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">

          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiSettings size={24} />
              <div>
                <h2 style={{ margin: 0 }}>Configuration</h2>
                <p className="page-subtitle" style={{ margin: 0 }}>Manage dropdown options used in booking forms</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" onClick={() => setError('')} style={{ cursor: 'pointer' }}>
              {error} <small style={{ opacity: 0.7 }}>· click to dismiss</small>
            </div>
          )}

          {/* Tab bar */}
          <div className="cfg-tab-bar">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`cfg-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {config[tab.key] && (
                  <span className="cfg-tab-badge">{config[tab.key].length}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <Loader message="Loading configuration..." />
          ) : (
            <div className="cfg-panel">

              {/* Header row */}
              <div className="cfg-panel-header">
                <span className="cfg-panel-title">
                  {currentTab?.label}
                  <span className="cfg-panel-count">{currentItems.length} items</span>
                </span>
                <span className="cfg-panel-hint">
                  Changes take effect immediately in all booking forms.
                </span>
              </div>

              {/* List */}
              <div className="cfg-list">
                {currentItems.length === 0 && (
                  <div className="cfg-empty">No items yet. Add one below.</div>
                )}

                {currentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`cfg-item${editingId === item.id ? ' editing' : ''}${confirmDeleteId === item.id ? ' confirming' : ''}`}
                  >
                    <span className="cfg-item-num">{index + 1}</span>

                    {editingId === item.id ? (
                      <input
                        className="cfg-item-input"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter')  handleEdit(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                    ) : confirmDeleteId === item.id ? (
                      <span className="cfg-item-value cfg-delete-confirm-text">
                        Delete <strong>{item.value}</strong>? This removes it from all dropdowns.
                      </span>
                    ) : (
                      <span className="cfg-item-value">{item.value}</span>
                    )}

                    <div className="cfg-item-actions">
                      {editingId === item.id ? (
                        <>
                          <button className="cfg-btn cfg-save"   onClick={() => handleEdit(item.id)} disabled={saving || !editValue.trim()} title="Save (Enter)"><FiCheck size={14} /></button>
                          <button className="cfg-btn cfg-cancel" onClick={cancelEdit}                 title="Cancel (Esc)"><FiX    size={14} /></button>
                        </>
                      ) : confirmDeleteId === item.id ? (
                        <>
                          <button className="cfg-btn cfg-save"   onClick={() => handleDelete(item.id)} disabled={saving} title="Confirm delete"><FiCheck size={14} /></button>
                          <button className="cfg-btn cfg-cancel" onClick={() => setConfirmDeleteId(null)} title="Cancel"><FiX size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button className="cfg-btn cfg-move" onClick={() => handleMove(index, 'up')}   disabled={index === 0}                       title="Move up">  <FiArrowUp   size={13} /></button>
                          <button className="cfg-btn cfg-move" onClick={() => handleMove(index, 'down')} disabled={index === currentItems.length - 1} title="Move down"><FiArrowDown size={13} /></button>
                          <button className="cfg-btn cfg-edit"   onClick={() => startEdit(item)}           title="Edit">  <FiEdit2 size={14} /></button>
                          <button className="cfg-btn cfg-delete" onClick={() => setConfirmDeleteId(item.id)} title="Delete"><FiTrash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new */}
              <div className="cfg-add-row">
                <input
                  className="cfg-add-input"
                  type="text"
                  placeholder={`New ${currentTab?.hint}…`}
                  value={newValue}
                  onChange={e => { setNewValue(e.target.value); setAddError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  disabled={saving}
                />
                <button
                  className="cfg-btn cfg-add-confirm"
                  onClick={handleAdd}
                  disabled={saving || !newValue.trim()}
                >
                  <FiPlus size={15} /> Add
                </button>
              </div>
              {addError && <p className="cfg-add-error">{addError}</p>}

            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ConfigPage;
