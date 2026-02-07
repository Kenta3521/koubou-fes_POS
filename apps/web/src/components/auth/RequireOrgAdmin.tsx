
import { Outlet } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function RequireOrgAdmin() {
    const { can } = usePermission();

    // 管理画面の基本権限（ダッシュボード閲覧）があるか確認
    // システム管理者は CASL 側で manage all 持っているので can('view', 'dashboard') は true になる
    if (!can('view', 'dashboard')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="bg-destructive/10 p-4 rounded-full">
                    <ShieldAlert className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">表示権限がありません</h2>
                <p className="text-muted-foreground max-w-md">
                    このページを表示するために必要な権限を持っていません。
                    所属団体の管理者に問い合わせてください。
                </p>
                <div className="pt-4">
                    <Button asChild variant="outline">
                        <Link to="/">ダッシュボードへ戻る</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
