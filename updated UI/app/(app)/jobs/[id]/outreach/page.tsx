'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Mail, Send, Clock, CheckCircle2, AlertCircle, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    fetchOutreachForJob,
    fetchJobCandidates,
    createOutreach,
    OutreachMessage,
    JobCandidate,
} from '@/lib/api/outreach';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    queued:  { label: 'Queued',  className: 'bg-slate-100 text-slate-600',   icon: <Clock size={12} /> },
    sent:    { label: 'Sent',    className: 'bg-blue-50 text-blue-700',      icon: <Send size={12} /> },
    opened:  { label: 'Opened',  className: 'bg-green-50 text-green-700',    icon: <CheckCircle2 size={12} /> },
    replied: { label: 'Replied', className: 'bg-indigo-50 text-indigo-700',  icon: <CheckCircle2 size={12} /> },
    failed:  { label: 'Failed',  className: 'bg-red-50 text-red-700',        icon: <AlertCircle size={12} /> },
    draft:   { label: 'Draft',   className: 'bg-amber-50 text-amber-700',    icon: <Clock size={12} /> },
};

const OUTREACH_TEMPLATES = {
    email: {
        subject: 'Exciting Opportunity — We Think You\'d Be a Great Fit',
        body: `Hi [Name],

I came across your profile and was impressed by your background. We currently have an opening that aligns well with your experience, and I'd love to connect.

Would you be open to a quick 15-minute call this week to learn more?

Looking forward to hearing from you.

Best regards,
[Recruiter Name]`,
    },
    linkedin: {
        subject: '',
        body: `Hi [Name], I came across your profile and think you'd be a great fit for a role we're hiring for. Would love to connect and share more details!`,
    },
};

export default function JobOutreachPage() {
    const params = useParams();
    const jobId = params?.id as string;

    const { data: candidates = [], isLoading: loadingCandidates } = useSWR(
        jobId ? `job-candidates-${jobId}` : null,
        () => fetchJobCandidates(jobId),
    );

    const { data: messages = [], isLoading: loadingMessages, mutate: revalidateMessages } = useSWR(
        jobId ? `outreach-${jobId}` : null,
        () => fetchOutreachForJob(jobId),
    );

    const [selectedCandidate, setSelectedCandidate] = useState<JobCandidate | null>(null);
    const [channel, setChannel] = useState<'email' | 'linkedin'>('email');
    const [subject, setSubject] = useState(OUTREACH_TEMPLATES.email.subject);
    const [body, setBody] = useState(OUTREACH_TEMPLATES.email.body);
    const [isSending, setIsSending] = useState(false);
    const [sentNotice, setSentNotice] = useState<string | null>(null);

    const handleChannelChange = (ch: 'email' | 'linkedin') => {
        setChannel(ch);
        setSubject(OUTREACH_TEMPLATES[ch].subject);
        setBody(OUTREACH_TEMPLATES[ch].body);
    };

    const sentCandidateIds = new Set(messages.map(m => m.candidate_id));

    const handleSend = async () => {
        if (!selectedCandidate || !jobId) return;
        setIsSending(true);
        setSentNotice(null);
        try {
            await createOutreach({
                candidate_id: selectedCandidate.candidate_id,
                job_id: jobId,
                channel,
                message_subject: subject || undefined,
                message_body: body || undefined,
            });
            await revalidateMessages();
            setSentNotice(`Outreach queued for ${selectedCandidate.full_name}. Delivery requires an active email/LinkedIn integration.`);
            setSelectedCandidate(null);
        } finally {
            setIsSending(false);
        }
    };

    const isLoading = loadingCandidates || loadingMessages;

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading outreach data...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Candidate Outreach"
                description="Queue personalised outreach messages to shortlisted candidates."
            />

            {sentNotice && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" />
                    {sentNotice}
                </div>
            )}

            <div className="grid lg:grid-cols-5 gap-8">
                {/* Candidate List */}
                <div className="lg:col-span-2 space-y-3">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
                        Candidates ({candidates.length})
                    </h3>

                    {candidates.length === 0 ? (
                        <div className="text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-lg p-6 text-center">
                            No candidates found for this job.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {candidates.map(c => {
                                const alreadySent = sentCandidateIds.has(c.candidate_id);
                                const isSelected = selectedCandidate?.candidate_id === c.candidate_id;
                                return (
                                    <Card
                                        key={c.candidate_id}
                                        className={cn(
                                            'cursor-pointer transition-all border-l-4',
                                            isSelected
                                                ? 'border-l-indigo-600 bg-indigo-50 shadow-md'
                                                : alreadySent
                                                ? 'border-l-green-400 bg-green-50/40'
                                                : 'border-l-transparent hover:bg-slate-50',
                                        )}
                                        onClick={() => !alreadySent && setSelectedCandidate(c)}
                                    >
                                        <CardContent className="p-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar className="h-9 w-9 shrink-0">
                                                    <AvatarFallback className={cn('text-xs font-bold', isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200')}>
                                                        {c.full_name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{c.full_name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{c.current_title ?? c.stage_code}</p>
                                                </div>
                                            </div>
                                            {alreadySent ? (
                                                <Badge className="bg-green-100 text-green-700 text-[10px] shrink-0">Sent</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{c.stage_code}</Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Compose Panel */}
                <div className="lg:col-span-3">
                    {!selectedCandidate ? (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50 text-slate-400 p-12 text-center">
                            <div>
                                <Mail size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Select a candidate from the list to compose an outreach message.</p>
                                {candidates.length === 0 && (
                                    <p className="text-xs text-slate-400 mt-2">Candidates appear here once applications are linked to this job.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span>Compose Message</span>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={channel === 'email' ? 'default' : 'outline'}
                                            className="gap-1.5 text-xs"
                                            onClick={() => handleChannelChange('email')}
                                        >
                                            <Mail size={13} /> Email
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={channel === 'linkedin' ? 'default' : 'outline'}
                                            className="gap-1.5 text-xs"
                                            onClick={() => handleChannelChange('linkedin')}
                                        >
                                            <Linkedin size={13} /> LinkedIn
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                                    <span className="text-slate-500 shrink-0">To:</span>
                                    <span className="font-medium text-slate-800">{selectedCandidate.full_name}</span>
                                    {selectedCandidate.email && (
                                        <span className="text-slate-400 text-xs">({selectedCandidate.email})</span>
                                    )}
                                </div>

                                {channel === 'email' && (
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Subject line"
                                        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                )}

                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={10}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                                    placeholder="Write your message here..."
                                />

                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Outreach is queued for delivery. Actual sending requires an active email or LinkedIn integration.
                                    </p>
                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(null)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                            onClick={handleSend}
                                            disabled={isSending || !body.trim()}
                                        >
                                            <Send size={14} /> {isSending ? 'Queuing…' : 'Queue Message'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Outreach History */}
                    {messages.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
                                Outreach History ({messages.length})
                            </h3>
                            <div className="space-y-2">
                                {messages.map((m: OutreachMessage) => {
                                    const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.queued;
                                    return (
                                        <div key={m.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100 bg-white text-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarFallback className="text-[10px] bg-slate-100">
                                                        {(m.candidate_name ?? '??').substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <span className="font-medium text-slate-800">{m.candidate_name ?? m.candidate_id}</span>
                                                    <span className="text-slate-400 ml-2 text-xs capitalize">{m.channel}</span>
                                                    {m.message_subject && (
                                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{m.message_subject}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge className={cn('gap-1 text-[11px]', cfg.className)}>
                                                {cfg.icon} {cfg.label}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
