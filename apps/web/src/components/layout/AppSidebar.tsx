import * as React from 'react';
import {
    LayoutDashboard,
    Settings,
    User,
    ShoppingBasket,
    LogOut,
    Store,
    ListFilter,
    Tags,
    Users,
    ChevronsUpDown,
    Check
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link, useLocation } from 'react-router-dom';
import { Role } from '@koubou-fes-pos/shared';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function AppSidebar() {
    const { user, logout, activeOrganizationId, setActiveOrganization } = useAuthStore();
    const { setOrganization: setCartOrganization } = useCartStore();
    const location = useLocation();

    const [orgSwitchDialogOpen, setOrgSwitchDialogOpen] = React.useState(false);
    const [targetOrgId, setTargetOrgId] = React.useState<string | null>(null);

    // アクティブな組織を取得
    const currentOrg = user?.organizations?.find(
        (o) => o.id === activeOrganizationId
    );
    // 未選択の場合は最初の組織などをフォールバック表示（または「未選択」）
    const orgName = currentOrg?.name || '組織未選択';
    const orgRole = currentOrg?.role || '';

    const handleOrgSwitchClick = (orgId: string) => {
        if (orgId === activeOrganizationId) return;
        setTargetOrgId(orgId);
        setOrgSwitchDialogOpen(true);
    };

    const confirmOrgSwitch = () => {
        if (targetOrgId) {
            console.log('[AppSidebar] Switching organization from', activeOrganizationId, 'to', targetOrgId);
            setActiveOrganization(targetOrgId);
            setCartOrganization(targetOrgId); // カートをクリア
            setTargetOrgId(null);
            setOrgSwitchDialogOpen(false);
            console.log('[AppSidebar] Organization switch complete. Redirecting to dashboard...');

            // 団体切り替え後はダッシュボードへ遷移してリロード
            window.location.href = '/';
        }
    };

    return (
        <>
            <Sidebar>
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                            <Store className="size-4" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {orgName}
                                            </span>
                                            <span className="truncate text-xs">
                                                {orgRole.toLowerCase()}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="ml-auto" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                    align="start"
                                    side="bottom"
                                    sideOffset={4}
                                >
                                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                                        所属団体
                                    </DropdownMenuLabel>
                                    {user?.organizations?.map((org) => (
                                        <DropdownMenuItem
                                            key={org.id}
                                            onClick={() => handleOrgSwitchClick(org.id)}
                                            className="gap-2 p-2"
                                        >
                                            <div className="flex size-6 items-center justify-center rounded-sm border">
                                                <Store className="size-4 shrink-0" />
                                            </div>
                                            {org.name}
                                            {activeOrganizationId === org.id && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    {/* 新規団体作成などはここに追加可能 */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    {/* Platform Group */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Platform</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                                        <Link to="/">
                                            <LayoutDashboard />
                                            <span>ダッシュボード</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={location.pathname.startsWith('/pos')}
                                    >
                                        <Link to="/pos">
                                            <ShoppingBasket />
                                            <span>POSレジ</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Management Group - Only for Admins or System Admins */}
                    {(orgRole === Role.ADMIN || user?.isSystemAdmin) && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Management</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.includes('/categories')}>
                                            <Link to={`/admin/${activeOrganizationId}/categories`}>
                                                <Tags />
                                                <span>商品カテゴリ</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.includes('/products')}>
                                            <Link to={`/admin/${activeOrganizationId}/products`}>
                                                <ListFilter />
                                                <span>商品管理</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.includes('/discounts')}>
                                            <Link to={`/admin/${activeOrganizationId}/discounts`}>
                                                <Tags />
                                                <span>割引管理</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.includes('/staff')}>
                                            <Link to={`/admin/${activeOrganizationId}/staff`}>
                                                <Users />
                                                <span>スタッフ管理</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* Settings Group */}
                    <SidebarGroup>
                        <SidebarGroupLabel>Settings</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={location.pathname === '/settings'}
                                    >
                                        <Link to="/settings">
                                            <Settings />
                                            <span>設定</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                    >
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg">
                                                {user?.name?.slice(0, 2) || 'US'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {user?.name}
                                            </span>
                                            <span className="truncate text-xs">{user?.email}</span>
                                        </div>
                                        <Settings className="ml-auto size-4" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                    side="bottom"
                                    align="end"
                                    sideOffset={4}
                                >
                                    <DropdownMenuItem asChild>
                                        <Link to="/profile">
                                            <User className="mr-2 size-4" />
                                            プロフィール
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={logout}>
                                        <LogOut className="mr-2 size-4" />
                                        ログアウト
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>

            <ConfirmDialog
                open={orgSwitchDialogOpen}
                onOpenChange={setOrgSwitchDialogOpen}
                title="団体を切り替えますか？"
                description="現在の作業内容は保存されない可能性があります。本当に切り替えてもよろしいですか？"
                confirmText="切り替える"
                onConfirm={confirmOrgSwitch}
            />
        </>
    );
}
