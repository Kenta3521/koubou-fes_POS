
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermission } from '@/hooks/usePermission';

interface PermissionMaster {
    id: string;
    code: string;
    name: string;
    category: string;
    description?: string;
}

interface RoleData {
    id?: string;
    name: string;
    description: string;
    permissions: string[]; // List of codes
}

interface RoleResponseItem {
    id: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    permissions: Array<{ permission: { code: string } }> | string[]; // Can be object array or string array depending on API format
}

export default function RoleEditPage() {
    const { orgId, roleId } = useParams<{ orgId: string, roleId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [role, setRole] = useState<RoleData>({ name: '', description: '', permissions: [] });
    const [allPermissions, setAllPermissions] = useState<PermissionMaster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const isNew = roleId === 'new' || !roleId;
    const isSystemMode = !orgId;
    const { can } = usePermission();
    const [isReadOnly, setIsReadOnly] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Check basic permissions first
            const hasUpdatePerm = isNew ? can('create', 'role') : can('update', 'role');
            if (!hasUpdatePerm) {
                setIsReadOnly(true);
            }

            // Fetch Master Permissions
            const permRes = await api.get('/permissions');
            if (permRes.data.success) {
                setAllPermissions(permRes.data.data);
            }

            // Fetch Specific Role if editing
            if (!isNew) {
                let currentRole;
                if (isSystemMode) {
                    const rolesRes = await api.get('/admin/roles');
                    if (rolesRes.data.success) {
                        currentRole = (rolesRes.data.data as RoleResponseItem[]).find(r => r.id === roleId);
                    }
                } else {
                    const rolesRes = await api.get(`/organizations/${orgId}/roles`);
                    if (rolesRes.data.success) {
                        currentRole = (rolesRes.data.data as RoleResponseItem[]).find(r => r.id === roleId);
                    }
                }

                if (currentRole) {
                    setRole({
                        id: currentRole.id,
                        name: currentRole.name,
                        description: currentRole.description || '',
                        permissions: Array.isArray(currentRole.permissions) && currentRole.permissions.length > 0 && typeof currentRole.permissions[0] === 'object'
                            ? (currentRole.permissions).map((p: unknown) => (p as { permission?: { code: string }; code?: string }).permission?.code || (p as { code?: string }).code || '')
                            : (currentRole.permissions as string[]) || []
                    });
                    if (currentRole.isSystemRole && !isSystemMode) {
                        setIsReadOnly(true);
                    }
                } else {
                    toast({ title: 'エラー', description: 'ロールが見つかりませんでした', variant: 'destructive' });
                    navigate(isSystemMode ? '/system/roles' : `/admin/${orgId}/roles`);
                }
            }
        } catch (error) {
            toast({ title: 'エラー', description: 'データの取得に失敗しました', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, roleId, isNew, navigate, toast, isSystemMode, can]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Group permissions by category
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, PermissionMaster[]> = {};
        allPermissions.forEach(p => {
            if (!groups[p.category]) groups[p.category] = [];
            groups[p.category].push(p);
        });
        return groups;
    }, [allPermissions]);

    // Handle toggling permission with "Management" logic
    const handleTogglePermission = (code: string, category: string) => {
        if (isReadOnly) return;
        setRole(prev => {
            const currentPerms = new Set(prev.permissions);
            const isSelected = currentPerms.has(code);
            const isManagement = code.endsWith(':management');

            if (isManagement) {
                // If "management" is toggled:
                // - Select: Select "management" AND all other permissions in this category
                // - Deselect: Deselect "management" AND all other permissions in this category
                const categoryPerms = groupedPermissions[category].map(p => p.code);

                if (!isSelected) {
                    // Selecting Management -> Select All in Category
                    categoryPerms.forEach(c => currentPerms.add(c));
                } else {
                    // Deselecting Management -> Deselect All in Category
                    categoryPerms.forEach(c => currentPerms.delete(c));
                }
            } else {
                // Toggle the specific permission
                if (isSelected) {
                    currentPerms.delete(code);
                    // Also deselect "management" if it exists in this category
                    const managementCode = groupedPermissions[category].find(p => p.code.endsWith(':management'))?.code;
                    if (managementCode) currentPerms.delete(managementCode);
                } else {
                    currentPerms.add(code);
                    // Check if ALL OTHER sub-permissions are now selected?
                    const categoryPerms = groupedPermissions[category];
                    const managementPerm = categoryPerms.find(p => p.code.endsWith(':management'));

                    if (managementPerm) {
                        const allSubPerms = categoryPerms.filter(p => !p.code.endsWith(':management'));
                        const allSelected = allSubPerms.every(p => currentPerms.has(p.code));
                        if (allSelected) {
                            currentPerms.add(managementPerm.code);
                        }
                    }
                }
            }

            return { ...prev, permissions: Array.from(currentPerms) };
        });
    };

    const handleSave = async () => {
        if (!role.name.trim()) {
            toast({ title: 'バリデーションエラー', description: 'ロール名は必須です', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: role.name,
                description: role.description,
                permissionCodes: role.permissions
            };

            if (isSystemMode) {
                if (isNew) {
                    // Create (Common Role)
                    await api.post('/admin/roles', { ...payload, organizationId: null });
                    toast({ title: '作成完了', description: '共通ロールを作成しました' });
                } else {
                    // Update
                    await api.put(`/admin/roles/${roleId}`, payload);
                    toast({ title: '保存完了', description: 'ロールの設定を更新しました' });
                }
                navigate('/system/roles');
            } else {
                if (isNew) {
                    await api.post(`/organizations/${orgId}/roles`, payload);
                    toast({ title: '作成完了', description: '新しいロールを作成しました' });
                } else {
                    await api.put(`/organizations/${orgId}/roles/${roleId}`, payload);
                    toast({ title: '保存完了', description: 'ロールの設定を更新しました' });
                }
                navigate(`/admin/${orgId}/roles`);
            }
        } catch (error) {
            const message = (error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message || '保存中にエラーが発生しました';
            toast({ title: '保存失敗', description: message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const hasPermission = (permissionCode: string) => {
        return role.permissions.includes(permissionCode);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(isSystemMode ? '/system/roles' : `/admin/${orgId}/roles`)} size="icon">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isNew ? '新規ロール作成' : isReadOnly ? 'ロールの詳細 (閲覧のみ)' : 'ロール設定の編集'}
                    </h1>
                    <p className="text-muted-foreground">
                        権限項目を選択して、ロールのアクセス範囲を定義します。
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Basic Info */}
                <Card className="lg:col-span-1 h-fit sticky top-6">
                    <CardHeader>
                        <CardTitle>基本設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="role-name">ロール名 <span className="text-destructive">*</span></Label>
                            <Input
                                id="role-name"
                                placeholder="例: 副店長、経理担当など"
                                value={role.name}
                                onChange={e => setRole({ ...role, name: e.target.value })}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role-desc">説明</Label>
                            <textarea
                                id="role-desc"
                                className={`w-full min-h-[100px] p-3 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${isReadOnly ? 'bg-muted cursor-not-allowed' : ''}`}
                                placeholder="このロールの役割について..."
                                value={role.description}
                                onChange={e => setRole({ ...role, description: e.target.value })}
                                disabled={isReadOnly}
                            />
                        </div>
                    </CardContent>
                    {!isReadOnly && (
                        <CardFooter className="flex flex-col gap-3 border-t pt-6 bg-muted/20">
                            <Button className="w-full flex items-center gap-2" size="lg" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                設定を保存する
                            </Button>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="w-4 h-4" />
                                権限は保存後、即座に反映されます。
                            </div>
                        </CardFooter>
                    )}
                </Card>

                {/* Permission Matrix */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                        権限マトリクス
                        <Badge variant="outline" className="ml-2">{role.permissions.length} 項目選択中</Badge>
                    </h2>

                    {Object.entries(groupedPermissions).map(([category, perms]) => {
                        // Sort permissions within category: management first, then others
                        const sortedPerms = [...perms].sort((a, b) => {
                            if (a.code.endsWith(':management')) return -1;
                            if (b.code.endsWith(':management')) return 1;
                            return 0; // Keep original order for others
                        });

                        const managementPerm = sortedPerms.find(p => p.code.endsWith(':management'));
                        const isManagementSelected = managementPerm && role.permissions.includes(managementPerm.code);

                        return (
                            <Card key={category} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader className="bg-muted/30 py-4 px-6 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-lg">{category}</CardTitle>
                                        <Badge variant={isManagementSelected ? "default" : "secondary"}>
                                            {isManagementSelected ? "全管理権限付与" : "カスタム"}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {category}に関するアクセス権限
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {sortedPerms.map(p => {
                                            const isManagement = p.code.endsWith(':management');
                                            return (
                                                <div
                                                    key={p.code}
                                                    className={`
                                                        flex items-center space-x-2 border-b p-4 transition-colors
                                                        ${!isReadOnly ? 'cursor-pointer hover:bg-muted/50' : 'opacity-80 cursor-not-allowed'}
                                                        ${hasPermission(p.code) ? 'bg-primary/5 border-primary/20' : ''}
                                                        ${!isManagement ? 'pl-8' : ''}
                                                    `}
                                                    onClick={() => !isReadOnly && handleTogglePermission(p.code, category)}
                                                >
                                                    <Checkbox
                                                        id={p.code}
                                                        checked={hasPermission(p.code)}
                                                        onCheckedChange={() => !isReadOnly && handleTogglePermission(p.code, category)}
                                                        disabled={isReadOnly}
                                                    />
                                                    <div className="grid gap-1.5 leading-none pointer-events-none">
                                                        <label
                                                            htmlFor={p.code}
                                                            className={`text-sm font-medium leading-none flex items-center gap-2 ${isManagement ? 'font-bold text-primary' : ''}`}
                                                        >
                                                            {p.name}
                                                            {isManagement && <Badge variant="outline" className="text-[10px] h-4 border-primary text-primary">Management</Badge>}
                                                        </label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {p.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10">
                        <p className="text-sm text-muted-foreground">
                            すべて権限設定を確認しましたか？<br />
                            「設定を保存する」ボタンを押すと変更が適用されます。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
