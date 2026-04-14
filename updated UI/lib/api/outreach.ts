import { apiClient } from '../apiClient';

export interface OutreachMessage {
    id: string;
    candidate_id: string;
    candidate_name: string | null;
    job_id: string;
    job_title: string | null;
    channel: 'email' | 'linkedin' | 'sms';
    status: 'draft' | 'queued' | 'sent' | 'failed' | 'opened' | 'replied';
    message_subject: string | null;
    sent_at: string | null;
    created_at: string;
}

export interface JobCandidate {
    candidate_id: string;
    full_name: string;
    email: string | null;
    current_title: string | null;
    location_text: string | null;
    stage_code: string;
    application_id: string;
}

export interface CreateOutreachRequest {
    candidate_id: string;
    job_id: string;
    channel?: 'email' | 'linkedin' | 'sms';
    message_subject?: string;
    message_body?: string;
}

export const fetchOutreachForJob = async (jobId: string): Promise<OutreachMessage[]> => {
    const response = await apiClient.get('/outreach/', { params: { job_id: jobId } });
    return response.data.items ?? [];
};

export const fetchJobCandidates = async (jobId: string): Promise<JobCandidate[]> => {
    const response = await apiClient.get(`/jobs/${jobId}/candidates`);
    return response.data.items ?? [];
};

export const createOutreach = async (body: CreateOutreachRequest): Promise<OutreachMessage> => {
    const response = await apiClient.post('/outreach/', body);
    return response.data;
};

export const updateOutreachStatus = async (
    outreachId: string,
    status: OutreachMessage['status'],
): Promise<void> => {
    await apiClient.patch(`/outreach/${outreachId}/status`, { status });
};
