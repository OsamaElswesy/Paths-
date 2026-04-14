import React from 'react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: React.ElementType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) => {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50", className)}>
            {Icon && (
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Icon size={32} className="text-slate-400" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
