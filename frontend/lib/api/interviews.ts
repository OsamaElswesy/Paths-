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

export interface ScoreInterviewRequest {
    overall_score: number;             // 0–100
    feedback_text?: string;
    strengths?: string[];
    concerns?: string[];
    recommendation?: 'proceed' | 'hold' | 'reject';
    scored_by?: 'hr_agent' | 'technical_agent' | 'recruiter';
    dimension_scores?: Record<string, number>;
}

export interface AgentEvaluationRequest {
    interview_notes: string;
    structured_answers?: Array<{ question: string; answer: string; expected_answer?: string }>;
}

export interface ScoredInterview extends Interview {
    overallScore: number | null;
    dimensionScores: Record<string, number> | null;
    feedbackText: string | null;
    strengths: string[];
    concerns: string[];
    recommendation: 'proceed' | 'hold' | 'reject' | null;
    scoredBy: string | null;
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

const toScoredInterview = (item: any): ScoredInterview => ({
    ...toInterview(item),
    overallScore: item.overallScore ?? null,
    dimensionScores: item.dimensionScores ?? null,
    feedbackText: item.feedbackText ?? null,
    strengths: item.strengths ?? [],
    concerns: item.concerns ?? [],
    recommendation: item.recommendation ?? null,
    scoredBy: item.scoredBy ?? null,
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

/**
 * Submit a manual evaluation score for an interview session.
 * Sets status to 'completed' automatically.
 */
export const scoreInterview = async (
    sessionId: string,
    body: ScoreInterviewRequest,
): Promise<ScoredInterview> => {
    const response = await apiClient.post(`/interviews/${sessionId}/score`, body);
    return toScoredInterview(response.data);
};

/**
 * Run the HR Interview Agent to evaluate the session from recruiter notes.
 * Returns scored session with dimensions: communication, culture_fit, motivation, clarity.
 */
export const evaluateHRInterview = async (
    sessionId: string,
    body: AgentEvaluationRequest,
): Promise<ScoredInterview & { agent: string; data_warnings: string[] }> => {
    const response = await apiClient.post(`/interviews/${sessionId}/evaluate/hr`, body);
    return {
        ...toScoredInterview(response.data),
        agent: response.data.agent,
        data_warnings: response.data.data_warnings ?? [],
    };
};

/**
 * Run the Technical Interview Agent to evaluate the session from recruiter notes.
 * Returns scored session with dimensions: technical_depth, problem_solving, code_quality,
 * domain_knowledge, skill_coverage — plus matched/missing skills.
 */
export const evaluateTechnicalInterview = async (
    sessionId: string,
    body: AgentEvaluationRequest,
): Promise<ScoredInterview & { agent: string; matched_skills: string[]; missing_skills: string[]; data_warnings: string[] }> => {
    const response = await apiClient.post(`/interviews/${sessionId}/evaluate/technical`, body);
    return {
        ...toScoredInterview(response.data),
        agent: response.data.agent,
        matched_skills: response.data.matched_skills ?? [],
        missing_skills: response.data.missing_skills ?? [],
        data_warnings: response.data.data_warnings ?? [],
    };
};
