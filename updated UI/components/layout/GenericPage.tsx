import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

export default function GenericPlaceholder({ title }: { title: string }) {
    return (
        <div>
            <PageHeader title={title} description={`Manage your ${title.toLowerCase()} here.`} />
            <Card className="border-dashed bg-slate-50 mx-auto py-20 text-center">
                <CardContent>
                    <h3 className="text-lg font-medium text-slate-900">Coming Next Step</h3>
                    <p className="text-slate-500">This feature module is under construction.</p>
                </CardContent>
            </Card>
        </div>
    );
}
