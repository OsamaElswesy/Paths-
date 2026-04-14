'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Job, Candidate, User, UserRole, MOCK_USERS } from './mock-data';
export type { UserRole };
import { fetchJobs } from './api/jobs';
import { fetchAllCandidates } from './api/candidates';
import { fetchCurrentUser } from './api/auth';

interface AppState {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    userRole: UserRole;
    setUserRole: (role: UserRole) => void;
    notifications: any[];
    markAllRead: () => void;
    jobs: Job[];
    addJob: (job: Job) => void;
    candidates: Candidate[];
    updateCandidateStatus: (id: string, newStatus: Candidate['stage']) => void;
    currentUser: User;
    isAnonymized: boolean;
    toggleAnonymization: () => void;
    // isLoading is kept for compatibility but no longer blocks page rendering.
    // Pages should render their shell immediately and show inline skeleton/empty states.
    isLoading: boolean;
    // backendReachable: null = unknown (initial), true = ok, false = unreachable
    backendReachable: boolean | null;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userRole, setUserRole] = useState<UserRole>('RECRUITER');
    const [jobs, setJobs] = useState<Job[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
    const [isAnonymized, setIsAnonymized] = useState(false);
    // isLoading only tracks whether the initial parallel fetch is still in flight.
    // It is NOT used to block page rendering — pages must render their shell immediately.
    const [isLoading, setIsLoading] = useState(false);
    const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
    const { addToast } = useToast();

    // Load sidebar state from localStorage on mount (client-only)
    useEffect(() => {
        const savedState = localStorage.getItem('paths-sidebar-state');
        if (savedState !== null) {
            setSidebarOpen(JSON.parse(savedState));
        }
    }, []);

    // Fetch initial data in a non-blocking, parallel way.
    // Failures are logged visibly instead of being swallowed silently.
    // Pages already receive mock data from each api/ function on failure —
    // this effect just populates the global store with live data when backend is up.
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [fetchedJobs, fetchedCandidates, fetchedUser] = await Promise.all([
                    fetchJobs(),
                    fetchAllCandidates(),
                    fetchCurrentUser(),
                ]);
                setJobs(fetchedJobs);
                setCandidates(fetchedCandidates);
                setCurrentUser(fetchedUser);
                setBackendReachable(true);
            } catch (error) {
                // DEV NOTE: This means the backend is down or returned an unexpected error.
                // Individual api/ functions already return mock data, so the UI still works.
                // This toast is intentionally visible so developers know they are in mock mode.
                console.error('[store] Initial data load failed — running on mock data:', error);
                setBackendReachable(false);
                addToast({
                    type: 'error',
                    message: 'Backend unreachable',
                    description: 'Running on mock data. Start the FastAPI server on port 8080.',
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleAnonymization = () => {
        setIsAnonymized(prev => !prev);
        addToast({
            type: 'info',
            message: !isAnonymized ? 'Anonymization Enabled' : 'Anonymization Disabled',
            description: !isAnonymized
                ? 'Candidate names and PII are now masked to eliminate bias.'
                : 'Candidate details are now visible.',
        });
    };

    const toggleSidebar = () => {
        setSidebarOpen(prev => {
            const newState = !prev;
            localStorage.setItem('paths-sidebar-state', JSON.stringify(newState));
            return newState;
        });
    };

    const setRole = (role: UserRole) => {
        setUserRole(role);
        addToast({ type: 'info', message: `Role switched to ${role}`, duration: 2000 });
    };

    const markAllRead = () => {
        addToast({ type: 'success', message: 'All notifications marked as read', duration: 2000 });
    };

    const addJob = (job: Job) => {
        setJobs(prev => [job, ...prev]);
    };

    const updateCandidateStatus = (id: string, newStatus: Candidate['stage']) => {
        setCandidates(prev => prev.map(c => (c.id === id ? { ...c, stage: newStatus } : c)));
        addToast({ type: 'success', message: 'Candidate status updated', duration: 1500 });
    };

    return (
        <AppContext.Provider
            value={{
                sidebarOpen,
                toggleSidebar,
                userRole,
                setUserRole: setRole,
                notifications: [],
                markAllRead,
                jobs,
                addJob,
                candidates,
                updateCandidateStatus,
                currentUser,
                isAnonymized,
                toggleAnonymization,
                isLoading,
                backendReachable,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppStore = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppStore must be used within AppProvider');
    return context;
};
