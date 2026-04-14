'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    fetchInterviews,
    scoreInterview,
    evaluateHRInterview,
    evaluateTechnicalInterview,
    Interview,
} from '@/lib/api/interviews';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
    ClipboardList, Video, CheckCircle2, AlertCircle,
    Brain, X, Loader2, Check, ChevronDown, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkInterviewQuality, InterviewQCResult, QualityFlag } from '@/lib/api/interview_qc';

// ── Score Modal ────────────────────────────────────────────────────────────────

function ScoreModal({
    interview,
    onClose,
    onScored,
}: {
    interview: Interview;
    onClose: () => void;
    onScored: () => void;
}) {
    const isHR = interview.type === 'Screening' || interview.type === 'Behavioral';
    const [mode, setMode] = useState<'agent' | 'manual'>('agent');
    const [notes, setNotes] = useState('');
    const [manualScore, setManualScore] = useState(70);
    const [manualRec, setManualRec] = useState<'proceed' | 'hold' | 'reject'>('proceed');
    const [manualFeedback, setManualFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAgentEvaluate = async () => {
        if (notes.trim().length < 30) {
            setError('Please provide at least 30 characters of interview notes for the AI to evaluate.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const fn = isHR ? evaluateHRInterview : evaluateTechnicalInterview;
            const res = await fn(interview.id, { interview_notes: notes });
            setResult(res);
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Evaluation failed — ensure the backend is running.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualScore = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            await scoreInterview(interview.id, {
                overall_score: manualScore,
                feedback_text: manualFeedback,
                recommendation: manualRec,
                scored_by: 'recruiter',
            });
            onScored();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Score submission failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-3 sticky top-0 bg-white border-b z-10">
                    <div>
                        <CardTitle className="text-lg">Submit Evaluation</CardTitle>
                        <CardDescription className="text-sm">
                            {interview.candidateName} — {interview.type} Interview
                        </CardDescription>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                    {/* Mode toggle */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('agent')}
                            className={cn(
                                'flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2',
                                mode === 'agent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <Brain size={15} /> AI Evaluation
                        </button>
                        <button
                            onClick={() => setMode('manual')}
                            className={cn(
                                'flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2',
                                mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <ClipboardList size={15} /> Manual Score
                        </button>
                    </div>

                    {mode === 'agent' && !result && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                                <strong>
                                    {isHR ? 'HR Interview Agent' : 'Technical Interview Agent'}
                                </strong>{' '}
                                will evaluate your notes using a rubric-based scoring model across{' '}
                                {isHR
                                    ? 'Communication, Culture Fit, Motivation, and Clarity'
                                    : 'Technical Depth, Problem Solving, Code Quality, Domain Knowledge, and Skill Coverage'
                                }.
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Interview Notes *
                                </label>
                                <textarea
                                    className="w-full h-36 rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={
                                        isHR
                                            ? 'e.g. Candidate was articulate and enthusiastic. Demonstrated strong collaborative values. Answered questions with clear, specific examples using the STAR method…'
                                            : 'e.g. Candidate showed deep understanding of system design. Explained database indexing clearly. Struggled slightly with async patterns but had solid problem-solving approach…'
                                    }
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                                <p className="text-[11px] text-slate-400">{notes.length} chars (min 30)</p>
                            </div>

                            {error && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    onClick={handleAgentEvaluate}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? <><Loader2 size={14} className="animate-spin" /> Evaluating…</>
                                        : <><Brain size={14} /> Run AI Evaluation</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Agent result display */}
                    {mode === 'agent' && result && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl font-black text-indigo-600">
                                        {result.overallScore ?? 0}
                                        <span className="text-base font-normal text-slate-400">/100</span>
                                    </div>
                                    <Badge
                                        className={cn(
                                            'capitalize',
                                            result.recommendation === 'proceed' && 'bg-green-100 text-green-700',
                                            result.recommendation === 'hold' && 'bg-amber-100 text-amber-700',
                                            result.recommendation === 'reject' && 'bg-red-100 text-red-700',
                                        )}
                                    >
                                        {result.recommendation}
                                    </Badge>
                                </div>
                                <Badge variant="outline" className="text-xs bg-slate-50 capitalize">
                                    {result.scoredBy?.replace('_', ' ')}
                                </Badge>
                            </div>

                            {/* Dimension scores */}
                            {result.dimensionScores && (
                                <div className="space-y-2">
                                    {Object.entries(result.dimensionScores as Record<string, number>).map(([dim, score]) => (
                                        <div key={dim} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-medium text-slate-600 capitalize">
                                                    {dim.replace(/_/g, ' ')}
                                                </span>
                                                <span className="font-bold text-slate-800">{score}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        score >= 75 ? 'bg-green-500' : score >= 55 ? 'bg-indigo-500' : 'bg-amber-400',
                                                    )}
                                                    style={{ width: `${score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {result.strengths?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Strengths</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.strengths.map((s: string) => (
                                            <Badge key={s} variant="secondary" className="text-xs bg-green-50 text-green-700">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.concerns?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Concerns</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.concerns.map((c: string) => (
                                            <Badge key={c} variant="outline" className="text-xs text-amber-700 border-amber-200">{c}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.feedbackText && (
                                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-3 leading-relaxed">
                                    {result.feedbackText}
                                </p>
                            )}

                            {result.data_warnings?.length > 0 && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2 space-y-0.5">
                                    {result.data_warnings.map((w: string, i: number) => (
                                        <p key={i}>• {w}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>
                                    Re-evaluate
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                                    onClick={() => { onScored(); onClose(); }}
                                >
                                    <Check size={14} /> Accept & Close
                                </Button>
                            </div>
                        </div>
                    )}

                    {mode === 'manual' && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Overall Score: {manualScore}/100
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={manualScore}
                                    onChange={e => setManualScore(Number(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>0 — Reject</span>
                                    <span>50 — Hold</span>
                                    <span>100 — Strong Hire</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recommendation</label>
                                <div className="flex gap-2">
                                    {(['proceed', 'hold', 'reject'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setManualRec(r)}
                                            className={cn(
                                                'flex-1 py-2 text-xs font-semibold rounded-lg border transition-all capitalize',
                                                manualRec === r
                                                    ? r === 'proceed' ? 'bg-green-100 text-green-700 border-green-300'
                                                        : r === 'hold' ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                            : 'bg-red-100 text-red-700 border-red-300'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50',
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Feedback Notes</label>
                                <textarea
                                    className="w-full h-24 rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional: add evaluation notes..."
                                    value={manualFeedback}
                                    onChange={e => setManualFeedback(e.target.value)}
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                                    onClick={handleManualScore}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                                        : <><Check size={14} /> Submit Score</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Interview QC Modal ────────────────────────────────────────────────────────

function QCModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
    const [result, setResult] = useState<InterviewQCResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkInterviewQuality(sessionId)
            .then(setResult)
            .catch((err: any) => setError(err?.response?.data?.detail ?? 'QC check failed.'))
            .finally(() => setIsLoading(false));
    }, [sessionId]);

    const severityConfig: Record<string, { bg: string; text: string; border: string }> = {
        critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        warning:  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        info:     { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    };

    const levelColor: Record<string, string> = {
        excellent: 'text-green-600',
        good:      'text-indigo-600',
        adequate:  'text-amber-500',
        poor:      'text-red-600',
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-3 sticky top-0 bg-white border-b z-10">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldCheck size={18} className="text-indigo-500" /> Interview Quality Check
                        </CardTitle>
                        <CardDescription className="text-sm">
                            {result?.candidate_name ?? 'Loading...'} — {result?.interview_type ?? ''}
                        </CardDescription>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </CardHeader>

                <CardContent className="pt-5 space-y-5">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 size={32} className="animate-spin text-indigo-400" />
                            <p className="text-sm text-slate-500">Analysing interview notes…</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
                            {error}
                        </div>
                    )}

                    {result && !isLoading && (
                        <>
                            {/* Score header */}
                            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Quality Score</p>
                                    <p className={cn('text-4xl font-black mt-1', levelColor[result.quality_level] ?? 'text-slate-700')}>
                                        {result.quality_score}
                                        <span className="text-sm font-normal text-slate-400">/100</span>
                                    </p>
                                    <p className={cn('text-sm font-semibold capitalize mt-0.5', levelColor[result.quality_level])}>
                                        {result.quality_level}
                                    </p>
                                </div>
                                <div className="text-right text-sm text-slate-500 space-y-0.5">
                                    <p><span className="font-medium text-slate-700">{result.notes_word_count}</span> words in notes</p>
                                    <p><span className="font-medium text-slate-700">{result.evidence_markers_found.length}</span> evidence markers</p>
                                    <p><span className="font-medium text-slate-700">{result.quality_flags.length}</span> flag(s)</p>
                                </div>
                            </div>

                            {/* Bias language */}
                            {result.bias_language_detected.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                                        Bias Language Detected
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.bias_language_detected.map(phrase => (
                                            <Badge key={phrase} className="bg-red-100 text-red-700 text-xs border-red-200">
                                                "{phrase}"
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quality flags */}
                            {result.quality_flags.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quality Flags</p>
                                    {result.quality_flags.map((flag: QualityFlag, i: number) => {
                                        const cfg = severityConfig[flag.severity] ?? severityConfig.info;
                                        return (
                                            <div key={i} className={cn('rounded-lg border p-3 space-y-1', cfg.bg, cfg.border)}>
                                                <div className="flex items-center justify-between">
                                                    <p className={cn('text-xs font-semibold capitalize', cfg.text)}>
                                                        {flag.check.replace(/_/g, ' ')}
                                                    </p>
                                                    <Badge className={cn('text-[10px]', cfg.bg, cfg.text, cfg.border)}>
                                                        {flag.severity}
                                                    </Badge>
                                                </div>
                                                <p className={cn('text-xs leading-snug', cfg.text)}>{flag.message}</p>
                                                {flag.recommendation && (
                                                    <p className="text-[11px] text-slate-500 italic">{flag.recommendation}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Summary */}
                            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 leading-relaxed">
                                {result.summary}
                            </p>

                            {/* Evidence markers */}
                            {result.evidence_markers_found.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1.5">STAR Evidence Markers Found</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.evidence_markers_found.slice(0, 8).map(m => (
                                            <Badge key={m} variant="secondary" className="text-xs bg-green-50 text-green-700">
                                                {m}
                                            </Badge>
                                        ))}
                                        {result.evidence_markers_found.length > 8 && (
                                            <Badge variant="outline" className="text-xs text-slate-500">
                                                +{result.evidence_markers_found.length - 8} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
    const { data: interviews = [], isLoading, mutate } = useSWR('interviews', fetchInterviews);
    const [scoringInterview, setScoringInterview] = useState<Interview | null>(null);
    const [qcSessionId, setQcSessionId] = useState<string | null>(null);

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading interview schedules...</div>;
    }

    const needsScoring = interviews.filter((i: Interview) => i.status === 'Needs Scoring');
    const upcoming = interviews.filter((i: Interview) => i.status === 'Scheduled');
    const completed = interviews.filter((i: Interview) => i.status === 'Completed');

    return (
        <div className="space-y-10">
            {scoringInterview && (
                <ScoreModal
                    interview={scoringInterview}
                    onClose={() => setScoringInterview(null)}
                    onScored={() => { mutate(); setScoringInterview(null); }}
                />
            )}
            {qcSessionId && (
                <QCModal sessionId={qcSessionId} onClose={() => setQcSessionId(null)} />
            )}

            <PageHeader title="Interviews" description="Manage interview sessions and submit evaluations." />

            {/* Action Required Section */}
            {needsScoring.length > 0 && (
                <section className="space-y-4 animate-in slide-in-from-left-4 duration-500">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-500" /> Action Required
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {needsScoring.map(interview => (
                            <Card key={interview.id} className="border-amber-200 bg-amber-50/30">
                                <CardContent className="p-5 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-slate-900">{interview.candidateName}</h3>
                                        <p className="text-sm text-slate-600">{interview.type} • {interview.date}</p>
                                        <p className="text-xs text-amber-700 font-medium pt-2">
                                            Feedback pending — use AI or manual scoring
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                                        onClick={() => setScoringInterview(interview)}
                                    >
                                        <Brain size={13} /> Submit Score
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Section */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Video size={20} className="text-indigo-500" /> Upcoming Sessions
                    <Badge variant="outline" className="text-xs font-normal ml-1">{upcoming.length}</Badge>
                </h2>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-400 pl-1">No upcoming sessions scheduled.</p>
                ) : (
                    <div className="rounded-md border bg-white overflow-hidden">
                        {upcoming.map((interview, i) => (
                            <div
                                key={interview.id}
                                className={cn(
                                    'p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors',
                                    i !== upcoming.length - 1 && 'border-b',
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded bg-indigo-50 flex flex-col items-center justify-center text-indigo-700 font-medium text-xs">
                                        <span className="text-lg font-bold leading-none">
                                            {interview.date.split('-')[2]}
                                        </span>
                                        <span className="text-[10px] uppercase">
                                            {new Date(interview.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{interview.candidateName}</h4>
                                        <p className="text-sm text-slate-500">
                                            {interview.jobTitle} • {interview.time} • {interview.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                                        onClick={() => setScoringInterview(interview)}
                                    >
                                        <ClipboardList size={14} /> Score Early
                                    </Button>
                                    {interview.meetingLink && (
                                        <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                                            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                                                <Video size={14} /> Join
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Completed Section */}
            <section className="space-y-4 opacity-80">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-slate-400" /> Completed
                    <Badge variant="outline" className="text-xs font-normal ml-1">{completed.length}</Badge>
                </h2>
                {completed.length === 0 ? (
                    <p className="text-sm text-slate-400 pl-1">No completed interviews yet.</p>
                ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                        {completed.map(interview => (
                            <div
                                key={interview.id}
                                className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm space-y-3"
                            >
                                <div className="font-medium text-slate-700">{interview.candidateName}</div>
                                <div className="text-slate-500">{interview.type} • {interview.date}</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        <CheckCircle2 size={10} className="mr-1" /> Score Submitted
                                    </Badge>
                                    <button
                                        onClick={() => setQcSessionId(interview.id)}
                                        className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                        <ShieldCheck size={12} /> QC Check
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
