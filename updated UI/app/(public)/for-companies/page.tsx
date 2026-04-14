'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { Check, ArrowRight, Layout, Target, Cpu, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
    "Unlimited Job Postings",
    "Advanced AI Scoring",
    "Automated Outreach",
    "Team Collaboration",
    "Diversity Analytics",
    "Dedicated Account Manager",
    "ATS Integration",
    "Custom Branding"
];

const tiers = [
    {
        name: "Starter",
        price: "$499",
        unit: "/mo",
        description: "Perfect for growing startups hiring 1-5 roles a year.",
        features: features.slice(0, 4),
        cta: "Start Free Trial",
        popular: false
    },
    {
        name: "Growth",
        price: "$1,299",
        unit: "/mo",
        description: "For scaling teams needing robust pipelines and analytics.",
        features: features.slice(0, 6),
        cta: "Get Started",
        popular: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        unit: "",
        description: "Full-scale solution for global organizations.",
        features: features,
        cta: "Contact Sales",
        popular: false
    }
];

export default function ForCompaniesPage() {
    return (
        <div className="bg-white overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-24 pb-32 text-center container px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] -z-10 mix-blend-multiply opacity-70 animate-float" />

                <div className="animate-fade-in-up">
                    <Badge variant="primary" className="mb-8 px-5 py-2 text-xs font-bold uppercase tracking-widest bg-purple-50 text-purple-700 border-purple-100 shadow-sm">
                        Built for Elite Hiring Teams
                    </Badge>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 max-w-5xl mx-auto tracking-tight animate-fade-in-up delay-100 leading-[1.1]">
                    Hire Smarter. <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Scale Faster.</span><br />
                    With PATHS.
                </h1>

                <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-12 leading-relaxed animate-fade-in-up delay-200">
                    The world's first recruitment platform that combines managed anonymity
                    with AI-powered rubric alignment to deliver 10x talent quality.
                </p>

                <div className="flex flex-wrap justify-center gap-5 animate-fade-in-up delay-300">
                    <Link href="/contact">
                        <Button size="lg" className="h-14 px-10 rounded-full text-lg shadow-2xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-500 transition-all hover:-translate-y-1">
                            Request a Demo <ArrowRight size={20} className="ml-2" />
                        </Button>
                    </Link>
                    <Link href="#pricing">
                        <Button variant="outline" size="lg" className="h-14 px-10 rounded-full text-lg bg-white border-slate-200 hover:bg-slate-50">
                            View Pricing
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Pipeline Overview Section */}
            <section className="py-32 container px-6 grid lg:grid-cols-2 gap-20 items-center border-t border-slate-100">
                <div className="space-y-8">
                    <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                        <Layout size={32} />
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                        A pipeline that <span className="text-gradient">actually flows.</span>
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Say goodbye to messy spreadsheets and disorganized ATS stages.
                        Our 9-step workforce architecture ensures every candidate moves
                        through a structured, objective, and transparent journey.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div>
                            <p className="font-bold text-slate-900 mb-2">9-Step Architecture</p>
                            <p className="text-sm text-slate-500">From Define to Decide, every stage is optimized for speed.</p>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 mb-2">Automated Stepper</p>
                            <p className="text-sm text-slate-500">Never lose track of where a candidate is in the pipeline.</p>
                        </div>
                    </div>
                </div>
                <div className="relative group">
                    <div className="absolute -inset-4 bg-purple-500/10 blur-[100px] rounded-full pointing-events-none"></div>
                    <div className="relative rounded-3xl border border-slate-200 p-2 shadow-2xl bg-white overflow-hidden transition-all duration-500 hover:scale-[1.01]">
                        <Image
                            src="/images/company-pipeline.png"
                            alt="Enterprise Pipeline Overview"
                            width={1000}
                            height={800}
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            </section>

            {/* AI Rubric Section */}
            <section className="py-32 bg-slate-50 relative overflow-hidden">
                <div className="container px-6 grid lg:grid-cols-2 gap-20 items-center">
                    <div className="relative group lg:order-2">
                        <div className="absolute -inset-4 bg-indigo-500/10 blur-[100px] rounded-full pointing-events-none"></div>
                        <div className="relative rounded-3xl border border-slate-200 p-2 shadow-2xl bg-white overflow-hidden transition-all duration-500 hover:scale-[1.01]">
                            <Image
                                src="/images/company-rubric.png"
                                alt="AI Rubric Builder"
                                width={1000}
                                height={800}
                                className="w-full h-auto"
                            />
                        </div>
                    </div>
                    <div className="space-y-8 lg:order-1">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <Target size={32} />
                        </div>
                        <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                            Define excellence with <span className="text-indigo-600">AI Rubrics.</span>
                        </h2>
                        <p className="text-lg text-slate-500 leading-relaxed">
                            Stop hiring based on gut feelings. Our AI Rubric Builder allows you
                            to define exactly what you're looking for, set weights for different skills,
                            and let the AI objectively score every applicant.
                        </p>
                        <div className="space-y-4">
                            {[
                                "Custom weightage for technical & soft skills",
                                "AI-generated interview questions based on rubrics",
                                "Objective scoring to eliminate personal bias",
                                "Seamless collaboration across hiring managers"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <Check size={14} />
                                    </div>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-32 container px-6" id="pricing">
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-4xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto">Choose the plan that fits your organization's hiring volume.</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                    {tiers.map((tier) => (
                        <Card key={tier.name} className={cn(
                            "relative flex flex-col transition-all duration-500 overflow-visible",
                            tier.popular
                                ? "border-indigo-500 shadow-2xl scale-105 z-10 bg-white ring-4 ring-indigo-50"
                                : "border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 bg-white"
                        )}>
                            {tier.popular && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-5 py-1.5 shadow-xl shadow-indigo-500/20 uppercase text-[10px] font-black tracking-widest">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}
                            <CardContent className="p-10 space-y-8 h-full flex flex-col">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{tier.name}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{tier.description}</p>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{tier.price}</span>
                                    <span className="text-slate-400 font-bold text-lg">{tier.unit}</span>
                                </div>

                                <div className="flex-1 space-y-4 pt-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">What's included</p>
                                    <ul className="space-y-4">
                                        {tier.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                                                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check size={12} className="text-green-600" />
                                                </div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Link href={tier.cta === "Contact Sales" ? "/contact" : "/login"}>
                                    <Button
                                        variant={tier.popular ? "primary" : "outline"}
                                        className={cn(
                                            "w-full h-14 text-base rounded-full font-bold transition-all",
                                            tier.popular ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "hover:bg-slate-50"
                                        )}
                                    >
                                        {tier.cta}
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-6 bg-slate-900 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <div className="container max-w-4xl mx-auto relative z-10 space-y-10">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Transform your hiring culture.</h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">Join the world's most innovative companies and start hiring based on evidence, not ego.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-5 pt-4">
                        <Link href="/login">
                            <Button size="lg" className="bg-white text-indigo-900 hover:bg-indigo-50 h-16 px-12 text-lg rounded-full font-bold shadow-2xl">Start Your 14-Day Trial</Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-white/5 h-16 px-12 text-lg rounded-full">Book Strategy Call</Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

