import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Pencil, X, Save, Loader2, Building2, Trash2, AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
    const { user, logout, setAuth } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    // 編集モードの状態
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');

    // 招待コードの状態
    const [inviteCode, setInviteCode] = useState('');

    // 脱退確認ダイアログの状態
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
    const [selectedOrgToLeave, setSelectedOrgToLeave] = useState<{ id: string; name: string } | null>(null);

    // プロフィール更新Mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name?: string; email?: string }) => {
            const response = await api.patch('/users/me', data);
            return response.data;
        },
        onSuccess: (response) => {
            // AuthStoreのユーザー情報を更新
            const token = localStorage.getItem('auth-storage')
                ? JSON.parse(localStorage.getItem('auth-storage') as string).state?.token
                : null;

            if (token && response.data && user) {
                // 既存のユーザー情報とマージ
                const updatedUser = {
                    ...user,
                    name: response.data.name,
                    email: response.data.email,
                };
                setAuth(token, updatedUser);
            }

            toast({
                title: '更新完了',
                description: 'プロフィールを更新しました。',
            });
            setIsEditing(false);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { error?: { message?: string; code?: string } } } };
            const message = err.response?.data?.error?.message || 'プロフィールの更新に失敗しました';
            const code = err.response?.data?.error?.code;

            toast({
                variant: 'destructive',
                title: 'エラー',
                description: code === 'EMAIL_ALREADY_EXISTS'
                    ? 'このメールアドレスは既に使用されています'
                    : message,
            });
        },
    });

    // 団体参加Mutation
    const joinOrgMutation = useMutation({
        mutationFn: async (code: string) => {
            const response = await api.post('/users/me/organizations', { inviteCode: code });
            return response.data;
        },
        onSuccess: async () => {
            // ユーザー情報を最新化（所属団体リストを更新するため）
            const meResponse = await api.get('/users/me');
            const updatedUser = meResponse.data.data;

            const token = localStorage.getItem('auth-storage')
                ? JSON.parse(localStorage.getItem('auth-storage') as string).state?.token
                : null;

            if (token) {
                setAuth(token, updatedUser);
            }

            toast({
                title: '参加完了',
                description: '新しい団体に参加しました。',
            });
            setInviteCode('');
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { error?: { message?: string; code?: string } } } };
            const message = err.response?.data?.error?.message || '団体の参加に失敗しました';
            const code = err.response?.data?.error?.code;

            toast({
                variant: 'destructive',
                title: 'エラー',
                description: code === 'ORG_ALREADY_JOINED'
                    ? '既にこの団体に参加しています'
                    : message,
            });
        },
    });

    // 団体脱退Mutation
    const leaveOrgMutation = useMutation({
        mutationFn: async (orgId: string) => {
            const response = await api.delete(`/users/me/organizations/${orgId}`);
            return response.data;
        },
        onSuccess: async () => {
            // ユーザー情報を最新化
            const meResponse = await api.get('/users/me');
            const updatedUser = meResponse.data.data;

            const token = localStorage.getItem('auth-storage')
                ? JSON.parse(localStorage.getItem('auth-storage') as string).state?.token
                : null;

            if (token) {
                setAuth(token, updatedUser);
            }

            toast({
                title: '脱退完了',
                description: '団体から脱退しました。',
            });
            setLeaveDialogOpen(false);
            setSelectedOrgToLeave(null);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { error?: { message?: string; code?: string } } } };
            const message = err.response?.data?.error?.message || '団体の脱退に失敗しました';
            const code = err.response?.data?.error?.code;

            toast({
                variant: 'destructive',
                title: 'エラー',
                description: code === 'CANNOT_LEAVE_AS_LAST_ADMIN'
                    ? 'あなたは唯一の管理者のため脱退できません。他のメンバーに管理者権限を委譲してください。'
                    : message,
            });
            setLeaveDialogOpen(false);
        },
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSave = () => {
        const updates: { name?: string; email?: string } = {};
        if (editName !== user?.name) updates.name = editName;
        if (editEmail !== user?.email) updates.email = editEmail;

        if (Object.keys(updates).length === 0) {
            setIsEditing(false);
            return;
        }

        updateProfileMutation.mutate(updates);
    };

    const handleJoinOrg = () => {
        if (!inviteCode) return;
        joinOrgMutation.mutate(inviteCode);
    };

    const confirmLeaveOrg = (org: { id: string; name: string }) => {
        setSelectedOrgToLeave(org);
        setLeaveDialogOpen(true);
    };

    const handleLeaveOrg = () => {
        if (!selectedOrgToLeave) return;
        leaveOrgMutation.mutate(selectedOrgToLeave.id);
    };

    const handleCancelEdit = () => {
        setEditName(user?.name || '');
        setEditEmail(user?.email || '');
        setIsEditing(false);
    };

    return (
        <div className="container max-w-2xl py-6 space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">設定</h2>
                <p className="text-muted-foreground">
                    アカウント設定とシステム情報の確認ができます。
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            アカウント情報
                        </CardTitle>
                        {!isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-4 w-4 mr-1" />
                                編集
                            </Button>
                        )}
                    </div>
                    <CardDescription>
                        {isEditing
                            ? 'プロフィール情報を編集できます。'
                            : '現在ログインしているユーザーの情報です。'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isEditing ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">ユーザー名</Label>
                                <Input
                                    id="name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="名前を入力"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="メールアドレスを入力"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">ユーザー名</p>
                                <p className="text-sm text-muted-foreground">{user?.name}</p>
                            </div>
                            <Separator />
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-none">メールアドレス</p>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                        </>
                    )}
                </CardContent>
                {isEditing && (
                    <CardFooter className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateProfileMutation.isPending}
                        >
                            <X className="h-4 w-4 mr-1" />
                            キャンセル
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updateProfileMutation.isPending}
                        >
                            {updateProfileMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-1" />
                            )}
                            保存
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        団体への参加
                    </CardTitle>
                    <CardDescription>
                        招待コードを入力して新しい団体に参加します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="招待コードを入力"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                        />
                        <Button
                            onClick={handleJoinOrg}
                            disabled={!inviteCode || joinOrgMutation.isPending}
                        >
                            {joinOrgMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            )}
                            参加
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        所属団体管理
                    </CardTitle>
                    <CardDescription>
                        現在所属している団体の一覧です。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {user?.organizations && user.organizations.length > 0 ? (
                            user.organizations.map((org) => (
                                <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{org.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {org.role}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                        onClick={() => confirmLeaveOrg({ id: org.id, name: org.name })}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        脱退
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                所属している団体はありません。
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-destructive">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            脱退の確認
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            本当に「<span className="font-bold text-foreground">{selectedOrgToLeave?.name}</span>」から脱退してもよろしいですか？
                            <br className="mb-2" />
                            この操作は取り消せません。再度参加するには招待コードが必要です。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveOrg}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={leaveOrgMutation.isPending}
                        >
                            {leaveOrgMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            )}
                            脱退する
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle>セッション管理</CardTitle>
                    <CardDescription>
                        アプリケーションからログアウトします。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
                        <LogOut className="mr-2 h-4 w-4" />
                        ログアウト
                    </Button>
                </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground">
                <p>光芒祭POS System v1.0.0</p>
            </div>
        </div>
    );
}
