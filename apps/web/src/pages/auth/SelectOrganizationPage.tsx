import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';
import { Role } from '@koubou-fes-pos/shared';
import { Badge } from '@/components/ui/badge';

export default function SelectOrganizationPage() {
    const { user, setActiveOrganization, logout, addOrganization } = useAuthStore();
    const navigate = useNavigate();
    const [inviteCode, setInviteCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    const handleSelect = (orgId: string) => {
        setActiveOrganization(orgId);
        navigate('/');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setIsJoining(true);
        setJoinError(null);

        try {
            const response = await api.post('/users/me/organizations', { inviteCode });
            const newOrg = response.data.data;

            addOrganization(newOrg);
            setInviteCode('');

            // If user had no organizations, they might want to automatically select the new one?
            // But let's just let them see it in the list (or if it was empty, it will appear now)
        } catch (err) {
            const axiosError = err as AxiosError<{ error: { message: string } }>;
            if (axiosError.response?.data?.error?.message) {
                setJoinError(axiosError.response.data.error.message);
            } else {
                setJoinError('団体の参加に失敗しました');
            }
        } finally {
            setIsJoining(false);
        }
    };

    // 共通の参加フォーム
    const JoinForm = () => (
        <form onSubmit={handleJoin} className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
                <Label htmlFor="inviteCode">招待コードで参加</Label>
                <div className="flex space-x-2">
                    <Input
                        id="inviteCode"
                        placeholder="招待コードを入力"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        disabled={isJoining}
                    />
                    <Button type="submit" disabled={isJoining || !inviteCode.trim()}>
                        {isJoining ? '参加中...' : '参加'}
                    </Button>
                </div>
                {joinError && (
                    <p className="text-sm text-destructive">{joinError}</p>
                )}
            </div>
        </form>
    );

    if (!user || user.organizations.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>所属団体がありません</CardTitle>
                        <CardDescription>
                            管理者に招待を依頼してコードを入力するか、ログアウトしてください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <JoinForm />

                        <div className="pt-2">
                            <Button variant="outline" className="w-full" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                ログアウト
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 px-4 py-8">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">団体を選択</h1>
                    <p className="text-sm text-muted-foreground">
                        操作を行う団体を選択してください
                    </p>
                </div>

                <div className="grid gap-4">
                    {user.organizations.map((userOrg) => (
                        <Card
                            key={userOrg.id}
                            className={`transition-colors ${userOrg.role === Role.TMP
                                    ? 'opacity-60 cursor-not-allowed bg-muted'
                                    : 'cursor-pointer hover:bg-muted/50'
                                }`}
                            onClick={() => {
                                if (userOrg.role !== Role.TMP) {
                                    handleSelect(userOrg.id);
                                }
                            }}
                        >
                            <CardContent className="flex items-center p-4 sm:p-6 space-x-3 sm:space-x-4">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-full">
                                    <Store className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm sm:text-base">{userOrg.name}</h3>
                                        {userOrg.role === Role.TMP && (
                                            <Badge variant="secondary" className="text-xs">承認待ち</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                                        {userOrg.role.toLowerCase()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Add Organization Card/Section */}
                    <Card>
                        <CardContent className="p-6">
                            <JoinForm />
                        </CardContent>
                    </Card>
                </div>

                <div className="text-center">
                    <Button variant="link" onClick={handleLogout} className="text-muted-foreground">
                        ログアウトして戻る
                    </Button>
                </div>
            </div>
        </div>
    );
}
