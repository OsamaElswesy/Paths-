'use client';

// Removed 'async' from component since we receive data from client store now
import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Plus, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';

export default function JobsPage() {
    const { jobs } = useAppStore();

    return (
        <div>
            <PageHeader
                title="Jobs"
                description="Manage your open positions and hiring pipelines."
                action={
                    <Link href="/jobs/new">
                        <Button className="gap-2"><Plus size={16} /> Create Job</Button>
                    </Link>
                }
            />

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead className="text-right">Candidates</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/jobs/${job.id}`} className="hover:underline hover:text-indigo-600 block">
                                        {job.title}
                                    </Link>
                                    <span className="text-xs text-slate-400 font-normal md:hidden block">{job.createdDate}</span>
                                </TableCell>
                                <TableCell>{job.department}</TableCell>
                                <TableCell>
                                    <Badge variant={job.status === 'Published' ? 'success' : job.status === 'Draft' ? 'secondary' : 'outline'}>
                                        {job.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500">{job.mode}</TableCell>
                                <TableCell className="text-right font-medium">{job.candidatesCount}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            <DropdownMenuItem>Edit Job</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Close Job</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {jobs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                    No jobs found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
