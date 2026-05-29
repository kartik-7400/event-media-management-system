import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, ShieldAlert, Sparkles, Loader2, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const themes = {
  indigo: { name: 'Indigo Cyber', primary: '#6366f1', primaryHover: '#4f46e5', accent: '#d946ef', accentHover: '#c026d3' },
  emerald: { name: 'Emerald Wave', primary: '#10b981', primaryHover: '#059669', accent: '#3b82f6', accentHover: '#2563eb' },
  crimson: { name: 'Crimson Sunset', primary: '#f43f5e', primaryHover: '#e11d48', accent: '#f59e0b', accentHover: '#d97706' }
};

const Profile = () => {
  const { user, uploadSelfie } = useAuth();
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieSuccess, setSelfieSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('theme') || 'indigo');

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  const applyTheme = (themeName) => {
    const selected = themes[themeName] || themes.indigo;
    document.documentElement.style.setProperty('--color-primary-val', selected.primary);
    document.documentElement.style.setProperty('--color-primary-hover-val', selected.primaryHover);
    document.documentElement.style.setProperty('--color-accent-val', selected.accent);
    document.documentElement.style.setProperty('--color-accent-hover-val', selected.accentHover);
    localStorage.setItem('theme', themeName);
  };

  const handleSelfieChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
      setSelfieSuccess(false);
    }
  };

  const handleSelfieUpload = async () => {
    if (!selfieFile) return;
    setError('');
    setSelfieSuccess(false);
    setSelfieUploading(true);

    try {
      const res = await uploadSelfie(selfieFile);
      if (res.success) {
        setSelfieSuccess(true);
        setSelfieFile(null);
      } else {
        setError(res.message || 'Face indexing failed.');
      }
    } catch (err) {
      setError('Error uploading selfie.');
    } finally {
      setSelfieUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-extrabold font-heading text-text-primary mb-8 border-b border-white/5 pb-4">
        Account Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up">
        {/* User Card */}
        <div className="md:col-span-1 flex flex-col items-center glass-card p-6 text-center h-fit">
          <div className="w-24 h-24 rounded-full border-2 border-primary overflow-hidden bg-bg-tertiary flex items-center justify-center text-primary mb-4">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="selfie" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-heading font-bold">{user.name.charAt(0)}</span>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-text-primary">{user.name}</h3>
          <span className="text-xs text-primary font-bold uppercase tracking-wider mb-2">{user.role}</span>
          <p className="text-xs text-text-secondary">{user.email}</p>
          {user.clubName && (
            <p className="text-xs text-text-muted mt-2 bg-white/5 border border-white/5 px-2.5 py-1 rounded">
              Club: {user.clubName}
            </p>
          )}
        </div>

        {/* Form and Upload controls */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Dynamic Theme Changer */}
          <div className="glass-card">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <Palette size={18} className="text-primary" /> Dynamic Theme Customization
            </h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Theme colors are completely variable-driven and do not rely on hardcoded Tailwind configurations. Choose a preset below to instantly recolor the entire application.
            </p>
            <div className="flex gap-4">
              {Object.keys(themes).map(key => (
                <button
                  key={key}
                  className={`btn text-xs py-2 px-4 rounded border flex items-center gap-2 ${activeTheme === key ? 'border-primary bg-primary/10 text-white font-bold' : 'border-white/10 text-text-secondary hover:text-white'}`}
                  onClick={() => setActiveTheme(key)}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: themes[key].primary }}></span>
                  {themes[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Selfie Upload Settings (Only for Club Members) */}
          {user.role === 'Club Member' && (
            <div className="glass-card">
              <h3 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                <Camera size={18} className="text-accent" /> Face Recognition Selfie
              </h3>
              <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                Upload a clear portrait photo. This image will be indexed into AWS Rekognition to scan event albums and automatically link matched media to your gallery.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-xs font-bold text-center">
                  {error}
                </div>
              )}
              {selfieSuccess && (
                <div className="mb-4 p-3 rounded bg-success/10 border border-success/20 text-success text-xs font-bold text-center">
                  Selfie registered and face indexed successfully!
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div 
                  className="w-32 h-32 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden bg-white/[0.01] cursor-pointer hover:border-primary transition-all relative"
                  onClick={() => document.getElementById('profile-selfie-input').click()}
                >
                  {selfiePreview ? (
                    <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                  ) : user.profilePicture ? (
                    <img src={user.profilePicture} alt="Selfie Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-text-secondary flex flex-col items-center">
                      <Camera size={24} className="mb-1" />
                      <span className="text-[10px] font-semibold">Select Photo</span>
                    </div>
                  )}
                </div>

                <input 
                  id="profile-selfie-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleSelfieChange}
                />

                <div className="flex-1 text-left">
                  <h4 className="text-sm font-bold text-text-primary mb-1">Selfie Guidelines</h4>
                  <ul className="list-disc pl-4 text-xs text-text-secondary space-y-1 mb-4">
                    <li>Stand in a well-lit area</li>
                    <li>Look directly at the camera</li>
                    <li>Avoid hats, sunglasses, or busy face gear</li>
                  </ul>
                  
                  <button 
                    className="btn btn-primary text-xs py-2 px-4"
                    onClick={handleSelfieUpload}
                    disabled={!selfieFile || selfieUploading}
                  >
                    {selfieUploading ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Indexing Face...
                      </>
                    ) : (
                      'Update Selfie Photo'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simple Info Alert */}
          <div className="glass-card border border-white/5 flex gap-3 p-4 bg-white/[0.01]">
            <ShieldAlert size={20} className="text-primary flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-text-primary mb-1">Privacy & Security</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Your uploaded selfie photo is analyzed securely using AWS Rekognition APIs and stored inside private S3 cloud folders. Vector indexes are isolated on a per-application basis and are never shared publicly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
