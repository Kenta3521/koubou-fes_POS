
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
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
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Member, Role } from '@koubou-fes-pos/shared';
import { Users, UserPlus, ShieldAlert, UserMinus, Copy, RefreshCw } from 'lucide-react';

export default function StaffManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>([]);
    const [inviteCode, setInviteCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        try {
            const [membersRes, orgRes] = await Promise.all([
                api.get(`/organizations/${orgId}/members`),
                api.get(`/organizations/${orgId}`)
            ]);

            if (membersRes.data.success) {
                setMembers(membersRes.data.data);
            }
            if (orgRes.data.success) {
                setInviteCode(orgRes.data.data.inviteCode);
            }
        } catch (error) {
            toast({
                title: 'データ取得失敗',
                description: 'メンバー情報の取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: string, newRole: Role) => {
        try {
            const res = await api.patch(`/organizations/${orgId}/members/${userId}`, { role: newRole });
            if (res.data.success) {
                toast({ title: '更新完了', description: '役割を変更しました' });
                fetchData();
            }
        } catch (error) {
            toast({
                title: '更新失敗',
                description: '役割の変更に失敗しました',
                variant: 'destructive',
            });
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            const res = await api.delete(`/organizations/${orgId}/members/${userId}`);
            if (res.data.success) {
                toast({ title: '削除完了', description: 'メンバーを削除しました' });
                fetchData();
            }
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'メンバーの削除に失敗しました';
            toast({
                title: '削除失敗',
                description: message,
                variant: 'destructive',
            });
        }
    };

    const copyInviteCode = () => {
        navigator.clipboard.writeText(inviteCode);
        toast({ title: 'コピーしました', description: '招待コードをクリップボードにコピーしました' });
    };

    const getRoleBadge = (role: Role) => {
        switch (role) {
            case Role.ADMIN:
                return <Badge className="bg-rose-500 hover:bg-rose-600">管理者</Badge>;
            case Role.STAFF:
                return <Badge variant="secondary">スタッフ</Badge>;
            case Role.PENDING:
            case Role.TMP:
                return <Badge variant="outline" className="text-amber-500 border-amber-500">承認待ち</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

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
                                    <TableHead>権限 / 状態</TableHead>
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
                                            <TableCell>{getRoleBadge(member.role)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(member.role === Role.PENDING || member.role === Role.TMP) ? (
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleRoleChange(member.userId, Role.STAFF)}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                            承認
                                                        </Button>
                                                    ) : (
                                                        <Select
                                                            value={member.role}
                                                            onValueChange={(value) => handleRoleChange(member.userId, value as Role)}
                                                        >
                                                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={Role.ADMIN}>管理者</SelectItem>
                                                                <SelectItem value={Role.STAFF}>スタッフ</SelectItem>
                                                                <SelectItem value={Role.TMP}>承認待ち</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}

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
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" />
                                招待コード
                            </CardTitle>
                            <CardDescription>
                                このコードを共有してメンバーを招待します。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                                <code className="text-xl font-mono font-bold flex-1 text-center tracking-widest">
                                    {inviteCode}
                                </code>
                                <Button size="icon" variant="ghost" onClick={copyInviteCode}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button variant="outline" className="w-full flex items-center gap-2" disabled>
                                <RefreshCw className="w-4 h-4" />
                                コードを再生成（未実装）
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 bg-rose-50/30">
                        <CardHeader>
                            <CardTitle className="text-rose-700 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5" />
                                注意事項
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-rose-600 space-y-2">
                            <p>・管理者は団体の設定、商品、割引、メンバーをすべて管理できます。</p>
                            <p>・スタッフは商品の販売操作のみ行えます。</p>
                            <p>・最後の管理者を削除またはスタッフに変更することはできません。</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
