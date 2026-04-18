import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Cpu, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { user, loginWithGoogle, registerWithEmail, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
  ];

  const allChecksPass = passwordChecks.every((c) => c.valid);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!allChecksPass) {
      toast.error('Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, password, name.trim());
      toast.success('Account created! Welcome to ResolveIT AI 🎉');
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
      };
      toast.error(errorMessages[error.code] || error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Welcome to ResolveIT AI!');
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Sign-in failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/30">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            ResolveIT <span className="text-primary-400">AI</span>
          </h1>
          <p className="text-dark-400 text-sm">
            Create your account to get started
          </p>
        </div>

        {/* Register card */}
        <div className="glass-card p-8 animate-slide-up">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-dark-100 mb-1">Create Account</h2>
            <p className="text-sm text-dark-500">Sign up with email or Google</p>
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleRegister} className="space-y-4 mb-5">
            <div>
              <label className="text-sm text-dark-400 mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-dark-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-dark-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-dark-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-dark-400 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-dark-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checks */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {passwordChecks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 transition-colors ${
                          check.valid ? 'text-emerald-400' : 'text-dark-600'
                        }`}
                      />
                      <span
                        className={`text-xs transition-colors ${
                          check.valid ? 'text-emerald-400' : 'text-dark-600'
                        }`}
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-dark-400 mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-dark-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={`input-field pl-11 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                      : ''
                  }`}
                  required
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-400 mt-1.5">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-dark-600 bg-dark-800/60">or continue with</span>
            </div>
          </div>

          {/* Google Sign-In button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || authLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl 
                       bg-white text-gray-800 font-semibold text-sm
                       shadow-lg hover:shadow-xl hover:bg-gray-50
                       transition-all duration-300 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Sign in link */}
          <p className="text-center text-sm text-dark-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
