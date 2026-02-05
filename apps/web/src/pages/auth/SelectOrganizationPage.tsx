import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, LogOut } from 'lucide-react';

export default function SelectOrganizationPage() {
    const { user, setActiveOrganization, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleSelect = (orgId: string) => {
        setActiveOrganization(orgId);
        navigate('/');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user || user.organizations.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>所属団体がありません</CardTitle>
                        <CardDescription>
                            管理者に招待を依頼するか、新しい団体を作成してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            ログアウト
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">団体を選択</h1>
                    <p className="text-muted-foreground">
                        操作を行う団体を選択してください
                    </p>
                </div>

                <div className="grid gap-4">
                    {user.organizations.map((userOrg) => (
                        <Card
                            key={userOrg.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSelect(userOrg.id)}
                        >
                            <CardContent className="flex items-center p-6 space-x-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Store className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{userOrg.name}</h3>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {userOrg.role.toLowerCase()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
