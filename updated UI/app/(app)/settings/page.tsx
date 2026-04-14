import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
    return (
        <div>
            <PageHeader title="Settings" description="Manage organization preferences and team access." />

            <div className="space-y-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Profile</CardTitle>
                        <CardDescription>General information visible to candidates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input label="Organization Name" defaultValue="Acme Corp" />
                        <Input label="Career Page URL" defaultValue="careers.acme.com" />
                        <div className="flex justify-end">
                            <Button>Save Changes</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Team Management</CardTitle>
                        <CardDescription>Invite members and manage roles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md border border-dashed">
                            Team management UI coming soon.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
