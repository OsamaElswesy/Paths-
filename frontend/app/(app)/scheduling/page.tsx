'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
    Calendar as CalendarIcon, Clock, Video, MoreHorizontal,
    ChevronLeft, ChevronRight, Plus, X, Loader2,
} from 'lucide-react';
import {
    fetchInterviews,
    scheduleInterview,
    Interview,
    CreateInterviewRequest,
} from '@/lib/api/interviews';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { useAppStore } from '@/lib/store';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

// ── Schedule Interview Modal ───────────────────────────────────────────────────

function ScheduleModal({
    onClose,
    onScheduled,
}: {
    onClose: () => void;
    onScheduled: () => void;
}) {
    const { candidates, jobs } = useAppStore();
    const [form, setForm] = useState<CreateInterviewRequest>({
        candidate_id: '',
        job_id: '',
        interview_type: 'screening',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '10:00 AM',
        duration_minutes: 60,
        meeting_link: '',
        interviewers: [],
    });
    const [interviewerInput, setInterviewerInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addInterviewer = () => {
        const name = interviewerInput.trim();
        if (name && !(form.interviewers ?? []).includes(name)) {
            setForm(f => ({ ...f, interviewers: [...(f.interviewers ?? []), name] }));
            setInterviewerInput('');
        }
    };

    const removeInterviewer = (name: string) => {
        setForm(f => ({ ...f, interviewers: (f.interviewers ?? []).filter(i => i !== name) }));
    };

    const handleSubmit = async () => {
        if (!form.candidate_id || !form.job_id) {
            setError('Please select a candidate and a job.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await scheduleInterview(form);
            onScheduled();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Failed to schedule interview.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-lg">Schedule Interview</CardTitle>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Candidate */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Candidate</label>
                        <select
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            value={form.candidate_id}
                            onChange={e => setForm(f => ({ ...f, candidate_id: e.target.value }))}
                        >
                            <option value="">Select candidate…</option>
                            {candidates.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Job */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job</label>
                        <select
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            value={form.job_id}
                            onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
                        >
                            <option value="">Select job…</option>
                            {jobs.map(j => (
                                <option key={j.id} value={j.id}>{j.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type + Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</label>
                            <select
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                value={form.interview_type}
                                onChange={e => setForm(f => ({ ...f, interview_type: e.target.value as any }))}
                            >
                                <option value="screening">Screening</option>
                                <option value="technical">Technical</option>
                                <option value="behavioral">Behavioral</option>
                                <option value="final">Final</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Duration (min)</label>
                            <Input
                                type="number"
                                min={15}
                                max={240}
                                value={form.duration_minutes}
                                onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</label>
                            <Input
                                type="date"
                                value={form.scheduled_date}
                                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Time</label>
                            <Input
                                placeholder="10:00 AM"
                                value={form.scheduled_time}
                                onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Meeting Link */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Meeting Link (optional)</label>
                        <Input
                            placeholder="https://meet.google.com/..."
                            value={form.meeting_link ?? ''}
                            onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))}
                        />
                    </div>

                    {/* Interviewers */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Interviewers</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add interviewer name…"
                                value={interviewerInput}
                                onChange={e => setInterviewerInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addInterviewer()}
                            />
                            <Button variant="outline" size="sm" onClick={addInterviewer}>Add</Button>
                        </div>
                        {(form.interviewers ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {(form.interviewers ?? []).map(name => (
                                    <Badge key={name} variant="secondary" className="gap-1 text-xs">
                                        {name}
                                        <button onClick={() => removeInterviewer(name)} className="hover:text-red-500">
                                            <X size={10} />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Scheduling…</> : 'Confirm'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth()); // 0-indexed
    const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);
    const [showModal, setShowModal] = useState(false);

    const { data: interviews = [], isLoading, mutate } = useSWR('interviews', fetchInterviews);

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading scheduling data...</div>;
    }

    const interviewsByDate = interviews.reduce((acc, curr) => {
        const date = curr.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr);
        return acc;
    }, {} as Record<string, Interview[]>);

    const filteredInterviews = [...(interviewsByDate[selectedDate] ?? [])].sort(
        (a, b) => a.time.localeCompare(b.time),
    );

    const daysInMonth = getDaysInMonth(year, month);

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const handleDateClick = (day: number) => {
        const m = (month + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        setSelectedDate(`${year}-${m}-${d}`);
    };

    const selectedLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    return (
        <div className="space-y-6">
            {showModal && (
                <ScheduleModal
                    onClose={() => setShowModal(false)}
                    onScheduled={() => mutate()}
                />
            )}

            <PageHeader
                title="Scheduling"
                description="Manage your interview calendar and availability."
                action={
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <CalendarIcon size={16} className="mr-2" /> Sync Calendar
                        </Button>
                        <Button onClick={() => setShowModal(true)}>
                            <Plus size={16} className="mr-2" /> Schedule Interview
                        </Button>
                    </div>
                }
            />

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Mini Calendar Sidebar */}
                <div className="hidden lg:block space-y-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-semibold text-sm">
                                    {MONTH_NAMES[month]} {year}
                                </span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevMonth}>
                                        <ChevronLeft size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 mb-2">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span>
                                <span>Th</span><span>Fr</span><span>Sa</span>
                            </div>
                            <div className="grid grid-cols-7 text-center gap-y-2 text-sm">
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const m = (month + 1).toString().padStart(2, '0');
                                    const d = day.toString().padStart(2, '0');
                                    const dateStr = `${year}-${m}-${d}`;
                                    const hasInterviews = !!interviewsByDate[dateStr];
                                    const isSelected = selectedDate === dateStr;
                                    const isToday = dateStr === today.toISOString().split('T')[0];

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleDateClick(day)}
                                            className={cn(
                                                'h-7 w-7 flex items-center justify-center rounded-full cursor-pointer transition-colors relative',
                                                isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100',
                                                !isSelected && isToday && 'font-bold text-indigo-600 ring-1 ring-indigo-300',
                                                !isSelected && !isToday && hasInterviews && 'font-semibold text-indigo-600',
                                            )}
                                        >
                                            {day}
                                            {!isSelected && hasInterviews && (
                                                <span className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardContent className="p-4">
                            <h4 className="font-semibold text-indigo-900 mb-2 text-sm">This month</h4>
                            <p className="text-xs text-indigo-700 mb-3">
                                {interviews.length} interview{interviews.length !== 1 ? 's' : ''} scheduled.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                onClick={() => setShowModal(true)}
                            >
                                + New Interview
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Agenda View */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-lg font-bold text-slate-900">{selectedLabel}</h3>
                        <Badge variant="outline" className="text-xs">
                            {filteredInterviews.length} Session{filteredInterviews.length !== 1 ? 's' : ''}
                        </Badge>
                    </div>

                    {filteredInterviews.length > 0 ? (
                        <div
                            className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                            key={selectedDate}
                        >
                            {filteredInterviews.map(interview => (
                                <Card
                                    key={interview.id}
                                    className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex flex-col items-center min-w-[60px] p-2 bg-slate-50 rounded-lg text-slate-600">
                                                <span className="text-xs font-medium uppercase">
                                                    {interview.time.split(' ')[1]}
                                                </span>
                                                <span className="text-lg font-bold">
                                                    {interview.time.split(' ')[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{interview.candidateName}</h4>
                                                <p className="text-sm text-slate-500">
                                                    {interview.type} Interview • {interview.jobTitle}
                                                </p>
                                                {interview.interviewers.length > 0 && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="flex -space-x-2">
                                                            {interview.interviewers.map((name, i) => (
                                                                <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                                                    <AvatarFallback className="text-[9px] bg-slate-200">
                                                                        {name[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-slate-400">
                                                            {interview.interviewers.join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs',
                                                    interview.status === 'Scheduled' && 'bg-blue-50 text-blue-700 border-blue-200',
                                                    interview.status === 'Completed' && 'bg-green-50 text-green-700 border-green-200',
                                                    interview.status === 'Needs Scoring' && 'bg-amber-50 text-amber-700 border-amber-200',
                                                    interview.status === 'Cancelled' && 'bg-slate-50 text-slate-400',
                                                )}
                                            >
                                                {interview.status}
                                            </Badge>
                                            {interview.meetingLink && (
                                                <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                                        <Video size={14} /> Join
                                                    </Button>
                                                </a>
                                            )}
                                            <Button variant="ghost" size="icon" className="text-slate-400">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                            <CalendarIcon size={40} className="mb-4 opacity-20" />
                            <p>No interviews scheduled for this date.</p>
                            <Button
                                variant="link"
                                className="text-indigo-600 mt-2"
                                onClick={() => setShowModal(true)}
                            >
                                Schedule one now
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
