/**
 * LoginPage.jsx — Demo login gate for AI Ticketing System
 * Predefined credentials:
 *   User  → user@gmail.com  / user123
 *   Admin → admin@gmail.com / admin123
 */

import React, { useState } from 'react';
import {
  CircleDot, Mail, Lock, Eye, EyeOff, Sparkles,
  User, ShieldCheck, AlertTriangle, ArrowRight, Zap
} from 'lucide-react';

// ─── Demo credentials ─────────────────────────────────────

const DEMO_CREDENTIALS = {
  user: { email: 'user@gmail.com', password: 'user123', role: 'user' },
  admin: { email: 'admin@gmail.com', password: 'admin123', role: 'admin' },
};

// ─── Component ────────────────────────────────────────────

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a brief async check
    await new Promise(r => setTimeout(r, 600));

    const match = Object.values(DEMO_CREDENTIALS).find(
      c => c.email === email.trim().toLowerCase() && c.password === password
    );

    if (match) {
      onLogin(match.role, match.email);
    } else {
      setError('Invalid email or password. Try the demo buttons below.');
    }
    setLoading(false);
  };

  const quickLogin = async (type) => {
    setError('');
    setLoading(true);
    const cred = DEMO_CREDENTIALS[type];
    setEmail(cred.email);
    setPassword(cred.password);
    await new Promise(r => setTimeout(r, 500));
    onLogin(cred.role, cred.email);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#22c55e]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/4 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22c55e] mb-4 shadow-lg shadow-[#22c55e]/20">
            <CircleDot className="w-8 h-8 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">AI Tickets</h1>
          <p className="text-neutral-500 text-sm">Smart Support Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-neutral-500 mb-6">Sign in to continue to your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-700 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#22c55e]/20 mt-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#222222]" />
            <span className="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#22c55e]" /> Quick Demo Access
            </span>
            <div className="flex-1 h-px bg-[#222222]" />
          </div>

          {/* Demo buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="demo-user-btn"
              onClick={() => quickLogin('user')}
              disabled={loading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] hover:border-[#22c55e]/40 hover:bg-[#22c55e]/5 transition-all group active:scale-[0.97] disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center group-hover:bg-[#22c55e]/20 transition-colors">
                <User className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-white">Demo User</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Support Portal</p>
              </div>
            </button>

            <button
              id="demo-admin-btn"
              onClick={() => quickLogin('admin')}
              disabled={loading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group active:scale-[0.97] disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-white">Demo Admin</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Admin Dashboard</p>
              </div>
            </button>
          </div>

          {/* Credentials hint */}
          <div className="mt-5 p-3 bg-[#0f0f0f] rounded-xl border border-[#1e1e1e]">
            <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#22c55e]" /> Demo Credentials
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-[#22c55e]" /> user@gmail.com
                </span>
                <span className="font-mono text-neutral-600 bg-[#171717] px-2 py-0.5 rounded-md">user123</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> admin@gmail.com
                </span>
                <span className="font-mono text-neutral-600 bg-[#171717] px-2 py-0.5 rounded-md">admin123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-neutral-700 mt-5">
          AI-powered support platform · Demo environment
        </p>
      </div>
    </div>
  );
}
