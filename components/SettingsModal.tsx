                            setVersionTapCount(newCount);
                            if (newCount === 5) {
                                setShowDataSection(true);
                            }
                        }}
                    >
                        Raai App • v1.1.0 • Built with Passion
                    </p>
                </div>

                {securityPrompt.isOpen && (
                    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 flex flex-col p-6 rounded-[2.5rem] overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <h3 className="font-black text-[#3E2723] dark:text-gray-100 text-lg flex items-center gap-2">
                                <Lock className="text-[#795548] dark:text-orange-500" size={20} />
                                {securityPrompt.step === 1 
                                    ? (language === 'en' ? 'Confirm Identity' : 'تأكيد الهوية')
                                    : (securityPrompt.type === 'name'
                                        ? (language === 'en' ? 'New Owner Name' : 'اسم المالك الجديد')
                                        : securityPrompt.type === 'username' 
                                            ? (lan
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
    const [isSav
    
    // Profile Edit State
    const [editName, setEditName] = useState(currentUser?.name || '');
    
    // Forgot Password Security Question
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Custom Security Prompt Overlay State
    const [securityPrompt, setSecurityPrompt] = useState<{
        isOpen: boolean;
        type: 'username' | 'password' | 'email';
        step: 1 | 2;
        verifyValue: string;
        newValue: string;
        error: string;
    }>({
        isOpen: false,
        type: 'username',
        step: 1,
        verifyValue: '',
        newValue: '',
        error: ''
    });
    const [showPromptPass, setShowPromptPass] = useState(false);

    // Custom Forgot Password Overlay State
    const [forgotPasswordState, setForgotPasswordState] = useState<{
        isOpen: boolean;
        step: 1 | 2 | 3;
        email: string;
        generatedCode: string;
        userCode: string;
        newPass: string;
        showPass: boolean;
        error: string;
    }>({
                                        />
        step: 1,
        email: '',
        generatedCode: '',
        userCode: '',
        newPass: '',
        showPass: false,
        error: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
            setIsUnlocked(true);
            setIsForgotMode(false);
        } else {
            if (onShowAlert) onShowAlert('error', language === 'en' ? 'Error' : 'خطأ', language === 'en' ? 'Incorrect answer' : 'الإجابة غير صحيحة');
        }
    };

    const handleOpenChangeUsername = () => {
        setSecurityPrompt({
            isOpen: true,
            type: 'username',
            step: 1,
            verifyValue: '',
            newValue: '',
            error: ''
            setIsUnlocked(false);
            setShowUserEdit(false);
            setShowPassEdit(false);
            setEditPassword('');
        } catch (e) {
            if (onShowAlert) onShowAlert('error', language === 'en' ? 'Update Failed' : 'فشل التحديث', (language === 'en' ? 'Error updating profile: ' : 'حدث خطأ في التحديث: ') + e);
        } finally {
            setIsSavingProfile(false);
        }
            if (onShowAlert) onShowAlert('error', language === 'en' ? 'Error' : 'خطأ', language === 'en' ? 'Incorrect answer' : 'الإجابة غير صحيحة');
        }
    };

    const handleOpenChangeUsername = () => {
        setSecurityPrompt({
            isOpen: true,
            type: 'username',
            step: 1,
            verifyValue: '',
            newValue: '',
            error: ''
        });
        setShowPromptPass(false);
    };

    const handleOpenChangePassword = () => {
        setSecurityPrompt({
            isOpen: true,
            type: 'password',
            step: 1,
            verifyValue: '',
            newValue: '',
            error: ''
        });
        setShowPromptPass(false);
    };

    const handleOpenChangeEmail = () => {
        if (!currentUser?.email) return; // Ignore the command if there is no email configured
        setSecurityPrompt({
            isOpen: true,
            type: 'email',
            step: 1,
            verifyValue: '',
            newValue: '',
            error: ''
        });
        setShowPromptPass(false);
    };

    const handleSecurityPromptSubmit = async () => {
        if (securityPrompt.step === 1) {
            // Verify step
            if (securityPrompt.type === 'email') {
                const currentEmail = currentUser?.emai


































                    await onUpdateProfile(currentUser?.name || '', val, undefined, undefined);
                    if (onShowAlert) onShowAlert('success', language === 'en' ? 'Updated' : 'تم التحديث', language === 'en' ? 'Username updated successfully' : 'تم تحديث اسم المستخدم بنجاح');
                } else if (securityPrompt.type === 'password') {
                    await onUpdateProfile(currentUser?.name || '', undefined, val, undefined);
                    if (onShowAlert) onShowAlert('success', language === 'en' ? 'Updated' : 'تم التحديث', language === 'en' ? 'Password updated successfully' : 'تم تحديث كلمة المرور بنجاح');
                } else if (securityPrompt.type === 'email') {
                    await onUpdateProfile(currentUser?.name || '', undefined, undefined, val);
                    if (onShowAlert) onShowAlert('success', language === 'en' ? 'Updated' : 'تم التحديث', language === 'en' ? 'Email updated successfully' : 'تم تحديث البريد الإلكتروني بنجاح');
                }
                setSecurityPrompt(prev => ({ ...prev, isOpen: false }));
            } catch (e) {
                setSecurityPrompt(prev => ({
                    ...prev,
                    error: (language === 'en' ? 'Failed to update: ' : 'فشل التحديث: ') + e
                }));
            } finally {
                setIsSavingProfile(false);
            }
        }
    };

    const handleSaveProfile = async () => {
        if (currentUser?.role === 'worker') return;
        if (!editName.trim()) {
            const msg = language === 'en' ? 'Please enter farm owner name' : 'يرجى إدخال اسم مالك المزرعة';
            if (onShowAlert) onShowAlert('warning', language === 'en' ? 'Warning' : 'تنبيه', msg);
            return;
        }
        setIsSavingProfile(true);
        try {
            await onUpdateProfile(editName.trim(), undefined, undefined, undefined);
            if (onShowAlert) onShowAlert('success', language === 'en' ? 'Updated' : 'تم التحديث', language === 'en' ? 'Farm owner name updated successfully' : 'تم تحديث اسم مالك المزرعة بنجاح');
        } catch (e) {
            if (onShowAlert) onShowAlert('error', language === 'en' ? 'Update Failed' : 'فشل التحديث', (language === 'en' ? 'Error updating name: ' : 'حدث خطأ في تحديث الاسم: ') + e);
        } finally {
            setIsSavingProfile(false);
        }
    };

    // --- Export: Download all app data as JSON ---
    const getBackupData = () => {















































































                    ) : (
                        currentUser?.role === 'owner' ? (
                            <div className="space-y-5">
                                <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                    <User size={22} className="text-[#795548] dark:text-orange-500" />
                                    {language === 'en' ? 'Profile' : 'الملف الشخصي'}
                                </h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-gray-400 block mb-2 px-1 uppercase tracking-widest">
                                            {language === 'en' ? 'Farm Owner Name' : 'اسم مالك المزرعة'}
                                        </label>
                                        <input
                                            type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                            placeholder={language === 'en' ? 'Enter name...' : 'أدخل الاسم...'}
                                            className="w-full border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-white tra





















































                                    </button>

                                    <button
                                        onClick={() => setIsForgotMode(true)}
                                        className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-orange-600 transition-colors pt-3 underline underline-offset-8 decoration-gray-200 decoration-2"
                                    >
                                        {language === 'en' ? 'Lost Access? Data Recovery' : 'هل فقدت الوصول؟ استعادة البيانات'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 dark:bg-slate-800/50 dark:border-slate-700 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto mb-4 flex items-center justify-center text-gray-300 dark:bg-slate-700 dark:text-slate-500">
                                    <User size={32} />
                                </div>
                                <p className="text-xl font-black text-gray-800 dark:text-gray-100">{language === 'en' ? `Welcome ${currentUser?.name}` : `مرحباً ${currentUser?.name}`}</p>
                                <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">{language === 'en' ? 'Mode: Worker' : 'نمط التشغيل: عامل'}</p>
                            </div>
                        )
                    )}

                                    className="flex-1 py-3.5 bg-gray-200 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-300 transition"
                                >
                                    {language === 'en' ? 'Cancel' : 'إلغاء'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        currentUser?.role === 'owner' ? (
                            <div className="space-y-5">
                                <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                    <User size={22} className="text-[#795548] dark:text-orange-500" />
                                    {language === 'en' ? 'Profile' : 'الملف الشخصي'}
                                </h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-gray-400 block mb-2 px-1 uppercase tracking-widest">
                                            {language === 'en' ? 'Farm Owner Name' : 'اسم مالك المزرعة'}
                                        </label>
                                        <input
                                            type="text" value={editName} onChange={e => setEditName(e.target.value)}























































                                    </button>

                                    <button
                                        onClick={() => setIsForgotMode(true)}
                                        className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-orange-600 transition-colors pt-3 underline underline-offset-8 decoration-gray-200 decoration-2"
                                    >
                                        {language === 'en' ? 'Lost Access? Data Recovery' : 'هل فقدت الوصول؟ استعادة البيانات'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 dark:bg-slate-800/50 dark:border-slate-700 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto mb-4 flex items-center justify-center text-gray-300 dark:bg-slate-700 dark:text-slate-500">
                                    <User size={32} />
                                </div>
                                <p className="text-xl font-black text-gray-800 dark:text-gray-100">{language === 'en' ? `Welcome ${currentUser?.name}` : `مرحباً ${currentUser?.name}`}</p>
                                <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">{language === 'en' ? 'Mode: Worker' : 'نمط التشغيل: عامل'}</p>
                            </div>
                        )
                    )}
                    {/* Language Section */}






















                                className="hidden"
                            />
                                placeholder={language === 'en' ? 'Type the answer...' : 'اكتب الإجابة...'}
                                className="w-full border border-orange-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white transition-all"
                            />
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleCheckSecurity}
                                    className="flex-1 py-3.5 bg-orange-500 text-white rounded-2xl font-black text-xs hover:bg-orange-600 transition shadow-lg premium-shadow"
                                >
                                    {language === 'en' ? 'Verify' : 'تحقق'}
                                </button>
                                <button
                                    onClick={() => setIsForgotMode(false)}
                                    className="flex-1 py-3.5 bg-gray-200 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-300 transition"
                                >
                                    {language === 'en' ? 'Cancel' : 'إلغاء'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        currentUser?.role
                            <div className="space-y-5">
                                <h3 className="font-black text-gray-900 flex items-center gap-3 dark:text-gray-100 tracking-tight">
                                    <User size={22} className="text-[#795548] dark:text-orange-500" />
                                    {language === 'en' ? 'Profile' : 'الملف الشخصي'}
                                </h3>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-gray-400 block mb-2 px-1 uppercase tracking-widest">
                                            {language === 'en' ? 'Farm Owner Name' : 'اسم مالك المزرعة'}
                                        </label>
                                        <input





























                                    </div>

                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="w-full flex items-center justify-center gap-3 py-4 bg-[#795548] text-white rounded-[1.5rem] font-black text-sm hover:bg-[#5D4037] transition-all disabled:opacity-50 shadow-xl premium-shadow mt-4 cursor-pointer active:scale-95"
                                    >
                                        <Save size={20} />
                                        {isSavingProfile ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (language === 'en' ? 'Change Owner Name' : 'تغيير اسم المالك')}
                                    </button>

                                    <button
                                        onClick={handleOpenForgotPassword}
                                        className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-orange-600 transition-colors pt-3 underline underline-offset-8 decoration-gray-200 decoration-2 cursor-pointer"
                                    >
                                        {language === 'en' ? 'Forgot Password?' : 'هل نسيت كلمة المرور؟'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 dark:bg-slate-800/50 dark:border-slate-700 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm mx-auto mb-4 flex items-center justify-center text-gray-300 dark:bg-slate-700 dark:text-slate-500">
                                    <User size={32} />
                                </div>
                                <p className="text-xl font-black text-gray-800 dark:text-gray-100">{language === 'en' ? `Welcome ${currentUser?.name}` : `مرحباً ${currentUser?.name}`}</p>
                                <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">{language === 'en' ? 'Mode: Worker' : 'نمط التشغيل: عامل'}</p>
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
                    >
                        Raai App • v1.1.0 • Built with Passion
                    </p>
                </div>
            </div>
        </div>
    );
};




















































































































                        className="text-[10px] text-gray-400 font-black tracking-[0.2em] dark:text-slate-700 uppercase cursor-pointer select-none"
                        onClick={() => {
                            const newCount = versionTapCount + 1;
                            setVersionTapCount(newCount);
                            if (newCount === 5) {
                            setVersionTapCount(newCount);
                            if (newCount === 5) {
                                setShowDataSection(true);
                            }
                        }}
                    >
                        Raai App • v1.1.0 • Built with Passion
                    </p>
                </div>

                {securityPrompt.isOpen && (
                    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 flex flex-col p-6 rounded-[2.5rem] overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <h3 className="font-black text-[#3E2723] dark:text-gray-100 text-lg flex items-center gap-2">
                                <Lock className="text-[#795548] dark:text-orange-500" size={20} />
                                {securityPrompt.step === 1 
                                    ? (language === 'en' ? 'Confirm Identity' : 'تأكيد الهوية')
                                    : (securityPrompt.type === 'name'
                                        ? (language === 'en' ? 'New Owner Name' : 'اسم المالك الجديد')
                                        : securityPrompt.type === 'username' 
                                            ? (lan
                            </h3>
                            <button
                                                : (language === 'en' ? 'New Email' : 'البريد الإلكتروني الجديد'))
                                }
                            </h3>
                            <button
                                onClick={() => setSecurityPrompt(prev => ({ ...prev, isOpen: false }))}
                                className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-center py-6 space-y-5">
                            {securityPrompt.step === 1 ? (
                                /* Step 1 */
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 block mb-2 px-1 uppercase tracking-widest">
                                        {securityPrompt.type === 'email'
                                            ? (language === 'en' ? 'Current Email' : 'البريد الإلكتروني الحالي')
                                            : (language === 'en' ? 'Current Password' : 'كلمة المرور الحالية')
                                        }
                                    </label>
                                    <div className="relative">
                                      
                                                ? (language === 'en' ? 'Enter current email...' : 'أدخل البريد الحالي...')
                                                : (language === 'en' ? 'Enter current password...' : 'أدخل كلمة المرور الحالية...')
                                            }
                                            className="w-full border border-gray-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-[#795548]/10 focus:border-[#795548] bg-gray-50/50 dark:bg-slate-800 dark:text-white transition-all"
                                            dir="ltr"
                                        />
                                        {securityPrompt.type !== 'email' && (
                                            <button 
     












































                            {/* Error Message */}
                            {securityPrompt.error && (
                                <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                                    <Info size={16} />
                                    <span>{securityPrompt.error}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                            <button
                                onClick={handleSecurityPromptSubmit}
                                className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg premium-shadow cursor-pointer active:scale-95"
                            >
                                {securityPrompt.step === 1 
                                    ? (language === 'en' ? 'Next' : 'التالي')
                                    : (language === 'en' ? 'Save & Update' : 'حفظ وتحديث')
                                }
                            </button>
                            <button
                                onClick={() => setSecurityPrompt(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 rounded-2xl font-black text-xs hover:bg-gray-250 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95"
                            >
                                {language === 'en' ? 'Cancel' : 'إلغاء'}
                            </button>
                        </div>
                    </div>
                )}

                {forgotPasswordState.isOpen && (
                    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 flex flex-col p-6 rounded-[2.5rem] overflow-hidden animate-scale-in">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
                            <h3 className="font-black text-[#3E2723] dark:text-gray-100 text-lg flex items-center gap-2">





















































































                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                            <button
                                        <button 
                                            onClick={() => setForgotPasswordState(prev => ({ ...prev, showPass: !prev.showPass }))} 
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#795548] transition p-1 cursor-pointer"
                                        >
                                            {forgotPasswordState.showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {forgotPasswordState.error && (
                                <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                                    <Info size={16} />
                                    <span>{forgotPasswordState.error}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                            <button
                                onClick={handleForgotPasswordSubmit}
                                className="flex-1 py-3.5 bg-[#795548] text-white rounded-2xl font-black text-xs hover:bg-[#5D4037] transition shadow-lg premium-shadow cursor-pointer active:scale-95"