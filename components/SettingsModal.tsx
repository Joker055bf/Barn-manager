import React, { useState, useRef, useEffect } from 'react';
import { X, Globe, Moon, Sun, Check, Monitor, Download, Upload, Database, User, Lock, Eye, EyeOff, Save, Share2, Settings, Info, Mail, Key, Edit } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { User as UserType, Pen, Sheep, FeedItem, Expense } from '../types';
import { db } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { safeStorage } from '../utils/storage';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
    setLanguage: (lang: 'ar' | 'en') => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    currentUser: UserType | null;
    onUpdateProfile: (name: string, username?: string, password?: string, email?: string, vapidKey?: string, firebaseApiKey?: string) => Promise<void>;
    onShowAlert?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string | React.ReactNode) => void;
    onTestNotifications?: () => Promise<void>;
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
    onShowAlert,
    onTestNotifications
}) => {
    const [showDataSection, setShowDataSection] = useState(false);
    const [versionTapCount, setVersionTapCount] = useState(0);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isTestingNotifications, setIsTestingNotifications] = useState(false);
    
    // FCM Advanced Settings States
    const [showAdvancedFcm, setShowAdvancedFcm] = useState(false);
    const [customVapidKey, setCustomVapidKey] = useState('');
    const [customApiKey, setCustomApiKey] = useState('');
    const [isSavingFcm, setIsSavingFcm] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            setCustomVapidKey(currentUser.vapidKey || safeStorage.getItem('rai_vapid_key') || '');
            setCustomApiKey(currentUser.firebaseApiKey || safeStorage.getItem('rai_firebase_api_key') || '');
        }
    }, [isOpen, currentUser]);

    const handleSaveFcmSettings = async () => {
        if (!currentUser) return;
        setIsSavingFcm(true);
        try {
            const previousApiKey = safeStorage.getItem('rai_firebase_api_key') || '';
            const newApiKey = customApiKey.trim();

            if (newApiKey) {
                safeStorage.setItem('rai_firebase_api_key', newApiKey);
            } else {
                safeStorage.removeItem('rai_firebase_api_key');
            }

            if (customVapidKey.trim()) {
                safeStorage.setItem('rai_vapid_key', customVapidKey.trim());
            } else {
                safeStorage.removeItem('rai_vapid_key');
            }

            await onUpdateProfile(currentUser.name, undefined, undefined, undefined, customVapidKey.trim() || '', newApiKey || '');
            
            if (previousApiKey !== newApiKey) {
                if (onShowAlert) {
                    onShowAlert('success', 'تم الحفظ وتحديث الاتصال', 'تم حفظ الإعدادات بنجاح. سيتم إعادة تحميل الصفحة الآن لتطبيق الاتصال الجديد.');
                }
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                if (onShowAlert) {
                    onShowAlert('success', 'تم الحفظ', 'تم تحديث إعدادات الإشعارات المتقدمة بنجاح.');
                }
            }
        } catch (e: any) {
            console.error('Failed to save FCM settings:', e);
            if (onShowAlert) {
                onShowAlert('error', 'فشل الحفظ', e.message || 'تعذر حفظ إعدادات الإشعارات المتقدمة.');
            }
        } finally {
            setIsSavingFcm(false);
        }
    };

    // Profile Secure Actions State
    const [activeAction, setActiveAction] = useState<'editName' | 'editUsername' | 'editPassword' | 'editEmail' | null>(null);
    const [step, setStep] = useState<'askPassword' | 'askEmail' | 'editField' | 'changePasswordDirect' | null>(null);
    const [inputPassword, setInputPassword] = useState('');
    const [inputEmail, setInputEmail] = useState('');
    const [newValue, setNewValue] = useState('');
    const [showInputPass, setShowInputPass] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetProfileFlow = () => {
        setActiveAction(null);
        setStep(null);
        setInputPassword('');
        setInputEmail('');
        setNewValue('');
        setShowInputPass(false);
    };

    const handleClose = () => {
        setShowDataSection(false);
        setImportStatus(null);
        resetProfileFlow();
        setVersionTapCount(0);
        onClose();
    };

    // --- Export: Download all app data as JSON ---
    const getBackupData = () => {
        const data: Record<string, any> = {};
        const keys = ['rai_pens', 'rai_sheep', 'rai_feed', 'rai_expenses', 'rai_owner', 'rai_lang', 'rai_theme'];
        keys.forEach(key => {
            const val = safeStorage.getItem(key);
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
                        safeStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
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
                    {currentUser?.role === 'owner' ? (
                        <div className="space-y-5">
                            <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                <User size={22} className="text-[#795548] dark:text-orange-500" />
                                الملف الشخصي
                            </h3>
                            
                            {activeAction === null && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="bg-white/50 border border-gray-100/80 rounded-[2rem] p-5 dark:bg-slate-800/40 dark:border-slate-700/30">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 font-bold">اسم المالك:</span>
                                            <span className="text-gray-800 font-black dark:text-gray-200">{currentUser?.name}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => { setActiveAction('editName'); setStep('askPassword'); }}
                                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 transition-all gap-2 cursor-pointer shadow-sm"
                                        >
                                            <User size={18} className="text-[#795548] dark:text-orange-500" />
                                            <span>تغيير اسم المالك</span>
                                        </button>

                                        <button
                                            onClick={() => { setActiveAction('editUsername'); setStep('askPassword'); }}
                                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 transition-all gap-2 cursor-pointer shadow-sm"
                                        >
                                            <Edit size={18} className="text-[#795548] dark:text-orange-500" />
                                            <span>تغيير اسم المستخدم</span>
                                        </button>

                                        <button
                                            onClick={() => { setActiveAction('editPassword'); setStep('askEmail'); }}
                                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 transition-all gap-2 cursor-pointer shadow-sm"
                                        >
                                            <Lock size={18} className="text-[#795548] dark:text-orange-500" />
                                            <span>تغيير كلمة المرور</span>
                                        </button>

                                        <button
                                            onClick={() => { setActiveAction('editEmail'); setStep('askPassword'); }}
                                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl text-xs font-black text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 transition-all gap-2 cursor-pointer shadow-sm"
                                        >
                                            <Mail size={18} className="text-[#795548] dark:text-orange-500" />
                                            <span>تغيير البريد الإلكتروني</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeAction !== null && step === 'askPassword' && (
                                <div className="space-y-4 p-5 bg-orange-50/40 rounded-[2rem] border border-orange-100 dark:bg-slate-800/40 dark:border-slate-700/50 animate-scale-in">
                                    <div className="flex items-center gap-3 text-[#795548] dark:text-orange-400 mb-1">
                                        <Lock size={20} />
                                        <h4 className="font-black text-sm">
                                            {activeAction === 'editName' && 'تأكيد كلمة المرور لتغيير اسم المالك'}
                                            {activeAction === 'editUsername' && 'تأكيد كلمة المرور لتغيير اسم المستخدم'}
                                            {activeAction === 'editEmail' && 'تأكيد كلمة المرور لتغيير البريد الإلكتروني'}
                                        </h4>
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type={showInputPass ? 'text' : 'password'}
                                            value={inputPassword}
                                            onChange={e => setInputPassword(e.target.value)}
                                            placeholder="أدخل كلمة المرور الحالية..."
                                            className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white pr-12 transition-all text-right"
                                        />
                                        <button
                                            onClick={() => setShowInputPass(!showInputPass)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition p-1 cursor-pointer"
                                        >
                                            {showInputPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                if (inputPassword === currentUser?.password) {
                                                    setStep('editField');
                                                    if (activeAction === 'editName') setNewValue(currentUser?.name || '');
                                                    if (activeAction === 'editUsername') setNewValue(currentUser?.username || '');
                                                    if (activeAction === 'editEmail') setNewValue(currentUser?.email || '');
                                                } else {
                                                    if (onShowAlert) onShowAlert('error', 'خطأ', 'كلمة المرور غير صحيحة');
                                                }
                                            }}
                                            className="w-full py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg cursor-pointer"
                                        >
                                            تحقق
                                        </button>

                                        <button
                                            onClick={() => {
                                                setStep('askEmail');
                                                setInputPassword('');
                                            }}
                                            className="text-xs text-orange-600 hover:text-orange-700 font-bold py-2 transition cursor-pointer text-center"
                                        >
                                            هل نسيت كلمة المرور؟
                                        </button>

                                        <button
                                            onClick={resetProfileFlow}
                                            className="w-full py-3.5 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 cursor-pointer"
                                        >
                                            تراجع
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeAction !== null && step === 'askEmail' && (
                                <div className="space-y-4 p-5 bg-orange-50/40 rounded-[2rem] border border-orange-100 dark:bg-slate-800/40 dark:border-slate-700/50 animate-scale-in">
                                    <div className="flex items-center gap-3 text-[#795548] dark:text-orange-400 mb-1">
                                        <Mail size={20} />
                                        <h4 className="font-black text-sm">
                                            {activeAction === 'editPassword' 
                                                ? 'تغيير كلمة المرور - البريد الإلكتروني المتوفر' 
                                                : 'استعادة كلمة المرور - البريد الإلكتروني المسجل'}
                                        </h4>
                                    </div>
                                    <input
                                        type="email"
                                        value={inputEmail}
                                        onChange={e => setInputEmail(e.target.value)}
                                        placeholder="أدخل البريد الإلكتروني..."
                                        className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all text-right"
                                    />

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                if (!currentUser?.email) {
                                                    if (onShowAlert) onShowAlert('warning', 'تنبيه', 'لا يوجد بريد إلكتروني مسجل لهذا الحساب. يرجى إضافة بريد إلكتروني أولاً.');
                                                    return;
                                                }
                                                if (inputEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
                                                    setStep('changePasswordDirect');
                                                    setNewValue('');
                                                } else {
                                                    if (onShowAlert) onShowAlert('error', 'خطأ', 'البريد الإلكتروني غير متطابق أو غير مسجل');
                                                }
                                            }}
                                            className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg cursor-pointer"
                                        >
                                            تحقق
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (activeAction === 'editPassword') {
                                                    resetProfileFlow();
                                                } else {
                                                    setStep('askPassword');
                                                }
                                            }}
                                            className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 cursor-pointer"
                                        >
                                            تراجع
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeAction !== null && step === 'changePasswordDirect' && (
                                <div className="space-y-4 p-5 bg-orange-50/40 rounded-[2rem] border border-orange-100 dark:bg-slate-800/40 dark:border-slate-700/50 animate-scale-in">
                                    <div className="flex items-center gap-3 text-[#795548] dark:text-orange-400 mb-1">
                                        <Lock size={20} />
                                        <h4 className="font-black text-sm">تغيير كلمة المرور</h4>
                                    </div>
                                    
                                    <div className="relative group">
                                        <input
                                            type={showInputPass ? 'text' : 'password'}
                                            value={newValue}
                                            onChange={e => setNewValue(e.target.value)}
                                            placeholder="أدخل كلمة المرور الجديدة..."
                                            className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white pr-12 transition-all text-right"
                                        />
                                        <button
                                            onClick={() => setShowInputPass(!showInputPass)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition p-1 cursor-pointer"
                                        >
                                            {showInputPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={async () => {
                                                if (!newValue.trim()) {
                                                    if (onShowAlert) onShowAlert('warning', 'تنبيه', 'يرجى إدخال كلمة المرور الجديدة');
                                                    return;
                                                }
                                                setIsSavingProfile(true);
                                                try {
                                                    await onUpdateProfile(currentUser?.name || '', undefined, newValue.trim(), undefined);
                                                    if (onShowAlert) onShowAlert('success', 'تم التحديث', 'تم تغيير كلمة المرور بنجاح');
                                                    resetProfileFlow();
                                                } catch (e) {
                                                    if (onShowAlert) onShowAlert('error', 'فشل التحديث', 'حدث خطأ أثناء حفظ كلمة المرور');
                                                } finally {
                                                    setIsSavingProfile(false);
                                                }
                                            }}
                                            disabled={isSavingProfile}
                                            className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSavingProfile ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                                        </button>

                                        <button
                                            onClick={() => setStep('askEmail')}
                                            className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 cursor-pointer"
                                        >
                                            تراجع
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeAction !== null && step === 'editField' && (
                                <div className="space-y-4 p-5 bg-orange-50/40 rounded-[2rem] border border-orange-100 dark:bg-slate-800/40 dark:border-slate-700/50 animate-scale-in">
                                    <div className="flex items-center gap-3 text-[#795548] dark:text-orange-400 mb-1">
                                        {activeAction === 'editName' && <User size={20} />}
                                        {activeAction === 'editUsername' && <User size={20} />}
                                        {activeAction === 'editEmail' && <Mail size={20} />}
                                        {activeAction === 'editPassword' && <Lock size={20} />}
                                        
                                        <h4 className="font-black text-sm">
                                            {activeAction === 'editName' && 'تعديل اسم المالك'}
                                            {activeAction === 'editUsername' && 'تعديل اسم المستخدم'}
                                            {activeAction === 'editEmail' && 'تعديل البريد الإلكتروني'}
                                            {activeAction === 'editPassword' && 'تعديل كلمة المرور'}
                                        </h4>
                                    </div>

                                    {activeAction === 'editPassword' ? (
                                        <div className="relative group">
                                            <input
                                                type={showInputPass ? 'text' : 'password'}
                                                value={newValue}
                                                onChange={e => setNewValue(e.target.value)}
                                                placeholder="أدخل كلمة المرور الجديدة..."
                                                className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white pr-12 transition-all text-right"
                                            />
                                            <button
                                                onClick={() => setShowInputPass(!showInputPass)}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition p-1 cursor-pointer"
                                            >
                                                {showInputPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <input
                                            type={activeAction === 'editEmail' ? 'email' : 'text'}
                                            value={newValue}
                                            onChange={e => setNewValue(e.target.value)}
                                            placeholder={
                                                activeAction === 'editName' ? 'أدخل الاسم الجديد...' :
                                                activeAction === 'editUsername' ? 'أدخل اسم المستخدم الجديد...' :
                                                'أدخل البريد الإلكتروني الجديد...'
                                            }
                                            className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all text-right"
                                        />
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={async () => {
                                                if (!newValue.trim()) {
                                                    if (onShowAlert) onShowAlert('warning', 'تنبيه', 'الرجاء إدخال القيمة الجديدة');
                                                    return;
                                                }
                                                setIsSavingProfile(true);
                                                try {
                                                    if (activeAction === 'editName') {
                                                        await onUpdateProfile(newValue.trim(), undefined, undefined, undefined);
                                                    } else if (activeAction === 'editUsername') {
                                                        await onUpdateProfile(currentUser?.name || '', newValue.trim(), undefined, undefined);
                                                    } else if (activeAction === 'editEmail') {
                                                        await onUpdateProfile(currentUser?.name || '', undefined, undefined, newValue.trim());
                                                    } else if (activeAction === 'editPassword') {
                                                        await onUpdateProfile(currentUser?.name || '', undefined, newValue.trim(), undefined);
                                                    }
                                                    if (onShowAlert) onShowAlert('success', 'تم التحديث', 'تم حفظ التغييرات بنجاح');
                                                    resetProfileFlow();
                                                } catch (e) {
                                                    if (onShowAlert) onShowAlert('error', 'فشل التحديث', 'حدث خطأ أثناء حفظ التغييرات');
                                                } finally {
                                                    setIsSavingProfile(false);
                                                }
                                            }}
                                            disabled={isSavingProfile}
                                            className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg disabled:opacity-50 cursor-pointer"
                                        >
                                            {isSavingProfile ? 'جاري الحفظ...' : 'حفظ'}
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (activeAction === 'editPassword') {
                                                    setStep('askEmail');
                                                } else {
                                                    setStep('askPassword');
                                                }
                                            }}
                                            className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 cursor-pointer"
                                        >
                                            تراجع
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 dark:bg-slate-800 dark:border-slate-700 text-center animate-fade-in">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto mb-4 flex items-center justify-center text-gray-300 dark:bg-slate-700 dark:text-slate-500">
                                <User size={32} />
                            </div>
                            <p className="text-xl font-black text-gray-800 dark:text-gray-100">مرحباً {currentUser?.name}</p>
                            <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">نمط التشغيل: عامل</p>
                        </div>
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

                    {/* Notifications Section */}
                    <div className="space-y-5">
                        <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                            <Info size={22} className="text-[#795548] dark:text-orange-500" />
                            {language === 'en' ? 'Push Notifications' : 'إشعارات الهاتف الفورية'}
                        </h3>
                        
                        <div className="p-5 bg-orange-50/40 rounded-[1.5rem] border border-orange-100 dark:bg-slate-800 dark:border-slate-700 space-y-4">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                <span>{language === 'en' ? 'Browser Permission:' : 'حالة صلاحية المتصفح:'}</span>
                                <span className={`px-3 py-1 rounded-full font-black ${
                                    typeof Notification !== 'undefined'
                                        ? Notification.permission === 'granted'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : Notification.permission === 'denied'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {typeof Notification !== 'undefined'
                                        ? Notification.permission === 'granted'
                                            ? (language === 'en' ? 'Active ✅' : 'مفعّلة ✅')
                                            : Notification.permission === 'denied'
                                                ? (language === 'en' ? 'Blocked ❌' : 'مرفوضة ❌')
                                                : (language === 'en' ? 'Pending 🔔' : 'بانتظار الموافقة 🔔')
                                        : (language === 'en' ? 'Not Supported ⚠️' : 'غير مدعوم ⚠️')}
                                </span>
                            </div>

                            <p className="text-[10px] text-gray-500 leading-relaxed dark:text-slate-400 font-bold">
                                {language === 'en'
                                    ? 'To receive instant push notifications for new chat messages, activate notifications and trigger a test to confirm.'
                                    : 'لتلقي إشعارات فورية عند وصول رسائل جديدة، تأكد من الضغط على زر التفعيل واختبار وصول التنبيهات مباشرة لهاتفك.'}
                            </p>

                            {onTestNotifications && (
                                <button
                                    type="button"
                                    disabled={isTestingNotifications}
                                    onClick={async () => {
                                        if (isTestingNotifications) return;
                                        
                                        // Check if they typed a new API key or VAPID key but didn't click save
                                        const savedApiKey = safeStorage.getItem('rai_firebase_api_key') || '';
                                        const savedVapidKey = safeStorage.getItem('rai_vapid_key') || '';
                                        
                                        if (customApiKey.trim() !== savedApiKey || customVapidKey.trim() !== savedVapidKey) {
                                            if (onShowAlert) {
                                                onShowAlert(
                                                    'warning', 
                                                    language === 'en' ? 'Unsaved Settings Detected' : 'تنبيه: إعدادات غير محفوظة', 
                                                    language === 'en' 
                                                        ? 'You have typed a new API Key or VAPID Key. Please click the "Save Advanced Settings" button below first, then let the page reload to apply the new keys before testing.'
                                                        : 'لقد قمت بإدخال مفتاح جديد ولكنك لم تقم بحفظه. يرجى الضغط على زر "حفظ الإعدادات المتقدمة" بالأسفل أولاً لكي يتم حفظ المفتاح وتحديث الاتصال تلقائياً، ثم قم بالاختبار.'
                                                );
                                            }
                                            return;
                                        }

                                        setIsTestingNotifications(true);
                                        try {
                                            await onTestNotifications();
                                        } catch (e) {
                                            console.error(e);
                                        } finally {
                                            setIsTestingNotifications(false);
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-br from-[#795548] to-[#3E2723] text-white rounded-2xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg dark:from-slate-700 dark:to-slate-800 cursor-pointer ${
                                        isTestingNotifications ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <span>{isTestingNotifications 
                                        ? (language === 'en' ? '⏳ Activating...' : '⏳ جاري التفعيل والاختبار...') 
                                        : (language === 'en' ? '🔔 Activate & Test Now' : '🔔 تفعيل واختبار الإشعارات الآن')
                                    }</span>
                                </button>
                            )}

                            {currentUser?.role === 'owner' && (
                                <div className="mt-4 pt-4 border-t border-orange-100/50 dark:border-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancedFcm(!showAdvancedFcm)}
                                        className="flex items-center justify-between w-full text-xs font-black text-[#795548] dark:text-orange-400 hover:opacity-80 transition-all cursor-pointer"
                                    >
                                        <span>{language === 'en' ? '🛠️ Advanced Notification Settings' : '🛠️ إعدادات الإشعارات المتقدمة'}</span>
                                        <span className="text-[10px]">{showAdvancedFcm ? '▲' : '▼'}</span>
                                    </button>

                                    {showAdvancedFcm && (
                                        <div className="mt-3 space-y-3 animate-fade-in text-right" dir="rtl">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-500 dark:text-slate-400 block text-right">
                                                    {language === 'en' ? 'Firebase API Key (unrestricted if custom):' : 'مفتاح API الخاص بـ Firebase (غير مقيد):'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customApiKey}
                                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                                    placeholder="أدخل مفتاح API غير مقيد (من منصة Google Cloud)"
                                                    className="w-full text-right px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#795548]"
                                                />
                                                <p className="text-[9px] text-gray-400 leading-normal text-right font-medium">
                                                    {language === 'en'
                                                        ? 'Leave empty to use the default API key. If the default key is restricted in GCP, create a new API key in GCP Console -> APIs & Services -> Credentials -> Create API Key, and paste it here.'
                                                        : 'اتركه فارغاً للاعتماد على المفتاح الافتراضي للمشروع. إذا كان الافتراضي مقيداً في GCP، قم بإنشاء مفتاح جديد في Google Cloud Console -> APIs & Services -> Credentials -> Create API Key، وضعه هنا.'}
                                                </p>
                                                <div className="text-[9px] font-bold text-gray-400 text-right mt-1">
                                                    {language === 'en' ? 'Currently active key: ' : 'المفتاح المفعل حالياً: '}
                                                    <span className="text-[#795548] dark:text-orange-400 font-mono bg-orange-50/80 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        {safeStorage.getItem('rai_firebase_api_key') 
                                                            ? `مخصص (***${safeStorage.getItem('rai_firebase_api_key')?.slice(-6)})` 
                                                            : (language === 'en' ? 'Default (Restricted)' : 'الافتراضي للمشروع (مقيد)')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-500 dark:text-slate-400 block text-right">
                                                    {language === 'en' ? 'FCM VAPID Public Key (Web Push):' : 'مفتاح VAPID العام (لإشعارات الويب):'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customVapidKey}
                                                    onChange={(e) => setCustomVapidKey(e.target.value)}
                                                    placeholder="أدخل مفتاح VAPID العام (المولد في كونسول Firebase)"
                                                    className="w-full text-right px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#795548]"
                                                />
                                                <p className="text-[9px] text-gray-400 leading-normal text-right font-medium">
                                                    {language === 'en'
                                                        ? 'Leave empty to use the project’s default key. Generate this key in Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates.'
                                                        : 'اتركه فارغاً للاعتماد على المفتاح الافتراضي للمشروع. يمكنك توليد هذا المفتاح من إعدادات مشروع Firebase -> إعدادات المشروع -> السحابة -> شهادات الويب.'}
                                                </p>
                                                <div className="text-[9px] font-bold text-gray-400 text-right mt-1 font-medium">
                                                    {language === 'en' ? 'Currently active: ' : 'مفتاح VAPID المفعل حالياً: '}
                                                    <span className="text-[#795548] dark:text-orange-400 font-mono bg-orange-50/80 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                        {safeStorage.getItem('rai_vapid_key') 
                                                            ? `مخصص (***${safeStorage.getItem('rai_vapid_key')?.slice(-8)})` 
                                                            : (language === 'en' ? 'Default' : 'الافتراضي')}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isSavingFcm}
                                                onClick={handleSaveFcmSettings}
                                                className={`w-full py-2.5 bg-[#795548] dark:bg-slate-700 hover:bg-[#5D4037] dark:hover:bg-slate-600 text-white rounded-xl font-black text-xs transition-all active:scale-[0.98] cursor-pointer ${
                                                    isSavingFcm ? 'opacity-60 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                {isSavingFcm
                                                     ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...')
                                                     : (language === 'en' ? 'Save Settings' : 'حفظ الإعدادات المتقدمة')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
