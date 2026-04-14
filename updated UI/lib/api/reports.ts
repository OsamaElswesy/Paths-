import { apiClient } from '../apiClient';
import { REPORT_DATA } from '../mock-data';

export interface ReportMetrics {
    timeToHire: number[];
    sources: { label: string; value: number; color: string }[];
    funnel: { stage: string; count: number }[];
}

export const fetchDashboardReports = async (): Promise<ReportMetrics> => {
    try {
        // TODO: Map to actual `/api/v1/reports/dashboard` aggregation endpoint once built
        const response = await apiClient.get('/reports/dashboard');
        return response.data;
    } catch {
        // DEV NOTE: Backend reports endpoint is not yet implemented.
        // Returning static mock data. This fallback is intentional and visible here —
        // do not silence this in production. Remove fallback once endpoint exists.
        console.warn('[reports] /reports/dashboard not available — using static mock data');
        return REPORT_DATA;
    }
};
