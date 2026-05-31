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
  
  return (
    <div className="space-y-2">
      {mainPens.length === 0 ? (
        <p className="text-[10px] text-gray-400 text-center py-2">لا توجد حظائر مسجلة حالياً</p>
      ) : (
        mainPens.map(pen => {
          const isSelected = selectedIds.includes(pen.id);
          return (
            <div
              key={pen.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                isSelected ? 'bg-white border-emerald-200 ring-1 ring-emerald-100' : 'bg-gray-50/50 border-gray-100 opacity-60'
              }`}
              onClick={() => {
                if (isSelected) onChange(selectedIds.filter(id => id !== pen.id));
                else onChange([...selectedIds, pen.id]);
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                  <Warehouse size={14} />
                </div>
                <span className={`text-sm font-bold ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                  {pen.name}
                </span>
              </div>
              <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                {isSelected && <Check size={12} strokeWidth={4} />}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const PERMISSION_LABELS: { key: keyof WorkerPermissions; label: string; icon: any; color: string }[] = [
  { key: 'canAddAnimals',    label: 'إضافة حيوانات',      icon: Dna,            color: 'text-emerald-600 bg-emerald-50' },
  { key: 'canEditAnimals',   label: 'تعديل بيانات الحيوانات', icon: Edit3,       color: 'text-blue-600 bg-blue-50' },
  { key: 'canDeleteAnimals',  label: 'حذف حيوانات',         icon: Trash2,         color: 'text-red-600 bg-red-50' },
  { key: 'canMoveAnimals',   label: 'نقل الحيوانات',        icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' },
  { key: 'canAddMedical',    label: 'التلقيح والعلاج',     icon: ShieldCheck,    color: 'text-purple-600 bg-purple-50' },
  { key: 'canViewFeed',      label: 'عرض المخزون',         icon: Wheat,          color: 'text-yellow-600 bg-yellow-50' },
  { key: 'canEditFeed',      label: 'تعديل المخزون',       icon: Wheat,          color: 'text-amber-600 bg-amber-50' },
  { key: 'canViewFinance',   label: 'عرض المالية',         icon: Wallet,         color: 'text-indigo-600 bg-indigo-50' },
  { key: 'canAddExpenses',   label: 'إضافة مصروفات',      icon: Wallet,         color: 'text-pink-600 bg-pink-50' },
  { key: 'canDeleteExpenses', label: 'حذف مصروفات',        icon: Trash2,         color: 'text-red-500 bg-red-50' },
  { key: 'canViewReports',   label: 'عرض التقارير',        icon: FileText,       color: 'text-teal-600 bg-teal-50' },
  { key: 'canAddPens',       label: 'إضافة حظيرة',          icon: Warehouse,      color: 'text-emerald-600 bg-emerald-50' },
  { key: 'canEditPens',      label: 'تعديل حظيرة',          icon: Edit3,          color: 'text-blue-600 bg-blue-50' },
  { key: 'canDeletePens',    label: 'حذف حظيرة',            icon: Trash2,         color: 'text-red-600 bg-red-50' },
  { key: 'canReorderPens',   label: 'إعادة ترتيب الأقسام', icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-50' },
  { key: 'canViewDeaths',    label: 'سجل المستبعدة',      icon: Skull,          color: 'text-rose-600 bg-rose-50' },
  { key: 'canViewProduction', label: 'سجل الإنتاج',      icon: Activity,       color: 'text-purple-600 bg-purple-50' },
  { key: 'canViewActivity',  label: 'رؤية سجل الأحداث',    icon: History,        color: 'text-blue-500 bg-blue-50' },
];

interface PermissionToggleProps {
  permissions: WorkerPermissions;
  onChange: (key: keyof WorkerPermissions, value: boolean) => void;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ permissions, onChange }) => (
  <div className="space-y-2">
    {PERMISSION_LABELS.map(({ key, label, icon: Icon, color }) => (
      <div
        key={key}
        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
          permissions[key]
            ? 'bg-white border-gray-200'
            : 'bg-gray-50/50 border-gray-100 opacity-60'
        }`}
        onClick={() => onChange(key, !permissions[key])}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${permissions[key] ? color : 'text-gray-400 bg-gray-100'}`}>
            <Icon size={14} />
          </div>
          <span className={`text-sm font-medium ${permissions[key] ? 'text-gray-800' : 'text-gray-400'}`}>
            {label}
          </span>
        </div>
        {/* Toggle */}
        <div className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
          permissions[key] ? 'bg-emerald-500' : 'bg-gray-200'
        }`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
            permissions[key] ? 'right-1' : 'left-1'
          }`} />
        </div>
      </div>
    ))}
  </div>
);

export const WorkerManageModal: React.FC<WorkerManageModalProps> = ({
  isOpen, onClose, users, onAddWorker, onUpdateWorker, onDeleteWorker, pens, onShowAlert, onShowConfirm
}) => {
  const workers = users.filter(u => u.role === 'worker');

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

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newName.trim() || !newUsername.trim() || !newPassword || !newSettingsPin) {
      setAddError('يرجى تعبئة جميع الحقول بما في ذلك الرمز السري للإعدادات');
      return;
    }
    if (newPassword.length < 4) {
      setAddError('كلمة المرور 4 أحرف على الأقل');
      return;
    }
    if (users.some(u => u.username === newUsername.trim())) {
      setAddError('اسم المستخدم مستخدم بالفعل');
      return;
    }
    onAddWorker(newUsername.trim(), newPassword, newName.trim(), { ...newPerms }, newSettingsPin, newAccessiblePens);
    if (onShowAlert) onShowAlert('success', 'تمت الإضافة', 'تمت إضافة حساب العامل بنجاح.');
    setNewName(''); setNewUsername(''); setNewPassword(''); setNewSettingsPin('');
    setNewPerms({ ...DEFAULT_WORKER_PERMISSIONS });
    setNewAccessiblePens([]);
    setShowAddForm(false);
  };

  const getWorkerEditPerms = (worker: User): WorkerPermissions => {
    return editPerms[worker.id] || worker.permissions || { ...DEFAULT_WORKER_PERMISSIONS };
  };

  const getWorkerEditAccess = (worker: User): string[] => {
    return editAccess[worker.id] || worker.accessiblePens || [];
  };

  const handlePermChange = (workerId: string, key: keyof WorkerPermissions, value: boolean) => {
    const current = getWorkerEditPerms(users.find(u => u.id === workerId)!);
    setEditPerms(prev => ({ ...prev, [workerId]: { ...current, [key]: value } }));
  };

  const handleAccessChange = (workerId: string, ids: string[]) => {
    setEditAccess(prev => ({ ...prev, [workerId]: ids }));
  };

  const handleSaveWorker = (workerId: string) => {
    const perms = editPerms[workerId] || users.find(u => u.id === workerId)?.permissions || { ...DEFAULT_WORKER_PERMISSIONS };
    const access = editAccess[workerId] || users.find(u => u.id === workerId)?.accessiblePens || [];
    
    onUpdateWorker(workerId, perms, access);
    if (onShowAlert) onShowAlert('success', 'تم التحديث', 'تم تحديث بيانات وصلاحيات العامل بنجاح.');
    setEditPerms(prev => { const n = { ...prev }; delete n[workerId]; return n; });
    setEditAccess(prev => { const n = { ...prev }; delete n[workerId]; return n; });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden animate-scale-in dark:bg-slate-900 dark:border dark:border-slate-800 flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#3E2723] to-[#795548] p-8 text-white relative overflow-hidden dark:from-slate-800 dark:to-slate-950 shrink-0">
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter">إدارة العمال</h2>
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{workers.length} حسابات نشطة</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all"
            >
              <X size={22} />
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white/30 dark:bg-transparent">

          {/* Add Worker Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-[#795548] to-[#5D4037] text-white rounded-2xl font-black text-[10px] transition-all shadow-xl premium-shadow hover:scale-[1.02] active:scale-95 uppercase tracking-widest"
            >
              <UserPlus size={18} />
              إضافة حساب عامل جديد
            </button>
          )}

          {/* Add Worker Form */}
          {showAddForm && (
            <form onSubmit={handleAddWorker} className="bg-white border border-gray-100 rounded-[2rem] p-6 space-y-5 animate-fade-in shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4 dark:border-slate-700">
                <h3 className="font-black text-[#3E2723] text-lg dark:text-orange-100">بيانات الحساب الجديد</h3>
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(''); }} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">الاسم الكامل</label>
                  <input
                    type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="مثال: محمد أحمد علي"
                    className="w-full border border-gray-100 rounded-xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>
                
                <div className="group">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">اسم المستخدم</label>
                  <input
                    type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    placeholder="UserID لدخول النظام"
                    className="w-full border border-gray-100 rounded-xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'} value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition-colors">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">رمز الإعدادات (PIN)</label>
                    <div className="relative">
                      <input
                        type="text" value={newSettingsPin}
                        onChange={e => setNewSettingsPin(e.target.value)}
                        placeholder="0000"
                        maxLength={4}
                        className="w-full border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-white tracking-[0.25em] text-center"
                      />
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions for new worker */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px bg-gray-100 flex-1 dark:bg-slate-700" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تحديد الصلاحيات</p>
                  <div className="h-px bg-gray-100 flex-1 dark:bg-slate-700" />
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar px-1">
                  <PermissionToggle
                    permissions={newPerms}
                    onChange={(key, val) => setNewPerms(prev => ({ ...prev, [key]: val }))}
                  />
                </div>
              </div>

              {/* Barn access for new worker */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px bg-gray-100 flex-1 dark:bg-slate-700" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">المناطق المتاحة</p>
                  <div className="h-px bg-gray-100 flex-1 dark:bg-slate-700" />
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar px-1">
                  <BarnAccessToggle
                    pens={pens}
                    selectedIds={newAccessiblePens}
                    onChange={setNewAccessiblePens}
                  />
                </div>
              </div>

              {addError && (
                <div className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-center font-bold animate-pulse dark:bg-red-900/10 dark:border-red-900/20">
                  {addError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#795548] hover:bg-[#5D4037] text-white py-3.5 rounded-xl font-black text-[10px] transition-all shadow-xl premium-shadow flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 uppercase tracking-widest"
              >
                <Check size={18} />
                تثبيت وإضافة العامل
              </button>
            </form>
          )}

          {/* Workers List */}
          {workers.length === 0 && !showAddForm && (
            <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:bg-slate-800 dark:border-slate-800">
              <Shield size={64} className="mx-auto mb-4 text-gray-200 dark:text-slate-700" />
              <p className="font-black text-gray-400 uppercase tracking-widest text-xs">لا يوجد عمال مسجلون</p>
              <p className="text-[10px] text-gray-300 mt-2">ابدأ بإضافة طاقم العمل وتحديد مستويات الوصول</p>
            </div>
          )}

          <div className="space-y-4">
            {workers.map(worker => {
              const isExpanded = expandedWorker === worker.id;
              const currentPerms = getWorkerEditPerms(worker);
              const hasChanges = !!editPerms[worker.id] || !!editAccess[worker.id];
              const enabledCount = Object.values(currentPerms).filter(Boolean).length;

              return (
                <div key={worker.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl transition-all hover:shadow-2xl dark:bg-slate-800 dark:border-slate-700">
                  {/* Worker Header */}
                  <div className={`p-4 flex items-center justify-between transition-colors ${isExpanded ? 'bg-orange-50/30 dark:bg-slate-700/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#795548] to-[#3E2723] flex items-center justify-center text-white font-black text-base shadow-lg ring-2 ring-white dark:ring-slate-800">
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm dark:text-white">{worker.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter dark:bg-emerald-900/20 dark:text-emerald-400">
                            {enabledCount} صلاحيات
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedWorker(isExpanded ? null : worker.id)}
                        className={`p-3 rounded-xl transition-all ${isExpanded ? 'bg-[#795548] text-white' : 'bg-gray-50 text-gray-400 hover:text-[#795548] dark:bg-slate-900 dark:text-slate-600'}`}
                      >
                        {isExpanded ? <X size={20} /> : <Edit3 size={20} />}
                      </button>
                      <button
                        onClick={() => {
                          if (onShowConfirm) {
                            onShowConfirm('حذف عامل', `هل أنت متأكد من حذف حساب ${worker.name} نهائياً؟`, () => onDeleteWorker(worker.id));
                          }
                        }}
                        className="p-3 bg-red-50 text-red-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all dark:bg-red-900/10 dark:text-red-900/40 dark:hover:text-red-500"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Permissions & Access Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 p-6 animate-fade-in-down space-y-6 dark:border-slate-700">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-[#795548]" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تعديل الصلاحيات الممنوحة</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar px-1">
                          <PermissionToggle
                            permissions={currentPerms}
                            onChange={(key, val) => handlePermChange(worker.id, key, val)}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Warehouse size={16} className="text-[#795548]" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">تعديل مناطق الوصول</p>
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
                          حفظ وتحديث بيانات العامل
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
