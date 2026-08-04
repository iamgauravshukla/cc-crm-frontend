import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { getBookingById, updateBooking } from '../services/api';
import { useConfig } from '../hooks/useConfig';

/**
 * Reusable "Edit Booking" flyout — the same editing capability as Master Bookings,
 * usable from anywhere (e.g. the Kanban board). Fetches the full booking by id so
 * every field is editable, and only sends totalPrice when it actually changed (#13).
 *
 * Props: booking ({ recordId, ... }), onClose(), onSaved(updatedFields)
 */
function BookingEditModal({ booking, onClose, onSaved }) {
  const { options: cfgOptions } = useConfig();
  const treatments = cfgOptions.treatments;
  const agents     = cfgOptions.agents;
  const branches   = cfgOptions.branches;
  const statuses   = cfgOptions.statuses;

  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [form, setForm]       = useState(null);
  const [origPrice, setOrig]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const matchConfig = (val, arr) => {
    if (!val) return '';
    return (arr || []).find(o => o.toLowerCase() === val.toLowerCase()) || val;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getBookingById(booking.recordId);
        const b = res.data.booking;
        if (!alive) return;
        setOrig(Number(b.totalPrice) || 0);
        setForm({
          date: b.date || '',
          time: b.time || '',
          branch: matchConfig(b.branch, branches),
          status: matchConfig(b.status, statuses),
          firstName: b.firstName || '',
          lastName: b.lastName || '',
          age: b.age ?? '',
          gender: b.gender || '',
          phone: b.phone || '',
          socialMedia: b.socialMedia || '',
          email: b.email || '',
          treatment: matchConfig(b.treatment, treatments),
          area: b.area || '',
          freebie: b.freebie || '',
          totalPrice: b.totalPrice ?? 0,
          paymentMode: b.paymentMode || '',
          agent: matchConfig(b.agent, agents),
          bookingDetails: b.bookingDetails || '',
          remarks: b.remarks || '',
          followUpDate: b.followUpDate || '',
          companionFirstName: b.companionFirstName || '',
          companionLastName: b.companionLastName || '',
          companionAge: b.companionAge ?? '',
          companionTreatment: matchConfig(b.companionTreatment, treatments),
          isPromoHunter: b.isPromoHunter || false,
        });
      } catch (err) {
        if (alive) setError('Failed to load booking details');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.recordId]);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      // Only send totalPrice when the admin actually changed it (#13)
      const payload = { ...form };
      const formPrice = (form.totalPrice === '' || form.totalPrice == null) ? NaN : Number(form.totalPrice);
      if (Number.isNaN(formPrice) || formPrice === origPrice) delete payload.totalPrice;
      else payload.totalPrice = formPrice;

      await updateBooking(booking.recordId, payload);
      setSuccess('Booking updated successfully!');
      // Surface the fields the Kanban card cares about immediately
      onSaved({
        recordId: booking.recordId,
        status: form.status, treatment: form.treatment, time: form.time,
        branch: form.branch, agent: form.agent, firstName: form.firstName, lastName: form.lastName,
        totalPrice: Number.isNaN(formPrice) ? origPrice : formPrice,
        isPromoHunter: form.isPromoHunter,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update booking');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flyout-backdrop" onClick={onClose} />
      <div className="flyout-panel">
        <div className="flyout-header">
          <div className="flyout-header-info">
            <h2 className="flyout-title">Edit Booking</h2>
            <span className="flyout-record-id">{booking.recordId}</span>
          </div>
          <button className="flyout-close-btn" onClick={onClose} title="Close"><FiX size={20} /></button>
        </div>

        {loading || !form ? (
          <div className="loading-section" style={{ padding: 40 }}>Loading…</div>
        ) : (
          <form onSubmit={submit} className="edit-booking-form">
            {error && <div className="modern-error-message">{error}</div>}
            {success && <div className="modern-success-message">{success}</div>}
            <div className="modal-form-grid">
              <div className="form-group">
                <label>Appointment Date</label>
                <input type="date" name="date" value={form.date} onChange={change} />
              </div>
              <div className="form-group">
                <label>Appointment Time</label>
                <input type="text" name="time" value={form.time} onChange={change} placeholder="e.g. 2:00 PM" />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <select name="branch" value={form.branch} onChange={change}>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  {form.branch && !branches.includes(form.branch) && <option value={form.branch}>{form.branch}</option>}
                </select>
              </div>
              {user?.role !== 'Agent' && (
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={form.status} onChange={change}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    {form.status && !statuses.includes(form.status) && <option value={form.status}>{form.status}</option>}
                  </select>
                </div>
              )}
              {user?.role !== 'Agent' && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" name="isPromoHunter" checked={!!form.isPromoHunter} onChange={change} />
                    🎯 Promo Hunter
                  </label>
                </div>
              )}
              <div className="form-group">
                <label>First Name</label>
                <input type="text" name="firstName" value={form.firstName} onChange={change} required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" value={form.lastName} onChange={change} required />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={form.age} onChange={change} onWheel={(e) => e.currentTarget.blur()} min="1" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={form.gender} onChange={change}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={change} />
              </div>
              <div className="form-group">
                <label>Instagram / Social</label>
                <input type="text" name="socialMedia" value={form.socialMedia} onChange={change} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="text" name="email" value={form.email} onChange={change} />
              </div>
              <div className="form-group">
                <label>Treatment</label>
                <select name="treatment" value={form.treatment} onChange={change}>
                  <option value="">Select Treatment</option>
                  {treatments.map(t => <option key={t} value={t}>{t}</option>)}
                  {form.treatment && !treatments.includes(form.treatment) && <option value={form.treatment}>{form.treatment}</option>}
                </select>
              </div>
              <div className="form-group">
                <label>Treatment Area</label>
                <input type="text" name="area" value={form.area} onChange={change} />
              </div>
              <div className="form-group">
                <label>Freebie</label>
                <input type="text" name="freebie" value={form.freebie} onChange={change} />
              </div>
              {user?.role !== 'Agent' && (
                <div className="form-group">
                  <label>Total Price</label>
                  <input type="number" name="totalPrice" value={form.totalPrice} onChange={change} onWheel={(e) => e.currentTarget.blur()} min="0" step="any" />
                </div>
              )}
              <div className="form-group">
                <label>Payment Mode</label>
                <input type="text" name="paymentMode" value={form.paymentMode} onChange={change} />
              </div>
              {user?.role !== 'Agent' && (
                <div className="form-group">
                  <label>Agent</label>
                  <select name="agent" value={form.agent} onChange={change}>
                    <option value="">Select Agent</option>
                    {agents.map(a => <option key={a} value={a}>{a}</option>)}
                    {form.agent && !agents.includes(form.agent) && <option value={form.agent}>{form.agent}</option>}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Follow-up Date</label>
                <input type="date" name="followUpDate" value={form.followUpDate} onChange={change} />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Booking Details / Notes</label>
              <textarea name="bookingDetails" value={form.bookingDetails} onChange={change} rows="3" />
            </div>
            <div className="form-group full-width">
              <label>Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={change} rows="2" />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export default BookingEditModal;
