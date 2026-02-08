import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowLeft, RefreshCw, Save, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { RoleMemberAssignmentModal } from '@/components/admin/RoleMemberAssignmentModal';

interface Organization {
    id: string;
    name: string;
    inviteCode: string;
    isActive: boolean;
    createdAt: string;
}

interface Member {
    userId: string;
    name: string;
    email: string;
    roles: Array<{
        name: string;
        isSystemRole: boolean;
    }>;
    joinedAt: string;
}


export default function OrganizationDetailPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Edit states
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [isSavingBasic, setIsSavingBasic] = useState(false);
    const [isSavingInvite, setIsSavingInvite] = useState(false);

    // Dialog states
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [deleteMemberConfirmOpen, setDeleteMemberConfirmOpen] = useState(false);
    const [targetMember, setTargetMember] = useState<Member | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (orgId) {
            fetchOrganization();
            fetchMembers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    const fetchOrganization = async () => {
        setIsLoading(true);
        try {
            const response = await api.get(`/organizations/${orgId}`);
            const org = response.data.data;
            setOrganization(org);
            setName(org.name);
            setInviteCode(org.inviteCode);
        } catch (error) {
            console.error('Failed to fetch organization:', error);
            toast({
                title: 'エラー',
                description: '団体情報の取得に失敗しました。',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const response = await api.get(`/organizations/${orgId}/members`);
            setMembers(response.data.data.map((m: any) => ({
                userId: m.userId,
                name: m.user.name,
                email: m.user.email,
                roles: m.roles.map((ur: any) => ({
                    name: ur.role.name,
                    isSystemRole: ur.role.isSystemRole
                })),
                joinedAt: m.user.createdAt
            })));
        } catch (error) {
            console.error('Failed to fetch members:', error);
        }
    };


    const handleSaveBasic = async () => {
        if (!orgId) return;
        setIsSavingBasic(true);
        try {
            const response = await api.patch(`/organizations/${orgId}`, { name });
            setOrganization(prev => prev ? { ...prev, name: response.data.data.name } : null);
            toast({ title: '保存完了', description: '基本情報を更新しました。' });
        } catch (error) {
            toast({ title: 'エラー', description: '更新に失敗しました。', variant: 'destructive' });
        } finally {
            setIsSavingBasic(false);
        }
    };

    const handleStatusToggle = () => {
        setStatusConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!orgId || !organization) return;
        try {
            const response = await api.patch(`/organizations/${orgId}`, { isActive: !organization.isActive });
            setOrganization(prev => prev ? { ...prev, isActive: response.data.data.isActive } : null);
            toast({ title: '更新完了', description: `ステータスを${!organization.isActive ? '有効' : '無効'}に変更しました。` });
        } catch (error) {
            toast({ title: 'エラー', description: 'ステータス更新に失敗しました。', variant: 'destructive' });
        } finally {
            setStatusConfirmOpen(false);
        }
    };

    const handleUpdateInviteCode = async () => {
        if (!orgId) return;
        setIsSavingInvite(true);
        try {
            const response = await api.post(`/organizations/${orgId}/regenerate-invite`, { inviteCode });
            setOrganization(prev => prev ? { ...prev, inviteCode: response.data.data.newInviteCode } : null);
            setInviteCode(response.data.data.newInviteCode);
            toast({ title: '更新完了', description: '招待コードを更新しました。' });
        } catch (error: any) {
            if (error.response?.data?.error?.code === 'INVITE_CODE_EXISTS') {
                toast({ title: 'エラー', description: 'この招待コードは既に使用されています。', variant: 'destructive' });
            } else {
                toast({ title: 'エラー', description: '招待コードの更新に失敗しました。', variant: 'destructive' });
            }
        } finally {
            setIsSavingInvite(false);
        }
    };

    const handleRegenerateRandom = async () => {
        if (!orgId) return;
        setIsSavingInvite(true);
        try {
            // Send empty inviteCode to trigger random generation
            const response = await api.post(`/organizations/${orgId}/regenerate-invite`, { inviteCode: '' });
            setOrganization(prev => prev ? { ...prev, inviteCode: response.data.data.newInviteCode } : null);
            setInviteCode(response.data.data.newInviteCode);
            toast({ title: '更新完了', description: '新しい招待コードを生成しました。' });
        } catch (error) {
            toast({ title: 'エラー', description: '再生成に失敗しました。', variant: 'destructive' });
        } finally {
            setIsSavingInvite(false);
        }
    };

    const handleDeleteMember = (member: Member) => {
        setTargetMember(member);
        setDeleteMemberConfirmOpen(true);
    };

    const confirmDeleteMember = async () => {
        if (!orgId || !targetMember) return;
        try {
            await api.delete(`/organizations/${orgId}/members/${targetMember.userId}`);
            setMembers(prev => prev.filter(m => m.userId !== targetMember.userId));
            toast({ title: '削除完了', description: 'メンバーを削除しました。' });
        } catch (error: any) {
            if (error.response?.data?.error?.code === 'CANNOT_REMOVE_LAST_ADMIN') {
                toast({ title: 'エラー', description: '最後の管理者は削除できません。', variant: 'destructive' });
            } else {
                toast({ title: 'エラー', description: 'メンバーの削除に失敗しました。', variant: 'destructive' });
            }
        } finally {
            setDeleteMemberConfirmOpen(false);
            setTargetMember(null);
        }
    }

    if (isLoading && !organization) return <div className="p-8 text-center">読み込み中...</div>;
    if (!organization) return <div className="p-8 text-center">団体が見つかりません。</div>;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/organizations')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">ID: {organization.id}</span>
                        {organization.isActive ? (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">有効</span>
                        ) : (
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80">無効</span>
                        )}
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="status-mode">ステータス</Label>
                        <Switch id="status-mode" checked={organization.isActive} onCheckedChange={handleStatusToggle} />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">概略・設定</TabsTrigger>
                    <TabsTrigger value="members">メンバー</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>基本情報</CardTitle>
                                <CardDescription>団体の基本情報を編集します。</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">団体名</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <Button onClick={handleSaveBasic} disabled={isSavingBasic}>
                                    <Save className="mr-2 h-4 w-4" /> 基本情報を保存
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>招待コード設定</CardTitle>
                                <CardDescription>メンバー招待用のコードを管理します。</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <span className="text-2xl font-mono font-bold tracking-widest">{organization.inviteCode}</span>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="inviteCode">カスタムコード設定</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="inviteCode"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                            placeholder="半角英数字"
                                        />
                                        <Button onClick={handleUpdateInviteCode} disabled={isSavingInvite}>更新</Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">※半角英数字のみ使用可能です。</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">または</span>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full" onClick={handleRegenerateRandom} disabled={isSavingInvite}>
                                    <RefreshCw className="mr-2 h-4 w-4" /> ランダム再生成
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="members">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>メンバー管理</CardTitle>
                                <CardDescription>現在所属しているメンバーとその権限を管理します。</CardDescription>
                            </div>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>名前</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>権限</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((member) => (
                                        <TableRow key={member.userId}>
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {member.roles.map((role, idx) => (
                                                        <div key={idx} className="flex items-center gap-1">
                                                            <Badge variant="outline" className="font-normal">
                                                                {role.name}
                                                                {role.isSystemRole && <Badge variant="secondary" className="ml-1 text-[10px] h-3 px-1">共通</Badge>}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                    {member.roles.length === 0 && (
                                                        <span className="text-xs text-muted-foreground italic">ロールなし</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteMember(member)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {members.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                メンバーがいません。
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title="ステータス変更の確認"
                description={`${organization.name} を${organization.isActive ? '無効' : '有効'}にしますか？`}
                confirmText={organization.isActive ? '無効にする' : '有効にする'}
                onConfirm={confirmStatusChange}
                variant={organization.isActive ? 'destructive' : 'default'}
            />

            <ConfirmDialog
                open={deleteMemberConfirmOpen}
                onOpenChange={setDeleteMemberConfirmOpen}
                title="メンバー削除の確認"
                description={`${targetMember?.name} をこの団体から削除しますか？`}
                confirmText="削除する"
                onConfirm={confirmDeleteMember}
                variant="destructive"
            />
            <RoleMemberAssignmentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                orgId={orgId || ''}
                roleId=""
                roleName="一般メンバー"
                onSuccess={fetchMembers}
                isAddOnly={true}
            />
        </div>
    );
}
