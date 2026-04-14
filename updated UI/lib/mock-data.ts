export interface Organization {
    id: string;
    name: string;
    logoInitial: string;
}

export const MOCK_ORGS: Organization[] = [
    { id: 'org-1', name: 'Acme Corp', logoInitial: 'A' },
    { id: 'org-2', name: 'Beta Inc', logoInitial: 'B' },
];

export interface RubricItem {
    id: string;
    criteria: string;
    weight: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface Job {
    id: string;
    title: string;
    department: string;
    status: 'Published' | 'Draft' | 'Closed';
    mode: 'Inbound' | 'Outbound';
    candidatesCount: number;
    createdDate: string;
    description?: string;
    location?: string;
    type?: string;
    rubric?: RubricItem[];
}

export const MOCK_JOBS: Job[] = [
    {
        id: 'job-1',
        title: 'Senior Frontend Engineer',
        department: 'Engineering',
        status: 'Published',
        mode: 'Inbound',
        candidatesCount: 45,
        createdDate: '2023-10-01',
        location: 'Remote',
        type: 'Full-time',
        description: 'We are looking for an experienced Frontend Engineer to lead our core product team. You will be working with React, Next.js, and TailwindCSS to build beautiful, accessible user interfaces.',
        rubric: [
            { id: '1', criteria: 'React.js Proficiency', weight: 'Critical' },
            { id: '2', criteria: 'System Design', weight: 'High' }
        ]
    },
    {
        id: 'job-2',
        title: 'Product Manager',
        department: 'Product',
        status: 'Draft',
        mode: 'Inbound',
        candidatesCount: 0,
        createdDate: '2023-10-05',
        location: 'Hybrid',
        type: 'Full-time',
        description: 'Join our product team to drive the vision and strategy for our new enterprise features.',
        rubric: []
    },
    {
        id: 'job-3',
        title: 'Sales Representative',
        department: 'Sales',
        status: 'Published',
        mode: 'Outbound',
        candidatesCount: 12,
        createdDate: '2023-09-20',
        location: 'On-site',
        type: 'Commission',
        description: 'We need a high-energy Sales Representative to expand our reach in the North American market.',
        rubric: []
    },
    {
        id: 'job-4',
        title: 'Marketing Specialist',
        department: 'Marketing',
        status: 'Closed',
        mode: 'Inbound',
        candidatesCount: 89,
        createdDate: '2023-08-15',
        description: 'Lead our content marketing initiatives.',
    },
    {
        id: 'job-5',
        title: 'Backend Developer',
        department: 'Engineering',
        status: 'Published',
        mode: 'Inbound',
        candidatesCount: 23,
        createdDate: '2023-10-10',
        location: 'Remote',
        type: 'Contract',
        description: 'Build robust APIs and microservices using Node.js and Go.'
    },
    {
        id: 'job-6',
        title: 'HR Coordinator',
        department: 'HR',
        status: 'Draft',
        mode: 'Inbound',
        candidatesCount: 0,
        createdDate: '2023-10-12',
        description: 'Support our growing team with onboarding and employee relations.'
    },
];

export interface Candidate {
    id: string;
    jobId: string;
    name: string;
    stage: 'Sourced' | 'Screened' | 'Shortlisted' | 'Revealed' | 'Outreach' | 'Interview' | 'Decision';
    score: number;
    email: string;
    phone: string;
    experience: number;
    location: string;
    isIdentityRevealed: boolean;
}

export interface Interview {
    id: string;
    candidateId: string;
    candidateName: string;
    jobTitle: string;
    date: string; // ISO Date
    time: string; // 10:00 AM
    type: 'Screening' | 'Technical' | 'Behavioral' | 'Final';
    status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Needs Scoring';
    interviewers: string[];
    meetingLink?: string;
}

export const MOCK_INTERVIEWS: Interview[] = [
    {
        id: 'int-1',
        candidateId: 'c1',
        candidateName: 'John Frontend',
        jobTitle: 'Senior Frontend Engineer',
        date: '2023-10-26',
        time: '10:00 AM',
        type: 'Technical',
        status: 'Scheduled',
        interviewers: ['Jane Doe', 'Tech Lead'],
        meetingLink: 'https://meet.google.com/abc-defg-hij'
    },
    {
        id: 'int-2',
        candidateId: 'c2',
        candidateName: 'Sarah Product',
        jobTitle: 'Product Manager',
        date: '2023-10-26',
        time: '02:00 PM',
        type: 'Screening',
        status: 'Scheduled',
        interviewers: ['Jane Doe'],
        meetingLink: 'https://meet.google.com/xyz-123'
    },
    {
        id: 'int-3',
        candidateId: 'c3',
        candidateName: 'Mike Sales',
        jobTitle: 'Sales Representative',
        date: '2023-10-25',
        time: '11:00 AM',
        type: 'Behavioral',
        status: 'Needs Scoring',
        interviewers: ['Jane Doe', 'VP Sales']
    },
    {
        id: 'int-4',
        candidateId: 'c1',
        candidateName: 'John Frontend',
        jobTitle: 'Senior Frontend Engineer',
        date: '2023-10-20',
        time: '09:00 AM',
        type: 'Screening',
        status: 'Completed',
        interviewers: ['Recruiter A']
    }
];

export const REPORT_DATA = {
    timeToHire: [12, 14, 18, 15, 12, 10], // Last 6 months days
    sources: [
        { label: 'LinkedIn', value: 45, color: 'bg-blue-600' },
        { label: 'Direct', value: 30, color: 'bg-green-500' },
        { label: 'Referral', value: 15, color: 'bg-purple-500' },
        { label: 'Agency', value: 10, color: 'bg-orange-500' }
    ],
    funnel: [
        { stage: 'Applied', count: 450 },
        { stage: 'Screen', count: 120 },
        { stage: 'Interview', count: 45 },
        { stage: 'Offer', count: 18 },
        { stage: 'Hired', count: 12 }
    ]
};

export interface User {
    id: string;
    name: string;
    role: 'Admin' | 'Recruiter' | 'Hiring Manager';
    email: string;
    phone: string;
    avatar?: string;
    department: string;
}

export const MOCK_USERS: User[] = [
    {
        id: 'u-1',
        name: 'Alex Recruiter',
        role: 'Recruiter',
        email: 'alex@paths.com',
        phone: '+1 (555) 123-4567',
        department: 'People Ops'
    },
    {
        id: 'u-2',
        name: 'Sarah Admin',
        role: 'Admin',
        email: 'sarah.admin@paths.com',
        phone: '+1 (555) 987-6543',
        department: 'Operations'
    }
];

export interface Candidate {
    id: string;
    jobId: string;
    name: string; // Used for search, blocked in UI if anonymized
    stage: 'Sourced' | 'Screened' | 'Shortlisted' | 'Revealed' | 'Outreach' | 'Interview' | 'Decision';
    score: number;
    email: string; // Added
    phone: string; // Added
    experience: number; // Years
    location: string;
    isIdentityRevealed: boolean;
}

export const MOCK_CANDIDATES: Candidate[] = [
    {
        id: 'cand-1',
        jobId: 'job-1',
        name: 'Candidate 101',
        stage: 'Screened',
        score: 85,
        email: 'cand101@example.com',
        phone: '+1 (555) 111-2222',
        experience: 5,
        location: 'New York, NY',
        isIdentityRevealed: false
    },
    {
        id: 'cand-2',
        jobId: 'job-1',
        name: 'Candidate 102',
        stage: 'Shortlisted',
        score: 92,
        email: 'cand102@example.com',
        phone: '+1 (555) 333-4444',
        experience: 8,
        location: 'Remote',
        isIdentityRevealed: false
    },
    {
        id: 'cand-3',
        jobId: 'job-1',
        name: 'Candidate 103',
        stage: 'Sourced',
        score: 60,
        email: 'cand103@example.com',
        phone: '+1 (555) 555-6666',
        experience: 2,
        location: 'Austin, TX',
        isIdentityRevealed: false
    },
    {
        id: 'cand-4',
        jobId: 'job-2',
        name: 'Candidate 201',
        stage: 'Decision',
        score: 95,
        email: 'cand201@example.com',
        phone: '+1 (555) 777-8888',
        experience: 10,
        location: 'San Francisco, CA',
        isIdentityRevealed: true
    },
    {
        id: 'cand-5',
        jobId: 'job-5',
        name: 'Candidate 301',
        stage: 'Decision',
        score: 98,
        email: 'cand301@example.com',
        phone: '+1 (555) 999-0000',
        experience: 7,
        location: 'Remote',
        isIdentityRevealed: true
    },
    {
        id: 'cand-6',
        jobId: 'job-5',
        name: 'Candidate 302',
        stage: 'Interview',
        score: 88,
        email: 'cand302@example.com',
        phone: '+1 (555) 111-2222',
        experience: 4,
        location: 'Chicago, IL',
        isIdentityRevealed: true
    },
    {
        id: 'cand-7',
        jobId: 'job-4',
        name: 'Candidate 401',
        stage: 'Sourced',
        score: 60,
        email: 'cand401@example.com',
        phone: '+1 (555) 333-4444',
        experience: 3,
        location: 'Seattle, WA',
        isIdentityRevealed: false
    },
    {
        id: 'cand-8',
        jobId: 'job-1',
        name: 'Candidate 104',
        stage: 'Screened',
        score: 78,
        email: 'cand104@example.com',
        phone: '+1 (555) 555-6666',
        experience: 6,
        location: 'Boston, MA',
        isIdentityRevealed: false
    },
    {
        id: 'cand-9',
        jobId: 'job-3',
        name: 'Candidate 202',
        stage: 'Sourced',
        score: 72,
        email: 'cand202@example.com',
        phone: '+1 (555) 777-8888',
        experience: 1,
        location: 'Miami, FL',
        isIdentityRevealed: false
    },
    {
        id: 'cand-10',
        jobId: 'job-5',
        name: 'Candidate 303',
        stage: 'Screened',
        score: 81,
        email: 'cand303@example.com',
        phone: '+1 (555) 999-0000',
        experience: 9,
        location: 'Denver, CO',
        isIdentityRevealed: false
    },
];

export interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'notif-1', title: 'New Candidate', description: 'Candidate 105 applied for Senior Frontend Engineer', time: '10m ago', read: false },
    { id: 'notif-2', title: 'Interview Scheduled', description: 'Round 1 with Candidate 102 confirmed', time: '1h ago', read: false },
    { id: 'notif-3', title: 'Shortlist Approved', description: 'Hiring Manager approved Shortlist #42', time: '2h ago', read: true },
    { id: 'notif-4', title: 'System Update', description: 'Maintenance scheduled for Saturday', time: '1d ago', read: true },
    { id: 'notif-5', title: 'New Comment', description: 'HM commented on Candidate 102', time: '1d ago', read: true },
    { id: 'notif-6', title: 'Job Published', description: 'Sales Representative job is now live', time: '2d ago', read: true },
];

export interface ATSIntegration {
    id: string;
    name: string;
    status: 'Connected' | 'Not Connected';
    icon: string;
    lastImport?: string;
}

export const MOCK_ATS_INTEGRATIONS: ATSIntegration[] = [
    { id: 'ats-1', name: 'LinkedIn Recruiter', status: 'Connected', icon: 'linkedin', lastImport: '2 hrs ago' },
    { id: 'ats-2', name: 'Greenhouse', status: 'Not Connected', icon: 'greenhouse' },
    { id: 'ats-3', name: 'Lever', status: 'Not Connected', icon: 'lever' },
    { id: 'ats-4', name: 'Workday', status: 'Not Connected', icon: 'workday' }
];

export const MOCK_SOURCED_CANDIDATES: Partial<Candidate>[] = [
    { id: 'sc-1', name: 'Alice Tech', email: 'alice.tech@sourced.com', score: 98, experience: 8, location: 'London, UK' },
    { id: 'sc-2', name: 'Bob Backend', email: 'bob.be@sourced.com', score: 94, experience: 6, location: 'Berlin, DE' },
    { id: 'sc-3', name: 'Charlie Cloud', email: 'charlie.c@sourced.com', score: 89, experience: 12, location: 'Remote' },
    { id: 'sc-4', name: 'Diana Design', email: 'diana.d@sourced.com', score: 87, experience: 4, location: 'New York, US' }
];
