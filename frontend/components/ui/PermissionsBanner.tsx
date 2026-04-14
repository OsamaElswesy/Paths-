import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface PermissionsBannerProps {
    message?: string;
    onRequestAccess?: () => void;
    className?: string;
}

export const PermissionsBanner = ({
    message = "You do not have permission to view or edit this resource.",
    onRequestAccess,
    className
}: PermissionsBannerProps) => {
    return (
        <div className={cn("bg-amber-50 border-l-4 border-amber-500 p-4 flex items-start gap-3", className)}>
            <Lock className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
                <h4 className="font-semibold text-amber-800 text-sm">Access Restricted</h4>
                <p className="text-amber-700 text-sm mt-1">{message}</p>
            </div>
            {onRequestAccess && (
                <Button variant="outline" size="sm" onClick={onRequestAccess} className="bg-white hover:bg-amber-100 border-amber-200 text-amber-800">
                    Request Access
                </Button>
            )}
        </div>
    );
};
