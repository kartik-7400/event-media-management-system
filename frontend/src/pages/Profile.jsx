import React, { useState } from 'react';
import { Camera, ShieldAlert, Loader2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, uploadSelfie } = useAuth();
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieSuccess, setSelfieSuccess] = useState(false);
  const [error, setError] = useState('');

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
      <h1 className="text-2xl font-extrabold text-text-primary mb-8 border-b border-border-color pb-4" style={{ letterSpacing: '-0.02em' }}>
        Account Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
        {/* User Card */}
        <div className="md:col-span-1 flex flex-col items-center glass-card text-center h-fit">
          <div className="w-20 h-20 rounded-full border-2 border-primary/30 overflow-hidden bg-bg-tertiary flex items-center justify-center text-text-muted mb-4">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={32} />
            )}
          </div>
          
          <h3 className="text-base font-bold text-text-primary">{user.name}</h3>
          <span className="text-xs text-primary font-bold uppercase tracking-wider mb-2">{user.role}</span>
          <p className="text-xs text-text-secondary">{user.email}</p>
          {user.clubName && (
            <p className="text-xs text-text-muted mt-3 bg-bg-tertiary border border-border-color px-3 py-1.5 rounded-md">
              Club: {user.clubName}
            </p>
          )}
        </div>

        {/* Settings Panels */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Selfie Upload Settings (Only for Club Members) */}
          {user.role === 'Club Member' && (
            <div className="glass-card">
              <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
                <Camera size={18} className="text-primary" /> Face Recognition Selfie
              </h3>
              <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                Upload a clear portrait photo. This image will be indexed into AWS Rekognition to scan event albums and automatically link matched media to your gallery.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-md bg-error-muted border border-error/15 text-error text-xs font-bold text-center">
                  {error}
                </div>
              )}
              {selfieSuccess && (
                <div className="mb-4 p-3 rounded-md bg-success-muted border border-success/15 text-success text-xs font-bold text-center">
                  Selfie registered and face indexed successfully!
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div 
                  className="w-28 h-28 rounded-full border-2 border-dashed border-primary/25 flex items-center justify-center overflow-hidden bg-bg-tertiary cursor-pointer hover:border-primary transition-all duration-200 flex-shrink-0"
                  onClick={() => document.getElementById('profile-selfie-input').click()}
                >
                  {selfiePreview ? (
                    <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                  ) : user.profilePicture ? (
                    <img src={user.profilePicture} alt="Current Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-text-muted flex flex-col items-center">
                      <Camera size={20} className="mb-1" />
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
                    className="btn btn-primary text-xs"
                    onClick={handleSelfieUpload}
                    disabled={!selfieFile || selfieUploading}
                  >
                    {selfieUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
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

          {/* Privacy & Security Info */}
          <div className="glass-card flex gap-3 items-start">
            <div className="w-9 h-9 rounded-md bg-primary-muted border border-primary/15 flex items-center justify-center text-primary flex-shrink-0">
              <ShieldAlert size={18} />
            </div>
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
