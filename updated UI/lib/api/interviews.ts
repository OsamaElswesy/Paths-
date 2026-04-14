import { apiClient } from '../apiClient';
import { MOCK_INTERVIEWS, Interview } from '../mock-data';

export type { Interview };

export interface CreateInterviewRequest {
    candidate_id: string;
    job_id: string;
    interview_type?: 'screening' | 'technical' | 'behavioral' | 'final';
    scheduled_date: string;   // YYYY-MM-DD
    scheduled_time: string;   // "10:00 AM"
    duration_minutes?: number;
    meeting_link?: string;
    interviewers?: string[];
    notes?: string;
}

// Map backend response shape to the frontend Interview type
const toInterview = (item: any): Interview => ({
    id: item.id,
    candidateId: item.candidateId,
    candidateName: item.candidateName ?? 'Unknown',
    jobTitle: item.jobTitle ?? 'Unknown Role',
    date: item.date,
    time: item.time,
    type: item.type as Interview['type'],
    status: item.status as Interview['status'],
    interviewers: item.interviewers ?? [],
    meetingLink: item.meetingLink ?? undefined,
});

export const fetchInterviews = async (): Promise<Interview[]> => {
    try {
        const response = await apiClient.get('/interviews/');
        const items: any[] = response.data.items ?? [];
        return items.map(toInterview);
    } catch {
        // Fallback to mock data when backend is unreachable during development
        return MOCK_INTERVIEWS;
    }
};

export const fetchInterviewsForJob = async (jobId: string): Promise<Interview[]> => {
    try {
        const response = await apiClient.get('/interviews/', { params: { job_id: jobId } });
        const items: any[] = response.data.items ?? [];
        return items.map(toInterview);
    } catch {
        return [];
    }
};

export const scheduleInterview = async (body: CreateInterviewRequest): Promise<Interview> => {
    const response = await apiClient.post('/interviews/', body);
    return toInterview(response.data);
};

export const updateInterviewStatus = async (
    sessionId: string,
    status: 'scheduled' | 'completed' | 'cancelled' | 'needs_scoring',
): Promise<void> => {
    await apiClient.patch(`/interviews/${sessionId}/status`, { status });
};
