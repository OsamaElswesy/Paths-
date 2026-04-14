'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Mail, Phone, Building, ShieldCheck, Edit3 } from 'lucide-react';

export default function ProfilePage() {
    const { currentUser } = useAppStore();

    if (!currentUser) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="My Profile"
                description="Manage your personal information and preferences."
                action={<Button className="gap-2"><Edit3 size={16} /> Edit Profile</Button>}
            />

            <div className="grid md:grid-cols-3 gap-8">
                {/* Profile Info Side */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 border-4 border-indigo-50 mb-4 shadow-sm">
                                <AvatarFallback className="bg-indigo-600 text-white text-2xl font-bold">
                                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-bold text-slate-900">{currentUser.name}</h2>
                            <p className="text-indigo-600 font-medium text-sm">{currentUser.role}</p>
                            <div className="mt-4 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                                {currentUser.department}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 px-6 pt-6">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Identity Details</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <ShieldCheck size={18} className="text-green-500" />
                                <div>
                                    <p className="font-medium text-slate-900">Verified System Account</p>
                                    <p className="text-xs">ID: {currentUser.id}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid gap-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                        <Mail size={12} /> Email Address
                                    </span>
                                    <p className="font-medium text-slate-900 underline underline-offset-4 decoration-indigo-200">{currentUser.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                        <Phone size={12} /> Work Phone
                                    </span>
                                    <p className="font-medium text-slate-900">{currentUser.phone}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                        <Building size={12} /> Primary Office
                                    </span>
                                    <p className="font-medium text-slate-900">San Francisco HQ</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Permissions & Access</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="font-medium text-sm text-slate-900">Full Job Creation Access</p>
                                    <p className="text-xs text-slate-500">Allows creating and publishing new job openings.</p>
                                </div>
                                <div className="h-6 w-10 bg-indigo-600 rounded-full relative">
                                    <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="font-medium text-sm text-slate-900">Candidate Email Notifications</p>
                                    <p className="text-xs text-slate-500">Receive alerts when candidates reply to offer emails.</p>
                                </div>
                                <div className="h-6 w-10 bg-indigo-600 rounded-full relative">
                                    <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
