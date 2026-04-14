'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchDashboardReports } from '@/lib/api/reports';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { TrendingDown, Users, DollarSign, Target } from 'lucide-react';

export default function ReportsPage() {
    const { data: reportData, isLoading } = useSWR('reports', fetchDashboardReports);

    if (isLoading || !reportData) {
        return <div className="p-10 text-center text-slate-500 animate-pulse">Loading analytics...</div>;
    }

    const maxSourceVal = Math.max(...reportData.sources.map(s => s.value));
    const maxTime = Math.max(...reportData.timeToHire);

    return (
        <div className="space-y-8">
            <PageHeader title="Reports & Analytics" description="Insights into your hiring performance." />

            {/* KPI Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Time to Hire", value: "18 Days", trend: "-12%", icon: TrendingDown, color: "text-green-600" },
                    { label: "Cost per Hire", value: "$1,200", trend: "+5%", icon: DollarSign, color: "text-slate-600" },
                    { label: "Offer Acceptance", value: "88%", trend: "+2%", icon: Target, color: "text-indigo-600" },
                    { label: "Total Hires", value: "24", trend: "Q3", icon: Users, color: "text-blue-600" },
                ].map((kpi, i) => (
                    <Card key={i}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</h3>
                                <span className={cn("text-xs font-medium", kpi.trend.startsWith('-') ? "text-green-600" : "text-amber-600")}>
                                    {kpi.trend} vs last quarter
                                </span>
                            </div>
                            <div className={cn("p-3 rounded-full bg-slate-50", kpi.color)}>
                                <kpi.icon size={24} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Time to Hire Chart (Simple CSS Bar/Line proxy) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Time to Hire Trend</CardTitle>
                        <CardDescription>Average days to hire over last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] flex items-end justify-between gap-4 px-4 pt-10">
                            {reportData.timeToHire.map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="w-full bg-indigo-50 rounded-t-sm relative h-full flex items-end">
                                        <div
                                            className="w-full bg-indigo-500 rounded-t-sm transition-all duration-1000 group-hover:bg-indigo-600 relative"
                                            style={{ height: `${(val / maxTime) * 100}%` }}
                                        >
                                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {val} days
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">Mo {i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Source Efficiency */}
                <Card>
                    <CardHeader>
                        <CardTitle>Candidates by Source</CardTitle>
                        <CardDescription>Where are your best candidates coming from?</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-center h-[300px] space-y-6">
                        {reportData.sources.map((source, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700">{source.label}</span>
                                    <span className="text-slate-500">{source.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000 w-0 animate-in slide-in-from-left-0", source.color)}
                                        style={{ width: `${source.value}%`, animationFillMode: 'forwards' }} // basic animation support
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
