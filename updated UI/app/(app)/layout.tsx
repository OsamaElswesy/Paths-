'use client';

import React from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppProvider, useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const AppLayoutInner = ({ children }: { children: React.ReactNode }) => {
    const { sidebarOpen } = useAppStore();

    return (
        <div className="min-h-screen bg-slate-50">
            <AppSidebar />
            <div
                className={cn(
                    "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                    sidebarOpen ? "ml-64" : "ml-[4.5rem]"
                )}
            >
                <AppHeader />
                <main className="flex-1 p-6 md:p-8 animate-in fade-in duration-500">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppProvider>
            <AppLayoutInner>{children}</AppLayoutInner>
        </AppProvider>
    );
}
