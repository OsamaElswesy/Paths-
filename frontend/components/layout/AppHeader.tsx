'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsDropdown } from './NotificationsDropdown';
import { RoleSwitch } from './RoleSwitch';
import { useAppStore } from '@/lib/store';
import { Plus, Menu, Shield, ShieldAlert, Globe as GlobeIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { AppSidebar } from './AppSidebar'; // We might need a mobile version navigation list, reusing simple list for now
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api/auth';

export const AppHeader = ({ mobileNav }: { mobileNav?: React.ReactNode }) => {
    const pathname = usePathname();
    const { userRole, currentUser } = useAppStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Generate Breadcrumbs
    const segments = pathname?.split('/').filter(Boolean) || [];
    const breadcrumbItems = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        return {
            label: segment.charAt(0).toUpperCase() + segment.slice(1),
            href,
            active: index === segments.length - 1
        };
    });

    const canCreateJob = userRole === 'ADMIN' || userRole === 'RECRUITER';
    const initials = currentUser.name.split(' ').map(n => n[0]).join('');

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 w-full shadow-sm">
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <Menu size={20} />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-r-0 w-72">
                        <div className="bg-slate-900 h-full p-4 text-slate-300">
                            <div className="text-lg font-bold text-white mb-6">PATHS Mobile</div>
                            {/* Simplified Mobile Links */}
                            <nav className="flex flex-col gap-4">
                                <Link href="/dashboard" className="block py-2">Dashboard</Link>
                                <Link href="/jobs" className="block py-2">Jobs</Link>
                                <Link href="/scheduling" className="block py-2">Scheduling</Link>
                                <Link href="/interviews" className="block py-2">Interviews</Link>
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex flex-1 items-center gap-4">
                <Breadcrumb items={breadcrumbItems} className="hidden md:flex" />
            </div>

            <div className="flex items-center gap-4">
                <GlobalSearch />

                {/* Dev Tool: Role Switcher */}
                <div className="hidden lg:block border-l pl-4 border-slate-200">
                    <RoleSwitch />
                </div>

                <NotificationsDropdown />

                {canCreateJob && (
                    <Button size="sm" className="hidden sm:flex gap-2">
                        <Plus size={16} /> <span className="hidden lg:inline">Create Job</span>
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-offset-1 ring-primary transition-all">
                            <AvatarFallback className="bg-indigo-600 text-white font-medium text-xs">{initials}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            <div className="flex flex-col">
                                <span>{currentUser.name}</span>
                                <span className="text-[10px] text-slate-500 font-normal">{currentUser.email}</span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile" className="w-full">Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Preferences</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/" className="w-full flex items-center gap-2">
                                <GlobeIcon size={14} />
                                <span>Return to Website</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={handleLogout}>
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};
