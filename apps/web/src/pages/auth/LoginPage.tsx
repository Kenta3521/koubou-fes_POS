import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

// ログインフォームのバリデーションスキーマ
const loginSchema = z.object({
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const setAuth = useAuthStore((state) => state.setAuth); // Storeからアクションを取得

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/login', data);

            // ログイン成功時の処理
            const { token, user } = response.data.data;

            // Storeに保存 (persistにより自動的にlocalStorageにも保存される)
            setAuth(token, user);

            console.log('Login successful:', user);

            // ホームへ遷移
            navigate('/');

        } catch (err) {
            console.error('Login failed:', err);
            // axiosのエラーかどうか判定できればベストだが、簡易的に
            const axiosError = err as AxiosError<{ error: { message: string } }>;
            if (axiosError.response?.data?.error?.message) {
                setError(axiosError.response.data.error.message);
            } else {
                setError('ログインに失敗しました。サーバーエラーの可能性があります。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-primary">
                        光芒祭POSシステム
                    </CardTitle>
                    <CardDescription className="text-center">
                        アカウントにログインしてください
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                {...register('email')}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">パスワード</Label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-primary hover:underline"
                                >
                                    パスワードを忘れた場合
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                {...register('password')}
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'ログイン中...' : 'ログイン'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm">
                    <div className="text-muted-foreground">
                        アカウントをお持ちでないですか？{' '}
                        <Link to="/register" className="text-primary hover:underline">
                            新規登録
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
