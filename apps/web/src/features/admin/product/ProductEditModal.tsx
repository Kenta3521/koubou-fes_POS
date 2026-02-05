
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Category, Product } from '@koubou-fes-pos/shared';


interface ProductEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Partial<Product>) => Promise<void>;
    product?: Product;
    categories: Category[];
}

export function ProductEditModal({
    isOpen,
    onClose,
    onSave,
    product,
    categories,
}: ProductEditModalProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [stock, setStock] = useState(0);
    const [categoryId, setCategoryId] = useState<string>('');
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setName(product.name);
                setPrice(product.price);
                setStock(product.stock);
                setCategoryId(product.categoryId || 'none');
                setIsActive(product.isActive);
            } else {
                // Reset for create mode
                setName('');
                setPrice(0);
                setStock(0);
                setCategoryId('none');
                setIsActive(true);
            }
        }
    }, [isOpen, product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                name,
                price: Number(price),
                stock: Number(stock),
                categoryId: categoryId === 'none' ? undefined : categoryId,
                isActive,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save product:', error);
            // Handle error (toast is handled by parent usually)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{product ? '商品を編集' : '商品を新規作成'}</DialogTitle>
                    <DialogDescription>
                        商品の情報を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="product-name" className="text-right">
                                商品名
                            </Label>
                            <Input
                                id="product-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="product-price" className="text-right">
                                価格
                            </Label>
                            <Input
                                id="product-price"
                                type="number"
                                min="0"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="product-stock" className="text-right">
                                在庫数
                            </Label>
                            <Input
                                id="product-stock"
                                type="number"
                                min="0"
                                value={stock}
                                onChange={(e) => setStock(Number(e.target.value))}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="product-category" className="text-right">
                                カテゴリ
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={categoryId}
                                    onValueChange={setCategoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="カテゴリを選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">なし</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="product-active" className="text-right">
                                販売中
                            </Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="product-active"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {isActive ? '販売する' : '販売停止'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? '保存中...' : '保存'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
