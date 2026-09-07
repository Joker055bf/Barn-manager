import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';

export interface Option {
    value: string;
    label: string;
    color?: string; // Optional hex or color string for tag color display
    disabled?: boolean;
}

export interface CustomSelectProps {
    label?: string;
    modalTitle?: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    dir?: string;
    required?: boolean;
    textSize?: string;
    variant?: 'modal' | 'dropdown';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    modalTitle,
    value,
    onChange,
    options,
    placeholder = 'اختر',
    className = '',
    dir = 'rtl',
    required = false,
    textSize = 'text-sm',
    variant = 'modal'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; width: number }>({ top: 0, right: 0, width: 200 });

    // Update position when opened for dropdown variant
    useEffect(() => {
        if (isOpen && buttonRef.current && variant === 'dropdown') {
            const updatePos = () => {
                if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect();
                    setDropdownPos({
                        top: rect.bottom + 4,
                        right: window.innerWidth - rect.right,
                        width: Math.max(rect.width, 160)
                    });
                }
            };
            updatePos();
            window.addEventListener('scroll', updatePos, true);
            window.addEventListener('resize', updatePos);
            return () => {
                window.removeEventListener('scroll', updatePos, true);
                window.removeEventListener('resize', updatePos);
            };
        }
    }, [isOpen, variant]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen && variant === 'modal') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, variant]);

    const selectedOption = options.find(opt => opt.value === value);
    const titleText = modalTitle || label || placeholder || 'اختر';

    const renderModalContent = () => (
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            dir={dir}
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="bg-[#18191c] text-white rounded-[2rem] w-full max-w-sm shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-slate-800 overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white text-right tracking-tight">
                        {titleText}
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options List */}
                <div className="p-3 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-1">
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={option.disabled}
                                onClick={() => {
                                    if (!option.disabled) {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer border ${
                                    option.disabled
                                        ? 'opacity-40 cursor-not-allowed border-transparent'
                                        : isSelected
                                            ? 'bg-white/10 border-white/20 text-white font-black'
                                            : 'border-transparent text-gray-200 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {/* Right Side: Label + optional Color Dot */}
                                <div className="flex items-center gap-3">
                                    {option.color && (
                                        <span 
                                            className="w-4 h-4 rounded-full shrink-0 border border-white/30 shadow-sm"
                                            style={{ backgroundColor: option.color === 'none' ? '#6B7280' : option.color }}
                                        />
                                    )}
                                    <span className="text-base font-bold tracking-wide">
                                        {option.label}
                                    </span>
                                </div>

                                {/* Left Side: Radio Circle Icon */}
                                <div className="shrink-0">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isSelected 
                                            ? 'border-emerald-400 bg-emerald-400/20' 
                                            : 'border-gray-500/70'
                                    }`}>
                                        {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {options.length === 0 && (
                        <div className="p-6 text-center text-sm font-bold text-gray-400">
                            لا توجد خيارات متاحة
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDropdownContent = () => (
        <div 
            className="fixed inset-0 z-[99999] bg-transparent"
            onClick={() => setIsOpen(false)}
        >
            <div 
                dir={dir}
                style={{
                    position: 'fixed',
                    top: `${dropdownPos.top}px`,
                    right: `${dropdownPos.right}px`,
                    minWidth: `${dropdownPos.width}px`
                }}
                className="bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-[99999] max-h-60 overflow-y-auto custom-scrollbar animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            disabled={option.disabled}
                            onClick={() => {
                                if (!option.disabled) {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                    ? 'bg-[#795548] text-white'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {option.color && (
                                    <span 
                                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/20 shadow-sm"
                                        style={{ backgroundColor: option.color === 'none' ? '#6B7280' : option.color }}
                                    />
                                )}
                                <span className="truncate">{option.label}</span>
                            </div>
                            {isSelected && <Check size={14} className="shrink-0 text-white" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className={`space-y-1 ${className}`} dir={dir}>
            {label && (
                <label className={`font-bold text-gray-700 dark:text-gray-300 block mb-1 ${
                    textSize === 'text-xs' ? 'text-[10px] text-center' : 'text-xs text-right'
                }`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-[#795548] focus:border-[#795548] outline-none transition-all font-bold flex items-center justify-between shadow-sm cursor-pointer ${
                    textSize === 'text-xs' 
                        ? 'px-2.5 h-[36px] rounded-xl text-xs' 
                        : 'px-4 py-3.5 rounded-2xl text-sm'
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.color && (
                        <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/20 shadow-sm"
                            style={{ backgroundColor: selectedOption.color === 'none' ? '#6B7280' : selectedOption.color }}
                        />
                    )}
                    <span className={selectedOption ? 'text-gray-900 dark:text-white truncate font-bold' : 'text-gray-400 dark:text-gray-500 truncate font-bold'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={textSize === 'text-xs' ? 14 : 18} className="text-gray-400 shrink-0 ml-1" />
            </button>

            {/* Render Popup via React Portal directly onto document.body */}
            {isOpen && createPortal(
                variant === 'dropdown' ? renderDropdownContent() : renderModalContent(),
                document.body
            )}
        </div>
    );
};


