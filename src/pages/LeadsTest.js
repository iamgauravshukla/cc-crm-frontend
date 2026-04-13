import React, { useState } from 'react';

const API_BASE = 'https://cc-crm-backend-production.up.railway.app';

const CENTERS = ['GENEVA', 'AI SKIN', 'VENICE', 'PARIS', 'LUMIA'];

const defaultCall = { fullname: '', email: '', phone: '', treatment: '', message: '' };
const defaultBooking = { fullname: '', email: '', phone: '', treatment: '', age: '', schedule: '', payment_method: '' };

export default function LeadsTest() {
  const [callForm, setCallForm] = useState({ ...defaultCall, center: 'GENEVA' });
  const [bookingForm, setBookingForm] = useState({ ...defaultBooking, center: 'GENEVA' });
  const [callResult, setCallResult] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [callLoading, setCallLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  async function submitCall(e) {
    e.preventDefault();
    setCallLoading(true);
    setCallResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads?type=call&center=${encodeURIComponent(callForm.center)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: callForm.fullname,
          email: callForm.email,
          phone: callForm.phone,
          treatment: callForm.treatment,
          message: callForm.message,
        }),
      });
      const data = await res.json();
      setCallResult({ ok: res.ok, status: res.status, data });
      if (res.ok) setCallForm({ ...defaultCall, center: callForm.center });
    } catch (err) {
      setCallResult({ ok: false, status: 0, data: { error: err.message } });
    }
    setCallLoading(false);
  }

  async function submitBooking(e) {
    e.preventDefault();
    setBookingLoading(true);
    setBookingResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads?type=booking&center=${encodeURIComponent(bookingForm.center)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: bookingForm.fullname,
          email: bookingForm.email,
          phone: bookingForm.phone,
          treatment: bookingForm.treatment,
          age: bookingForm.age,
          schedule: bookingForm.schedule,
          payment_method: bookingForm.payment_method,
        }),
      });
      const data = await res.json();
      setBookingResult({ ok: res.ok, status: res.status, data });
      if (res.ok) setBookingForm({ ...defaultBooking, center: bookingForm.center });
    } catch (err) {
      setBookingResult({ ok: false, status: 0, data: { error: err.message } });
    }
    setBookingLoading(false);
  }

  const inputStyle = {
    display: 'block', width: '100%', padding: '8px 10px', marginBottom: 10,
    border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 3, color: '#555' };
  const cardStyle = {
    background: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    flex: 1, minWidth: 300,
  };
  const btnStyle = {
    background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6,
    padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
  };
  const resultStyle = (ok) => ({
    marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 13,
    background: ok ? '#e6f9f0' : '#fdecea',
    color: ok ? '#1a7f4f' : '#c0392b',
    border: `1px solid ${ok ? '#a8e6cf' : '#f5c6cb'}`,
    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 6 }}>🧪 Leads API Test Page</h2>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 13 }}>
          Temporary test page — POST to <code>{API_BASE}/api/leads</code>
        </p>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* ── CALL LEAD FORM ── */}
          <div style={cardStyle}>
            <h3 style={{ marginBottom: 18, color: '#6c63ff' }}>📞 Call Lead (type=call)</h3>
            <form onSubmit={submitCall}>
              <label style={labelStyle}>Wellness Center</label>
              <select value={callForm.center} onChange={e => setCallForm(f => ({ ...f, center: e.target.value }))} style={inputStyle}>
                {CENTERS.map(c => <option key={c}>{c}</option>)}
              </select>

              <label style={labelStyle}>Full Name *</label>
              <input required style={inputStyle} value={callForm.fullname}
                onChange={e => setCallForm(f => ({ ...f, fullname: e.target.value }))} placeholder="John Smith" />

              <label style={labelStyle}>Email *</label>
              <input required type="email" style={inputStyle} value={callForm.email}
                onChange={e => setCallForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />

              <label style={labelStyle}>Phone *</label>
              <input required style={inputStyle} value={callForm.phone}
                onChange={e => setCallForm(f => ({ ...f, phone: e.target.value }))} placeholder="+41 79 123 4567" />

              <label style={labelStyle}>Treatment *</label>
              <input required style={inputStyle} value={callForm.treatment}
                onChange={e => setCallForm(f => ({ ...f, treatment: e.target.value }))} placeholder="Botox" />

              <label style={labelStyle}>Message</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={callForm.message}
                onChange={e => setCallForm(f => ({ ...f, message: e.target.value }))} placeholder="Optional message..." />

              <button type="submit" style={btnStyle} disabled={callLoading}>
                {callLoading ? 'Submitting...' : 'Submit Call Lead'}
              </button>
            </form>

            {callResult && (
              <div style={resultStyle(callResult.ok)}>
                <strong>HTTP {callResult.status}</strong>{'\n'}
                {JSON.stringify(callResult.data, null, 2)}
              </div>
            )}
          </div>

          {/* ── BOOKING LEAD FORM ── */}
          <div style={cardStyle}>
            <h3 style={{ marginBottom: 18, color: '#e67e22' }}>📅 Direct Booking Lead (type=booking)</h3>
            <form onSubmit={submitBooking}>
              <label style={labelStyle}>Wellness Center</label>
              <select value={bookingForm.center} onChange={e => setBookingForm(f => ({ ...f, center: e.target.value }))} style={inputStyle}>
                {CENTERS.map(c => <option key={c}>{c}</option>)}
              </select>

              <label style={labelStyle}>Full Name *</label>
              <input required style={inputStyle} value={bookingForm.fullname}
                onChange={e => setBookingForm(f => ({ ...f, fullname: e.target.value }))} placeholder="Jane Doe" />

              <label style={labelStyle}>Email *</label>
              <input required type="email" style={inputStyle} value={bookingForm.email}
                onChange={e => setBookingForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />

              <label style={labelStyle}>Phone *</label>
              <input required style={inputStyle} value={bookingForm.phone}
                onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))} placeholder="+41 76 987 6543" />

              <label style={labelStyle}>Treatment *</label>
              <input required style={inputStyle} value={bookingForm.treatment}
                onChange={e => setBookingForm(f => ({ ...f, treatment: e.target.value }))} placeholder="Filler" />

              <label style={labelStyle}>Age</label>
              <input style={inputStyle} value={bookingForm.age}
                onChange={e => setBookingForm(f => ({ ...f, age: e.target.value }))} placeholder="28" />

              <label style={labelStyle}>Schedule *</label>
              <input required style={inputStyle} value={bookingForm.schedule}
                onChange={e => setBookingForm(f => ({ ...f, schedule: e.target.value }))} placeholder="2026-04-15 at 10:00 AM" />

              <label style={labelStyle}>Payment Method</label>
              <select value={bookingForm.payment_method} onChange={e => setBookingForm(f => ({ ...f, payment_method: e.target.value }))} style={inputStyle}>
                <option value="">-- Select --</option>
                <option>Card</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Online</option>
              </select>

              <button type="submit" style={{ ...btnStyle, background: '#e67e22' }} disabled={bookingLoading}>
                {bookingLoading ? 'Submitting...' : 'Submit Booking Lead'}
              </button>
            </form>

            {bookingResult && (
              <div style={resultStyle(bookingResult.ok)}>
                <strong>HTTP {bookingResult.status}</strong>{'\n'}
                {JSON.stringify(bookingResult.data, null, 2)}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
