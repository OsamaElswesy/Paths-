'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import styles from './Sidebar.module.css';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    CheckSquare,
    Send,
    Calendar,
    MessageSquare,
    PieChart,
    Settings,
    FileText
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Candidates', href: '/candidates', icon: Users },
    { label: 'Shortlist', href: '/shortlist', icon: CheckSquare },
    { label: 'Outreach', href: '/outreach', icon: Send },
    { label: 'Scheduling', href: '/scheduling', icon: Calendar },
    { label: 'Interviews', href: '/interviews', icon: MessageSquare }, // Using MessageSquare as placeholder for Interview
    { label: 'Decisions', href: '/decisions', icon: FileText },
    { label: 'Reports', href: '/reports', icon: PieChart },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.logo}>
                    {/* Placeholder Logo Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    PATHS
                </div>
            </div>

            <nav className={styles.nav}>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    // Check active state roughly (startsWith for sub-routes)
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(styles.navItem, isActive && styles.active)}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                {/* User Profile Mini / Logout could go here */}
            </div>
        </aside>
    );
};
