import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { CreateOrganizationModal } from '@/components/admin/CreateOrganizationModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/use-toast';

interface Organization {
    id: string;
    name: string;
    inviteCode: string;
    isActive: boolean;
    createdAt: string;
}

export default function OrganizationManagementPage() {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Status validation
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [statusTargetOrg, setStatusTargetOrg] = useState<Organization | null>(null);
    const { toast } = useToast();

    const fetchOrganizations = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/organizations/list');
            setOrganizations(response.data.data);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const handleStatusToggle = (org: Organization) => {
        setStatusTargetOrg(org);
        setStatusConfirmOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!statusTargetOrg) return;

        try {
            await api.patch(`/organizations/${statusTargetOrg.id}`, {
                isActive: !statusTargetOrg.isActive
            });

            toast({
                title: '更新完了',
                description: `${statusTargetOrg.name} のステータスを変更しました。`,
            });
            // Reflect change locally or refetch
            setOrganizations(prev => prev.map(o => o.id === statusTargetOrg.id ? { ...o, isActive: !o.isActive } : o));
        } catch (error) {
            console.error('Failed to update status:', error);
            toast({
                title: 'エラー',
                description: 'ステータスの更新に失敗しました。',
                variant: 'destructive',
            });
        } finally {
            setStatusConfirmOpen(false);
            setStatusTargetOrg(null);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">団体管理</h1>
                    <p className="text-muted-foreground">システムの利用団体を管理します。</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> 新規作成
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>団体一覧</CardTitle>
                    <CardDescription>登録されている全ての団体を表示しています。</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">読み込み中...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>団体名</TableHead>
                                    <TableHead>招待コード</TableHead>
                                    <TableHead>ステータス</TableHead>
                                    <TableHead>作成日</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizations.map((org) => (
                                    <TableRow key={org.id}>
                                        <TableCell className="font-medium">{org.name}</TableCell>
                                        <TableCell>
                                            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                                {org.inviteCode}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={org.isActive}
                                                    onCheckedChange={() => handleStatusToggle(org)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {org.isActive ? '有効' : '無効'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/organizations/${org.id}`)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {organizations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                            団体が登録されていません。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CreateOrganizationModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchOrganizations}
            />

            <ConfirmDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title="ステータス変更の確認"
                description={`${statusTargetOrg?.name} を${statusTargetOrg?.isActive ? '無効' : '有効'}にしますか？`}
                confirmText={statusTargetOrg?.isActive ? '無効にする' : '有効にする'}
                onConfirm={confirmStatusChange}
                variant={statusTargetOrg?.isActive ? 'destructive' : 'default'}
            />
        </div>
    );
}
