import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { ProductEditModal } from '@/features/admin/product/ProductEditModal';
import { Category, Product } from '@koubou-fes-pos/shared';
import { usePermission } from '@/hooks/usePermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function ProductManagementPage() {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { can } = usePermission();

    // 権限チェック
    useEffect(() => {
        if (!can('read', 'product')) {
            navigate('/access-denied');
        }
    }, [can, navigate]);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

    // 削除確認ダイアログの状態
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                api.get(`/organizations/${orgId}/products`),
                api.get(`/organizations/${orgId}/categories`)
            ]);

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
                description: '商品またはカテゴリの取得に失敗しました',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        if (orgId) {
            fetchData();
        }
    }, [orgId, fetchData]);

    const handleCreate = () => {
        setEditingProduct(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!orgId || !productToDelete) return;

        try {
            await api.delete(`/organizations/${orgId}/products/${productToDelete.id}`);
            toast({
                title: '削除成功',
                description: '商品を削除しました',
            });
            fetchData(); // Refresh list
            setProductToDelete(null);
        } catch (error) {
            console.error('Error deleting product:', error);
            toast({
                title: '削除エラー',
                description: '商品の削除に失敗しました',
                variant: 'destructive',
            });
        }
    };

    const handleSave = async (productData: Partial<Product>) => {
        try {
            if (editingProduct) {
                // Update
                await api.patch(`/organizations/${orgId}/products/${editingProduct.id}`, productData);
                toast({
                    title: '更新成功',
                    description: '商品情報を更新しました',
                });
            } else {
                // Create
                await api.post(`/organizations/${orgId}/products`, productData);
                toast({
                    title: '作成成功',
                    description: '新しい商品を作成しました',
                });
            }
            fetchData();
        } catch (error) {
            console.error('Error saving product:', error);
            throw error; // Let modal handle loading state re-throw
        }
    };

    const handleToggleActive = async (product: Product) => {
        if (!can('update', 'product')) return;

        try {
            const newStatus = !product.isActive;
            // Optimistic update
            setProducts(products.map(p => p.id === product.id ? { ...p, isActive: newStatus } : p));

            await api.patch(`/organizations/${orgId}/products/${product.id}`, {
                isActive: newStatus
            });

            toast({
                title: newStatus ? '販売開始' : '販売停止',
                description: `商品「${product.name}」を${newStatus ? '販売中' : '販売停止'}にしました`,
            });
        } catch (error) {
            console.error('Error toggling status:', error);
            // Revert on error
            setProducts(products.map(p => p.id === product.id ? { ...p, isActive: !product.isActive } : p));
            toast({
                title: '更新エラー',
                description: 'ステータスの変更に失敗しました',
                variant: 'destructive',
            });
        }
    };

    // Filter Logic
    const filteredProducts = selectedCategory === 'all'
        ? products
        : products.filter(p => p.categoryId === selectedCategory);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">商品管理</h1>
                {can('create', 'product') && (
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> 新規作成
                    </Button>
                )}
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="カテゴリで絞り込み" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全てのカテゴリ</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>商品名</TableHead>
                            <TableHead>カテゴリ</TableHead>
                            <TableHead className="text-right">価格</TableHead>
                            <TableHead className="text-right">在庫</TableHead>
                            <TableHead className="text-center">販売中</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    商品が見つかりません
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>
                                        {product.category?.name || <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell className="text-right">¥{product.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={product.stock <= 5 ? 'text-red-500 font-bold' : ''}>
                                            {product.stock}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={product.isActive}
                                            onCheckedChange={() => handleToggleActive(product)}
                                            disabled={!can('update', 'product')}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {can('update', 'product') && (
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {can('delete', 'product') && (
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(product)}>
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

            <ProductEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={editingProduct}
                categories={categories}
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="商品の削除"
                description={`商品「${productToDelete?.name}」を削除してもよろしいですか？`}
                confirmText="削除"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
};
