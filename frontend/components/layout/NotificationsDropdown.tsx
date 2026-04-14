'use client';

import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { Bell, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export const NotificationsDropdown = () => {
    const { notifications, markAllRead } = useAppStore();
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="relative">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Bell size={20} className="text-slate-500" />
                    </Button>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead} className="h-6 text-xs text-indigo-600 hover:text-indigo-700 px-2">
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notif) => (
                        <DropdownMenuItem key={notif.id} className="p-4 flex flex-col items-start gap-1 cursor-pointer hover:bg-slate-50 border-b last:border-0">
                            <div className="flex w-full justify-between items-start">
                                <span className={cn("font-medium text-sm", !notif.read && "text-indigo-900")}>{notif.title}</span>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{notif.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{notif.description}</p>
                            {!notif.read && (
                                <Badge variant="default" className="w-2 h-2 rounded-full p-0 mt-1 absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-500" />
                            )}
                        </DropdownMenuItem>
                    ))}
                    {notifications.length === 0 && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No new notifications
                        </div>
                    )}
                </div>
                <DropdownMenuSeparator className="my-0" />
                <div className="p-2 text-center">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-8">View all notifications</Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
