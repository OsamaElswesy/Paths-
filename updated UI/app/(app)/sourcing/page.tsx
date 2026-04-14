'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
    Search, Upload, Link as LinkIcon, Cpu, Plus,
    Database, CheckCircle2, RefreshCw,
    FileSpreadsheet, AlertTriangle, Loader2, Sparkles,
    Server, Send,
} from 'lucide-react';
import {
    fetchSourcedCandidates,
    fetchSourcingConnectors,
    searchCandidates,
    enrichCandidate,
    triggerConnectorPull,
    SourcingCandidate,
    SourcingSearchResult,
    SourcingConnector,
} from '@/lib/api/sourcing';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';

export default function SourcingPage() {
    const [activeTab, setActiveTab] = useState<'ai' | 'import'>('ai');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SourcingSearchResult[] | null>(null);
    const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [enrichingId, setEnrichingId] = useState<string | null>(null);
    const [pullingId, setPullingId] = useState<string | null>(null);
    const [pullMessage, setPullMessage] = useState<string | null>(null);

    const {
        data: candidates = [],
        isLoading: candidatesLoading,
        mutate: reloadCandidates,
    } = useSWR(
        'sourcedCandidates',
        fetchSourcedCandidates,
    );
    const {
        data: connectors = [],
        isLoading: connectorsLoading,
        mutate: reloadConnectors,
    } = useSWR('sourcingConnectors', fetchSourcingConnectors);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError(null);
        setSearchWarnings([]);
        setSearchResults(null);
        try {
            const response = await searchCandidates(searchQuery.trim(), undefined, 10);
            setSearchResults(response.results);
            setSearchWarnings([...response.data_warnings, ...response.errors]);
        } catch (err: any) {
            const is503 = err?.response?.status === 503;
            setSearchError(
                is503
                    ? 'AI search requires Ollama (the AI profile). Run: docker-compose --profile ai up -d ollama — then pull the model inside it.'
                    : 'Search failed — ensure the backend is running and at least one CV has been ingested.',
            );
        } finally {
            setIsSearching(false);
        }
    };

    const handleEnrich = async (candidateId: string) => {
        setEnrichingId(candidateId);
        try {
            await enrichCandidate(candidateId);
            // Revalidate only the sourced candidates list via SWR — no full page reload needed
            await reloadCandidates();
        } catch {
            // fail silently — enrichment is non-critical
        } finally {
            setEnrichingId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const clearSearch = () => {
        setSearchResults(null);
        setSearchWarnings([]);
        setSearchError(null);
        setSearchQuery('');
    };

    const handlePull = async (connector: SourcingConnector) => {
        setPullingId(connector.id);
        setPullMessage(null);
        try {
            const result = await triggerConnectorPull(connector.id);
            setPullMessage(`Pull started (run ${result.run_id.slice(0, 8)}…). Import is running in background.`);
            // Reload connector status after a short delay so counts update
            setTimeout(() => reloadConnectors(), 3000);
        } catch (err: any) {
            setPullMessage(
                err?.response?.data?.detail ?? 'Pull failed — check connector configuration.',
            );
        } finally {
            setPullingId(null);
        }
    };

    // Skeleton placeholder for loading state
    const SkeletonCandidateCard = () => (
        <div className="rounded-xl border bg-white p-6 animate-pulse space-y-4">
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
            </div>
        </div>
    );

    // What to show in the candidate grid
    const displayList: Array<SourcingCandidate | SourcingSearchResult> =
        searchResults ?? candidates;
    const isSearchMode = searchResults !== null;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Sourcing & Import"
                description="Acquire top talent through AI-powered discovery or external imports."
                action={
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                                activeTab === 'ai'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <Cpu size={16} /> AI Sourcing
                        </button>
                        <button
                            onClick={() => setActiveTab('import')}
                            className={cn(
                                'px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2',
                                activeTab === 'import'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <Database size={16} /> Import Center
                        </button>
                    </div>
                }
            />

            {activeTab === 'ai' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    {/* Search Section */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Cpu size={120} />
                        </div>
                        <CardContent className="p-8 relative z-10">
                            <h2 className="text-2xl font-bold mb-1">Talent Discovery Engine</h2>
                            <p className="text-indigo-100 mb-6 max-w-xl text-sm">
                                Describe your ideal candidate in natural language. The AI embeds your
                                query and searches ingested CVs semantically — no keywords required.
                            </p>
                            <div className="flex flex-col md:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={20}
                                    />
                                    <Input
                                        placeholder="e.g. Senior backend engineer with Python, FastAPI, and PostgreSQL experience..."
                                        className="h-14 pl-12 bg-white text-slate-900 border-none shadow-inner text-base w-full"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                                <Button
                                    className="h-14 px-8 bg-indigo-400 hover:bg-indigo-300 text-indigo-900 font-bold text-base gap-2 shadow-lg shrink-0"
                                    onClick={handleSearch}
                                    disabled={isSearching || !searchQuery.trim()}
                                >
                                    {isSearching ? (
                                        <><Loader2 size={18} className="animate-spin" /> Searching...</>
                                    ) : (
                                        <><Sparkles size={18} /> Source Talent</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Search Error */}
                    {searchError && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                            {searchError}
                        </div>
                    )}

                    {/* Data Warnings from backend */}
                    {searchWarnings.length > 0 && (
                        <div className="space-y-2">
                            {searchWarnings.map((w, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800"
                                >
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                                    {w}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Results header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800">
                                {isSearchMode
                                    ? `Search results for "${searchQuery}" (${displayList.length})`
                                    : `All ingested candidates (${candidates.length})`}
                            </h3>
                            {isSearchMode && (
                                <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">
                                    <Sparkles size={10} className="mr-1" /> AI ranked
                                </Badge>
                            )}
                        </div>
                        {isSearchMode && (
                            <Button variant="ghost" size="sm" onClick={clearSearch} className="text-slate-500 text-xs">
                                Clear search
                            </Button>
                        )}
                    </div>

                    {/* Candidate Grid */}
                    {candidatesLoading ? (
                        // Show skeleton cards while SWR fetches from backend
                        <div className="grid lg:grid-cols-2 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => <SkeletonCandidateCard key={i} />)}
                        </div>
                    ) : displayList.length === 0 && !isSearching ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                            <Cpu size={40} className="mb-4 opacity-20" />
                            <p className="font-medium">
                                {isSearchMode
                                    ? 'No candidates matched your search.'
                                    : 'No candidates in the system yet.'}
                            </p>
                            <p className="text-xs mt-2 max-w-sm text-center">
                                {isSearchMode
                                    ? 'Try a broader query, or ensure CVs have been ingested via the CV Ingestion pipeline.'
                                    : 'Upload CVs via the Import Center or the CV Ingestion endpoint to populate this list.'}
                            </p>
                        </div>
                    ) : null}


                    <div className="grid lg:grid-cols-2 gap-6">
                        {displayList.map((item) => {
                            const isResult = 'relevance_score' in item;
                            const candidateId = isResult
                                ? (item as SourcingSearchResult).candidate_id
                                : (item as SourcingCandidate).id;
                            const name = isResult
                                ? (item as SourcingSearchResult).candidate_name
                                : (item as SourcingCandidate).full_name;
                            const title = item.current_title;
                            const location = isResult
                                ? (item as SourcingSearchResult).location
                                : (item as SourcingCandidate).location_text;
                            const experience = item.years_experience;
                            const skills = item.skills ?? [];
                            const score = isResult
                                ? Math.round((item as SourcingSearchResult).relevance_score * 100)
                                : null;
                            const excerpts = isResult
                                ? (item as SourcingSearchResult).matched_excerpts
                                : [];

                            return (
                                <Card
                                    key={candidateId}
                                    className="hover:border-indigo-200 transition-colors group"
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-14 w-14 bg-slate-100">
                                                    <AvatarFallback className="font-bold text-indigo-600 text-lg">
                                                        {name
                                                            ?.split(' ')
                                                            .map((n) => n[0])
                                                            .join('')
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                                                        {name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 mt-0.5">
                                                        {title ?? 'Role unknown'}
                                                        {experience ? ` • ${experience} yrs` : ''}
                                                        {location ? ` • ${location}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            {score !== null ? (
                                                <div className="text-center shrink-0">
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Relevance</p>
                                                    <p className="text-2xl font-black text-indigo-600 leading-none">
                                                        {score}%
                                                    </p>
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-slate-50 text-slate-500 border-slate-200 text-xs"
                                                >
                                                    Ingested
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Skills */}
                                        {skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {skills.slice(0, 6).map((skill) => (
                                                    <Badge
                                                        key={skill}
                                                        variant="secondary"
                                                        className="font-normal text-[11px]"
                                                    >
                                                        {skill}
                                                    </Badge>
                                                ))}
                                                {skills.length > 6 && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[11px] text-slate-400"
                                                    >
                                                        +{skills.length - 6}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Matched CV excerpts — only in search mode */}
                                        {excerpts.length > 0 && (
                                            <div className="mb-4 space-y-1">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">
                                                    Matched excerpt
                                                </p>
                                                <p className="text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2 leading-relaxed line-clamp-3">
                                                    …{excerpts[0]}…
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-500 hover:text-indigo-600 gap-2 text-xs"
                                                onClick={() => handleEnrich(candidateId)}
                                                disabled={enrichingId === candidateId}
                                            >
                                                {enrichingId === candidateId ? (
                                                    <Loader2 size={13} className="animate-spin" />
                                                ) : (
                                                    <Sparkles size={13} />
                                                )}
                                                Enrich Contact
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-white border text-indigo-600 hover:bg-indigo-50 gap-2 border-indigo-200 text-xs"
                                            >
                                                <Plus size={13} /> Add to Pipeline
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'import' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* File Upload Zone */}
                        <Card className="md:col-span-2 border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-slate-50 transition-all cursor-pointer group">
                            <CardContent className="h-64 flex flex-col items-center justify-center text-center p-8">
                                <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-xl mb-1">Upload Candidates</h3>
                                <p className="text-slate-500 mb-6">
                                    Drag and drop your CSV, Excel, or JSON files here.
                                </p>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="gap-2 bg-white">
                                        <FileSpreadsheet size={16} /> Choose File
                                    </Button>
                                    <Button variant="ghost" className="text-indigo-600">
                                        Download Template
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Direct Paste */}
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Paste</CardTitle>
                                <CardDescription>Paste details from an email or resume.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <textarea
                                    className="w-full h-32 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Paste candidate details here..."
                                />
                                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                                    Process Content
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sourcing Connectors — live data from backend */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <LinkIcon size={20} className="text-indigo-600" /> Sourcing Connectors
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 text-xs gap-1"
                                onClick={() => reloadConnectors()}
                            >
                                <RefreshCw size={13} /> Refresh
                            </Button>
                        </div>

                        {pullMessage && (
                            <div className={cn(
                                'flex items-start gap-3 p-3 rounded-lg text-xs border',
                                pullMessage.includes('failed') || pullMessage.includes('Failed')
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-green-50 border-green-200 text-green-800',
                            )}>
                                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                                {pullMessage}
                            </div>
                        )}

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {connectors.map((connector) => (
                                <ConnectorCard
                                    key={connector.id}
                                    connector={connector}
                                    isPulling={pullingId === connector.id}
                                    onPull={() => handlePull(connector)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── ConnectorCard sub-component ───────────────────────────────────────────────

function ConnectorCard({
    connector,
    isPulling,
    onPull,
}: {
    connector: SourcingConnector;
    isPulling: boolean;
    onPull: () => void;
}) {
    const isInternal = connector.id === 'internal';
    const isConfigured = connector.is_configured;

    const StatusBadge = () => {
        if (connector.status === 'active') {
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 text-[10px]">
                    <CheckCircle2 size={9} /> Active
                </Badge>
            );
        }
        if (connector.status === 'configured') {
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 text-[10px]">
                    <CheckCircle2 size={9} /> Configured
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[10px]">
                Not configured
            </Badge>
        );
    };

    const ConnectorIcon = () => {
        if (isInternal) return <Server size={22} className="text-indigo-500" />;
        if (connector.id === 'greenhouse') return <Database size={22} className="text-green-600" />;
        return <Send size={22} className="text-sky-500" />;
    };

    return (
        <Card className={cn('hover:shadow-md transition-shadow', !isConfigured && !isInternal && 'opacity-70')}>
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center">
                        <ConnectorIcon />
                    </div>
                    <StatusBadge />
                </div>

                <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{connector.display_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{connector.description}</p>
                </div>

                {/* Counts */}
                <div className="flex gap-4 text-xs text-slate-500">
                    {isInternal && connector.candidate_count !== undefined && (
                        <span className="font-medium text-slate-700">{connector.candidate_count} candidates</span>
                    )}
                    <span className="font-medium text-slate-700">{connector.job_count} jobs</span>
                </div>

                {/* Last pull info */}
                {connector.last_pull && (
                    <p className="text-[10px] text-slate-400">
                        Last pull: {new Date(connector.last_pull.started_at).toLocaleDateString()} ·{' '}
                        {connector.last_pull.inserted} added · {connector.last_pull.duplicates} dupes
                    </p>
                )}

                {/* Config hint for unconfigured external connectors */}
                {!isInternal && !isConfigured && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                        {connector.id === 'greenhouse'
                            ? 'Set GREENHOUSE_BOARD_TOKENS in .env to enable'
                            : 'Set TELEGRAM_JOB_CHANNELS in .env to enable'}
                    </p>
                )}

                {/* Action button */}
                {!isInternal && (
                    <Button
                        size="sm"
                        variant={isConfigured ? 'default' : 'outline'}
                        className={cn(
                            'w-full h-8 text-xs gap-2',
                            isConfigured ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-slate-400',
                        )}
                        disabled={isPulling || !isConfigured}
                        onClick={onPull}
                    >
                        {isPulling ? (
                            <><Loader2 size={12} className="animate-spin" /> Pulling...</>
                        ) : (
                            <><RefreshCw size={12} /> Pull Now</>
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
