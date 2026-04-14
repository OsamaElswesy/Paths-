import React from 'react';
import { cn } from '@/lib/utils';

export const Spinner = ({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
    };

    return (
        <div
            className={cn(
                'rounded-full border-slate-200 border-t-indigo-600 animate-spin',
                sizeClasses[size],
                className
            )}
        />
    );
};
