import React, { useState } from 'react';
import { Trophy, Mail, Lock, LogIn, Sparkles, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.login({ email, password });
      login(data.token, data.user);
      success(`Welcome back, ${data.user.name}!`);

      if (data.user.role === 'auctioneer') {
        onNavigate('host-dashboard');
      } else {
        onNavigate('my-teams');
      }
    } catch (err: any) {
      toastError('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);

    try {
      const data = await api.login({ email: demoEmail, password: demoPass });
      login(data.token, data.user);
      success(`Logged in as demo user: ${data.user.name}`);

      if (data.user.role === 'auctioneer') {
        onNavigate('host-dashboard');
      } else {
        onNavigate('join');
      }
    } catch (err: any) {
      toastError('Demo Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 items-center justify-center shadow-xl shadow-emerald-950/60 border border-emerald-400/40 mb-3">
            <Trophy className="w-8 h-8 text-slate-950 fill-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-['Chivo'] uppercase">
            Stadium Arena
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to host or bid on world-class football talent
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="name@football.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Demo 1-Click Switchers */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 mb-2.5 text-xs font-mono text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Accounts</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('host@auction.com', 'admin123')}
                className="p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/30 text-amber-300 font-semibold text-left transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">Host (Alex)</div>
                  <div className="text-[10px] text-amber-400/70 font-mono">Auctioneer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner1@auction.com', 'player123')}
                className="p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-left transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Real Kings</div>
                  <div className="text-[10px] text-emerald-400/70 font-mono">Team Owner</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner2@auction.com', 'player123')}
                className="p-2.5 rounded-xl bg-sky-950/30 hover:bg-sky-950/60 border border-sky-500/30 text-sky-300 font-semibold text-left transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-bold">Catalan Stars</div>
                  <div className="text-[10px] text-sky-400/70 font-mono">Team Owner</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner3@auction.com', 'player123')}
                className="p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-rose-300 font-semibold text-left transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold">Gunners</div>
                  <div className="text-[10px] text-rose-400/70 font-mono">Team Owner</div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer link */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <button
              id="goto-register-btn"
              onClick={() => onNavigate('register')}
              className="font-bold text-emerald-400 hover:underline"
            >
              Register now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
