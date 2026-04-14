'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Check, ChevronRight, ChevronLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

// --- Types ---
interface RubricItem {
    id: string;
    criteria: string;
    weight: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface JobFormData {
    title: string;
    department: string;
    location: string;
    type: string;
    description: string;
    rubric: RubricItem[];
}

// --- Steps Config ---
const STEPS = [
    { number: 1, title: "Role Definitions" },
    { number: 2, title: "Fairness Rubric" },
    { number: 3, title: "Review & Publish" },
];

export default function JobWizardPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<JobFormData>({
        title: '',
        department: '',
        location: 'Remote',
        type: 'Full-time',
        description: '',
        rubric: [
            { id: '1', criteria: 'Technical Proficiency', weight: 'High' },
            { id: '2', criteria: 'Communication Skills', weight: 'Medium' }
        ]
    });
    const { addToast } = useToast();
    const { addJob } = useAppStore(); // Get addJob from store
    const router = useRouter();

    // --- Actions ---
    const updateField = (field: keyof JobFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addRubricItem = () => {
        setFormData(prev => ({
            ...prev,
            rubric: [...prev.rubric, { id: Math.random().toString(), criteria: '', weight: 'Medium' }]
        }));
    };

    const removeRubricItem = (id: string) => {
        if (formData.rubric.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.filter(item => item.id !== id)
        }));
    };

    const updateRubricItem = (id: string, field: keyof RubricItem, value: string) => {
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleNext = () => {
        if (currentStep < 3) setCurrentStep(c => c + 1);
        else handlePublish();
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handlePublish = () => {
        // Create new Job object
        const newJob = {
            id: `job-${Math.random().toString(36).substr(2, 9)}`,
            title: formData.title || 'Untitled Job',
            department: formData.department || 'General',
            status: 'Published' as const,
            mode: 'Inbound' as const,
            candidatesCount: 0,
            createdDate: new Date().toISOString().split('T')[0],
            description: formData.description,
            location: formData.location,
            type: formData.type,
            rubric: formData.rubric
        };

        // Add to global store
        addJob(newJob);

        addToast({
            type: 'success',
            message: 'Job Published Successfully!',
            description: 'Candidates can now apply to this role.'
        });
        setTimeout(() => router.push('/jobs'), 1500);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <PageHeader
                title="Create New Job"
                description="Follow the steps to create a bias-free job posting."
            />

            {/* Stepper */}
            <div className="mb-10">
                <div className="flex items-center justify-between relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10" />

                    {STEPS.map((step) => {
                        const isActive = step.number === currentStep;
                        const isCompleted = step.number < currentStep;

                        return (
                            <div key={step.number} className="flex flex-col items-center gap-2 bg-slate-50 px-2 lg:px-6">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2",
                                    isActive ? "bg-indigo-600 text-white border-indigo-600 scale-110 shadow-lg" :
                                        isCompleted ? "bg-green-500 text-white border-green-500" :
                                            "bg-white text-slate-400 border-slate-300"
                                )}>
                                    {isCompleted ? <Check size={18} /> : step.number}
                                </div>
                                <span className={cn(
                                    "text-xs font-semibold uppercase tracking-wider",
                                    isActive ? "text-indigo-600" : "text-slate-400"
                                )}>{step.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Form Content */}
            <Card className="min-h-[500px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="flex-1 p-8">
                    {/* Step 1: Basics */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-semibold text-slate-800 mb-6">Role Definitions</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Input
                                    label="Job Title"
                                    placeholder="e.g. Senior Product Designer"
                                    value={formData.title}
                                    onChange={e => updateField('title', e.target.value)}
                                    autoFocus
                                />
                                <Select
                                    label="Department"
                                    value={formData.department}
                                    onChange={e => updateField('department', e.target.value)}
                                >
                                    <option value="">Select Department...</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Product">Product</option>
                                    <option value="Design">Design</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Marketing">Marketing</option>
                                </Select>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Select
                                    label="Location"
                                    value={formData.location}
                                    onChange={e => updateField('location', e.target.value)}
                                >
                                    <option value="Remote">Remote</option>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="On-site">On-site</option>
                                </Select>
                                <Select
                                    label="Employment Type"
                                    value={formData.type}
                                    onChange={e => updateField('type', e.target.value)}
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Job Description</label>
                                <textarea
                                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Paste your job description here..."
                                    value={formData.description}
                                    onChange={e => updateField('description', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Rubric */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-800">Scoring Rubric</h2>
                                    <p className="text-sm text-slate-500 mt-1">Define the key criteria for this role. Candidates will be scored against these items.</p>
                                </div>
                                <Button size="sm" onClick={addRubricItem} className="gap-2">
                                    <Plus size={16} /> Add Criteria
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formData.rubric.map((item, index) => (
                                    <div key={item.id} className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200 group">
                                        <div className="pt-3 text-slate-400 cursor-move">
                                            <GripVertical size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                label={index === 0 ? "Criteria Name" : undefined}
                                                placeholder="e.g. React.js Experience"
                                                value={item.criteria}
                                                onChange={e => updateRubricItem(item.id, 'criteria', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-40">
                                            <Select
                                                label={index === 0 ? "Weight" : undefined}
                                                value={item.weight}
                                                onChange={e => updateRubricItem(item.id, 'weight', e.target.value)}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                                <option value="Critical">Critical</option>
                                            </Select>
                                        </div>
                                        <div className={cn("pt-2", index === 0 && "pt-8")}>
                                            <Button variant="ghost" size="icon" onClick={() => removeRubricItem(item.id)} className="text-slate-400 hover:text-red-500">
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex gap-3 text-sm text-indigo-700">
                                <Save size={18} className="shrink-0" />
                                <p>Pro Tip: Use specific criteria like "System Design for High Scale" rather than generic "Engineering".</p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 3 && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <h2 className="text-xl font-semibold text-slate-800">Review & Publish</h2>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Job Details</h4>
                                    <p className="text-2xl font-bold text-slate-900">{formData.title || '(Untitled Job)'}</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="outline">{formData.department}</Badge>
                                        <Badge variant="outline">{formData.location}</Badge>
                                        <Badge variant="outline">{formData.type}</Badge>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Scoring Model</h4>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <ul className="space-y-2">
                                            {formData.rubric.map(item => (
                                                <li key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-slate-700">{item.criteria || '(Empty)'}</span>
                                                    <Badge className={cn(
                                                        item.weight === 'Critical' ? 'bg-red-100 text-red-700' :
                                                            item.weight === 'High' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    )}>{item.weight}</Badge>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t p-8 bg-slate-50/50">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="w-32"
                    >
                        <ChevronLeft size={16} className="mr-2" /> Back
                    </Button>
                    <Button
                        onClick={handleNext}
                        className="w-32 bg-indigo-600 hover:bg-indigo-700"
                    >
                        {currentStep === 3 ? 'Publish Job' : 'Next'}
                        {currentStep !== 3 && <ChevronRight size={16} className="ml-2" />}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
