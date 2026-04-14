'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Check, X, Shield, Brain, Target, AlertTriangle, MessageSquare, Briefcase } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { fetchDecisionSupportData, submitHiringDecision, DecisionSupportData } from '@/lib/api/decisions';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

export default function DecisionsPage() {
    const { candidates, isLoading: storeLoading } = useAppStore();
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const [recruiterNotes, setRecruiterNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Show all candidates that have a job context; fall back to all candidates if none do
    const candidatesWithJob = candidates.filter(c => c.jobId && c.jobId !== 'unknown');
    const pendingCandidates = candidatesWithJob.length > 0 ? candidatesWithJob : candidates;

    useEffect(() => {
        if (!selectedCandidateId && pendingCandidates.length > 0) {
            setSelectedCandidateId(pendingCandidates[0].id);
        }
    }, [pendingCandidates, selectedCandidateId]);

    const selectedCandidate = pendingCandidates.find(c => c.id === selectedCandidateId);

    // Fetch AI Decision Data — pass jobId so scoring is job-specific
    const { data: decisionData, isLoading: decisionLoading } = useSWR(
        selectedCandidateId ? `/api/v1/decisions/${selectedCandidateId}?job_id=${selectedCandidate?.jobId}` : null,
        () => fetchDecisionSupportData(selectedCandidateId!, selectedCandidate?.jobId ?? undefined)
    );

    if (storeLoading) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading talent pipelines...</div>;
    }

    const handleDecision = async (decision: 'hired' | 'rejected') => {
        if (!selectedCandidateId || !selectedCandidate?.jobId || selectedCandidate.jobId === 'unknown') {
            alert('Cannot finalize: candidate has no associated job. Please ensure the candidate has an active application.');
            return;
        }
        setIsSubmitting(true);
        try {
            await submitHiringDecision(selectedCandidateId, {
                job_id: selectedCandidate.jobId,
                decision,
                actor_id: 'recruiter',
                notes: recruiterNotes || undefined,
            });
            alert(`Decision (${decision}) recorded and audit log updated.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const candidate = selectedCandidate;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader 
                title="Decision Support AI" 
                description="Finalize hiring decisions using AI-driven explainability and bias checks." 
            />

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar: Shortlist Context */}
                <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <UsersIcon size={18} /> Shortlisted ({pendingCandidates.length})
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingCandidates.length === 0 && (
                            <p className="text-slate-500 text-sm p-4 border border-dashed rounded-lg text-center">No pending decisions.</p>
                        )}
                        {pendingCandidates.map(c => (
                            <Card 
                                key={c.id} 
                                className={cn(
                                    "cursor-pointer transition-all border-l-4",
                                    selectedCandidateId === c.id ? "bg-indigo-50 border-l-indigo-600 shadow-md" : "border-l-transparent hover:bg-slate-50"
                                )}
                                onClick={() => setSelectedCandidateId(c.id)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className={cn("text-xs font-bold", selectedCandidateId === c.id ? "bg-indigo-600 text-white" : "bg-slate-200")}>
                                                {c.name.substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className={cn("font-medium text-sm", selectedCandidateId === c.id ? "text-indigo-900" : "text-slate-700")}>{c.name}</p>
                                            <p className="text-xs text-slate-500">Match: {c.score}%</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={c.score >= 90 ? "bg-amber-50 text-amber-600 border-amber-200" : "text-slate-400"}>
                                        {c.score >= 90 ? 'Top' : 'Avg'}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Main Content: Decision Dashboard */}
                <div className="flex-1 space-y-6">
                    {!candidate ? (
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
                            Select a candidate to view AI Decision Analysis
                        </div>
                    ) : decisionLoading || !decisionData ? (
                        <div className="h-64 flex flex-col items-center justify-center border border-slate-200 rounded-2xl bg-white space-y-4">
                            <Brain size={40} className="text-indigo-400 animate-pulse" />
                            <p className="text-slate-500 animate-pulse">Running AI evaluation matrices...</p>
                        </div>
                    ) : (
                        <>
                            {/* Candidate Header & Confidence */}
                            <Card className="border-none shadow-lg ring-1 ring-slate-200 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <Brain size={120} />
                                </div>
                                <CardContent className="p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-20 w-20 shadow-md">
                                                <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                                    {candidate.name.substring(0,2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{candidate.name}</h2>
                                                <p className="text-slate-500 flex items-center gap-2 mt-1">
                                                    <Briefcase size={16} /> Senior Software Engineer (Open Requisition)
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Recommendation</p>
                                                <Badge className={cn(
                                                    "mt-1 text-sm py-1 px-3",
                                                    decisionData.recommendation === 'Strong Hire' ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                )}>
                                                    {decisionData.recommendation}
                                                </Badge>
                                            </div>
                                            <div className="h-10 w-px bg-slate-200" />
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Composite Score</p>
                                                <p className="text-3xl font-black text-indigo-600 drop-shadow-sm leading-none mt-1">{decisionData.score}%</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{decisionData.confidence_level} confidence</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Analytics Grid */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Explainability Panel */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Brain size={18} className="text-purple-600" /> Explainability Engine
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        <div className="space-y-3">
                                            {decisionData.key_factors.map((factor, i) => (
                                                <div key={i} className="flex gap-3 text-sm">
                                                    <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                    <span className="text-slate-700 leading-snug">{factor}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg mt-6">
                                            <h4 className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-2">
                                                <Shield size={14} /> Fairness & Guardrails
                                            </h4>
                                            {decisionData.bias_flags.length === 0 ? (
                                                <p className="text-amber-700/80 text-xs leading-relaxed italic">
                                                    Anonymization protocols active. Name, gender, and demographic markers were successfully hashed out of the evaluation logic sequence prior to LLM submission. No bias detected.
                                                </p>
                                            ) : (
                                                <ul className="list-disc pl-4 text-amber-700/80 text-xs">
                                                    {decisionData.bias_flags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Scoring Breakdown */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Target size={18} className="text-blue-600" /> Weighted Scoring Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4">
                                        {[
                                            { label: 'Skill Match', val: decisionData.skill_score, weight: '50%' },
                                            { label: 'Experience Match', val: decisionData.experience_score, weight: '30%' },
                                            { label: 'Profile Completeness', val: decisionData.profile_completeness_score, weight: '20%' },
                                        ].map(metric => (
                                            <div key={metric.label} className="space-y-1.5">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium text-slate-700">{metric.label} <span className="text-[10px] text-slate-400 ml-1">({metric.weight})</span></span>
                                                    <span className="font-bold text-slate-900">{metric.val}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-1000", metric.val >= 80 ? "bg-green-500" : metric.val >= 50 ? "bg-indigo-500" : "bg-amber-400")}
                                                        style={{ width: `${metric.val}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Gap factors */}
                                        {decisionData.gap_factors.length > 0 && (
                                            <div className="pt-2 space-y-1.5">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gaps Identified</p>
                                                {decisionData.gap_factors.map((gap, i) => (
                                                    <div key={i} className="flex gap-2 text-xs text-slate-600">
                                                        <X size={13} className="text-red-400 mt-0.5 shrink-0" />
                                                        <span>{gap}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Data warnings */}
                                        {decisionData.data_warnings.length > 0 && (
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                    <AlertTriangle size={12} className="text-amber-500" /> Scoring Notes
                                                </p>
                                                {decisionData.data_warnings.map((w, i) => (
                                                    <p key={i} className="text-[11px] text-slate-500">{w}</p>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Candidate Comparison Table */}
                            {pendingCandidates.length > 1 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Peer Comparison (Top 3)</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="w-[200px]">Candidate</TableHead>
                                                    <TableHead>Total Match</TableHead>
                                                    <TableHead>Experience Level</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingCandidates.slice(0,3).map(peer => (
                                                    <TableRow key={peer.id} className={peer.id === candidate.id ? "bg-indigo-50/50" : ""}>
                                                        <TableCell className="font-medium flex items-center gap-2">
                                                            {peer.id === candidate.id && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                                                            {peer.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={peer.score >= 90 ? "text-green-600 border-green-200" : ""}>
                                                                {peer.score}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500">{peer.experience} Yrs</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" onClick={() => setSelectedCandidateId(peer.id)}>
                                                                Analyze
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Final Decision Hub */}
                            <Card className="border-2 border-slate-200 bg-slate-50/50">
                                <CardHeader>
                                    <CardTitle className="text-base">Recruiter Evaluation Action</CardTitle>
                                    <CardDescription>Finalize workflow step based on matrix above.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <textarea
                                        value={recruiterNotes}
                                        onChange={(e) => setRecruiterNotes(e.target.value)}
                                        className="w-full h-24 rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-inner"
                                        placeholder="Enter official evaluation notes to be attached to candidate record..."
                                    />
                                    <div className="flex gap-4">
                                        <Button
                                            size="lg"
                                            onClick={() => handleDecision('hired')}
                                            disabled={isSubmitting}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-100 gap-2"
                                        >
                                            <Check size={18} /> Proceed to Offer
                                        </Button>
                                        <Button
                                            size="lg"
                                            onClick={() => handleDecision('rejected')}
                                            disabled={isSubmitting}
                                            variant="outline"
                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold gap-2"
                                        >
                                            <X size={18} /> Trigger Rejection Email
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-400 mt-2">
                                        Actions are recorded in the immutable audit log in compliance with internal hiring safeguards.
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Quick component for users icon since we missing it locally
function UsersIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
