import React from 'react';
import { Pen } from '../types';

interface MovePenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovePen: (penId: string, targetParentId: string) => void;
  currentGroupId: string;
  subPens: Pen[];
  availableGroups: Pen[];
}

export const MovePenModal: React.FC<MovePenModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-4">نقل القسم</h2>
        <p className="text-gray-500 mb-6">هذا المكون غير مستخدم حالياً.</p>
        <button onClick={onClose} className="w-full bg-purple-600 text-white py-3 rounded-2xl">إغلاق</button>
      </div>
    </div>
  );
};
