import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
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

// 新規登録フォームのバリデーションスキーマ
const registerSchema = z.object({
    name: z.string().min(1, '名前を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    inviteCode: z.string().min(1, '招待コードを入力してください'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post('/auth/register', data);

            // 登録成功時の処理
            const { token, user } = response.data.data;

            // Storeに保存して自動ログイン
            setAuth(token, user);

            console.log('Registration successful:', user);

            // ホームへ遷移
            navigate('/');

        } catch (err) {
            console.error('Registration failed:', err);
            // axiosのエラー判定（簡易実装）
            const axiosError = err as AxiosError<{ error: { message: string } }>;
            if (axiosError.response?.data?.error?.message) {
                setError(axiosError.response.data.error.message);
            } else {
                setError('登録に失敗しました。サーバーエラーの可能性があります。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4 py-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-center text-primary">
                        アカウント作成
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                        招待コードを入力してPOSシステムに登録
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
                            <Label htmlFor="name">名前</Label>
                            <Input
                                id="name"
                                placeholder="田中 太郎"
                                {...register('name')}
                                disabled={isLoading}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="staff@example.com"
                                {...register('email')}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="8文字以上"
                                {...register('password')}
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="inviteCode">招待コード</Label>
                            <Input
                                id="inviteCode"
                                placeholder="INV_XXXXXX"
                                {...register('inviteCode')}
                                disabled={isLoading}
                            />
                            {errors.inviteCode && (
                                <p className="text-sm text-destructive">
                                    {errors.inviteCode.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                管理者から受け取ったコードを入力してください
                            </p>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? '登録処理中...' : '登録する'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm">
                    <div className="text-muted-foreground">
                        すでにアカウントをお持ちですか？{' '}
                        <Link to="/login" className="text-primary hover:underline">
                            ログイン
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
