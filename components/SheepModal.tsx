import React, { useState, useEffect } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { Sheep, SheepType } from '../types';

interface SheepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sheep: Sheep) => void;
  initialData?: Sheep;
  penId: string;
}

export const SheepModal: React.FC<SheepModalProps> = ({ isOpen, onClose, onSave, initialData, penId }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [type, setType] = useState<SheepType>(SheepType.NAIMI);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [birthDate, setBirthDate] = useState('');
  const [ageString, setAgeString] = useState('');
  const [fatherId, setFatherId] = useState('');
  const [motherId, setMotherId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setSerialNumber(initialData.serialNumber);
      setType(initialData.type);
      setGender(initialData.gender);
      setBirthDate(initialData.birthDate);
      setFatherId(initialData.fatherId || '');
      setMotherId(initialData.motherId || '');
      setNotes(initialData.notes || '');
      calculateAge(initialData.birthDate);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  // Calculate age whenever birthDate changes
  useEffect(() => {
    calculateAge(birthDate);
  }, [birthDate]);

  const calculateAge = (dateStr: string) => {
    if (!dateStr) {
      setAgeString('');
      return;
    }
    const birth = new Date(dateStr);
    const now = new Date();
    
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years < 0) {
        setAgeString('تاريخ غير صحيح');
        return;
    }

    let result = '';
    if (years > 0) result += `${years} سنة `;
    if (months > 0) result += `${months} شهر`;
    if (years === 0 && months === 0) result = 'أقل من شهر';

    setAgeString(result);
  };

  const resetForm = () => {
    setSerialNumber('');
    setType(SheepType.NAIMI);
    setGender('female');
    setBirthDate('');
    setAgeString('');
    setFatherId('');
    setMotherId('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sheepData: Sheep = {
      id: initialData ? initialData.id : crypto.randomUUID(),
      penId: penId,
      serialNumber,
      type,
      gender,
      birthDate,
      fatherId,
      motherId,
      notes
    };
    onSave(sheepData);
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 sticky top-0">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData ? 'تعديل بيانات الرأس' : 'إضافة رأس جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرقم التسلسلي (رقم الأذن)</label>
              <input
                required
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="مثال: 1055"
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SheepType)}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {Object.values(SheepType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">الجنس</label>
             <div className="flex gap-4">
                <label className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition ${gender === 'male' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} className="hidden" />
                    <span>ذكر (فحل/طلي)</span>
                </label>
                <label className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition ${gender === 'female' ? 'bg-pink-50 border-pink-500 text-pink-700 font-bold' : 'border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} className="hidden" />
                    <span>أنثى (شاة/رخال)</span>
                </label>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
              <input
                required
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العمر (تلقائي)</label>
              <div className="w-full px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg flex items-center gap-2">
                 <Calculator size={16} className="text-gray-400" />
                 <span className="font-medium text-sm">{ageString || '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-2">
            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1">رقم الأم (اختياري)</label>
               <input
                type="text"
                value={motherId}
                onChange={(e) => setMotherId(e.target.value)}
                placeholder="رقم الأم"
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
               />
            </div>
            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1">رقم الأب (اختياري)</label>
               <input
                type="text"
                value={fatherId}
                onChange={(e) => setFatherId(e.target.value)}
                placeholder="رقم الأب"
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
               />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            ></textarea>
          </div>

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
