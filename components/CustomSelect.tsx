import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'اختر',
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`space-y-1 ${className}`} ref={containerRef}>
            {label && <label className="text-xs font-bold text-gray-700 block mb-1">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-3 py-2.5 bg-[#fcfbf4] text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#795548] focus:bg-white outline-none transition-all font-bold text-sm flex items-center justify-between text-right"
                >
                    <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full right-0 left-0 mt-1 bg-[#fcfbf4] border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-scale-in">
                        <div className="p-1 space-y-0.5">







                                        onClick={() => {
                                            if (!option.disabled) {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                            option.disabled 
                                                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70 dark:bg-slate-800 dark:text-gray-500' 
                                                : isSelected
                                                    ? 'bg-[#795548] text-white shadow-md dark:bg-orange-600'
                                                    : 'text-gray-700 hover:bg-gray-200/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-white'
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <Check size={14} className="text-white" />}
                                    </button>
                                );
                            })}
                            {options.length === 0 && (
                                <div className="p-4 text-center text-xs text-gray-400">لا توجد خيارات</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
