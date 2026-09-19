import React, { useState } from 'react';
import { Shield, UserCheck, Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { UserRole } from '../types';

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.register({ name, email, password, role });
      login(data.token, data.user);
      success(`Account created! Welcome, ${data.user.name}`);

      if (role === 'auctioneer') {
        onNavigate('host-dashboard');
      } else {
        onNavigate('join');
      }
    } catch (err: any) {
      toastError('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight font-['Chivo'] uppercase">
            Create Account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose your role to enter the auction stadium
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('auctioneer')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    role === 'auctioneer'
                      ? 'bg-amber-950/50 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Shield className="w-5 h-5 mb-1 text-amber-400" />
                  <div className="font-bold text-sm">Auctioneer</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Host & manage auctions</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('player')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    role === 'player'
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <UserCheck className="w-5 h-5 mb-1 text-emerald-400" />
                  <div className="font-bold text-sm">Team Owner</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Bid on players</div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Full Name / Manager Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-name-input"
                  type="text"
                  required
                  placeholder="e.g. Alex Ferguson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-email-input"
                  type="email"
                  required
                  placeholder="alex@football.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="register-password-input"
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider font-['Chivo'] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Creating Account...' : 'Register'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <button
              id="goto-login-btn"
              onClick={() => onNavigate('login')}
              className="font-bold text-emerald-400 hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
