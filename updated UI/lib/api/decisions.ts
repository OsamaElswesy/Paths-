import { apiClient } from '../apiClient';

export interface DecisionSupportData {
    candidate_id: string;
    job_id: string | null;
    score: number;
    confidence_level: 'low' | 'medium' | 'high';
    recommendation: string;
    skill_score: number;
    experience_score: number;
    profile_completeness_score: number;
    key_factors: string[];
    gap_factors: string[];
    bias_flags: string[];
    data_warnings: string[];
}

export interface FinalizeDecisionRequest {
    job_id: string;
    decision: 'hired' | 'rejected' | 'on_hold';
    actor_id?: string;
    notes?: string;
}

export const fetchDecisionSupportData = async (
    candidateId: string,
    jobId?: string,
): Promise<DecisionSupportData> => {
    const params = jobId ? { job_id: jobId } : {};
    const response = await apiClient.get(`/decisions/${candidateId}`, { params });
    return response.data;
};

export const submitHiringDecision = async (
    candidateId: string,
    body: FinalizeDecisionRequest,
): Promise<{ application_id: string; decision: string; audit_recorded: boolean }> => {
    const response = await apiClient.post(`/decisions/${candidateId}/finalize`, body);
    return response.data;
};
