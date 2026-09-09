import React, { useState, useRef, useEffect } from 'react';

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

interface MonthPickerProps {
  value: string; // YYYY-MM, rỗng nếu chưa chọn
  onChange: (yearMonth: string) => void;
  className?: string;
}

const CalendarIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002 2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(value ? parseInt(value.split('-')[0], 10) : currentYear);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  useEffect(() => {
    if (value) {
      setSelectedYear(parseInt(value.split('-')[0], 10));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayValue = value
    ? `Tháng ${parseInt(value.split('-')[1], 10)}/${value.split('-')[0]}`
    : 'Chọn tháng';

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handlePrevYear = () => {
    setSelectedYear(y => (y > years[0] ? y - 1 : y));
  };

  const handleNextYear = () => {
    setSelectedYear(y => (y < years[years.length - 1] ? y + 1 : y));
  };

  const handleMonthClick = (index: number) => {
    const yyyyMM = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
    onChange(yyyyMM);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 text-sm text-left flex justify-between items-center"
      >
        <span className={value ? '' : 'text-gray-400 dark:text-gray-500'}>{displayValue}</span>
        <CalendarIcon />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 z-30 right-0 dropdown-content origin-top-right">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-64">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={handlePrevYear} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" aria-label="Năm trước">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </button>
              <select
                value={selectedYear}
                onChange={handleYearChange}
                className="w-auto px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm font-medium text-gray-700 dark:text-gray-200"
                aria-label="Chọn năm"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button type="button" onClick={handleNextYear} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" aria-label="Năm sau">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, index) => {
                const selected = value === `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthClick(index)}
                    className={`py-2 rounded-md text-sm font-medium transition-colors duration-200 ${selected ? 'bg-teal-600 text-white font-bold' : 'text-gray-700 dark:text-gray-200 hover:bg-teal-100 dark:hover:bg-teal-900'}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPicker;