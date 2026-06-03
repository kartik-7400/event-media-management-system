import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Film, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FileDropzone = ({ eventId, onUploadSuccess }) => {
  const { token } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({}); // format: { [fileId]: percentage }
  const [status, setStatus] = useState({}); // format: { [fileId]: 'pending' | 'uploading' | 'processing' | 'done' | 'error' }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) return;

    const filesWithPreviews = validFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      preview: URL.createObjectURL(file),
      type: file.type
    }));

    setSelectedFiles(prev => [...prev, ...filesWithPreviews]);
    
    const initialStatus = {};
    filesWithPreviews.forEach(f => {
      initialStatus[f.id] = 'pending';
    });
    setStatus(prev => ({ ...prev, ...initialStatus }));
  };

  const removeFile = (fileId, index) => {
    URL.revokeObjectURL(selectedFiles[index].preview);
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setStatus(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  const uploadSingleFile = (fileObj) => {
    return new Promise(async (resolve, reject) => {
      const fileId = fileObj.id;
      const file = fileObj.file;

      try {
        setStatus(prev => ({ ...prev, [fileId]: 'uploading' }));
        setProgress(prev => ({ ...prev, [fileId]: 0 }));

        const response = await fetch('/api/media/request-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            eventId
          })
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message);
        }

        const { url, key, isMock } = result.data;

        const xhr = new XMLHttpRequest();
        const uploadUrl = isMock ? `${url}?key=${key}` : url;
        
        xhr.open('PUT', uploadUrl, true);
        
        if (!isMock) {
          xhr.setRequestHeader('Content-Type', file.type);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 100);
            setProgress(prev => ({ ...prev, [fileId]: percentage }));
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              setStatus(prev => ({ ...prev, [fileId]: 'processing' }));
              
              const confirmResponse = await fetch('/api/media/confirm-upload', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, eventId })
              });
              const confirmResult = await confirmResponse.json();

              if (confirmResult.success) {
                setStatus(prev => ({ ...prev, [fileId]: 'done' }));
                resolve(confirmResult.data);
              } else {
                throw new Error(confirmResult.message);
              }
            } catch (err) {
              setStatus(prev => ({ ...prev, [fileId]: 'error' }));
              reject(err);
            }
          } else {
            setStatus(prev => ({ ...prev, [fileId]: 'error' }));
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => {
          setStatus(prev => ({ ...prev, [fileId]: 'error' }));
          reject(new Error('Network error'));
        };

        xhr.send(file);

      } catch (err) {
        console.error(`Upload failed:`, err);
        setStatus(prev => ({ ...prev, [fileId]: 'error' }));
        reject(err);
      }
    });
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    const uploadPromises = selectedFiles
      .filter(f => status[f.id] === 'pending' || status[f.id] === 'error')
      .map(f => uploadSingleFile(f));

    try {
      await Promise.allSettled(uploadPromises);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error('Bulk upload finished with errors', error);
    } finally {
      setUploading(false);
    }
  };

  const hasPendingFiles = selectedFiles.some(f => status[f.id] === 'pending' || status[f.id] === 'error');

  return (
    <div className="bg-bg-secondary border border-border-color rounded-md p-6">
      <div 
        className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer flex flex-col items-center justify-center transition-all duration-300
          ${uploading ? 'opacity-50 cursor-not-allowed border-border-color' : ''}
          ${isDragging ? 'border-primary bg-primary-muted' : 'border-border-hover hover:border-primary hover:bg-primary-muted/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-200 ${isDragging ? 'bg-primary/20 text-primary' : 'bg-bg-tertiary text-text-secondary'}`}>
          <Upload size={24} />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Drag & drop photos or videos here</h3>
        <p className="text-sm text-text-secondary mb-3">or click to browse files from your device</p>
        <span className="text-xs text-text-muted">Supports bulk uploads of images and MP4 videos</span>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-6 border-t border-border-color pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-text-primary">Files Selected ({selectedFiles.length})</h4>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleUploadAll}
              disabled={uploading || !hasPendingFiles}
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload All'
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-h-[400px] overflow-y-auto pr-1">
            {selectedFiles.map((fileObj, index) => {
              const fileId = fileObj.id;
              const fileStatus = status[fileId];
              const fileProgress = progress[fileId] || 0;
              const isVideo = fileObj.type.startsWith('video/');

              return (
                <div key={fileId} className="relative flex flex-col bg-bg-tertiary border border-border-color rounded-md p-2">
                  <div className="relative w-full aspect-[4/3] rounded overflow-hidden bg-black flex items-center justify-center">
                    {isVideo ? (
                      <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-text-muted">
                        <Film size={24} />
                      </div>
                    ) : (
                      <img src={fileObj.preview} alt="preview" className="w-full h-full object-cover" />
                    )}
                    
                    {!uploading && (
                      <button 
                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-error transition-all duration-200 border-none" 
                        onClick={(e) => { e.stopPropagation(); removeFile(fileId, index); }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col mt-2 gap-1.5">
                    <span className="text-xs font-semibold text-text-primary truncate" title={fileObj.name}>
                      {fileObj.name}
                    </span>
                    
                    {fileStatus === 'uploading' && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-bg-elevated h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-150" 
                            style={{ width: `${fileProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-text-secondary font-bold min-w-[28px] text-right">{fileProgress}%</span>
                      </div>
                    )}

                    {fileStatus === 'processing' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-warning font-semibold">
                        <Loader2 size={12} className="animate-spin" />
                        Processing AI...
                      </div>
                    )}

                    {fileStatus === 'done' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-success font-bold">
                        <CheckCircle size={12} /> Uploaded
                      </div>
                    )}

                    {fileStatus === 'error' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-error font-bold">
                        <AlertCircle size={12} /> Error
                      </div>
                    )}

                    {fileStatus === 'pending' && (
                      <div className="text-[11px] text-text-muted font-medium">Ready</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
