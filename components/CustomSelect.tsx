import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    dir?: string;
    required?: boolean;
    textSize?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'اختر',
    className = '',
    dir = 'rtl',
    required = false,
    textSize = 'text-sm'
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
        <div className={`space-y-1 ${className}`} ref={containerRef} dir={dir}>
            {label && <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">{label} {required && <span className="text-red-500">*</span>}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[#795548] focus:border-[#795548] outline-none transition-all font-bold flex items-center justify-between shadow-sm ${textSize}`}
                >
                    <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                        <div className="p-2 space-y-1">
                            {options.map((option) => {
                                const isSelected = option.value === value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            if (!option.disabled) {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all ${textSize} ${
                                            option.disabled 
                                                ? 'cursor-not-allowed text-gray-600/95 dark:text-slate-400/95 bg-gray-50/70 dark:bg-slate-900/30 font-medium' 
                                                : isSelected
                                                    ? 'bg-[#795548] text-white shadow-md'
                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <Check size={16} className="text-white" />}
                                    </button>
                                );
                            })}
                            {options.length === 0 && (
                                <div className="p-4 text-center text-sm font-bold text-gray-400">لا توجد خيارات</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
