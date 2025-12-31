import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
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
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اختر القسم المستهدف</label>
                <select
                  required
                  value={targetPenId}
                  onChange={(e) => setTargetPenId(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">-- اختر القسم --</option>
                  {validTargets.map(pen => (
                    <option key={pen.id} value={pen.id}>
                      {pen.name} {pen.id.includes('mortality') ? '' : `(السعة: ${pen.currentCount || 0}/${pen.capacity || 0})`}
                    </option>
                  ))}
                </select>
              </div>

              {breakdown ? (
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">الجنس</label>
                    <select
                      value={selectedGender}
                      onChange={(e) => { setSelectedGender(e.target.value as any); setCount(1); }}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      {breakdown.male > 0 && <option value="male">ذكور ({breakdown.male})</option>}
                      {breakdown.female > 0 && <option value="female">إناث ({breakdown.female})</option>}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">العدد</label>
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
                        className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-center"
                      />
                      <div className="absolute left-0 -bottom-5 text-[10px] text-gray-400 w-full text-center">أقصى حد: {effectiveMax}</div>
                    </div>
                  </div>
                </div>
              ) : (maxCount && maxCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">العدد المطلوب نقله</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={maxCount}
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-center"
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">من أصل {maxCount}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {targetPenId.includes('mortality') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">سبب الانتقال</label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="مثال: بيع، مرض، استبعاد..."
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          )}

          <div className="pt-2 mt-4">
            <button
              type="submit"
              disabled={validTargets.length === 0 || !targetPenId || (breakdown !== undefined && count > effectiveMax)}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft size={20} />
              <span>تأكيد النقل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
