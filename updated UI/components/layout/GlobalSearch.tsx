'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Search, Briefcase, User, X } from 'lucide-react';
import { Command } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export const GlobalSearch = () => {
    const { jobs, candidates } = useAppStore();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter results
    const jobResults = query
        ? jobs.filter(j => j.title.toLowerCase().includes(query.toLowerCase()))
        : [];

    const candidateResults = query
        ? candidates.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
        : [];

    const hasResults = jobResults.length > 0 || candidateResults.length > 0;

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full max-w-md hidden md:block" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                    placeholder="Search jobs, candidates..."
                    className="pl-9 h-9 bg-slate-50 focus:bg-white transition-colors"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />
                {/* Keyboard shortcut hint */}
                {!query && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                )}
                {query && (
                    <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {open && query && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-lg border shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {!hasResults && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No results found.
                        </div>
                    )}

                    {jobResults.length > 0 && (
                        <div className="py-2">
                            <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs</div>
                            {jobResults.map(job => (
                                <Link
                                    key={job.id}
                                    href={`/jobs/${job.id}`}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer group"
                                >
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                                        <Briefcase size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{job.title}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{job.department}</span>
                                            <Badge variant="outline" className="text-[10px] px-1 h-4">{job.status}</Badge>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {candidateResults.length > 0 && (
                        <>
                            {jobResults.length > 0 && <div className="h-px bg-slate-100 my-1" />}
                            <div className="py-2">
                                <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidates</div>
                                {candidateResults.map(cand => (
                                    <Link
                                        key={cand.id}
                                        href={`/candidates/${cand.id}`}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer group"
                                    >
                                        <div className="p-2 bg-pink-50 text-pink-600 rounded-full group-hover:bg-pink-100 group-hover:text-pink-700 transition-colors">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{cand.name}</p>
                                            <span className="text-xs text-slate-500">Score: {cand.score}% • {cand.stage}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
