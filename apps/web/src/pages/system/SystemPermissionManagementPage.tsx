import { useState, useEffect, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Search, Edit2, Shield, Loader2 } from 'lucide-react';

interface Permission {
    id: string;
    code: string;
    description: string;
    category: string;
}

export default function SystemPermissionManagementPage() {
    const { toast } = useToast();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit State
    const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const fetchPermissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/permissions');
            if (res.data.success) {
                setPermissions(res.data.data);
                setFilteredPermissions(res.data.data);
            }
        } catch (error) {
            toast({
                title: 'エラー',
                description: '権限データの取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredPermissions(permissions);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredPermissions(permissions.filter(p =>
                p.code.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            ));
        }
    }, [searchQuery, permissions]);

    const handleEditClick = (permission: Permission) => {
        setEditingPermission(permission);
        setEditDescription(permission.description);
        setIsEditOpen(true);
    };

    const handleSave = async () => {
        if (!editingPermission) return;
        setIsSaving(true);
        try {
            const res = await api.put(`/admin/permissions/${editingPermission.id}`, {
                description: editDescription
            });

            if (res.data.success) {
                toast({ title: '保存完了', description: '権限情報を更新しました' });

                // Update local state
                setPermissions(prev => prev.map(p =>
                    p.id === editingPermission.id ? { ...p, description: editDescription } : p
                ));
                setIsEditOpen(false);
            }
        } catch (error) {
            toast({
                title: '保存失敗',
                description: '更新に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Shield className="w-8 h-8" />
                    権限マスタ管理
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>システム権限一覧</CardTitle>
                    <CardDescription>
                        システム全体で利用可能な権限定義を管理します。ここでの変更は全組織に影響します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="検索 (コード, 説明, カテゴリ)..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="ml-auto text-sm text-muted-foreground">
                            全 {permissions.length} 件
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">カテゴリ</TableHead>
                                    <TableHead className="w-[250px]">権限コード</TableHead>
                                    <TableHead>説明</TableHead>
                                    <TableHead className="w-[100px] text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">読み込み中...</TableCell>
                                    </TableRow>
                                ) : filteredPermissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            該当する権限がありません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPermissions.map((permission) => (
                                        <TableRow key={permission.id}>
                                            <TableCell className="font-medium capitalize">
                                                <Badge variant="outline">{permission.category}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {permission.code}
                                            </TableCell>
                                            <TableCell>{permission.description}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEditClick(permission)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>権限情報の編集</DialogTitle>
                        <DialogDescription>
                            権限「{editingPermission?.code}」の説明を編集します。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="code">権限コード</Label>
                            <Input id="code" value={editingPermission?.code} disabled className="bg-muted font-mono" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">カテゴリ</Label>
                            <Input id="category" value={editingPermission?.category} disabled className="bg-muted" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">説明</Label>
                            <Input
                                id="description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>キャンセル</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
