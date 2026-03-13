import axios from 'axios';

// APIクライアントの作成
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // クロスオリジンクッキーなどを許可する場合
});

// リクエストインターセプター: トークンを自動付与
api.interceptors.request.use((config) => {
    // 循環参照を避けるため、ここでインポートするか、
    // useAuthStore.getState()を使用する
    // (注: createしたstoreはコンポーネント外でも使えます)
    // ただし、Viteビルド時の循環参照エラー回避のため、ファイルのトップレベルでのstoreインポートには注意が必要な場合がある
    // ここでは動的インポートやstoreの直接参照が安全

    // authStoreの実装に合わせて調整
    // src/stores/authStore.tsからimportしていますが、
    // 循環参照が起きないように設計するのが基本です

    const token = localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage') as string).state?.token
        : null;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// スキップフラグ用の内部型定義
declare module 'axios' {
    export interface AxiosRequestConfig {
        _skipErrorToast?: boolean;
    }
}

import { toast } from '@/hooks/use-toast';

// ... (existing code)

// レスポンスインターセプター
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // スキップフラグが立っている場合は何もしない
        if (error.config?._skipErrorToast) {
            return Promise.reject(error);
        }

        // 403 Forbidden の場合にアクセス拒否ページへ遷移
        if (error.response?.status === 403) {
            console.warn('Access denied (403). Redirecting to /access-denied');
            window.location.href = '/access-denied';
            return Promise.reject(error);
        }

        // 401 Unauthorized の場合にログイン画面へ遷移 (必要に応じて)
        if (error.response?.status === 401) {
            console.warn('Unauthorized (401).');
            // ここでログアウト処理や遷移を入れることも可能
        }

        // サーバーからのエラーメッセージを取得
        const message = error.response?.data?.error?.message ||
            error.response?.data?.message ||
            '予期せぬエラーが発生しました';

        // それ以外はトースト表示
        toast({
            title: 'エラー',
            description: message,
            variant: 'destructive',
        });

        return Promise.reject(error);
    }
);

// Audit Log Types and Functions
export interface AuditLogFilters {
    startDate?: string;
    endDate?: string;
    category?: string;
    userId?: string;
    organizationId?: string;
}

export async function getSystemAuditLogs(filters: AuditLogFilters & { page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.category) params.append('category', filters.category);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return api.get(`/audit-logs/admin?${params.toString()}`);
}
