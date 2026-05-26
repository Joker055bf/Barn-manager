import React, { useState } from 'react';
import { User, WorkerPermissions } from '../types';
import { Warehouse, Eye, EyeOff, UserPlus, LogIn, Lock, X, Info, Check, Mail } from 'lucide-react';

// Default worker permissions (copied here for self-containment if needed, but imported)
const DEFAULT_WORKER_PERMISSIONS: WorkerPermissions = {
  canAddAnimals: true,
  canEditAnimals: true,
  canViewFinance: false,
  canAddExpenses: false,
  canViewFeed: true,
  canAddFeed: false,
  canEditFeed: false,
  canDeleteFeed: false,
  canAddMedical: true,
  canViewReports: false,
  canManagePens: false,
  canViewDeaths: true,
  canMoveAnimals: true,
  canViewActivity: false,
  canViewProduction: false,
  canDeleteAnimals: false,
  canEditPens: false,
  canDeletePens: false,
};

interface AuthScreenProps {
  users: User[];
  isLoading?: boolean;
  onLogin: (user: User) => void;
  onRegisterOwner: (username: string, password: string, name: string) => void;
  onUpdateUser: (userId: string, updates: { name?: string, username?: string, password?: string, email?: string }) => Promise<void>;
  language?: 'ar' | 'en';
  setLanguage?: (lang: 'ar' | 'en') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ users, isLoading, onLogin, onRegisterOwner, onUpdateUser, language = 'ar', setLanguage }) => {
  const isFirstTime = !isLoading && users.length === 0;
  const [mode, setMode] = useState<'login' | 'register' | 'forgo

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [regError,
<truncated 25723 bytes>
  // Forgot password state
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState('');
  const [forgotUserCode, setForgotUserCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (isLoading) return;

    if (isFirstTime) {
      setLoginError(language === 'en' ? 'No registered users. Please create an owner account first.' : 'لا يوجد مستخدمون مسجلون. يرجى إنشاء حساب مالك أولاً.');
      return;
    }
    const user = users.find(
      u => u.username === loginUsername.trim() && u.password === loginPassword
    );
    if (!user) {
      setLoginError(language === 'en' ? 'Invalid username or password' : 'اسم المستخدم أو كلمة المرور غير صحيحة');
      return;
    }
    onLogin(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setRegError(language === 'en' ? 'Please fill all fields' : 'يرجى تعبئة جميع الحقول');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError(language === 'en' ? 'Passwords do not match' : 'كلمة المرور غير متطابقة');
      return;
    }
    if (regPassword.length < 4) {
      setRegError(language === 'en' ? 'Password must be at least 4 characters' : 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    onRegisterOwner(regUsername.trim(), regPassword, regName.trim());
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotStep === 1) {
























      try {
        const mailSubject = encodeURIComponent(language === 'en' ? 'Raai App - Password Reset Verification Code' : 'تطبيق راعي - رمز إعادة تعيين كلمة المرور');
        const mailBody = encodeURIComponent(language === 'en' ? `Your password reset verification code is: ${code}` : `رمز التحقق لإعادة تعيين كلمة المرور الخاص بك هو: ${code}`);
        window.location.href = `mailto:${enteredEmail}?subject=${mailSubject}&body=${mailBody}`;
      } catch (mailErr) {
        console.error('Mailto failed:', mailErr);
      }

      setForgotGeneratedCode(code);
      setTargetUser(matchedUser);
      setForgotSuccess(
        language === 'en' 
          ? `A verification code was prepared. For convenience, your code is: ${code}` 
          : `تم إعداد رمز التحقق وإطلاقه لبريدك! للسهولة والسرعة، رمز التحقق الخاص بك هو: ${code}`
      );
      setForgotStep(2);
    } else if (forgotStep === 2) {
      const enteredCode = forgotUserCode.trim();
      if (!enteredCode) {
        setForgotError(language === 'en' ? 'Please enter the code' : 'يرجى إدخال رمز التحقق');
        return;
      }
      if (enteredCode !== forgotGeneratedCode) {
        setForgotError(language === 'en' ? 'Incorrect verification code' : 'رمز التحقق غير صحيح، يرجى المحاولة مجدداً');
        return;
      }
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm"
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
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12"
                    autoComplete="curre







                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-2.5 text-red-200 text-xs text-center animate-shake">
                  {loginError}
                </div>
              )}

              {isLoading ? (
                 <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-white text-[#3E2723] py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                  <LogIn size={20} />
                  دخول
                </button>
              )}

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="text-white/80 hover:text-white text-sm font-bold transition flex items-center justify-center gap-2 mx-auto"
                >
                  <UserPlus size={16} />
                  ليس لديك حساب؟ <span className="underline decoration-white/30 underline-offset-4">سجل الآن</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (











































                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  value={regConfirm}
                  onChange={e => setRegConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm"
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
                className="w-full bg-white text-[#3E2723] py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus size={20} />
                تأكيد التسجيل (مالك)
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setLoginError(''); }}
                  className="text-white/60 hover:text-white text-xs font-bold transition mx-auto"
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






























                 <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-white text-[#3E2723] py-4 rounded-xl font-black text-base hover:bg-amber-50 transition shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <LogIn size={20} />
                  {language === 'en' ? 'Login' : 'دخول'}
                </button>
              )}

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setRegError(''); }}
                  className="text-white/80 hover:text-white text-sm font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <UserPlus size={16} />
                  {language === 'en' ? "Don't have an account? Register" : 'ليس لديك حساب؟ سجل الآن'}
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <l













                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. admin123' : 'مثال: admin123'}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm"
                  autoComplete="new-username"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1">
                  {language === 'en' ? 'Password' : 'كلمة المرور'}
                </label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder={language === 'en' ? 'At least 4 characters' : '4 أحرف على الأقل'}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm pr-12"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition cursor-pointer"







































                  {language === 'en' ? 'Already have an account? Sign In' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotStep === 1 && (
                <div>
                  <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1 text-right">
                    {language === 'en' ? 'Current Email' : 'البريد الإلكتروني الحالي'}
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/60 focus:bg-white/20 transition text-sm text-left"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              )}

              {forgotStep === 2 && (
                <div>
                  <label className="text-white/70 text-xs font-bold block mb-1.5 mr-1 text-right">
                    {language === 'en' ? 'Veri

























































                >
                  {isResetting ? (
                    <div className="w-5 h-5 border-2 border-[#3E2723]/30 border-t-[#3E2723] rounded-full animate-spin mx-auto"></div>
                  ) : forgotStep === 1 ? (
                    (language === 'en' ? 'Send Code' : 'إرسال الرمز')
                  ) : forgotStep === 2 ? (
                    (language === 'en' ? 'Verify' : 'تحقق')
                  ) : (
                    (language === 'en' ? 'Reset Password' : 'تحديث كلمة المرور')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (forgotStep > 1) {
                      setForgotStep((prev) => (prev - 1) as 1 | 2 | 3);
                      setForgotError('');
                      setForgotSuccess('');
                >
                  {isResetting ? (
                    <div className="w-5 h-5 border-2 border-[#3E2723]/30 border-t-[#3E2723] rounded-full animate-spin mx-auto"></div>
                  ) : forgotStep === 1 ? (
                    (language === 'en' ? 'Send Code' : 'إرسال الرمز')
                  ) : forgotStep === 2 ? (
                    (language === 'en' ? 'Verify' : 'تحقق')
                  ) : (
                    (language === 'en' ? 'Reset Password' : 'تحديث كلمة المرور')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (forgotStep > 1) {
                      setForgotStep((prev) => (prev - 1) as 1 | 2 | 3);
                      setForgotError('');
                      setForgotSuccess('');
                    } else {
                      setMode('login');
                    }
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 py-3.5 rounded-xl font-bold text-sm transition cursor-pointer"
                >
                  {forgotStep > 1 ? (language === 'en' ? 'Back' : 'السابق') : (language === 'en' ? 'Cancel' : 'إلغاء')}
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
