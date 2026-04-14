import { apiClient } from '../apiClient';
import { User, MOCK_USERS } from '../mock-data';

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        email: string;
        full_name: string;
        account_type: string;
    };
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
};

export const logout = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('paths-token');
    }
};

export const fetchCurrentUser = async (): Promise<User> => {
    try {
        // Backend route is /auth/me, not /users/me
        const response = await apiClient.get('/auth/me');
        const data = response.data;
        return {
            id: data.id || 'u-real',
            name: data.full_name || 'Hiring Manager',
            email: data.email || '',
            role: 'Recruiter', // Temporary mapping until RBAC enum is standardized
            phone: '',
            department: 'HR'
        };
    } catch {
        // Fallback to mock data when unauthenticated
        return MOCK_USERS[0];
    }
};
