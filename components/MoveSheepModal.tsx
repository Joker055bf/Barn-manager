import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRightLeft, Skull, FileText } from 'lucide-react';
import { Pen } from '../types';

interface MoveSheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetPenId: string, reason?: string) => void;
  currentPenId: string;
  availablePens: Pen[]; // Pens in the same group
}

// Custom icons
const SkullCrossbonesIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 448 512" 
    fill="currentColor"
  >
    <path d="M439.15 453.06L297.17 384l141.99-69.06c7.9-3.95 11.11-13.56 7.15-21.46L432 264.85c-3.95-7.9-13.56-11.11-21.47-7.16L224 348.41 37.47 257.69c-7.9-3.95-17.51-.75-21.47 7.16L1.69 293.48c-3.95 7.9-.75 17.51 7.15 21.46L150.83 384 8.85 453.06c-7.9 3.95-11.11 13.56-7.15 21.47l14.31 28.63c3.95 7.9 13.56 11.11 21.47 7.15L224 419.59l186.53 90.72c7.9 3.95 17.51.75 21.47-7.15l14.31-28.63c3.95-7.91.74-17.52-7.16-21.47zM150 237.28l-5.48 25.87c-2.67 12.62 5.42 24.85 16.45 24.85h126.08c11.03 0 19.12-12.23 16.45-24.85l-5.5-25.87c41.78-22.41 70-62.75 70-109.28C368 57.31 303.53 0 224 0S80 57.31 80 128c0 46.53 28.22 86.87 70 109.28zM280 112c17.65 0 32 14.35 32 32s-14.35 32-32 32-32-14.35-32-32 14.35-32 32-32zm-112 0c17.65 0 32 14.35 32 32s-14.35 32-32 32-32-14.35-32-32 14.35-32 32-32z" />
  </svg>
);


const FlyingCashIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Bill (banknote) */}
    <rect x="5.5" y="9" width="13" height="8" rx="1.5" />
    <circle cx="12" cy="13" r="1.5" />
    {/* Left wing flapping up */}
    <path d="M5.5 11c-2-3-4.5-2.5-4.5.5 0 2 1.5 3 4.5 2" />
    <path d="M4.5 12c-1.5-1.5-3-1-3 1 0 1 1 2.5 3 1.5" />
    {/* Right wing flapping up */}
    <path d="M18.5 11c2-3 4.5-2.5 4.5.5 0 2-1.5 3-4.5 2" />
    <path d="M19.5 12c1.5-1.5 3-1 3 1 0 1-1 2.5-3 1.5" />
  </svg>
);

const CleaverIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Blade */}
    <path d="M9 15l8-8 4 4-8 8-4-4z" />
    {/* Handle */}
    <path d="M9 15l-6 6" />
    {/* Hole */}
    <circle cx="17" cy="10" r="0.75" fill="currentColor" />
  </svg>
);


export const MoveSheepModal: React.FC<MoveSheepModalProps> = ({ isOpen, onClose, onMove, currentPenId, availablePens }) => {
  const [targetPenId, setTargetPenId] = useState('');
  const [exclusionType, setExclusionType] = useState<'ذبح' | 'ميت' | 'بيع' | 'آخر' | ''>('');
  const [reason, setReason] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
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

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTargetPenId('');
      setExclusionType('');
      setReason('');
      setSaleAmount('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPenId) {
      const isExclusion = targetPenId.includes('mortality');
      let finalReason = undefined;
      if (isExclusion) {
        if (exclusionType === 'آخر') {
          finalReason = reason;
        } else if (exclusionType === 'بيع') {
          finalReason = `بيع - بقيمة ${saleAmount} ريال`;
        } else {
          finalReason = exclusionType;
        }
      }

      onMove(targetPenId, finalReason);
      onClose();
      setTargetPenId('');
      setExclusionType('');
      setReason('');
      setSaleAmount('');
    }
  };

  if (!isOpen) return null;

  const isExclusion = targetPenId.includes('mortality');
  const isExclusionValid = !isExclusion || (
    exclusionType !== '' && (
      (exclusionType === 'آخر' && reason.trim() !== '') ||
      (exclusionType === 'بيع' && saleAmount.trim() !== '') ||
      (exclusionType !== 'آخر' && exclusionType !== 'بيع')
    )
  );

  // Dynamic theme based on selected exclusion type
  const getExclusionTheme = () => {
    switch (exclusionType) {
      case 'ذبح':
        return {
          btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/25 dark:shadow-red-900/30',
          icon: (
            <div className="flex items-center gap-1">
              <Skull size={18} />
              <CleaverIcon size={18} />
            </div>
          )
        };
      case 'ميت':
        return {
          btnClass: 'bg-red-900 hover:bg-red-950 text-white shadow-red-900/30 dark:shadow-red-950/40',
          icon: <SkullCrossbonesIcon size={20} />
        };
      case 'بيع':
        return {
          btnClass: 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/25 dark:shadow-green-900/30',
          icon: <FlyingCashIcon size={20} />
        };
      case 'آخر':
        return {
          btnClass: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/25 dark:shadow-slate-800/35',
          icon: <FileText size={20} />
        };
      default:
        return {
          btnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
          icon: <Skull size={20} />
        };
    }
  };

  const submitBtnTheme = isExclusion 
    ? getExclusionTheme() 
    : {
        btnClass: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20',
        icon: <ArrowRightLeft size={20} />
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 dark:border-slate-800 transition-colors duration-200">
        <div className={`flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800/80 rounded-t-2xl transition-colors duration-300 ${
          isExclusion 
            ? 'bg-red-50 dark:bg-red-950/20' 
            : 'bg-orange-50 dark:bg-orange-950/20'
        }`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 transition-colors duration-300 ${
            isExclusion 
              ? 'text-red-800 dark:text-red-300' 
              : 'text-orange-800 dark:text-orange-300'
          }`}>
            {isExclusion ? <Skull size={20} /> : <ArrowRightLeft size={20} />}
            {isExclusion ? 'الاجراءات (استبعاد الحيوان)' : 'الاجراءات (نقل إلى قسم آخر)'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {validTargets.length === 0 ? (
             <div className="text-center text-gray-500 dark:text-gray-400 py-4">
               لا توجد أقسام أخرى في هذه الحظيرة للنقل إليها.
             </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اختر القسم المستهدف</label>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-850 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 outline-none flex items-center justify-between transition-colors shadow-sm"
              >
                <span className="font-bold">
                  {targetPenId 
                    ? (() => {
                        const p = validTargets.find(t => t.id === targetPenId);
                        return p ? (p.id.includes('mortality') ? p.name : `${p.name} (السعة: ${p.currentCount || 0}/${p.capacity || 0})`) : '-- اختر القسم --';
                      })()
                    : '-- اختر القسم --'}
                </span>
                <div className="text-gray-400 dark:text-gray-500 text-[10px]">▼</div>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-slate-850 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                  <div className="p-2 space-y-1">
                    {validTargets.map(pen => (
                      <button
                        key={pen.id}
                        type="button"
                        onClick={() => {
                          setTargetPenId(pen.id);
                          setIsDropdownOpen(false);
                          if (!pen.id.includes('mortality')) {
                            setExclusionType('');
                            setReason('');
                          }
                        }}
                        className={`w-full text-right px-4 py-2.5 rounded-xl text-[12px] font-black transition-all ${
                          targetPenId === pen.id
                            ? 'bg-orange-600 dark:bg-orange-700 text-white shadow-md'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
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

          {isExclusion && (
            <div className="animate-fade-in space-y-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع الاستبعاد</label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* 1. ذبح */}
                <button
                  type="button"
                  onClick={() => {
                    setExclusionType('ذبح');
                    setReason('ذبح');
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    exclusionType === 'ذبح'
                      ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]'
                      : 'bg-red-50/20 dark:bg-red-950/5 border border-red-100 dark:border-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/10'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Skull size={22} />
                    <CleaverIcon size={22} />
                  </div>
                  <span className="text-xs font-black">ذبح</span>
                </button>

                {/* 2. ميت */}
                <button
                  type="button"
                  onClick={() => {
                    setExclusionType('ميت');
                    setReason('ميت');
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    exclusionType === 'ميت'
                      ? 'bg-red-900 border-red-900 text-white shadow-md shadow-red-900/30 scale-[1.02]'
                      : 'bg-rose-50/15 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-900/10 text-rose-800 dark:text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/10'
                  }`}
                >
                  <SkullCrossbonesIcon />
                  <span className="text-xs font-black">ميت</span>
                </button>

                {/* 3. بيع */}
                <button
                  type="button"
                  onClick={() => {
                    setExclusionType('بيع');
                    setReason('بيع');
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    exclusionType === 'بيع'
                      ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-600/20 scale-[1.02]'
                      : 'bg-green-50/20 dark:bg-green-950/5 border border-green-100 dark:border-green-900/10 text-green-600 dark:text-green-400 hover:bg-green-50/50 dark:hover:bg-green-950/10'
                  }`}
                >
                  <FlyingCashIcon />
                  <span className="text-xs font-black">بيع</span>
                </button>

                {/* 4. آخر */}
                <button
                  type="button"
                  onClick={() => {
                    setExclusionType('آخر');
                    setReason('');
                  }}
                  className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                    exclusionType === 'آخر'
                      ? 'bg-slate-700 border-slate-700 text-white shadow-md shadow-slate-700/25 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <FileText size={24} />
                  <span className="text-xs font-black">آخر</span>
                </button>
              </div>

              {exclusionType === 'آخر' && (
                <div className="animate-fade-in space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">سبب الاستبعاد (إجباري)</label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="اكتب سبب استبعاد الحيوان هنا..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-850 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none h-24 shadow-sm"
                  />
                </div>
              )}

              {exclusionType === 'بيع' && (
                <div className="animate-fade-in space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">مبلغ البيع (ريال) (إجباري)</label>
                  <input
                    required
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="أدخل مبلغ البيع بالريال..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-850 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm font-bold text-center text-lg text-green-600 dark:text-green-400 focus:border-green-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={validTargets.length === 0 || !targetPenId || !isExclusionValid}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${submitBtnTheme.btnClass}`}
            >
              {submitBtnTheme.icon}
              <span>
                {isExclusion 
                  ? `تأكيد الاستبعاد${exclusionType ? ` (${exclusionType})` : ''}` 
                  : 'تأكيد النقل'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
