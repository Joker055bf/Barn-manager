import React, { useState } from 'react';
import { Warehouse, Eye, EyeOff, UserPlus, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';

import { tr, isEnglish } from '../constants/i18n';

interface AuthScreenProps {
  /** Username (or the owner's email) + password. Rejects with a user-facing message. */
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegisterOwner: (username: string, password: string, name: string, email: string) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegisterOwner, onSendPasswordReset }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isBusy, setIsBusy] = useState(false);

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regError, setRegError] = useState('');

  // Password reset (owners: Firebase emails a reset link; workers ask their owner)
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRecoverySuccess('');
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError(tr("يرجى إدخال اسم المستخدم وكلمة المرور"));
      return;
    }
    setIsBusy(true);
    try {
      await onLogin(loginUsername, loginPassword);
    } catch (err: any) {
      setLoginError(err?.message || tr("اسم المستخدم أو كلمة المرور غير صحيحة"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setRegError(tr("يرجى تعبئة جميع الحقول بما في ذلك البريد الإلكتروني"));
      return;
    }
    if (regUsername.includes('@')) {
      setRegError(tr("اسم المستخدم لا يمكن أن يحتوي على @"));
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError(tr("كلمة المرور غير متطابقة"));
      return;
    }
    if (regPassword.length < 4) {
      setRegError(tr("كلمة المرور يجب أن تكون 4 أحرف على الأقل"));
      return;
    }
    setIsBusy(true);
    try {
      await onRegisterOwner(regUsername.trim(), regPassword, regName.trim(), regEmail.trim());
    } catch (err: any) {
      setRegError(err?.message || tr("تعذر إنشاء الحساب"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendReset = async () => {
    setRecoveryError('');
    if (!inputEmail.trim()) {
      setRecoveryError(tr("يرجى إدخال البريد الإلكتروني المسجل"));
      return;
    }
    setIsBusy(true);
    try {
      await onSendPasswordReset(inputEmail);
      setRecoveryMode(false);
      setInputEmail('');
      setRecoverySuccess(tr("إذا كان البريد مسجلاً فستصلك رسالة لتعيين كلمة مرور جديدة. تحقق من صندوق الوارد والبريد المزعج."));
    } catch (err: any) {
      setRecoveryError(err?.message || tr("تعذر إرسال رسالة الاستعادة"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4 overflow-hidden relative"
      dir={isEnglish ? 'ltr' : 'rtl'}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/30"
            style={{
              width: `${Math.random() * 200 + 50}px`,
              height: `${Math.random() * 200 + 50}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-4 shadow-2xl">
            <Warehouse size={40} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-wide">{tr("راعي")}</h1>
          <p className="text-white/60 text-sm mt-1">{tr("نظام إدارة الحظائر")}</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-2xl p-8">
          
          {/* Header based on mode */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {recoveryMode ? tr("استعادة الحساب") : mode === 'login' ? tr("تسجيل الدخول") : tr("تسجيل جديد (المالك)")}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {recoveryMode && tr("سنرسل رابط تعيين كلمة المرور إلى بريد المالك")}
              {!recoveryMode && (mode === 'login' ? tr("أدخل بياناتك للوصول إلى الحظيرة") : tr("أنشئ حساب المالك للتحكم بالمزرعة"))}
            </p>
          </div>

          {/* PASSWORD RESET */}
          {recoveryMode && (
            <div className="space-y-4 animate-scale-in">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("البريد الإلكتروني المسجل")}</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={e => setInputEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                  autoComplete="email"
                />
              </div>

              <p className="text-white/50 text-[11px] leading-relaxed">
                {tr("نسيت اسم المستخدم؟ يمكنك تسجيل الدخول بالبريد الإلكتروني بدلاً منه. العمال: اطلب من المالك تعيين كلمة مرور جديدة من إدارة العمال.")}
              </p>

              {recoveryError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleSendReset}
                  className="flex-1 bg-white text-brand-900 py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? tr("جاري الإرسال...") : tr("إرسال رابط الاستعادة")}
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode(false); setRecoveryError(''); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-black text-xs hover:bg-white/20 transition cursor-pointer"
                >
                  {tr("تراجع")}
                </button>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {!recoveryMode && mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("اسم المستخدم أو البريد الإلكتروني")}</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder={tr("أدخل اسم المستخدم")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("كلمة المرور")}</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pe-12 text-start"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  >
                    {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {loginError}
                </div>
              )}

              {recoverySuccess && (
                <div className="bg-green-500/20 border border-green-400/40 rounded-xl px-4 py-2.5 text-green-200 text-xs text-center">
                  {recoverySuccess}
                </div>
              )}

              {isBusy ? (
                 <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-white text-brand-900 py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <LogIn size={20} />
                  {tr("دخول")}
                </button>
              )}

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setRecoveryMode(true); setRecoveryError(''); setRecoverySuccess(''); }}
                  className="text-white/60 hover:text-white text-xs font-bold transition underline underline-offset-4 decoration-white/20 cursor-pointer"
                >
                  {tr("هل نسيت كلمة المرور أو اسم المستخدم؟")}
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="text-white/80 hover:text-white text-sm font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <UserPlus size={16} />
                  {tr("ليس لديك حساب؟")} <span className="underline decoration-white/30 underline-offset-4">{tr("سجل الآن")}</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {!recoveryMode && mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("الاسم الكامل")}</label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder={tr("مثال: محمد العمري")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("البريد الإلكتروني")}</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder={tr("مثال: owner@example.com")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("اسم المستخدم")}</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder={tr("مثال: admin123")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                  autoComplete="new-username"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("كلمة المرور")}</label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder={tr("4 أحرف على الأقل")}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pe-12 text-start"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  >
                    {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 ms-1">{tr("تأكيد كلمة المرور")}</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  placeholder={tr("أعد كتابة كلمة المرور")}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-start"
                  autoComplete="new-password"
                />
              </div>

              {regError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center">
                  {regError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white text-brand-900 py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <UserPlus size={20} />
                {isBusy ? tr("جاري إنشاء الحساب...") : tr("تأكيد التسجيل (مالك)")}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setLoginError(''); }}
                  className="text-white/60 hover:text-white text-xs font-bold transition mx-auto cursor-pointer"
                >
                  {tr("لديك حساب بالفعل؟ تسجيل الدخول")}
                </button>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-white/30 text-xs mt-6 font-mono tracking-widest">
          {tr("JokeR_B : تطوير وبرمجة")}
        </p>
      </div>
    </div>
  );
};
