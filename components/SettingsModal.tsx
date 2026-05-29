import React, { useState, useRef } from 'react';
import { X, Globe, Moon, Sun, Check, Monitor, Download, Upload, Database, User, Lock, Eye, EyeOff, Save, Share2, Settings, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { User as UserType, Pen, Sheep, FeedItem, Expense } from '../types';
import { db } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
    setLanguage: (lang: 'ar' | 'en') => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    currentUser: UserType | null;
    onUpdateProfile: (name: string, username?: string, password?: string) => Promise<void>;
    onShowAlert?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    language,
    setLanguage,
    theme,
    setTheme,
    currentUser,
    onUpdateProfile,
    onShowAlert
}) => {
    const [showDataSection, setShowDataSection] = useState(false);
    const [versionTapCount, setVersionTapCount] = useState(0);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    
    // Profile Edit State
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [editUsername, setEditUsername] = useState(currentUser?.username || '');
    const [editPassword, setEditPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    
    // Auth Toggles
    const [showUserEdit, setShowUserEdit] = useState(false);
    const [showPassEdit, setShowPassEdit] = useState(false);
    
    // Forgot Password Security Question
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with currentUser
    React.useEffect(() => {
        if (currentUser) {
            setEditName(currentUser.name);
            setEditUsername(currentUser.username);
        }
    }, [currentUser]);

    const handleClose = () => {
        setShowDataSection(false);
        setImportStatus(null);
        setShowUserEdit(false);
        setShowPassEdit(false);
        setSecurityAnswer('');
        setIsUnlocked(false);
        setVersionTapCount(0);
        setShowDataSection(false);
        onClose();
    };

    const handleCheckSecurity = () => {
        if (securityAnswer.trim().toLowerCase() === 'basil') {
            setIsUnlocked(true);
            setIsForgotMode(false);
            setShowUserEdit(true);
            setShowPassEdit(true);
        } else {
            if (onShowAlert) onShowAlert('error', 'خطأ', 'الإجابة غير صحيحة');
        }
    };

    const handleSaveProfile = async () => {
        if (currentUser?.role === 'worker') return;
        if (!editName.trim()) {
            const msg = language === 'en' ? 'Please enter farm owner name' : 'يرجى إدخال اسم مالك المزرعة';
            if (onShowAlert) onShowAlert('warning', 'تنبيه', msg);
            return;
        }
        setIsSavingProfile(true);
        try {
            await onUpdateProfile(
                editName.trim(),
                (isUnlocked || showUserEdit) ? editUsername.trim() : undefined,
                (isUnlocked || showPassEdit) && editPassword.trim() ? editPassword.trim() : undefined
            );
            if (onShowAlert) onShowAlert('success', 'تم التحديث', 'تم تحديث بيانات الملف الشخصي بنجاح');
            setIsUnlocked(false);
            setShowUserEdit(false);
            setShowPassEdit(false);
            setEditPassword('');
        } catch (e) {
            if (onShowAlert) onShowAlert('error', 'فشل التحديث', 'حدث خطأ في التحديث: ' + e);
        } finally {
            setIsSavingProfile(false);
        }
    };

    // --- Export: Download all app data as JSON ---
    const getBackupData = () => {
        const data: Record<string, any> = {};
        const keys = ['rai_pens', 'rai_sheep', 'rai_feed', 'rai_expenses', 'rai_owner', 'rai_lang', 'rai_theme'];
        keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) {
                try { data[key] = JSON.parse(val); }
                catch { data[key] = val; }
            }
        });
        return data;
    };

    const handleExportData = async () => {
        try {
            const data = getBackupData();
            const jsonString = JSON.stringify(data, null, 2);
            const fileName = `barn_backup_${new Date().toISOString().slice(0, 10)}.json`;
            
            // --- NATIVE APP (Capacitor) Logic ---
            if (Capacitor.isNativePlatform()) {
                try {
                    // Write to temporary storage
                    await Filesystem.writeFile({
                        path: fileName,
                        data: jsonString,
                        directory: Directory.Cache,
                        encoding: Encoding.UTF8
                    });

                    // Get the URI of the file
                    const fileUri = await Filesystem.getUri({
                        path: fileName,
                        directory: Directory.Cache
                    });

                    // Share using native dialog
                    await Share.share({
                        title: 'نسخة احتياطية - تطبيق راعي',
                        text: 'ملف البيانات والنسخة الاحتياطية لتطبيق إدارة الحظائر',
                        url: fileUri.uri,
                        dialogTitle: 'مشاركة النسخة الاحتياطية'
                    });
                    return; // Done
                } catch (err) {
                    console.error('Native export error:', err);
                    // Fallback to alert if native fails
                }
            }

            // --- WEB (Browser) Logic ---
            // Try Native Web Share first (Best for Mobile/WhatsApp)
            if (navigator.share) {
                try {
                    const file = new File([jsonString], fileName, { type: 'application/json' });
                    await navigator.share({
                        files: [file],
                        title: 'نسخة احتياطية - تطبيق راعي',
                        text: 'ملف البيانات والنسخة الاحتياطية لتطبيق إدارة الحظائر'
                    });
                    return; // Successfully shared
                } catch (shareError) {
                    console.log('Native web share failed, falling back to download:', shareError);
                }
            }

            // Final Fallback: Standard Download (Best for Desktop)
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            if (onShowAlert) onShowAlert('error', 'فشل التصدير', 'حدث خطأ أثناء تصدير البيانات');
        }
    };

    // --- Import: Upload JSON and restore data ---
    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('⏳ جاري استيراد البيانات...');
        
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (typeof data !== 'object' || !data) throw new Error('Invalid format');

                const ownerId = currentUser?.ownerId || (currentUser?.role === 'owner' ? currentUser?.id : null);
                if (!ownerId) throw new Error('Owner ID not found');

                // 1. Pens
                if (data.rai_pens && Array.isArray(data.rai_pens)) {
                    await Promise.all(data.rai_pens.map(p => setDoc(doc(db, 'farms', ownerId, 'pens', p.id), p)));
                }

                // 2. Sheep
                if (data.rai_sheep && Array.isArray(data.rai_sheep)) {
                    await Promise.all(data.rai_sheep.map(s => setDoc(doc(db, 'farms', ownerId, 'sheep', s.id), s)));
                }

                // 3. Feed
                if (data.rai_feed && Array.isArray(data.rai_feed)) {
                    await Promise.all(data.rai_feed.map(f => setDoc(doc(db, 'farms', ownerId, 'feed', f.id), f)));
                }

                // 4. Expenses
                if (data.rai_expenses && Array.isArray(data.rai_expenses)) {
                    await Promise.all(data.rai_expenses.map(ex => setDoc(doc(db, 'farms', ownerId, 'expenses', ex.id), ex)));
                }

                // 5. Update local storage for non-synced keys (theme, etc)
                Object.entries(data).forEach(([key, value]) => {
                    if (key.startsWith('rai_') && !['rai_pens', 'rai_sheep', 'rai_feed', 'rai_expenses'].includes(key)) {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    }
                });

                setImportStatus('✅ تم استيراد البيانات ومزامنتها بنجاح!');
                setTimeout(() => window.location.reload(), 2000);

            } catch (err) {
                console.error('Import Error:', err);
                setImportStatus('❌ فشل الملف، تأكد من اختيار ملف نسخة احتياطية صحيح');
            }
        };
        reader.readAsText(file);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="bg-[#FCFBF4] rounded-[2.5rem] w-full max-w-sm shadow-2xl scale-100 relative overflow-hidden dark:bg-slate-900 dark:border dark:border-slate-800 max-h-[90vh] flex flex-col animate-scale-in">

                {/* Header */}
                <div className="bg-gradient-to-br from-[#795548] to-[#3E2723] p-8 text-white text-center relative dark:from-slate-800 dark:to-slate-950 shrink-0">
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
                    >
                        <X size={24} />
                    </button>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl">
                        <Settings className="w-8 h-8 text-orange-100" />
                    </div>
                    <h2 className="text-3xl font-black mb-1 tracking-tight">{language === 'en' ? 'Settings' : 'الإعدادات'}</h2>
                    <p className="text-orange-100/60 text-xs font-bold uppercase tracking-widest">{language === 'en' ? 'Core Preferences' : 'تفضيلات النظام'}</p>
                </div>

                <div className="p-6 space-y-10 overflow-y-auto custom-scrollbar flex-1">

                    {/* Farm Profile Section */}
                    {isForgotMode ? (
                        <div className="space-y-4 p-6 bg-orange-50/50 rounded-[2rem] border border-orange-100 dark:bg-slate-800 dark:border-slate-700 animate-fade-in">
                            <div className="flex items-center gap-3 text-orange-800 dark:text-orange-400 mb-2">
                                <Lock size={24} />
                                <h3 className="font-black text-lg">استعادة البيانات</h3>
                            </div>
                            <p className="text-xs text-orange-600 dark:text-orange-300 font-bold">سؤال الأمان: ما هو اسم المطور الأول؟</p>
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={e => setSecurityAnswer(e.target.value)}
                                placeholder="اكتب الإجابة..."
                                className="w-full border border-orange-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white transition-all"
                            />
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleCheckSecurity}
                                    className="flex-1 py-3.5 bg-orange-500 text-white rounded-2xl font-black text-xs hover:bg-orange-600 transition shadow-lg premium-shadow"
                                >
                                    تحقق
                                </button>
                                <button
                                    onClick={() => setIsForgotMode(false)}
                                    className="flex-1 py-3.5 bg-gray-200 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-300 transition"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    ) : (
                        currentUser?.role === 'owner' ? (
                            <div className="space-y-5">
                                <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                    <User size={22} className="text-[#795548] dark:text-orange-500" />
                                    الملف الشخصي
                                </h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-gray-400 block mb-2 px-1 uppercase tracking-widest">
                                            {language === 'en' ? 'Farm Owner Name' : 'اسم مالك المزرعة'}
                                        </label>
                                        <input
                                            type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                            placeholder="أدخل الاسم..."
                                            className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                                        />
                                    </div>

                                    {showUserEdit && (
                                        <div className="animate-fade-in-down group">
                                            <label className="text-[10px] font-black text-[#795548] block mb-2 px-1 uppercase tracking-widest dark:text-orange-400">اسم المستخدم الجديد</label>
                                            <input
                                                type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)}
                                                placeholder="اسم المستخدم الجديد"
                                                className="w-full border border-[#795548]/20 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all"
                                            />
                                        </div>
                                    )}

                                    {showPassEdit && (
                                        <div className="animate-fade-in-down relative group">
                                            <label className="text-[10px] font-black text-[#795548] block mb-2 px-1 uppercase tracking-widest dark:text-orange-400">كلمة المرور الجديدة</label>
                                            <div className="relative">
                                                <input
                                                    type={showPass ? 'text' : 'password'} value={editPassword}
                                                    onChange={e => setEditPassword(e.target.value)}
                                                    placeholder="أدخل كلمة المرور..."
                                                    className="w-full border border-[#795548]/20 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white pr-12 transition-all"
                                                />
                                                <button onClick={() => setShowPass(!showPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition p-1">
                                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            onClick={() => setShowUserEdit(!showUserEdit)}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-tighter transition-all ${showUserEdit ? 'bg-[#795548] text-white border-[#795548] shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400'}`}
                                        >
                                            تغيير المعرف
                                        </button>
                                        <button
                                            onClick={() => setShowPassEdit(!showPassEdit)}
                                            className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-tighter transition-all ${showPassEdit ? 'bg-[#795548] text-white border-[#795548] shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400'}`}
                                        >
                                            تغيير السر
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="w-full flex items-center justify-center gap-3 py-4 bg-[#795548] text-white rounded-[1.5rem] font-black text-sm hover:bg-[#5D4037] transition-all disabled:opacity-50 shadow-xl premium-shadow mt-4"
                                    >
                                        <Save size={20} />
                                        {isSavingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                                    </button>

                                    <button
                                        onClick={() => setIsForgotMode(true)}
                                        className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-orange-600 transition-colors pt-3 underline underline-offset-8 decoration-gray-200 decoration-2"
                                    >
                                        هل فقدت الوصول؟ استعادة البيانات
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 dark:bg-slate-800 dark:border-slate-700 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto mb-4 flex items-center justify-center text-gray-300 dark:bg-slate-700 dark:text-slate-500">
                                    <User size={32} />
                                </div>
                                <p className="text-xl font-black text-gray-800 dark:text-gray-100">مرحباً {currentUser?.name}</p>
                                <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">نمط التشغيل: عامل</p>
                            </div>
                        )
                    )}

                    {/* Language Section */}
                    <div className="space-y-5">
                        <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                            <Globe size={22} className="text-[#795548] dark:text-orange-500" />
                            {language === 'en' ? 'Language' : 'لغة الواجهة'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setLanguage('ar')}
                                className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all cursor-pointer ${language === 'ar'
                                    ? 'border-[#795548] bg-[#795548]/5 text-[#795548] font-black shadow-lg dark:bg-[#795548]/20 dark:text-orange-400 dark:border-orange-400'
                                    : 'border-gray-100 text-gray-400 hover:border-gray-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 font-bold'
                                    }`}
                            >
                                <span>العربية</span>
                                {language === 'ar' && <Check size={18} />}
                            </button>

                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 transition-all cursor-pointer ${language === 'en'
                                    ? 'border-[#795548] bg-[#795548]/5 text-[#795548] font-black shadow-lg dark:bg-[#795548]/20 dark:text-orange-400 dark:border-orange-400'
                                    : 'border-gray-100 text-gray-400 hover:border-gray-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 font-bold'
                                    }`}
                            >
                                <span>English</span>
                                {language === 'en' && <Check size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Theme Section */}
                    <div className="space-y-5">
                        <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                            <Moon size={22} className="text-[#795548] dark:text-orange-500" />
                            {language === 'en' ? 'Visual Theme' : 'السمة البصرية'}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setTheme('light')}
                                className={`flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all cursor-pointer ${theme === 'light'
                                    ? 'border-orange-400 bg-orange-50 text-gray-900 font-black shadow-lg'
                                    : 'border-gray-100 text-gray-400 hover:border-gray-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 font-bold'
                                    }`}
                            >
                                <Sun size={28} className={theme === 'light' ? 'text-orange-500' : 'text-gray-300 dark:text-slate-700'} />
                                <span className="text-xs uppercase tracking-widest">النهار</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setTheme('dark')}
                                className={`flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all cursor-pointer ${theme === 'dark'
                                    ? 'border-indigo-600 bg-slate-800 text-white font-black shadow-lg shadow-indigo-500/10'
                                    : 'border-gray-100 text-gray-400 hover:border-gray-200 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 font-bold'
                                    }`}
                            >
                                <Moon size={28} className={theme === 'dark' ? 'text-indigo-400' : 'text-gray-300 dark:text-slate-700'} />
                                <span className="text-xs uppercase tracking-widest">الليل</span>
                            </button>
                        </div>
                    </div>

                    {/* Data Section - Restricted to Owner & Hidden by Default */}
                    {(currentUser?.role === 'owner' && (showDataSection || versionTapCount >= 5)) && (
                        <div className="space-y-4 pb-4 animate-fade-in">
                            <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                <Database size={22} className="text-[#795548] dark:text-orange-500" />
                                إدارة البيانات
                            </h3>

                            {importStatus && (
                                <div className="text-xs text-center py-3 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 font-black">
                                    {importStatus}
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    onClick={handleExportData}
                                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.5rem] hover:bg-gray-50 hover:border-[#795548]/30 transition-all group shadow-sm dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-100 text-[#795548] rounded-[1.25rem] shadow-sm group-hover:scale-110 transition-transform dark:bg-slate-700 dark:text-orange-400">
                                            <Download size={22} />
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-sm text-[#3E2723] block dark:text-gray-100">تصدير النسخة الاحتياطية</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Download Data (.json)</span>
                                        </div>
                                    </div>
                                    <Share2 size={18} className="text-gray-300 group-hover:text-[#795548] dark:text-slate-600" />
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.5rem] hover:bg-gray-50 hover:border-indigo-300 transition-all group shadow-sm dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-[1.25rem] shadow-sm group-hover:scale-110 transition-transform dark:bg-slate-700 dark:text-indigo-400">
                                            <Upload size={22} />
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-sm text-[#3E2723] block dark:text-gray-100">استيراد بيانات خارجية</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Restore from Backup</span>
                                        </div>
                                    </div>
                                    <Monitor size={18} className="text-gray-300 group-hover:text-indigo-500 dark:text-slate-600" />
                                </button>
                            </div>
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportData}
                                className="hidden"
                            />

                            <div className="flex items-start gap-3 p-4 bg-red-50/50 rounded-2xl border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">
                                <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-700 font-black leading-relaxed dark:text-red-400">
                                    تنبيه: استعادة نسخة احتياطية سيؤدي إلى مسح جميع البيانات الحالية واستبدالها بالكامل. يرجى الحذر.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 text-center dark:bg-slate-950 shrink-0 border-t border-gray-100 dark:border-slate-900">
                    <p 
                        className="text-[10px] text-gray-400 font-black tracking-[0.2em] dark:text-slate-700 uppercase cursor-pointer select-none"
                        onClick={() => {
                            const newCount = versionTapCount + 1;
                            setVersionTapCount(newCount);
                            if (newCount === 5) {
                                setShowDataSection(true);
                            }
                        }}
                    >
                        Raai App • v1.1.0 • Built with Passion
                    </p>
                </div>
            </div>
        </div>
    );
};
