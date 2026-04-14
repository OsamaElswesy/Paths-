'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { FileText, Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Candidate, User } from '@/lib/mock-data';

type EmailType = 'Offer' | 'Rejection' | 'Update';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidate: Candidate;
    sender: User;
    type: EmailType;
    onSend: () => void;
}

const TEMPLATES: Record<EmailType, (name: string) => { subject: string, body: string }> = {
    'Offer': (name) => ({
        subject: `Offer of Employment - ${name}`,
        body: `Dear ${name},\n\nWe are pleased to offer you the position of Senior Frontend Engineer at PATHS. Please find the attached offer letter outlining the terms and conditions of your employment.\n\nWe look forward to welcoming you to the team!\n\nBest regards,\nThe Hiring Team`
    }),
    'Rejection': (name) => ({
        subject: `Update on your application - ${name}`,
        body: `Dear ${name},\n\nThank you for giving us the opportunity to consider you for the position. While we were impressed with your background, we have decided to move forward with other candidates.\n\nWe have attached a detailed feedback report customized for you based on our interview rubric. We hope this helps in your future endeavors.\n\nBest wishes,\nThe Hiring Team`
    }),
    'Update': (name) => ({
        subject: `Interview Invitation - ${name}`,
        body: `Dear ${name},\n\nWe would like to invite you to the next stage of our interview process. Please let us know your availability for next week.\n\nBest,\nRecruiting`
    })
};

export const EmailModal = ({ isOpen, onClose, candidate, sender, type, onSend }: EmailModalProps) => {
    const template = TEMPLATES[type](candidate.name);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setSubject(template.subject);
            setBody(template.body);
        }
    }, [isOpen, type, candidate.name]);

    const handleSend = () => {
        onSend();
        addToast({
            type: 'success',
            message: 'Email sent successfully!',
            description: `Sent to ${candidate.email}`
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Send Email</DialogTitle>
                    <DialogDescription>Review full details before sending.</DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 p-4 rounded-md border border-slate-100 space-y-2 text-sm">
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                        <span className="font-semibold text-slate-500 text-right">From:</span>
                        <span className="text-slate-900">{sender.name} &lt;{sender.email}&gt;</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                        <span className="font-semibold text-slate-500 text-right">To:</span>
                        <span className="text-slate-900">{candidate.name} &lt;{candidate.email}&gt;</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                        <span className="font-semibold text-slate-500 text-right">CC:</span>
                        <span className="text-slate-400 italic">Hiring Team; {sender.department}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-slate-500 uppercase">Phone</span>
                            <p className="font-medium">{candidate.phone}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase">Location</span>
                            <p className="font-medium">{candidate.location}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Subject</label>
                        <Input value={subject} onChange={e => setSubject(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Message</label>
                        <textarea
                            className="w-full h-60 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                    </div>

                    {type !== 'Update' && (
                        <div className="bg-white border border-slate-200 rounded-md p-3 flex items-center gap-3 shadow-sm">
                            <div className="h-10 w-10 bg-red-50 text-red-600 rounded flex items-center justify-center shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {type === 'Offer' ? 'Offer_Letter.pdf' : 'Feedback_Report.pdf'}
                                </p>
                                <p className="text-xs text-slate-500">Generated for {candidate.name}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-400">
                                <Paperclip size={16} />
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSend} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                        <Send size={16} /> Send to {candidate.email}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
