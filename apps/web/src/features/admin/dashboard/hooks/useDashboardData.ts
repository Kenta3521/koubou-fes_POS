import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_V1 = '/api/v1';

export function useDashboardSummary(orgId: string) {
    return useQuery({
        queryKey: ['dashboard', orgId, 'summary'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_V1}/organizations/${orgId}/dashboard/summary`);
            return data.data;
        },
        refetchInterval: 5 * 60 * 1000, // 5分周期
    });
}

export function useDashboardTrends(orgId: string) {
    return useQuery({
        queryKey: ['dashboard', orgId, 'trends'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_V1}/organizations/${orgId}/dashboard/trends`);
            return data.data;
        },
        refetchInterval: 5 * 60 * 1000,
    });
}

export function useDashboardCategorySales(orgId: string) {
    return useQuery({
        queryKey: ['dashboard', orgId, 'category-sales'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_V1}/organizations/${orgId}/dashboard/category-sales`);
            return data.data;
        },
        refetchInterval: 5 * 60 * 1000,
    });
}

export function useDashboardInventory(orgId: string) {
    return useQuery({
        queryKey: ['dashboard', orgId, 'inventory'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_V1}/organizations/${orgId}/dashboard/inventory`);
            return data.data;
        },
        refetchInterval: 60 * 1000, // 1分周期
    });
}

export function useDashboardHealth(orgId: string) {
    return useQuery({
        queryKey: ['dashboard', orgId, 'health'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_V1}/organizations/${orgId}/dashboard/health`);
            return data.data;
        },
        refetchInterval: 60 * 1000, // 1分周期
    });
}
