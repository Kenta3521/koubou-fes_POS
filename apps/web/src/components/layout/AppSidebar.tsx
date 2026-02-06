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
    Check,
    History
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
import { Badge } from '@/components/ui/badge';
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
                                            onClick={() => {
                                                if (org.role !== Role.TMP) {
                                                    handleOrgSwitchClick(org.id);
                                                }
                                            }}
                                            disabled={org.role === Role.TMP}
                                            className={`gap-2 p-2 ${org.role === Role.TMP ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className="flex size-6 items-center justify-center rounded-sm border">
                                                <Store className="size-4 shrink-0" />
                                            </div>
                                            <span className="truncate flex-1">{org.name}</span>
                                            {org.role === Role.TMP && (
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 ml-auto">承認待ち</Badge>
                                            )}
                                            {activeOrganizationId === org.id && org.role !== Role.TMP && (
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
                                    <SidebarMenuButton
                                        onClick={() => window.location.href = '/'}
                                        isActive={location.pathname === '/'}
                                    >
                                        <LayoutDashboard />
                                        <span>ダッシュボード</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => window.location.href = '/pos'}
                                        isActive={location.pathname.startsWith('/pos')}
                                    >
                                        <ShoppingBasket />
                                        <span>POSレジ</span>
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
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) {
                                                    window.location.href = `/admin/${targetId}/dashboard`;
                                                } else {
                                                    // 組織がない場合は選択画面へ
                                                    window.location.href = '/select-org';
                                                }
                                            }}
                                            isActive={location.pathname.includes('/dashboard')}
                                        >
                                            <LayoutDashboard />
                                            <span>分析ダッシュボード</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) window.location.href = `/admin/${targetId}/categories`;
                                            }}
                                            isActive={location.pathname.includes('/categories')}
                                        >
                                            <Tags />
                                            <span>商品カテゴリ</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) window.location.href = `/admin/${targetId}/products`;
                                            }}
                                            isActive={location.pathname.includes('/products')}
                                        >
                                            <ListFilter />
                                            <span>商品管理</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) window.location.href = `/admin/${targetId}/discounts`;
                                            }}
                                            isActive={location.pathname.includes('/discounts')}
                                        >
                                            <Tags />
                                            <span>割引管理</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) window.location.href = `/admin/${targetId}/transactions`;
                                            }}
                                            isActive={location.pathname.includes('/transactions')}
                                        >
                                            <History />
                                            <span>取引履歴</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => {
                                                const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                if (targetId) window.location.href = `/admin/${targetId}/staff`;
                                            }}
                                            isActive={location.pathname.includes('/staff')}
                                        >
                                            <Users />
                                            <span>スタッフ管理</span>
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
                                        onClick={() => window.location.href = '/settings'}
                                        isActive={location.pathname === '/settings'}
                                    >
                                        <Settings />
                                        <span>設定</span>
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
