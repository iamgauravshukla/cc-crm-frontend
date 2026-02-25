import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking } from '../services/api';
import Sidebar from '../components/Sidebar';
import Loader from '../components/Loader';
import { FiUser, FiCalendar, FiDollarSign, FiUsers, FiFileText, FiCheck } from 'react-icons/fi';

function CreateBooking() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    branch: '',
    status: 'Scheduled',
    firstName: '',
    lastName: '',
    age: '',
    phone: '',
    socialMedia: '',
    email: '',
    treatment: '',
    area: '',
    freebie: '',
    date: '',
    time: '',
    paymentMode: '',
    totalPrice: '',
    gender: '',
    companionFirstName: '',
    companionLastName: '',
    companionAge: '',
    companionFreebie: '',
    companionTreatment: '',
    companionGender: '',
    bookingDetails: '',
    agent: '',
    adInteracted: '',
  });

  // Get current user from localStorage and auto-fill agent field if user is an agent
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    // If agent, auto-fill the agent field with current user's name
    if (userData?.role !== 'Admin' && userData?.name) {
      setFormData(prev => ({
        ...prev,
        agent: userData.name
      }));
    }
  }, []);

  const branches = ['HERA', 'AI SKIN', 'LUMIA', 'GENEVA', 'VENICE', 'DNA MANILA', 'PARIS', 'STA LUCIA', 'FELIZ', 'ESTANCIA'];
  
  const bookingStatuses = [
    'Pencil booking', 'Scheduled', 'At the shop', 'Nearby', 'On the way',
    'Will be late', 'Cancelled', 'Arrived on treatment', 'Arrived & bought',
    'Arrived not potential', 'Comeback', 'Comeback & bought', 'Refund',
    'Old client', 'Promo hunter'
  ];

  const treatments = [
    'HAIR RENEWAL', 'HAIR REGROWTH', 'HAIR REMOVAL', 'SCALP DANDRUFF',
    'SCALP PSORIASIS', 'EXOSOMES', 'ADVANCED HAIRLOSS SOLUTION', 'EXCIMER RX LASER',
    'EYEBAG', '7D HIFU', '12D HIFU', 'HYDRA', 'CRYO', 'CO2', 'CARBON', 'PICO',
    'ANTI MELASMA', 'ACNE CLEANSE', 'ACNE BRIGHTENING', 'ORGANIC BOTOX',
    'COLLAGEN FACIAL', 'THERMAGE', 'EMS', '10D LASER', 'SKIN LIGHTENING',
    'EXILIS', 'SAUNAPOD', 'SOFWAVE', 'RF', 'WARTS REMOVAL'
  ];

  const agents = [
    'NICOLE', 'SYRA', 'DHEZA', 'GERALDINE', 'ANJELA', 'RAIZA', 'NALYN',
    'DONA', 'TRISHA', 'IRIS', 'JOY', 'MAE', 'JULS', 'YAN', 'SUTRA'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await createBooking(formData);
      setSuccess('Booking created successfully!');
      
      // Reset form
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <div className="main-content">
        <div className="page-container">
          <div className="page-header">
            <h2>📝 Create New Booking</h2>
            <p className="page-subtitle">Add a new customer booking with complete details</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <strong>Error!</strong> {error}
            </div>
          )}
          
          {success && (
            <div className="alert alert-success">
              <FiCheck /> <strong>Success!</strong> {success}
            </div>
          )}

          {loading ? (
            <Loader message="Creating booking..." />
          ) : (
            <form onSubmit={handleSubmit} className="booking-form">
              {/* Customer Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiUser className="section-icon" />
                  <h3>Customer Information</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Branch <span className="required">*</span></label>
                    <select name="branch" value={formData.branch} onChange={handleChange} required>
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Booking Status <span className="required">*</span></label>
                    <select 
                      name="status" 
                      value={formData.status} 
                      onChange={handleChange} 
                      required
                      disabled={user?.role !== 'Admin'}
                      title={user?.role !== 'Admin' ? 'Agents cannot modify booking status' : ''}
                    >
                      {bookingStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Age <span className="required">*</span></label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="Enter age"
                      required
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gender <span className="required">*</span></label>
                    <select name="gender" value={formData.gender} onChange={handleChange} required>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Phone <span className="required">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email address or note if not provided (optional)"
                    />
                  </div>

                  <div className="form-group">
                    <label>Facebook / Instagram</label>
                    <input
                      type="text"
                      name="socialMedia"
                      value={formData.socialMedia}
                      onChange={handleChange}
                      placeholder="Social media handle"
                    />
                  </div>

                  <div className="form-group">
                    <label>Treatment Area</label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      placeholder="Area of Treatment"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Details Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiCalendar className="section-icon" />
                  <h3>Booking Details</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Promo/Treatment <span className="required">*</span></label>
                    <select name="treatment" value={formData.treatment} onChange={handleChange} required>
                      <option value="">Select Treatment</option>
                      {treatments.map(treatment => (
                        <option key={treatment} value={treatment}>{treatment}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date & Time Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiCalendar className="section-icon" />
                  <h3>Appointment Date & Time</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date <span className="required">*</span></label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Time <span className="required">*</span></label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Customer Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiFileText className="section-icon" />
                  <h3>Additional Information</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Freebie</label>
                    <input
                      type="text"
                      name="freebie"
                      value={formData.freebie}
                      onChange={handleChange}
                      placeholder="Any freebies included"
                    />
                  </div>

                  <div className="form-group">
                    <label>Agent <span className="required">*</span></label>
                    <select 
                      name="agent" 
                      value={formData.agent} 
                      onChange={handleChange} 
                      required
                      disabled={user?.role !== 'Admin'}
                      title={user?.role !== 'Admin' ? 'You can only create bookings for yourself' : ''}
                    >
                      <option value="">Select Agent</option>
                      {agents.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiDollarSign className="section-icon" />
                  <h3>Payment Information</h3>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Mode of Payment <span className="required">*</span></label>
                    <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} required>
                      <option value="">Select Payment Mode</option>
                      <option value="Cash">Cash</option>
                      <option value="Debit">Debit</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Total Price <span className="required">*</span></label>
                    <input
                      type="number"
                      name="totalPrice"
                      value={formData.totalPrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Companion Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiUsers className="section-icon" />
                  <h3>Companion Information</h3>
                  <span className="optional-badge">Optional</span>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Companion First Name</label>
                    <input
                      type="text"
                      name="companionFirstName"
                      value={formData.companionFirstName}
                      onChange={handleChange}
                      placeholder="First name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Last Name</label>
                    <input
                      type="text"
                      name="companionLastName"
                      value={formData.companionLastName}
                      onChange={handleChange}
                      placeholder="Last name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Age</label>
                    <input
                      type="number"
                      name="companionAge"
                      value={formData.companionAge}
                      onChange={handleChange}
                      placeholder="Age"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Gender</label>
                    <select name="companionGender" value={formData.companionGender} onChange={handleChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Companion Freebie</label>
                    <input
                      type="text"
                      name="companionFreebie"
                      value={formData.companionFreebie}
                      onChange={handleChange}
                      placeholder="Freebie for companion"
                    />
                  </div>

                  <div className="form-group">
                    <label>Companion Treatment</label>
                    <select name="companionTreatment" value={formData.companionTreatment} onChange={handleChange}>
                      <option value="">Select Treatment</option>
                      {treatments.map(treatment => (
                        <option key={treatment} value={treatment}>{treatment}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ad Details Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiFileText className="section-icon" />
                  <h3>Ad / Campaign Details</h3>
                  <span className="optional-badge">Optional</span>
                </div>
                <div className="form-group full-width">
                  <label>Ad Interacted / Campaign Name</label>
                  <input
                    type="text"
                    name="adInteracted"
                    value={formData.adInteracted}
                    onChange={handleChange}
                    placeholder="Enter the ad name or campaign the customer interacted with (e.g., Facebook Ad - Hair Removal Promo)"
                  />
                  <small className="form-hint">If the customer came through a specific advertisement or marketing campaign, please specify it here.</small>
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="form-section">
                <div className="section-header">
                  <FiFileText className="section-icon" />
                  <h3>Additional Notes</h3>
                </div>
                <div className="form-group full-width">
                  <label>Booking Details / Notes</label>
                  <textarea
                    name="bookingDetails"
                    value={formData.bookingDetails}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Any additional notes, special requests, or important information..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating Booking...' : 'Create Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default CreateBooking;
