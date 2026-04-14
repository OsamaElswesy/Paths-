'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
    LayoutDashboard,
    Briefcase,
    Calendar,
    MessageSquare,
    FileText,
    PieChart,
    Settings,
    ChevronsLeft,
    ChevronsRight,
    Building2,
    HelpCircle,
    LogOut,
    Globe,
    ChevronDown,
    Plus,
    Star
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';

export const AppSidebar = () => {
    const pathname = usePathname();
    const { sidebarOpen, toggleSidebar, userRole } = useAppStore();

    // RBAC Logic
    const canAccessSettings = userRole === 'ADMIN';
    const canCreateJob = userRole === 'ADMIN' || userRole === 'RECRUITER';

    const NAV_ITEMS = [
        { label: 'My Path', href: '/dashboard', icon: Star, roles: ['CANDIDATE'] },
        { label: 'Find Jobs', href: '/jobs', icon: Briefcase, roles: ['CANDIDATE'] },
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'] },
        { label: 'Jobs', href: '/jobs', icon: Briefcase, roles: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'] },
        { label: 'Sourcing', href: '/sourcing', icon: Star, roles: ['ADMIN', 'RECRUITER'] },
        { label: 'Scheduling', href: '/scheduling', icon: Calendar, roles: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'] },
        { label: 'Interviews', href: '/interviews', icon: MessageSquare, roles: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'CANDIDATE'] },
        { label: 'Decisions', href: '/decisions', icon: FileText, roles: ['ADMIN', 'RECRUITER', 'HIRING_MANAGER'] },
        { label: 'Reports', href: '/reports', icon: PieChart, roles: ['ADMIN', 'RECRUITER'] },
    ];

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col",
                sidebarOpen ? "w-64" : "w-[4.5rem]"
            )}
        >
            {/* Header / Logo / Org Switcher */}
            {/* Header / Logo */}
            <div className="h-20 flex flex-col items-center justify-center border-b border-slate-800 shrink-0 p-4">
                {sidebarOpen ? (
                    <Link href="/" className="flex items-center justify-center w-full">
                        <img src="/logo.png" alt="PATHS Logo" className="h-10 w-auto brightness-0 invert object-contain" />
                    </Link>
                ) : (
                    <div className="w-full flex justify-center">
                        <Link href="/">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-700 shadow-md">
                                <img src="/logo.png" alt="P" className="h-8 w-auto object-cover scale-[2.0]" />
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                {NAV_ITEMS.filter(item => item.roles.includes(userRole)).map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                            )}
                        >
                            <Icon size={20} className={cn("shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                            {sidebarOpen && (
                                <span className="text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
                            )}
                            {!sidebarOpen && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-slate-700">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    )
                })}

                {/* Settings (Admin Only) */}
                {canAccessSettings && (
                    <Link
                        href="/settings"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative mt-4",
                            pathname?.startsWith('/settings')
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        )}
                    >
                        <Settings size={20} className="shrink-0" />
                        {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
                    </Link>
                )}
            </div>

            {/* User Profile / Footer */}
            <div className="p-3 border-t border-slate-800 flex flex-col gap-2">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 hover:text-slate-200 gap-3 px-2">
                        <Globe size={20} />
                        {sidebarOpen && <span>Return to Website</span>}
                    </Button>
                </Link>

                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 hover:text-slate-200 gap-3 px-2">
                    <HelpCircle size={20} />
                    {sidebarOpen && <span>Help & Docs</span>}
                </Button>

                <div className={cn("flex items-center gap-3 p-2 rounded-md bg-slate-950/50", !sidebarOpen && "justify-center px-0")}>
                    <Avatar className="h-9 w-9 border border-slate-700">
                        <AvatarImage src="/placeholder-avatar.jpg" />
                        <AvatarFallback className="bg-slate-800 text-slate-300 text-xs">JD</AvatarFallback>
                    </Avatar>
                    {sidebarOpen && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate text-slate-200">Jane Doe</span>
                            <span className="text-[10px] text-slate-500 truncate capitalize">{userRole.toLowerCase().replace('_', ' ')}</span>
                        </div>
                    )}
                    {sidebarOpen && (
                        <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-slate-500 hover:text-red-400">
                            <LogOut size={14} />
                        </Button>
                    )}
                </div>

                {/* Collapse Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="w-full justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-300 h-6 mt-1"
                >
                    {sidebarOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
                </Button>
            </div>
        </aside>
    );
};
