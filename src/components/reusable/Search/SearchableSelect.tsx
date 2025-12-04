import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BookOpen, Calendar } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  noOptionsMessage?: string;
  asyncSearch?: (query: string) => Promise<Option[]>;
  minChars?: number;
}

interface MultiSearchableSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplayItems?: number;
  noOptionsMessage?: string;
  noMoreOptionsMessage?: string;
  startTypingMessage?: string;
}

const SearchableSelectSearch: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...', 
  className = '',
  noOptionsMessage = 'No options found',
  asyncSearch,
  minChars = 2,
}) => {
  // Validate props
  if (!onChange) {
    console.error('SearchableSelectSearch: Missing required props');
    return null;
  }
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<Option[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [isMouseInside, setIsMouseInside] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sourceOptions = asyncOptions ?? options;
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Set display value based on selected value
  useEffect(() => {
    if (value && selectedOption && selectedOption.value === value) {
      // Show the selected option label (without icon prefix since it's just text)
      setDisplayValue(selectedOption.label);
    } else {
      // Find and display the current value
      const foundOption = sourceOptions.find(opt => opt.value === value);
      if (foundOption) {
        setSelectedOption(foundOption);
        setDisplayValue(foundOption.label);
      } else {
        setDisplayValue('');
      }
    }
  }, [value, sourceOptions, selectedOption]);
  
  // Memoize filtered options for better performance
  const filteredOptions = useMemo(() => {
    return sourceOptions.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [sourceOptions, search]);

  // Async search loader with debouncing
  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    const run = async () => {
      if (!asyncSearch) return;
      if (search.trim().length < minChars) {
        setAsyncOptions(null);
        return;
      }
      
      setLoading(true);
      try {
        const res = await asyncSearch(search.trim());
        if (!cancelled) {
          setAsyncOptions(res);
        }
      } catch (e) {
        console.error('Async search error:', e);
        if (!cancelled) {
          setAsyncOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    // Debounce the search
    timeoutId = setTimeout(run, 300);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [search, asyncSearch, minChars]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    setSearch(newSearch);
    setIsOpen(true);
  }, []);

  const handleOptionClick = useCallback((option: Option) => {
    setSelectedOption(option);
    onChange(option.value);
    setSearch('');
    setIsOpen(false);
  }, [onChange]);

  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay closing to allow clicking on options
    setTimeout(() => setIsOpen(false), 1000);
  }, []);

  return (
    <div ref={containerRef} className={`relative searchable-select-container ${className}`}>
      <input
        type="text"
        value={displayValue}
        readOnly
        onFocus={handleInputFocus}
        onBlur={() => {}}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm text-gray-500 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 cursor-pointer hover:bg-gray-50"
      />
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-hidden"
          onWheelCapture={(e) => e.stopPropagation()}
          onScrollCapture={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
        >
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={search}
              onChange={handleInputChange}
              placeholder="Search..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-500"
              autoFocus
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="px-3 py-2 text-gray-500 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Searching…
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSchedule = opt.value.startsWith('schedule:');
                const isEvent = opt.value.startsWith('event:');
                const Icon = isSchedule ? BookOpen : isEvent ? Calendar : null;
                
                return (
                  <div
                    key={opt.value}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      opt.value === value ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    }`}
                    onClick={() => handleOptionClick(opt)}
                  >
                    {Icon && <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                    <span>{opt.label}</span>
                  </div>
                );
              })
            ) : search.trim().length >= minChars ? (
              <div className="px-3 py-2 text-gray-500 text-sm">{noOptionsMessage}</div>
            ) : (
              <div className="px-3 py-2 text-gray-400 text-sm">
                {minChars > 1 ? `Type at least ${minChars} characters to search` : 'Start typing to search'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MultiSearchableSelectSearch: React.FC<MultiSearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...', 
  className = '',
  maxDisplayItems = 3,
  noOptionsMessage = 'No options found',
  noMoreOptionsMessage = 'No more options found',
  startTypingMessage = 'Start typing to search'
}) => {
  // Validate props
  if (!onChange) {
    console.error('MultiSearchableSelectSearch: Missing required props');
    return null;
  }
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Memoize filtered options for better performance
  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase()) && !value.includes(opt.value)
    );
  }, [options, search, value]);

  // Memoize selected options and display text
  const selectedOptions = useMemo(() => {
    return options.filter(opt => value.includes(opt.value));
  }, [options, value]);
  
  const displayText = useMemo(() => {
    return selectedOptions.length > 0 
      ? selectedOptions.slice(0, maxDisplayItems).map(opt => opt.label).join(', ') + 
        (selectedOptions.length > maxDisplayItems ? ` +${selectedOptions.length - maxDisplayItems} more` : '')
      : search;
  }, [selectedOptions, maxDisplayItems, search]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
  }, []);

  const handleOptionClick = useCallback((option: Option) => {
    onChange([...value, option.value]);
    setSearch('');
  }, [onChange, value]);

  const handleRemoveOption = useCallback((optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  }, [onChange, value]);

  const handleInputFocus = useCallback(() => {
    setSearch('');
    setIsOpen(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Delay closing to allow clicking on options
    setTimeout(() => setIsOpen(false), 1000);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="min-h-[42px] px-3 py-2 border border-gray-300 rounded bg-background text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400">
        {/* Selected Items Display */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedOptions.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(option.value)}
                  className="hover:bg-gray-200 rounded p-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Search Input */}
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={() => {}}
          placeholder={selectedOptions.length === 0 ? placeholder : "Add more..."}
          className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-500"
        />
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-hidden"
          onWheelCapture={(e) => e.stopPropagation()}
          onScrollCapture={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
        >
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={search}
              onChange={handleInputChange}
              placeholder="Search..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-500"
              autoFocus
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto overscroll-contain">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div
                key={opt.value}
                className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors text-gray-700"
                onClick={() => handleOptionClick(opt)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded"></div>
                  <div>
                    <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.value}</div>
                  </div>
                </div>
              </div>
            ))
          ) : search ? (
            <div className="px-3 py-2 text-gray-500 text-sm">{noMoreOptionsMessage}</div>
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">{startTypingMessage}</div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export { MultiSearchableSelectSearch };
export default SearchableSelectSearch; 