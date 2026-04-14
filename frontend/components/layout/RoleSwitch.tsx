'use client';

import React from 'react';
import { useAppStore, UserRole } from '@/lib/store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield } from 'lucide-react';

export const RoleSwitch = () => {
    const { userRole, setUserRole } = useAppStore();

    const roles: UserRole[] = ['ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER'];

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case 'ADMIN': return 'destructive';
            case 'RECRUITER': return 'primary';
            case 'HIRING_MANAGER': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 border border-dashed border-slate-300">
                    <Shield size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 hidden md:inline">Viewing as:</span>
                    <Badge variant={getRoleColor(userRole) as any} className="pointer-events-none">
                        {userRole}
                    </Badge>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {roles.map((role) => (
                    <DropdownMenuItem key={role} onClick={() => setUserRole(role)}>
                        {role}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
