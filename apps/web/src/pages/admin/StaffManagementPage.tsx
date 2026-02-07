import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Users, UserMinus, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PermissionOverrideModal } from '@/components/admin/PermissionOverrideModal';
import { usePermission } from '@/hooks/usePermission';

// Extend Member type locally if shared type is not up to date yet
interface ExtendedMember {
    userId: string;
    organizationId: string;
    roles: {
        role: ServiceRole;
    }[];
    permissions: string[] | null;
    user: {
        id: string;
        name: string;
        email: string;
        status: string;
    };
}

interface ServiceRole {
    id: string;
    name: string;
    description?: string;
    isSystemRole: boolean;
    permissions: {
        permission: {
            code: string;
        };
    }[];
}

export default function StaffManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const { toast } = useToast();
    // const { user: currentUser } = useAuthStore();
    const { can } = usePermission();

    const [members, setMembers] = useState<ExtendedMember[]>([]);
    // const [inviteCode, setInviteCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<ExtendedMember | null>(null);

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        try {
            const membersRes = await api.get(`/organizations/${orgId}/members`);

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
    }, [orgId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRemoveMember = async (userId: string) => {
        try {
            const res = await api.delete(`/organizations/${orgId}/members/${userId}`);
            if (res.data.success) {
                toast({ title: '削除完了', description: 'メンバーを削除しました' });
                fetchData();
            }
        } catch (error) {
            const message = (error as { response?: { data?: { error?: { message?: string } } } })
                .response?.data?.error?.message || 'メンバーの削除に失敗しました';
            toast({
                title: '削除失敗',
                description: message,
                variant: 'destructive',
            });
        }
    };

    const handlePermissionSave = async (memberId: string, newPermissions: string[] | null) => {
        try {
            const res = await api.patch(`/organizations/${orgId}/members/${memberId}`, {
                permissions: newPermissions
            });
            if (res.data.success) {
                toast({ title: '設定保存', description: '権限設定を更新しました' });
                fetchData();
            }
        } catch (error) {
            toast({
                title: '保存失敗',
                description: '権限設定の更新に失敗しました',
                variant: 'destructive',
            });
        }
    };

    // const copyInviteCode = () => {
    //     navigator.clipboard.writeText(inviteCode);
    //     toast({ title: 'コピーしました', description: '招待コードをクリップボードにコピーしました' });
    // };

    const getRoleNames = (member: ExtendedMember) => {
        return member.roles.map(ur => ur.role.name).join(', ');
    };

    const getRolePermissions = (member: ExtendedMember): string[] => {
        const allPerms = new Set<string>();
        member.roles.forEach(ur => {
            ur.role.permissions.forEach(rp => allPerms.add(rp.permission.code));
        });
        return Array.from(allPerms);
    };

    // Helper for role badge (Global/Custom)
    const renderRoleBadges = (member: ExtendedMember) => {
        return (
            <div className="flex flex-wrap gap-2 items-center">
                {member.roles.map(ur => (
                    <Badge key={ur.role.id} variant={ur.role.isSystemRole ? "default" : "outline"} className={ur.role.isSystemRole ? "bg-slate-700" : ""}>
                        {ur.role.name}
                    </Badge>
                ))}
                {member.permissions && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600 text-[10px] px-1 h-5">
                        カスタム
                    </Badge>
                )}
            </div>
        );
    };

    // const isSystemAdmin = currentUser?.isSystemAdmin || false;

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="w-8 h-8" />
                    スタッフ管理
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>メンバー一覧</CardTitle>
                        <CardDescription>
                            団体のスタッフを管理します。承認待ちユーザーの許可もこちらで行えます。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>名前</TableHead>
                                    <TableHead>メールアドレス</TableHead>
                                    <TableHead>役割</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">読み込み中...</TableCell>
                                    </TableRow>
                                ) : members.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">メンバーがいません</TableCell>
                                    </TableRow>
                                ) : (
                                    members.map((member) => (
                                        <TableRow key={member.userId}>
                                            <TableCell className="font-medium">{member.user.name}</TableCell>
                                            <TableCell>{member.user.email}</TableCell>
                                            <TableCell>{renderRoleBadges(member)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {member.user.status === 'PENDING' ? (
                                                        can('assign', 'role') && (
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Lock className="w-3 h-3" />
                                                                ロール設定ページで承認・ロール割当を行ってください
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            {/* User Role Editing is moved to RoleManagementPage. */}
                                                        </div>
                                                    )}
                                                    {can('delete', 'member') && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                                    <UserMinus className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>メンバーの削除</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {member.user.name} を団体から削除しますか？この操作は取り消せません。
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleRemoveMember(member.userId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                        削除する
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Invite Code UI Removed per V2 Feedback */}
            </div>

            {selectedMember && (
                <PermissionOverrideModal
                    isOpen={overrideModalOpen}
                    onClose={() => {
                        setOverrideModalOpen(false);
                        setSelectedMember(null);
                    }}
                    memberId={selectedMember.userId}
                    memberName={selectedMember.user.name}
                    roleName={getRoleNames(selectedMember)}
                    currentOverride={selectedMember.permissions}
                    rolePermissions={getRolePermissions(selectedMember)}
                    onSave={handlePermissionSave}
                />
            )}
        </div>
    );
}
