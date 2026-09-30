import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode);
      setError(null);
    }
  }, [isAuthModalOpen, authModalMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend pre-validation
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      const cleanName = name.trim();
      if (!cleanName || cleanName.length < 2) {
        setError('Name must be at least 2 characters.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: cleanEmail, password });
      } else {
        await register({
          email: cleanEmail,
          password,
          name: name.trim(),
          username: username.trim() || undefined,
        });
      }
      // Reset fields
      setEmail('');
      setPassword('');
      setName('');
      setUsername('');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#0a0e19] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden font-sans"
        role="dialog"
        aria-modal="true"
      >
        {/* Header bar */}
        <div className="px-5 py-4 border-b border-[#182234] flex items-center justify-between bg-[#070a12]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
                {mode === 'login' ? 'ORBITAL AUTHENTICATION' : 'INITIALIZE PILOT ACCOUNT'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {mode === 'login' ? 'Access personal telemetry & saved decks' : 'Persistent cloud storage on MongoDB Atlas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#141d2e] rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#182234] bg-[#0c101c]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-medium transition-colors border-b-2 ${
              mode === 'login'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-medium transition-colors border-b-2 ${
              mode === 'register'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-950/40 border border-red-500/30 rounded text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Full Name <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Commander Shepard"
                    className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1b2537] focus:border-cyan-400 focus:outline-none rounded text-xs text-slate-100 placeholder:text-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                  Callsign / Username (Optional)
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. pilot_echo"
                    className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1b2537] focus:border-cyan-400 focus:outline-none rounded text-xs text-slate-100 placeholder:text-slate-600 transition-colors font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
              Email Address <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pilot@station.orbit"
                className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1b2537] focus:border-cyan-400 focus:outline-none rounded text-xs text-slate-100 placeholder:text-slate-600 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
              Password <span className="text-cyan-400">*</span> (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-[#060911] border border-[#1b2537] focus:border-cyan-400 focus:outline-none rounded text-xs text-slate-100 placeholder:text-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white rounded font-mono text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-950/40"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'ENTER ORBIT' : 'ESTABLISH CREDENTIALS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer / Anonymous usage fallback */}
        <div className="px-5 py-3 border-t border-[#182234] bg-[#070a12] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">Guest telemetry supported</span>
          <button
            type="button"
            onClick={closeAuthModal}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline underline-offset-2 transition-colors"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
    </div>
  );
};
