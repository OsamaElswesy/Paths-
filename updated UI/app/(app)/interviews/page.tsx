'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchInterviews, Interview } from '@/lib/api/interviews';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ClipboardList, Video, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InterviewsPage() {
    const { data: interviews = [], isLoading } = useSWR('interviews', fetchInterviews);

    if (isLoading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading interview schedules...</div>;

    const needsScoring = interviews.filter((i: Interview) => i.status === 'Needs Scoring');
    const upcoming = interviews.filter((i: Interview) => i.status === 'Scheduled');
    const completed = interviews.filter((i: Interview) => i.status === 'Completed');

    return (
        <div className="space-y-10">
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
                                        <p className="text-xs text-amber-700 font-medium pt-2">Feedback pending</p>
                                    </div>
                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                                        Submit Score
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
                </h2>
                <div className="rounded-md border bg-white overflow-hidden">
                    {upcoming.map((interview, i) => (
                        <div key={interview.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${i !== upcoming.length - 1 ? 'border-b' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded bg-indigo-50 flex flex-col items-center justify-center text-indigo-700 font-medium text-xs">
                                    <span className="text-lg font-bold leading-none">{interview.date.split('-')[2]}</span>
                                    <span>Oct</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">{interview.candidateName}</h4>
                                    <p className="text-sm text-slate-500">{interview.jobTitle} • {interview.time}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm">View Profile</Button>
                                <Button size="sm" className="gap-2"><ClipboardList size={14} /> Prep Sheet</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Completed Section (Collapsed/Simple) */}
            <section className="space-y-4 opacity-75">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-slate-400" /> Completed
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {completed.map(interview => (
                        <div key={interview.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                            <div className="font-medium text-slate-700">{interview.candidateName}</div>
                            <div className="text-slate-500">{interview.type} • {interview.date}</div>
                            <Badge variant="outline" className="mt-2 text-xs">Score Submitted</Badge>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
