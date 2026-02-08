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
import { Users, UserPlus, UserMinus, ArrowLeft, Loader2 } from 'lucide-react';
import { RoleMemberAssignmentModal } from '@/components/admin/RoleMemberAssignmentModal';
import { usePermission } from '@/hooks/usePermission';

interface RoleMember {
    id: string; // User ID
    name: string;
    email: string;
    assignedAt: string;
}

interface RoleInfo {
    id: string;
    name: string;
    description: string | null;
}

export default function RoleMembersPage() {
    const { orgId, roleId } = useParams<{ orgId?: string; roleId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { can } = usePermission();
    const [role, setRole] = useState<RoleInfo | null>(null);
    const [members, setMembers] = useState<RoleMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!roleId) return;
        setIsLoading(true);
        try {
            // Get role info (using the list and finding it, or we could have a getRoleById endpoint if available)
            // For now, let's fetch members and assume we might need role name from the list or a separate call
            // Actually roleController has listRoles which returns all. Let's try to get role info.
            const roleRes = orgId
                ? await api.get(`/organizations/${orgId}/roles`)
                : await api.get(`/admin/roles`);

            if (roleRes.data.success) {
                const foundRole = roleRes.data.data.find((r: { id: string; name: string }) => r.id === roleId);
                if (foundRole) setRole(foundRole);
            }

            const membersRes = orgId
                ? await api.get(`/organizations/${orgId}/roles/${roleId}/members`)
                : await api.get(`/admin/roles/${roleId}/members`); // Check if this exists for system admin

            if (membersRes.data.success) {
                setMembers(membersRes.data.data);
            }
        } catch (error) {
            toast({
                title: 'データ取得失敗',
                description: 'データの取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, roleId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRemoveMember = async (userId: string) => {
        setIsActionLoading(userId);
        try {
            const endpoint = orgId
                ? `/organizations/${orgId}/roles/${roleId}/members/${userId}`
                : `/admin/roles/${roleId}/members/${userId}`;

            const res = await api.delete(endpoint);
            if (res.data.success) {
                toast({ title: '解除完了', description: 'ロールの割り当てを解除しました' });
                fetchData();
            }
        } catch (error) {
            const message = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || '解除に失敗しました';
            toast({
                title: 'エラー',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleBack = () => {
        if (orgId) {
            navigate(`/admin/${orgId}/roles`);
        } else {
            navigate(`/system/roles`);
        }
    };

    if (isLoading && !role) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        メンバー管理: <Badge variant="secondary" className="text-xl ml-2">{role?.name || '読み込み中...'}</Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        このロールが割り当てられているユーザーを管理します。
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>割り当て済みユーザー一覧</CardTitle>
                        <CardDescription>
                            現在このロールを持つユーザーの一覧です。
                        </CardDescription>
                    </div>
                    {can('assign', 'role') && (
                        <Button onClick={() => setIsAssignmentModalOpen(true)} className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            メンバーを追加
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>名前</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>割り当て日</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        ユーザーが割り当てられていません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{new Date(member.assignedAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            {can('assign', 'role') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    disabled={!!isActionLoading}
                                                >
                                                    {isActionLoading === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4 mr-1" />}
                                                    解除
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {role && (
                <RoleMemberAssignmentModal
                    isOpen={isAssignmentModalOpen}
                    onClose={() => {
                        setIsAssignmentModalOpen(false);
                        fetchData();
                    }}
                    orgId={orgId || ''}
                    roleId={role.id}
                    roleName={role.name}
                    initialAddMode={true}
                    isAddOnly={true}
                />
            )}
        </div>
    );
}
