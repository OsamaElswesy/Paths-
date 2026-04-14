import { apiClient } from '../apiClient';
import { Job, MOCK_JOBS } from '../mock-data';

export interface JobIngestionRun {
    id: string;
    source_type: string;
    source_name: string;
    started_at: string;
    finished_at?: string;
    status: string;
    fetched_count: number;
    normalized_count: number;
    inserted_count: number;
    duplicate_count: number;
    failed_count: number;
}

// Maps backend snake_case employment_type to display strings
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    commission: 'Commission',
    internship: 'Internship',
    freelance: 'Freelance',
};

// Maps backend lowercase status to the capitalized union the frontend expects
const toFrontendStatus = (s: string): Job['status'] => {
    const normalized = s.charAt(0).toUpperCase() + s.slice(1);
    if (normalized === 'Published' || normalized === 'Draft' || normalized === 'Closed') {
        return normalized;
    }
    return 'Draft';
};

export const fetchJobRuns = async (): Promise<JobIngestionRun[]> => {
    const response = await apiClient.get('/internal/job-ingestion/runs');
    return response.data;
};

export const fetchJobs = async (): Promise<Job[]> => {
    try {
        const response = await apiClient.get('/jobs');
        const items: any[] = response.data.items ?? [];
        return items.map((item): Job => ({
            id: item.id,
            title: item.title,
            department: item.department ?? '',
            status: toFrontendStatus(item.status ?? 'draft'),
            // manual or absent source_type = recruiter-created (Inbound); scraped = Outbound
            mode: (!item.source_type || item.source_type === 'manual') ? 'Inbound' : 'Outbound',
            candidatesCount: item.candidates_count ?? 0,
            createdDate: item.created_at ? item.created_at.split('T')[0] : '',
            description: item.description_text ?? undefined,
            location: item.location_text ?? undefined,
            type: EMPLOYMENT_TYPE_LABELS[item.employment_type] ?? item.employment_type ?? undefined,
        }));
    } catch {
        // Fallback to mock data when backend is unreachable during development
        return MOCK_JOBS;
    }
};

export const runJobIngestion = async (sourceType: string, targetUrls?: string[]) => {
    const requestBody = {
        source_types: [sourceType],
        target_urls: targetUrls || undefined,
    };
    const response = await apiClient.post('/internal/job-ingestion/run', requestBody);
    return response.data;
};
