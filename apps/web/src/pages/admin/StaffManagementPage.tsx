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
import { PermissionOverrideModal } from '@/components/admin/PermissionOverrideModal';
import { usePermission } from '@/hooks/usePermission';

// Extend Member type locally if shared type is not up to date yet
interface ExtendedMember {
    userId: string;
    organizationId: string;
    name: string;
    email: string;
    status: string;
    roles: {
        name: string;
        isSystemRole: boolean;
        id?: string;
    }[];
    permissions: string[] | null;
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
                setMembers(membersRes.data.data.map((m: any) => ({
                    userId: m.userId,
                    organizationId: m.organizationId,
                    name: m.user.name,
                    email: m.user.email,
                    status: m.user.status,
                    roles: m.roles?.map((ur: any) => ({
                        id: ur.role?.id,
                        name: ur.role?.name || '不明なロール',
                        isSystemRole: ur.role?.isSystemRole || false
                    })) || [],
                    permissions: m.permissions
                })));
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        } finally {
            setIsLoading(false);
        }
    }, [orgId]);

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
            // エラーはグローバルインターセプターで処理
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
            // エラーはグローバルインターセプターで処理
        }
    };

    // const copyInviteCode = () => {
    //     navigator.clipboard.writeText(inviteCode);
    //     toast({ title: 'コピーしました', description: '招待コードをクリップボードにコピーしました' });
    // };

    const getRoleNames = (member: ExtendedMember) => {
        return member.roles.map(r => r.name).join(', ');
    };


    // Helper for role badge (Global/Custom)
    const renderRoleBadges = (member: ExtendedMember) => {
        return (
            <div className="flex flex-wrap gap-2 items-center">
                {member.roles.map((role, idx) => (
                    <Badge key={role.id || idx} variant={role.isSystemRole ? "default" : "outline"} className={role.isSystemRole ? "bg-slate-700" : ""}>
                        {role.name}
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


    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="w-8 h-8" />
                    スタッフ管理
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="w-full">
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
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>{renderRoleBadges(member)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    {member.status === 'PENDING' ? (
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
                                                                        {member.name} を団体から削除しますか？この操作は取り消せません。
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
                    memberName={selectedMember.name}
                    roleName={getRoleNames(selectedMember)}
                    currentOverride={selectedMember.permissions}
                    rolePermissions={[]} // We don't need this complex calculation here for now
                    onSave={handlePermissionSave}
                />
            )}
        </div>
    );
}
