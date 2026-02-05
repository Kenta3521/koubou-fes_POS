import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
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

const forgotPasswordSchema = z.object({
    email: z.string().email('有効なメールアドレスを入力してください'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [status, setStatus] = useState<'idle' | 'success'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [devToken, setDevToken] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);
        setError(null);
        setDevToken(null);

        try {
            const response = await api.post('/auth/reset-password-request', data);
            setStatus('success');

            // 開発用: トークンを表示
            if (response.data.data?.token) {
                setDevToken(response.data.data.token);
            }
        } catch (err) {
            console.error('Reset request failed:', err);
            const axiosError = err as AxiosError<{ error: { message: string } }>;
            if (axiosError.response?.data?.error?.message) {
                setError(axiosError.response.data.error.message);
            } else {
                setError('リセットメールの送信に失敗しました。');
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
                        <CardTitle className="text-xl sm:text-2xl font-bold text-center">
                            メール送信完了
                        </CardTitle>
                        <CardDescription className="text-center text-sm">
                            パスワードリセット用のメールを送信しました。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm">
                            メール内のリンクをクリックして、パスワードの再設定を行ってください。
                        </div>

                        {/* 開発用: トークン表示エリア */}
                        {devToken && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                                <h4 className="text-sm font-bold text-yellow-800 mb-2">【開発用】デバッグリンク</h4>
                                <p className="text-xs text-yellow-700 mb-2 break-all">
                                    Token: {devToken}
                                </p>
                                <Link
                                    to={`/reset-password?token=${devToken}`}
                                    className="block w-full text-center bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    パスワード再設定画面へ進む
                                </Link>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link to="/login" className="text-sm text-primary hover:underline">
                            ログイン画面に戻る
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-center">
                        パスワードの再設定
                    </CardTitle>
                    <CardDescription className="text-center text-sm">
                        登録したメールアドレスを入力してください。
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
                                placeholder="name@example.com"
                                {...register('email')}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? '送信中...' : 'リセットメールを送信'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">
                        ログイン画面に戻る
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
