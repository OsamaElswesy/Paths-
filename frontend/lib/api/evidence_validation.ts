import { apiClient } from '../apiClient';

export interface ValidationFinding {
    check: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    detail: string;
}

export interface EvidenceValidationResult {
    candidate_id: string;
    candidate_name: string | null;
    trust_score: number;                  // 0–100
    validation_status: 'validated' | 'needs_review' | 'flagged';
    critical_count: number;
    warning_count: number;
    info_count: number;
    findings: ValidationFinding[];
    computed_years_experience: number | null;
    claimed_years_experience: number | null;
    summary: string;
    data_warnings: string[];
}

export const validateCandidateEvidence = async (
    candidateId: string,
): Promise<EvidenceValidationResult> => {
    const response = await apiClient.get(`/evidence-validation/${candidateId}`);
    return response.data;
};
