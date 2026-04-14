import { apiClient } from '../apiClient';

export interface BiasFlag {
    check: string;
    category: string;
    risk_level: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
}

export interface BiasAuditResult {
    candidate_id: string;
    job_id: string | null;
    candidate_name: string | null;
    fairness_score: number;             // 0–100 (100 = no signals)
    overall_risk: 'low' | 'medium' | 'high';
    requires_blind_review: boolean;
    bias_flags: BiasFlag[];
    biased_job_language: string[];
    prestige_institutions: string[];
    summary: string;
    data_warnings: string[];
}

export const runBiasAudit = async (
    candidateId: string,
    jobId?: string,
): Promise<BiasAuditResult> => {
    const params = jobId ? { job_id: jobId } : undefined;
    const response = await apiClient.get(`/bias-audit/${candidateId}`, { params });
    return response.data;
};
