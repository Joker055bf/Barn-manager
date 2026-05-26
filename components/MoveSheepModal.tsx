import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { Pen } from '../types';

interface MoveSheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetPenId: string) => void;
  currentPenId: string;
  availablePens: Pen[]; // Pens in the same group
}

export const MoveSheepModal: React.FC<MoveSheepModalProps> = ({ isOpen, onClose, onMove, currentPenId, availablePens }) => {
  const [targetPenId, setTargetPenId] = useState('');

  // Filter out the current pen
  const validTargets = availablePens.filter(p => p.id !== currentPenId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPenId) {
      onMove(targetPenId);
      onClose();
      setTargetPenId('');
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
                    {pen.name} (السعة: {pen.currentCount || 0}/{pen.capacity || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={validTargets.length === 0 || !targetPenId}
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
