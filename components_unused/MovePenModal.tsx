import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ChevronDown } from 'lucide-react';
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

/* SCRAMBLED CONTENT START
export const MovePenModal: React.FC<MovePenModalProps> = ({
  isOpen, onClose, onMovePen, currentGroupId, subPens, availableGroups
}) => {
  const [selectedSubPenId, setSelectedSubPenId] = useState('');
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('');
  const [isSubPenSelectOpen, setIsSubPenSelectOpen] = useState(false);
  const [isTargetGroupSelectOpen, setIsTargetGroupSelectOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubPenId(subPens.length > 0 ? subPens[0].id : '');
      setSelectedTargetGroupId('');
    }
  }, [isOpen, subPens]);

  const validTargets = availableGroups.filter(g => g.id !== currentGroupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubPenId && selectedTargetGroupId) {
      onMovePen(selectedSubPenId, selectedTargetGroupId);
      onClose();
      setSelectedSubPenId('');
      setSelectedTargetGroupId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-c
























































































                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar overflow-hidden">
                      {validTargets.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => { setSelectedTargetGroupId(g.id); setIsTargetGroupSelectOpen(false); }}
                          className={`w-full text-right px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-50 dark:border-slate-800 transition ${selectedTargetGroupId === g.id ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          <span className="font-bold">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 mt-2">
            <button
              type="submit"
              disabled={subPens.length === 0 || validTargets.length === 0 || !selectedSubPenId || !selectedTargetGroupId}
              className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl shadow-purple-600/20 disabled:opacity-30 disabled:grayscale hover:scale-[1.02] active:scale-95"
            >
              <ArrowRightLeft size={22} />
              <span>تأكيد تحريك القسم</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

*/
