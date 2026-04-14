import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Shield, Users, Target, Rocket } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="container px-6 py-20 space-y-20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                    Our Mission: <span className="text-indigo-600">Fairness at Scale.</span>
                </h1>
                <p className="text-xl text-slate-500 leading-relaxed">
                    At PATHS, we believe that talent is universal, but opportunity is not.
                    We're building the infrastructure to eliminate bias from recruitment and help companies
                    find the best people based on what they can do, not where they come from.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {[
                    {
                        icon: Shield,
                        title: "Managed Anonymity",
                        desc: "We pioneer 'Identity Transition' workflows where PII is only revealed when technical alignment is proven."
                    },
                    {
                        icon: Target,
                        title: "Rubric-First Screening",
                        desc: "Our AI doesn't just scan keywords; it evaluates alignment against structured, objective rubrics."
                    },
                    {
                        icon: Users,
                        title: "Recruiter Empowerment",
                        desc: "We don't replace recruiters; we give them a 10x superpower to focus on human relationships."
                    },
                    {
                        icon: Rocket,
                        title: "Future of Work",
                        desc: "Accelerating the shift towards skills-based hiring in a global, distributed workforce."
                    }
                ].map((item, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300 transition-all">
                        <CardContent className="p-8 space-y-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <item.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center text-white space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <h2 className="text-3xl font-bold relative z-10">Join the Talent Revolution</h2>
                <p className="text-slate-400 max-w-xl mx-auto relative z-10">
                    We're a team of engineers, designers, and psychologists dedicated to fixing hiring.
                </p>
            </div>
        </div>
    );
}
