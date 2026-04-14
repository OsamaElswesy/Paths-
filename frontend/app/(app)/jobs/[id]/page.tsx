'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Braces, MapPin, Briefcase, Star, Cpu, ArrowRight, Users, CheckCircle2, Unlock, Send, Calendar, Zap, Award, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { CandidateBoard } from '@/components/features/candidates/CandidateBoard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

import Link from 'next/link';

const PIPELINE_STEPS = [
    { id: 'define', title: '1. Define', icon: Braces },
    { id: 'source', title: '2. Source', icon: Users },
    { id: 'screen', title: '3. Screen', icon: Cpu },
    { id: 'shortlist', title: '4. Shortlist', icon: CheckCircle2 },
    { id: 'reveal', title: '5. Reveal', icon: Unlock },
    { id: 'outreach', title: '6. Outreach', icon: Send },
    { id: 'interview', title: '7. Interview', icon: Calendar },
    { id: 'evaluate', title: '8. Evaluate', icon: Zap },
    { id: 'decide', title: '9. Decide', icon: Award }
];

export default function JobDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { jobs, candidates, isAnonymized } = useAppStore();
    const [activeStep, setActiveStep] = useState<string>('define');

    const [isScreening, setIsScreening] = useState(false);

    // Find job in store
    const job = jobs.find(j => j.id === id);

    const rerunScreening = () => {
        setIsScreening(true);
        setTimeout(() => setIsScreening(false), 2000);
    };

    if (!job) return <div className="p-8 text-center text-slate-500">Job not found</div>;

    const jobCandidates = candidates.filter(c => c.jobId === id);

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Header with Step Progress */}
            <div className="flex flex-col gap-6 shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            {job.title}
                            <Badge variant={job.status === 'Published' ? 'success' : 'secondary'}>{job.status}</Badge>
                        </h1>
                        <p className="text-slate-500 mt-1">{job.department} • {job.location}</p>
                    </div>
                </div>

                {/* Unified 9-Step Pipeline Stepper */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {PIPELINE_STEPS.map((step) => {
                        const isActive = activeStep === step.id;
                        return (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(step.id)}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                                    isActive ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <step.icon size={14} /> {step.title}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Workflow Step Views */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                {activeStep === 'define' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                                        <CardTitle className="text-xl">Alignment & Requirements</CardTitle>
                                        <CardDescription>Core expectations and role definition.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {job.description ? (
                                            <div className="prose prose-slate max-w-none">
                                                <p className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                                                    {job.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-slate-400 border-2 border-dashed rounded-xl">
                                                <p>No description provided for this role.</p>
                                                <Button variant="ghost" className="mt-2 text-indigo-600">Add Description</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Role Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid sm:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Location</p>
                                            <p className="text-sm font-medium">{job.location || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Employment Type</p>
                                            <p className="text-sm font-medium">{job.type || 'Full-time'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Sourcing Mode</p>
                                            <p className="text-sm font-medium">{job.mode}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="border-none shadow-sm ring-1 ring-slate-200">
                                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Braces size={20} className="text-indigo-600" />
                                            Scoring Rubric
                                        </CardTitle>
                                        <CardDescription>How AI will screen candidates.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {job.rubric && job.rubric.length > 0 ? (
                                            <ul className="space-y-3">
                                                {job.rubric.map((item, i) => (
                                                    <li key={i} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-indigo-200 transition-colors">
                                                        <span className="font-semibold text-slate-700">{item.criteria}</span>
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{item.weight}</Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 italic text-sm">
                                                No rubric defined yet.
                                            </div>
                                        )}
                                        <Button className="w-full mt-6 bg-slate-900 text-white hover:bg-slate-800 gap-2">
                                            <Plus size={16} /> Edit Rubric
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeStep === 'source' && (
                    <div className="animate-in fade-in slide-in-from-right-4 h-full">
                        <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
                            <Users size={48} className="text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold">Talent Sourcing</h3>
                            <p className="text-slate-500 max-w-sm mb-6">Connect your ATS or use AI Discovery to populate this job's pipeline.</p>
                            <Link href="/sourcing">
                                <Button className="bg-indigo-600">Open Sourcing Hub</Button>
                            </Link>
                        </Card>
                    </div>
                )}

                {activeStep === 'screen' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                        <Card className="bg-slate-900 text-white overflow-hidden p-8 border-none shadow-xl relative min-h-[300px] flex flex-col justify-center">
                            {isScreening ? (
                                <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
                                    <div className="h-16 w-16 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/50">
                                        <Cpu size={32} className="text-indigo-400 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold">AI is analyzing {jobCandidates.length} candidates...</h2>
                                        <p className="text-slate-400 mt-2 italic">Matching resumes against your 9-step rubric requirements.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-2"><Cpu className="text-indigo-400" /> AI Screening Results</h2>
                                            <p className="text-slate-400">Instantly identifying Top-K talent based on rubric alignment.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2" onClick={rerunScreening}>
                                                <Zap size={14} /> Rerun Screening
                                            </Button>
                                            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                                                <CheckCircle2 size={14} /> Shortlist All Top-3
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6 relative z-10">
                                        {jobCandidates.sort((a, b) => b.score - a.score).slice(0, 3).map((c, i) => (
                                            <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="h-8 w-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-bold ring-1 ring-amber-400/50">
                                                        #{i + 1}
                                                    </div>
                                                    <Badge className="bg-white/10 text-white border-white/20">{c.score}% Match</Badge>
                                                </div>
                                                <div className="mb-6">
                                                    <p className="text-lg font-bold truncate group-hover:text-indigo-400 transition-colors">
                                                        {isAnonymized ? `Candidate #${c.id.split('-')[1]}` : c.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Match Confidence: High</p>
                                                </div>
                                                <div className="space-y-3 mb-6">
                                                    <div className="h-1 w-full bg-white/5 rounded-full">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.score}%` }} />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-400">
                                                        <span>Skill Fit</span>
                                                        <span className="text-white">Excellent</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" className="w-full text-xs text-slate-400 group-hover:text-white group-hover:bg-white/10">
                                                    Check Rubric Alignment <ArrowRight size={12} className="ml-2" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card>
                    </div>
                )}

                {(activeStep === 'shortlist' || activeStep === 'reveal' || activeStep === 'outreach' || activeStep === 'interview' || activeStep === 'decide') && (
                    <div className="h-full -mx-2">
                        <CandidateBoard jobId={id} />
                    </div>
                )}
            </div>
        </div>
    );
}
