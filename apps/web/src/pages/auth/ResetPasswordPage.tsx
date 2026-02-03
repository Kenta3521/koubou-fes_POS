import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, Link } from 'react-router-dom';
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

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'idle' | 'success'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
    });

    // トークンがない場合はエラー表示
    useEffect(() => {
        if (!token) {
            setError('トークンが無効です。もう一度メールのリンクからアクセスしてください。');
        }
    }, [token]);

    const onSubmit = async (data: ResetPasswordFormValues) => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            await api.post('/auth/reset-password', {
                token,
                newPassword: data.password,
            });
            setStatus('success');
        } catch (err) {
            console.error('Reset password failed:', err);
            const axiosError = err as AxiosError<{ error: { message: string } }>;
            if (axiosError.response?.data?.error?.message) {
                setError(axiosError.response.data.error.message);
            } else {
                setError('パスワードの再設定に失敗しました。');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center">
                            変更完了
                        </CardTitle>
                        <CardDescription className="text-center">
                            パスワードの変更が完了しました。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-6">
                        <Button asChild>
                            <Link to="/login">ログイン画面へ</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        パスワード再設定
                    </CardTitle>
                    <CardDescription className="text-center">
                        新しいパスワードを入力してください。
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
                            <Label htmlFor="password">新しいパスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="8文字以上"
                                {...register('password')}
                                disabled={isLoading || !token}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="もう一度入力"
                                {...register('confirmPassword')}
                                disabled={isLoading || !token}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading || !token}>
                            {isLoading ? '更新中...' : 'パスワードを変更'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">
                        キャンセルしてログイン画面へ
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
