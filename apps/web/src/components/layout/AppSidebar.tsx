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
    History,
    Shield,
    Lock,
    LogOut as ExitIcon,
    FileText
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { api } from '@/lib/api';
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
    useSidebar,
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
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@koubou-fes-pos/shared';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function AppSidebar() {
    const { user, logout, activeOrganizationId, setActiveOrganization } = useAuthStore();
    const { setOrganization: setCartOrganization } = useCartStore();
    const location = useLocation();
    const navigate = useNavigate();
    const { isMobile, setOpenMobile } = useSidebar();

    const navigateAndClose = (to: string, useHref = false) => {
        if (isMobile) {
            setOpenMobile(false);
        }
        if (useHref) {
            window.location.href = to;
        } else {
            navigate(to);
        }
    };

    const [orgSwitchDialogOpen, setOrgSwitchDialogOpen] = React.useState(false);
    const [targetOrgId, setTargetOrgId] = React.useState<string | null>(null);
    const [impersonatedOrgName, setImpersonatedOrgName] = React.useState<string | null>(null);

    // アクティブな組織を取得
    const currentOrg = user?.organizations?.find((o: { id: string }) => o.id === activeOrganizationId);

    // システム管理者が所属メンバーではない団体を管理している場合、別途名前を取得する
    React.useEffect(() => {
        const fetchImpersonatedOrg = async () => {
            if (activeOrganizationId && !currentOrg && user?.isSystemAdmin) {
                try {
                    const res = await api.get(`/organizations/${activeOrganizationId}`);
                    if (res.data.success) {
                        setImpersonatedOrgName(res.data.data.name);
                    }
                } catch (error) {
                    console.error('Failed to fetch impersonated org name:', error);
                    setImpersonatedOrgName('不明な組織');
                }
            } else {
                setImpersonatedOrgName(null);
            }
        };
        fetchImpersonatedOrg();
    }, [activeOrganizationId, currentOrg, user?.isSystemAdmin]);

    const isImpersonating = !!activeOrganizationId && !currentOrg && user?.isSystemAdmin;

    // 未選択の場合は最初の組織などをフォールバック表示（または「未選択」）
    const displayOrgName = currentOrg?.name || impersonatedOrgName || (user?.isSystemAdmin ? 'システム管理モード' : '組織未選択');
    const orgRoleText = isImpersonating ? '代理管理中' : (currentOrg?.role || (user?.isSystemAdmin ? 'SYSTEM ADMIN' : ''));

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
                                                {displayOrgName}
                                            </span>
                                            <span className={`truncate text-xs ${isImpersonating ? 'text-amber-500 font-medium' : ''}`}>
                                                {orgRoleText.toLowerCase()}
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
                                    {user?.isSystemAdmin && activeOrganizationId && (
                                        <DropdownMenuItem
                                            onClick={() => {
                                                console.log('[AppSidebar] Exiting organization management');
                                                setActiveOrganization(null);
                                                setCartOrganization(null);
                                                window.location.href = '/admin/organizations';
                                            }}
                                            className="gap-2 p-2 text-destructive focus:text-destructive cursor-pointer"
                                        >
                                            <div className="flex size-6 items-center justify-center rounded-sm border border-destructive/20">
                                                <ExitIcon className="size-4 shrink-0" />
                                            </div>
                                            <span className="truncate flex-1">組織管理を終了</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    {/* Platform Group */}
                    {/* Platform Group - Hide in System Admin Mode (no org selected) unless they are System Admin */}
                    {(activeOrganizationId || user?.isSystemAdmin) && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Platform</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => navigateAndClose('/')}
                                            isActive={location.pathname === '/'}
                                        >
                                            <LayoutDashboard />
                                            <span>ダッシュボード</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <PermissionGuard permission="transaction:create" fallback={null}>
                                            <SidebarMenuButton
                                                onClick={() => navigateAndClose('/pos')}
                                                isActive={location.pathname.startsWith('/pos')}
                                            >
                                                <ShoppingBasket />
                                                <span>POSレジ</span>
                                            </SidebarMenuButton>
                                        </PermissionGuard>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* Management Group - Hide in System Admin Mode (no org selected) */}
                    {activeOrganizationId && (
                        <SidebarGroup>
                            <SidebarGroupLabel>Management</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <PermissionGuard permission="dashboard:view">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) {
                                                        navigateAndClose(`/admin/${targetId}/dashboard`);
                                                    } else {
                                                        navigateAndClose('/select-org');
                                                    }
                                                }}
                                                isActive={location.pathname.includes('/dashboard')}
                                            >
                                                <LayoutDashboard />
                                                <span>分析ダッシュボード</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="category:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/categories`);
                                                }}
                                                isActive={location.pathname.includes('/categories')}
                                            >
                                                <Tags />
                                                <span>商品カテゴリ</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="product:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/products`);
                                                }}
                                                isActive={location.pathname.includes('/products')}
                                            >
                                                <ListFilter />
                                                <span>商品管理</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="discount:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/discounts`);
                                                }}
                                                isActive={location.pathname.includes('/discounts')}
                                            >
                                                <Tags />
                                                <span>割引管理</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="transaction:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/transactions`);
                                                }}
                                                isActive={location.pathname.includes('/transactions')}
                                            >
                                                <History />
                                                <span>取引履歴</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="member:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/staff`);
                                                }}
                                                isActive={location.pathname.includes('/staff')}
                                            >
                                                <Users />
                                                <span>スタッフ管理</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="audit:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/audit-logs`);
                                                }}
                                                isActive={location.pathname.includes('/audit-logs')}
                                            >
                                                <FileText />
                                                <span>監査ログ</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                    <PermissionGuard permission="role:read">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                onClick={() => {
                                                    const targetId = activeOrganizationId || user?.organizations?.[0]?.id;
                                                    if (targetId) navigateAndClose(`/admin/${targetId}/roles`);
                                                }}
                                                isActive={location.pathname.startsWith(`/admin/${activeOrganizationId}/roles`)}
                                            >
                                                <Shield className="w-4 h-4" />
                                                <span>ロール・権限管理</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </PermissionGuard>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* System Management - Only for System Admins */}
                    {user?.isSystemAdmin && (
                        <SidebarGroup>
                            <SidebarGroupLabel>System Management</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => navigateAndClose('/admin/organizations')}
                                            isActive={location.pathname === '/admin/organizations'}
                                        >
                                            <Users />
                                            <span>団体管理</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.startsWith('/system/roles')} onClick={() => isMobile && setOpenMobile(false)}>
                                            <Link to="/system/roles">
                                                <Shield className="mr-2 h-4 w-4" />
                                                <span>ロール管理</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.startsWith('/system/permissions')} onClick={() => isMobile && setOpenMobile(false)}>
                                            <Link to="/system/permissions">
                                                <Lock className="mr-2 h-4 w-4" />
                                                <span>権限マスタ管理</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={location.pathname.startsWith('/system/audit-logs')} onClick={() => isMobile && setOpenMobile(false)}>
                                            <Link to="/system/audit-logs">
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>システム監査ログ</span>
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
                                        onClick={() => navigateAndClose('/settings')}
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
