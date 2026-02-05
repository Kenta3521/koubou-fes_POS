/**
 * QuantityModal Component
 * Phase 2: P2-009 数量変更モーダル
 * カート内商品の数量変更・削除
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@/stores/cartStore';

interface QuantityModalProps {
    item: CartItem | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (productId: string, quantity: number) => void;
    onDelete: (productId: string) => void;
}

export function QuantityModal({
    item,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
}: QuantityModalProps) {
    const [quantity, setQuantity] = useState(1);

    // アイテムが変更されたら数量を同期
    useEffect(() => {
        if (item) {
            setQuantity(item.quantity);
        }
    }, [item]);

    if (!item) return null;

    const handleDecrement = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const handleIncrement = () => {
        setQuantity(quantity + 1);
    };

    const handleConfirm = () => {
        onUpdate(item.productId, quantity);
        onClose();
    };

    const handleDelete = () => {
        onDelete(item.productId);
        onClose();
    };

    const subtotal = item.price * quantity;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] w-full sm:max-w-md rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-lg">{item.name}</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {/* 価格表示 */}
                    <div className="text-center mb-6">
                        <span className="text-gray-500 text-sm">単価</span>
                        <p className="text-xl font-bold">¥{item.price.toLocaleString()}</p>
                    </div>

                    {/* 数量コントロール */}
                    <div className="flex items-center justify-center gap-6">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleDecrement}
                            disabled={quantity <= 1}
                            className="h-14 w-14 rounded-full text-2xl"
                        >
                            <Minus className="h-6 w-6" />
                        </Button>

                        <span className="text-4xl font-bold min-w-[3ch] text-center">
                            {quantity}
                        </span>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={handleIncrement}
                            className="h-14 w-14 rounded-full text-2xl"
                        >
                            <Plus className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* 小計 */}
                    <div className="text-center mt-6">
                        <span className="text-gray-500 text-sm">小計</span>
                        <p className="text-2xl font-bold text-orange-600">
                            ¥{subtotal.toLocaleString()}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                    {/* 削除ボタン */}
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        className="h-12 sm:h-11"
                    >
                        <Trash2 className="h-5 w-5 mr-2" />
                        削除
                    </Button>

                    {/* 確定ボタン */}
                    <Button
                        onClick={handleConfirm}
                        className="h-12 sm:h-11 flex-1 bg-orange-500 hover:bg-orange-600"
                    >
                        変更を確定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
