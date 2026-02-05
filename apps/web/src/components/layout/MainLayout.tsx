import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

export function MainLayout() {
    const { activeOrganizationId } = useAuthStore();
    const { setOrganization } = useCartStore();

    // アプリ起動時やリロード時に、カートの組織IDを同期
    useEffect(() => {
        if (activeOrganizationId) {
            console.log('[MainLayout] Syncing cart organization to:', activeOrganizationId);
            setOrganization(activeOrganizationId);
        }
    }, [activeOrganizationId, setOrganization]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 px-3 sm:px-4 border-b">
                    <SidebarTrigger className="-ml-1 h-8 w-8 sm:h-7 sm:w-7" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                        {/* 将来的にはここにパンくずリストを表示 */}
                        <span className="text-muted-foreground">App</span>
                        <span className="text-muted-foreground">/</span>
                        <span>Dashboard</span>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-3 sm:gap-4 p-3 sm:p-4 pt-0">
                    <main className="flex-1 py-3 sm:py-4">
                        <Outlet />
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
