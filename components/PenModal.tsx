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

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCapacity(initialData.capacity || 50);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName('');
    setCapacity(50);
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
      })
    };
    onSave(penData);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData 
              ? (isGroupMode ? 'تعديل اسم الحظيرة' : 'تعديل بيانات القسم') 
              : (isGroupMode ? 'إضافة حظيرة رئيسية' : 'إضافة قسم جديد')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isGroupMode ? 'اسم الحظيرة الرئيسية' : 'اسم القسم'}
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroupMode ? "مثال: الحظيرة الشمالية" : "مثال: قسم المواليد"}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition placeholder-gray-400"
            />
          </div>

          {!isGroupMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعة الكلية</label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Save size={20} />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};