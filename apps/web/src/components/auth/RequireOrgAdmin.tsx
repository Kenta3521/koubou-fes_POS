
import { Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@koubou-fes-pos/shared';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function RequireOrgAdmin() {
    const { user, activeOrganizationId } = useAuthStore();
    const { orgId } = useParams<{ orgId: string }>();

    // URLのorgIdか、現在アクティブなorgIdを使用
    const targetOrgId = orgId || activeOrganizationId;

    // システム管理者は常に許可
    if (user?.isSystemAdmin) {
        return <Outlet />;
    }

    // 所属組織情報を取得
    const membership = user?.organizations?.find(o => o.id === targetOrgId);

    // 組織に所属していない、または管理者でない場合
    if (!membership || membership.role !== Role.ADMIN) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="bg-destructive/10 p-4 rounded-full">
                    <ShieldAlert className="w-12 h-12 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">表示権限がありません</h2>
                <p className="text-muted-foreground max-w-md">
                    このページを表示するために必要な権限（管理者権限）を持っていません。
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
