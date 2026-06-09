import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-bg-primary/90 backdrop-blur-sm flex justify-center items-center z-[1000] p-6"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[520px] max-h-[90vh] flex flex-col bg-bg-secondary border border-border-color rounded-md overflow-hidden shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-color flex-shrink-0">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button 
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted bg-transparent border border-transparent cursor-pointer hover:bg-white/[0.06] hover:text-text-primary hover:border-border-color transition-all duration-200" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
