
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { Category } from '@koubou-fes-pos/shared';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Loader2, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CategoryEditModal } from '../../components/admin/CategoryEditModal';
import { usePermission } from '@/hooks/usePermission';

export default function CategoryManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const { activeOrganizationId: storeOrgId } = useAuthStore();
    const activeOrganizationId = orgId || storeOrgId;
    const { toast } = useToast();
    const { can } = usePermission();
    const navigate = useNavigate();

    // 権限チェック (管理画面の閲覧権限がない場合はアクセス拒否)
    useEffect(() => {
        if (!can('read', 'category')) {
            navigate('/access-denied');
        }
    }, [can, navigate]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const fetchCategories = useCallback(async () => {
        if (!activeOrganizationId) return;

        setIsLoading(true);
        try {
            const response = await api.get(`/organizations/${activeOrganizationId}/categories`);
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Fetch categories error:', error);
            toast({
                title: 'データ取得エラー',
                description: 'カテゴリ一覧の取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [activeOrganizationId, toast]);

    useEffect(() => {
        if (activeOrganizationId) {
            fetchCategories();
        }
    }, [activeOrganizationId, fetchCategories]);

    const handleCreate = () => {
        setSelectedCategory(null);
        setIsEditModalOpen(true);
    };

    const handleEdit = (category: Category) => {
        setSelectedCategory(category);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (category: Category) => {
        if (!activeOrganizationId) return;

        if (category._count?.products && category._count.products > 0) {
            toast({
                title: '削除できません',
                description: `このカテゴリには ${category._count.products} 件の商品が紐付いています。先に商品を削除または移動してください。`,
                variant: 'destructive',
            });
            return;
        }

        if (!confirm(`${category.name} を削除してもよろしいですか？`)) return;

        try {
            await api.delete(`/organizations/${activeOrganizationId}/categories/${category.id}`);
            toast({ title: 'カテゴリを削除しました' });
            fetchCategories();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast({
                title: '削除失敗',
                description: error.response?.data?.error?.message || '削除に失敗しました',
                variant: 'destructive',
            });
        }
    };


    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (!activeOrganizationId) return;

        const newCategories = [...categories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newCategories.length) return;

        // Swap in local array
        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
        setCategories(newCategories); // Optimistic UI update

        // Send new order to API
        const ids = newCategories.map(c => c.id);
        try {
            await api.patch(`/organizations/${activeOrganizationId}/categories/reorder`, { categoryIds: ids });
        } catch (error) {
            console.error('Reorder error:', error);
            toast({
                title: '並び替え失敗',
                description: 'サーバーへの保存に失敗しました',
                variant: 'destructive',
            });
            fetchCategories(); // Revert on failure
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">カテゴリ設定</h2>
                    <p className="text-muted-foreground">
                        商品カテゴリの登録、編集、並び替えを行います。
                    </p>
                </div>
                {can('create', 'category') && (
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> 新規カテゴリ
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>カテゴリ一覧</CardTitle>
                    <CardDescription>
                        ドラッグ&ドロップまたは矢印ボタンで表示順を変更できます（注文画面に反映されます）
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-lg">
                            <p>カテゴリがまだ登録されていません</p>
                            {can('create', 'category') && (
                                <Button variant="link" onClick={handleCreate}>
                                    最初のカテゴリを作成する
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">順序</TableHead>
                                        <TableHead>カテゴリ名</TableHead>
                                        <TableHead>商品数</TableHead>
                                        <TableHead className="text-right">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category, index) => (
                                        <TableRow key={category.id}>
                                            <TableCell>
                                                {can('update', 'category') && (
                                                    <div className="flex space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            disabled={index === 0}
                                                            onClick={() => handleMove(index, 'up')}
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            disabled={index === categories.length - 1}
                                                            onClick={() => handleMove(index, 'down')}
                                                        >
                                                            <ArrowDown className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>{category._count?.products || 0}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {can('update', 'category') && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {can('delete', 'category') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(category)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CategoryEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchCategories}
                category={selectedCategory}
            />
        </div>
    );
}
