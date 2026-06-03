import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom Dropdown replacing native <select>.
 *
 * Props:
 *  - value       : current selected value
 *  - onChange     : (value) => void
 *  - options      : [{ value, label }]
 *  - placeholder  : shown when value is empty/null
 *  - size         : 'sm' | 'md' (default 'md')
 *  - className    : extra wrapper classes
 *  - id           : optional id for label association
 *  - width        : optional tailwind width class (e.g. 'w-[130px]')
 */
const Dropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  size = 'md',
  className = '',
  id,
  width = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      // Pre-focus the selected item when opening
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex((o) => o.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          handleSelect(options[focusedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Sizing
  const sizeClasses =
    size === 'sm'
      ? 'py-[6px] px-3 text-xs min-h-[32px]'
      : 'py-[10px] px-[14px] text-[14px] min-h-[40px]';

  const optionSizeClasses =
    size === 'sm' ? 'py-[6px] px-3 text-xs' : 'py-[9px] px-[14px] text-[13px]';

  return (
    <div
      ref={containerRef}
      className={`relative ${width} ${className}`}
      id={id}
    >
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          w-full flex items-center justify-between gap-2
          bg-bg-primary border rounded-md outline-none cursor-pointer
          font-medium transition-all duration-200
          ${sizeClasses}
          ${isOpen
            ? 'border-primary ring-[3px] ring-primary/20 bg-bg-secondary'
            : 'border-border-color hover:border-border-hover'
          }
          ${selectedOption ? 'text-text-primary' : 'text-text-muted'}
        `}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Options List */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="
            absolute z-50 mt-1 w-full
            bg-bg-secondary border border-border-hover rounded-md
            shadow-[0_8px_30px_rgba(0,0,0,0.35)]
            max-h-[220px] overflow-y-auto
            py-1
            animate-slide-up
          "
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isFocused = idx === focusedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`
                  flex items-center justify-between gap-2 cursor-pointer
                  transition-colors duration-100
                  ${optionSizeClasses}
                  ${isFocused ? 'bg-primary/10 text-text-primary' : ''}
                  ${isSelected && !isFocused ? 'text-primary font-semibold' : ''}
                  ${!isSelected && !isFocused ? 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary' : ''}
                `}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check size={14} className="flex-shrink-0 text-primary" />
                )}
              </li>
            );
          })}

          {options.length === 0 && (
            <li className="px-4 py-3 text-xs text-text-muted text-center">
              No options available
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
