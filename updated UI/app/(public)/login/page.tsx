'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { User, Building2, ArrowRight, ArrowLeft, Mail, Lock, ShieldCheck, Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { login } from '@/lib/api/auth';

type FlowState = 'SELECT_ROLE' | 'AUTH_FORM';
type UserRole = 'CANDIDATE' | 'COMPANY';
type AuthMode = 'LOGIN' | 'REGISTER';

export default function LoginPage() {
    const [state, setState] = useState<FlowState>('SELECT_ROLE');
    const [role, setRole] = useState<UserRole | null>(null);
    const [mode, setMode] = useState<AuthMode>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const { setUserRole } = useAppStore();
    const router = useRouter();

    const handleRoleSelect = (selectedRole: UserRole) => {
        setRole(selectedRole);
        setState('AUTH_FORM');
        setAuthError(null);
    };
    const toggleMode = () => {
        setMode(prev => prev === 'LOGIN' ? 'REGISTER' : 'LOGIN');
        setAuthError(null);
    };

    const handleAuth = async () => {
        if (mode === 'REGISTER') {
            // TODO: Registration requires a dedicated form (full_name, org details).
            // This is tracked as Phase B work. Candidates and orgs must register
            // via a proper registration flow, not this login form.
            setAuthError('Registration is not available from this form yet. Please contact your administrator.');
            return;
        }

        setAuthError(null);
        setIsLoading(true);
        try {
            const result = await login(email, password);
            localStorage.setItem('paths-token', result.access_token);
            // Map backend account_type to store role
            const storeRole = result.user.account_type === 'candidate' ? 'CANDIDATE' : 'RECRUITER';
            setUserRole(storeRole);
            router.push('/dashboard');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setAuthError(typeof detail === 'string' ? detail : 'Invalid email or password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center py-12 px-6 relative overflow-hidden bg-slate-50">
            {/* Dynamic Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />

            <div className="w-full max-w-4xl mx-auto relative z-10">
                {state === 'SELECT_ROLE' ? (
                    <div className="space-y-12 animate-fade-in-up">
                        <div className="text-center space-y-4">
                            <img src="/logo.png" alt="PATHS Logo" className="h-64 w-auto mx-auto mb-12" />
                            <Badge variant="primary" className="bg-indigo-50 text-indigo-700 border-indigo-100">Welcome to PATHS</Badge>
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">How are you using the platform?</h1>
                            <p className="text-slate-500 text-lg">Choose your journey to get started with the recruitment revolution.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                            {/* Candidate Card */}
                            <button
                                onClick={() => handleRoleSelect('CANDIDATE')}
                                className="group p-1 rounded-[2.5rem] bg-gradient-to-b from-white to-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ring-1 ring-slate-200"
                            >
                                <div className="bg-white rounded-[2.4rem] p-10 flex flex-col items-center text-center space-y-6 h-full border border-white">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-500">
                                        <User size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-slate-900">I'm a Candidate</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">Find roles based on your skills, protected by managed anonymity and fair rubrics.</p>
                                    </div>
                                    <div className="pt-4 flex items-center text-indigo-600 font-bold group-hover:gap-2 transition-all">
                                        Get Hired <ArrowRight size={18} className="ml-1" />
                                    </div>
                                </div>
                            </button>

                            {/* Company Card */}
                            <button
                                onClick={() => handleRoleSelect('COMPANY')}
                                className="group p-1 rounded-[2.5rem] bg-gradient-to-b from-white to-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ring-1 ring-slate-200"
                            >
                                <div className="bg-white rounded-[2.4rem] p-10 flex flex-col items-center text-center space-y-6 h-full border border-white">
                                    <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-500">
                                        <Building2 size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-slate-900">I'm a Company</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">Build elite teams with AI-powered screening and objective talent evaluation.</p>
                                    </div>
                                    <div className="pt-4 flex items-center text-purple-600 font-bold group-hover:gap-2 transition-all">
                                        Hire Talent <ArrowRight size={18} className="ml-1" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto animate-fade-in-up">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-8 p-0 hover:bg-transparent text-slate-500 hover:text-indigo-600 flex items-center gap-2"
                            onClick={() => setState('SELECT_ROLE')}
                        >
                            <ArrowLeft size={16} /> Back to selection
                        </Button>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

                            <div className="relative z-10 space-y-8">
                                <div className="text-center space-y-2">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-4 transition-colors",
                                        role === 'CANDIDATE' ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"
                                    )}>
                                        {role === 'CANDIDATE' ? <User size={24} /> : <Building2 size={24} />}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">
                                        {mode === 'LOGIN' ? 'Welcome back' : 'Create your account'}
                                    </h2>
                                    <p className="text-slate-500 text-sm">
                                        {mode === 'LOGIN' ? "Continue your PATHS journey" : "Start your path to excellence"} as a <span className="font-bold text-slate-900">{role?.toLowerCase()}</span>.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                            <Input
                                                type="email"
                                                placeholder="name@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between pl-1">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                                            {mode === 'LOGIN' && <button className="text-[10px] font-bold text-indigo-600 hover:underline">Forgot Password?</button>}
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                                                className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {authError && (
                                    <p className="text-sm text-red-500 text-center -mt-2 px-2">{authError}</p>
                                )}
                                <Button
                                    onClick={handleAuth}
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full h-14 rounded-full text-lg font-bold shadow-xl transition-all hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                                        role === 'CANDIDATE' ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20" : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"
                                    )}
                                >
                                    {isLoading ? 'Signing in…' : (mode === 'LOGIN' ? 'Sign In' : 'Get Started')}
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                    <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-medium">Or continue with</span></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" className="h-12 rounded-2xl border-slate-200 hover:bg-slate-50 flex gap-2">
                                        <Github size={18} /> GitHub
                                    </Button>
                                    <Button variant="outline" className="h-12 rounded-2xl border-slate-200 hover:bg-slate-50 flex gap-2">
                                        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> Google
                                    </Button>
                                </div>

                                <div className="text-center">
                                    <button
                                        onClick={toggleMode}
                                        className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                                    >
                                        {mode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"} <span className="font-bold text-indigo-600">
                                            {mode === 'LOGIN' ? 'Sign up' : 'Sign in'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 animate-pulse">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-medium">Enterprise Grade Security & Privacy</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
