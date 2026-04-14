'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Mail, Phone, MapPin, Briefcase, Star, Search, Filter, Shield } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function CandidatesPage() {
    const { candidates, isAnonymized, isLoading } = useAppStore();
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Skeleton shown per-grid while data is still loading from the backend
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

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Grid View */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : filteredCandidates.map((candidate) => {
                    const displayName = isAnonymized ? `Candidate #${candidate.id.split('-')[1]}` : candidate.name;
                    const displayEmail = isAnonymized ? '***@anonymized.com' : candidate.email;
                    const isTopK = candidate.score >= 90;

                    return (
                        <Card key={candidate.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden">
                            <CardContent className="p-0">
                                {/* Card Header Background */}
                                <div className="h-16 bg-slate-50 border-b border-slate-100 flex justify-between items-center p-2 px-4 text-xs">
                                    <div className="flex items-center gap-1">
                                        {isTopK && <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1"><Star size={10} fill="currentColor" /> Top Match</Badge>}
                                    </div>
                                    <Badge className={cn(
                                        "h-6",
                                        candidate.stage === 'Decision' ? "bg-green-100 text-green-700" :
                                            candidate.stage === 'Sourced' ? "bg-slate-100 text-slate-700" :
                                                "bg-indigo-100 text-indigo-700"
                                    )}>
                                        {candidate.stage}
                                    </Badge>
                                </div>

                                <div className="p-6 pt-0 -mt-8 flex flex-col items-center text-center">
                                    <Avatar className={cn(
                                        "h-20 w-20 border-4 border-white shadow-md mb-4 group-hover:scale-105 transition-transform",
                                        isAnonymized ? "bg-slate-900" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                                    )}>
                                        <AvatarFallback className="text-white font-bold text-xl">
                                            {isAnonymized ? <Shield size={32} /> : candidate.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <h3 className="font-bold text-slate-900 text-lg">{displayName}</h3>
                                    <p className="text-sm text-indigo-600 font-medium mb-4">{candidate.experience} Years Experience</p>

                                    {/* Contact Details */}
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
                                    <div className="w-full flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Match Score</span>
                                            <span className="text-lg font-bold text-slate-900">{candidate.score}%</span>
                                        </div>
                                        <Button size="sm" variant="outline" className="text-xs">View Full Profile</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredCandidates.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                    <Briefcase size={40} className="mx-auto mb-4 opacity-20" />
                    <p>No candidates match your search.</p>
                </div>
            )}
        </div>
    );
}
