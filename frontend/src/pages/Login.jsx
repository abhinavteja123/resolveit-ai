import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, loginWithGoogle, loginWithEmail, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Welcome to ResolveIT AI');
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Login failed');
      }
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Welcome back');
    } catch (error) {
      const msgs = {
        'auth/user-not-found':    'No account with this email. Sign up first.',
        'auth/wrong-password':    'Incorrect password.',
        'auth/invalid-email':     'Invalid email address.',
        'auth/invalid-credential':'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      toast.error(msgs[error.code] || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh flex items-center justify-center p-4">
      {/* Warm glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[480px] h-[480px] bg-primary-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[360px] h-[360px] bg-primary-800/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Brand mark */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-5 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
            <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-dark-100 tracking-tight">
            ResolveIT <span className="text-primary-400">AI</span>
          </h1>
          <p className="text-sm text-dark-600 mt-1.5">Smart runbook resolution for IT teams</p>
        </div>

        {/* Card */}
        <div className="surface-card p-7 animate-slide-up shadow-2xl shadow-black/40">
          <h2 className="text-lg font-bold text-dark-100 mb-1">Sign in</h2>
          <p className="text-sm text-dark-600 mb-6">Welcome back — continue your session</p>

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-dark-500 mb-1.5 block uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-dark-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-dark-500 mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-dark-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="input-field pl-9 pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-700 hover:text-dark-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-800/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[11px] text-dark-700 bg-dark-900">or</span>
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || authLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl
                       bg-white/95 text-gray-800 font-semibold text-sm
                       border border-white/10 shadow-sm
                       hover:bg-white transition-all duration-200 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-dark-700 mt-6">
            No account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
