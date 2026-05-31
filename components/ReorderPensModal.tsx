import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, X, ArrowRightLeft } from 'lucide-react';
import { Pen } from '../types';

interface ReorderPensModalProps {
  isOpen: boolean;
  onClose: () => void;
  pens: Pen[];
  selectedGroupId: string | null;
  onSave: (orderedPens: Pen[]) => Promise<void>;
}

export const ReorderPensModal: React.FC<ReorderPensModalProps> = ({
  isOpen,
  onClose,
  pens,
  selectedGroupId,
  onSave,
}) => {
  const [localPens, setLocalPens] = useState<Pen[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const filtered = selectedGroupId
        ? pens.filter(p => p.parentId === selectedGroupId)
        : pens.filter(p => p.isGroup || !p.parentId);
      
      // Sort them by their current sortOrder
      const sorted = [...filtered].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setLocalPens(sorted);
    }
  }, [isOpen, pens, selectedGroupId]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= localPens.length) return;

    const updated = [...localPens];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setLocalPens(updated);
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onSave(localPens);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-md" onClick={onClose} />
      
      {/* Dialog */}
      <div className="bg-white/95 dark:bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 z-10 animate-scale-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#795548]/5 rounded-bl-full pointer-events-none" />
        
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h3 className="text-lg font-black text-[#3E2723] dark:text-gray-100 flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-[#795548] dark:text-orange-500 rotate-90" />
            <span>إعادة ترتيب الأقسام</span>
          </h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full transition-all dark:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-6 font-bold leading-relaxed">
          استخدم الأسهم لتغيير ترتيب ظهور الأقسام في الشاشة الرئيسية، ثم اضغط حفظ لتحديث الترتيب في السحابة.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 mb-6 custom-scrollbar">
          {localPens.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs font-bold">لا يوجد أقسام لترتيبها</div>
          ) : (
            localPens.map((pen, index) => (
              <div 
                key={pen.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-[#795548]/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#795548]/5 dark:bg-orange-500/10 flex items-center justify-center text-[#795548] dark:text-orange-400">
                    <span className="text-xs font-black">{index + 1}</span>
                  </div>
                  <span className="text-xs font-black text-[#3E2723] dark:text-gray-200">{pen.name}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    disabled={index === 0 || isSaving}
                    onClick={() => moveItem(index, 'up')}
                    className="p-2 rounded-xl text-gray-400 hover:text-[#795548] hover:bg-[#795548]/5 dark:hover:text-orange-400 dark:hover:bg-orange-500/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="تحريك لأعلى"
                  >
                    <ArrowUp size={14} className="stroke-[3]" />
                  </button>
                  <button 
                    disabled={index === localPens.length - 1 || isSaving}
                    onClick={() => moveItem(index, 'down')}
                    className="p-2 rounded-xl text-gray-400 hover:text-[#795548] hover:bg-[#795548]/5 dark:hover:text-orange-400 dark:hover:bg-orange-500/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="تحريك لأسفل"
                  >
                    <ArrowDown size={14} className="stroke-[3]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button 
            disabled={isSaving}
            onClick={handleConfirm}
            className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl text-xs font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg premium-shadow dark:bg-orange-600 disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ الترتيب الجديد'}
          </button>
          <button 
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black hover:bg-gray-200 transition-all dark:bg-slate-800 dark:text-gray-300"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
