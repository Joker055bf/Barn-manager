import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { Pen } from '../types';

import { tr } from '../constants/i18n';

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-paper-tint rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-paper-edge/50 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center bg-brand-700 px-6 py-5 rounded-t-[2.5rem]">
          <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white text-start">
            {initialData 
              ? (isGroupMode ? tr("تعديل الحظيرة") : tr("تعديل القسم")) 
              : (isGroupMode ? tr("حظيرة جديدة") : tr("قسم جديد"))}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-400 mb-1.5 text-start">
              {isGroupMode ? tr("اسم الحظيرة الرئيسية") : tr("مسمى القسم")}
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroupMode ? tr("مثال: الحظيرة الشمالية") : tr("مثال: قسم أ")}
              className="w-full px-5 py-3.5 bg-white text-brand-700 border border-paper-edge rounded-2xl focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none text-sm font-bold text-start shadow-sm placeholder-brand-300 transition"
            />
          </div>

          {isGroupMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-brand-400 mb-1.5 text-start">
                  {tr("اسم المالك")}
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={tr("أدخل اسم المالك...")}
                  className="w-full px-5 py-3.5 bg-white text-brand-700 border border-paper-edge rounded-2xl focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none text-sm font-bold text-start shadow-sm placeholder-brand-300 transition"
                />
              </div>

              {!initialData && (
                <CustomSelect
                  label={tr("تصنيف الحيوانات")}
                  value={animalType}
                  onChange={(val) => setAnimalType(val)}
                  options={[
                    { value: 'sheep', label: tr("أغنام (ضأن/ماعز)") },
                    { value: 'camels', label: tr("إبل (قريباً)"), disabled: true },
                    { value: 'cows', label: tr("أبقار (قريباً)"), disabled: true },
                    { value: 'chickens', label: tr("دواجن (دجاج) (قريباً)"), disabled: true },
                    { value: 'pigeons', label: tr("حمام (قريباً)"), disabled: true },
                    { value: 'horses', label: tr("خيول (قريباً)"), disabled: true },
                    { value: 'other', label: tr("أخرى (قريباً)"), disabled: true }
                  ]}
                />
              )}
            </>
          )}

          {!isGroupMode && (
            <div className="bg-[#E5DFD5] rounded-3xl p-5 border border-[#D7CFC4] flex flex-col items-center">
              <span className="text-xs font-bold text-brand-700 mb-3 text-center w-full block">{tr("السعة الاستيعابية القصوى")}</span>
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-sm font-bold text-brand-400 shrink-0">{tr("رأس")}</span>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                  className="w-32 py-3 bg-white text-brand-700 text-center font-black rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-brand-700 border-0 transition"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-bold py-4 px-4 rounded-2xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-150"
            >
              <Save size={18} />
              <span>{tr("إتمام الحفظ")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};