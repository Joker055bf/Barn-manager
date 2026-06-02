import React, { useState } from 'react';
import { User, WorkerPermissions, DEFAULT_WORKER_PERMISSIONS } from '../types';
import { Warehouse, Eye, EyeOff, UserPlus, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';

interface AuthScreenProps {
  users: User[];
  isLoading?: boolean;
  onLogin: (user: User) => void;
  onRegisterOwner: (username: string, password: string, name: string, email?: string) => void;
  onUpdateUser: (userId: string, updates: { name?: string, username?: string, password?: string, email?: string }) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, isLoading, onLogin, onRegisterOwner, onUpdateUser }) => {
  const isFirstTime = !isLoading && users.length === 0;
  const [mode, setMode] = useState<'login' | 'register'>('login');

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

  // Recovery state
  const [recoveryMode, setRecoveryMode] = useState<null | 'select' | 'askPassword' | 'askEmail' | 'changeUsername' | 'changePassword'>(null);
  const [inputEmail, setInputEmail] = useState('');
  const [newValue, setNewValue] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (isLoading) return;
 
    if (isFirstTime) {
      setLoginError('لا يوجد مستخدمون مسجلون. يرجى إنشاء حساب مالك أولاً.');
      return;
    }
    const user = users.find(
      u => u.username === loginUsername.trim() && u.password === loginPassword
    );
    if (!user) {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
      return;
    }
    onLogin(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setRegError('يرجى تعبئة جميع الحقول بما في ذلك البريد الإلكتروني');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('كلمة المرور غير متطابقة');
      return;
    }
    if (regPassword.length < 4) {
      setRegError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    onRegisterOwner(regUsername.trim(), regPassword, regName.trim(), regEmail.trim());
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#3E2723] via-[#5D4037] to-[#795548] p-4 overflow-hidden relative"
      dir="rtl"
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
          <h1 className="text-3xl font-black text-white tracking-wide">راعي</h1>
          <p className="text-white/60 text-sm mt-1">نظام إدارة الحظائر</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-2xl p-8">
          
          {/* Header based on mode */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {recoveryMode ? 'استعادة الحساب' : mode === 'login' ? 'تسجيل الدخول' : 'تسجيل جديد (المالك)'}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {recoveryMode === 'select' && 'اختر نوع الاستعادة لحساب المالك'}
              {recoveryMode === 'askPassword' && 'تأكيد كلمة المرور لاستعادة اسم المستخدم'}
              {recoveryMode === 'askEmail' && 'تأكيد البريد الإلكتروني لاستعادة كلمة المرور'}
              {recoveryMode === 'changeUsername' && 'تغيير اسم المستخدم لحساب المالك'}
              {recoveryMode === 'changePassword' && 'تعيين كلمة المرور الجديدة لحساب المالك'}
              {!recoveryMode && (mode === 'login' ? 'أدخل بياناتك للوصول إلى الحظيرة' : 'أنشئ حساب المالك للتحكم بالمزرعة')}
            </p>
          </div>

          {/* RECOVERY MODES */}
          {recoveryMode === 'select' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => { setRecoveryMode('askPassword'); setRecoveryError(''); setRecoverySuccess(''); }}
                className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                نسيت اسم المستخدم
              </button>
              <button
                type="button"
                onClick={() => { setRecoveryMode('askEmail'); setRecoveryError(''); setRecoverySuccess(''); }}
                className="w-full bg-white/10 border border-white/20 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                نسيت كلمة المرور
              </button>
              <button
                type="button"
                onClick={() => setRecoveryMode(null)}
                className="w-full bg-white text-[#3E2723] py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition mt-4 cursor-pointer"
              >
                تراجع إلى تسجيل الدخول
              </button>
            </div>
          )}

          {recoveryMode === 'askPassword' && (
            <div className="space-y-4 animate-scale-in">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {recoveryError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryError('');
                    const ownerUser = users.find(u => u.role === 'owner');
                    if (!ownerUser) {
                      setRecoveryError('لم يتم العثور على حساب المالك');
                      return;
                    }
                    if (loginPassword === ownerUser.password) {
                      setRecoveryMode('changeUsername');
                      setNewValue(ownerUser.username);
                      setLoginPassword('');
                    } else {
                      setRecoveryError('كلمة المرور غير صحيحة');
                    }
                  }}
                  className="flex-1 bg-white text-[#3E2723] py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition cursor-pointer"
                >
                  تحقق
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode('select'); setRecoveryError(''); setLoginPassword(''); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-black text-xs hover:bg-white/20 transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}

          {recoveryMode === 'askEmail' && (
            <div className="space-y-4 animate-scale-in">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">البريد الإلكتروني المسجل</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={e => setInputEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                />
              </div>

              {recoveryError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryError('');
                    const ownerUser = users.find(u => u.role === 'owner');
                    if (!ownerUser) {
                      setRecoveryError('لم يتم العثور على حساب المالك');
                      return;
                    }
                    if (!ownerUser.email) {
                      setRecoveryError('لا يوجد بريد إلكتروني مسجل لحساب المالك.');
                      return;
                    }
                    if (inputEmail.trim().toLowerCase() === ownerUser.email.toLowerCase()) {
                      setRecoveryMode('changePassword');
                      setNewValue('');
                      setInputEmail('');
                    } else {
                      setRecoveryError('البريد الإلكتروني غير متطابق أو غير مسجل');
                    }
                  }}
                  className="flex-1 bg-white text-[#3E2723] py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition cursor-pointer"
                >
                  تحقق
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode('select'); setRecoveryError(''); setInputEmail(''); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-black text-xs hover:bg-white/20 transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}

          {recoveryMode === 'changeUsername' && (
            <div className="space-y-4 animate-scale-in">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">اسم المستخدم الجديد</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="أدخل اسم المستخدم الجديد..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                />
              </div>

              {recoveryError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setRecoveryError('');
                    if (!newValue.trim()) {
                      setRecoveryError('الرجاء إدخال اسم المستخدم الجديد');
                      return;
                    }
                    const ownerUser = users.find(u => u.role === 'owner');
                    if (!ownerUser) return;
                    try {
                      await onUpdateUser(ownerUser.id, { username: newValue.trim() });
                      setRecoverySuccess('تم تغيير اسم المستخدم بنجاح');
                      setRecoveryMode(null);
                      setNewValue('');
                    } catch (e) {
                      setRecoveryError('حدث خطأ أثناء التحديث');
                    }
                  }}
                  className="flex-1 bg-white text-[#3E2723] py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition cursor-pointer"
                >
                  حفظ وتحديث
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode('select'); setRecoveryError(''); setNewValue(''); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-black text-xs hover:bg-white/20 transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}

          {recoveryMode === 'changePassword' && (
            <div className="space-y-4 animate-scale-in">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {recoveryError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {recoveryError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setRecoveryError('');
                    if (newValue.length < 4) {
                      setRecoveryError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
                      return;
                    }
                    const ownerUser = users.find(u => u.role === 'owner');
                    if (!ownerUser) return;
                    try {
                      await onUpdateUser(ownerUser.id, { password: newValue });
                      setRecoverySuccess('تم تغيير كلمة المرور بنجاح');
                      setRecoveryMode(null);
                      setNewValue('');
                    } catch (e) {
                      setRecoveryError('حدث خطأ أثناء التحديث');
                    }
                  }}
                  className="flex-1 bg-white text-[#3E2723] py-3.5 rounded-xl font-black text-xs hover:bg-amber-50 transition cursor-pointer"
                >
                  حفظ وتحديث
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMode('select'); setRecoveryError(''); setNewValue(''); }}
                  className="flex-1 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-black text-xs hover:bg-white/20 transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {!recoveryMode && mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12 text-right"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
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

              {isLoading ? (
                 <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-white text-[#3E2723] py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <LogIn size={20} />
                  دخول
                </button>
              )}

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setRecoveryMode('select'); setRecoveryError(''); setRecoverySuccess(''); }}
                  className="text-white/60 hover:text-white text-xs font-bold transition underline underline-offset-4 decoration-white/20 cursor-pointer"
                >
                  هل نسيت كلمة المرور أو اسم المستخدم؟
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="text-white/80 hover:text-white text-sm font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <UserPlus size={16} />
                  ليس لديك حساب؟ <span className="underline decoration-white/30 underline-offset-4">سجل الآن</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {!recoveryMode && mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="مثال: محمد العمري"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="مثال: owner@example.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder="مثال: admin123"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
                  autoComplete="new-username"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="4 أحرف على الأقل"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12 text-right"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition"
                  >
                    {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-right"
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
                className="w-full bg-white text-[#3E2723] py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <UserPlus size={20} />
                تأكيد التسجيل (مالك)
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setLoginError(''); }}
                  className="text-white/60 hover:text-white text-xs font-bold transition mx-auto cursor-pointer"
                >
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-white/30 text-xs mt-6 font-mono tracking-widest">
          JokeR_B : تطوير وبرمجة
        </p>
      </div>
    </div>
  );
};
