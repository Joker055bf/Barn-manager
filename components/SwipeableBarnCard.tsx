import React, { useState, useRef } from 'react';
import { Trash2, ChevronLeft } from 'lucide-react';

interface SwipeableBarnCardProps {
    name: string;
    onClick: () => void;
    onDelete: () => void;
}

export const SwipeableBarnCard: React.FC<SwipeableBarnCardProps> = ({ name, onClick, onDelete }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const startX = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;

        // Only allow swiping to the right (positive diff)
        // Max swipe width roughly 100px to reveal/activate
        if (diff > 0) {
            // Logarithmic resistance? Or simple 1:1?
            // Let's do 1:1 up to a point
            setOffsetX(diff);

            // Visual feedback threshold
            if (diff > 150) {
                setIsDeleting(true);
            } else {
                setIsDeleting(false);
            }
        }
    };

    const handleTouchEnd = () => {
        if (offsetX > 150) {
            // Trigger Delete
            onDelete();
        }
        // Reset
        setOffsetX(0);
        setIsDeleting(false);
        startX.current = null;
    };

    return (
        <div className="relative w-full h-20 mb-4 overflow-hidden rounded-[2rem] select-none shadow-premium-sm group">
            {/* Background (Delete Layer) */}
            <div
                className={`absolute inset-0 flex items-center justify-start px-6 transition-colors duration-300 ${isDeleting ? 'bg-red-600' : 'bg-red-50'}`}
            >
                <div className="flex items-center gap-2">
                    <Trash2 className={`${isDeleting ? 'text-white' : 'text-red-500'} transition-colors duration-300`} size={24} />
                    {isDeleting && <span className="text-white font-black text-sm">حذف الحظيرة</span>}
                </div>
            </div>

            {/* Foreground (Content Layer) */}
            <div
                ref={containerRef}
                onClick={onClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute inset-0 bg-white dark:bg-slate-900 border border-gray-50 dark:border-slate-800 flex items-center justify-center cursor-pointer hover:bg-[#FFFAF0] transition-all duration-300 ease-out group-hover:shadow-glow-brown"
                style={{ transform: `translateX(${offsetX}px)` }}
            >
                {/* Visual Accent */}
                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#795548] rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Left Icon (Chevron) - Corrected for RTL Enter */}
                <div className="absolute left-6 text-gray-200 dark:text-slate-700 group-hover:text-[#795548] transition-colors duration-300">
                    <ChevronLeft className="rtl:rotate-0" size={24} />
                </div>

                <div className="flex flex-col items-center">
                    <h3 className="font-black text-xl text-[#3E2723] dark:text-gray-100 text-center tracking-tight leading-none">
                        {name}
                    </h3>
                    <div className="w-6 h-1 bg-[#795548]/10 rounded-full mt-2 group-hover:w-10 group-hover:bg-[#795548]/30 transition-all duration-500" />
                </div>
            </div>
        </div>
    );
};
