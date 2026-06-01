import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { Pen } from '../types';

interface MoveSheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetPenId: string, reason?: string) => void;
  currentPenId: string;
  availablePens: Pen[]; // Pens in the same group
}

export const MoveSheepModal: React.FC<MoveSheepModalProps> = ({ isOpen, onClose, onMove, currentPenId, availablePens }) => {
  const [targetPenId, setTargetPenId] = useState('');
  const [reason, setReason] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter out the current pen
  const validTargets = availablePens.filter(p => p.id !== currentPenId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPenId) {
      onMove(targetPenId, targetPenId.includes('mortality') ? reason : undefined);
      onClose();
      setTargetPenId('');
      setReason('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-orange-50">
          <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
            <ArrowRightLeft size={20} />
            نقل إلى قسم آخر
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {validTargets.length === 0 ? (
             <div className="text-center text-gray-500 py-4">
               لا توجد أقسام أخرى في هذه الحظيرة للنقل إليها.
             </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">اختر القسم المستهدف</label>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none flex items-center justify-between"
              >
                <span className="font-bold">
                  {targetPenId 
                    ? (() => {
                        const p = validTargets.find(t => t.id === targetPenId);
                        return p ? (p.id.includes('mortality') ? p.name : `${p.name} (السعة: ${p.currentCount || 0}/${p.capacity || 0})`) : '-- اختر القسم --';
                      })()
                    : '-- اختر القسم --'}
                </span>
                <div className="text-gray-400 text-[10px]">▼</div>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                  <div className="p-2 space-y-1">
                    {validTargets.map(pen => (
                      <button
                        key={pen.id}
                        type="button"
                        onClick={() => {
                          setTargetPenId(pen.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-2.5 rounded-xl text-[12px] font-black transition-all ${
                          targetPenId === pen.id
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pen.id.includes('mortality') ? pen.name : `${pen.name} (السعة: ${pen.currentCount || 0}/${pen.capacity || 0})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {targetPenId.includes('mortality') && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-gray-700 mb-2">سبب الاستبعاد (إجباري)</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب سبب استبعاد الحيوان هنا..."
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none h-24"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={validTargets.length === 0 || !targetPenId}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft size={20} />
              <span>{targetPenId.includes('mortality') ? 'تأكيد الاستبعاد' : 'تأكيد النقل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
