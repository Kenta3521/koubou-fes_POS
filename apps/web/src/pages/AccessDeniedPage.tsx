import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background text-foreground space-y-6">
            <div className="rounded-full bg-destructive/10 p-6">
                <ShieldAlert className="w-16 h-16 text-destructive" />
            </div>

            <div className="text-center space-y-2 max-w-md px-4">
                <h1 className="text-3xl font-bold tracking-tight text-destructive">アクセス権限がありません</h1>
                <p className="text-muted-foreground">
                    このページを表示する権限がありません。
                    権限が必要な場合は、団体の管理者にお問い合わせください。
                </p>
            </div>

            <Button onClick={() => navigate('/')} variant="default" size="lg">
                ダッシュボードに戻る
            </Button>
        </div>
    );
}
