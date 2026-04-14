'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import {
    Mail, Phone, MapPin, Briefcase, Star, Search, Filter,
    Shield, ShieldCheck, ShieldAlert, ShieldX, X,
    CheckCircle2, AlertTriangle, Info, Loader2, ClipboardList,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
    validateCandidateEvidence,
    EvidenceValidationResult,
    ValidationFinding,
} from '@/lib/api/evidence_validation';
import {
    createAssessment,
    submitAssessmentAnswers,
    AssessmentSession,
    AssessmentScoreResult,
} from '@/lib/api/assessments';

// ── Evidence Validation Modal ─────────────────────────────────────────────────

function EvidenceModal({
    candidateId,
    candidateName,
    onClose,
}: {
    candidateId: string;
    candidateName: string;
    onClose: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<EvidenceValidationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const run = async () => {
            setIsLoading(true);
            try {
                const res = await validateCandidateEvidence(candidateId);
                setResult(res);
            } catch (err: any) {
                setError(
                    err?.response?.data?.detail ??
                    'Evidence validation failed — ensure the backend is running.',
                );
            } finally {
                setIsLoading(false);
            }
        };
        run();
    }, [candidateId]);

    const statusConfig = {
        validated: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Validated' },
        needs_review: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Needs Review' },
        flagged: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Flagged' },
    };

    const severityConfig = {
        critical: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
        warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
        info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-3 sticky top-0 bg-white border-b z-10">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield size={18} className="text-indigo-600" /> Evidence Validation
                        </CardTitle>
                        <CardDescription>{candidateName}</CardDescription>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                    {isLoading && (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 size={36} className="animate-spin text-indigo-400" />
                            <p className="text-sm animate-pulse">Running 8-point evidence checks…</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {result && !isLoading && (
                        <>
                            {/* Trust Score Header */}
                            {(() => {
                                const cfg = statusConfig[result.validation_status] ?? statusConfig.needs_review;
                                const StatusIcon = cfg.icon;
                                return (
                                    <div className={cn('flex items-center justify-between p-4 rounded-xl border', cfg.bg)}>
                                        <div className="flex items-center gap-3">
                                            <StatusIcon size={28} className={cfg.color} />
                                            <div>
                                                <p className={cn('font-bold text-lg leading-none', cfg.color)}>
                                                    {cfg.label}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {result.critical_count} critical · {result.warning_count} warnings · {result.info_count} info
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Trust Score</p>
                                            <p className={cn('text-3xl font-black leading-none mt-0.5', cfg.color)}>
                                                {result.trust_score}
                                                <span className="text-sm font-normal text-slate-400">/100</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Experience summary */}
                            {(result.claimed_years_experience != null || result.computed_years_experience != null) && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Claimed Experience</p>
                                        <p className="text-xl font-bold text-slate-700 mt-0.5">
                                            {result.claimed_years_experience ?? '—'} yrs
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Computed from History</p>
                                        <p className="text-xl font-bold text-slate-700 mt-0.5">
                                            {result.computed_years_experience != null
                                                ? `${result.computed_years_experience} yrs`
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {result.summary && (
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 leading-relaxed">
                                    {result.summary}
                                </p>
                            )}

                            {/* Findings */}
                            {result.findings.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Findings ({result.findings.length})
                                    </p>
                                    {result.findings.map((f: ValidationFinding, i: number) => {
                                        const sev = severityConfig[f.severity] ?? severityConfig.info;
                                        const SevIcon = sev.icon;
                                        return (
                                            <div key={i} className={cn('flex gap-3 p-3 rounded-lg border text-sm', sev.bg)}>
                                                <SevIcon size={16} className={cn('shrink-0 mt-0.5', sev.color)} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('font-medium', sev.color)}>{f.message}</p>
                                                    {f.detail && (
                                                        <p className="text-xs text-slate-500 mt-0.5">{f.detail}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                                                        {f.check.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {result.findings.length === 0 && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                                    <p className="text-sm text-green-800 font-medium">
                                        No issues detected. All evidence checks passed.
                                    </p>
                                </div>
                            )}

                            {result.data_warnings?.length > 0 && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-3 space-y-1">
                                    <p className="font-semibold uppercase tracking-wide">Scoring notes</p>
                                    {result.data_warnings.map((w, i) => <p key={i}>• {w}</p>)}
                                </div>
                            )}
                        </>
                    )}

                    <div className="pt-2">
                        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Assessment Launch Modal ────────────────────────────────────────────────────

function AssessmentModal({
    candidateId,
    candidateName,
    onClose,
}: {
    candidateId: string;
    candidateName: string;
    onClose: () => void;
}) {
    const { jobs } = useAppStore();
    const [selectedJobId, setSelectedJobId] = useState('');
    const [maxQuestions, setMaxQuestions] = useState(5);
    const [session, setSession] = useState<AssessmentSession | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [scored, setScored] = useState<AssessmentScoreResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!selectedJobId) { setError('Please select a job.'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const s = await createAssessment(candidateId, selectedJobId, 'technical', maxQuestions);
            setSession(s);
            const initAnswers: Record<string, string> = {};
            s.questions.forEach(q => { initAnswers[q.id] = ''; });
            setAnswers(initAnswers);
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to create assessment.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!session) return;
        const filled = Object.entries(answers).filter(([, v]) => v.trim().length > 0);
        if (filled.length === 0) { setError('Please provide at least one answer.'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const result = await submitAssessmentAnswers(
                session.id,
                filled.map(([qid, text]) => ({ question_id: qid, answer_text: text })),
            );
            setScored(result);
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Scoring failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-3 sticky top-0 bg-white border-b z-10">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ClipboardList size={18} className="text-indigo-600" /> Technical Assessment
                        </CardTitle>
                        <CardDescription>{candidateName}</CardDescription>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                    {/* Step 1 — Create */}
                    {!session && !scored && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                                Questions are generated automatically from the job's skill requirements.
                                Provide notes or candidate answers after the interview for AI scoring.
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Position</label>
                                <select
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedJobId}
                                    onChange={e => setSelectedJobId(e.target.value)}
                                >
                                    <option value="">Select a job…</option>
                                    {jobs.map(j => (
                                        <option key={j.id} value={j.id}>{j.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Number of Questions: {maxQuestions}
                                </label>
                                <input
                                    type="range" min={2} max={8} step={1}
                                    value={maxQuestions}
                                    onChange={e => setMaxQuestions(Number(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </div>
                            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    onClick={handleCreate}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : 'Generate Questions'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Answer questions */}
                    {session && !scored && (
                        <div className="space-y-5">
                            <p className="text-sm text-slate-500">
                                Enter candidate answers or your observations for each question below.
                            </p>
                            {session.questions.map((q, i) => (
                                <div key={q.id} className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <Badge variant="outline" className={cn(
                                            'shrink-0 text-[10px] mt-0.5',
                                            q.difficulty === 'hard' ? 'bg-red-50 text-red-700 border-red-200' :
                                            q.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-green-50 text-green-700 border-green-200',
                                        )}>
                                            {q.difficulty}
                                        </Badge>
                                        <p className="text-sm font-medium text-slate-800">{q.question}</p>
                                    </div>
                                    <textarea
                                        className="w-full h-20 rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter candidate's answer or your observations…"
                                        value={answers[q.id] ?? ''}
                                        onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>}
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <><Loader2 size={14} className="animate-spin" /> Scoring…</> : 'Submit & Score'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Results */}
                    {scored && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className={cn(
                                'flex items-center justify-between p-4 rounded-xl border',
                                scored.result === 'pass' ? 'bg-green-50 border-green-200' :
                                scored.result === 'borderline' ? 'bg-amber-50 border-amber-200' :
                                'bg-red-50 border-red-200',
                            )}>
                                <div>
                                    <p className={cn(
                                        'font-bold text-lg capitalize',
                                        scored.result === 'pass' ? 'text-green-700' :
                                        scored.result === 'borderline' ? 'text-amber-700' : 'text-red-700',
                                    )}>
                                        {scored.result}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Technical Assessment Result</p>
                                </div>
                                <p className={cn(
                                    'text-3xl font-black',
                                    scored.result === 'pass' ? 'text-green-700' :
                                    scored.result === 'borderline' ? 'text-amber-700' : 'text-red-700',
                                )}>
                                    {scored.overallScore}<span className="text-base font-normal text-slate-400">/100</span>
                                </p>
                            </div>

                            {scored.summary && (
                                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 leading-relaxed">
                                    {scored.summary}
                                </p>
                            )}

                            {scored.strengths?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Strengths</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {scored.strengths.map(s => (
                                            <Badge key={s} className="bg-green-50 text-green-700 text-xs">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {scored.gaps?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Skill Gaps</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {scored.gaps.map(g => (
                                            <Badge key={g} variant="outline" className="text-red-700 border-red-200 text-xs">{g}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
    const { candidates, isAnonymized, isLoading } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [validatingId, setValidatingId] = useState<string | null>(null);
    const [assessingId, setAssessingId] = useState<string | null>(null);

    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const validatingCandidate = candidates.find(c => c.id === validatingId);
    const assessingCandidate = candidates.find(c => c.id === assessingId);

    const SkeletonCard = () => (
        <div className="rounded-xl border bg-white p-0 overflow-hidden animate-pulse">
            <div className="h-16 bg-slate-100" />
            <div className="p-6 flex flex-col items-center gap-3">
                <div className="h-20 w-20 rounded-full bg-slate-200" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {validatingId && validatingCandidate && (
                <EvidenceModal
                    candidateId={validatingId}
                    candidateName={validatingCandidate.name}
                    onClose={() => setValidatingId(null)}
                />
            )}
            {assessingId && assessingCandidate && (
                <AssessmentModal
                    candidateId={assessingId}
                    candidateName={assessingCandidate.name}
                    onClose={() => setAssessingId(null)}
                />
            )}

            <PageHeader
                title="Candidates"
                description="Manage your talent pool and view detailed applicant profiles."
                action={
                    <div className="flex gap-2">
                        <Button variant="outline"><Filter size={16} className="mr-2" /> Filter</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">Add Candidate</Button>
                    </div>
                }
            />

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : filteredCandidates.map(candidate => {
                        const displayName = isAnonymized
                            ? `Candidate #${candidate.id.split('-')[1]}`
                            : candidate.name;
                        const displayEmail = isAnonymized ? '***@anonymized.com' : candidate.email;
                        const isTopK = candidate.score >= 90;

                        return (
                            <Card
                                key={candidate.id}
                                className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden"
                            >
                                <CardContent className="p-0">
                                    <div className="h-16 bg-slate-50 border-b border-slate-100 flex justify-between items-center p-2 px-4 text-xs">
                                        <div className="flex items-center gap-1">
                                            {isTopK && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                                                    <Star size={10} fill="currentColor" /> Top Match
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge className={cn(
                                            'h-6',
                                            candidate.stage === 'Decision' ? 'bg-green-100 text-green-700' :
                                            candidate.stage === 'Sourced' ? 'bg-slate-100 text-slate-700' :
                                            'bg-indigo-100 text-indigo-700',
                                        )}>
                                            {candidate.stage}
                                        </Badge>
                                    </div>

                                    <div className="p-6 pt-0 -mt-8 flex flex-col items-center text-center">
                                        <Avatar className={cn(
                                            'h-20 w-20 border-4 border-white shadow-md mb-4 group-hover:scale-105 transition-transform',
                                            isAnonymized
                                                ? 'bg-slate-900'
                                                : 'bg-gradient-to-br from-indigo-500 to-purple-500',
                                        )}>
                                            <AvatarFallback className="text-white font-bold text-xl">
                                                {isAnonymized
                                                    ? <Shield size={32} />
                                                    : candidate.name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>

                                        <h3 className="font-bold text-slate-900 text-lg">{displayName}</h3>
                                        <p className="text-sm text-indigo-600 font-medium mb-4">
                                            {candidate.experience} Years Experience
                                        </p>

                                        <div className="w-full space-y-3 pt-4 border-t border-slate-100 text-sm text-slate-600">
                                            <div className="flex items-center gap-3">
                                                <Mail size={16} className="text-slate-400" />
                                                <span className="truncate">{displayEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Phone size={16} className="text-slate-400" />
                                                <span>{isAnonymized ? '+* (***) ***-****' : candidate.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <MapPin size={16} className="text-slate-400" />
                                                <span>{candidate.location}</span>
                                            </div>
                                        </div>

                                        {/* Score & Actions */}
                                        <div className="w-full mt-6 pt-4 border-t border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col items-start leading-none">
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Match Score</span>
                                                    <span className="text-lg font-bold text-slate-900">{candidate.score}%</span>
                                                </div>
                                                <Button size="sm" variant="outline" className="text-xs">
                                                    View Full Profile
                                                </Button>
                                            </div>

                                            {/* Agent action buttons */}
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                    onClick={() => setValidatingId(candidate.id)}
                                                >
                                                    <Shield size={12} /> Validate CV
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-xs gap-1 text-slate-600 hover:bg-slate-50"
                                                    onClick={() => setAssessingId(candidate.id)}
                                                >
                                                    <ClipboardList size={12} /> Assess
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
            </div>

            {filteredCandidates.length === 0 && !isLoading && (
                <div className="py-20 text-center text-slate-400">
                    <Briefcase size={40} className="mx-auto mb-4 opacity-20" />
                    <p>No candidates match your search.</p>
                </div>
            )}
        </div>
    );
}
