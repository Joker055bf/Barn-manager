import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Pen } from '../types';

interface MoveSheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetPenId: string, count?: number, gender?: 'male' | 'female', reason?: string) => void;
  currentPenId: string;
  availablePens: Pen[];
  maxCount?: number;
  breakdown?: { male: number; female: number };
}

export const MoveSheepModal: React.FC<MoveSheepModalProps> = ({
  isOpen, onClose, onMove, currentPenId, availablePens, maxCount, breakdown
}) => {
  const [targetPenId, setTargetPenId] = useState('');
  const [count, setCount] = useState<number>(1);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'all'>('all');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (breakdown) {
        if (breakdown.male > 0) setSelectedGender('male');
        else if (breakdown.female > 0) setSelectedGender('female');
        else setSelectedGender('all');
        setCount(1);
      } else {
        setSelectedGender('all');
        setCount(maxCount || 1);
      }
    }
  }, [isOpen, maxCount, breakdown]);

  const effectiveMax = breakdown
    ? (selectedGender === 'male' ? breakdown.male : selectedGender === 'female' ? breakdown.female : (breakdown.male + breakdown.female))
    : (maxCount || 0);

  const validTargets = availablePens.filter(p => p.id !== currentPenId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPenId) {
      onMove(targetPenId, maxCount || breakdown ? count : undefined, selectedGender !== 'all' ? selectedGender : undefined, reason);
      onClose();
      setTargetPenId('');
      setReason('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="glass-effect rounded-[2rem] w-full max-w-[320px] shadow-2xl overflow-hidden animate-scale-in dark:bg-slate-900/90 dark:border dark:border-slate-800">
        <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-6 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter">نقل الحيوان</h2>
              <p className="text-orange-100/60 text-[8px] font-bold uppercase tracking-widest leading-none">تغيير القسم الحالي</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="absolute top-4 left-4 text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {validTargets.length === 0 ? (
            <div className="text-center py-10 bg-orange-50/50 rounded-2xl border border-dashed border-orange-200 dark:bg-slate-800/50 dark:border-slate-700">
              <p className="text-sm font-bold text-orange-800 dark:text-orange-400">
                لا توجد أقسام متاحة للنقل إليها
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="group">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">الوجهة المستهدفة</label>
                <div className="relative">
                  <select
                    required
                    value={targetPenId}
                    onChange={(e) => setTargetPenId(e.target.value)}
                    className="w-full px-5 py-3.5 bg-gray-50/50 text-gray-900 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none appearance-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">-- اختر الوجهة --</option>
                    {validTargets.map(pen => (
                      <option key={pen.id} value={pen.id}>
                        {pen.name} {pen.id.includes('mortality') ? '(استبعاد)' : `(قسم مستقل)`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {breakdown ? (
                <div className="grid grid-cols-2 gap-4 animate-fade-in-down">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">الجنس</label>
                    <select
                      value={selectedGender}
                      onChange={(e) => { setSelectedGender(e.target.value as any); setCount(1); }}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      {breakdown.male > 0 && <option value="male">ذكور ({breakdown.male})</option>}
                      {breakdown.female > 0 && <option value="female">إناث ({breakdown.female})</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">العدد</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={effectiveMax}
                        value={count}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > effectiveMax) setCount(effectiveMax);
                          else setCount(val);
                        }}
                        className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-black text-center text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <div className="absolute -bottom-5 right-0 w-full text-[9px] font-black text-orange-500 uppercase text-center tracking-tighter">الحـد الأقصى: {effectiveMax}</div>
                    </div>
                  </div>
                </div>
              ) : (maxCount && maxCount > 0 && (
                <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100 dark:bg-slate-800 dark:border-slate-700">
                  <label className="block text-[10px] font-black text-orange-800 uppercase tracking-widest mb-3 text-center dark:text-orange-400">الكمية المراد نقلها</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max={maxCount}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="flex-1 px-4 py-3 bg-white text-gray-900 border border-gray-100 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-black text-xl text-center dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                    />
                    <div className="text-[10px] font-black text-gray-400 uppercase leading-none">
                      من أصل<br/><span className="text-lg text-orange-600">{maxCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {targetPenId.includes('mortality') && (
            <div className="animate-fade-in-down group">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 px-1">سبب الاستبعاد / النقل</label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="مثال: بيع، مرض، استبعاد..."
                className="w-full px-5 py-3.5 bg-red-50/30 text-gray-900 border border-red-100 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-red-900/20 dark:text-white"
              />
            </div>
          )}

          <div className="pt-4 mt-2">
            <button
              type="submit"
              disabled={validTargets.length === 0 || !targetPenId || (breakdown !== undefined && count > effectiveMax)}
              className="w-full flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl shadow-orange-600/20 disabled:opacity-30 disabled:grayscale hover:scale-[1.02] active:scale-95"
            >
              <ArrowRightLeft size={22} />
              <span>تأكيد عملية النقل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
