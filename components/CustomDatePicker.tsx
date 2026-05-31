import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    className?: string;
    required?: boolean;
}

const DAYS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    label,
    value,
    onChange,
    className = '',
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    // Initialize currentMonth based on value
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setCurrentMonth(d);
            }
        }
    }, [value, isOpen]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateSelect = (day: number) => {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Format as YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${date}`);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const days = [];
        
        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
        }
        
        // Days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            
            days.push(
                <button
                    key={i}
                    onClick={() => handleDateSelect(i)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                        isSelected 
                            ? 'bg-[#795548] text-white shadow-md' 
                            : isToday
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                    {i}
                </button>
            );
        }
        
        return days;
    };

    return (
        <div className={`space-y-1 ${className}`} dir="rtl">
            {label && <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">{label} {required && <span className="text-red-500">*</span>}</label>}
            
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[#795548] outline-none transition-all font-bold text-sm flex items-center justify-between shadow-sm"
            >
                <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                    {value ? value.replace(/-/g, '/') : 'اختر التاريخ'}
                </span>
                <CalendarIcon size={18} className="text-gray-400" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">اختر التاريخ</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-6">
                                <button 
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                    className="p-2 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                                >
                                    <ChevronRight size={20} className="text-gray-700 dark:text-gray-200" />
                                </button>
                                
                                <div className="text-center">
                                    <h4 className="font-black text-gray-900 dark:text-white text-lg">
                                        {MONTHS[currentMonth.getMonth()]}
                                    </h4>
                                    <p className="text-sm font-bold text-gray-500">{currentMonth.getFullYear()}</p>
                                </div>
                                
                                <button 
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                    className="p-2 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                                >
                                    <ChevronLeft size={20} className="text-gray-700 dark:text-gray-200" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                {DAYS.map((day, idx) => (
                                    <div key={idx} className="text-xs font-black text-gray-400 dark:text-gray-500 py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 place-items-center">
                                {renderCalendar()}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-slate-750 border-t border-gray-100 dark:border-slate-700">
                            <button 
                                onClick={() => {
                                    const today = new Date();
                                    handleDateSelect(today.getDate());
                                }}
                                className="w-full py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition"
                            >
                                اختيار اليوم
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
