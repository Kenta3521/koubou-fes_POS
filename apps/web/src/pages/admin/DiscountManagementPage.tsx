import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Discount, Product, Category, DiscountType, DiscountTargetType } from '@koubou-fes-pos/shared';
import { DiscountEditModal } from '@/features/admin/discount/DiscountEditModal';
import { usePermission } from '@/hooks/usePermission';

export default function DiscountManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { can } = usePermission();

    // 権限チェック
    useEffect(() => {
        if (!can('read', 'discount')) {
            navigate('/access-denied');
        }
    }, [can, navigate]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | undefined>(undefined);

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        try {
            const [discountsRes, productsRes, categoriesRes] = await Promise.all([
                api.get(`/organizations/${orgId}/discounts`),
                api.get(`/organizations/${orgId}/products`),
                api.get(`/organizations/${orgId}/categories`)
            ]);

            if (discountsRes.data.success) {
                setDiscounts(discountsRes.data.data);
            }
            if (productsRes.data.success) {
                setProducts(productsRes.data.data);
            }
            if (categoriesRes.data.success) {
                setCategories(categoriesRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: 'データ取得エラー',
                description: 'データの取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setEditingDiscount(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (discount: Discount) => {
        setEditingDiscount(discount);
        setIsModalOpen(true);
    };

    const handleDelete = async (discount: Discount) => {
        if (!confirm(`割引「${discount.name}」を削除してもよろしいですか？（完全に削除されます）`)) return;

        try {
            await api.delete(`/organizations/${orgId}/discounts/${discount.id}`);
            toast({
                title: '削除成功',
                description: '割引を削除しました',
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting discount:', error);
            toast({
                title: '削除エラー',
                description: '割引の削除に失敗しました',
                variant: 'destructive',
            });
        }
    };

    const handleToggleActive = async (discount: Discount) => {
        if (!can('update', 'discount')) return;

        try {
            const newStatus = !discount.isActive;
            // Optimistic update
            setDiscounts(discounts.map(d => d.id === discount.id ? { ...d, isActive: newStatus } : d));

            await api.patch(`/organizations/${orgId}/discounts/${discount.id}`, {
                isActive: newStatus
            });

            toast({
                title: newStatus ? '有効化' : '無効化',
                description: `割引「${discount.name}」を${newStatus ? '有効' : '無効'}にしました`,
            });
        } catch (error) {
            console.error('Error toggling status:', error);
            // Revert on error
            setDiscounts(discounts.map(d => d.id === discount.id ? { ...d, isActive: !discount.isActive } : d));
            toast({
                title: '更新エラー',
                description: 'ステータスの変更に失敗しました',
                variant: 'destructive',
            });
        }
    };

    const handleSave = async (discountData: Partial<Discount>) => {
        try {
            if (editingDiscount) {
                await api.patch(`/organizations/${orgId}/discounts/${editingDiscount.id}`, discountData);
                toast({
                    title: '更新成功',
                    description: '割引情報を更新しました',
                });
            } else {
                await api.post(`/organizations/${orgId}/discounts`, discountData);
                toast({
                    title: '作成成功',
                    description: '新しい割引を作成しました',
                });
            }
            fetchData();
        } catch (error) {
            console.error('Error saving discount:', error);
            throw error;
        }
    };

    const formatDiscountValue = (discount: Discount) => {
        if (discount.type === DiscountType.PERCENT) {
            return `${discount.value}% OFF`;
        }
        return `¥${discount.value.toLocaleString()} 引き`;
    };

    const formatTarget = (discount: Discount) => {
        switch (discount.targetType) {
            case DiscountTargetType.ORDER_TOTAL:
                return '注文合計';
            case DiscountTargetType.SPECIFIC_PROD:
                return `商品: ${discount.product?.name || '不明'}`;
            case DiscountTargetType.CATEGORY:
                return `カテゴリ: ${discount.category?.name || '不明'}`;
            default:
                return discount.targetType;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Tag className="h-6 w-6" />
                    <h1 className="text-3xl font-bold tracking-tight">割引管理</h1>
                </div>
                {can('create', 'discount') && (
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> 新規作成
                    </Button>
                )}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>名称</TableHead>
                            <TableHead>割引内容</TableHead>
                            <TableHead>対象</TableHead>
                            <TableHead className="text-right">優先度</TableHead>
                            <TableHead className="text-center">状態</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {discounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    割引が設定されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            discounts.map((discount) => (
                                <TableRow key={discount.id} className={!discount.isActive ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{discount.name}</TableCell>
                                    <TableCell>{formatDiscountValue(discount)}</TableCell>
                                    <TableCell>{formatTarget(discount)}</TableCell>
                                    <TableCell className="text-right">{discount.priority}</TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={discount.isActive}
                                            onCheckedChange={() => handleToggleActive(discount)}
                                            disabled={!can('update', 'discount')}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {can('update', 'discount') && (
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(discount)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {can('delete', 'discount') && (
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(discount)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <DiscountEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                discount={editingDiscount}
                products={products}
                categories={categories}
            />
        </div>
    );
}
