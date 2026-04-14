import { apiClient } from '../apiClient';

export interface AssessmentQuestion {
    id: string;
    skill: string;
    question: string;
    difficulty: 'easy' | 'medium' | 'hard';
    is_required: boolean;
    expected_keywords: string[];
}

export interface AssessmentAnswer {
    question_id: string;
    answer_text: string;
}

export interface QuestionDetail {
    question_id: string;
    question: string;
    skill: string;
    difficulty: string;
    answer_text: string;
    score: number;
    matched_keywords: string[];
    missed_keywords: string[];
}

export interface AssessmentSession {
    id: string;
    candidateId: string;
    candidateName: string | null;
    jobId: string;
    jobTitle: string | null;
    status: 'pending' | 'in_progress' | 'submitted' | 'scored' | 'cancelled';
    assessmentType: string;
    questions: AssessmentQuestion[];
    answers: AssessmentAnswer[];
    questionScores: Record<string, number>;
    overallScore: number | null;
    result: 'pass' | 'borderline' | 'fail' | null;
    summary: string | null;
    strengths: string[];
    gaps: string[];
    createdAt: string;
}

export interface AssessmentScoreResult extends AssessmentSession {
    question_details: QuestionDetail[];
    data_warnings: string[];
}

export const createAssessment = async (
    candidate_id: string,
    job_id: string,
    assessment_type: 'technical' | 'domain' | 'mixed' = 'technical',
    max_questions: number = 5,
): Promise<AssessmentSession> => {
    const response = await apiClient.post('/assessments/', {
        candidate_id,
        job_id,
        assessment_type,
        max_questions,
    });
    return response.data;
};

export const fetchAssessments = async (params?: {
    candidate_id?: string;
    job_id?: string;
}): Promise<AssessmentSession[]> => {
    const response = await apiClient.get('/assessments/', { params });
    return response.data.items ?? [];
};

export const fetchAssessment = async (sessionId: string): Promise<AssessmentSession> => {
    const response = await apiClient.get(`/assessments/${sessionId}`);
    return response.data;
};

export const submitAssessmentAnswers = async (
    sessionId: string,
    answers: AssessmentAnswer[],
): Promise<AssessmentScoreResult> => {
    const response = await apiClient.post(`/assessments/${sessionId}/submit`, { answers });
    return response.data;
};

export const cancelAssessment = async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/assessments/${sessionId}`);
};
