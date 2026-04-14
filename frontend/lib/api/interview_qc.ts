import { apiClient } from '../apiClient';

export interface QualityFlag {
    check: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    recommendation: string;
}

export interface InterviewQCResult {
    session_id: string;
    interview_type: string | null;
    candidate_name: string | null;
    job_title: string | null;
    notes_word_count: number;
    quality_score: number;              // 0–100
    quality_level: 'poor' | 'adequate' | 'good' | 'excellent';
    quality_flags: QualityFlag[];
    bias_language_detected: string[];
    evidence_markers_found: string[];
    summary: string;
    data_warnings: string[];
}

export const checkInterviewQuality = async (
    sessionId: string,
): Promise<InterviewQCResult> => {
    const response = await apiClient.get(`/interview-qc/${sessionId}`);
    return response.data;
};
