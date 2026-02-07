import axios from 'axios';

// APIクライアントの作成
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
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

// レスポンスインターセプター
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 403 Forbidden の場合にアクセス拒否ページへ遷移
        if (error.response?.status === 403) {
            console.warn('Access denied (403). Redirecting to /access-denied');
            window.location.href = '/access-denied';
        }
        return Promise.reject(error);
    }
);
