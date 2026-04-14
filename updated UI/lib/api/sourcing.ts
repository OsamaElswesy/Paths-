import { apiClient } from '../apiClient';
import { MOCK_ATS_INTEGRATIONS } from '../mock-data';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SourcingCandidate {
    id: string;
    full_name: string;
    current_title: string | null;
    location_text: string | null;
    years_experience: number | null;
    email: string | null;
    skills: string[];
    created_at: string;
}

export interface SourcingSearchResult {
    candidate_id: string;
    candidate_name: string;
    current_title: string | null;
    location: string | null;
    years_experience: number | null;
    email: string | null;
    skills: string[];
    relevance_score: number;        // 0–1 cosine similarity
    matched_excerpts: string[];     // top matching CV text snippets
}

export interface SourcingSearchResponse {
    query: string;
    results: SourcingSearchResult[];
    total_matched: number;
    data_warnings: string[];
    errors: string[];
    status: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch all ingested candidates for the sourcing page initial load.
 * No vector search — straight Postgres list, newest first.
 */
export const fetchSourcedCandidates = async (): Promise<SourcingCandidate[]> => {
    try {
        const response = await apiClient.get('/sourcing/candidates', { params: { limit: 50 } });
        return response.data.items ?? [];
    } catch {
        // Fallback: empty list with no crash — the UI shows a friendly empty state
        return [];
    }
};

/**
 * Run semantic sourcing search against the Qdrant CV vector store.
 * Returns ranked candidates with relevance scores and matched excerpts.
 */
export const searchCandidates = async (
    query: string,
    jobId?: string,
    limit = 10,
): Promise<SourcingSearchResponse> => {
    const response = await apiClient.post('/sourcing/search', {
        query,
        job_id: jobId ?? null,
        limit,
    });
    return response.data;
};

/**
 * Run contact enrichment for a candidate and return what was found/updated.
 */
export const enrichCandidate = async (candidateId: string) => {
    const response = await apiClient.post(`/enrichment/${candidateId}`);
    return response.data;
};

// ATS integrations remain mock — no backend integration exists yet
export const fetchAtsIntegrations = async () => {
    return new Promise((resolve) =>
        setTimeout(() => resolve(MOCK_ATS_INTEGRATIONS), 150),
    );
};

// ── Sourcing Connectors ───────────────────────────────────────────────────────

export interface ConnectorRunSummary {
    run_id: string;
    status: string;
    started_at: string;
    inserted: number;
    duplicates: number;
}

export interface SourcingConnector {
    id: string;
    display_name: string;
    source_type: string;
    is_configured: boolean;
    status: 'active' | 'configured' | 'not_configured';
    description: string;
    job_count: number;
    candidate_count?: number;   // internal only
    board_tokens?: string[];    // greenhouse only
    channels?: string[];        // telegram only
    last_pull: ConnectorRunSummary | null;
}

export interface ConnectorPullRequest {
    board_tokens?: string[];
    channels?: string[];
    max_items?: number;
}

export interface ConnectorPullResponse {
    run_id: string;
    connector_id: string;
    status: string;
    target_count: number;
    message: string;
}

/**
 * Fetch status of all sourcing connectors (internal, greenhouse, telegram).
 */
export const fetchSourcingConnectors = async (): Promise<SourcingConnector[]> => {
    try {
        const response = await apiClient.get('/sourcing/connectors');
        return response.data;
    } catch {
        return [];
    }
};

/**
 * Trigger an import pull from a specific connector.
 * Returns a run_id immediately — the pull happens in the background.
 */
export const triggerConnectorPull = async (
    connectorId: string,
    options?: ConnectorPullRequest,
): Promise<ConnectorPullResponse> => {
    const response = await apiClient.post(
        `/sourcing/connectors/${connectorId}/pull`,
        options ?? {},
    );
    return response.data;
};
