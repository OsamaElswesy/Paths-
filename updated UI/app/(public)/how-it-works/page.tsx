'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckCircle, Shield, UserX, FileSearch, Send, Calendar, Users, Award, Lock } from 'lucide-react';

const WORKFLOW_STEPS = [
    { title: "Job Creation", icon: FileSearch, description: "Define role requirements, skills, and scoring rubric. Toggle anonymization settings." },
    { title: "Sourcing & Import", icon: Users, description: "Import candidates from ATS or let PATHS source talents matching your criteria." },
    { title: "Anonymization", icon: UserX, description: "All PII (names, photos, schools) is automatically masked to eliminate unconscious bias." },
    { title: "AI Screening", icon: Shield, description: "Candidates are scored against the rubric. Top-K candidates are identified instantly." },
    { title: "Shortlist Review", icon: CheckCircle, description: "Recruiters review the Top-K shortlist. Decisions are made based on skills, not identity." },
    { title: "Identity Reveal", icon: Lock, description: "Identity is revealed only after a candidate is approved for outreach." },
    { title: "Outreach", icon: Send, description: "Automated, personalized outreach campaigns to engaged candidates." },
    { title: "Interviewing", icon: Calendar, description: "Structured interviews with technical and culture-fit scoring packs." },
    { title: "Decision", icon: Award, description: "Data-driven hiring decisions based on aggregated scores and feedback." }
];

export default function HowItWorksPage() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="py-20 text-center container px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-3xl -z-10" />
                <Badge variant="primary" className="mb-6">The PATHS Workflow</Badge>
                <h1 className="h1 text-slate-900 mb-6">From Job Description to <span className="text-indigo-600">Offer Letter</span></h1>
                <p className="max-w-3xl mx-auto text-xl text-slate-500 mb-10">
                    A transparent, 9-step process designed to remove bias and surface the best talent.
                </p>
            </section>

            {/* Workflow Visualization */}
            <section className="py-16 container px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-start">
                    {/* Left: Interactive List */}
                    <div className="space-y-4">
                        {WORKFLOW_STEPS.map((step, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "p-6 rounded-xl border transition-all duration-300 cursor-pointer flex gap-4 items-start group",
                                    activeStep === index
                                        ? "bg-white border-indigo-200 shadow-lg scale-[1.02]"
                                        : "bg-slate-50 border-transparent hover:bg-white hover:shadow-sm"
                                )}
                                onMouseEnter={() => setActiveStep(index)}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                    activeStep === index ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                                )}>
                                    <step.icon size={20} />
                                </div>
                                <div>
                                    <h3 className={cn("text-lg font-semibold mb-1", activeStep === index ? "text-indigo-900" : "text-slate-700")}>
                                        {step.title}
                                    </h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Sticky Preview Panel (Glassmorphism) */}
                    <div className="lg:sticky lg:top-32 hidden lg:block h-fit">
                        <div className="aspect-[4/5] bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center ring-1 ring-slate-900/5">
                            {/* Visuals */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 z-0" />
                            <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />

                            <div key={activeStep} className="relative z-10 glass-card p-10 rounded-2xl max-w-sm w-full mx-auto animate-fade-in-up" style={{ animationDuration: '0.4s' }}>
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform transition-transform hover:scale-110 duration-500">
                                    {React.createElement(WORKFLOW_STEPS[activeStep].icon, { className: "text-white", size: 40 })}
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-4">{WORKFLOW_STEPS[activeStep].title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm">
                                    {WORKFLOW_STEPS[activeStep].description}
                                </p>
                                <div className="mt-8 pt-6 border-t border-slate-200/50 flex justify-center">
                                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100">Step {activeStep + 1}</Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom Cards */}
            <section className="bg-slate-50 py-24 border-t border-slate-200">
                <div className="container px-6 text-center">
                    <h2 className="h2 mb-12 text-slate-900">Fairness Built Into Every Pixel</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold text-lg mb-3">Automatic Anonymization</h3>
                                <p className="text-slate-500 text-sm">Our system automatically parses resumes and masks 15+ PII data points before any human reviewer sees them.</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold text-lg mb-3">Structured Rubrics</h3>
                                <p className="text-slate-500 text-sm">Force reviewers to score based on pre-defined criteria, not gut feeling. Evidence-based hiring.</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold text-lg mb-3">Diversity Analytics</h3>
                                <p className="text-slate-500 text-sm">Track pass-through rates by demographic (anonymously) to identify pipeline leaks.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <section className="py-24 container px-6 text-center">
                <h2 className="h2 mb-8 text-slate-900">Ready to start?</h2>
                <Link href="/contact">
                    <Button size="lg" className="rounded-full px-10 shadow-xl shadow-indigo-200">Request a Demo</Button>
                </Link>
            </section>
        </div>
    );
}
