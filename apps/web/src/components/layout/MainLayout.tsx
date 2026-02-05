import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';

export function MainLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {/* 将来的にはここにパンくずリストを表示 */}
                        <span className="text-muted-foreground">App</span>
                        <span className="text-muted-foreground">/</span>
                        <span>Dashboard</span>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <main className="flex-1 py-4">
                        <Outlet />
                    </main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
