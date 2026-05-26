import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Pen } from '../types';

interface PenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pen: Pen) => void;
  initialData?: Pen;
  isGroupMode?: boolean;
}

export const PenModal: React.FC<PenModalProps> = ({ isOpen, onClose, onSave, initialData, isGroupMode = false }) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(50);
  const [animalType, setAnimalType] = useState<string>('sheep');
  const [isExclusion, setIsExclusion] = useState(false);
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCapacity(initialData.capacity || 50);
      setAnimalType(initialData.animalType || 'sheep');
      setIsExclusion(initialData.isExclusion || false);
      setOwnerName(initialData.ownerName || '');
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName('');
    setCapacity(50);
    setAnimalType('sheep');
    setIsExclusion(false);
    setOwnerName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const penId = initialData ? initialData.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    const penData: Pen = {
      ...(initialData || {}),
      id: penId,
      name,
      lastCleaned: initialData?.lastCleaned || new Date().toISOString(),
      isGroup: isGroupMode,
      animalType: isGroupMode ? animalType : undefined,
      ownerName: isGroupMode ? ownerName : undefined,
      // Only include specific fields if it's NOT a group
      ...(!isGroupMode && {
        capacity,
        isExclusion,
        // Preserve existing count if editing, otherwise default to 0
        currentCount: initialData?.currentCount || 0,
      })
    };
    onSave(penData);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="glass-effect rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-in dark:bg-slate-900/90 dark:border dark:border-slate-800">
        <div className="bg-gradient-to-br from-[#795548] to-[#5D4037] p-8 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950">
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tighter">
              {initialData
                ? (isGroupMode ? 'تعديل الحظيرة' : 'تعديل القسم')
                : (isGroupMode ? 'حظيرة جديدة' : 'قسم جديد')}
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-6 left-6 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all z-50 pointer-events-auto"
          >
            <X size={24} />
          </button>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {isGroupMode ? 'اسم الحظيرة الرئيسية' : 'مسمى القسم'}
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isGroupMode ? "مثال: الحظيرة الشمالية" : "مثال: قسم أ"}
                className="w-full px-5 py-3.5 bg-gray-50/50 text-gray-900 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            {isGroupMode && (
              <div className="group animate-fade-in-down">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">اسم المالك</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="أدخل اسم المالك..."
                  className="w-full px-5 py-3.5 bg-gray-50/50 text-gray-900 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            )}

            {isGroupMode && (
              <div className="group animate-fade-in-down">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">تصنيف الحيوانات</label>
                <div className="relative">
                  <select
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value)}
                    className="w-full px-5 py-3.5 bg-gray-50/50 text-gray-900 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none appearance-none transition-all font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="sheep">أغنام (ضأن/ماعز)</option>
                    <option value="camels">إبل</option>
                    <option value="cows">أبقار</option>
                    <option value="chickens">دواجن</option>
                    <option value="horses">خيول</option>
                    <option value="other">أخرى</option>
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <X size={16} className="rotate-45" />
                  </div>
                </div>
              </div>
            )}

            {!isGroupMode && (
              <div className="bg-[#795548]/5 p-5 rounded-[1.5rem] border border-[#795548]/10 group transition-all hover:bg-[#795548]/10 dark:bg-slate-800/40 dark:border-slate-700">
                <label className="block text-[10px] font-black text-[#795548] uppercase tracking-widest mb-2 px-1 dark:text-orange-400">السعة الاستيعابية القصوى</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value))}
                    className="flex-1 px-5 py-3 bg-white text-gray-900 border border-gray-100 rounded-xl focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] outline-none transition-all font-black text-lg text-center dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                  <div className="text-[#795548] font-black text-xs dark:text-orange-400 uppercase tracking-tighter">رأس</div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-[#795548] hover:bg-[#5D4037] text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl premium-shadow hover:scale-[1.02] active:scale-95"
            >
              <Save size={22} />
              <span>إتمام الحفظ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};