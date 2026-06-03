import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import Dropdown from '../components/Dropdown';

const Register = () => {
  const { register, uploadSelfie } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Viewer',
    clubName: ''
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // Step 1: Form, Step 2: Selfie Upload Wizard (for Club Members)
  const [submitting, setSubmitting] = useState(false);
  
  // Selfie upload wizard states
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieRegistered, setSelfieRegistered] = useState(false);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, role, clubName } = formData;

    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if ((role === 'Admin' || role === 'Club Member') && !clubName) {
      setError('Please enter your Club Name');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await register({ name, email, password, role, clubName });
      if (res.success) {
        if (role === 'Club Member') {
          // Go to Step 2: selfie upload
          setStep(2);
        } else {
          // Admin, Photographer, Viewer don't need a selfie collection registration
          navigate('/dashboard');
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleSelfieUpload = async () => {
    if (!selfieFile) {
      setError('Please choose a selfie file first');
      return;
    }
    setError('');
    setSelfieUploading(true);
    try {
      const uploadRes = await uploadSelfie(selfieFile);
      if (uploadRes.success) {
        setSelfieRegistered(true);
      } else {
        setError(uploadRes.message || 'Selfie upload & face indexing failed.');
      }
    } catch (err) {
      setError('Error uploading selfie.');
    } finally {
      setSelfieUploading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex justify-center items-center px-6 py-8">
      {step === 1 ? (
        // STEP 1: Registration Form
        <div className="w-full max-w-[480px] glass-card animate-fade-in-up">
          <h2 className="text-2xl font-extrabold text-center mb-1" style={{ letterSpacing: '-0.02em' }}>Create Account</h2>
          <p className="text-sm text-text-secondary text-center mb-8">Join the centralized event media hub</p>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-error-muted border border-error/15 text-error text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input 
                id="reg-name"
                type="text" 
                name="name"
                className="form-control" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <input 
                id="reg-email"
                type="email" 
                name="email"
                className="form-control" 
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input 
                id="reg-password"
                type="password" 
                name="password"
                className="form-control" 
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="form-group">
                <label>Select Role</label>
                <Dropdown
                  value={formData.role}
                  onChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                  options={[
                    { value: 'Viewer', label: 'Viewer' },
                    { value: 'Club Member', label: 'Club Member' },
                    { value: 'Photographer', label: 'Photographer' },
                    { value: 'Admin', label: 'Club Admin' },
                  ]}
                />
              </div>

              {(formData.role === 'Admin' || formData.role === 'Club Member') && (
                <div className="form-group">
                  <label htmlFor="reg-club">Club Name</label>
                  <input 
                    id="reg-club"
                    type="text" 
                    name="clubName"
                    className="form-control" 
                    placeholder="ACM Club"
                    value={formData.clubName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-2 py-3"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold">
              Sign In
            </Link>
          </p>
        </div>
      ) : (
        // STEP 2: Selfie Wizard for Facial Recognition (Club Member Only)
        <div className="w-full max-w-[480px] glass-card text-center animate-fade-in-up">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-white text-xs font-bold">1</div>
            <div className="w-12 h-[2px] bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">2</div>
          </div>

          <h2 className="text-2xl font-extrabold mb-2" style={{ letterSpacing: '-0.02em' }}>Register Your Face</h2>
          <p className="text-sm text-text-secondary mb-8">
            Upload a reference selfie. Our AI system will scan event uploads to automatically find and link photos of you.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-error-muted border border-error/15 text-error text-sm font-semibold text-center">
              {error}
            </div>
          )}

          {!selfieRegistered ? (
            <div className="flex flex-col items-center">
              <div 
                className="w-36 h-36 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden mb-6 bg-bg-tertiary cursor-pointer hover:border-primary transition-all duration-200 relative"
                onClick={() => document.getElementById('selfie-input').click()}
              >
                {selfiePreview ? (
                  <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-text-muted flex flex-col items-center">
                    <Camera size={32} className="mb-2" />
                    <span className="text-xs font-semibold">Select Selfie</span>
                  </div>
                )}
              </div>

              <input 
                id="selfie-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleSelfieChange}
              />

              <div className="flex gap-3 w-full">
                <button 
                  className="btn btn-primary flex-1 py-3" 
                  onClick={handleSelfieUpload}
                  disabled={!selfieFile || selfieUploading}
                >
                  {selfieUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Indexing Face...
                    </>
                  ) : (
                    'Register Selfie'
                  )}
                </button>
                <button 
                  className="btn btn-secondary py-3" 
                  onClick={() => navigate('/dashboard')}
                  disabled={selfieUploading}
                >
                  Skip for Now
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 rounded-full bg-success-muted border border-success/20 flex items-center justify-center text-success mb-6">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Selfie Registered!</h3>
              <p className="text-sm text-text-secondary mb-8">
                Your face has been successfully indexed. You will be automatically tagged in event photos.
              </p>
              <button className="btn btn-primary w-full py-3" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Register;
