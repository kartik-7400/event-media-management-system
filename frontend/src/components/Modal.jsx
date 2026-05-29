import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-bg-primary/85 backdrop-blur-sm flex justify-center items-center z-[1000] p-5"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[500px] bg-bg-secondary border border-border-color rounded-md p-7 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
          <h2 className="text-xl font-bold font-heading text-text-primary bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
            {title}
          </h2>
          <button 
            className="bg-transparent border-none text-text-secondary text-2xl cursor-pointer leading-none hover:text-error hover:rotate-90 transition-all duration-200" 
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="mt-2.5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
