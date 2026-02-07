
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Shield, Settings2, Plus, ArrowRight, Trash2, Users, Eye } from 'lucide-react';
import { RoleMemberAssignmentModal } from '@/components/admin/RoleMemberAssignmentModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePermission } from '@/hooks/usePermission';

interface RoleRecord {
    id: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    permissions: string[];
}

export default function RoleManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { can } = usePermission();
    const [roles, setRoles] = useState<RoleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);

    const fetchRoles = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        try {
            const res = await api.get(`/organizations/${orgId}/roles`);
            if (res.data.success) {
                setRoles(res.data.data);
            }
        } catch (error) {
            toast({
                title: 'データ取得失敗',
                description: 'ロール一覧の取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleDeleteRole = async (roleId: string) => {
        try {
            const res = await api.delete(`/organizations/${orgId}/roles/${roleId}`);
            if (res.data.success) {
                toast({ title: '削除完了', description: 'ロールを削除しました' });
                fetchRoles();
            }
        } catch (error) {
            const message = (error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message || 'ロールの削除に失敗しました';
            toast({
                title: '削除失敗',
                description: message,
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        ロール・権限管理
                    </h1>
                    <p className="text-muted-foreground">
                        スタッフの役割（ロール）ごとに許可する操作を細かく設定できます。
                    </p>
                </div>
                {(can('create', 'role') || can('manage', 'role')) && (
                    <Button onClick={() => navigate(`/admin/${orgId}/roles/new`)} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        新規ロール作成
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>定義済みロール</CardTitle>
                    <CardDescription>
                        組織内で使用可能な役割の一覧です。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">ロール名</TableHead>
                                <TableHead>説明</TableHead>
                                <TableHead className="w-[100px]">権限数</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">読み込み中...</TableCell>
                                </TableRow>
                            ) : roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">ロールが定義されていません</TableCell>
                                </TableRow>
                            ) : (
                                roles.map((role) => {
                                    // Determine if editable based on permissions AND system role status
                                    const canEdit = can('update', 'role');
                                    const isEditable = !role.isSystemRole && canEdit;
                                    const canDelete = can('delete', 'role') && !role.isSystemRole;

                                    return (
                                        <TableRow key={role.id}>
                                            <TableCell>
                                                <div className="font-bold flex items-center gap-2">
                                                    {role.name}
                                                    {role.isSystemRole && (
                                                        <Badge variant="secondary" className="text-[10px] h-4">共通</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {role.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{role.permissions.length}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {can('assign', 'role') && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex items-center gap-1"
                                                            onClick={() => {
                                                                setSelectedRole(role);
                                                                setIsAssignmentModalOpen(true);
                                                            }}
                                                        >
                                                            <Users className="w-4 h-4" />
                                                            メンバー
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex items-center gap-1"
                                                        onClick={() => navigate(`/admin/${orgId}/roles/${role.id}`)}
                                                    >
                                                        {isEditable ? (
                                                            <>
                                                                <Settings2 className="w-4 h-4" />
                                                                編集
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4" />
                                                                閲覧
                                                            </>
                                                        )}
                                                        <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>

                                                    {canDelete && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>ロールの削除</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        「{role.name}」を削除しますか？このロールが割り当てられているユーザーがいる場合、先に変更が必要です。
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteRole(role.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                        削除する
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedRole && orgId && (
                <RoleMemberAssignmentModal
                    isOpen={isAssignmentModalOpen}
                    onClose={() => setIsAssignmentModalOpen(false)}
                    orgId={orgId}
                    roleId={selectedRole.id}
                    roleName={selectedRole.name}
                />
            )}
        </div>
    );
}
