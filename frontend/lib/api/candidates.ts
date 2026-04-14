import { apiClient } from '../apiClient';
import { Candidate, MOCK_CANDIDATES } from '../mock-data';

// Maps backend application stage_code to the frontend stage union
const STAGE_MAP: Record<string, Candidate['stage']> = {
    applied:     'Sourced',
    screened:    'Screened',
    shortlisted: 'Shortlisted',
    revealed:    'Revealed',
    outreach:    'Outreach',
    interview:   'Interview',
    decision:    'Decision',
};

export const fetchAllCandidates = async (): Promise<Candidate[]> => {
    try {
        const response = await apiClient.get('/candidates');
        const items: any[] = response.data.items ?? [];
        return items.map((item): Candidate => ({
            id: item.id,
            jobId: item.job_id ?? 'unknown',
            name: item.full_name,
            stage: STAGE_MAP[item.stage_code] ?? 'Sourced',
            score: 0, // No scoring service yet — tracked as next implementation step
            email: item.email ?? '',
            phone: item.phone ?? '',
            experience: item.years_experience ?? 0,
            location: item.location_text ?? '',
            isIdentityRevealed: false,
        }));
    } catch {
        // Fallback to mock data when backend is unreachable during development
        return MOCK_CANDIDATES;
    }
};

// Fetch a single candidate by ID (existing — kept for individual profile pages)
export const fetchCandidateById = async (candidateId: string): Promise<Candidate> => {
    const response = await apiClient.get(`/candidates/${candidateId}`);
    const data = response.data;
    return {
        id: data.candidate.id,
        jobId: 'unknown',
        name: data.candidate.full_name,
        stage: 'Sourced',
        score: 0,
        email: data.candidate.email ?? '',
        phone: data.candidate.phone ?? '',
        experience: data.candidate.years_experience ?? 0,
        location: data.candidate.location_text ?? '',
        isIdentityRevealed: false,
    };
};
