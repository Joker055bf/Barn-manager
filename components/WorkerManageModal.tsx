import React, { useState } from 'react';
import { User, WorkerPermissions, DEFAULT_WORKER_PERMISSIONS, Pen } from '../types';
import {
  X, UserPlus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
  Dna, ShieldCheck, Wallet, Wheat, FileText, Warehouse, Skull, ArrowRightLeft, Edit3, Check, Shield, History, Activity, Lock
} from 'lucide-react';

interface WorkerManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAddWorker: (username: string, password: string, name: string, permissions: WorkerPermissions, settingsPin: string, accessiblePens: string[]) => void;
  onUpdateWorker: (userId: string, permissions: WorkerPermissions, accessiblePens: string[]) => void;
  onDeleteWorker: (userId: string) => void;
  pens: Pen[];
  onShowAlert?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

const BarnAccessToggle: React.FC<{ pens: Pen[], selectedIds: string[], onChange: (ids: string[]) => void }> = ({ pens, selectedIds, onChange }) => {
  const mainPens = pens.filter(p => !p.parentId && p.isGroup);
  const isEn = localStorage.getItem('appLanguage') === 'en' || localStorage.getItem('rai_lang') === 'en';
  
  return (
    <div className="space-y-2">
      {mainPens.length === 0 ? (
        <p className="text-[10px] text-gray-400 text-center py-2">
          {isEn ? 'No barns registered currently' : 'لا ت














































  { key: 'canManagePens',    label: isEn ? 'Manage Pens (Barns)' : 'إضافة أقسام (مبنى)',      icon: Warehouse,      color: 'text-gray-600 bg-gray-50' },
  { key: 'canEditPens',      label: isEn ? 'Edit Section/Barn' : '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u0638\u0627\u0626\u0631 \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0645', icon: Edit3, color: 'text-blue-600 bg-blue-50' },
  { key: 'canDeletePens',    label: isEn ? 'Delete Section/Barn' : '\u062d\u0630\u0641 \u0627\u0644\u062d\u0638\u0627\u0626\u0631 \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0645', icon: Trash2, color: 'text-red-500 bg-red-50' },
  { key: 'canDeleteAnimals', label: isEn ? 'Delete Excluded Animals' : '\u062d\u0630\u0641 \u0633\u062c\u0644 \u0627\u0644\u0645\u0633\u062a\u0628\u0639\u062f\u0627\u062a \u0646\u0647\u0627\u0626\u064a\u0627\u064b', icon: Trash2, color: 'text-rose-600 bg-rose-50' },
  { key: 'canViewDeaths',    label: isEn ? 'Mortality Log' : 'سجل المستبعدة',          icon: Skull,          color: 'text-rose-600 bg-rose-50' },
  { key: 'canViewProduction', label: isEn ? 'Production Log' : 'سجل الإنتاج',           icon: Activity,       color: 'text-purple-600 bg-purple-50' },
  { key: 'canViewActivity',  label: isEn ? 'View Activity Log' : 'رؤية سجل الأحداث',       icon: History,        color: 'text-blue-500 bg-blue-50' },
];

interface PermissionToggleProps {
  permissions: WorkerPermissions;







































export const WorkerManageModal: React.FC<WorkerManageModalProps> = ({
  isOpen, onClose, users, onAddWorker, onUpdateWorker, onDeleteWorker, pens, onShowAlert, onShowConfirm
}) => {
  const isEn = localStorage.getItem('appLanguage') === 'en' || localStorage.getItem('rai_lang') === 'en';
  const workers = [...users]
    .filter(u => u.role === 'worker')
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Newest first
    });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [newPerms, setNewPerms] = useState<WorkerPermissions>({ ...DEFAULT_WORKER_PERMISSIONS });
  const [newAccessiblePens, setNewAccessiblePens] = useState<string[]>([]);
  const [newSettingsPin, setNewSettingsPin] = useState('');
  const [addError, setAddError] = useState('');
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, WorkerPermissions>>({});
  const [editAccess, setEditAccess] = useState<Record<string, string[]>>({});
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});






















































































































































































































































                          />
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Warehouse size={16} className="text-[#795548]" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isEn ? 'Edit Access Areas' : 'تعديل مناطق الوصول'}</p>
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar px-1">
                          <BarnAccessToggle
                            pens={pens}
                            selectedIds={getWorkerEditAccess(worker)}
                            onChange={(ids) => handleAccessChange(worker.id, ids)}
                          />
                        </div>
                      </div>

                      {hasChanges && (
                        <button
                          onClick={() => handleSaveWorker(worker.id)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95"
                        >
                          <Check size={20} strokeWidth={3} />
                          {isEn ? 'Save & Update Worker Info' : 'حفظ وتحديث بيانات العامل'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

};
