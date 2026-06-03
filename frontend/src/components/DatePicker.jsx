import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Custom DatePicker with month & year quick-select and manual text typing validation.
 *
 * Views:  days  →  (click header) →  months  →  (click header) →  years
 *
 * Props:
 *  - value       : ISO date string 'YYYY-MM-DD' or ''
 *  - onChange     : (isoString) => void
 *  - placeholder  : text when empty
 *  - id           : optional
 */
const DatePicker = ({
  value = '',
  onChange,
  placeholder = 'Select a date',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const parsedDate = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();

  const [viewYear, setViewYear] = useState(parsedDate ? parsedDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate ? parsedDate.getMonth() : today.getMonth());

  // Year grid shows a 12-year range; this is the start year of that range
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(viewYear / 12) * 12);

  // States for text input support
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);

  // Parse typed string to a valid Date object and format ISO string
  const parseTypedDate = (str) => {
    const trimmed = str.trim();
    if (!trimmed) {
      return { valid: true, date: null, iso: '' };
    }

    // Try YYYY-MM-DD format
    const matchIso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (matchIso) {
      const y = parseInt(matchIso[1], 10);
      const m = parseInt(matchIso[2], 10) - 1;
      const d = parseInt(matchIso[3], 10);
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valid: true, date, iso };
      }
    }

    // Try MM/DD/YYYY format
    const matchUs = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchUs) {
      const m = parseInt(matchUs[1], 10) - 1;
      const d = parseInt(matchUs[2], 10);
      const y = parseInt(matchUs[3], 10);
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valid: true, date, iso };
      }
    }

    // Fallback standard Date parsing
    const timestamp = Date.parse(trimmed);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      if (y > 1900 && y < 2100) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valid: true, date, iso };
      }
    }

    return { valid: false, date: null, iso: '' };
  };

  // Sync internal input value when state value or focus state changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        if (isFocused) {
          // Keep raw ISO representation for easy editing
          setInputValue(value);
        } else {
          // Show user-friendly formatted date when blurred
          setInputValue(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
        setIsInvalid(false);
      } else {
        setInputValue('');
        setIsInvalid(false);
      }
    } else {
      setInputValue('');
      setIsInvalid(false);
    }
  }, [value, isFocused]);

  // Sync calendar grid view when value changes externally
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear());
      setViewMonth(parsedDate.getMonth());
    }
  }, [value]);

  // Reset to day view when opening
  useEffect(() => {
    if (isOpen) {
      setView('days');
      if (parsedDate) {
        setViewYear(parsedDate.getFullYear());
        setViewMonth(parsedDate.getMonth());
        setYearRangeStart(Math.floor(parsedDate.getFullYear() / 12) * 12);
      } else {
        setYearRangeStart(Math.floor(viewYear / 12) * 12);
      }
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Day grid ──────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevLastDay = new Date(viewYear, viewMonth, 0).getDate();
    const prev = [];
    for (let i = startDow - 1; i >= 0; i--) {
      prev.push({ day: prevLastDay - i, month: viewMonth - 1, year: viewMonth === 0 ? viewYear - 1 : viewYear, isCurrentMonth: false });
    }

    const curr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      curr.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    }

    const total = prev.length + curr.length;
    const remaining = total <= 35 ? 35 - total : 42 - total;
    const next = [];
    for (let d = 1; d <= remaining; d++) {
      next.push({ day: d, month: viewMonth + 1, year: viewMonth === 11 ? viewYear + 1 : viewYear, isCurrentMonth: false });
    }

    return [...prev, ...curr, ...next];
  }, [viewYear, viewMonth]);

  // ── Navigation helpers ────────────────────────────────────
  const handlePrevMonth = (e) => { e.stopPropagation(); setViewMonth(m => m === 0 ? (setViewYear(y => y - 1), 11) : m - 1); };
  const handleNextMonth = (e) => { e.stopPropagation(); setViewMonth(m => m === 11 ? (setViewYear(y => y + 1), 0) : m + 1); };

  const handleDayClick = (dayObj) => {
    let y = dayObj.year, m = dayObj.month;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    onChange(iso);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIdx) => {
    setViewMonth(monthIdx);
    setView('days');
  };

  const handleYearSelect = (year) => {
    setViewYear(year);
    setYearRangeStart(Math.floor(year / 12) * 12);
    setView('months');
  };

  // ── Input Event Handlers ──────────────────────────────────
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const result = parseTypedDate(val);
    if (result.valid) {
      setIsInvalid(false);
      if (result.iso !== value) {
        onChange(result.iso);
        if (result.date) {
          setViewYear(result.date.getFullYear());
          setViewMonth(result.date.getMonth());
          setYearRangeStart(Math.floor(result.date.getFullYear() / 12) * 12);
        }
      }
    } else {
      setIsInvalid(true);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Re-verify the input. If invalid, reset back to last known valid value
    const result = parseTypedDate(inputValue);
    if (!result.valid) {
      setIsInvalid(false);
      if (value) {
        const d = new Date(value + 'T00:00:00');
        setInputValue(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      } else {
        setInputValue('');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleWrapperClick = () => {
    inputRef.current?.focus();
  };

  const isToday = (d) => d.day === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear();
  const isSelected = (d) => parsedDate && d.day === parsedDate.getDate() && d.month === parsedDate.getMonth() && d.year === parsedDate.getFullYear();

  // ── Year grid (12 years) ──────────────────────────────────
  const yearGrid = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) arr.push(yearRangeStart + i);
    return arr;
  }, [yearRangeStart]);

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Input wrapper replacing the trigger button */}
      <div 
        onClick={handleWrapperClick}
        className={`
          w-full flex items-center gap-2
          bg-bg-primary border rounded-md transition-all duration-200 cursor-text
          px-[14px]
          ${isInvalid 
            ? 'border-error ring-[3px] ring-error/20 bg-bg-secondary' 
            : isOpen 
              ? 'border-primary ring-[3px] ring-primary/20 bg-bg-secondary' 
              : 'border-border-color hover:border-border-hover'
          }
        `}
      >
        <Calendar size={16} className={`flex-shrink-0 transition-colors duration-150 ${isInvalid ? 'text-error' : 'text-text-muted'}`} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none py-[10px] text-[14px] font-medium text-text-primary placeholder:text-text-muted cursor-text"
        />
        {isInvalid && (
          <span className="text-xs font-semibold text-error select-none mr-1 bg-error-muted px-2 py-0.5 rounded animate-pulse">
            Invalid Format
          </span>
        )}
      </div>

      {/* Popup */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-[296px] bg-bg-secondary border border-border-hover rounded-md shadow-[0_8px_30px_rgba(0,0,0,0.35)] p-4 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >

          {/* ═══════════ DAY VIEW ═══════════ */}
          {view === 'days' && (
            <>
              {/* Header: ◀  [Month Year]  ▶ */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Previous month">
                  <ChevronLeft size={18} />
                </button>

                <button type="button" onClick={() => setView('months')}
                  className="text-sm font-bold text-text-primary hover:text-primary cursor-pointer bg-transparent border-none transition-colors duration-150 px-2 py-1 rounded-md hover:bg-white/[0.04]">
                  {MONTHS[viewMonth]} {viewYear}
                </button>

                <button type="button" onClick={handleNextMonth}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Next month">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(wd => (
                  <div key={wd} className="text-center text-[11px] font-semibold text-text-muted py-1 select-none">{wd}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((d, i) => {
                  const sel = isSelected(d);
                  const td = isToday(d);
                  return (
                    <button key={i} type="button"
                      className={`
                        w-[36px] h-[36px] mx-auto rounded-md flex items-center justify-center
                        text-[13px] font-medium cursor-pointer border-none transition-all duration-150
                        ${!d.isCurrentMonth ? 'text-text-muted/40' : ''}
                        ${d.isCurrentMonth && !sel ? 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary' : ''}
                        ${sel ? 'bg-primary text-white font-bold hover:bg-primary-hover' : 'bg-transparent'}
                        ${td && !sel ? 'ring-1 ring-primary/40 text-primary font-semibold' : ''}
                      `}
                      onClick={() => handleDayClick(d)}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-color">
                <button type="button"
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none"
                  onClick={() => {
                    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    onChange(iso);
                    setIsOpen(false);
                  }}>
                  Today
                </button>
                {value && (
                  <button type="button"
                    className="text-xs font-semibold text-text-muted hover:text-error cursor-pointer bg-transparent border-none transition-colors duration-150"
                    onClick={() => { onChange(''); setIsOpen(false); }}>
                    Clear
                  </button>
                )}
              </div>
            </>
          )}

          {/* ═══════════ MONTH VIEW ═══════════ */}
          {view === 'months' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setViewYear(y => y - 1); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Previous year">
                  <ChevronLeft size={18} />
                </button>

                <button type="button" onClick={() => { setYearRangeStart(Math.floor(viewYear / 12) * 12); setView('years'); }}
                  className="text-sm font-bold text-text-primary hover:text-primary cursor-pointer bg-transparent border-none transition-colors duration-150 px-2 py-1 rounded-md hover:bg-white/[0.04]">
                  {viewYear}
                </button>

                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setViewYear(y => y + 1); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Next year">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MONTHS_SHORT.map((m, idx) => {
                  const isCurrent = idx === viewMonth && viewYear === (parsedDate?.getFullYear() ?? -1);
                  const isThisMonth = idx === today.getMonth() && viewYear === today.getFullYear();
                  return (
                    <button key={m} type="button"
                      className={`
                        py-2.5 rounded-md text-[13px] font-medium cursor-pointer border-none transition-all duration-150
                        ${isCurrent ? 'bg-primary text-white font-bold hover:bg-primary-hover' : ''}
                        ${!isCurrent && isThisMonth ? 'ring-1 ring-primary/40 text-primary font-semibold bg-transparent hover:bg-white/[0.06]' : ''}
                        ${!isCurrent && !isThisMonth ? 'text-text-secondary bg-transparent hover:bg-white/[0.06] hover:text-text-primary' : ''}
                      `}
                      onClick={() => handleMonthSelect(idx)}>
                      {m}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-border-color">
                <button type="button"
                  className="text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-none transition-colors duration-150"
                  onClick={() => setView('days')}>
                  ← Back to days
                </button>
              </div>
            </>
          )}

          {/* ═══════════ YEAR VIEW ═══════════ */}
          {view === 'years' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setYearRangeStart(y => y - 12); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Previous years">
                  <ChevronLeft size={18} />
                </button>

                <span className="text-sm font-bold text-text-primary select-none">
                  {yearRangeStart} – {yearRangeStart + 11}
                </span>

                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setYearRangeStart(y => y + 12); }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
                  aria-label="Next years">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {yearGrid.map(yr => {
                  const isCurrent = yr === viewYear && parsedDate && yr === parsedDate.getFullYear();
                  const isThisYear = yr === today.getFullYear();
                  return (
                    <button key={yr} type="button"
                      className={`
                        py-2.5 rounded-md text-[13px] font-medium cursor-pointer border-none transition-all duration-150
                        ${isCurrent ? 'bg-primary text-white font-bold hover:bg-primary-hover' : ''}
                        ${!isCurrent && isThisYear ? 'ring-1 ring-primary/40 text-primary font-semibold bg-transparent hover:bg-white/[0.06]' : ''}
                        ${!isCurrent && !isThisYear ? 'text-text-secondary bg-transparent hover:bg-white/[0.06] hover:text-text-primary' : ''}
                      `}
                      onClick={() => handleYearSelect(yr)}>
                      {yr}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-border-color">
                <button type="button"
                  className="text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-none transition-colors duration-150"
                  onClick={() => setView('months')}>
                  ← Back to months
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
};

export default DatePicker;
