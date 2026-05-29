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
  const [ownerName, setOwnerName] = useState('');
  const [animalType, setAnimalType] = useState('sheep');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCapacity(initialData.capacity || 50);
      setOwnerName(initialData.ownerName || '');
      setAnimalType(initialData.animalType || 'sheep');
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName('');
    setCapacity(50);
    setOwnerName('');
    setAnimalType('sheep');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const penData: Pen = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      name,
      lastCleaned: initialData?.lastCleaned || new Date().toISOString(),
      isGroup: isGroupMode,
      // Only include specific fields if it's NOT a group
      ...(!isGroupMode && {
        capacity,
        // Preserve existing count if editing, otherwise default to 0
        currentCount: initialData?.currentCount || 0,
      }),
      // Include group-specific fields
      ...(isGroupMode && {
        ownerName: ownerName.trim() || undefined,
        animalType: animalType || 'sheep',
      })
    };
    onSave(penData);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#F4F0EA] rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-[#E0D9D0]/50 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center bg-[#5D4037] px-6 py-5 rounded-t-[2.5rem]">
          <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white text-right">
            {initialData 
              ? (isGroupMode ? 'تعديل الحظيرة' : 'تعديل القسم') 
              : (isGroupMode ? 'حظيرة جديدة' : 'قسم جديد')}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#8D6E63] mb-1.5 text-right">
              {isGroupMode ? 'اسم الحظيرة الرئيسية' : 'مسمى القسم'}
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroupMode ? "مثال: الحظيرة الشمالية" : "مثال: قسم أ"}
              className="w-full px-5 py-3.5 bg-white text-[#5D4037] border border-[#E0D9D0] rounded-2xl focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-sm font-bold text-right shadow-sm placeholder-[#A1887F] transition"
            />
          </div>

          {isGroupMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#8D6E63] mb-1.5 text-right">
                  اسم المالك
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="أدخل اسم المالك..."
                  className="w-full px-5 py-3.5 bg-white text-[#5D4037] border border-[#E0D9D0] rounded-2xl focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-sm font-bold text-right shadow-sm placeholder-[#A1887F] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8D6E63] mb-1.5 text-right">
                  تصنيف الحيوانات
                </label>
                <div className="relative">
                  <select
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white text-[#5D4037] border border-[#E0D9D0] rounded-2xl focus:ring-2 focus:ring-[#5D4037] focus:border-[#5D4037] outline-none text-sm font-bold text-right shadow-sm appearance-none cursor-pointer transition"
                    dir="rtl"
                  >
                    <option value="sheep">أغنام (ضأن/ماعز)</option>
                    <option value="camels">إبل</option>
                    <option value="cows">أبقار</option>
                    <option value="chickens">دواجن (دجاج)</option>
                    <option value="pigeons">حمام</option>
                    <option value="horses">خيول</option>
                    <option value="other">أخرى</option>
                  </select>
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#5D4037]">
                    <span className="text-lg font-bold text-[#8D6E63]">+</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isGroupMode && (
            <div className="bg-[#E5DFD5] rounded-3xl p-5 border border-[#D7CFC4] flex flex-col items-center">
              <span className="text-xs font-bold text-[#5D4037] mb-3 text-center w-full block">السعة الاستيعابية القصوى</span>
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-sm font-bold text-[#8D6E63] shrink-0">رأس</span>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                  className="w-32 py-3 bg-white text-[#5D4037] text-center font-black rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-[#5D4037] border-0 transition"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#5D4037] hover:bg-[#4E342E] text-white font-bold py-4 px-4 rounded-2xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-150"
            >
              <Save size={18} />
              <span>إتمام الحفظ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};