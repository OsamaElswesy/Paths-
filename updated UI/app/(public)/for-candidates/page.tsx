'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldCheck, Target, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForCandidatesPage() {
    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-24 pb-32 text-center container px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] -z-10 mix-blend-multiply opacity-70 animate-float" />

                <div className="animate-fade-in-up">
                    <Badge variant="primary" className="mb-8 px-5 py-2 text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm">
                        Candidate-First Philosophy
                    </Badge>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 max-w-4xl mx-auto tracking-tight animate-fade-in-up delay-100 leading-[1.1]">
                    Evaluated by <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Skill.</span><br />
                    Not by Pedigree.
                </h1>

                <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-12 leading-relaxed animate-fade-in-up delay-200">
                    Traditional hiring is biased. PATHS uses managed anonymity to ensure you are
                    seen for what you can do. No headshots, no name bias—just pure talent.
                </p>

                <div className="flex flex-wrap justify-center gap-5 animate-fade-in-up delay-300">
                    <Link href="/login">
                        <Button size="lg" className="h-14 px-10 rounded-full text-lg shadow-2xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 transition-all hover:-translate-y-1">
                            Build Your Profile <ArrowRight size={20} className="ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Managed Anonymity Section */}
            <section className="py-32 container px-6 grid lg:grid-cols-2 gap-20 items-center border-t border-slate-100">
                <div className="relative group animate-fade-in-up delay-400">
                    <div className="absolute -inset-4 bg-indigo-500/10 blur-[100px] rounded-full pointing-events-none group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="relative rounded-3xl border border-slate-200 p-2 shadow-2xl bg-white overflow-hidden transition-transform duration-500 hover:scale-[1.02]">
                        <Image
                            src="/images/candidate-profile.png"
                            alt="Anonymous Candidate Profile"
                            width={800}
                            height={800}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                </div>
                <div className="space-y-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                        Your identity is <span className="text-indigo-600">protected.</span>
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        We mask your Name, Photo, Social links, and Education details in the early stages
                        of the hiring process. Recruiters only see your skills, experience, and
                        AI rubrics alignment score until you are approved for a reveal.
                    </p>
                    <ul className="space-y-4">
                        {[
                            "9-step workflow protects your privacy",
                            "Skills-based scoring removes unconscious bias",
                            "You control when your identity is revealed",
                            "Focus on the work that actually matters"
                        ].map((text, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                <div className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                    <CheckCircle2 size={14} />
                                </div>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Actionable Feedback Section */}
            <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="container px-6 grid lg:grid-cols-2 gap-24 items-center relative z-10">
                    <div className="space-y-8 order-2 lg:order-1">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10">
                            <Target size={32} />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                            Get feedback that <span className="text-indigo-400">matters.</span>
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            Stop getting "ghosted." Personalized feedback reports show exactly
                            how you matched against the role's rubric, giving you clear insights
                            on areas of strength and opportunities for growth.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-6 pt-4">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Technical Insights</p>
                                <p className="text-sm text-slate-300">Detailed breakdown of your objective skill performance.</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Growth Map</p>
                                <p className="text-sm text-slate-300">AI-generated suggestions on where to focus your next upskilling.</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative group order-1 lg:order-2">
                        <div className="absolute -inset-10 bg-indigo-500/30 blur-[120px] rounded-full pointing-events-none"></div>
                        <div className="relative rounded-3xl border border-white/10 shadow-2xl overflow-hidden shadow-indigo-500/20">
                            <Image
                                src="/images/candidate-feedback.png"
                                alt="Candidate Feedback Report"
                                width={800}
                                height={600}
                                className="w-full h-auto"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 px-6">
                <div className="container max-w-4xl mx-auto">
                    <div className="relative rounded-[3rem] bg-indigo-600 overflow-hidden px-8 py-20 text-center shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <div className="relative z-10 space-y-8">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready for a fairer interview?</h2>
                            <p className="text-indigo-100 text-xl max-w-xl mx-auto">Join the platform where talent is the only thing that matters.</p>
                            <Link href="/login">
                                <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 h-16 px-12 text-lg rounded-full font-bold shadow-xl">
                                    Create Your Free Profile
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


