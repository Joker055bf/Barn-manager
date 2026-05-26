import React, { useState, useMemo } from 'react';
import { X, Info, ArrowRightLeft, Baby, HeartPulse, CheckCircle2, XCircle } from 'lucide-react';
import { Sheep, Pen, ActivityEntry } from '../types';

interface AnimalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheep: Sheep;
  allSheep: Sheep[];
  pens: Pen[];
  activityLog?: ActivityEntry[];
}


export const AnimalProfileModal: React.FC<AnimalProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-4">الملف الشخصي للحيوان</h2>
        <p className="text-gray-500 mb-6">هذا المكون غير مستخدم حالياً في النسخة الحالية.</p>
        <button onClick={onClose} className="w-full bg-[#795548] text-white py-3 rounded-2xl">إغلاق</button>
      </div>
    </div>
  );
};
