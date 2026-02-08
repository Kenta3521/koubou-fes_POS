
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Shield, Settings2, Plus, Trash2, Building2, Users } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RoleRecord {
    id: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    organizationId: string | null;
    organizationName: string;
    permissions: string[];
    memberCount: number;
}

export default function SystemRoleManagementPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [roles, setRoles] = useState<RoleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/roles');
            if (res.data.success) {
                setRoles(res.data.data);
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleDeleteRole = async (roleId: string) => {
        try {
            const res = await api.delete(`/admin/roles/${roleId}`);
            if (res.data.success) {
                toast({ title: '削除完了', description: 'ロールを削除しました' });
                fetchRoles();
            }
        } catch (error) {
            // エラーはグローバルインターセプターで処理
        }
    };

    const commonRoles = roles.filter(r => r.organizationId === null || r.isSystemRole);
    const orgRoles = roles.filter(r => r.organizationId !== null && !r.isSystemRole);

    const RoleTable = ({ roles, showOrg }: { roles: RoleRecord[], showOrg?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">ロール名</TableHead>
                    {showOrg && <TableHead>所属組織</TableHead>}
                    <TableHead>説明</TableHead>
                    <TableHead className="w-[100px]">権限数</TableHead>
                    <TableHead className="w-[100px]">メンバー数</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={showOrg ? 6 : 5} className="text-center py-8">読み込み中...</TableCell>
                    </TableRow>
                ) : roles.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={showOrg ? 6 : 5} className="text-center py-8 text-muted-foreground">ロールが見つかりません</TableCell>
                    </TableRow>
                ) : (
                    roles.map((role) => (
                        <TableRow key={role.id}>
                            <TableCell>
                                <div className="font-bold flex items-center gap-2">
                                    {role.name}
                                    {role.organizationId === null && (
                                        <Badge variant="secondary" className="text-[10px] h-4">共通</Badge>
                                    )}
                                </div>
                            </TableCell>
                            {showOrg && (
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        {role.organizationName}
                                    </div>
                                </TableCell>
                            )}
                            <TableCell className="text-muted-foreground text-sm">
                                {role.description || '-'}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{role.permissions.length}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{role.memberCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-2"
                                        onClick={() => navigate(role.organizationId ? `/admin/${role.organizationId}/roles/${role.id}/members` : `/system/roles/${role.id}/members`)}
                                    >
                                        <Users className="w-4 h-4" />
                                        メンバー
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-1"
                                        onClick={() => navigate(`/system/roles/${role.id}`)}
                                    >
                                        <Settings2 className="w-4 h-4" />
                                        編集
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>ロールの削除</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    「{role.name}」を削除しますか？{role.organizationId === null && 'これは共通ロールであり、全組織に影響する可能性があります。'}
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
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        システムロール管理
                    </h1>
                    <p className="text-muted-foreground">
                        システム全体の共通ロールおよび各組織のロールを管理します。
                    </p>
                </div>
                <Button onClick={() => navigate(`/system/roles/new`)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    共通ロール作成
                </Button>
            </div>

            <Tabs defaultValue="common" className="w-full">
                <TabsList>
                    <TabsTrigger value="common">共通ロール (Global)</TabsTrigger>
                    <TabsTrigger value="org">各組織のロール (Organizations)</TabsTrigger>
                </TabsList>

                <TabsContent value="common">
                    <Card>
                        <CardHeader>
                            <CardTitle>共通ロール一覧</CardTitle>
                            <CardDescription>
                                全組織で利用可能な標準ロールです。ここでの変更は全組織に反映されます。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RoleTable roles={commonRoles} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="org">
                    <Card>
                        <CardHeader>
                            <CardTitle>組織別ロール一覧</CardTitle>
                            <CardDescription>
                                各組織で独自に定義されたロールです。管理者権限で編集・削除が可能です。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RoleTable roles={orgRoles} showOrg />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
