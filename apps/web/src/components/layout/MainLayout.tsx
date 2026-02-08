import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useEffect } from 'react';
import React from 'react';

const routeLabels: Record<string, string> = {
    'admin': '管理',
    'organizations': '団体管理',
    'dashboard': '分析ダッシュボード',
    'categories': '商品カテゴリ',
    'products': '商品管理',
    'discounts': '割引管理',
    'staff': 'スタッフ管理',
    'transactions': '取引履歴',
    'roles': 'ロール・権限管理',
    'members': 'メンバー',
    'system': 'システム管理',
    'permissions': '権限マスタ管理',
    'settings': '設定',
    'pos': 'POSレジ',
};

export function MainLayout() {
    const { activeOrganizationId } = useAuthStore();
    const { setOrganization } = useCartStore();
    const location = useLocation();
    const params = useParams();

    // アプリ起動時やリロード時に、カートの組織IDを同期
    useEffect(() => {
        if (activeOrganizationId) {
            console.log('[MainLayout] Syncing cart organization to:', activeOrganizationId);
            setOrganization(activeOrganizationId);
        }
    }, [activeOrganizationId, setOrganization]);

    const pathnames = location.pathname.split('/').filter((x) => x);
    const isPosPage = location.pathname.startsWith('/pos');

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {!isPosPage ? (
                    <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 px-3 sm:px-4 border-b">
                        <SidebarTrigger className="-ml-1 h-8 w-8 sm:h-7 sm:w-7" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
                            {pathnames.map((value, index) => {
                                const last = index === pathnames.length - 1;
                                const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                                // UUID or ID like parameters should be handled specially
                                const isParam = Object.values(params).includes(value);
                                const label = routeLabels[value];

                                // Skip "admin" / "system" segments, and skip unknown UUID-like params unless they are the last segment
                                if (!last && (value === 'admin' || value === 'system' || (isParam && !label))) {
                                    return null;
                                }

                                const displayLabel = label || (isParam ? '詳細' : value);

                                return (
                                    <React.Fragment key={to}>
                                        <span className="text-muted-foreground">/</span>
                                        {last ? (
                                            <span>{displayLabel}</span>
                                        ) : (
                                            <Link to={to} className="text-muted-foreground hover:text-foreground">
                                                {displayLabel}
                                            </Link>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </header>
                ) : (
                    <div className="fixed top-2 left-2 z-50">
                        <SidebarTrigger className="h-9 w-9 bg-background/80 backdrop-blur shadow-sm rounded-md border" />
                    </div>
                )}
                <div className="flex flex-1 flex-col gap-3 sm:gap-4 p-3 sm:p-4 pt-0">
                    <main className="flex-1 py-3 sm:py-4">
                        <Outlet />
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
