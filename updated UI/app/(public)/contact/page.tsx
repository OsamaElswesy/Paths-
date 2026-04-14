'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { CheckCircle, Mail, MapPin, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export default function ContactPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate submission
        setTimeout(() => setIsSubmitted(true), 800);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center container px-6">
                <div className="text-center max-w-md animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Message Sent!</h2>
                    <p className="text-slate-500 mb-8">
                        Thank you for reaching out. A member of our team will get back to you within 24 hours.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline">Send another message</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container px-6 py-20">
            <div className="max-w-xl mx-auto text-center mb-16">
                <h1 className="h1 text-slate-900 mb-4">Get in touch</h1>
                <p className="text-slate-500 text-lg">
                    Have questions about pricing, features, or enterprise solutions? We're here to help.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
                {/* Contact Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 flex items-start gap-4">
                            <Mail className="text-indigo-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-slate-900">Email</h3>
                                <p className="text-slate-500 text-sm mt-1">support@paths.com</p>
                                <p className="text-slate-500 text-sm">sales@paths.com</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex items-start gap-4">
                            <Phone className="text-indigo-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-slate-900">Phone</h3>
                                <p className="text-slate-500 text-sm mt-1">+1 (555) 123-4567</p>
                                <p className="text-slate-500 text-xs text-slate-400 mt-1">Mon-Fri, 9am-5pm EST</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex items-start gap-4">
                            <MapPin className="text-indigo-600 mt-1" />
                            <div>
                                <h3 className="font-semibold text-slate-900">HQ</h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    123 Innovation Dr.<br />
                                    Tech City, CA 94000
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Form */}
                <div className="lg:col-span-2">
                    <Card className="shadow-lg border-0 ring-1 ring-slate-200">
                        <CardContent className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input label="First Name" placeholder="Jane" required />
                                    <Input label="Last Name" placeholder="Doe" required />
                                </div>
                                <Input label="Work Email" type="email" placeholder="jane@company.com" required />
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input label="Company Name" placeholder="Acme Inc." />
                                    <Select label="Company Size">
                                        <option value="">Select size...</option>
                                        <option value="1-50">1-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-1000">201-1000 employees</option>
                                        <option value="1000+">1000+ employees</option>
                                    </Select>
                                </div>
                                <Textarea label="Message" placeholder="Tell us how we can help..." rows={5} required />

                                <Button type="submit" size="lg" className="w-full">
                                    Send Message
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
