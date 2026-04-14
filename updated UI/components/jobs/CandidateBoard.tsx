'use client';

import React, { DragEvent } from 'react';
import { Candidate } from '@/lib/mock-data';
import { useAppStore } from '@/lib/store'; // Make sure store exports this hook
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Mail, MessageSquare, MoreHorizontal, Shield, Lock, Unlock, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { EmailModal } from '@/components/shared/EmailModal';

const STAGES: Candidate['stage'][] = ['Sourced', 'Screened', 'Shortlisted', 'Revealed', 'Outreach', 'Interview', 'Decision'];

const STAGE_COLORS: Record<string, string> = {
    'Sourced': 'bg-slate-50 border-slate-100 text-slate-600',
    'Screened': 'bg-blue-50 border-blue-100 text-blue-700',
    'Shortlisted': 'bg-indigo-50 border-indigo-100 text-indigo-700',
    'Revealed': 'bg-amber-50 border-amber-100 text-amber-700',
    'Outreach': 'bg-purple-50 border-purple-100 text-purple-700',
    'Interview': 'bg-pink-50 border-pink-100 text-pink-700',
    'Decision': 'bg-green-50 border-green-100 text-green-700',
};

export const CandidateBoard = ({ jobId }: { jobId: string }) => {
    const { candidates, updateCandidateStatus, currentUser, isAnonymized } = useAppStore();
    const [emailConfig, setEmailConfig] = React.useState<{
        isOpen: boolean;
        candidate: Candidate | null;
        targetStage: Candidate['stage'] | null;
    }>({
        isOpen: false,
        candidate: null,
        targetStage: null
    });

    // Filter candidates for this job (mock logic: if we had jobId in candidate, we'd filter here. 
    // For now, I'll filter by a mock ID or just show all for demo purposes, 
    // but ideally MOCK_data updates to include jobId. I'll assume all are for this job for the demo)
    // const jobCandidates = candidates.filter(c => c.jobId === jobId); 
    const jobCandidates = candidates;

    const onDragStart = (e: DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: DragEvent, stage: Candidate['stage']) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            const candidate = candidates.find(c => c.id === id);
            if (candidate && candidate.stage !== stage) {
                // Open email modal before updating status
                setEmailConfig({
                    isOpen: true,
                    candidate,
                    targetStage: stage
                });
            }
        }
    };

    const confirmTransition = () => {
        if (emailConfig.candidate && emailConfig.targetStage) {
            updateCandidateStatus(emailConfig.candidate.id, emailConfig.targetStage);
            setEmailConfig({ isOpen: false, candidate: null, targetStage: null });
        }
    };

    return (
        <>
            <div className="flex h-[calc(100vh-250px)] gap-4 overflow-x-auto pb-4">
                {STAGES.map((stage) => {
                    const stageCandidates = jobCandidates.filter(c => c.stage === stage);

                    return (
                        <div
                            key={stage}
                            className={cn(
                                "flex-shrink-0 w-80 rounded-lg flex flex-col bg-slate-100/50 border border-slate-200",
                                "transition-colors duration-200"
                            )}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, stage)}
                        >
                            {/* Column Header */}
                            <div className="p-3">
                                <div className={cn("flex items-center justify-between px-3 py-2 rounded-md font-semibold text-sm", STAGE_COLORS[stage])}>
                                    <span>{stage}</span>
                                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                                        {stageCandidates.length}
                                    </span>
                                </div>
                            </div>

                            {/* Drop Zone */}
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]">
                                {stageCandidates.map((candidate) => {
                                    const isEarlyStage = ['Sourced', 'Screened', 'Shortlisted'].includes(candidate.stage);
                                    const shouldMask = isAnonymized || (isEarlyStage && !candidate.isIdentityRevealed);

                                    const displayName = shouldMask ? `Candidate #${candidate.id.split('-')[1]}` : candidate.name;
                                    const displayEmail = shouldMask ? '***@anonymized.com' : candidate.email;

                                    return (
                                        <div
                                            key={candidate.id}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, candidate.id)}
                                            className="cursor-grab active:cursor-grabbing group"
                                        >
                                            <Card className="hover:shadow-md transition-shadow duration-200 border-none shadow-sm">
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className={cn(
                                                                "h-8 w-8 border",
                                                                shouldMask ? "bg-slate-900 border-slate-700" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                                                            )}>
                                                                <AvatarFallback className="font-bold text-xs text-white">
                                                                    {shouldMask ? <Shield size={12} /> : candidate.name.split(' ').map(n => n[0]).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</h4>
                                                                <span className="text-[10px] text-slate-500">{displayEmail}</span>
                                                            </div>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 -mr-2 text-slate-400">
                                                            <MoreHorizontal size={14} />
                                                        </Button>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] h-5 px-1.5 font-normal",
                                                            candidate.score >= 90 ? "bg-green-50 text-green-700 border-green-200" :
                                                                candidate.score >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                    "bg-slate-50 text-slate-600"
                                                        )}>
                                                            Match: {candidate.score}%
                                                        </Badge>

                                                        <div className="flex gap-1">
                                                            <div className="p-1 rounded bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer" title="Email">
                                                                <Mail size={12} />
                                                            </div>
                                                            <div className="p-1 rounded bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer" title="Schedule">
                                                                <Clock size={12} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )
                                })}
                                {stageCandidates.length === 0 && (
                                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg m-2">
                                        <p className="text-xs text-slate-400">Drop here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {emailConfig.candidate && emailConfig.targetStage && (
                <EmailModal
                    isOpen={emailConfig.isOpen}
                    onClose={() => setEmailConfig({ isOpen: false, candidate: null, targetStage: null })}
                    candidate={emailConfig.candidate}
                    sender={currentUser}
                    type={emailConfig.targetStage === 'Decision' ? 'Offer' : 'Update'}
                    onSend={confirmTransition}
                />
            )}
        </>
    );
};
