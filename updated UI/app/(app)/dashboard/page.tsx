'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Plus, TrendingUp, Users, Calendar, ArrowUpRight, Activity, PieChart, ArrowRight, MousePointerClick, Target } from 'lucide-react';
import useSWR from 'swr';
import { fetchDashboardReports } from '@/lib/api/reports';

export default function DashboardPage() {
    const { jobs, notifications, candidates, userRole } = useAppStore();
    const { data: reportData, isLoading: reportsLoading } = useSWR('reports', fetchDashboardReports);

    // ── Skeleton helpers ──────────────────────────────────────────────────────
    const SkeletonBar = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
        <div className={`${h} ${w} bg-slate-200 rounded animate-pulse`} />
    );

    // --- Derived Recruiter Stats ---
    const activeJobs = jobs.filter(j => j.status === 'Published').length;
    const totalCandidates = candidates.length;
    const interviewsScheduled = 8;

    // Aggregating candidates by stage
    const stageCounts = candidates.reduce((acc, cand) => {
        acc[cand.stage] = (acc[cand.stage] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pipelineData = [
        { label: 'Sourced', count: stageCounts['Sourced'] || 0, color: 'bg-slate-400', desc: 'Identified talent' },
        { label: 'Screened', count: stageCounts['Screened'] || 0, color: 'bg-blue-400', desc: 'AI Alignment check' },
        { label: 'Shortlisted', count: stageCounts['Shortlisted'] || 0, color: 'bg-indigo-500', desc: 'Ready for review' },
        { label: 'Revealed', count: stageCounts['Revealed'] || 0, color: 'bg-amber-500', desc: 'Identity unlocked' },
        { label: 'Outreach', count: stageCounts['Outreach'] || 0, color: 'bg-purple-500', desc: 'Campaign started' },
        { label: 'Interview', count: stageCounts['Interview'] || 0, color: 'bg-pink-500', desc: 'Structured assessment' },
        { label: 'Decision', count: stageCounts['Decision'] || 0, color: 'bg-green-500', desc: 'Final evaluation' }
    ];

    const maxCount = Math.max(...pipelineData.map(d => d.count), 1);

    if (userRole === 'CANDIDATE') {
        return (
            <div className="space-y-10 animate-in fade-in duration-700">
                {/* Candidate Header */}
                <div className="relative rounded-[2rem] bg-indigo-600 p-10 overflow-hidden text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="relative z-10 space-y-4">
                        <Badge className="bg-white/20 text-white border-0">Candidate Hub</Badge>
                        <h1 className="text-4xl font-bold tracking-tight">Welcome back, Jane.</h1>
                        <p className="text-indigo-100 text-lg max-w-xl leading-relaxed">
                            Your skills are your superpower. Continue your journey toward your next elite role.
                        </p>
                    </div>
                </div>

                {/* The Path (Guided Process) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Your Journey Path</h2>
                        <span className="text-sm font-medium text-slate-500">Step 2 of 4 Complete</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Profile Setup', status: 'completed', icon: Users, desc: 'Identity protected' },
                            { label: 'Skill Validation', status: 'active', icon: Activity, desc: 'AI assessment' },
                            { label: 'Interview Phase', status: 'pending', icon: Calendar, desc: 'Connect with teams' },
                            { label: 'Final Decision', status: 'pending', icon: Target, desc: 'The offer wait' }
                        ].map((step, i) => (
                            <div key={i} className="relative group">
                                <Card className={cn(
                                    "h-full transition-all duration-500 border-none shadow-sm ring-1 ring-slate-200",
                                    step.status === 'active' ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-100 translate-y-[-4px]" : "",
                                    step.status === 'completed' ? "bg-slate-50 opacity-80" : "bg-white"
                                )}>
                                    <CardContent className="p-6 space-y-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                            step.status === 'completed' ? "bg-green-100 text-green-600" :
                                                step.status === 'active' ? "bg-indigo-600 text-white shadow-indigo-200" : "bg-slate-50 text-slate-400"
                                        )}>
                                            <step.icon size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900">{step.label}</h3>
                                            <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                                        </div>
                                        <div className="pt-2">
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    step.status === 'completed' ? "w-full bg-green-500" :
                                                        step.status === 'active' ? "w-1/2 bg-indigo-500 animate-pulse" : "w-0"
                                                )} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                {i < 3 && (
                                    <div className="hidden md:block absolute top-1/2 -right-2 z-10 text-slate-300">
                                        <ArrowRight size={16} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Active Action Card */}
                    <Card className="lg:col-span-2 border-none shadow-xl ring-1 ring-slate-200 overflow-hidden group">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-lg">Next Step: Skill Check</CardTitle>
                            <CardDescription>Validate your proficiency in <span className="font-bold text-slate-900">React & TypeScript</span>.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 space-y-6">
                            <div className="flex items-start gap-6 p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
                                <Activity className="text-indigo-600 shrink-0 mt-1" size={24} />
                                <div className="space-y-2">
                                    <h4 className="font-bold text-indigo-900">Why this matters?</h4>
                                    <p className="text-indigo-700/80 text-sm leading-relaxed">
                                        Your identity is currently hidden from recruiters. Your AI-evaluated skill score is the
                                        primary metric they see. A high score increases your interview reveal rate by 400%.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-4">
                                <Button size="lg" className="rounded-full px-8 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-100">
                                    Start Assessment <MousePointerClick size={16} className="ml-2" />
                                </Button>
                                <Button variant="outline" size="lg" className="rounded-full px-8">Review Preparation</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Insight */}
                    <div className="space-y-8">
                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base">System Compatibility</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900 leading-none">AI Profile Score</p>
                                        <p className="text-xs text-slate-500">Based on your experience</p>
                                    </div>
                                    <span className="text-2xl font-black text-indigo-600">88%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[88%]" />
                                </div>
                                <p className="text-[10px] text-slate-500 italic">"Your profile shows strong alignment with current enterprise software engineering rubrics."</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm ring-1 ring-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base">Recent Feed</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {notifications.slice(0, 3).map((notif, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-1">{notif.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ... Rest of Recruiter Dashboard ... */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recruitment Dashboard</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <p className="text-slate-500 text-sm">System Status: Operational</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <Activity size={16} /> Reports
                    </Button>
                    <Link href="/jobs/new">
                        <Button className="gap-2 shadow-lg shadow-indigo-200">
                            <Plus size={16} /> Create Job
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Active Jobs", value: activeJobs, sub: "Open positions", icon: TrendingUp, color: "text-indigo-600" },
                    { title: "Total Candidates", value: totalCandidates, sub: "In pipeline", icon: Users, color: "text-blue-600" },
                    { title: "Interviews", value: interviewsScheduled, sub: "This week", icon: Calendar, color: "text-purple-600" },
                    { title: "Sourcing Efficiency", value: "+12%", sub: "Higher than avg", icon: Target, color: "text-green-600" }
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-md transition-all group overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">
                                {stat.title}
                            </CardTitle>
                            <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors")}>
                                <stat.icon className={cn("h-4 w-4 transition-colors", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-md overflow-hidden bg-white ring-1 ring-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
                        <div>
                            <CardTitle className="text-lg">Pipeline Conversion Funnel</CardTitle>
                            <CardDescription className="text-xs">Candidate throughput across the 9-step workforce.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-indigo-600 text-xs gap-1">Full Report <ArrowRight size={14} /></Button>
                    </CardHeader>
                    <CardContent className="pt-8 px-8">
                        <div className="space-y-4">
                            {pipelineData.map((item, index) => {
                                const heightPercentage = (item.count / maxCount) * 100;
                                const nextItem = pipelineData[index + 1];
                                const conversionRate = nextItem ? Math.round((nextItem.count / (item.count || 1)) * 100) : null;

                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center gap-4 group">
                                            <div className="w-24 text-right">
                                                <span className="text-xs font-bold text-slate-600 truncate block">{item.label}</span>
                                            </div>
                                            <div className="flex-1 bg-slate-100 h-8 rounded-full overflow-hidden relative shadow-inner">
                                                <div
                                                    className={cn("h-full transition-all duration-1000 ease-out relative group-hover:brightness-110", item.color)}
                                                    style={{ width: `${heightPercentage}%` }}
                                                >
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-12">
                                                <span className="text-[10px] font-medium text-slate-400">{heightPercentage}%</span>
                                            </div>
                                        </div>
                                        {conversionRate !== null && (
                                            <div className="flex items-center gap-4 py-1">
                                                <div className="w-24"></div>
                                                <div className="flex-1 flex justify-center">
                                                    <div className="h-4 border-l-2 border-dashed border-slate-200 relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded-full border border-slate-200 text-[9px] font-bold text-slate-500 whitespace-nowrap shadow-sm">
                                                            → {conversionRate}% Pass rate
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-12"></div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card className="border-none shadow-md ring-1 ring-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <PieChart size={18} className="text-indigo-600" /> Sourcing Channels
                            </CardTitle>
                            <CardDescription className="text-xs">Top performing candidate sources.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {reportsLoading || !reportData ? (
                                    // Skeleton while reports data loads
                                    [1, 2, 3, 4].map(i => (
                                        <div key={i} className="space-y-1">
                                            <SkeletonBar w="w-3/4" h="h-3" />
                                            <SkeletonBar h="h-1.5" />
                                        </div>
                                    ))
                                ) : (
                                    reportData.sources.map((source, i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-slate-600">{source.label}</span>
                                                <span className="text-slate-900">{source.value}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full transition-all duration-700", source.color)} style={{ width: `${source.value}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md ring-1 ring-slate-200 flex-1">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base">Recent Updates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                {notifications.slice(0, 4).map((notif) => (
                                    <div key={notif.id} className="flex gap-3 group">
                                        <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Activity size={14} />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-1">{notif.description}</p>
                                            <p className="text-[9px] text-slate-400 font-medium">{notif.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" size="sm" className="w-full text-[10px] text-indigo-600 mt-4 border-t pt-4 h-auto">View All Activity</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

