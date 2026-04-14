'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Calendar as CalendarIcon, Clock, Video, MoreHorizontal, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { fetchInterviews, Interview } from '@/lib/api/interviews';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';

export default function SchedulingPage() {
    const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().split('T')[0]); // Default to today
    const { data: interviews = [], isLoading } = useSWR('interviews', fetchInterviews);

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading scheduling data...</div>;
    }

    // Convert dates to easier string format for comparison
    const interviewsByDate = interviews.reduce((acc, curr) => {
        const date = curr.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr);
        return acc;
    }, {} as Record<string, Interview[]>);

    const filteredInterviews = interviewsByDate[selectedDate] || [];

    // Sort by time
    filteredInterviews.sort((a, b) => a.time.localeCompare(b.time));

    // Calendar Generation (Simple current month)
    const daysInMonth = 31;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    const handleDateClick = (day: number) => {
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dayStr}`;
        setSelectedDate(dateStr);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Scheduling"
                description="Manage your interview calendar and availability."
                action={
                    <div className="flex gap-2">
                        <Button variant="outline"><CalendarIcon size={16} className="mr-2" /> Sync Calendar</Button>
                        <Button><Plus size={16} className="mr-2" /> Schedule Interview</Button>
                    </div>
                }
            />

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Mini Calendar Sidebar */}
                <div className="hidden lg:block space-y-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-semibold text-sm">October {currentYear}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronLeft size={14} /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight size={14} /></Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 mb-2">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                            </div>
                            <div className="grid grid-cols-7 text-center gap-y-2 text-sm">
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                    const hasInterviews = !!interviewsByDate[dateStr];
                                    const isSelected = selectedDate === dateStr;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleDateClick(day)}
                                            className={cn(
                                                "h-7 w-7 flex items-center justify-center rounded-full cursor-pointer transition-colors relative",
                                                isSelected ? "bg-indigo-600 text-white shadow-md" : "hover:bg-slate-100",
                                                !isSelected && hasInterviews && "font-semibold text-indigo-600"
                                            )}
                                        >
                                            {day}
                                            {!isSelected && hasInterviews && (
                                                <span className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardContent className="p-4">
                            <h4 className="font-semibold text-indigo-900 mb-2 text-sm">Upcoming availability</h4>
                            <p className="text-xs text-indigo-700 mb-3">You have 12 hours open for interviews this week.</p>
                            <Button size="sm" variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100">Manage Slots</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Agenda View */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <Badge variant="outline" className="text-xs">{filteredInterviews.length} Sessions</Badge>
                    </div>

                    {filteredInterviews.length > 0 ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" key={selectedDate}>
                            {filteredInterviews.map(interview => (
                                <Card key={interview.id} className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex flex-col items-center min-w-[60px] p-2 bg-slate-50 rounded-lg text-slate-600">
                                                <span className="text-xs font-medium uppercase">{interview.time.split(' ')[1]}</span>
                                                <span className="text-lg font-bold">{interview.time.split(' ')[0]}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{interview.candidateName}</h4>
                                                <p className="text-sm text-slate-500">{interview.type} Interview • {interview.jobTitle}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex -space-x-2">
                                                        {interview.interviewers.map((name, i) => (
                                                            <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                                                <AvatarFallback className="text-[9px] bg-slate-200">{name[0]}</AvatarFallback>
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-slate-400">interviewer(s)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {interview.meetingLink && (
                                                <a href={interview.meetingLink} target="_blank" rel="noreferrer">
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                                        <Video size={14} /> Join Meeting
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
                            <Button variant="link" className="text-indigo-600 mt-2">Schedule one now</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
