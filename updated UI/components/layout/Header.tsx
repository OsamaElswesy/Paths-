'use client';

import React from 'react';
import styles from './Header.module.css';
import { Input } from '@/components/ui/Input';
import { Bell, HelpCircle, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.searchContainer}>
                {/* Simplified Search Input */}
                <div className="relative flex items-center">
                    <Search className="absolute left-3 text-slate-400" size={16} />
                    {/* Using inline style style override for padding-left to accommodate icon */}
                    <input
                        className="w-full h-10 pl-10 pr-4 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Search jobs, candidates..."
                    />
                </div>
            </div>

            <div className={styles.actions}>
                <button className={styles.iconButton}>
                    <HelpCircle size={20} />
                </button>
                <button className={styles.iconButton}>
                    <Bell size={20} />
                </button>

                <div className="w-px h-6 bg-slate-200 mx-2" />

                <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                        JD
                    </div>
                    <span className="hidden md:inline">Jane Doe</span>
                </Button>
            </div>
        </header>
    );
};
